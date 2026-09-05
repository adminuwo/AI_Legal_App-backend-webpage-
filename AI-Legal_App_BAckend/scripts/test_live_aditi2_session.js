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
  if (!aditi2) {
    console.log('User aditilakhera0@gmail.com not found');
    process.exit(1);
  }

  const token = jwt.sign(
    { id: aditi2._id, userId: aditi2._id, email: aditi2.email, name: aditi2.name, role: 'SUPER_ADMIN' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  // Create active session in DB
  await Session.create({
    userId: aditi2._id,
    token,
    deviceInfo: 'Test Node Script',
    isActive: true,
    lastActive: new Date()
  });

  console.log('Created valid active session for aditilakhera0@gmail.com. Hitting /api/admin/stats...');

  const res = await fetch('http://localhost:8080/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Status code:', res.status);
  console.log('Response body:', JSON.stringify(data, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
