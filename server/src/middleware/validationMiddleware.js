import { z } from 'zod';
import { createHttpError } from '../utils/utils.js';

// Builds a checker that makes sure the request body matches a given shape.
// Use this in front of any route that reads data from the request body.
export function validateBody(schema) {
  return function checkRequestBody(request, response, next) {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const firstProblem = result.error.issues[0];
      const fieldName = firstProblem.path.join('.') || 'body';
      return next(createHttpError(400, `${fieldName}: ${firstProblem.message}`));
    }
    request.body = result.data;
    return next();
  };
}

// Builds a checker that makes sure the values in the URL match a given shape.
// Use this on routes with an id in the path, such as /chat/session/:sessionId.
export function validateParams(schema) {
  return function checkRequestParams(request, response, next) {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      const firstProblem = result.error.issues[0];
      const fieldName = firstProblem.path.join('.') || 'params';
      return next(createHttpError(400, `${fieldName}: ${firstProblem.message}`));
    }
    return next();
  };
}

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(80),
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export const chatMessageSchema = z.object({
  sessionId: z.string().uuid('A valid chat session is required.'),
  content: z.string().trim().min(1, 'Please type a message.').max(1000),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('A valid chat session is required.'),
});

export const createAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Please pick a time.'),
  reason: z.string().trim().min(3, 'Please say what the appointment is for.').max(300),
});
