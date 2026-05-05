import { Router } from 'express';
import { body } from 'express-validator';
import { getMe, login, register } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = Router();

router.post(
  '/register',
  [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone')
      .matches(/^\d{10}$/)
      .withMessage('Phone number must contain exactly 10 digits'),
    body('password')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)
      .withMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character'),
    body('dateOfBirth')
      .if(body('role').equals('patient'))
      .notEmpty().withMessage('Date of birth is required for patients')
      .custom((value) => {
        const dob = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(dob.getTime()) || dob >= today) {
          throw new Error('Date of birth must be a past date');
        }
        return true;
      }),
    body('gender')
      .if(body('role').equals('patient'))
      .isIn(['male', 'female', 'other'])
      .withMessage('Valid gender is required'),
    body('address')
      .if(body('role').equals('patient'))
      .notEmpty().withMessage('Address is required for patients'),
    body('department').if(body('role').equals('doctor')).notEmpty().withMessage('Department is required for doctors'),
    body('specialization').if(body('role').equals('doctor')).notEmpty().withMessage('Specialization is required for doctors'),
    body('qualification').if(body('role').equals('doctor')).notEmpty().withMessage('Qualification is required for doctors'),
    body('experience').if(body('role').equals('doctor')).notEmpty().withMessage('Experience is required for doctors'),
    body('consultationFee')
      .if(body('role').equals('doctor'))
      .isNumeric().withMessage('Consultation fee must be a number')
      .custom(v => v >= 0).withMessage('Fee cannot be negative')
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [
    body('email').notEmpty().withMessage('Identifier is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  login
);

router.get('/me', protect, getMe);

export default router;
