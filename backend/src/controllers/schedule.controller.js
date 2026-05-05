import Schedule from '../models/schedule.model.js';
import Doctor from '../models/doctor.model.js';
import Appointment from '../models/appointment.model.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

// Doctor: Get their own schedule
export const getMySchedules = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const schedules = await Schedule.find({ doctor: doctor._id }).sort({ date: 1 });
  
  res.status(200).json({ success: true, data: schedules });
});

// Doctor: Set or update availability for a date
export const setSchedule = asyncHandler(async (req, res) => {
  const { date, availableSlots } = req.body;
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0,0,0,0);
  const normalizedSlots = (availableSlots || []).map((slot) =>
    typeof slot === 'string' ? { time: slot } : slot
  );

  // Upsert schedule
  let schedule = await Schedule.findOne({ doctor: doctor._id, date: parsedDate });
  if (schedule) {
    // Update existing slots, preserving isBooked status if it already exists
    const updatedSlots = normalizedSlots.map(newSlot => {
      const existingSlot = schedule.availableSlots.find(s => s.time === newSlot.time);
      return existingSlot ? existingSlot : { time: newSlot.time, isBooked: false };
    });
    schedule.availableSlots = updatedSlots;
    await schedule.save();
  } else {
    schedule = await Schedule.create({
      doctor: doctor._id,
      date: parsedDate,
      availableSlots: normalizedSlots.map(slot => ({ time: slot.time, isBooked: false }))
    });
  }

  res.status(200).json({ success: true, data: schedule });
});

// Patient: Get available slots for a specific doctor
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) throw new ApiError(400, 'Doctor ID and date are required');

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0,0,0,0);

  const schedule = await Schedule.findOne({ doctor: doctorId, date: parsedDate });
  
  if (!schedule) {
    return res.status(200).json({ success: true, data: [] });
  }

  const slotTimes = schedule.availableSlots.map((slot) => slot.time);
  const bookingsBySlot = await Appointment.aggregate([
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(String(doctorId)),
        appointmentDate: parsedDate,
        startTime: { $in: slotTimes },
        status: { $nin: ['cancelled', 'no_show'] }
      }
    },
    {
      $group: {
        _id: '$startTime',
        count: { $sum: 1 }
      }
    }
  ]);

  const countMap = bookingsBySlot.reduce((acc, entry) => {
    acc[entry._id] = entry.count;
    return acc;
  }, {});

  const slots = schedule.availableSlots.map((slot) => {
    const bookedCount = countMap[slot.time] || 0;
    const isFull = bookedCount >= 4;
    const isBlocked = slot.isBooked || isFull;

    return {
      time: slot.time,
      bookedCount,
      capacity: 4,
      isFull,
      isBlocked
    };
  });

  res.status(200).json({ success: true, data: slots });
});
