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

  const aditi1 = await User.findOne({ email: 'aditi@uwo24.com' }).lean();
  console.log('aditi@uwo24.com DB doc:', aditi1 ? { id: aditi1._id, email: aditi1.email, role: aditi1.role } : 'NOT FOUND');

  const aditi2 = await User.findOne({ email: 'aditilakhera0@gmail.com' }).lean();
  console.log('aditilakhera0@gmail.com DB doc:', aditi2 ? { id: aditi2._id, email: aditi2.email, role: aditi2.role } : 'NOT FOUND');

  // Find all users with SUPER_ADMIN or admin role
  const admins = await User.find({ role: { $in: ['admin', 'SUPER_ADMIN'] } }).lean();
  console.log('All admin users in DB:', admins.map(u => ({ id: u._id, email: u.email, role: u.role })));

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
