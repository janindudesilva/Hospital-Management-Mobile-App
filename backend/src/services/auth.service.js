import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Patient from '../models/patient.model.js';
import Doctor from '../models/doctor.model.js';
import { ApiError } from '../utils/apiError.js';
import { signToken } from '../utils/jwt.js';

export const registerUser = async (payload) => {
  const normalizedPhone = String(payload.phone || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(normalizedPhone)) {
    throw new ApiError(400, 'Phone number must contain exactly 10 digits');
  }

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!strongPasswordRegex.test(String(payload.password || ''))) {
    throw new ApiError(400, 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
  }

  if (payload.role === 'patient') {
    const dob = new Date(payload.dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!payload.dateOfBirth || Number.isNaN(dob.getTime()) || dob >= today) {
      throw new ApiError(400, 'Date of birth must be a past date');
    }
  }

  // Check for duplicate email
  const existingEmail = await User.findOne({ email: payload.email.toLowerCase().trim() });
  if (existingEmail) {
    throw new ApiError(409, 'This email address is already registered. Please use a different email or login.');
  }

  // Check for duplicate username (only if username is provided)
  if (payload.username && payload.username.trim()) {
    const existingUsername = await User.findOne({ username: payload.username.trim() });
    if (existingUsername) {
      throw new ApiError(409, 'This username is already taken. Please choose a different username.');
    }
  }

  if (payload.role === 'admin') {
    throw new ApiError(403, 'Administrator accounts cannot be registered publicly');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const user = await User.create({
    username: payload.username || undefined,
    fullName: payload.fullName,
    email: payload.email,
    password: hashedPassword,
    phone: normalizedPhone,
    role: payload.role || 'patient'
  });

  if (user.role === 'patient') {
    let age = payload.age;
    if (!age && payload.dateOfBirth) {
      const dob = new Date(payload.dateOfBirth);
      const diff = Date.now() - dob.getTime();
      age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }
    
    await Patient.create({
      user: user._id,
      fullName: user.fullName,
      phone: user.phone,
      dateOfBirth: payload.dateOfBirth,
      age: age,
      gender: payload.gender?.toLowerCase(),
      address: payload.address,
      nicPassport: payload.nicPassport
    });
  } else if (user.role === 'doctor') {
    await Doctor.create({
      user: user._id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      specialization: payload.specialization || 'General',
      department: payload.department || 'General',
      qualification: payload.qualification,
      experience: payload.experienceYears?.toString() || payload.experience,
      consultationFee: payload.consultationFee ? Number(payload.consultationFee) : 0
    });
  }

  const token = signToken({ userId: user._id, role: user.role });
  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    },
    token
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ userId: user._id, role: user.role });

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    },
    token
  };
};
