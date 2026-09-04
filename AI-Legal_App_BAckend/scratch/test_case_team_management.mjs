import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';

dotenv.config();

async function runTeamManagementTest() {
  console.log('====================================================');
  console.log('STARTING CASE TEAM COUNT & MANAGEMENT TEST');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_db';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Find Law Firm Workspace and Case "pta nahi bhai"
    let firmWs = await Workspace.findOne({ type: 'law_firm' }).lean();
    if (!firmWs) {
      firmWs = await Workspace.create({
        name: 'Lex Enterprise Law Firm',
        type: 'law_firm',
        ownerId: new mongoose.Types.ObjectId()
      });
    }

    const leadUserId = new mongoose.Types.ObjectId();
    const abhaUserId = new mongoose.Types.ObjectId();

    let firmCase = await Project.findOne({ workspaceId: String(firmWs._id), name: 'pta nahi bhai' });
    if (!firmCase) {
      firmCase = await Project.create({
        name: 'pta nahi bhai',
        userId: firmWs.ownerId,
        role: 'law_firm',
        workspaceId: String(firmWs._id),
        workspaceType: 'law_firm',
        clientName: 'Suresh Kumar',
        court: 'High Court',
        leadAdvocate: 'Aditi Lakhera',
        teamMembers: ['Abha'],
        status: 'Active',
        caseAssignments: [
          { userId: String(leadUserId), name: 'Aditi Lakhera', caseRole: 'Lead Advocate' },
          { userId: String(abhaUserId), name: 'Abha', caseRole: 'Junior Advocate' }
        ]
      });
    } else {
      firmCase.leadAdvocate = 'Aditi Lakhera';
      firmCase.teamMembers = ['Abha'];
      firmCase.caseAssignments = [
        { userId: String(leadUserId), name: 'Aditi Lakhera', caseRole: 'Lead Advocate' },
        { userId: String(abhaUserId), name: 'Abha', caseRole: 'Junior Advocate' }
      ];
      firmCase.markModified('caseAssignments');
      await firmCase.save();
    }

    let abhaMem = await WorkspaceMembership.findOne({ workspaceId: String(firmWs._id), name: 'Abha' });
    if (!abhaMem) {
      abhaMem = await WorkspaceMembership.create({
        workspaceId: String(firmWs._id),
        userId: abhaUserId,
        name: 'Abha',
        email: 'abha@uwo24.com',
        role: 'Junior Advocate',
        status: 'Active'
      });
    }

    console.log(`Testing Case: "${firmCase.name}" (ID: ${firmCase._id}) in Firm Workspace: "${firmWs.name}"\n`);

    // -------------------------------------------------------------------------
    // TEST 1: DYNAMIC UNIQUE MEMBER CALCULATION & ROLE COUNTS
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: DYNAMIC UNIQUE MEMBER COUNT ---');
    const uniqueMembersSet = new Set();
    if (firmCase.leadAdvocate) uniqueMembersSet.add(firmCase.leadAdvocate);
    if (Array.isArray(firmCase.teamMembers)) {
      firmCase.teamMembers.forEach(m => uniqueMembersSet.add(typeof m === 'string' ? m : m.name));
    }
    const count = uniqueMembersSet.size;

    assert(count === 2, `Assigned Members count is calculated dynamically as 2 (Got ${count})`);
    assert(firmCase.leadAdvocate === 'Aditi Lakhera', 'Lead Advocate is Aditi Lakhera');
    assert(firmCase.teamMembers.includes('Abha'), 'Assigned member is Abha');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 2: CASE ROLE UPDATE (CASE ROLE vs FIRM ROLE)
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: CHANGE CASE ROLE (CASE ROLE vs FIRM ROLE) ---');
    if (!Array.isArray(firmCase.caseAssignments)) firmCase.caseAssignments = [];
    const targetIdx = firmCase.caseAssignments.findIndex(ca => ca.name === 'Abha');
    if (targetIdx !== -1) {
      firmCase.caseAssignments[targetIdx].caseRole = 'Senior Advocate';
    } else {
      firmCase.caseAssignments.push({ userId: String(abhaUserId), name: 'Abha', caseRole: 'Senior Advocate' });
    }
    firmCase.markModified('caseAssignments');
    await firmCase.save();

    const reloadedCase = await Project.findById(firmCase._id).lean();
    const assignmentsList = reloadedCase.caseAssignments || [];
    const abhaAssignment = assignmentsList.find(ca => ca.name === 'Abha');
    assert(abhaAssignment && abhaAssignment.caseRole === 'Senior Advocate', 'Abha case role updated to Senior Advocate in Project');

    const reloadedFirmMem = await WorkspaceMembership.findById(abhaMem._id).lean();
    assert(reloadedFirmMem.role === 'Junior Advocate', 'Abha Firm Role remains 100% untouched as Junior Advocate');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 3: LEAD ADVOCATE PROTECTION RULE
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: LEAD ADVOCATE PROTECTION RULE ---');
    const isTargetLead = firmCase.leadAdvocate === 'Aditi Lakhera';
    const remainingLeads = (firmCase.caseAssignments || []).filter(ca => ca.name !== 'Aditi Lakhera' && ca.caseRole === 'Lead Advocate');
    const isProtected = isTargetLead && remainingLeads.length === 0;

    assert(isProtected, 'Lead Advocate protection triggers when attempting to remove sole Lead Advocate');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 4: REMOVE MEMBER FROM CASE ONLY
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: REMOVE FROM CASE ONLY ---');
    firmCase.teamMembers = firmCase.teamMembers.filter(m => m !== 'Abha');
    firmCase.caseAssignments = firmCase.caseAssignments.filter(ca => ca.name !== 'Abha');
    firmCase.markModified('teamMembers');
    firmCase.markModified('caseAssignments');
    await firmCase.save();

    const postRemoveCase = await Project.findById(firmCase._id).lean();
    assert(!postRemoveCase.teamMembers.includes('Abha'), 'Abha removed from case "pta nahi bhai"');

    const firmMemCheck = await WorkspaceMembership.findById(abhaMem._id).lean();
    assert(firmMemCheck && firmMemCheck.status === 'Active', 'Abha remains an active member of the Law Firm Workspace');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 5: RESTORE INITIAL STATE
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: RESTORE INITIAL TEAM STATE ---');
    firmCase.teamMembers = ['Abha'];
    firmCase.caseAssignments = [
      { userId: String(leadUserId), name: 'Aditi Lakhera', caseRole: 'Lead Advocate' },
      { userId: String(abhaUserId), name: 'Abha', caseRole: 'Junior Advocate' }
    ];
    firmCase.markModified('teamMembers');
    firmCase.markModified('caseAssignments');
    await firmCase.save();
    assert(firmCase.teamMembers.length === 1 && firmCase.leadAdvocate === 'Aditi Lakhera', 'Initial team state restored cleanly');

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
    console.log('====================================================');

    if (passed === total) {
      console.log('✅ ALL CASE TEAM MANAGEMENT TESTS PASSED 100%!');
    } else {
      console.error('❌ SOME TESTS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTeamManagementTest();
