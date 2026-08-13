import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Lets a page through only when somebody is logged in.
// Use this to wrap any page that must not be seen by a stranger.
export function ProtectedRoute({ children }) {
  const { currentUser, isRestoringSession } = useAuth();

  // While the saved token is being checked we cannot tell yet, so wait rather
  // than flashing the login page at somebody who is already signed in.
  if (isRestoringSession) {
    return (
      <div className="centered-page">
        <div className="loading-row">
          <Loader2 size={20} className="spinning" aria-hidden="true" />
          <span className="muted-text">Loading your account</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
