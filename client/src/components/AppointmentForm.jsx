import { CalendarPlus, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildFormValuesFromSuggestion, describeMissingDetails } from '../utils/utils.js';

// The fallback booking form, shown when the chat could not work out the details.
// Use this on the chat page whenever the backend asks for the form.
export function AppointmentForm({
  suggestedAppointment,
  missingDetails,
  onSubmit,
  onDismiss,
  isSaving,
}) {
  const [formValues, setFormValues] = useState(
    () => buildFormValuesFromSuggestion(suggestedAppointment)
  );
  const [validationMessage, setValidationMessage] = useState('');

  // Refill the form whenever the AI comes back with a better guess, so the user
  // never retypes something they already said in the chat.
  useEffect(() => {
    setFormValues(buildFormValuesFromSuggestion(suggestedAppointment));
  }, [suggestedAppointment]);

  // Let the Escape key close the form, which is what people expect.
  useEffect(() => {
    // Closes the form when the Escape key is pressed.
    // Use this so the keyboard works the way people expect it to.
    function handleEscapeKey(event) {
      if (event.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [onDismiss]);

  // Keeps one field of the form up to date as the user types.
  // Use this for every input in this form.
  function handleFieldChange(fieldName, value) {
    setFormValues((current) => ({ ...current, [fieldName]: value }));
  }

  // Checks the form is filled in and then hands the booking to the chat page.
  // Use this when the user presses the confirm button.
  function handleSubmit(event) {
    event.preventDefault();

    if (!formValues.date || !formValues.time || formValues.reason.trim().length < 3) {
      setValidationMessage('Please fill in the date, the time and a short reason.');
      return;
    }

    setValidationMessage('');
    onSubmit({
      date: formValues.date,
      time: formValues.time,
      reason: formValues.reason.trim(),
    });
  }

  return (
    <section className="card appointment-form-card">
      <div className="card-header card-header-row">
        <div>
          <h2 className="card-title">Confirm your booking</h2>
          <p className="muted-text">{describeMissingDetails(missingDetails)}</p>
        </div>
        <button
          type="button"
          className="button button-quiet"
          onClick={onDismiss}
          aria-label="Close the booking form"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <form className="stacked-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label className="label" htmlFor="appointment-date">Date</label>
            <input
              id="appointment-date"
              className="input"
              type="date"
              value={formValues.date}
              onChange={(event) => handleFieldChange('date', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="appointment-time">Time</label>
            <input
              id="appointment-time"
              className="input"
              type="time"
              value={formValues.time}
              onChange={(event) => handleFieldChange('time', event.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="appointment-reason">Reason for the visit</label>
          <input
            id="appointment-reason"
            className="input"
            type="text"
            placeholder="For example: dental checkup"
            value={formValues.reason}
            onChange={(event) => handleFieldChange('reason', event.target.value)}
            required
          />
        </div>

        {validationMessage && <p className="error-text">{validationMessage}</p>}

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving
              ? <Loader2 size={16} className="spinning" aria-hidden="true" />
              : <CalendarPlus size={16} aria-hidden="true" />}
            {isSaving ? 'Saving' : 'Confirm booking'}
          </button>
          <button
            type="button"
            className="button button-quiet"
            onClick={onDismiss}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
