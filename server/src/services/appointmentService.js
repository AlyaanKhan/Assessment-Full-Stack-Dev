import { runQuery, runQueryForOneRow } from '../db/pool.js';
import { combineDateAndTimeToTimestamp, createHttpError } from '../utils/utils.js';

// Saves one appointment for one user.
// Use this from the booking form and from the chat, so booking works one way only.
export async function bookAppointment({ userId, date, time, reason }) {
  const scheduledFor = combineDateAndTimeToTimestamp(date, time);
  if (!scheduledFor) {
    throw createHttpError(400, 'That date and time are not valid.');
  }

  const appointment = await runQueryForOneRow(
    `INSERT INTO appointments (user_id, scheduled_for, reason, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id, user_id, scheduled_for, reason, status, created_at`,
    [userId, scheduledFor, reason.trim()]
  );

  if (!appointment) {
    throw createHttpError(500, 'Could not save the appointment.');
  }

  return appointment;
}

// Lists every appointment belonging to one user, soonest first.
// Use this for the appointment list on the chat page.
export async function listAppointmentsForUser(userId) {
  return runQuery(
    `SELECT id, user_id, scheduled_for, reason, status, created_at
     FROM appointments
     WHERE user_id = $1
     ORDER BY scheduled_for ASC`,
    [userId]
  );
}
