import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_legal';

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || 'AISA' });

    const aditiIds = [
      '6a30fac276e1c8026477a8cd', // aditi@uwo24.com
      '6a6dab9d9aa61d39a640e5d5', // aditilakhera0@gmail.com
      '6a7abc9651774083516d352a', // aaditipandey495@gmail.com
      '6a81d7843fc8735af4a8044e',
      '6a6c363df39cea5b0a34f5dc'
    ];

    for (const id of aditiIds) {
      const u = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(id) });
      const count = await mongoose.connection.db.collection('projects').countDocuments({
        $or: [
          { userId: id },
          { userId: new mongoose.Types.ObjectId(id) },
          { assignedMembers: id },
          { assignedMembers: new mongoose.Types.ObjectId(id) }
        ]
      });
      console.log(`User ID: ${id} | Email: ${u ? u.email : 'UNKNOWN'} | Cases Count: ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
