import * as conversationService from '../../services/conversation.js';
import { compareResumes } from '../../services/diff.js';
import * as vectorStore from '../../services/vectorStore.js';
import * as versioningService from '../../services/versioning.js';
import { logger } from '../../utils/logger.js';

/**
 * LangGraph commitVersion node:
 * Saves a new resume version, diff change summary, and conversation context updates
 * (activeJd / activeCompany / indexedVersionId) to Firestore, then emits a `version` SSE event.
 */
export async function commitVersionNode(state) {
  if (!state.resume || (state.stepResults || []).length === 0) {
    return {};
  }

  state.emit?.('status', {
    phase: 'committing',
    message: 'Saving new resume version...',
  });

  const deps = state.deps || {};
  const verService = deps.versioningService || versioningService;
  const convService = deps.conversationService || conversationService;
  const vecStore = deps.vectorStore || vectorStore;
  const firestore = deps.firestore;

  const diffResult = state.initialResume
    ? compareResumes(state.initialResume, state.resume)
    : { summary: 'Updated resume', changedSections: [] };

  const createdBy = state.stepResults.map((s) => s.agent).join(' -> ') || 'agent';

  const version = await verService.createVersion(
    {
      conversationId: state.conversationId,
      resume: state.resume,
      createdBy,
      changeSummary: diffResult.summary,
      changes: state.changes || [],
      parentVersionId: state.currentVersionId,
    },
    firestore
  );

  let indexedVersionId = state.indexedVersionId;
  try {
    await vecStore.indexResumeChunks({
      conversationId: state.conversationId,
      versionId: version.id,
      resume: state.resume,
    });
    indexedVersionId = version.id;
  } catch (err) {
    logger.warn(
      { conversationId: state.conversationId, versionId: version.id, err: err.message },
      'Failed to re-index resume chunks after version commit'
    );
  }

  const convUpdates = {};
  if (indexedVersionId && indexedVersionId !== state.indexedVersionId) {
    convUpdates.indexedVersionId = indexedVersionId;
  }
  if (state.activeJd && state.activeJd !== state.conversation?.activeJd) {
    convUpdates.activeJd = state.activeJd;
  }
  if (state.activeCompany && state.activeCompany !== state.conversation?.activeCompany) {
    convUpdates.activeCompany = state.activeCompany;
  }

  if (Object.keys(convUpdates).length > 0) {
    await convService.updateConversation(state.conversationId, convUpdates, firestore);
  }

  state.emit?.('version', {
    action: 'commit',
    version,
    resume: state.resume,
    canUndo: version.canUndo,
    canRedo: version.canRedo,
  });

  return {
    committedVersion: version,
    currentVersionId: version.id,
    indexedVersionId,
  };
}
