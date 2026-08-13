import { requestFromApi } from './client.js';

// Starts a brand new conversation and returns it.
// Use this when the chat page has no saved conversation to continue.
export function startChatSessionRequest() {
  return requestFromApi('/api/chat/session', { method: 'POST' });
}

// Fetches every message in one conversation.
// Use this on page load and while polling for the assistant's reply.
export function fetchChatSessionRequest(sessionId) {
  return requestFromApi(`/api/chat/session/${sessionId}`);
}

// Sends one message and returns the assistant's reply plus any booking result.
// Use this when the user submits the chat input box.
export function sendChatMessageRequest({ sessionId, content }) {
  return requestFromApi('/api/chat/message', {
    method: 'POST',
    body: { sessionId, content },
  });
}
