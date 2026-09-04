import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ailegal';

async function cleanupLegacyPlans() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[DB] Connected to MongoDB');

    const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }));

    const validPrefixes = ['advocate_', 'student_', 'firm_', 'combo_'];
    const allPlans = await Plan.find({}).lean();

    const legacyPlans = allPlans.filter(p => {
      const pId = p.planId || p.id || '';
      return !validPrefixes.some(pref => pId.startsWith(pref));
    });

    console.log(`[CLEANUP] Found ${legacyPlans.length} legacy plans to remove:`, legacyPlans.map(p => p.planId || p.id || p.planName));

    if (legacyPlans.length > 0) {
      const idsToRemove = legacyPlans.map(p => p._id);
      const res = await Plan.deleteMany({ _id: { $in: idsToRemove } });
      console.log(`[CLEANUP] Successfully deleted ${res.deletedCount} legacy plans from DB.`);
    } else {
      console.log('[CLEANUP] No legacy plans found. DB is already clean!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[CLEANUP ERROR]', err);
    process.exit(1);
  }
}

cleanupLegacyPlans();
