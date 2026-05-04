import Appointment from '../models/appointment.model.js';
import Patient from '../models/patient.model.js';
import Doctor from '../models/doctor.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const createAppointment = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  const normalizedDate = new Date(req.body.appointmentDate);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  const slotBookingCount = await Appointment.countDocuments({
    doctor: req.body.doctor,
    appointmentDate: normalizedDate,
    startTime: req.body.startTime,
    status: { $nin: ['cancelled', 'no_show'] }
  });

  if (slotBookingCount >= 4) {
    throw new ApiError(409, 'This time slot is full. Please choose another slot');
  }

  const appointment = await Appointment.create({
    patient: patient._id,
    doctor: req.body.doctor,
    appointmentDate: normalizedDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    type: req.body.type,
    symptoms: req.body.symptoms,
    notes: req.body.notes
  });

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: appointment
  });
});

export const getMyAppointments = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  const appointments = await Appointment.find({ patient: patient._id })
    .populate('doctor')
    .sort({ appointmentDate: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

export const getDoctorAppointments = asyncHandler(async (req, res) => {
  // Find the Doctor document linked to the logged-in user
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  const appointments = await Appointment.find({ doctor: doctor._id })
    .populate('patient')
    .sort({ appointmentDate: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

export const getAllAppointments = asyncHandler(async (_req, res) => {
  const appointments = await Appointment.find()
    .populate('patient')
    .populate('doctor')
    .sort({ appointmentDate: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

export const deleteAppointmentByAdmin = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  await Appointment.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Appointment deleted successfully'
  });
});

export const cancelMyAppointment = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }
  if (!appointment.patient.equals(patient._id)) {
    throw new ApiError(403, 'You can only cancel your own appointments');
  }
  if (appointment.status !== 'booked') {
    throw new ApiError(400, 'Only active bookings can be cancelled');
  }

  appointment.status = 'cancelled';
  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled',
    data: appointment
  });
});

export const rescheduleMyAppointment = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }
  if (!appointment.patient.equals(patient._id)) {
    throw new ApiError(403, 'You can only reschedule your own appointments');
  }
  if (appointment.status !== 'booked') {
    throw new ApiError(400, 'Only active bookings can be rescheduled');
  }

  const normalizedDate = new Date(req.body.appointmentDate);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  const slotBookingCount = await Appointment.countDocuments({
    doctor: appointment.doctor,
    appointmentDate: normalizedDate,
    startTime: req.body.startTime,
    status: { $nin: ['cancelled', 'no_show'] },
    _id: { $ne: appointment._id }
  });

  if (slotBookingCount >= 4) {
    throw new ApiError(409, 'This time slot is full. Please choose another slot');
  }

  appointment.appointmentDate = normalizedDate;
  appointment.startTime = req.body.startTime;
  appointment.endTime = req.body.endTime;
  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Appointment rescheduled',
    data: appointment
  });
});
