import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentUserRequest,
  logInRequest,
  signUpRequest,
} from '../api/authApi.js';
import { clearToken, readToken, saveToken } from '../api/client.js';

const AuthContext = createContext(null);

// Holds the logged-in user and shares them with the whole app.
// Use this once, near the top of the app, so any page can ask who is logged in.
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // On first load, a saved token might still be valid, so ask the backend who
  // it belongs to before deciding the visitor is logged out.
  useEffect(() => {
    // Asks the backend who the saved token belongs to.
    // Use this once on load, before deciding the visitor is logged out.
    async function restoreSavedSession() {
      if (!readToken()) {
        setIsRestoringSession(false);
        return;
      }
      try {
        const data = await fetchCurrentUserRequest();
        setCurrentUser(data.user);
      } catch {
        clearToken();
        setCurrentUser(null);
      } finally {
        setIsRestoringSession(false);
      }
    }
    restoreSavedSession();
  }, []);

  // Creates an account, saves the token and marks the user as logged in.
  // Use this from the signup form.
  const signUp = useCallback(async (details) => {
    const data = await signUpRequest(details);
    saveToken(data.token);
    setCurrentUser(data.user);
  }, []);

  // Checks the login details, saves the token and marks the user as logged in.
  // Use this from the login form.
  const logIn = useCallback(async (details) => {
    const data = await logInRequest(details);
    saveToken(data.token);
    setCurrentUser(data.user);
  }, []);

  // Forgets the token and the user.
  // Use this for the log out button in the navigation bar.
  const logOut = useCallback(() => {
    clearToken();
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({ currentUser, isRestoringSession, signUp, logIn, logOut }),
    [currentUser, isRestoringSession, signUp, logIn, logOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Gives a component the logged-in user and the login actions.
// Use this inside any component that needs to know or change who is logged in.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return value;
}
