import { Router } from 'express';
import {
  handleCreateAppointment,
  handleListAppointments,
} from '../controllers/appointmentController.js';
import { requireLogin } from '../middleware/authMiddleware.js';
import {
  createAppointmentSchema,
  validateBody,
} from '../middleware/validationMiddleware.js';

export const appointmentRoutes = Router();

appointmentRoutes.use(requireLogin);

appointmentRoutes.post('/', validateBody(createAppointmentSchema), handleCreateAppointment);
appointmentRoutes.get('/', handleListAppointments);
