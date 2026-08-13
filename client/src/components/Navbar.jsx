import { CalendarCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { readInitial } from '../utils/utils.js';

// Shows the app name and, when logged in, who you are with a log out button.
// Use this at the top of every page.
export function Navbar() {
  const { currentUser, logOut } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <CalendarCheck size={20} aria-hidden="true" />
          <span>Appointment Assistant</span>
        </div>

        {currentUser && (
          <div className="navbar-actions">
            <span className="navbar-user">
              <span className="avatar" aria-hidden="true">{readInitial(currentUser.name)}</span>
              <span className="navbar-username">{currentUser.name}</span>
            </span>
            <button type="button" className="button button-quiet" onClick={logOut}>
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
