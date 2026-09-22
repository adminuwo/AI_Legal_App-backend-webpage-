import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function deleteSandboxUsers() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/convee';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const sandboxQuery = {
    $or: [
      { email: { $regex: /privaterelay\.appleid\.com|appleid\.com|sandbox|john\.apple/i } },
      { name: { $regex: /john apple|sandbox|test user/i } }
    ]
  };

  const users = await db.collection('users').find(sandboxQuery).toArray();
  console.log(`Found ${users.length} sandbox/test users to delete:`);
  users.forEach(u => console.log(` - [${u._id}] ${u.name} <${u.email}> (${u.deviceOS})`));

  if (users.length === 0) {
    console.log('No sandbox users found.');
    await mongoose.disconnect();
    return;
  }

  const userIds = users.map(u => u._id);
  const userObjectIds = userIds.map(id => {
    try { return new mongoose.Types.ObjectId(id); } catch (e) { return id; }
  });
  const userStringIds = userIds.map(id => id.toString());
  const allIdVariants = [...new Set([...userIds, ...userObjectIds, ...userStringIds])];

  // 1. Delete linked AppInstall records
  const instDel = await db.collection('appinstalls').deleteMany({
    $or: [
      { userId: { $in: allIdVariants } },
      { installId: { $in: userStringIds.map(id => `inst_user_${id}`) } }
    ]
  });
  console.log(`Deleted ${instDel.deletedCount} linked appinstall records.`);

  // 2. Delete linked sessions
  const sessDel = await db.collection('sessions').deleteMany({
    userId: { $in: allIdVariants }
  });
  console.log(`Deleted ${sessDel.deletedCount} sessions.`);

  // 3. Delete from users collection
  const userDel = await db.collection('users').deleteMany({
    _id: { $in: allIdVariants }
  });
  console.log(`Deleted ${userDel.deletedCount} users from 'users' collection.`);

  // 4. Verify remaining users
  const remainingTotal = await db.collection('users').countDocuments();
  const byOS = await db.collection('users').aggregate([
    { $group: { _id: '$deviceOS', count: { $sum: 1 } } }
  ]).toArray();

  console.log(`\nRemaining total users in DB: ${remainingTotal}`);
  console.log('Breakdown by deviceOS:', byOS);

  await mongoose.disconnect();
}

deleteSandboxUsers().catch(console.error);
