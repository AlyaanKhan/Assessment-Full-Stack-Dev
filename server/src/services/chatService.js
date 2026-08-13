import { runQueryForOneRow } from '../db/pool.js';
import {
  buildChatMessage,
  buildMissingDetailsQuestion,
  capitaliseFirstLetter,
  createHttpError,
  filterUpcomingAppointments,
  formatAppointmentForHumans,
  formatDateAsTimestampText,
  isValidDateText,
  isValidTimeText,
  listMissingBookingFields,
  summariseAppointmentsForChat,
} from '../utils/utils.js';
import { readBookingDetailsFromConversation } from './aiService.js';
import { bookAppointment, listAppointmentsForUser } from './appointmentService.js';

// Every sentence the assistant says is written here, not by the AI. The AI only
// works out what the user meant. That keeps the wording accurate and predictable,
// and stops a small model from answering questions it has no information for.
const AI_UNAVAILABLE_REPLY =
  'Sorry, I could not understand that just now. Please use the booking form below and I will save it for you.';

// A greeting deserves a greeting back. Being met with "I can only help with
// appointments" for saying hello reads as a telling off, and hello is often the
// very first thing somebody types.
const GREETING_REPLY =
  'Hello. I look after appointments for this clinic. Tell me what the visit is '
  + 'for and when suits you, and I will book it. For example: book a dental '
  + 'checkup on 3 September at 2pm.';

const OFF_TOPIC_REPLY =
  'Sorry, that is outside what I can help with. I book appointments for this '
  + 'clinic, so tell me a date, a time and what the visit is for, and I will '
  + 'sort it out for you.';

// Starts a brand new empty conversation for one user.
// Use this when somebody opens the chat page for the first time.
export async function startChatSession(userId) {
  const session = await runQueryForOneRow(
    `INSERT INTO chat_sessions (user_id)
     VALUES ($1)
     RETURNING id, user_id, messages, created_at, updated_at`,
    [userId]
  );

  if (!session) {
    throw createHttpError(500, 'Could not start a new chat.');
  }

  return session;
}

// Loads one conversation and checks it really belongs to the person asking.
// Use this before reading or writing any session, so nobody sees another user's chat.
export async function getChatSessionForUser(sessionId, userId) {
  const session = await runQueryForOneRow(
    `SELECT id, user_id, messages, created_at, updated_at
     FROM chat_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (!session) {
    throw createHttpError(404, 'That chat session was not found.');
  }

  return session;
}

// Adds messages to a conversation, and optionally records one AI call.
// Use this instead of writing to chat_sessions directly.
async function appendToSession(sessionId, userId, newMessages, aiLog = null) {
  const session = await runQueryForOneRow(
    `UPDATE chat_sessions
     SET messages = messages || $3::jsonb,
         metadata = jsonb_set(
           metadata,
           '{ai_logs}',
           COALESCE(metadata -> 'ai_logs', '[]'::jsonb) || $4::jsonb,
           true
         ),
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, messages, created_at, updated_at`,
    [
      sessionId,
      userId,
      JSON.stringify(newMessages),
      JSON.stringify(aiLog ? [aiLog] : []),
    ]
  );

  if (!session) {
    throw createHttpError(404, 'That chat session was not found.');
  }

  return session;
}

// Works out what to do with the details the AI pulled out of the conversation.
// Use this to decide between booking, listing, and asking the user for more.
async function decideOutcome(userId, aiResult) {
  if (!aiResult.succeeded) {
    return {
      replyText: AI_UNAVAILABLE_REPLY,
      needsAppointmentForm: true,
      suggestedAppointment: null,
      missingDetails: ['date', 'time', 'reason'],
      createdAppointment: null,
    };
  }

  const { intent, date, time, reason } = aiResult.bookingDetails;

  // The user asked what they already have booked. The answer comes from the
  // database, never from the AI, because only the database knows.
  if (intent === 'list_appointments') {
    const appointments = await listAppointmentsForUser(userId);
    const upcoming = filterUpcomingAppointments(
      appointments,
      formatDateAsTimestampText(new Date())
    );
    return {
      replyText: summariseAppointmentsForChat(upcoming),
      needsAppointmentForm: false,
      suggestedAppointment: null,
      missingDetails: [],
      createdAppointment: null,
    };
  }

  if (intent !== 'booking') {
    return {
      replyText: intent === 'greeting' ? GREETING_REPLY : OFF_TOPIC_REPLY,
      needsAppointmentForm: false,
      suggestedAppointment: null,
      missingDetails: [],
      createdAppointment: null,
    };
  }

  // A date or time in the wrong shape counts as missing. We never guess.
  const usableDate = isValidDateText(date) ? date : null;
  const usableTime = isValidTimeText(time) ? time : null;
  const suggestedAppointment = { date: usableDate, time: usableTime, reason };
  const missingDetails = listMissingBookingFields(suggestedAppointment);

  if (missingDetails.length > 0) {
    return {
      replyText: buildMissingDetailsQuestion(missingDetails),
      needsAppointmentForm: true,
      suggestedAppointment,
      missingDetails,
      createdAppointment: null,
    };
  }

  const appointment = await bookAppointment({
    userId,
    date: usableDate,
    time: usableTime,
    reason,
  });

  return {
    replyText: `Booked. ${capitaliseFirstLetter(reason)} on `
      + `${formatAppointmentForHumans(usableDate, usableTime)}. `
      + 'It is saved as pending in your appointment list.',
    needsAppointmentForm: false,
    suggestedAppointment,
    missingDetails: [],
    createdAppointment: appointment,
  };
}

// Saves what the user typed, asks the AI about it, then saves the reply.
// Use this for every message sent from the chat box.
export async function handleUserMessage({ userId, sessionId, content }) {
  const session = await getChatSessionForUser(sessionId, userId);

  // Save the user message on its own first, so the polling endpoint can show it
  // straight away even while the AI is still thinking.
  const userMessage = buildChatMessage('user', content);
  const sessionWithUserMessage = await appendToSession(sessionId, userId, [userMessage]);

  const aiResult = await readBookingDetailsFromConversation(sessionWithUserMessage.messages);
  const outcome = await decideOutcome(userId, aiResult);

  const assistantMessage = buildChatMessage('assistant', outcome.replyText);
  await appendToSession(sessionId, userId, [assistantMessage], aiResult.aiLog);

  return {
    sessionId: session.id,
    userMessage,
    assistantMessage,
    needsAppointmentForm: outcome.needsAppointmentForm,
    suggestedAppointment: outcome.suggestedAppointment,
    missingDetails: outcome.missingDetails,
    createdAppointment: outcome.createdAppointment,
  };
}
