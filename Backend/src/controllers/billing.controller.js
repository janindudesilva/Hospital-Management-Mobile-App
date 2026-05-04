import Bill from '../models/bill.model.js';
import PaymentCard from '../models/paymentCard.model.js';
import Patient from '../models/patient.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

// Patient: Add a payment card
export const addPaymentCard = asyncHandler(async (req, res) => {
  const { cardHolderName, cardNumber, expiryMonth, expiryYear, cvv } = req.body;
  
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  // Basic validation and masking
  if (cardNumber.length < 12) throw new ApiError(400, 'Invalid card number');
  const last4 = cardNumber.slice(-4);

  const existingCard = await PaymentCard.findOne({
    patient: patient._id,
    cardHolderName: cardHolderName.trim(),
    last4,
    expiryMonth: expiryMonth.trim(),
    expiryYear: expiryYear.trim()
  });
  if (existingCard) {
    throw new ApiError(409, 'This card is already saved');
  }

  const card = await PaymentCard.create({
    patient: patient._id,
    cardHolderName: cardHolderName.trim(),
    last4,
    expiryMonth: expiryMonth.trim(),
    expiryYear: expiryYear.trim()
  });

  res.status(201).json({ success: true, data: card });
});

// Patient: Get their cards
export const getMyCards = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  const cards = await PaymentCard.find({ patient: patient._id });
  res.status(200).json({ success: true, data: cards });
});

// Patient: Update their card details
export const updateMyCard = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  const { cardId } = req.params;
  const { cardHolderName, cardNumber, expiryMonth, expiryYear } = req.body;

  const card = await PaymentCard.findOne({ _id: cardId, patient: patient._id });
  if (!card) throw new ApiError(404, 'Payment card not found');

  if (cardNumber && cardNumber.length < 12) {
    throw new ApiError(400, 'Invalid card number');
  }

  const nextLast4 = cardNumber ? cardNumber.slice(-4) : card.last4;
  const nextName = cardHolderName?.trim() || card.cardHolderName;
  const nextMonth = expiryMonth?.trim() || card.expiryMonth;
  const nextYear = expiryYear?.trim() || card.expiryYear;

  const duplicateCard = await PaymentCard.findOne({
    _id: { $ne: card._id },
    patient: patient._id,
    cardHolderName: nextName,
    last4: nextLast4,
    expiryMonth: nextMonth,
    expiryYear: nextYear
  });
  if (duplicateCard) {
    throw new ApiError(409, 'This card is already saved');
  }

  card.cardHolderName = nextName;
  card.last4 = nextLast4;
  card.expiryMonth = nextMonth;
  card.expiryYear = nextYear;
  await card.save();

  res.status(200).json({ success: true, data: card });
});

// Patient: Delete their card
export const deleteMyCard = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  const { cardId } = req.params;
  const card = await PaymentCard.findOne({ _id: cardId, patient: patient._id });
  if (!card) throw new ApiError(404, 'Payment card not found');

  await card.deleteOne();
  res.status(200).json({ success: true, message: 'Card deleted' });
});

// Patient: Get their bills
export const getMyBills = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  const bills = await Bill.find({ patient: patient._id }).populate('appointment');
  res.status(200).json({ success: true, data: bills });
});

// Patient: Pay a bill
export const payBill = asyncHandler(async (req, res) => {
  const { billId, cardId } = req.body;
  
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  const bill = await Bill.findById(billId);
  if (!bill) throw new ApiError(404, 'Bill not found');
  if (bill.patient.toString() !== patient._id.toString()) throw new ApiError(403, 'Unauthorized bill access');
  if (bill.status === 'paid') throw new ApiError(400, 'Bill is already paid');

  // Verify card belongs to patient
  const card = await PaymentCard.findOne({ _id: cardId, patient: patient._id });
  if (!card) throw new ApiError(404, 'Payment card not found');

  // Simulate payment processing
  bill.status = 'paid';
  bill.paymentDate = new Date();
  await bill.save();

  res.status(200).json({ success: true, data: bill });
});

// Admin: Get all transactions
export const getAllTransactions = asyncHandler(async (req, res) => {
  const bills = await Bill.find()
    .populate({ path: 'patient', populate: { path: 'user', select: 'fullName email' } })
    .populate('appointment')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: bills });
});

// System/Doctor: Generate a bill (Simulated here as a manual creation endpoint)
export const generateBill = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, items } = req.body;
  
  const totalAmount = items.reduce((sum, item) => sum + item.cost, 0);

  const bill = await Bill.create({
    patient: patientId,
    appointment: appointmentId,
    amount: totalAmount,
    items,
    status: 'pending'
  });

  res.status(201).json({ success: true, data: bill });
});
