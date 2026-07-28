import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  // Keep compound / partial indexes in sync after schema changes (Phase 2).
  if (process.env.SYNC_INDEXES === 'true') {
    const { Student } = await import('../models/Student.js');
    const { Teacher } = await import('../models/Teacher.js');
    const { FeeItem } = await import('../models/FeeItem.js');
    const { StudentIdCard } = await import('../models/StudentIdCard.js');
    await Promise.all([
      Student.syncIndexes(),
      Teacher.syncIndexes(),
      FeeItem.syncIndexes(),
      StudentIdCard.syncIndexes(),
    ]);
  }
  return mongoose.connection;
}
