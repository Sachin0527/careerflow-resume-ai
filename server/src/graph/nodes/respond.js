import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createChatModel } from '../../config/llm.js';
import { env } from '../../config/env.js';
import { RESPOND_SYSTEM_PROMPT } from '../../prompts/router.js';
import { streamModelResponse } from '../../utils/streamLlm.js';

function formatVersionActionMessage(result) {
  if (!result) return 'Version action completed.';
  if (result.noop) {
    return result.message || 'No version change was performed.';
  }

  if (result.action === 'undo') {
    const v = result.version;
    return `Reverted to **v${v?.versionNumber}** (${v?.changeSummary || v?.createdBy || 'previous version'}).${
      result.canRedo ? ' Say "redo" if you want to restore the undone version.' : ''
    }`;
  }

  if (result.action === 'redo') {
    const v = result.version;
    return `Restored **v${v?.versionNumber}** (${v?.changeSummary || v?.createdBy || 'next version'}).`;
  }

  if (result.action === 'compare' && result.comparison) {
    const c = result.comparison;
    return `Compared **v${c.from?.versionNumber}** -> **v${c.to?.versionNumber}**: ${c.summary}.`;
  }

  return 'Version action completed.';
}

function buildDeterministicFallback({ stepResults, committedVersion }) {
  const versionLabel = committedVersion ? `Saved as **v${committedVersion.versionNumber}**` : 'Completed';
  const summary = committedVersion?.changeSummary ? ` (${committedVersion.changeSummary})` : '';
  const reasons = stepResults
    .flatMap((s) => s.reasoning || [])
    .slice(0, 4)
    .map((r) => `- ${r}`)
    .join('\n');

  const extrasLines = [];
  for (const step of stepResults) {
    const ex = step.extras || {};
    if (typeof ex.matchScore === 'number') {
      extrasLines.push(
        `Match Score: **${ex.matchScore}/100**` +
          (ex.missingSkills?.length ? ` | Missing skills: ${ex.missingSkills.join(', ')}` : '')
      );
    }
    if (Array.isArray(ex.localizationNotes) && ex.localizationNotes.length > 0) {
      extrasLines.push(`Localization Notes: ${ex.localizationNotes.join('; ')}`);
    }
  }

  return [
    `${versionLabel}${summary}.`,
    reasons ? `\n**Why these changes were made:**\n${reasons}` : '',
    extrasLines.length ? `\n${extrasLines.join('\n')}` : '',
    '\nLet me know if you want to refine another section, inspect the diff, or undo this change.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * LangGraph respond node:
 * Produces and streams the final user-facing chat reply across all graph branches.
 */
export async function respondNode(state) {
  state.emit?.('status', {
    phase: 'responding',
    message: 'Finalizing response...',
  });

  // Branch 1: Clarification needed
  if (state.pendingClarification) {
    const text = state.pendingClarification;
    state.emit?.('token', { text });
    return { finalResponse: text };
  }

  // Branch 2: Undo / Redo / Compare
  if (state.versionActionResult) {
    const text = formatVersionActionMessage(state.versionActionResult);
    state.emit?.('token', { text });
    return { finalResponse: text };
  }

  // Branch 3: QA / Smalltalk (already streamed inside qaNode)
  if (state.qaResponse) {
    return { finalResponse: state.qaResponse };
  }

  // Branch 4: Multi-agent execution summary
  const stepResults = state.stepResults || [];
  const deps = state.deps || {};
  const fastModel = deps.fastModel || createChatModel(env.GEMINI_FAST_MODEL, 0.2);

  const payload = {
    userMessage: state.userMessage,
    committedVersion: state.committedVersion
      ? {
          id: state.committedVersion.id,
          versionNumber: state.committedVersion.versionNumber,
          createdBy: state.committedVersion.createdBy,
          changeSummary: state.committedVersion.changeSummary,
        }
      : null,
    stepResults: stepResults.map((s) => ({
      agent: s.agent,
      durationMs: s.durationMs,
      reasoning: s.reasoning,
      changes: (s.changes || []).slice(0, 12),
      extras: s.extras,
    })),
  };

  try {
    const streamed = await streamModelResponse({
      model: fastModel,
      messages: [
        new SystemMessage(RESPOND_SYSTEM_PROMPT),
        new HumanMessage(JSON.stringify(payload, null, 2)),
      ],
      emit: state.emit,
    });
    if (streamed?.trim()) {
      return { finalResponse: streamed.trim() };
    }
  } catch {
    // Fall back to deterministic summary if synthesizer call fails
  }

  const fallback = buildDeterministicFallback({
    stepResults,
    committedVersion: state.committedVersion,
  });
  state.emit?.('token', { text: fallback });
  return { finalResponse: fallback };
}
