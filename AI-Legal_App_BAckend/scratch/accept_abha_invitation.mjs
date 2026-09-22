import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import AdvocateInvitation from '../models/AdvocateInvitation.js';

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-legal';

async function acceptAbhaInvitation() {
  try {
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    const email = 'abha@uwo24.com';
    const now = new Date();

    // 1. Find User
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      console.error(`User with email ${email} not found!`);
      process.exit(1);
    }
    console.log(`Found user: ${user.name || user.fullName} (${user._id})`);

    // 2. Find Invitation
    const invitation = await AdvocateInvitation.findOne({
      invitedEmail: new RegExp(`^${email}$`, 'i')
    }).sort({ createdAt: -1 });

    if (!invitation) {
      console.error(`No invitation found for ${email}!`);
      process.exit(1);
    }
    console.log(`Found invitation: ID ${invitation._id}, Token: ${invitation.secureToken}, Status: ${invitation.status}`);

    // 3. Mark Invitation as Accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = now;
    invitation.consentAcceptedAt = now;
    invitation.linkedUserId = user._id;
    invitation.verificationStatus = 'pending';
    await invitation.save();
    console.log('✅ Invitation updated to ACCEPTED.');

    // 4. Update User with Advocate Verification
    user.advocateVerification = {
      verificationStatus: 'pending',
      listingConsent: 'accepted',
      listingConsentAt: now,
      verificationSubmittedAt: now,
      verifiedAt: null,
      verifiedBy: null,
      profileStatus: 'active',
      rejectionReason: '',
      consultationFee: 1500,
      consultationTypes: ['chat', 'audio', 'video'],
      availability: 'Available Today (10 AM - 6 PM)',
      languages: ['English', 'Hindi'],
      bio: 'Advocate specializing in civil disputes, corporate agreements, and commercial litigation.',
      primaryCourts: ['Delhi High Court', 'Supreme Court of India'],
      practiceAreas: ['Civil Law', 'Corporate Law', 'Commercial Law', 'Arbitration'],
      experienceYears: '5+ Years',
      barCouncil: 'Bar Council of Delhi',
      barEnrollmentNumber: 'D/4582/2019',
      enrollmentYear: '2019',
      verificationDocument: {
        name: 'Bar_Council_Enrollment_Certificate.pdf',
        uri: 'https://ailegal.app/docs/bar_certificate_uploaded.pdf',
        mimeType: 'application/pdf'
      },
      rating: 4.9,
      totalConsultations: 0
    };

    await user.save();
    console.log('✅ User updated with role="advocate" and advocateVerification status="pending".');

    console.log('\n--- VERIFICATION DATA SUMMARY ---');
    console.log('User ID:', user._id);
    console.log('User Role:', user.role);
    console.log('Advocate Verification Status:', user.advocateVerification.verificationStatus);
    console.log('Listing Consent:', user.advocateVerification.listingConsent);
    console.log('Bar Enrollment:', user.advocateVerification.barEnrollmentNumber);
    console.log('Invitation Status:', invitation.status);
    console.log('Invitation Linked User:', invitation.linkedUserId);

    await mongoose.disconnect();
    console.log('\nDone successfully!');
  } catch (err) {
    console.error('Error accepting invitation:', err);
    process.exit(1);
  }
}

acceptAbhaInvitation();
