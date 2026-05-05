import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    fullName: {
      type: String,
      required: true
    },
    nicPassport: String,
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    phone: String,
    address: String,
    bloodGroup: String,
    dateOfBirth: Date,
    emergencyContact: String,
    medicalHistory: String
  },
  { timestamps: true }
);

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
