import { Router } from 'express';
import { createMedicalRecord, deleteMedicalRecord, getPatientRecords, updateMedicalRecord } from '../controllers/medicalRecord.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

// Patients can only get their own records
router.get('/patient/:patientId?', getPatientRecords);

// Doctor specific routes
router.use(authorize('doctor'));
router.post('/', createMedicalRecord);
router.put('/:id', updateMedicalRecord);
router.delete('/:id', deleteMedicalRecord);

export default router;
