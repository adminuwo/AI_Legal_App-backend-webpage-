import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }), 'sessions');

  const aditi2 = await User.findOne({ email: 'aditilakhera0@gmail.com' });
  const token = jwt.sign(
    { id: aditi2._id, userId: aditi2._id, email: aditi2.email, name: aditi2.name, role: 'SUPER_ADMIN' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  await Session.create({
    userId: aditi2._id,
    token,
    deviceInfo: 'Test Node Script Billing',
    isActive: true,
    lastActive: new Date()
  });

  console.log('Fetching /api/admin/stats...');
  const resStats = await fetch('http://localhost:8080/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataStats = await resStats.json();
  console.log('Stats Response:', JSON.stringify(dataStats.stats, null, 2));

  console.log('Fetching /api/admin/billing...');
  const resBilling = await fetch('http://localhost:8080/api/admin/billing?limit=200', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataBilling = await resBilling.json();
  console.log('Billing Response List Count:', dataBilling.list?.length);
  const razorpayPayments = dataBilling.list?.filter(p => String(p.gateway).toLowerCase().includes('razorpay'));
  console.log('Razorpay Payments in Billing List:', JSON.stringify(razorpayPayments, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
