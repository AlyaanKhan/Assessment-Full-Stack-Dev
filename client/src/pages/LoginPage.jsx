import { Loader2, LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PasswordField } from '../components/PasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isValidEmailShape } from '../utils/utils.js';

// The page where an existing user signs in.
// Use this at the /login route.
export function LoginPage() {
  const { currentUser, logIn } = useAuth();
  const { showErrorToast } = useToast();
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({ email: '', password: '' });
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Somebody already logged in has no reason to see this page.
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  // Keeps one field of the form up to date as the user types.
  // Use this for both the email and password inputs.
  function handleFieldChange(fieldName, value) {
    setFormValues((current) => ({ ...current, [fieldName]: value }));
  }

  // Checks the details and asks the backend to log the user in.
  // Use this when the form is submitted.
  async function handleSubmit(event) {
    event.preventDefault();

    if (!isValidEmailShape(formValues.email)) {
      setValidationMessage('Please enter a valid email address.');
      return;
    }
    if (!formValues.password) {
      setValidationMessage('Please enter your password.');
      return;
    }

    setValidationMessage('');
    setIsSubmitting(true);
    try {
      await logIn(formValues);
      navigate('/', { replace: true });
    } catch (error) {
      showErrorToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="centered-page">
      <section className="card auth-card">
        <div className="card-header">
          <h1 className="card-title">Log in</h1>
          <p className="muted-text">Welcome back. Enter your details to continue.</p>
        </div>

        <form className="stacked-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              required
            />
          </div>

          <PasswordField
            id="login-password"
            label="Password"
            autoComplete="current-password"
            value={formValues.password}
            onChange={(value) => handleFieldChange('password', value)}
          />

          {validationMessage && <p className="error-text">{validationMessage}</p>}

          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting
              ? <Loader2 size={16} className="spinning" aria-hidden="true" />
              : <LogIn size={16} aria-hidden="true" />}
            {isSubmitting ? 'Logging in' : 'Log in'}
          </button>
        </form>

        <p className="muted-text form-footer">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
