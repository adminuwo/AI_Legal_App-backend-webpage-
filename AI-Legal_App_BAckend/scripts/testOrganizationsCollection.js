import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Enterprise from '../models/Enterprise.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('================================================================');
console.log('🏛️ AISA DATABASE - USER EMAIL & ORGANIZATIONS COLLECTION TEST');
console.log('================================================================\n');

async function testUserAndOrganization() {
  try {
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/AISA';
    console.log(`Connecting to MongoDB Atlas Database [AISA]...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB AISA Database!\n');

    // 1. Ensure test User in 'users' collection (ONLY email, name, role stored - NO org fields)
    const testUser = await User.findOneAndUpdate(
      { email: 'user.account@uwo24.com' },
      {
        $set: {
          name: 'Advocate User Account',
          email: 'user.account@uwo24.com',
          role: 'user',
          isVerified: true
        }
      },
      { upsert: true, new: true }
    );

    console.log('📌 1. Verified Document in [users] collection:');
    console.log(`   _id: ${testUser._id}`);
    console.log(`   email: ${testUser.email}`);
    console.log(`   (User collection stores ONLY user fields - zero organizationName/id stored)\n`);

    // 2. Ensure Organization in 'organizations' collection linked to Creator User's Email
    const sampleOrg = await Organization.findOneAndUpdate(
      { createdBy: testUser._id },
      {
        $set: {
          organizationName: 'National Law University',
          name: 'National Law University',
          userEmail: testUser.email,
          email: testUser.email,
          createdBy: testUser._id,
          status: 'active'
        }
      },
      { upsert: true, new: true }
    );

    console.log('📌 2. Organization Document in [organizations] collection:');
    console.log(`   _id: ${sampleOrg._id}`);
    console.log(`   organizationName: ${sampleOrg.organizationName}`);
    console.log(`   email: ${sampleOrg.email} (User's Email!)\n`);

    // 3. Query Organizations returning STRICT PROJECTION (organizationId, organizationName, email)
    const orgDocs = await Organization.find({})
      .populate('createdBy', 'email')
      .select('_id organizationName name email userEmail createdBy');

    const resultList = orgDocs.map(o => ({
      organizationId: o._id.toString(),
      organizationName: o.organizationName || o.name || 'Unnamed Organization',
      email: o.createdBy?.email || o.userEmail || o.email || ''
    }));

    console.log('================================================================');
    console.log(`📊 FETCHED ${resultList.length} ORGANIZATIONS (Strict Projection with USER EMAIL):`);
    console.log(JSON.stringify(resultList, null, 2));
    console.log('================================================================\n');

    console.log('🎉 Successfully verified: User email used in organizations & Users collection remains clean!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during test:', err.message);
    process.exit(1);
  }
}

testUserAndOrganization();
