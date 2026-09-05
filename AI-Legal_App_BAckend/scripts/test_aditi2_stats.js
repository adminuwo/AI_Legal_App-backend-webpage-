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

  const aditi2 = await User.findOne({ email: 'aditilakhera0@gmail.com' }).lean();
  if (!aditi2) {
    console.log('aditilakhera0@gmail.com user not found');
    process.exit(1);
  }

  const token = jwt.sign(
    { id: aditi2._id, userId: aditi2._id, email: aditi2.email, role: aditi2.role || 'SUPER_ADMIN' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  console.log('Testing GET /api/admin/stats with aditilakhera0@gmail.com token...');
  const res = await fetch('http://localhost:8080/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Response for aditilakhera0@gmail.com:', JSON.stringify(data, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
