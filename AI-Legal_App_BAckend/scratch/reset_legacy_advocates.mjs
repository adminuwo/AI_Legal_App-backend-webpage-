import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function resetLegacyUsers() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_ATLAS_URI;
  await mongoose.connect(mongoUri);

  // Reset users who never submitted the new registration flow (listingConsent !== 'accepted')
  const res = await User.updateMany(
    {
      'advocateVerification.verificationStatus': { $ne: 'verified' },
      'advocateVerification.listingConsent': { $ne: 'accepted' }
    },
    {
      $set: {
        'advocateVerification.verificationStatus': 'not_registered',
        'advocateVerification.listingConsent': 'none'
      }
    }
  );

  console.log(`✓ Reset ${res.modifiedCount} legacy un-registered users to 'not_registered'`);

  const aditi = await User.findOne({ email: 'aditi@uwo24.com' });
  console.log('✓ aditi@uwo24.com status:', aditi?.advocateVerification?.verificationStatus, 'consent:', aditi?.advocateVerification?.listingConsent);

  await mongoose.disconnect();
}

resetLegacyUsers();
