import { formatMessageTime } from '../utils/utils.js';

// Shows one chat message, styled differently for the user and the assistant.
// Use this inside the chat window for every message in the conversation.
export function MessageBubble({ message }) {
  const isFromUser = message.role === 'user';

  return (
    <div className={`bubble-row ${isFromUser ? 'bubble-row-user' : 'bubble-row-assistant'}`}>
      <div className={`bubble ${isFromUser ? 'bubble-user' : 'bubble-assistant'}`}>
        <p className="bubble-text">{message.content}</p>
        <span className="bubble-time">{formatMessageTime(message.created_at)}</span>
      </div>
    </div>
  );
}
