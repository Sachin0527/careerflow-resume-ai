import { FieldValue } from 'firebase-admin/firestore';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../config/firebase.js';
import { env } from '../config/env.js';
import { createChatModel } from '../config/llm.js';
import { ROLLING_SUMMARY_SYSTEM_PROMPT } from '../prompts/router.js';
import { NotFoundError } from '../utils/errors.js';
import { DEFAULT_LLM_TIMEOUT_MS, withTimeout } from '../utils/timeout.js';
import * as versioningService from './versioning.js';

export const SUMMARY_INTERVAL = 6;

function conversationsCollection(firestore = db) {
  return firestore.collection('conversations');
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return value;
}

function formatConversationDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function createConversation({ clientId, title = 'New Resume Session' }, firestore = db) {
  const ref = conversationsCollection(firestore).doc();
  const payload = {
    clientId,
    title,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    currentVersionId: null,
    versionStack: [],
    redoStack: [],
    latestVersionNumber: 0,
    summary: '',
    summarizedMessageCount: 0,
    activeJd: null,
    activeCompany: null,
    indexedVersionId: null,
  };

  await ref.set(payload);
  const created = await ref.get();
  return formatConversationDoc(created);
}

export async function listConversations(clientId, firestore = db) {
  const snap = await conversationsCollection(firestore)
    .where('clientId', '==', clientId)
    .get();

  return snap.docs
    .map(formatConversationDoc)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function getConversationDetail(conversationId, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  const conversation = formatConversationDoc(convSnap);
  const [messagesSnap, currentState] = await Promise.all([
    convRef.collection('messages').orderBy('createdAt', 'asc').get(),
    versioningService.getCurrent(conversationId, firestore),
  ]);

  const messages = messagesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
    };
  });

  return {
    conversation,
    messages,
    currentResume: currentState.resume,
    currentVersion: currentState.version,
    canUndo: currentState.canUndo,
    canRedo: currentState.canRedo,
  };
}

export async function updateConversation(conversationId, updates, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  await convRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await convRef.get();
  return formatConversationDoc(updated);
}

export async function deleteConversation(conversationId, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  await firestore.recursiveDelete(convRef);
  return { deleted: true, id: conversationId };
}

/**
 * Append a message (user, assistant, or system) with optional agentTrace and versionId to Firestore.
 */
export async function addMessage(
  conversationId,
  { role, content, agentTrace = [], versionId = null },
  firestore = db
) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  const msgRef = convRef.collection('messages').doc();
  const payload = {
    role,
    content,
    agentTrace,
    versionId,
    createdAt: FieldValue.serverTimestamp(),
  };

  await Promise.all([
    msgRef.set(payload),
    convRef.update({ updatedAt: FieldValue.serverTimestamp() }),
  ]);

  const saved = await msgRef.get();
  const data = saved.data() || payload;
  return {
    id: saved.id || msgRef.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
  };
}

/**
 * Fetch messages in chronological order for a conversation.
 */
export async function getMessages(conversationId, firestore = db) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const snap = await convRef.collection('messages').orderBy('createdAt', 'asc').get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
    };
  });
}

function extractSummaryText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
      .trim();
  }
  return '';
}

/**
 * Update the conversation's rolling summary using the flash model whenever
 * at least SUMMARY_INTERVAL (6) new messages have accumulated since the last summary.
 */
export async function maybeUpdateRollingSummary(
  conversationId,
  { fastModel, firestore = db } = {}
) {
  const convRef = conversationsCollection(firestore).doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new NotFoundError(`Conversation "${conversationId}" not found`);
  }

  const conv = convSnap.data();
  const summarizedCount = Number(conv.summarizedMessageCount || 0);
  const messages = await getMessages(conversationId, firestore);

  if (messages.length - summarizedCount < SUMMARY_INTERVAL) {
    return {
      updated: false,
      summary: conv.summary || '',
      summarizedMessageCount: summarizedCount,
    };
  }

  const model = fastModel || createChatModel(env.GEMINI_FAST_MODEL, 0);
  const unsummarized = messages.slice(summarizedCount).map((m) => ({
    role: m.role,
    content: String(m.content || '').slice(0, 1000),
  }));

  const response = await withTimeout(
    model.invoke([
      new SystemMessage(ROLLING_SUMMARY_SYSTEM_PROMPT),
      new HumanMessage(
        JSON.stringify(
          {
            previousSummary: conv.summary || '',
            newMessages: unsummarized,
          },
          null,
          2
        )
      ),
    ]),
    DEFAULT_LLM_TIMEOUT_MS,
    'Rolling summary generation'
  );

  const updatedSummary = extractSummaryText(response?.content ?? response) || conv.summary || '';
  await convRef.update({
    summary: updatedSummary,
    summarizedMessageCount: messages.length,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    updated: true,
    summary: updatedSummary,
    summarizedMessageCount: messages.length,
  };
}
