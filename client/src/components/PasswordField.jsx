import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// A password box with a button that shows or hides what has been typed.
// Use this on the login and signup pages so people can check for typos.
export function PasswordField({ id, label, value, onChange, autoComplete, hint }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          className="input"
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible
            ? <EyeOff size={16} aria-hidden="true" />
            : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {hint && <p className="hint-text">{hint}</p>}
    </div>
  );
}
