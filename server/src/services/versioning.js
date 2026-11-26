import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { compareResumes } from './diff.js';

function conversationsCollection(firestore = db) {
  return firestore.collection('conversations');
}

function versionsCollection(conversationId, firestore = db) {
  return conversationsCollection(firestore).doc(conversationId).collection('versions');
}

/**
 * Create a new resume version in Firestore and advance versionStack / currentVersionId atomically.
 */
export async function createVersion(
  {
    conversationId,
    resume,
    createdBy,
    changeSummary = '',
    changes = [],
    parentVersionId = null,
  },
  firestore = db
) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const versionsRef = versionsCollection(conversationId, firestore);

  return firestore.runTransaction(async (tx) => {
    const convSnap = await tx.get(convRef);
    if (!convSnap.exists) {
      throw new NotFoundError(`Conversation "${conversationId}" not found`);
    }

    const convData = convSnap.data();
    const versionStack = Array.isArray(convData.versionStack) ? [...convData.versionStack] : [];
    const nextNumber = (convData.latestVersionNumber || versionStack.length || 0) + 1;
    const resolvedParent = parentVersionId ?? convData.currentVersionId ?? null;

    const newVersionRef = versionsRef.doc();
    const now = new Date().toISOString();

    const versionDoc = {
      versionNumber: nextNumber,
      resume,
      createdBy,
      changeSummary,
      changes,
      parentVersionId: resolvedParent,
      createdAt: now,
    };

    tx.set(newVersionRef, versionDoc);
    versionStack.push(newVersionRef.id);

    tx.update(convRef, {
      currentVersionId: newVersionRef.id,
      versionStack,
      redoStack: [],
      latestVersionNumber: nextNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      id: newVersionRef.id,
      ...versionDoc,
      canUndo: versionStack.length > 1,
      canRedo: false,
    };
  });
}

/**
 * Retrieve the currently active version + resume JSON for a conversation.
 */
export async function getCurrent(conversationId, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  const conv = convSnap.data();
  const versionStack = Array.isArray(conv.versionStack) ? conv.versionStack : [];
  const redoStack = Array.isArray(conv.redoStack) ? conv.redoStack : [];

  if (!conv.currentVersionId) {
    return {
      version: null,
      resume: null,
      canUndo: false,
      canRedo: redoStack.length > 0,
    };
  }

  const versionSnap = await versionsCollection(conversationId, firestore)
    .doc(conv.currentVersionId)
    .get();

  if (!versionSnap.exists) {
    throw new NotFoundError(`Current version "${conv.currentVersionId}" not found`);
  }

  const data = versionSnap.data();
  return {
    version: { id: versionSnap.id, ...data },
    resume: data.resume,
    canUndo: versionStack.length > 1,
    canRedo: redoStack.length > 0,
  };
}

/**
 * Move the active version pointer back one step on versionStack (pushing onto redoStack).
 */
export async function undo(conversationId, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);

  const targetVersionId = await firestore.runTransaction(async (tx) => {
    const convSnap = await tx.get(convRef);
    if (!convSnap.exists) {
      throw new NotFoundError(`Conversation "${conversationId}" not found`);
    }

    const conv = convSnap.data();
    const versionStack = Array.isArray(conv.versionStack) ? [...conv.versionStack] : [];
    const redoStack = Array.isArray(conv.redoStack) ? [...conv.redoStack] : [];

    if (versionStack.length <= 1) {
      throw new BadRequestError('Nothing to undo: already at the earliest version');
    }

    const popped = versionStack.pop();
    redoStack.push(popped);
    const nextCurrentId = versionStack[versionStack.length - 1];

    tx.update(convRef, {
      currentVersionId: nextCurrentId,
      versionStack,
      redoStack,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      nextCurrentId,
      canUndo: versionStack.length > 1,
      canRedo: redoStack.length > 0,
    };
  });

  const versionSnap = await versionsCollection(conversationId, firestore)
    .doc(targetVersionId.nextCurrentId)
    .get();

  if (!versionSnap.exists) {
    throw new NotFoundError(`Target version "${targetVersionId.nextCurrentId}" not found`);
  }

  const versionData = versionSnap.data();
  return {
    version: { id: versionSnap.id, ...versionData },
    resume: versionData.resume,
    canUndo: targetVersionId.canUndo,
    canRedo: targetVersionId.canRedo,
  };
}

