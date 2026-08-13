import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PasswordField } from '../components/PasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isLongEnoughPassword, isValidEmailShape } from '../utils/utils.js';

// The page where a new user creates an account.
// Use this at the /signup route.
export function SignupPage() {
  const { currentUser, signUp } = useAuth();
  const { showErrorToast } = useToast();
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({ name: '', email: '', password: '' });
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Somebody already logged in has no reason to see this page.
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  // Keeps one field of the form up to date as the user types.
  // Use this for the name, email and password inputs.
  function handleFieldChange(fieldName, value) {
    setFormValues((current) => ({ ...current, [fieldName]: value }));
  }

  // Checks the details and asks the backend to create the account.
  // Use this when the form is submitted.
  async function handleSubmit(event) {
    event.preventDefault();

    if (formValues.name.trim().length < 2) {
      setValidationMessage('Please enter your name.');
      return;
    }
    if (!isValidEmailShape(formValues.email)) {
      setValidationMessage('Please enter a valid email address.');
      return;
    }
    if (!isLongEnoughPassword(formValues.password)) {
      setValidationMessage('Your password must be at least 8 characters.');
      return;
    }

    setValidationMessage('');
    setIsSubmitting(true);
    try {
      await signUp(formValues);
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
          <h1 className="card-title">Create your account</h1>
          <p className="muted-text">It takes a moment. Then you can start booking.</p>
        </div>

        <form className="stacked-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              className="input"
              type="text"
              autoComplete="name"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              className="input"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              required
            />
          </div>

          <PasswordField
            id="signup-password"
            label="Password"
            autoComplete="new-password"
            value={formValues.password}
            onChange={(value) => handleFieldChange('password', value)}
            hint="At least 8 characters."
          />

          {validationMessage && <p className="error-text">{validationMessage}</p>}

          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting
              ? <Loader2 size={16} className="spinning" aria-hidden="true" />
              : <UserPlus size={16} aria-hidden="true" />}
            {isSubmitting ? 'Creating account' : 'Create account'}
          </button>
        </form>

        <p className="muted-text form-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
