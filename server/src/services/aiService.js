import { config } from '../config.js';
import {
  cleanUpBookingDetails,
  describeTodayForPrompt,
  formatMessagesForAiProvider,
  parseFirstJsonObject,
  takeRecentMessages,
} from '../utils/utils.js';

// This file is the only place in the app that talks to Groq. It reads a
// conversation and reports what the user is asking for. It never saves an
// appointment and never touches the database.

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Writes the instructions we send to the AI on every call.
// Use this so the model always answers in the same predictable JSON shape.
function buildSystemPrompt(todayDescription) {
  return [
    `You read messages for a clinic booking system. Today is ${todayDescription}.`,
    'You do not talk to the user. You only sort out what they are asking for.',
    'Read the whole conversation and reply ONLY with a single JSON object, no other text.',
    'The JSON must have exactly these keys:',
    '  intent: one of "booking", "list_appointments", "greeting" or "other".',
    '  date: the appointment date as YYYY-MM-DD, or null.',
    '  time: the appointment time on a 24 hour clock as HH:MM, or null.',
    '  reason: what the appointment is for, in a few words, or null.',
    '',
    'How to choose the intent:',
    '- "booking" when they want to make an appointment.',
    '- "list_appointments" when they ask what they have already booked, for example',
    '  "what are my upcoming bookings" or "do I have anything next week".',
    '- "greeting" for hellos and ordinary politeness with no request attached, for',
    '  example "hi", "good morning", "how are you", "thanks" or "goodbye".',
    '- "other" for anything else, such as general knowledge questions or topics',
    '  that have nothing to do with this clinic.',
    '',
    'Rules for reading the details:',
    '- Collect details from every message in the conversation, not just the last one.',
    '- Turn words like "tomorrow" or "next Monday" into a real date, counting from today.',
    '- If the user names the visit at all, such as "dental cleaning", "checkup" or',
    '  "bad cough", put those words in reason. Only use null when they said nothing about it.',
    '- Treat "3pm" as "15:00". Treat "half past nine in the morning" as "09:30".',
    '- Never invent a detail the user did not give. Use null instead of guessing.',
    '- When the intent is not "booking", set date, time and reason to null.',
  ].join('\n');
}

// Sends the conversation to Groq and waits for the raw text answer.
// Use this only from inside this file; it gives up after a short timeout.
async function callGroq(systemPrompt, conversation) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.groqModelName,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: systemPrompt }, ...conversation],
    }),
    signal: AbortSignal.timeout(config.groqRequestTimeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq replied with status ${response.status}: ${errorText}`);
  }

  const body = await response.json();
  return body.choices?.[0]?.message?.content ?? '';
}

// Asks the AI what the user wants and returns the booking details it found.
// Use this from the chat service; it never throws, it reports failure instead.
export async function readBookingDetailsFromConversation(messages, now = new Date()) {
  const todayDescription = describeTodayForPrompt(now);
  const recentMessages = takeRecentMessages(messages, config.conversationMemoryLength);
  const lastUserMessage = recentMessages.filter((message) => message.role === 'user').pop();

  const aiLog = {
    at: now.toISOString(),
    model: config.groqModelName,
    input_message: lastUserMessage ? lastUserMessage.content : null,
    raw_output: null,
    parsed_result: null,
    error: null,
  };

  try {
    const rawOutput = await callGroq(
      buildSystemPrompt(todayDescription),
      formatMessagesForAiProvider(recentMessages)
    );
    aiLog.raw_output = rawOutput;

    const parsedOutput = parseFirstJsonObject(rawOutput);
    const bookingDetails = cleanUpBookingDetails(parsedOutput);

    if (!bookingDetails) {
      aiLog.error = 'The AI answer was not valid JSON.';
      console.warn('[aiService] Could not parse AI output:', rawOutput);
      return { succeeded: false, bookingDetails: null, aiLog };
    }

    aiLog.parsed_result = bookingDetails;
    console.log('[aiService] input:', aiLog.input_message);
    console.log('[aiService] raw output:', rawOutput);
    console.log('[aiService] parsed result:', bookingDetails);

    return { succeeded: true, bookingDetails, aiLog };
  } catch (error) {
    aiLog.error = error.message;
    console.error('[aiService] AI call failed:', error.message);
    return { succeeded: false, bookingDetails: null, aiLog };
  }
}
