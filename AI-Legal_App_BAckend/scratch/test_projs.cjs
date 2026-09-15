const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_legal', { dbName: process.env.DB_NAME || 'AISA' });
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'aditi@uwo24.com' });
  console.log('User:', user._id, user.email, 'Role:', user.role);

  const uId = user._id;
  const query = {
    $or: [
      { userId: uId },
      { userId: uId.toString() },
      { assignedMembers: uId },
      { assignedMembers: uId.toString() },
      { assignedTo: user.email },
      { members: { $elemMatch: { email: user.email } } }
    ]
  };
  const list = await mongoose.connection.db.collection('projects').find(query).toArray();
  console.log('Found projects:', list.length);
  list.forEach(p => console.log('Case:', p._id.toString(), '| Name:', p.name, '| isLegalCase:', p.isLegalCase));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
