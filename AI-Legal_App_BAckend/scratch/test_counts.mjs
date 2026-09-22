import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { getConveeExclusionFilter, buildNonConveeUserQuery } from '../controllers/adminPortalController.js';

dotenv.config();

async function testCounts() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/convee';
  await mongoose.connect(uri);

  const conveeFilter = await getConveeExclusionFilter(true);

  // Users tab
  const usersTabQuery = {};
  if (conveeFilter?.$and?.length > 0) {
    usersTabQuery.$and = [...conveeFilter.$and];
  }
  const usersTabCount = await User.countDocuments(usersTabQuery);

  // Overview tab
  const sandboxUsers = await User.find({
    $or: [
      { email: { $regex: /privaterelay\.appleid\.com|appleid\.com|sandbox|john\.apple|@ailegal\.app/i } },
      { name: { $regex: /john apple|sandbox|test user/i } }
    ]
  }).select('_id').lean();
  const sandboxUserIds = sandboxUsers.map(u => u._id);

  const overviewQuery = buildNonConveeUserQuery(conveeFilter, sandboxUserIds.length > 0 ? { _id: { $nin: sandboxUserIds } } : {});
  const overviewCount = await User.countDocuments(overviewQuery);

  console.log('--- Current Counts ---');
  console.log('Users Directory Tab Count:', usersTabCount);
  console.log('Overview Tab Count:', overviewCount);
  console.log('Difference:', usersTabCount - overviewCount);

  await mongoose.disconnect();
}

testCounts().catch(console.error);
