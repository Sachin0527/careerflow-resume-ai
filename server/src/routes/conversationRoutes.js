import { Router } from 'express';
import * as conversationController from '../controllers/conversationController.js';
import * as resumeController from '../controllers/resumeController.js';
import * as versionController from '../controllers/versionController.js';
import * as exportController from '../controllers/exportController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { uploadResumeMiddleware } from '../middleware/upload.js';
import {
  compareVersionsQuerySchema,
  conversationIdParamsSchema,
  createConversationBodySchema,
  exportResumeQuerySchema,
  listConversationsQuerySchema,
  sendMessageBodySchema,
  updateConversationBodySchema,
  versionIdParamsSchema,
} from '../schemas/api.js';

const router = Router();

router.post(
  '/',
  validateRequest({ body: createConversationBodySchema }),
  conversationController.createConversation
);

router.get(
  '/',
  validateRequest({ query: listConversationsQuerySchema }),
  conversationController.listConversations
);

router.get(
  '/:id',
  validateRequest({ params: conversationIdParamsSchema }),
  conversationController.getConversation
);

router.patch(
  '/:id',
  validateRequest({ params: conversationIdParamsSchema, body: updateConversationBodySchema }),
  conversationController.updateConversation
);

router.delete(
  '/:id',
  validateRequest({ params: conversationIdParamsSchema }),
  conversationController.deleteConversation
);

router.post(
  '/:id/resume',
  validateRequest({ params: conversationIdParamsSchema }),
  uploadResumeMiddleware,
  resumeController.uploadResume
);

router.post(
  '/:id/messages',
  validateRequest({ params: conversationIdParamsSchema, body: sendMessageBodySchema }),
  conversationController.sendMessage
);

router.get(
  '/:id/versions',
  validateRequest({ params: conversationIdParamsSchema }),
  versionController.listVersions
);

router.get(
  '/:id/versions/:vid',
  validateRequest({ params: versionIdParamsSchema }),
  versionController.getVersion
);

router.post(
  '/:id/versions/:vid/restore',
  validateRequest({ params: versionIdParamsSchema }),
  versionController.restoreVersion
);

router.post(
  '/:id/undo',
  validateRequest({ params: conversationIdParamsSchema }),
  versionController.undoVersion
);

router.post(
  '/:id/redo',
  validateRequest({ params: conversationIdParamsSchema }),
  versionController.redoVersion
);

router.get(
  '/:id/compare',
  validateRequest({ params: conversationIdParamsSchema, query: compareVersionsQuerySchema }),
  versionController.compareVersions
);

router.get(
  '/:id/export',
  validateRequest({ params: conversationIdParamsSchema, query: exportResumeQuerySchema }),
  exportController.exportResume
);

export default router;
