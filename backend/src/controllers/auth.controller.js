import { asyncHandler } from '../utils/asyncHandler.js';
import { loginUser, registerUser } from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const data = await registerUser(req.body);
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = await loginUser(req.body);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});
