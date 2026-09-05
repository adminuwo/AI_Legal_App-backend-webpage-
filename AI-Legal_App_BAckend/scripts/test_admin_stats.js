import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const adminUser = await User.findOne({ role: 'SUPER_ADMIN' }).lean();
  
  if (!adminUser) {
    console.error('Super Admin user not found');
    process.exit(1);
  }

  // Update sessionToken to ensure valid session
  const sessionToken = adminUser.sessionToken || 'test_session_token';
  await User.updateOne({ _id: adminUser._id }, { $set: { sessionToken } });

  const token = jwt.sign(
    { id: adminUser._id, role: adminUser.role, sessionToken },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: '1h' }
  );

  const response = await fetch('http://localhost:8080/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json();
  console.log('GET /api/admin/stats Response:', JSON.stringify(data, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
