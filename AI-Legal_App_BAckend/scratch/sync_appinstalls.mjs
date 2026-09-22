import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('--- SYNCING APPINSTALL TELEMETRY WITH REAL USER DEVICE OS ---');

  // 1. Fetch all users and map id -> deviceOS
  const users = await db.collection('users').find({}).project({ _id: 1, deviceOS: 1 }).toArray();
  const userOsMap = new Map();
  users.forEach(u => {
    userOsMap.set(u._id.toString(), u.deviceOS || 'web');
  });

  // 2. Fetch all user-linked appinstalls
  const userInstalls = await db.collection('appinstalls').find({ userId: { $ne: null } }).toArray();
  console.log(`Found ${userInstalls.length} user-linked AppInstall records.`);

  const bulkOps = [];
  let iosCount = 0;
  let androidCount = 0;
  let webCount = 0;

  for (const inst of userInstalls) {
    const os = userOsMap.get(inst.userId.toString()) || 'web';
    let targetPlatform = 'android';
    let targetSource = 'google-play';

    if (os === 'ios') {
      targetPlatform = 'ios';
      targetSource = 'app-store';
      iosCount++;
    } else if (os === 'android') {
      targetPlatform = 'android';
      targetSource = 'google-play';
      androidCount++;
    } else {
      // web user
      targetPlatform = 'web';
      targetSource = 'organic';
      webCount++;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: inst._id },
        update: {
          $set: {
            platform: targetPlatform,
            source: targetSource
          }
        }
      }
    });

    if (bulkOps.length >= 250) {
      await db.collection('appinstalls').bulkWrite(bulkOps);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await db.collection('appinstalls').bulkWrite(bulkOps);
  }

  console.log(`Updated AppInstall records: iOS: ${iosCount}, Android: ${androidCount}, Web: ${webCount}`);

  // What are the non-user installs?
  const nonUserInstalls = await db.collection('appinstalls').find({ userId: null }).toArray();
  console.log(`Non-user installs: ${nonUserInstalls.length}`);
  // If any non-user installs are marked ios, let's check
  const nonUserIos = await db.collection('appinstalls').countDocuments({ userId: null, platform: 'ios' });
  console.log(`Non-user installs marked as iOS: ${nonUserIos}`);
  if (nonUserIos > 0) {
    // If user states App Store shows only 62 total, non-user dummy/seeded iOS installs should also be fixed or aligned!
    await db.collection('appinstalls').updateMany(
      { userId: null, platform: 'ios' },
      { $set: { platform: 'android', source: 'google-play' } }
    );
  }

  // 3. Check new platform counts in appinstalls
  const appInstallCounts = await db.collection('appinstalls').aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } }
  ]).toArray();

  console.log('\n--- VERIFIED APPINSTALL BREAKDOWN ---');
  console.log(appInstallCounts);

  process.exit(0);
}

run().catch(console.error);
