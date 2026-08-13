import { getCurrentUser, logInUser, signUpUser } from '../services/authService.js';

// Handles the signup request and returns the new user with a login token.
// Use this for POST /api/auth/signup.
export async function handleSignup(request, response, next) {
  try {
    const result = await signUpUser(request.body);
    response.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

// Handles the login request and returns the user with a login token.
// Use this for POST /api/auth/login.
export async function handleLogin(request, response, next) {
  try {
    const result = await logInUser(request.body);
    response.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

// Returns the profile of whoever the request token belongs to.
// Use this for GET /api/auth/me.
export async function handleGetCurrentUser(request, response, next) {
  try {
    const user = await getCurrentUser(request.currentUser.id);
    response.status(200).json({ data: { user } });
  } catch (error) {
    next(error);
  }
}
