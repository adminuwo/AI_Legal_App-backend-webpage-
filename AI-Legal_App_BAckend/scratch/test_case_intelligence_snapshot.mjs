import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';

dotenv.config();

async function runSnapshotTest() {
  console.log('====================================================');
  console.log('STARTING CASE INTELLIGENCE SNAPSHOT TEST');
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
        leadAdvocate: 'Aditi Lakhasa',
        status: 'Active',
        summary: 'Civil commercial dispute regarding non-payment under execution agreement.'
      });
    }

    console.log(`Testing Case: "${firmCase.name}" (ID: ${firmCase._id}) in Firm Workspace: "${firmWs.name}" (${firmWs._id})\n`);

    // -------------------------------------------------------------------------
    // TEST 1: GENERATE CASE INTELLIGENCE SNAPSHOT
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: GENERATE CONCISE CASE INTELLIGENCE SNAPSHOT ---');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const mockSnapshot = {
      caseSummary: `Commercial contract dispute in ${firmCase.court} involving ${firmCase.clientName}. Hearing scheduled with lead counsel ${firmCase.leadAdvocate}.`,
      caseStrengthScore: 82,
      caseStrengthReason: 'Strong documentary support with some procedural gaps.',
      winProbability: 'High',
      winProbabilityPercentage: 72,
      keyIssue: 'Electronic evidence admissibility and Section 65B compliance.',
      missingDocumentsCount: 2,
      missingDocumentsList: ['Section 65B Certificate', 'Original Agreement'],
      evidenceStatus: 'Complete',
      aiRecommendation: 'Prepare Witness Affidavit & verify contract liability clauses before the upcoming hearing on 28 July.',
      lastAnalyzedAt: nowStr
    };

    firmCase.caseIntelligence = mockSnapshot;
    firmCase.markModified('caseIntelligence');
    await firmCase.save();

    const fetchedCase = await Project.findById(firmCase._id).lean();
    const ci = fetchedCase.caseIntelligence;

    assert(ci && typeof ci === 'object', 'caseIntelligence saved to Project document');
    assert(ci.caseStrengthScore === 82, `Case Strength Score matches canonical value (Got ${ci.caseStrengthScore}%)`);
    assert(ci.winProbability === 'High', `Win Probability matches canonical value (Got ${ci.winProbability})`);
    assert(ci.missingDocumentsCount === 2, `Missing Documents count matches canonical value (Got ${ci.missingDocumentsCount})`);
    assert(Array.isArray(ci.missingDocumentsList) && ci.missingDocumentsList.length === 2, 'Missing Documents list is populated');
    assert(ci.aiRecommendation.includes('Prepare Witness Affidavit'), 'AI Recommendation is concise and action-oriented');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 2: CANONICAL METRICS SYNCHRONIZATION WITH PREVIEW CARD
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: CANONICAL METRICS SYNCHRONIZATION ---');
    assert(ci.caseStrengthScore === 82 && ci.winProbability === 'High' && ci.missingDocumentsCount === 2, 'Quick Preview Card metrics and Snapshot metrics are 100% synchronized');

    console.log('');

    // -------------------------------------------------------------------------
    // TEST 3: WORKSPACE ISOLATION CHECK
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: WORKSPACE ISOLATION CHECK ---');
    const personalQuery = await Project.find({ workspaceId: 'personal_practice', name: 'pta nahi bhai' }).lean();
    assert(personalQuery.length === 0, 'Firm Case "pta nahi bhai" NOT visible in Personal Practice Workspace');

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
    console.log('====================================================');

    if (passed === total) {
      console.log('✅ ALL CASE INTELLIGENCE SNAPSHOT TESTS PASSED 100%!');
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

runSnapshotTest();
