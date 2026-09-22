import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from '../models/User.js';

async function updateName() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  await User.updateOne({ email: 'abha@uwo24.com' }, {
    $set: {
      name: 'Abha',
      fullName: 'Abha',
      'advocateVerification.fullName': 'Abha'
    }
  });
  const u = await User.findOne({ email: 'abha@uwo24.com' }).lean();
  console.log('Updated user name:', u.name, u.fullName, 'Status:', u.advocateVerification?.verificationStatus);
  await mongoose.disconnect();
}

updateName().catch(console.error);
