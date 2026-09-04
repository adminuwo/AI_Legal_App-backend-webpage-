import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkspaceAIContextService from '../services/WorkspaceAIContextService.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';

dotenv.config();

async function runFirmCaseResolutionTest() {
  console.log('====================================================');
  console.log('STARTING RUNTIME DB WORKSPACE RESOLUTION TEST');
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
    // 1. Find or seed a Law Firm Workspace and case "pta nahi bhai"
    let firmWs = await Workspace.findOne({ type: 'law_firm' }).lean();
    if (!firmWs) {
      console.log('Creating a test Law Firm Workspace...');
      firmWs = await Workspace.create({
        name: 'Lex Enterprise Law Firm',
        type: 'law_firm',
        ownerId: new mongoose.Types.ObjectId()
      });
    }

    const testOwnerId = String(firmWs.ownerId);

    // Ensure case "pta nahi bhai" exists in this firm workspace
    let firmCase = await Project.findOne({ workspaceId: String(firmWs._id), name: 'pta nahi bhai' });
    if (!firmCase) {
      console.log(`Seeding case "pta nahi bhai" into Firm Workspace ${firmWs._id}...`);
      firmCase = await Project.create({
        name: 'pta nahi bhai',
        userId: firmWs.ownerId,
        role: 'law_firm',
        workspaceId: String(firmWs._id),
        workspaceType: 'law_firm',
        clientName: 'Suresh Kumar',
        court: 'High Court',
        leadAdvocate: 'Aditi Lakhasa',
        status: 'Active'
      });
    }

    console.log(`Found Firm Workspace: "${firmWs.name}" (ID: ${firmWs._id})`);
    console.log(`Found Firm Case: "${firmCase.name}" (Client: ${firmCase.clientName})\n`);

    // -------------------------------------------------------------------------
    // TEST 1: LAW FIRM WORKSPACE (AI FIRM ASSISTANT)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: AI FIRM ASSISTANT WORKSPACE RESOLUTION ---');
    const firmCtx = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: testOwnerId,
      workspaceId: String(firmWs._id),
      workspaceType: 'law_firm',
      prompt: 'How many cases are in this firm?'
    });

    assert(firmCtx.authorized === true, 'User authorized for Law Firm Workspace');
    assert(firmCtx.contextText.includes('AI FIRM ASSISTANT'), 'Assistant persona resolved as AI FIRM ASSISTANT');
    assert(firmCtx.contextText.includes('pta nahi bhai'), 'Firm Case "pta nahi bhai" present in AI FIRM ASSISTANT context');
    assert(firmCtx.contextText.includes('Suresh Kumar'), 'Client Suresh Kumar details present in Firm Context');
    assert(!firmCtx.contextText.includes('personal practice workspace at the moment'), 'Does NOT contain wrong personal practice fallback message');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 2: ADVOCATE PERSONAL PRACTICE (AI LEGAL ASSISTANT ISOLATION)
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: ADVOCATE PERSONAL PRACTICE ISOLATION ---');
    const advocateCtx = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: testOwnerId,
      workspaceId: 'personal_practice',
      workspaceType: 'personal',
      prompt: 'How many cases do I have?'
    });

    assert(advocateCtx.authorized === true, 'User authorized for Personal Practice');
    assert(advocateCtx.contextText.includes('AI LEGAL ASSISTANT'), 'Assistant persona resolved as AI LEGAL ASSISTANT');
    assert(!advocateCtx.contextText.includes(String(firmWs._id)), 'Firm Workspace ID NOT leaked in Personal Practice');
    assert(!advocateCtx.contextText.includes('pta nahi bhai'), 'Firm Case "pta nahi bhai" NOT leaked into Personal Practice');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 3: STUDENT WORKSPACE (AI LEGAL TUTOR ISOLATION)
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: STUDENT WORKSPACE ISOLATION ---');
    const tutorCtx = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: testOwnerId,
      workspaceId: 'student_workspace',
      workspaceType: 'student',
      prompt: 'Explain contract law'
    });

    assert(tutorCtx.authorized === true, 'User authorized for Student Workspace');
    assert(tutorCtx.contextText.includes('AI LEGAL TUTOR'), 'Assistant persona resolved as AI LEGAL TUTOR');
    assert(!tutorCtx.contextText.includes('pta nahi bhai'), 'Firm Case "pta nahi bhai" NOT leaked into Student Workspace');

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
    console.log('====================================================');

    if (passed === total) {
      console.log('✅ ALL FIRM CASE WORKSPACE RESOLUTION TESTS PASSED 100%!');
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

runFirmCaseResolutionTest();
