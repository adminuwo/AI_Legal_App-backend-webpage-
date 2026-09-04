import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { findPrecedents } from './Tools/AI_Legal/services/precedents.service.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
console.log('Connecting to MongoDB...');

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  family: 4
})
.then(async () => {
  console.log('Connected to MongoDB.');
  
  console.log('\n--- Searching for "Dowry case" ---');
  const results = await findPrecedents("Dowry case", null, 'English');
  console.log('\n--- Results ---');
  console.log('Query:', results.query);
  console.log('Mode:', results.mode);
  console.log('Count:', results.precedents.length);
  if (results.precedents.length > 0) {
    console.log('Top result:', results.precedents[0].case_name || results.precedents[0].case_identity?.case_name);
  } else {
    console.log('No precedents found.');
  }
  process.exit(0);
})
.catch(err => {
  console.error('Connection failed:', err);
  process.exit(1);
});
