import { Router } from 'express';
import { addPaymentCard, deleteMyCard, generateBill, getAllTransactions, getMyBills, getMyCards, payBill, updateMyCard } from '../controllers/billing.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

// Admin routes
router.get('/transactions', authorize('admin'), getAllTransactions);

// Doctor/Admin route (Simulated generation)
router.post('/generate', generateBill);

// Patient routes
router.use(authorize('patient'));
router.get('/cards', getMyCards);
router.post('/cards', addPaymentCard);
router.patch('/cards/:cardId', updateMyCard);
router.delete('/cards/:cardId', deleteMyCard);
router.get('/my', getMyBills);
router.post('/pay', payBill);

export default router;
