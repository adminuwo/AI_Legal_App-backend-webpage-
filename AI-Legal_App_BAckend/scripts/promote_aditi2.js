import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  const aditi2 = await User.findOne({ email: 'aditilakhera0@gmail.com' });
  if (!aditi2) {
    console.log('User aditilakhera0@gmail.com not found in MongoDB database, creating or updating placeholder');
    // Check if user exists with any case
    const aditiIgnoreCase = await User.findOne({ email: { $regex: /^aditilakhera0@gmail\.com$/i } });
    if (aditiIgnoreCase) {
      await User.updateOne({ _id: aditiIgnoreCase._id }, { $set: { role: 'SUPER_ADMIN' } });
      console.log('Updated role to SUPER_ADMIN for:', aditiIgnoreCase.email);
    } else {
      console.log('No user document with aditilakhera0@gmail.com yet. It will auto-promote on login/signup.');
    }
  } else {
    await User.updateOne({ _id: aditi2._id }, { $set: { role: 'SUPER_ADMIN' } });
    console.log('Successfully updated aditilakhera0@gmail.com role to SUPER_ADMIN in MongoDB!');
  }

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
