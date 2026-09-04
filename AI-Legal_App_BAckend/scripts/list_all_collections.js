import mongoose from 'mongoose';
import dns from 'dns';
import { MONGO_URI } from '../config/env.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function inspectDB() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI, { family: 4 });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\n=================== MONGODB ATLAS LIVE DATA ===================');
    console.log('Collections List:', collections.map(c => c.name));

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- Collection "${col.name}": ${count} documents`);
    }

    // Inspect paymenthistories / payments collection
    const pCol = collections.find(c => c.name.toLowerCase().includes('payment'))?.name || 'paymenthistories';
    const latestPayment = await db.collection(pCol).findOne({}, { sort: { _id: -1 } });
    console.log(`\nLatest Payment in "${pCol}":`);
    console.log(JSON.stringify(latestPayment, null, 2));

    // Inspect user subscription
    const userDoc = await db.collection('users').findOne({ 'subscription.status': 'active' });
    console.log('\nUser with Active Subscription in "users" collection:');
    if (userDoc) {
      console.log(`Email: ${userDoc.email}`);
      console.log(`Current Tier: ${userDoc.currentTier}`);
      console.log(`Subscription:`, JSON.stringify(userDoc.subscription, null, 2));
    } else {
      console.log('No user with active status found, fetching last updated user...');
      const lastUser = await db.collection('users').findOne({}, { sort: { updatedAt: -1 } });
      console.log(`Email: ${lastUser?.email}`);
      console.log(`Subscription:`, JSON.stringify(lastUser?.subscription, null, 2));
    }

    console.log('\n=================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectDB();
