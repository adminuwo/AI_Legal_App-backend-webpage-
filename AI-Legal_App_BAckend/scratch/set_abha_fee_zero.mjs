import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import ConsultationRequest from '../models/ConsultationRequest.js';

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_ATLAS_URI || 'mongodb://localhost:27017/ai-legal';

async function setAbhaFeeZero() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    // 1. Find Abha user
    const email = 'abha@uwo24.com';
    const abhaUsers = await User.find({
      $or: [
        { email: new RegExp(`^${email}$`, 'i') },
        { name: new RegExp('abha', 'i') },
        { fullName: new RegExp('abha', 'i') }
      ]
    });

    console.log(`Found ${abhaUsers.length} user(s) matching Abha:`);
    const abhaIds = [];
    for (const u of abhaUsers) {
      console.log(`- ${u.name || u.fullName} (${u.email}) [ID: ${u._id}] - current fee: ${u.advocateVerification?.consultationFee}`);
      abhaIds.push(u._id);

      if (!u.advocateVerification) {
        u.advocateVerification = {};
      }
      u.advocateVerification.consultationFee = 0;
      await u.save();
      console.log(`  -> Updated advocateVerification.consultationFee = 0 for ${u.email}`);
    }

    // 2. Also update all ConsultationRequest records for Abha
    const filter = {
      $or: [
        { advocateId: { $in: abhaIds } },
        { advocateName: new RegExp('abha', 'i') }
      ]
    };

    const requests = await ConsultationRequest.find(filter);
    console.log(`\nFound ${requests.length} consultation request(s) for Abha:`);

    for (const req of requests) {
      console.log(`- Request ID: ${req.requestId} [${req._id}], status: ${req.status}, paymentStatus: ${req.paymentStatus}, fee: ${req.fee}`);
      req.fee = 0;
      // Since fee is 0, mark as paid so client can chat directly
      req.paymentStatus = 'paid';
      await req.save();
      console.log(`  -> Updated fee: 0, paymentStatus: 'paid' for ${req.requestId}`);
    }

    console.log('\n✅ Successfully set Abha consultation fee to 0 and unlocked consultations!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error setting Abha fee:', err);
    process.exit(1);
  }
}

setAbhaFeeZero();
