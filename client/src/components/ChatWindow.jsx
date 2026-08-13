import { Loader2, MessagesSquare, SquarePen } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';
import { MessageInput } from './MessageInput.jsx';
import { SuggestionChips } from './SuggestionChips.jsx';

// Shows the whole conversation and the box for typing the next message.
// Use this as the main panel of the chat page.
export function ChatWindow({
  messages,
  isLoadingHistory,
  isWaitingForReply,
  isStartingNewChat,
  onSendMessage,
  onStartNewChat,
}) {
  const bottomOfListRef = useRef(null);

  // Keep the newest message in view whenever the conversation grows.
  useEffect(() => {
    bottomOfListRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isWaitingForReply]);

  const hasMessages = messages.length > 0;

  return (
    <section className="card chat-window">
      <div className="card-header card-header-row">
        <div>
          <h2 className="card-title">Chat</h2>
          <p className="muted-text">
            Ask in your own words, or pick one of the examples below.
          </p>
        </div>

        <button
          type="button"
          className="button button-quiet"
          onClick={onStartNewChat}
          disabled={!hasMessages || isStartingNewChat || isWaitingForReply}
          title="Clear this conversation and start again"
        >
          {isStartingNewChat
            ? <Loader2 size={16} className="spinning" aria-hidden="true" />
            : <SquarePen size={16} aria-hidden="true" />}
          New chat
        </button>
      </div>

      <div className="message-list">
        {isLoadingHistory && (
          <div className="loading-row">
            <Loader2 size={18} className="spinning" aria-hidden="true" />
            <span className="muted-text">Loading your conversation</span>
          </div>
        )}

        {!isLoadingHistory && !hasMessages && (
          <div className="empty-state">
            <MessagesSquare size={24} aria-hidden="true" />
            <p className="empty-title">No messages yet</p>
            <p className="muted-text">
              Tell me when you would like to come in and what the visit is for,
              or click one of the examples below to see how it works.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble key={`${message.created_at}-${index}`} message={message} />
        ))}

        {isWaitingForReply && (
          <div className="bubble-row bubble-row-assistant">
            <div className="bubble bubble-assistant">
              <span className="loading-row">
                <Loader2 size={16} className="spinning" aria-hidden="true" />
                <span className="muted-text">Assistant is typing</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomOfListRef} />
      </div>

      <div className="chat-footer">
        <SuggestionChips
          onChoose={onSendMessage}
          isDisabled={isWaitingForReply || isLoadingHistory}
        />
        <MessageInput onSendMessage={onSendMessage} isSending={isWaitingForReply} />
      </div>
    </section>
  );
}
