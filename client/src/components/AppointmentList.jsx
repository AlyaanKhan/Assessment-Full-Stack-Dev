import { CalendarDays, Loader2 } from 'lucide-react';
import {
  countActiveUpcoming,
  describeDayLabel,
  formatAppointmentDateTime,
  splitAppointmentsByTime,
  statusToneFor,
} from '../utils/utils.js';

// Shows one appointment row with its time, reason and status.
// Use this for both the upcoming list and the past list.
function AppointmentRow({ appointment, isPast }) {
  const dayLabel = describeDayLabel(appointment.scheduled_for);

  // A cancelled booking is faded in the same way a past one is, so the list
  // reads at a glance: full strength means it is really happening.
  const isDimmed = isPast || appointment.status === 'cancelled';

  return (
    <li className={`appointment-item ${isDimmed ? 'appointment-item-past' : ''}`}>
      <div className="appointment-item-main">
        <span className="appointment-when">
          {formatAppointmentDateTime(appointment.scheduled_for)}
          {dayLabel && <span className="day-label">{dayLabel}</span>}
        </span>
        <span className="appointment-reason">{appointment.reason}</span>
      </div>
      <span className={`badge badge-${statusToneFor(appointment.status)}`}>
        {appointment.status}
      </span>
    </li>
  );
}

// Shows every appointment the logged-in user has, soonest first.
// Use this in the side panel of the chat page.
export function AppointmentList({ appointments, isLoading }) {
  const { upcoming, past } = splitAppointmentsByTime(appointments);

  // Cancelled bookings still show in the list, but they are not counted here,
  // so this total always matches the number the chat gives you.
  const activeUpcomingCount = countActiveUpcoming(appointments);

  return (
    <section className="card appointment-list-card">
      <div className="card-header card-header-row">
        <div>
          <h2 className="card-title">Your appointments</h2>
          <p className="muted-text">Newest bookings appear here straight away.</p>
        </div>
        {!isLoading && activeUpcomingCount > 0 && (
          <span className="count-pill">{activeUpcomingCount} upcoming</span>
        )}
      </div>

      {isLoading && (
        <div className="loading-row">
          <Loader2 size={18} className="spinning" aria-hidden="true" />
          <span className="muted-text">Loading appointments</span>
        </div>
      )}

      {!isLoading && appointments.length === 0 && (
        <div className="empty-state">
          <CalendarDays size={24} aria-hidden="true" />
          <p className="empty-title">Nothing booked yet</p>
          <p className="muted-text">Book your first appointment using the chat.</p>
        </div>
      )}

      {!isLoading && upcoming.length > 0 && (
        <ul className="appointment-list">
          {upcoming.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} isPast={false} />
          ))}
        </ul>
      )}

      {!isLoading && past.length > 0 && (
        <>
          <p className="list-divider">Past</p>
          <ul className="appointment-list">
            {past.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} isPast />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
