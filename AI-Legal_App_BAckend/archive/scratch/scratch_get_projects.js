import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Project from './models/Project.js';

// Configure DNS servers to resolve MongoDB SRV records on Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
console.log('Attempting to connect to MongoDB URI:', uri);

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  family: 4
})
.then(async () => {
  console.log('✅ MongoDB connection successful!');
  const projects = await Project.find({}).sort({ updatedAt: -1 }).limit(5);
  console.log('Latest 5 Case Projects:');
  for (const p of projects) {
    console.log('------------------------------');
    console.log(`ID: ${p._id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Client: ${p.clientName}`);
    console.log(`CaseType: ${p.caseType}`);
    console.log(`isLegalCase: ${p.isLegalCase}`);
    console.log(`userId: ${p.userId}`);
  }
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});
