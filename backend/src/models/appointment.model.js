import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['online', 'offline', 'emergency'],
      default: 'online'
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no_show'],
      default: 'booked'
    },
    symptoms: String,
    notes: String
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor: 1, appointmentDate: 1, startTime: 1 }, { unique: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
