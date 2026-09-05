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
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }), 'subscriptions');
  const PaymentHistory = mongoose.model('PaymentHistory', new mongoose.Schema({}, { strict: false }), 'paymenthistories');

  const allPayments = await Payment.find({}).lean();
  console.log('Total Payment documents count:', allPayments.length);
  console.log('All Payment documents:', JSON.stringify(allPayments, null, 2));

  const allPayHist = await PaymentHistory.find({}).lean();
  console.log('Total PaymentHistory documents count:', allPayHist.length);
  console.log('All PaymentHistory documents:', JSON.stringify(allPayHist, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
