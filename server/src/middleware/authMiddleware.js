import jsonwebtoken from 'jsonwebtoken';
import { config } from '../config.js';
import { createHttpError, readTokenFromAuthorizationHeader } from '../utils/utils.js';

// Checks the login token and attaches the user to the request.
// Use this on every route that only a logged-in user may reach.
export function requireLogin(request, response, next) {
  const token = readTokenFromAuthorizationHeader(request.headers.authorization);
  if (!token) {
    return next(createHttpError(401, 'You must be logged in to do that.'));
  }

  try {
    const tokenContents = jsonwebtoken.verify(token, config.jwtSecret);
    request.currentUser = {
      id: tokenContents.userId,
      email: tokenContents.email,
    };
    return next();
  } catch {
    return next(createHttpError(401, 'Your session has expired. Please log in again.'));
  }
}
