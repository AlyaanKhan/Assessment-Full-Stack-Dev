// Every pure helper on the frontend lives here. A pure helper takes values in
// and returns a value out. It never calls the API and never changes state.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Turns a timestamp from the database into a date a person can read.
// Use this when showing when an appointment is booked for.
export function formatAppointmentDateTime(timestampText) {
  if (!timestampText) return 'Date not set';

  // The database sends plain wall-clock time, so read the parts directly
  // instead of letting the browser shift them into another timezone.
  const [datePart, timePart = '00:00'] = String(timestampText).replace('T', ' ').split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  if (!year || !month || !day) return String(timestampText);

  const isAfternoon = hours >= 12;
  const twelveHourClock = hours % 12 === 0 ? 12 : hours % 12;
  const paddedMinutes = String(minutes || 0).padStart(2, '0');

  return `${day} ${MONTH_NAMES[month - 1]} ${year}, ${twelveHourClock}:${paddedMinutes} ${isAfternoon ? 'PM' : 'AM'}`;
}

// Shows just the clock time of a chat message, such as 14:05.
// Use this under each chat bubble so the conversation has a sense of time.
export function formatMessageTime(isoTimestamp) {
  const moment = new Date(isoTimestamp);
  if (Number.isNaN(moment.getTime())) return '';
  return `${String(moment.getHours()).padStart(2, '0')}:${String(moment.getMinutes()).padStart(2, '0')}`;
}

// Checks whether an email address looks roughly correct.
// Use this to catch obvious typos in the signup and login forms before sending.
export function isValidEmailShape(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// Says whether a password is long enough for signup.
// Use this to show a helpful message before the request is sent.
export function isLongEnoughPassword(password) {
  return String(password).length >= 8;
}

// Builds the storage key that remembers which conversation a user was in.
// Use this so a page refresh returns the user to the same chat.
export function buildSessionStorageKey(userId) {
  return `appointmentAssistant.sessionId.${userId}`;
}

// Makes a chat message in the same shape the backend sends back.
// Use this to show what the user typed straight away, before the server replies.
export function buildChatMessageForDisplay(role, content) {
  return {
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

// Checks whether the last message in a chat came from the assistant.
// Use this to know the reply has arrived so polling can stop.
export function lastMessageIsFromAssistant(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages[messages.length - 1].role === 'assistant';
}

// Fills a booking form with whatever details the AI already worked out.
// Use this so the user only has to type the parts that are still missing.
export function buildFormValuesFromSuggestion(suggestedAppointment) {
  return {
    date: suggestedAppointment?.date || '',
    time: suggestedAppointment?.time || '',
    reason: suggestedAppointment?.reason || '',
  };
}

// Turns a list of missing field names into one readable sentence.
// Use this to tell the user exactly what the form still needs.
export function describeMissingDetails(missingDetails) {
  if (!Array.isArray(missingDetails) || missingDetails.length === 0) {
    return 'Please check these details and confirm.';
  }
  if (missingDetails.length === 1) {
    return `I still need the ${missingDetails[0]}.`;
  }
  const allButLast = missingDetails.slice(0, -1).join(', ');
  return `I still need the ${allButLast} and ${missingDetails[missingDetails.length - 1]}.`;
}

// Picks the colour name to use for an appointment status badge.
// Use this so pending, confirmed and cancelled always look the same everywhere.
export function statusToneFor(status) {
  if (status === 'confirmed') return 'positive';
  if (status === 'cancelled') return 'muted';
  return 'neutral';
}

// Turns a stored timestamp into the plain date part, such as 2026-12-04.
// Use this to compare an appointment against today without timezone surprises.
export function readDatePart(timestampText) {
  return String(timestampText || '').replace('T', ' ').split(' ')[0];
}

// Writes a date as YYYY-MM-DD using the day the person is actually living in.
// Use this to work out what counts as today in the browser.
export function formatDateAsIsoDay(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Says whether an appointment is today, tomorrow, or neither.
// Use this to add a short helpful label in the appointment list.
export function describeDayLabel(timestampText, today = new Date()) {
  const appointmentDay = readDatePart(timestampText);
  if (!appointmentDay) return null;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (appointmentDay === formatDateAsIsoDay(today)) return 'Today';
  if (appointmentDay === formatDateAsIsoDay(tomorrow)) return 'Tomorrow';
  return null;
}

// Writes a date and time in the same text shape the database uses.
// Use this to compare right now against a stored appointment time.
export function formatDateAsTimestampText(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${formatDateAsIsoDay(date)} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Says whether an appointment time has not arrived yet.
// Use this everywhere "upcoming" is decided, so every part of the app agrees.
export function isStillToCome(appointment, nowTimestampText) {
  return String(appointment.scheduled_for).replace('T', ' ') >= nowTimestampText;
}

// Splits appointments into the ones still to come and the ones already gone.
// Use this so the list shows what matters first and old bookings do not crowd it.
export function splitAppointmentsByTime(appointments, now = new Date()) {
  if (!Array.isArray(appointments)) return { upcoming: [], past: [] };

  const nowTimestampText = formatDateAsTimestampText(now);
  const upcoming = [];
  const past = [];

  appointments.forEach((appointment) => {
    if (isStillToCome(appointment, nowTimestampText)) upcoming.push(appointment);
    else past.push(appointment);
  });

  // Past appointments read better newest first, since the most recent matters most.
  return { upcoming, past: past.reverse() };
}

// Counts the appointments that are still to come and have not been cancelled.
// Use this for the total on screen, so it matches what the chat says.
export function countActiveUpcoming(appointments, now = new Date()) {
  const nowTimestampText = formatDateAsTimestampText(now);
  if (!Array.isArray(appointments)) return 0;
  return appointments.filter((appointment) => (
    appointment.status !== 'cancelled' && isStillToCome(appointment, nowTimestampText)
  )).length;
}

// Takes the first letter of a name, for the small circle in the navigation bar.
// Use this to show who is logged in without needing a photo.
export function readInitial(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

// Says whether a typed message is close to the length limit.
// Use this to warn the user before the backend rejects what they wrote.
export function isNearMessageLimit(text, limit) {
  return String(text).length > limit * 0.8;
}
