import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri).then(async () => {
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');
  const PaymentHistory = mongoose.model('PaymentHistory', new mongoose.Schema({}, { strict: false }), 'paymenthistories');
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }), 'subscriptions');

  const pMatch = await Payment.find({ $or: [{ transactionId: 'pay_TSkUHCfYYiQTD4' }, { razorpayPaymentId: 'pay_TSkUHCfYYiQTD4' }] }).lean();
  console.log('Payment collection match for pay_TSkUHCfYYiQTD4:', JSON.stringify(pMatch, null, 2));

  const phMatch = await PaymentHistory.find({ $or: [{ transactionId: 'pay_TSkUHCfYYiQTD4' }, { razorpayPaymentId: 'pay_TSkUHCfYYiQTD4' }] }).lean();
  console.log('PaymentHistory collection match for pay_TSkUHCfYYiQTD4:', JSON.stringify(phMatch, null, 2));

  const subMatch = await Subscription.find({ $or: [{ paymentId: 'pay_TSkUHCfYYiQTD4' }, { razorpayPaymentId: 'pay_TSkUHCfYYiQTD4' }] }).lean();
  console.log('Subscription collection match for pay_TSkUHCfYYiQTD4:', JSON.stringify(subMatch, null, 2));

  // Also query recent payments created today
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const recentPayments = await Payment.find({ createdAt: { $gte: todayStart } }).lean();
  console.log('Recent Payments created today:', JSON.stringify(recentPayments, null, 2));

  const recentPH = await PaymentHistory.find({ createdAt: { $gte: todayStart } }).lean();
  console.log('Recent PaymentHistories created today:', JSON.stringify(recentPH, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
