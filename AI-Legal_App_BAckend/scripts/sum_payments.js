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
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  const payments = await Payment.find({}).lean();
  console.log('--- Payment Collection ---');
  let pRazor = 0, pApple = 0, pAdmin = 0, pOther = 0;
  payments.forEach(p => {
    const gw = (p.gateway || '').toLowerCase();
    if (gw.includes('razorpay')) pRazor += (p.amount || 0);
    else if (gw.includes('apple')) pApple += (p.amount || 0);
    else if (gw.includes('admin')) pAdmin += (p.amount || 0);
    else pOther += (p.amount || 0);
  });
  console.log(`Payment sums: Razorpay=${pRazor}, Apple=${pApple}, Admin=${pAdmin}, Other=${pOther}`);

  const payHists = await PaymentHistory.find({}).lean();
  console.log('--- PaymentHistory Collection ---');
  let phRazor = 0, phApple = 0, phAdmin = 0, phOther = 0;
  payHists.forEach(p => {
    const gw = (p.gateway || '').toLowerCase();
    if (gw.includes('razorpay')) phRazor += (p.amount || 0);
    else if (gw.includes('apple')) phApple += (p.amount || 0);
    else if (gw.includes('admin')) phAdmin += (p.amount || 0);
    else phOther += (p.amount || 0);
  });
  console.log(`PaymentHistory sums: Razorpay=${phRazor}, Apple=${phApple}, Admin=${phAdmin}, Other=${phOther}`);

  const users = await User.find({ 'subscription.amount': { $gt: 0 } }).lean();
  let userSubSum = 0;
  users.forEach(u => userSubSum += (u.subscription?.amount || 0));
  console.log(`User.subscription.amount sum across all users: ${userSubSum}`);

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
