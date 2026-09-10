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

  const updateRes = await User.updateOne(
    { email: 'admin@uwo24.com' },
    { $set: { role: 'admin' } }
  );
  console.log('MongoDB update result:', updateRes);

  const adminDoc = await User.findOne({ email: 'admin@uwo24.com' }).lean();
  console.log('Current admin@uwo24.com document:', {
    _id: adminDoc._id,
    name: adminDoc.name,
    email: adminDoc.email,
    role: adminDoc.role
  });

  process.exit(0);
}).catch(err => {
  console.error('Update error:', err);
  process.exit(1);
});
