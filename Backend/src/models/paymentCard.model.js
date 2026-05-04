import mongoose from 'mongoose';

const paymentCardSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    cardHolderName: {
      type: String,
      required: true
    },
    last4: {
      type: String,
      required: true
    },
    expiryMonth: {
      type: String,
      required: true
    },
    expiryYear: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const PaymentCard = mongoose.model('PaymentCard', paymentCardSchema);
export default PaymentCard;
