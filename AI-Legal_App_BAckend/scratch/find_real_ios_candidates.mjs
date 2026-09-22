import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Users with apple provider or icloud/appleid email
  const appleAuthUsers = await db.collection('users').find({
    $or: [
      { provider: 'apple' },
      { 'socialLinks.provider': 'apple' },
      { email: { $regex: /(appleid|icloud\.com|me\.com|mac\.com)/i } }
    ]
  }).toArray();
  console.log('Apple Auth / Email users:', appleAuthUsers.length);

  // 2. Users with real iOS app installs
  const iosInstalls = await db.collection('appinstalls').find({
    platform: 'ios',
    userId: { $ne: null }
  }).toArray();
  console.log('iOS installs linked to users:', iosInstalls.length);

  // 3. Check any userAgent with iPhone/iPad
  const iosUserAgentUsers = await db.collection('users').find({
    $or: [
      { userAgent: { $regex: /(iPhone|iPad|iOS|CFNetwork)/i } },
      { lastUserAgent: { $regex: /(iPhone|iPad|iOS|CFNetwork)/i } }
    ]
  }).toArray();
  console.log('iOS UserAgent users:', iosUserAgentUsers.length);

  // 4. Check AppInstalls collection total count for iOS
  const totalIosInstalls = await db.collection('appinstalls').countDocuments({ platform: 'ios' });
  console.log('Total AppInstalls with platform=ios:', totalIosInstalls);

  // 5. Check date range of users
  const recentIosUsers = await db.collection('users').find({
    deviceOS: 'ios'
  }).sort({ createdAt: -1 }).limit(10).project({ email: 1, name: 1, createdAt: 1, provider: 1 }).toArray();
  console.log('\n10 Most Recent users currently marked iOS:');
  recentIosUsers.forEach(u => console.log(`- ${u.email} (${u.name}) [${u.provider}] created: ${u.createdAt}`));

  process.exit(0);
}

run().catch(console.error);
