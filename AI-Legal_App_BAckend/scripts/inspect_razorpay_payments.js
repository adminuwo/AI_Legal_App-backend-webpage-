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
  const allPayments = await Payment.find({}).lean();
  console.log('Total Payment documents in MongoDB:', allPayments.length);
  allPayments.forEach((p, idx) => {
    console.log(`[${idx+1}] ID: ${p._id}, gateway: ${p.gateway}, status: ${p.status}, amount: ${p.amount}, createdAt: ${p.createdAt}`);
  });

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
