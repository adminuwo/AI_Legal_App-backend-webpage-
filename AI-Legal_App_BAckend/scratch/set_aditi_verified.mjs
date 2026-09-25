import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_ATLAS_URI;
  await mongoose.connect(mongoUri);

  const res = await mongoose.connection.collection('users').updateOne(
    { email: 'aditi@uwo24.com' },
    {
      $set: {
        'advocateVerification.verificationStatus': 'verified',
        'advocateVerification.listingConsent': 'accepted',
        'advocateVerification.barCouncil': 'Bar Council of Maharashtra & Goa',
        'advocateVerification.barEnrollmentNumber': 'MAH/5621/2017',
        'advocateVerification.enrollmentYear': '2017',
        'advocateVerification.practiceAreas': ['Civil Law', 'Corporate Law', 'Cyber Law', 'Commercial Law'],
        'advocateVerification.primaryCourts': ['High Court of Bombay', 'Supreme Court of India'],
        'advocateVerification.experienceYears': '7+ Years',
        'advocateVerification.languages': ['English', 'Hindi', 'Marathi'],
        'advocateVerification.bio': 'Senior Corporate Litigation Advocate & Legal Technology Researcher with expertise in Civil Law, Commercial Arbitration and Cyber Jurisprudence.',
        'advocateVerification.consultationFee': 1500,
        'advocateVerification.consultationTypes': ['chat', 'audio', 'video'],
        'advocateVerification.availability': 'Available Today',
        'advocateVerification.profileStatus': 'active'
      }
    }
  );

  console.log('✓ Successfully updated aditi@uwo24.com to verified advocate:', res.modifiedCount);
  await mongoose.disconnect();
}

run();
