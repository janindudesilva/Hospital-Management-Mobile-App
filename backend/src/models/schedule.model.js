import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    availableSlots: [
      {
        time: { type: String, required: true },
        isBooked: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true }
);

scheduleSchema.index({ doctor: 1, date: 1 }, { unique: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
