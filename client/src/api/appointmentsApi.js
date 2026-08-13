import { requestFromApi } from './client.js';

// Saves one appointment from the booking form.
// Use this when the AI could not get all the details from the conversation.
export function createAppointmentRequest({ date, time, reason }) {
  return requestFromApi('/api/appointments', {
    method: 'POST',
    body: { date, time, reason },
  });
}

// Fetches all appointments belonging to the logged-in user.
// Use this to fill the appointment list beside the chat.
export function fetchAppointmentsRequest() {
  return requestFromApi('/api/appointments');
}
