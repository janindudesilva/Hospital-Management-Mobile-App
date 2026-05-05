import { Router } from 'express';
import { getAvailableSlots, getMySchedules, setSchedule } from '../controllers/schedule.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Publicly accessible but needs auth (Patients can view)
router.use(protect);

router.get('/slots', getAvailableSlots);

// Doctor specific routes
router.use(authorize('doctor'));
router.get('/my', getMySchedules);
router.post('/my', setSchedule);

export default router;
