import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_ATLAS_URI;

async function run() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const requests = await db.collection('consultationrequests').find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();

  console.log(`Total requests: ${requests.length}`);

  // Group active requests by user + advocate
  const map = new Map();
  const toRemove = [];

  for (const r of requests) {
    if (['pending', 'accepted', 'scheduled'].includes(r.status)) {
      const key = `${r.userId}_${r.advocateId || r.advocateName}`;
      if (!map.has(key)) {
        map.set(key, r);
      } else {
        // This is an older active request for the same advocate!
        const keeper = map.get(key);
        console.log(`Found duplicate active request: ${r.requestId} (mode: ${r.consultationType}) for advocate ${r.advocateName}, merging into ${keeper.requestId} (mode: ${keeper.consultationType})`);

        // Move any messages from older request to keeper request
        await db.collection('consultationmessages').updateMany(
          { consultationRequestId: r._id },
          { $set: { consultationRequestId: keeper._id } }
        );

        toRemove.push(r._id);
      }
    }
  }

  if (toRemove.length > 0) {
    const delRes = await db.collection('consultationrequests').deleteMany({ _id: { $in: toRemove } });
    console.log(`Deleted ${delRes.deletedCount} older duplicate consultation request(s).`);
  } else {
    console.log('No duplicate active requests found.');
  }

  await db.collection('consultationrequests').updateMany(
    { advocateName: 'Abha' },
    { $set: { status: 'accepted' } }
  );
  console.log('Abha consultation request set to accepted');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
