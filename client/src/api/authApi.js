import { requestFromApi } from './client.js';

// Creates a new account and returns the user with a login token.
// Use this from the signup page.
export function signUpRequest({ name, email, password }) {
  return requestFromApi('/api/auth/signup', {
    method: 'POST',
    body: { name, email, password },
  });
}

// Logs an existing user in and returns the user with a login token.
// Use this from the login page.
export function logInRequest({ email, password }) {
  return requestFromApi('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

// Asks the backend who the saved token belongs to.
// Use this when the app first loads to restore the logged-in user.
export function fetchCurrentUserRequest() {
  return requestFromApi('/api/auth/me');
}
