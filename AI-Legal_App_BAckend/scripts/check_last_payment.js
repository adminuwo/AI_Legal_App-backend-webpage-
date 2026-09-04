import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import PaymentHistory from '../models/PaymentHistory.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ailegal';

async function checkLatestPayment() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n=================== MONGODB DB VERIFICATION ===================');

    const latestPayment = await PaymentHistory.findOne().sort({ createdAt: -1, _id: -1 }).lean();
    console.log('\n1. LATEST PAYMENT HISTORY RECORD IN DB:');
    console.log(JSON.stringify(latestPayment, null, 2));

    const latestSubscription = await Subscription.findOne().sort({ createdAt: -1, _id: -1 }).lean();
    console.log('\n2. LATEST ACTIVE SUBSCRIPTION RECORD IN DB:');
    console.log(JSON.stringify(latestSubscription, null, 2));

    const user = await User.findOne({ 'subscription.status': 'active' }).select('email name subscription currentTier currentWorkspace').lean();
    console.log('\n3. USER PROFILE SUBSCRIPTION IN MONGODB:');
    console.log(JSON.stringify(user, null, 2));

    console.log('\n=================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[CHECK ERROR]', err);
    process.exit(1);
  }
}

checkLatestPayment();
