import * as versioningService from '../../services/versioning.js';
import { BadRequestError } from '../../utils/errors.js';

/**
 * LangGraph versionAction node:
 * Handles undo, redo, and compare directly in Firestore without invoking an LLM.
 */
export async function versionActionNode(state) {
  const deps = state.deps || {};
  const verService = deps.versioningService || versioningService;
  const firestore = deps.firestore;

  const intents = state.intents || [];
  const action = intents.includes('undo')
    ? 'undo'
    : intents.includes('redo')
      ? 'redo'
      : 'compare';

  state.emit?.('status', {
    phase: 'version_action',
    message: `Executing ${action}...`,
  });

  if (action === 'undo' || action === 'redo') {
    try {
      const result =
        action === 'undo'
          ? await verService.undo(state.conversationId, firestore)
          : await verService.redo(state.conversationId, firestore);

      state.emit?.('version', {
        action,
        version: result.version,
        resume: result.resume,
        canUndo: result.canUndo,
        canRedo: result.canRedo,
      });

      return {
        resume: result.resume,
        currentVersionId: result.version?.id || state.currentVersionId,
        versionActionResult: {
          action,
          noop: false,
          ...result,
        },
      };
    } catch (err) {
      if (err instanceof BadRequestError || err?.statusCode === 400) {
        return {
          versionActionResult: {
            action,
            noop: true,
            message: err.message,
          },
        };
      }
      throw err;
    }
  }

  // compare
  const versions = await verService.list(state.conversationId, firestore);
  if (versions.length < 2) {
    return {
      versionActionResult: {
        action: 'compare',
        noop: true,
        message: 'At least two resume versions are needed to compare changes.',
      },
    };
  }

  // Versions are sorted descending by versionNumber
  const toVersion =
    versions.find((v) => v.id === state.currentVersionId) || versions[0];
  const fromVersion =
    versions.find((v) => v.id !== toVersion.id && v.versionNumber < toVersion.versionNumber) ||
    versions[1];

  const comparison = await verService.compare(
    state.conversationId,
    fromVersion.id,
    toVersion.id,
    firestore
  );

  return {
    versionActionResult: {
      action: 'compare',
      noop: false,
      comparison,
    },
  };
}
