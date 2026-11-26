import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import conversationRoutes from './conversationRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/conversations', conversationRoutes);

export default router;
