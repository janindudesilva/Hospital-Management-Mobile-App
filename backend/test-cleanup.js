import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/user.model.js';

dotenv.config();

const clean = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Find and delete the user that was created before the crash
    const res = await User.deleteOne({ email: 'janindudesilva10@gmail.com' });
    console.log('Cleaned up orphaned user:', res);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

clean();
