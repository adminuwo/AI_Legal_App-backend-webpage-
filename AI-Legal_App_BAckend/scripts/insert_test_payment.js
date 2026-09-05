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
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');
  const PaymentHistory = mongoose.model('PaymentHistory', new mongoose.Schema({}, { strict: false }), 'paymenthistories');

  const nehaUser = await User.findOne({ email: 'nehalakhera04@gmail.com' }).lean();
  if (!nehaUser) {
    console.error('User nehalakhera04@gmail.com not found!');
    process.exit(1);
  }

  const invoiceId = `INV-${Date.now()}-1`;

  // Create Payment record in Payment collection
  const newPayment = await Payment.create({
    userId: nehaUser._id,
    planId: 'test_plan',
    invoiceNumber: invoiceId,
    amount: 1,
    gst: 0.18,
    gateway: 'Razorpay',
    transactionId: 'pay_TSkUHCfYYiQTD4',
    razorpayPaymentId: 'pay_TSkUHCfYYiQTD4',
    razorpayOrderId: 'order_TSkUHCfYYiQTD4',
    status: 'success',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create PaymentHistory record
  const newPayHist = await PaymentHistory.create({
    accountId: nehaUser._id,
    razorpayPaymentId: 'pay_TSkUHCfYYiQTD4',
    razorpayOrderId: 'order_TSkUHCfYYiQTD4',
    invoice: invoiceId,
    gateway: 'Razorpay',
    amount: 1,
    currency: 'INR',
    status: 'paid',
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Successfully inserted Razorpay payment for nehalakhera04@gmail.com:');
  console.log('Payment doc:', JSON.stringify(newPayment, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
