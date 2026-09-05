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
  const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }), 'sessions');
  const aditiUser = await User.findOne({ email: 'aditi@uwo24.com' }).lean();

  if (!aditiUser) {
    console.error('Aditi user not found');
    process.exit(1);
  }

  // Create a real active session in Session collection
  const authRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aditi@uwo24.com', password: 'password123' })
  }).catch(() => null);

  let token;
  if (authRes && authRes.ok) {
    const authData = await authRes.json();
    token = authData.token;
  } else {
    // Manually create session token if password login fails
    const jwt = (await import('jsonwebtoken')).default;
    token = jwt.sign({ id: aditiUser._id, role: 'SUPER_ADMIN' }, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    await Session.create({
      userId: aditiUser._id,
      token,
      isActive: true,
      createdAt: new Date(),
      lastActive: new Date()
    });
  }

  const response = await fetch('http://localhost:8080/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json();
  console.log('GET /api/admin/stats with VALID ACTIVE SESSION:', JSON.stringify(data, null, 2));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
