import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  deleteAppointmentByAdmin,
  cancelMyAppointment,
  rescheduleMyAppointment
} from '../controllers/appointment.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/my', protect, getMyAppointments);
router.post('/my/:id/cancel', protect, authorize('patient'), cancelMyAppointment);
router.patch(
  '/my/:id',
  protect,
  authorize('patient'),
  [
    body('appointmentDate').notEmpty().withMessage('Appointment date is required'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required')
  ],
  validateRequest,
  rescheduleMyAppointment
);
router.get('/doctor', protect, authorize('doctor'), getDoctorAppointments);
router.get('/admin/all', protect, authorize('admin'), getAllAppointments);
router.delete('/admin/:id', protect, authorize('admin'), deleteAppointmentByAdmin);
router.post(
  '/',
  protect,
  [
    body('doctor').notEmpty().withMessage('Doctor id is required'),
    body('appointmentDate').notEmpty().withMessage('Appointment date is required'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required')
  ],
  validateRequest,
  createAppointment
);

export default router;
