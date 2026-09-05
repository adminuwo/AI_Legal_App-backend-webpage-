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
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }), 'subscriptions');
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');
  const PaymentHistory = mongoose.model('PaymentHistory', new mongoose.Schema({}, { strict: false }), 'paymenthistories');

  const nehaUser = await User.findOne({ email: 'nehalakhera04@gmail.com' }).lean();
  console.log('Neha User doc:', JSON.stringify(nehaUser, null, 2));

  if (nehaUser) {
    const subs = await Subscription.find({ $or: [{ userId: nehaUser._id }, { accountId: nehaUser._id }] }).lean();
    console.log('Neha Subscriptions:', JSON.stringify(subs, null, 2));

    const pays = await Payment.find({ userId: nehaUser._id }).lean();
    console.log('Neha Payments in Payment collection:', JSON.stringify(pays, null, 2));

    const payHists = await PaymentHistory.find({ accountId: nehaUser._id }).lean();
    console.log('Neha PaymentHistories:', JSON.stringify(payHists, null, 2));
  }

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
