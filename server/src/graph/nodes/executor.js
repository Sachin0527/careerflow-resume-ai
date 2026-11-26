import * as companyAgent from '../../agents/companyAgent.js';
import * as jdMatchAgent from '../../agents/jdMatchAgent.js';
import * as translationAgent from '../../agents/translationAgent.js';
import * as sectionAgent from '../../agents/sectionAgent.js';
import { logger } from '../../utils/logger.js';

const DEFAULT_AGENTS = {
  companyAgent: companyAgent.run,
  jdMatchAgent: jdMatchAgent.run,
  translationAgent: translationAgent.run,
  sectionAgent: sectionAgent.run,
};

/**
 * LangGraph executor node:
 * Runs planned agent steps sequentially, passing each step's `updatedResume` to the next,
 * streaming `agent_start`, `agent_step`, and `agent_end` SSE events and recording `agentTrace`.
 */
export async function executorNode(state) {
  const plan = state.plan || [];
  const deps = state.deps || {};
  const agentRegistry = { ...DEFAULT_AGENTS, ...(deps.agents || {}) };

  state.emit?.('status', {
    phase: 'executing',
    message: `Running ${plan.length} agent step${plan.length === 1 ? '' : 's'}...`,
  });

  let workingResume = state.resume ? structuredClone(state.resume) : null;
  let activeCompany = state.activeCompany || null;
  const activeJd = state.entities?.jdText || state.activeJd || null;

  const stepResults = [];
  const allChanges = [];
  const agentTrace = [];

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    const runAgent = agentRegistry[step.agent];
    if (typeof runAgent !== 'function') {
      throw new Error(`Unknown agent "${step.agent}" in execution plan`);
    }

    const startedAt = Date.now();
    state.emit?.('agent_start', {
      agent: step.agent,
      stepIndex: i,
      totalSteps: plan.length,
      instructions: step.instructions,
      targetSections: step.targetSections || [],
    });

    try {
      const result = await runAgent({
        resume: workingResume,
        instructions: step.instructions,
        targetSections: step.targetSections || [],
        entities: {
          ...(state.entities || {}),
          jdText: state.entities?.jdText || activeJd,
          company: state.entities?.company || activeCompany,
        },
        context: {
          conversationId: state.conversationId,
          currentVersionId: state.currentVersionId,
          indexedVersionId: state.indexedVersionId,
          activeJd,
          activeCompany,
          deps,
        },
        onStep: (message) => {
          state.emit?.('agent_step', {
            agent: step.agent,
            stepIndex: i,
            message,
          });
        },
      });

      const durationMs = Date.now() - startedAt;
      workingResume = result.updatedResume;

      if (step.agent === 'companyAgent' && result.extras?.company) {
        activeCompany = result.extras.company;
      }

      const stepChanges = Array.isArray(result.changes) ? result.changes : [];
      const stepReasoning = Array.isArray(result.reasoning) ? result.reasoning : [];

      allChanges.push(...stepChanges);
      stepResults.push({
        agent: step.agent,
        reasoning: stepReasoning,
        changes: stepChanges,
        extras: result.extras || {},
        durationMs,
      });

      agentTrace.push({
        agent: step.agent,
        status: 'completed',
        reasoning: stepReasoning,
        durationMs,
      });

      logger.info(
        {
          conversationId: state.conversationId,
          agent: step.agent,
          stepIndex: i,
          durationMs,
          changesCount: stepChanges.length,
        },
        'Agent step completed'
      );

      state.emit?.('agent_end', {
        agent: step.agent,
        stepIndex: i,
        status: 'completed',
        durationMs,
        reasoning: stepReasoning,
        changesCount: stepChanges.length,
        extras: result.extras || {},
      });
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      agentTrace.push({
        agent: step.agent,
        status: 'failed',
        reasoning: [err.message || 'Agent execution failed'],
        durationMs,
      });

      logger.error(
        {
          conversationId: state.conversationId,
          agent: step.agent,
          stepIndex: i,
          durationMs,
          err: err.message,
        },
        'Agent step failed'
      );

      state.emit?.('agent_end', {
        agent: step.agent,
        stepIndex: i,
        status: 'failed',
        durationMs,
        error: err.message,
      });

      throw err;
    }
  }

  return {
    resume: workingResume,
    activeJd,
    activeCompany,
    stepResults,
    changes: allChanges,
    agentTrace,
  };
}
