const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_legal', { dbName: process.env.DB_NAME || 'AISA' });
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'aditi@uwo24.com' });
  console.log('User:', user._id, user.email, 'Role:', user.role);

  const total = await mongoose.connection.db.collection('users').countDocuments();
  console.log('Total Users:', total);

  const countries = await mongoose.connection.db.collection('users').aggregate([
    { $group: { _id: { $ifNull: ['$country', 'India'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Countries breakdown:', JSON.stringify(countries, null, 2));

  const states = await mongoose.connection.db.collection('users').aggregate([
    { $match: { $or: [{ state: { $exists: true, $ne: '' } }, { 'legalJurisdiction.state': { $exists: true, $ne: '' } }] } },
    { $group: { _id: { $ifNull: ['$legalJurisdiction.state', '$state'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('States breakdown:', JSON.stringify(states, null, 2));

  const platforms = await mongoose.connection.db.collection('users').aggregate([
    { $group: { _id: '$deviceOS', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Platforms breakdown:', JSON.stringify(platforms, null, 2));

  const dateStats = await mongoose.connection.db.collection('users').aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 10 }
  ]).toArray();
  console.log('Recent 10 days user creation:', JSON.stringify(dateStats, null, 2));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
