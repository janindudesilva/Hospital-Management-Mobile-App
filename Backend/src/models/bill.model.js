import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    paymentDate: {
      type: Date
    },
    items: [
      {
        description: { type: String, required: true },
        cost: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

const Bill = mongoose.model('Bill', billSchema);
export default Bill;
