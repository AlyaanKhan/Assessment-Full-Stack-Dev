import { Loader2, SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isNearMessageLimit } from '../utils/utils.js';

// The backend rejects anything longer than this, so the box stops there too.
const MAX_MESSAGE_LENGTH = 1000;

// The box at the bottom of the chat where the user types a message.
// Use this inside the chat window; it hands the finished text to its parent.
export function MessageInput({ onSendMessage, isSending }) {
  const [draftMessage, setDraftMessage] = useState('');
  const inputRef = useRef(null);

  // Put the cursor in the box on load, and again once a reply has arrived, so
  // the user can keep typing without reaching for the mouse.
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  // Passes the typed message up to the chat page and clears the box.
  // Use this for both the send button and the Enter key.
  function handleSubmit(event) {
    event.preventDefault();
    const trimmedMessage = draftMessage.trim();
    if (!trimmedMessage || isSending) return;
    onSendMessage(trimmedMessage);
    setDraftMessage('');
  }

  const showCounter = isNearMessageLimit(draftMessage, MAX_MESSAGE_LENGTH);

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="chat-message">
        Your message
      </label>

      <div className="message-input-field">
        <input
          id="chat-message"
          ref={inputRef}
          className="input"
          type="text"
          autoComplete="off"
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="For example: book a dental checkup on 3 September at 2pm"
          value={draftMessage}
          onChange={(event) => setDraftMessage(event.target.value)}
          disabled={isSending}
        />
        {showCounter && (
          <span className="character-counter">
            {draftMessage.length} of {MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="button button-primary"
        disabled={isSending || draftMessage.trim() === ''}
      >
        {isSending
          ? <Loader2 size={16} className="spinning" aria-hidden="true" />
          : <SendHorizontal size={16} aria-hidden="true" />}
        {isSending ? 'Sending' : 'Send'}
      </button>
    </form>
  );
}