/**
 * Move the active version pointer forward one step from redoStack onto versionStack.
 */
export async function redo(conversationId, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);

  const targetVersionId = await firestore.runTransaction(async (tx) => {
    const convSnap = await tx.get(convRef);
    if (!convSnap.exists) {
      throw new NotFoundError(`Conversation "${conversationId}" not found`);
    }

    const conv = convSnap.data();
    const versionStack = Array.isArray(conv.versionStack) ? [...conv.versionStack] : [];
    const redoStack = Array.isArray(conv.redoStack) ? [...conv.redoStack] : [];

    if (redoStack.length === 0) {
      throw new BadRequestError('Nothing to redo');
    }

    const restoredId = redoStack.pop();
    versionStack.push(restoredId);

    tx.update(convRef, {
      currentVersionId: restoredId,
      versionStack,
      redoStack,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      restoredId,
      canUndo: versionStack.length > 1,
      canRedo: redoStack.length > 0,
    };
  });

  const versionSnap = await versionsCollection(conversationId, firestore)
    .doc(targetVersionId.restoredId)
    .get();

  if (!versionSnap.exists) {
    throw new NotFoundError(`Target version "${targetVersionId.restoredId}" not found`);
  }

  const versionData = versionSnap.data();
  return {
    version: { id: versionSnap.id, ...versionData },
    resume: versionData.resume,
    canUndo: targetVersionId.canUndo,
    canRedo: targetVersionId.canRedo,
  };
}

/**
 * List version metadata for a conversation without returning full resume JSON bodies.
 */
export async function list(conversationId, firestore = db) {
  const convSnap = await conversationsCollection(firestore).doc(conversationId).get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  const conv = convSnap.data();
  const snap = await versionsCollection(conversationId, firestore)
    .orderBy('versionNumber', 'desc')
    .get();

  return snap.docs.map((doc) => {
    const { resume: _omittedResume, ...meta } = doc.data();
    return {
      id: doc.id,
      ...meta,
      isCurrent: doc.id === conv.currentVersionId,
    };
  });
}

/**
 * Fetch a single full version document (including resume JSON).
 */
export async function getVersion(conversationId, versionId, firestore = db) {
  const doc = await versionsCollection(conversationId, firestore).doc(versionId).get();
  if (!doc.exists) {
    throw new NotFoundError(`Version "${versionId}" not found`);
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Restore a previous version non-destructively by creating a new version from its resume JSON.
 */
export async function restoreVersion(conversationId, versionId, firestore = db) {
  const target = await getVersion(conversationId, versionId, firestore);
  const restored = await createVersion(
    {
      conversationId,
      resume: structuredClone(target.resume),
      createdBy: 'restore',
      changeSummary: `Restored v${target.versionNumber}`,
      changes: [],
    },
    firestore
  );
  return {
    version: restored,
    resume: restored.resume,
    canUndo: restored.canUndo,
    canRedo: restored.canRedo,
  };
}

/**
 * Compare two resume versions in a conversation section-by-section using the `diff` package.
 */
export async function compare(conversationId, fromVersionId, toVersionId, firestore = db) {
  const [fromVersion, toVersion] = await Promise.all([
    getVersion(conversationId, fromVersionId, firestore),
    getVersion(conversationId, toVersionId, firestore),
  ]);

  const diffResult = compareResumes(fromVersion.resume, toVersion.resume);
  return {
    from: {
      id: fromVersion.id,
      versionNumber: fromVersion.versionNumber,
      createdBy: fromVersion.createdBy,
      createdAt: fromVersion.createdAt,
    },
    to: {
      id: toVersion.id,
      versionNumber: toVersion.versionNumber,
      createdBy: toVersion.createdBy,
      createdAt: toVersion.createdAt,
    },
    ...diffResult,
  };
}
