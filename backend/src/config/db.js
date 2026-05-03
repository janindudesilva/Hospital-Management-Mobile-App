import mongoose from 'mongoose';

const migrateAppointmentSlotIndex = async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections({ name: 'appointments' }).toArray();
  
  if (collections.length === 0) {
    console.log('Appointments collection does not exist, skipping index migration');
    return;
  }

  const collection = mongoose.connection.collection('appointments');
  const indexes = await collection.indexes();
  const uniqueSlotIndexName = 'doctor_1_appointmentDate_1_startTime_1';

  const hasUniqueSlotIndex = indexes.some(
    (idx) =>
      idx.name === uniqueSlotIndexName &&
      idx.unique === true
  );

  if (hasUniqueSlotIndex) {
    await collection.dropIndex(uniqueSlotIndexName);
    console.log('Dropped unique appointment slot index');
  }

  const hasNonUniqueSlotIndex = indexes.some(
    (idx) =>
      idx.name === uniqueSlotIndexName &&
      !idx.unique
  );

  if (!hasNonUniqueSlotIndex) {
    await collection.createIndex(
      { doctor: 1, appointmentDate: 1, startTime: 1 },
      { name: uniqueSlotIndexName }
    );
    console.log('Created non-unique appointment slot index');
  }
};

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in environment variables');
  }

  await mongoose.connect(mongoUri, { autoIndex: false });
  await migrateAppointmentSlotIndex();
  console.log('MongoDB connected');
};
