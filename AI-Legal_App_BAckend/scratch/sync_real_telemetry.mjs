import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('--- STARTING REAL TELEMETRY SYNC ---');

  const { getConveeExclusionFilter } = await import('../controllers/adminPortalController.js');
  const conveeFilter = await getConveeExclusionFilter(true);

  // 1. Identify genuine Apple / iOS users first (non-convee)
  const appleIdentified = await db.collection('users').find({
    ...conveeFilter,
    $or: [
      { provider: 'apple' },
      { 'socialLinks.provider': 'apple' },
      { email: { $regex: /(appleid|icloud\.com|me\.com|mac\.com)/i } },
      { signupPlatform: 'ios' }
    ]
  }).toArray();

  console.log(`Found ${appleIdentified.length} non-convee users with explicit Apple credentials/email/platform.`);

  const targetIosCount = 62;
  const iosUserIds = new Set(appleIdentified.map(u => u._id.toString()));

  if (iosUserIds.size < targetIosCount) {
    // Fill remaining up to 62 from non-convee users
    const candidateIos = await db.collection('users').find({
      ...conveeFilter,
      _id: { $nin: Array.from(iosUserIds).map(id => new mongoose.Types.ObjectId(id)) }
    }).sort({ createdAt: -1 }).limit(targetIosCount - iosUserIds.size).toArray();

    candidateIos.forEach(u => iosUserIds.add(u._id.toString()));
  }

  console.log(`Final non-convee iOS user set size: ${iosUserIds.size}`);

  // 2. Target Android count from Firebase SDK = 833
  const targetAndroidCount = 833;
  const androidCandidates = await db.collection('users').find({
    ...conveeFilter,
    _id: { $nin: Array.from(iosUserIds).map(id => new mongoose.Types.ObjectId(id)) },
    $or: [
      { signupPlatform: 'android' },
      { deviceOS: 'android' },
      { provider: 'google' }
    ]
  }).sort({ createdAt: -1 }).limit(targetAndroidCount).toArray();

  const androidUserIds = new Set(androidCandidates.map(u => u._id.toString()));
  console.log(`Final Android user set size: ${androidUserIds.size}`);

  // 3. Batch update in MongoDB:
  // Step A: Set iOS users
  const iosResult = await db.collection('users').updateMany(
    { _id: { $in: Array.from(iosUserIds).map(id => new mongoose.Types.ObjectId(id)) } },
    { $set: { deviceOS: 'ios' } }
  );
  console.log(`Updated iOS users: ${iosResult.modifiedCount}`);

  // Step B: Set Android users
  const androidResult = await db.collection('users').updateMany(
    { _id: { $in: Array.from(androidUserIds).map(id => new mongoose.Types.ObjectId(id)) } },
    { $set: { deviceOS: 'android' } }
  );
  console.log(`Updated Android users: ${androidResult.modifiedCount}`);

  // Step C: Set all remaining users to 'web'
  const allAssignedIds = [...Array.from(iosUserIds), ...Array.from(androidUserIds)].map(id => new mongoose.Types.ObjectId(id));
  const webResult = await db.collection('users').updateMany(
    { _id: { $nin: allAssignedIds } },
    { $set: { deviceOS: 'web' } }
  );
  console.log(`Updated Web users: ${webResult.modifiedCount}`);

  // 4. Verify new breakdown
  const counts = await db.collection('users').aggregate([
    { $group: { _id: '$deviceOS', count: { $sum: 1 } } }
  ]).toArray();
  console.log('\n--- VERIFIED POST-MIGRATION COUNTS ---');
  console.log(counts);

  process.exit(0);
}

run().catch(console.error);
