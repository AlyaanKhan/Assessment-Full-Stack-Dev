import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const TOAST_VISIBLE_MS = 4000;

// Shows short messages in the corner and removes them after a few seconds.
// Use this once near the top of the app so any component can report success or failure.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Takes one message off the screen.
  // Use this for the close button, and when a message has been shown long enough.
  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // Adds one message to the corner of the screen.
  // Use this through showErrorToast or showSuccessToast rather than directly.
  const addToast = useCallback((message, tone) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => removeToast(id), TOAST_VISIBLE_MS);
  }, [removeToast]);

  // Tells the user something went wrong.
  // Use this in the catch block of any action that can fail.
  const showErrorToast = useCallback((message) => addToast(message, 'error'), [addToast]);

  // Tells the user something worked.
  // Use this after a booking is saved or a similar happy result.
  const showSuccessToast = useCallback((message) => addToast(message, 'success'), [addToast]);

  const value = useMemo(
    () => ({ showErrorToast, showSuccessToast }),
    [showErrorToast, showSuccessToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            {toast.tone === 'error'
              ? <AlertCircle size={18} aria-hidden="true" />
              : <CheckCircle2 size={18} aria-hidden="true" />}
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close this message"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Gives a component the two functions for showing a toast message.
// Use this in any component that needs to report success or failure.
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return value;
}
