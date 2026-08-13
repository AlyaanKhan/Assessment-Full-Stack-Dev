import { Sparkles } from 'lucide-react';

// Things a new user is most likely to want, so they can click instead of typing.
// Kept short on purpose: the point is to show what the assistant understands.
const SUGGESTIONS = [
  'Book a dental checkup tomorrow at 10am',
  'What are my upcoming bookings?',
  'Book a follow up visit next Friday at 2pm',
];

// Shows a row of ready made messages the user can send with one click.
// Use this above the chat box so nobody has to guess what to type.
export function SuggestionChips({ onChoose, isDisabled }) {
  return (
    <div className="suggestions">
      <span className="suggestions-label">
        <Sparkles size={14} aria-hidden="true" />
        Try
      </span>
      <div className="suggestions-row">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="chip"
            onClick={() => onChoose(suggestion)}
            disabled={isDisabled}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
