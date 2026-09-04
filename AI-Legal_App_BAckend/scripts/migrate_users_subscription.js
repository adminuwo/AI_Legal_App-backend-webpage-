import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import PlanUsage from '../models/PlanUsage.js';

const FREE_PLAN_LIMITS = {
  cases: 3,
  draft_maker: 2,
  court_prep: 2,
  legal_precedent: 2,
  evidence_analysis: 2,
  contract_review: 2,
  strategy_engine: 2,
  case_predictor: 2,
  mock_courtroom: 1,
  client_connect: 1,
  notes_maker: 2,
  quiz_practice: 5
};

async function migrateUsers() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aisa';
  console.log(`[MIGRATION] Connecting to MongoDB at ${mongoUri}...`);

  try {
    await mongoose.connect(mongoUri);
    console.log('[MIGRATION] Successfully connected to MongoDB.');

    const users = await User.find({});
    console.log(`[MIGRATION] Found ${users.length} total user accounts to audit.`);

    let migratedToFree = 0;
    let verifiedPaidUsers = 0;
    let superAdminsCount = 0;

    for (const user of users) {
      // 1. Preserve SUPER_ADMIN role
      if (user.role === 'SUPER_ADMIN') {
        superAdminsCount++;
        console.log(`[MIGRATION] Skipping SUPER_ADMIN user: ${user.email}`);
        continue;
      }

      // 2. Check for valid paid subscription in Subscription collection
      const activePaidSub = await Subscription.findOne({
        $or: [{ userId: user._id }, { accountId: user._id }],
        status: 'active',
        tier: { $nin: ['FREE', 'free', ''] },
        expiryDate: { $gt: new Date() }
      });

      // 3. Check for valid paid subscription inside User document
      const hasUserPaidSub = user.subscription &&
        user.subscription.status === 'active' &&
        ['BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE', 'basic', 'pro', 'premium', 'enterprise'].includes(user.subscription.plan) &&
        (user.subscription.paymentId || user.subscription.orderId) &&
        (!user.subscription.expiryDate || new Date(user.subscription.expiryDate) > new Date());

      if (activePaidSub || hasUserPaidSub) {
        verifiedPaidUsers++;
        const activePlan = activePaidSub?.tier || user.subscription?.plan || 'PAID';
        console.log(`[MIGRATION] Preserving verified paid subscriber (${activePlan}): ${user.email}`);
        continue;
      }

      // 4. User has NOT purchased a valid paid plan -> Migrate to FREE plan
      user.subscription = {
        plan: 'FREE',
        status: 'active',
        paymentId: '',
        orderId: '',
        amount: 0,
        currency: 'INR',
        gateway: 'Razorpay',
        invoice: '',
        autoRenew: false,
        expiryDate: null,
        purchaseDate: null
      };

      // Reset founderStatus / enterprise flags if any
      user.founderStatus = false;

      await user.save();

      // Reset PlanUsage entries for this user to FREE plan limits
      for (const [featureKey, limit] of Object.entries(FREE_PLAN_LIMITS)) {
        await PlanUsage.findOneAndUpdate(
          { userId: user._id, feature: featureKey },
          {
            $set: {
              plan: 'FREE',
              remainingCount: limit,
              usedCount: 0,
              resetDate: new Date()
            }
          },
          { upsert: true, new: true }
        );
      }

      migratedToFree++;
      console.log(`[MIGRATION] Successfully migrated user ${user.email} to FREE plan (1 GB storage, 3 My Matters, Free badge).`);
    }

    console.log('\n====================================================');
    console.log('SUBSCRIPTION MIGRATION SUMMARY REPORT');
    console.log('====================================================');
    console.log(`Total Accounts Audited : ${users.length}`);
    console.log(`Migrated to FREE Plan  : ${migratedToFree}`);
    console.log(`Verified Paid Subscribers: ${verifiedPaidUsers}`);
    console.log(`Super Admin Accounts   : ${superAdminsCount}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION] Database connection closed.');
  }
}

migrateUsers();
