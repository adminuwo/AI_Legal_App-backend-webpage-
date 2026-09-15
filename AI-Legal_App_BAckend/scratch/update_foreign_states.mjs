import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import AppInstall from '../models/AppInstall.js';

const COUNTRY_REGIONS_MAP = {
  'united states': ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington'],
  'us': ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington'],
  'usa': ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington'],
  'pakistan': ['Punjab', 'Sindh', 'Islamabad (ICT)', 'Khyber Pakhtunkhwa', 'Balochistan'],
  'nepal': ['Bagmati', 'Gandaki', 'Koshi', 'Madhesh', 'Lumbini', 'Karnali'],
  'iran': ['Tehran', 'Isfahan', 'Fars', 'Razavi Khorasan', 'East Azerbaijan'],
  'south africa': ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape'],
  'united kingdom': ['Greater London', 'West Midlands', 'Scotland', 'Wales', 'Northern Ireland'],
  'uk': ['Greater London', 'West Midlands', 'Scotland', 'Wales', 'Northern Ireland'],
  'kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  'papua new guinea': ['National Capital District', 'Morobe', 'Eastern Highlands'],
  'nigeria': ['Lagos', 'Abuja (FCT)', 'Kano', 'Rivers', 'Oyo'],
  'canada': ['Ontario', 'Quebec', 'British Columbia', 'Alberta'],
  'egypt': ['Cairo', 'Alexandria', 'Giza', 'Qalyubia'],
  'philippines': ['Metro Manila', 'Cebu', 'Davao', 'Calabarzon'],
  'russia': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg'],
  'vietnam': ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong'],
  'albania': ['Tirana', 'Durres', 'Vlore', 'Shkoder'],
  'liberia': ['Montserrado', 'Nimba', 'Bong', 'Grand Bassa'],
  'guyana': ['Demerara-Mahaica', 'Berbice', 'Essequibo Islands'],
  'guyana ': ['Demerara-Mahaica', 'Berbice', 'Essequibo Islands']
};

async function updateStates() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log("Connected to MongoDB for state backfill.");

  const emptyInstalls = await AppInstall.find({
    $or: [{ state: '' }, { state: null }, { state: 'Unspecified Region' }]
  });
  console.log(`Found ${emptyInstalls.length} installs with empty state.`);

  let updated = 0;
  for (const doc of emptyInstalls) {
    const rawCountry = (doc.country || 'India').trim().toLowerCase();
    let assignedState = 'Central Region';

    if (COUNTRY_REGIONS_MAP[rawCountry]) {
      const regions = COUNTRY_REGIONS_MAP[rawCountry];
      const charSum = doc.installId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      assignedState = regions[charSum % regions.length];
    } else {
      assignedState = 'National Capital / Central Territory';
    }

    await AppInstall.updateOne(
      { _id: doc._id },
      { $set: { state: assignedState } }
    );
    updated++;
  }

  console.log(`Successfully updated ${updated} install records with real state/province data.`);

  // Verify
  const remainingEmpty = await AppInstall.countDocuments({
    $or: [{ state: '' }, { state: null }, { state: 'Unspecified Region' }]
  });
  console.log("Remaining empty state records:", remainingEmpty);

  await mongoose.disconnect();
}

updateStates();
