import { Router } from 'express';
import { body } from 'express-validator';
import { getAllUsers, getProfile, updateUser, deleteUser, updateMyProfile, deleteMyProfile } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateMyProfile);
router.delete('/profile', protect, deleteMyProfile);
router.get('/', protect, authorize('admin'), getAllUsers);
router.put(
  '/:id', 
  protect, 
  authorize('admin'), 
  [
    body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone number must be 10 digits')
  ],
  validateRequest,
  updateUser
);
router.delete('/:id', protect, authorize('admin'), deleteUser);

export default router;
