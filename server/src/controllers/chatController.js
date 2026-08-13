import {
  getChatSessionForUser,
  handleUserMessage,
  startChatSession,
} from '../services/chatService.js';

// Creates a new empty conversation for the logged-in user.
// Use this for POST /api/chat/session.
export async function handleStartSession(request, response, next) {
  try {
    const session = await startChatSession(request.currentUser.id);
    response.status(201).json({ data: { session } });
  } catch (error) {
    next(error);
  }
}

// Returns every message in one conversation.
// Use this for GET /api/chat/session/:sessionId, which the browser polls.
export async function handleGetSession(request, response, next) {
  try {
    const session = await getChatSessionForUser(
      request.params.sessionId,
      request.currentUser.id
    );
    response.status(200).json({ data: { session } });
  } catch (error) {
    next(error);
  }
}

// Takes a message from the user and returns the assistant's reply.
// Use this for POST /api/chat/message.
export async function handleSendMessage(request, response, next) {
  try {
    const result = await handleUserMessage({
      userId: request.currentUser.id,
      sessionId: request.body.sessionId,
      content: request.body.content,
    });
    response.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}
