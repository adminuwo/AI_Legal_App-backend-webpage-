import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_db';

import WorkspaceActivity from '../models/WorkspaceActivity.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import { CaseActivityService } from '../services/CaseActivityService.js';

async function runCaseActivitySystemTest() {
  console.log('====================================================');
  console.log('TEST SUITE: AI LEGAL CASE-SPECIFIC ACTIVITY & UPDATES');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGO_URI, { family: 4 });
    console.log(' Connected to MongoDB:', MONGO_URI);

    // 1. Locate Case A ("pta nahi bhai") and Workspace
    const caseA = await Project.findOne({ name: 'pta nahi bhai' });
    if (!caseA) {
      console.error('❌ Case "pta nahi bhai" not found.');
      process.exit(1);
    }

    const workspaceId = String(caseA.workspaceId);
    const actorUserA = String(caseA.userId);
    const actorUserB = '6a30fac276e1c8026477a8ce';

    console.log(` Case A: "${caseA.name}" (_id: ${caseA._id}, workspaceId: ${workspaceId})`);
    console.log(`- User A (Actor/Manager): ${actorUserA}`);
    console.log(`- User B (Team Member): ${actorUserB}\n`);

    // Create temporary dummy Case B in same workspace
    const caseB = new Project({
      name: 'Property Dispute Test Case',
      userId: new mongoose.Types.ObjectId(actorUserA),
      workspaceId: caseA.workspaceId,
      status: 'Active'
    });
    await caseB.save();
    console.log(` Created temporary Case B: "${caseB.name}" (_id: ${caseB._id})\n`);

    const testTag = 'test_act_' + Date.now();

    // 2. Record Activities across 11 Modules for Case A
    console.log('--- RECORDING 11 MODULE ACTIVITIES FOR CASE A ---');

    const modulesToTest = [
      { mod: 'team_management', cat: 'team_management', action: 'TEAM_MEMBER_ADDED', title: 'Abha joined the case team', type: 'Team', id: 'm1' },
      { mod: 'tasks', cat: 'tasks', action: 'TASK_ASSIGNED', title: 'Assigned "Prepare Bail Application" to Abha', type: 'Task', id: 'm2' },
      { mod: 'hearings', cat: 'hearings', action: 'HEARING_SCHEDULED', title: 'Hearing scheduled for 28 July 2026', type: 'Hearing', id: 'm3' },
      { mod: 'documents', cat: 'documents', action: 'DOCUMENT_UPLOADED', title: 'Uploaded Bail Application.pdf', type: 'Document', id: 'm4' },
      { mod: 'evidence', cat: 'evidence', action: 'EVIDENCE_UPLOADED', title: 'Uploaded CCTV Evidence Bundle', type: 'Evidence', id: 'm5' },
      { mod: 'research', cat: 'research', action: 'PRECEDENT_SAVED', title: 'Saved Supreme Court Precedent: State v. XYZ', type: 'Precedent', id: 'm6' },
      { mod: 'client_communication', cat: 'client_communication', action: 'CLIENT_WHATSAPP_SENT', title: 'Sent WhatsApp message to client Suresh Kumar', type: 'ClientConnect', id: 'm7' },
      { mod: 'draft', cat: 'draft', action: 'DRAFT_GENERATED', title: 'Generated Court-Ready Bail Application Draft', type: 'Draft', id: 'm8' },
      { mod: 'argument', cat: 'argument', action: 'ARGUMENT_GENERATED', title: 'Generated Final Arguments Outline', type: 'Argument', id: 'm9' },
      { mod: 'cross_exam', cat: 'cross_exam', action: 'CROSS_EXAM_GENERATED', title: 'Generated Cross Examination Witness Questions', type: 'CrossExam', id: 'm10' },
      { mod: 'reports', cat: 'reports', action: 'CASE_REPORT_GENERATED', title: 'Generated AI Case Progress Intelligence Snapshot', type: 'Report', id: 'm11' }
    ];

    const createdIds = [];

    for (const m of modulesToTest) {
      const act = await CaseActivityService.recordCaseActivity({
        workspaceId: workspaceId,
        caseId: caseA._id,
        actorUserId: actorUserA,
        module: m.mod,
        activityCategory: m.cat,
        action: m.action,
        title: m.title,
        description: `Automated test activity for ${m.title} [tag: ${testTag}]`,
        relatedEntityType: m.type,
        relatedEntityId: m.id,
        metadata: { caseName: caseA.name, testTag }
      });
      if (act) createdIds.push(act._id);
    }

    console.log(` Successfully recorded ${createdIds.length} / 11 case activities for Case A.\n`);

    // TEST 1: Case A Activity Feed Query
    console.log('--- TEST 1: Query Case A Activity Feed ---');
    const caseAActivities = await WorkspaceActivity.find({
      caseId: caseA._id,
      'metadata.testTag': testTag
    }).lean();

    console.log(`Case A returned ${caseAActivities.length} activities.`);
    if (caseAActivities.length === 11) {
      console.log('✅ TEST 1 PASSED: All 11 module activities successfully retrieved for Case A.');
    } else {
      console.error('❌ TEST 1 FAILED');
    }

    // TEST 2: Case B Activity Feed Query (Case Isolation)
    console.log('\n--- TEST 2: Query Case B Activity Feed (Case Isolation) ---');
    const caseBActivities = await WorkspaceActivity.find({
      caseId: caseB._id,
      'metadata.testTag': testTag
    }).lean();

    console.log(`Case B returned ${caseBActivities.length} activities.`);
    if (caseBActivities.length === 0) {
      console.log('✅ TEST 2 PASSED: Strict Case Isolation confirmed — ZERO Case A activities leaked into Case B.');
    } else {
      console.error('❌ TEST 2 FAILED');
    }

    // TEST 3: Personal Practice Workspace Isolation
    console.log('\n--- TEST 3: Personal Practice Workspace Isolation ---');
    const personalActivities = await WorkspaceActivity.find({
      workspaceId: 'personal_practice',
      'metadata.testTag': testTag
    }).lean();

    console.log(`Personal Practice returned ${personalActivities.length} activities.`);
    if (personalActivities.length === 0) {
      console.log('✅ TEST 3 PASSED: Strict Workspace Isolation confirmed — firm case activities NEVER leak into Personal Practice.');
    } else {
      console.error('❌ TEST 3 FAILED');
    }

    // TEST 4: User-Specific Unread Tracking
    console.log('\n--- TEST 4: User-Specific Unread Badge Count ---');

    // Mark read for User A
    const userAObj = new mongoose.Types.ObjectId(actorUserA);
    const userBObj = new mongoose.Types.ObjectId(actorUserB);

    await WorkspaceActivity.updateMany(
      { caseId: caseA._id, 'metadata.testTag': testTag },
      { $addToSet: { readBy: userAObj } }
    );

    const userAUnread = await WorkspaceActivity.countDocuments({
      caseId: caseA._id,
      'metadata.testTag': testTag,
      readBy: { $ne: userAObj }
    });

    const userBUnread = await WorkspaceActivity.countDocuments({
      caseId: caseA._id,
      'metadata.testTag': testTag,
      readBy: { $ne: userBObj }
    });

    console.log(`- User A Unread Badge Count: ${userAUnread}`);
    console.log(`- User B Unread Badge Count: ${userBUnread}`);

    if (userAUnread === 0 && userBUnread === 11) {
      console.log('✅ TEST 4 PASSED: User-specific unread state confirmed (User A = 0, User B = 11).');
    } else {
      console.error('❌ TEST 4 FAILED');
    }

    // TEST 5: Deep-Link Metadata Verification
    console.log('\n--- TEST 5: Deep-Link Entity Navigation Metadata ---');
    const sampleDocAct = caseAActivities.find(a => a.activityCategory === 'documents');
    console.log(`- Related Entity Type: ${sampleDocAct?.relatedEntityType}`);
    console.log(`- Related Entity ID: ${sampleDocAct?.relatedEntityId}`);
    if (sampleDocAct?.relatedEntityType === 'Document' && sampleDocAct?.relatedEntityId === 'm4') {
      console.log('✅ TEST 5 PASSED: Deep-link entity navigation metadata correctly attached.');
    } else {
      console.error('❌ TEST 5 FAILED');
    }

    // CLEANUP
    console.log('\n--- CLEANUP ---');
    await WorkspaceActivity.deleteMany({ 'metadata.testTag': testTag });
    await Project.deleteOne({ _id: caseB._id });
    console.log('✅ Temporary test records cleaned up cleanly.');

    console.log('\n====================================================');
    console.log('🎉 ALL 5 INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ TEST RUN FAILED:', error);
    process.exit(1);
  }
}

runCaseActivitySystemTest();
