import MedicalRecord from '../models/medicalRecord.model.js';
import Appointment from '../models/appointment.model.js';
import Doctor from '../models/doctor.model.js';
import Patient from '../models/patient.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

// Doctor: Create a medical record
export const createMedicalRecord = asyncHandler(async (req, res) => {
  const { appointmentId, diagnosis, notes, prescriptions } = req.body;
  
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(404, 'Appointment not found');
  if (appointment.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, 'You are not assigned to this appointment');
  }

  const record = await MedicalRecord.create({
    patient: appointment.patient,
    doctor: doctor._id,
    appointment: appointment._id,
    diagnosis,
    notes,
    prescriptions
  });

  appointment.status = 'completed';
  await appointment.save();

  res.status(201).json({ success: true, data: record });
});

// Patient or Doctor: Get records for a specific patient
export const getPatientRecords = asyncHandler(async (req, res) => {
  let patientId = req.params.patientId;
  
  // If user is a patient, they can only view their own records
  if (req.user.role === 'patient') {
    const patientProfile = await Patient.findOne({ user: req.user._id });
    if (!patientProfile) throw new ApiError(404, 'Patient profile not found');
    patientId = patientProfile._id;
  }

  const records = await MedicalRecord.find({ patient: patientId })
    .populate({
      path: 'doctor',
      select: 'fullName user specialization department',
      populate: {
        path: 'user',
        select: 'fullName'
      }
    })
    .populate('appointment')
    .sort({ date: -1 });

  res.status(200).json({ success: true, data: records });
});

// Doctor: Delete a record (to correct mistakes)
export const deleteMedicalRecord = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Record not found');

  if (record.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, 'You can only delete records you created');
  }

  await MedicalRecord.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Record deleted successfully' });
});

// Doctor: Update a record (for corrections)
export const updateMedicalRecord = asyncHandler(async (req, res) => {
  const { diagnosis, notes, prescriptions } = req.body;

  if (!diagnosis?.trim()) {
    throw new ApiError(400, 'Diagnosis is required');
  }

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Record not found');

  if (record.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, 'You can only update records you created');
  }

  const validPrescriptions = Array.isArray(prescriptions)
    ? prescriptions.filter((p) => p?.medicationName?.trim() && p?.dosage?.trim() && p?.frequency?.trim() && p?.duration?.trim())
    : [];

  record.diagnosis = diagnosis.trim();
  record.notes = notes || '';
  record.prescriptions = validPrescriptions;
  await record.save();

  res.status(200).json({ success: true, data: record, message: 'Record updated successfully' });
});
