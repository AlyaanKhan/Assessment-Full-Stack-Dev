// Every pure helper on the server lives here. A pure helper takes values in and
// returns a value out. It never touches the database, the network, or the clock
// unless the caller passes the time in.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const BOOKING_FIELDS = ['date', 'time', 'reason'];

// Builds an error object that carries the HTTP status code it should return.
// Use this in services so the central error handler knows what to send back.
export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Trims spaces and lowercases an email so the same address always matches.
// Use this before saving or looking up a user by email.
export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

// Copies a user record without the password hash inside it.
// Use this before sending any user back to the browser.
export function removePasswordHashFromUser(user) {
  if (!user) return null;
  const { password_hash: passwordHash, ...safeUser } = user;
  return safeUser;
}

// Checks that a piece of text is a real calendar date written as YYYY-MM-DD.
// Use this before trusting a date that came from the AI or from a form.
export function isValidDateText(dateText) {
  if (typeof dateText !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return false;
  }
  const [year, month, day] = dateText.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

// Checks that a piece of text is a real 24 hour clock time written as HH:MM.
// Use this before trusting a time that came from the AI or from a form.
export function isValidTimeText(timeText) {
  if (typeof timeText !== 'string' || !/^\d{2}:\d{2}$/.test(timeText)) {
    return false;
  }
  const [hours, minutes] = timeText.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// Joins a date and a time into one timestamp the database understands.
// Use this to turn "2026-09-01" plus "10:00" into a value for scheduled_for.
export function combineDateAndTimeToTimestamp(dateText, timeText) {
  if (!isValidDateText(dateText) || !isValidTimeText(timeText)) {
    return null;
  }
  return `${dateText} ${timeText}:00`;
}

// Lists which of date, time and reason are still empty in a booking.
// Use this to decide whether the chat can book or must ask the user for more.
export function listMissingBookingFields(bookingDetails) {
  const details = bookingDetails || {};
  return BOOKING_FIELDS.filter((fieldName) => {
    const value = details[fieldName];
    return typeof value !== 'string' || value.trim() === '';
  });
}

// Turns a date and time into a sentence a person can read easily.
// Use this when telling the user which slot was booked for them.
export function formatAppointmentForHumans(dateText, timeText) {
  if (!isValidDateText(dateText) || !isValidTimeText(timeText)) {
    return `${dateText} at ${timeText}`;
  }
  const [year, month, day] = dateText.split('-').map(Number);
  const [hours, minutes] = timeText.split(':').map(Number);
  const isAfternoon = hours >= 12;
  const twelveHourClock = hours % 12 === 0 ? 12 : hours % 12;
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${day} ${MONTH_NAMES[month - 1]} ${year} at ${twelveHourClock}:${paddedMinutes} ${isAfternoon ? 'PM' : 'AM'}`;
}

// Makes the first letter of a sentence a capital letter.
// Use this when a phrase the user typed starts a sentence we write back to them.
export function capitaliseFirstLetter(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  return text[0].toUpperCase() + text.slice(1);
}

// Finds the first JSON object inside a piece of text and reads it safely.
// Use this on AI replies, which sometimes wrap their JSON in extra words.
export function parseFirstJsonObject(text) {
  if (typeof text !== 'string') return null;
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

// Makes one chat message in the shape we store inside a session.
// Use this for both user messages and assistant replies so they always match.
export function buildChatMessage(role, content, createdAt = new Date()) {
  return {
    role,
    content,
    created_at: createdAt.toISOString(),
  };
}

// Rewrites our stored messages in the shape the AI provider expects.
// Use this before sending a conversation to the AI.
export function formatMessagesForAiProvider(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }));
}

// Pulls the login token out of an "Authorization: Bearer <token>" header value.
// Use this to read a token without repeating the string handling.
export function readTokenFromAuthorizationHeader(headerValue) {
  const value = headerValue || '';
  if (!value.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

// Takes the last few messages of a conversation.
// Use this to give the AI short term memory without sending the whole history.
export function takeRecentMessages(messages, howMany) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-howMany);
}

// The only intents the app acts on. Anything else is treated as off topic.
const KNOWN_INTENTS = ['booking', 'list_appointments', 'greeting'];

// Keeps only the fields of an AI answer we trust, and drops anything odd.
// Use this right after parsing AI output, so bad shapes never reach the rest of the app.
export function cleanUpBookingDetails(parsedOutput) {
  if (!parsedOutput || typeof parsedOutput !== 'object') return null;

  // Keeps a value only if it is text with something in it, otherwise gives null.
  // Use this so a number or an empty string never passes as a real answer.
  const readText = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

  return {
    intent: KNOWN_INTENTS.includes(parsedOutput.intent) ? parsedOutput.intent : 'other',
    date: readText(parsedOutput.date),
    time: readText(parsedOutput.time),
    reason: readText(parsedOutput.reason),
  };
}

// Writes the question that asks only for the booking details still missing.
// Use this so the assistant always names exactly what it needs next.
export function buildMissingDetailsQuestion(missingDetails) {
  if (!Array.isArray(missingDetails) || missingDetails.length === 0) {
    return 'Please check the details below and confirm.';
  }
  const readable = missingDetails.length === 1
    ? `the ${missingDetails[0]}`
    : `the ${missingDetails.slice(0, -1).join(', ')} and ${missingDetails[missingDetails.length - 1]}`;
  return `I can book that. I just need ${readable}. `
    + 'You can tell me here, or fill in the form below.';
}

// Writes a date and time in the same text shape the database uses.
// Use this to compare right now against a stored appointment time.
export function formatDateAsTimestampText(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Keeps only the appointments that are still to come and are not cancelled.
// Use this when telling somebody what they have coming up.
export function filterUpcomingAppointments(appointments, nowTimestampText) {
  if (!Array.isArray(appointments)) return [];
  return appointments.filter((appointment) => (
    appointment.status !== 'cancelled'
    && String(appointment.scheduled_for).replace('T', ' ') >= nowTimestampText
  ));
}

// Writes the user's upcoming appointments as a short list for the chat.
// Use this to answer questions like "what are my bookings".
export function summariseAppointmentsForChat(upcomingAppointments) {
  if (!Array.isArray(upcomingAppointments) || upcomingAppointments.length === 0) {
    return 'You have no upcoming appointments. Tell me a date, a time and what '
      + 'the visit is for, and I will book one.';
  }

  const lines = upcomingAppointments.map((appointment) => {
    const [datePart, timePart = ''] = String(appointment.scheduled_for).replace('T', ' ').split(' ');
    const when = formatAppointmentForHumans(datePart, timePart.slice(0, 5));
    return `- ${when}: ${appointment.reason} (${appointment.status})`;
  });

  const heading = upcomingAppointments.length === 1
    ? 'You have one upcoming appointment:'
    : `You have ${upcomingAppointments.length} upcoming appointments:`;

  return `${heading}\n${lines.join('\n')}`;
}

// Writes today's date as YYYY-MM-DD so the AI can work out words like tomorrow.
// Use this when building the AI prompt.
export function formatDateAsIsoDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Describes today as a date plus the day of the week.
// Use this in the AI prompt, because the model needs the weekday to understand
// phrases like "next Monday".
export function describeTodayForPrompt(date) {
  return `${formatDateAsIsoDay(date)}, which is a ${WEEKDAY_NAMES[date.getDay()]}`;
}
