import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_ATLAS_URI;
if (!uri) {
  console.error('MONGODB_ATLAS_URI environment variable is missing.');
  process.exit(1);
}

async function resetPass() {
  try {
    await mongoose.connect(uri, { family: 4 });
    console.log('Connected to DB:', mongoose.connection.name);

    const hashedPassword = await bcrypt.hash('Aditi@123', 10);
    const updateObj = {
      password: hashedPassword,
      failedAttempts: 0,
      lockoutUntil: null,
    };

    const res1 = await mongoose.connection.db.collection('users').updateOne(
      { email: 'aditi@uwo24.com' },
      { $set: updateObj }
    );
    console.log('aditi@uwo24.com reset result:', res1.modifiedCount);

    const res2 = await mongoose.connection.db.collection('users').updateOne(
      { email: 'aditilakhera0@gmail.com' },
      { $set: updateObj }
    );
    console.log('aditilakhera0@gmail.com reset result:', res2.modifiedCount);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetPass();
