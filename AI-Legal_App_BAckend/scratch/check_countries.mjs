import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import AppInstall from '../models/AppInstall.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const countries = await AppInstall.distinct('country');
  console.log('All distinct countries in AppInstall:', countries);
  
  for (const c of countries) {
    const states = await AppInstall.distinct('state', { country: c });
    console.log(`Country "${c}": states =`, states);
  }
  await mongoose.disconnect();
}

check();
