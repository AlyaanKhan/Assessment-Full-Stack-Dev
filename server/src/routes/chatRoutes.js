import { Router } from 'express';
import {
  handleGetSession,
  handleSendMessage,
  handleStartSession,
} from '../controllers/chatController.js';
import { requireLogin } from '../middleware/authMiddleware.js';
import { chatRateLimit } from '../middleware/rateLimitMiddleware.js';
import {
  chatMessageSchema,
  sessionIdParamSchema,
  validateBody,
  validateParams,
} from '../middleware/validationMiddleware.js';

export const chatRoutes = Router();

chatRoutes.use(requireLogin);

chatRoutes.post('/session', handleStartSession);
chatRoutes.get('/session/:sessionId', validateParams(sessionIdParamSchema), handleGetSession);
chatRoutes.post('/message', chatRateLimit, validateBody(chatMessageSchema), handleSendMessage);
