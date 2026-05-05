import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { registerUser } from './src/services/auth.service.js';

dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const payload = {
      fullName: 'Janindu de silva',
      email: `janindu${Date.now()}@gmail.com`,
      phone: '0766830519',
      username: `janindu${Date.now()}`,
      dateOfBirth: '2004/10/20',
      age: '22',
      gender: 'Male',
      address: '64 wewalduwa,kelaniya',
      password: 'password123',
      role: 'patient'
    };

    const res = await registerUser(payload);
    console.log('Success:', res);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

test();
