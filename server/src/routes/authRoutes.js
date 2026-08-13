import { Router } from 'express';
import {
  handleGetCurrentUser,
  handleLogin,
  handleSignup,
} from '../controllers/authController.js';
import { requireLogin } from '../middleware/authMiddleware.js';
import { authRateLimit } from '../middleware/rateLimitMiddleware.js';
import {
  loginSchema,
  signupSchema,
  validateBody,
} from '../middleware/validationMiddleware.js';

export const authRoutes = Router();

authRoutes.post('/signup', authRateLimit, validateBody(signupSchema), handleSignup);
authRoutes.post('/login', authRateLimit, validateBody(loginSchema), handleLogin);
authRoutes.get('/me', requireLogin, handleGetCurrentUser);
