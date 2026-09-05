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

  const res = await User.updateMany(
    { email: { $regex: /^aditilakhera0@gmail\.com$/i } },
    { $set: { role: 'SUPER_ADMIN' } }
  );

  console.log('Updated aditilakhera0@gmail.com in MongoDB to SUPER_ADMIN:', res);

  const updatedDoc = await User.findOne({ email: 'aditilakhera0@gmail.com' }).lean();
  console.log('Verified DB document:', { id: updatedDoc._id, email: updatedDoc.email, role: updatedDoc.role });

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
