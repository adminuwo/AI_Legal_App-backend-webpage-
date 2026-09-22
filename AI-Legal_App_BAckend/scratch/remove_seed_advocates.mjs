import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await connectDB();
  console.log('Connected to DB');

  const defaultEmails = [
    'adv.rajeshwar@ailegal.app',
    'adv.priya@ailegal.app',
    'adv.vikram@ailegal.app',
    'adv.ananya@ailegal.app'
  ];

  const res = await User.deleteMany({ email: { $in: defaultEmails } });
  console.log('Deleted default seed advocates:', res.deletedCount);

  const remaining = await User.find({ 'advocateVerification.verificationStatus': 'verified' }).select('name email advocateVerification.verificationStatus').lean();
  console.log('Remaining verified advocates count:', remaining.length);
  console.log(remaining);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
