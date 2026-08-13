const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const TOKEN_STORAGE_KEY = 'appointmentAssistant.token';

// Saves the login token in the browser so a page refresh keeps you logged in.
// Use this right after a successful login or signup.
export function saveToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

// Reads the saved login token, if there is one.
// Use this to attach the token to every request that needs a logged-in user.
export function readToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

// Removes the saved login token.
// Use this when the user logs out or their session has expired.
export function clearToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// Sends one request to the backend and unwraps the reply.
// Use this for every API call so errors and tokens are handled in one place.
export async function requestFromApi(path, { method = 'GET', body } = {}) {
  const token = readToken();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Something went wrong. Please try again.');
  }

  return payload?.data;
}
