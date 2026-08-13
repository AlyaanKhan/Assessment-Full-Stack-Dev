import {
  bookAppointment,
  listAppointmentsForUser,
} from '../services/appointmentService.js';

// Saves a new appointment from the booking form.
// Use this for POST /api/appointments.
export async function handleCreateAppointment(request, response, next) {
  try {
    const appointment = await bookAppointment({
      userId: request.currentUser.id,
      date: request.body.date,
      time: request.body.time,
      reason: request.body.reason,
    });
    response.status(201).json({ data: { appointment } });
  } catch (error) {
    next(error);
  }
}

// Returns all appointments belonging to the logged-in user.
// Use this for GET /api/appointments.
export async function handleListAppointments(request, response, next) {
  try {
    const appointments = await listAppointmentsForUser(request.currentUser.id);
    response.status(200).json({ data: { appointments } });
  } catch (error) {
    next(error);
  }
}
