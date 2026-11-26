import { parseResumeBuffer } from '../services/parser.js';
import * as versioningService from '../services/versioning.js';
import * as conversationService from '../services/conversation.js';
import { indexResumeChunks } from '../services/vectorStore.js';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      throw new BadRequestError('Resume file is required in multipart field "file".');
    }

    const conversationId = req.params.id;
    // Ensure conversation exists before spending LLM/embedding tokens
    const existing = await conversationService.getConversationDetail(conversationId);

    const parsedResume = await parseResumeBuffer({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });

    const version = await versioningService.createVersion({
      conversationId,
      resume: parsedResume,
      createdBy: 'upload',
      changeSummary: `Uploaded ${req.file.originalname}`,
      changes: [],
    });

    const indexedChunks = await indexResumeChunks({
      conversationId,
      versionId: version.id,
      resume: parsedResume,
    });

    const updates = { indexedVersionId: version.id };
    if (
      existing.conversation.title === 'New Resume Session' &&
      parsedResume.basics?.name?.trim()
    ) {
      updates.title = `${parsedResume.basics.name.trim()} — Resume`;
    }
    await conversationService.updateConversation(conversationId, updates);

    logger.info(
      { conversationId, versionId: version.id, indexedChunks, fileName: req.file.originalname },
      'Resume uploaded, parsed, versioned, and indexed'
    );

    res.status(201).json({
      version,
      resume: parsedResume,
      indexedChunks,
    });
  } catch (err) {
    next(err);
  }
}
