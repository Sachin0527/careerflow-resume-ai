import * as conversationService from '../services/conversation.js';
import { deleteConversationNamespace } from '../services/vectorStore.js';
import { runResumeGraph } from '../graph/graph.js';
import { logger } from '../utils/logger.js';

export async function createConversation(req, res, next) {
  try {
    const conversation = await conversationService.createConversation(req.body);
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await conversationService.listConversations(req.query.clientId);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req, res, next) {
  try {
    const detail = await conversationService.getConversationDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
}

export async function updateConversation(req, res, next) {
  try {
    const conversation = await conversationService.updateConversation(req.params.id, {
      title: req.body.title,
    });
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const result = await conversationService.deleteConversation(req.params.id);
    try {
      await deleteConversationNamespace(req.params.id);
    } catch (vecErr) {
      logger.warn(
        { conversationId: req.params.id, err: vecErr.message },
        'Failed to clean up Pinecone namespace on conversation delete'
      );
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

function writeSseEvent(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function formatFriendlySseError(err) {
  const msg = String(err?.message || '');
  if (err?.name === 'TimeoutError' || err?.statusCode === 504) {
    return {
      message:
        'The AI service took too long to respond. Your resume is unchanged—please try your request again.',
      code: 'TimeoutError',
      statusCode: 504,
    };
  }
  if (err?.status === 429 || /429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg)) {
    return {
      message: 'The AI provider is temporarily rate-limited. Please wait a few seconds and retry.',
      code: 'RateLimitError',
      statusCode: 429,
    };
  }
  if (err?.statusCode && err.statusCode < 500) {
    return {
      message: msg || 'Your request could not be processed. Please check your input and try again.',
      code: err.name || 'RequestError',
      statusCode: err.statusCode,
    };
  }
  return {
    message:
      'Something went wrong while optimizing your resume. Your previous version is safe—please try again.',
    code: 'OrchestrationError',
    statusCode: 500,
  };
}

export async function sendMessage(req, res, next) {
  const conversationId = req.params.id;
  const { content } = req.body;

  let existingDetail;
  try {
    existingDetail = await conversationService.getConversationDetail(conversationId);
  } catch (err) {
    return next(err);
  }

  let userMessageDoc;
  try {
    userMessageDoc = await conversationService.addMessage(conversationId, {
      role: 'user',
      content,
      agentTrace: [],
      versionId: existingDetail.conversation?.currentVersionId || null,
    });
  } catch (err) {
    return next(err);
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const emit = (event, data) => writeSseEvent(res, event, data);

  try {
    const graphRunner = req.app?.locals?.graphRunner || runResumeGraph;
    const result = await graphRunner({
      conversationId,
      userMessage: content,
      currentMessageId: userMessageDoc.id,
      emit,
    });

    const assistantMessageDoc = await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: result.finalResponse || '',
      agentTrace: result.agentTrace || [],
      versionId: result.currentVersionId || null,
    });

    let summaryUpdated = false;
    try {
      const summaryResult = await conversationService.maybeUpdateRollingSummary(conversationId);
      summaryUpdated = Boolean(summaryResult?.updated);
    } catch (summaryErr) {
      logger.warn(
        { conversationId, err: summaryErr.message },
        'Rolling summary update failed'
      );
    }

    emit('done', {
      userMessageId: userMessageDoc.id,
      messageId: assistantMessageDoc.id,
      content: result.finalResponse || '',
      versionId: result.currentVersionId || null,
      agentTrace: result.agentTrace || [],
      currentVersion:
        result.committedVersion || result.versionActionResult?.version || existingDetail.currentVersion || null,
      canUndo:
        result.committedVersion?.canUndo ??
        result.versionActionResult?.canUndo ??
        existingDetail.canUndo ??
        false,
      canRedo:
        result.committedVersion?.canRedo ??
        result.versionActionResult?.canRedo ??
        existingDetail.canRedo ??
        false,
      summaryUpdated,
    });
  } catch (err) {
    logger.error(
      { conversationId, err: err.message, stack: err.stack },
      'SSE message orchestration failed'
    );
    emit('error', formatFriendlySseError(err));
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
