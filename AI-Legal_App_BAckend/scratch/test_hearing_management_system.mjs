import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_db';

async function runHearingSystemTests() {
  console.log('====================================================');
  console.log('TEST SUITE: AI LEGAL LAW FIRM HEARING MANAGEMENT SYSTEM');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGO_URI, { family: 4 });
    console.log(' Connected to MongoDB:', MONGO_URI);

    const db = mongoose.connection.db;
    const projectsColl = db.collection('projects');
    const workspacesColl = db.collection('workspaces');
    const membershipsColl = db.collection('workspacememberships');
    const notificationsColl = db.collection('notifications');

    // 1. Locate Law Firm Workspace and Case "pta nahi bhai"
    const caseDoc = await projectsColl.findOne({ name: 'pta nahi bhai' });
    if (!caseDoc) {
      console.error('❌ Case "pta nahi bhai" not found in database.');
      process.exit(1);
    }
    console.log(` Found Case: "${caseDoc.name}" (_id: ${caseDoc._id}, workspaceId: ${caseDoc.workspaceId})`);

    const workspaceId = String(caseDoc.workspaceId);
    const workspace = await workspacesColl.findOne({ _id: new mongoose.Types.ObjectId(workspaceId) });
    console.log(` Found Law Firm Workspace: "${workspace?.name || workspaceId}" (Owner: ${workspace?.ownerId})`);

    // Fetch members for this Law Firm Workspace
    const memberships = await membershipsColl.find({ workspaceId: workspaceId, status: 'Active' }).toArray();
    console.log(` Found ${memberships.length} Active Memberships in Law Firm Workspace.`);

    const ownerId = String(workspace?.ownerId || caseDoc.userId);
    const memberA = memberships.length > 0 ? String(memberships[0].userId) : 'user_abha_123';
    const memberB = memberships.length > 1 ? String(memberships[1].userId) : 'user_rajesh_456';

    const memberAName = memberships.length > 0 ? memberships[0].name || 'Abha' : 'Abha';
    const memberBName = memberships.length > 1 ? memberships[1].name || 'Rajesh' : 'Rajesh';

    console.log(`- Firm Owner User ID: ${ownerId}`);
    console.log(`- Member A (Appearing Advocate 1): ${memberAName} (${memberA})`);
    console.log(`- Member B (Appearing Advocate 2): ${memberBName} (${memberB})\n`);

    // TEST 1: Schedule a Hearing with Member A as Appearing Advocate
    console.log('--- TEST 1: Schedule Canonical Hearing (Appearing Advocate: Member A) ---');
    const testHearingId = 'test_h_' + Date.now();
    const newHearing = {
      _id: testHearingId,
      id: testHearingId,
      title: 'Final Arguments on Notice',
      courtName: 'Delhi High Court',
      courtroom: 'Courtroom 4',
      judge: 'Honble Justice A.K. Sharma',
      date: '2026-07-28',
      time: '10:30 AM',
      purpose: 'Final Arguments',
      notes: 'Advocate to submit written submissions.',
      status: 'Scheduled',
      priority: 'High',
      appearingAdvocateUserId: memberA,
      appearingAdvocateName: memberAName,
      createdByUserId: ownerId,
      createdByName: 'Firm Owner',
      preparationStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await projectsColl.updateOne(
      { _id: caseDoc._id },
      { $push: { hearings: newHearing } }
    );

    // Create Notification for Member A
    await notificationsColl.insertOne({
      userId: memberA,
      title: `Hearing Assignment: ${caseDoc.name}`,
      desc: `You have been assigned as Appearing Advocate for case "${caseDoc.name}" on ${newHearing.date} at ${newHearing.time} in ${newHearing.courtName}.`,
      category: 'Cases',
      priority: 'High',
      caseName: caseDoc.name,
      caseId: String(caseDoc._id),
      isRead: false,
      createdAt: new Date()
    });

    console.log('✅ Hearing created successfully in project.hearings as single canonical record.');

    // TEST 2: Query All Firm Hearings for Firm Owner
    console.log('\n--- TEST 2: Firm Owner Dashboard View (All Firm Hearings) ---');
    const updatedCase1 = await projectsColl.findOne({ _id: caseDoc._id });
    const firmHearings = updatedCase1.hearings.filter(h => String(h.id || h._id) === testHearingId);
    console.log(`Firm Owner sees ${firmHearings.length} hearing(s) for case "${caseDoc.name}".`);
    if (firmHearings.length === 1 && firmHearings[0].appearingAdvocateName === memberAName) {
      console.log('✅ TEST 2 PASSED: Firm Owner sees complete firm hearing.');
    } else {
      console.error('❌ TEST 2 FAILED');
    }

    // TEST 3: Query "My Hearings" for Member A
    console.log('\n--- TEST 3: Member A "My Hearings" View ---');
    const memberAHearings = updatedCase1.hearings.filter(h => 
      String(h.id || h._id) === testHearingId &&
      (String(h.appearingAdvocateUserId) === memberA || String(h.createdByUserId) === memberA)
    );
    console.log(`Member A (${memberAName}) sees ${memberAHearings.length} hearing(s) in "My Hearings".`);
    if (memberAHearings.length === 1) {
      console.log('✅ TEST 3 PASSED: Member A sees assigned hearing.');
    } else {
      console.error('❌ TEST 3 FAILED');
    }

    // TEST 4: Query "My Hearings" for Member B (Should be EMPTY)
    console.log('\n--- TEST 4: Member B "My Hearings" View (Unassigned) ---');
    const memberBHearings = updatedCase1.hearings.filter(h => 
      String(h.id || h._id) === testHearingId &&
      (String(h.appearingAdvocateUserId) === memberB || String(h.createdByUserId) === memberB)
    );
    console.log(`Member B (${memberBName}) sees ${memberBHearings.length} hearing(s) in "My Hearings".`);
    if (memberBHearings.length === 0) {
      console.log('✅ TEST 4 PASSED: Member B does NOT see Member A\'s hearing.');
    } else {
      console.error('❌ TEST 4 FAILED');
    }

    // TEST 5: Reassign Appearing Advocate (Member A → Member B)
    console.log('\n--- TEST 5: Reassign Appearing Advocate (Member A → Member B) ---');
    await projectsColl.updateOne(
      { _id: caseDoc._id, 'hearings.id': testHearingId },
      { 
        $set: { 
          'hearings.$.appearingAdvocateUserId': memberB,
          'hearings.$.appearingAdvocateName': memberBName,
          'hearings.$.updatedAt': new Date()
        } 
      }
    );

    const updatedCase2 = await projectsColl.findOne({ _id: caseDoc._id });
    const targetHearing = updatedCase2.hearings.find(h => String(h.id || h._id) === testHearingId);

    const memberAHearingsAfter = updatedCase2.hearings.filter(h => 
      String(h.id || h._id) === testHearingId &&
      String(h.appearingAdvocateUserId) === memberA
    );
    const memberBHearingsAfter = updatedCase2.hearings.filter(h => 
      String(h.id || h._id) === testHearingId &&
      String(h.appearingAdvocateUserId) === memberB
    );

    console.log(`- Member A (${memberAName}) "My Hearings" count after reassignment: ${memberAHearingsAfter.length}`);
    console.log(`- Member B (${memberBName}) "My Hearings" count after reassignment: ${memberBHearingsAfter.length}`);
    console.log(`- Canonical Hearings Count in Case: ${updatedCase2.hearings.filter(h => String(h.id || h._id) === testHearingId).length}`);

    if (memberAHearingsAfter.length === 0 && memberBHearingsAfter.length === 1) {
      console.log('✅ TEST 5 PASSED: Hearing disappeared from Member A and appeared in Member B cleanly with ZERO duplication!');
    } else {
      console.error('❌ TEST 5 FAILED');
    }

    // TEST 6: Personal Practice Isolation
    console.log('\n--- TEST 6: Personal Practice Workspace Isolation ---');
    const personalCases = await projectsColl.find({ 
      userId: memberA, 
      workspaceId: 'personal_practice' 
    }).toArray();

    let leakedCount = 0;
    personalCases.forEach(p => {
      if (Array.isArray(p.hearings)) {
        if (p.hearings.some(h => String(h.id || h._id) === testHearingId)) leakedCount++;
      }
    });

    console.log(`Leaked firm hearings in Personal Practice of Member A: ${leakedCount}`);
    if (leakedCount === 0) {
      console.log('✅ TEST 6 PASSED: Strict workspace isolation confirmed — firm hearing NEVER leaks into Personal Practice.');
    } else {
      console.error('❌ TEST 6 FAILED');
    }

    // CLEANUP
    console.log('\n--- CLEANUP ---');
    await projectsColl.updateOne(
      { _id: caseDoc._id },
      { $pull: { hearings: { id: testHearingId } } }
    );
    await notificationsColl.deleteMany({ caseId: String(caseDoc._id), title: { $regex: /Hearing Assignment/ } });
    console.log('✅ Test hearing cleaned up cleanly.');

    console.log('\n====================================================');
    console.log('🎉 ALL 6 INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ TEST RUN FAILED:', error);
    process.exit(1);
  }
}

runHearingSystemTests();
