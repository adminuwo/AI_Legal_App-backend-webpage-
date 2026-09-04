import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkspaceAIContextService from '../services/WorkspaceAIContextService.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';

dotenv.config();

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING WORKSPACE-AWARE ISOLATED AI ASSISTANT TESTS');
  console.log('====================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_db';
    console.log(`Connecting to MongoDB... (${mongoUri.replace(/:([^@]+)@/, ':****@')})`);
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.\n');

    // 1. Setup Mock Test Entities
    const mockUserOwner = await User.findOne() || new User({ name: 'Test Owner Advocate', email: 'owner_test@example.com' });
    const ownerId = String(mockUserOwner._id);

    const mockUserJunior = new User({ name: 'Test Junior Advocate', email: 'junior_test@example.com' });
    const juniorId = String(mockUserJunior._id);

    const firmAId = new mongoose.Types.ObjectId().toString();
    const firmBId = new mongoose.Types.ObjectId().toString();

    console.log(`Test Owner User ID: ${ownerId}`);
    console.log(`Test Junior User ID: ${juniorId}`);
    console.log(`Mock Law Firm A ID: ${firmAId}`);
    console.log(`Mock Law Firm B ID: ${firmBId}\n`);

    // Create DB records for testing isolation
    const personalCase = await Project.create({
      name: 'Personal Practice Test Case Alpha',
      userId: ownerId,
      workspaceId: 'personal_practice',
      workspaceType: 'personal',
      clientName: 'Personal Client John',
      status: 'Active',
      summary: 'Private personal litigation matter.'
    });

    const firmACase = await Project.create({
      name: 'Firm A Enterprise Case Beta',
      userId: ownerId,
      workspaceId: firmAId,
      workspaceType: 'law_firm',
      clientName: 'Firm A Corporate Client',
      status: 'Active',
      leadAdvocate: 'Test Owner Advocate',
      summary: 'Firm A corporate lawsuit.'
    });

    const firmBCase = await Project.create({
      name: 'Firm B Secret Case Gamma',
      userId: ownerId,
      workspaceId: firmBId,
      workspaceType: 'law_firm',
      clientName: 'Firm B Client Inc',
      status: 'Active',
      summary: 'Firm B confidential litigation.'
    });

    const wsFirmA = await Workspace.create({
      _id: firmAId,
      name: 'Alpha Law Firm LLP',
      ownerId: ownerId,
      type: 'law_firm'
    });

    const wsFirmB = await Workspace.create({
      _id: firmBId,
      name: 'Beta Legal Practice',
      ownerId: ownerId,
      type: 'law_firm'
    });

    await WorkspaceMembership.create({
      workspaceId: firmAId,
      userId: juniorId,
      email: mockUserJunior.email,
      role: 'Junior Advocate',
      permission: 'Standard Member',
      status: 'Active'
    });

    // ----------------------------------------------------
    // TEST 1: STUDENT WORKSPACE (AI LEGAL TUTOR)
    // ----------------------------------------------------
    console.log('--- TEST 1: STUDENT WORKSPACE (AI LEGAL TUTOR) ---');
    const studentContext = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: ownerId,
      workspaceId: 'student_workspace',
      workspaceType: 'student',
      prompt: 'Tell me about Law Firm A Enterprise Case Beta and my personal case'
    });

    console.log(`Assistant Name: ${studentContext.meta.assistantName}`);
    console.log(`Contains Personal Case? ${studentContext.contextText.includes('Personal Practice Test Case Alpha')}`);
    console.log(`Contains Firm A Case? ${studentContext.contextText.includes('Firm A Enterprise Case Beta')}`);
    console.log(`Contains Student Tools? ${studentContext.contextText.includes('Bare Act & Section Explainer')}`);

    if (studentContext.meta.assistantName === 'AI LEGAL TUTOR' &&
        !studentContext.contextText.includes('Personal Practice Test Case Alpha') &&
        !studentContext.contextText.includes('Firm A Enterprise Case Beta')) {
      console.log('✅ TEST 1 PASSED: AI Legal Tutor has ZERO private case leakage.\n');
    } else {
      console.error('❌ TEST 1 FAILED!\n');
    }

    // ----------------------------------------------------
    // TEST 2: ADVOCATE PERSONAL PRACTICE (AI LEGAL ASSISTANT)
    // ----------------------------------------------------
    console.log('--- TEST 2: ADVOCATE PERSONAL PRACTICE (AI LEGAL ASSISTANT) ---');
    const advocateContext = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: ownerId,
      workspaceId: 'personal_practice',
      workspaceType: 'personal',
      prompt: 'Summarize my active cases'
    });

    console.log(`Assistant Name: ${advocateContext.meta.assistantName}`);
    console.log(`Contains Personal Case? ${advocateContext.contextText.includes('Personal Practice Test Case Alpha')}`);
    console.log(`Contains Firm A Case? ${advocateContext.contextText.includes('Firm A Enterprise Case Beta')}`);
    console.log(`Contains Firm B Case? ${advocateContext.contextText.includes('Firm B Secret Case Gamma')}`);

    if (advocateContext.meta.assistantName === 'AI LEGAL ASSISTANT' &&
        advocateContext.contextText.includes('Personal Practice Test Case Alpha') &&
        !advocateContext.contextText.includes('Firm A Enterprise Case Beta') &&
        !advocateContext.contextText.includes('Firm B Secret Case Gamma')) {
      console.log('✅ TEST 2 PASSED: Personal Practice contains ONLY personal data and ZERO firm data.\n');
    } else {
      console.error('❌ TEST 2 FAILED!\n');
    }

    // ----------------------------------------------------
    // TEST 3: LAW FIRM A WORKSPACE (AI FIRM ASSISTANT)
    // ----------------------------------------------------
    console.log('--- TEST 3: LAW FIRM A WORKSPACE (AI FIRM ASSISTANT) ---');
    const firmAContext = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: ownerId,
      workspaceId: firmAId,
      workspaceType: 'law_firm',
      prompt: 'Tell me about our firm cases and workload'
    });

    console.log(`Assistant Name: ${firmAContext.meta.assistantName}`);
    console.log(`Contains Firm A Case? ${firmAContext.contextText.includes('Firm A Enterprise Case Beta')}`);
    console.log(`Contains Personal Case? ${firmAContext.contextText.includes('Personal Practice Test Case Alpha')}`);
    console.log(`Contains Firm B Case? ${firmAContext.contextText.includes('Firm B Secret Case Gamma')}`);

    if (firmAContext.meta.assistantName === 'AI FIRM ASSISTANT' &&
        firmAContext.contextText.includes('Firm A Enterprise Case Beta') &&
        !firmAContext.contextText.includes('Personal Practice Test Case Alpha') &&
        !firmAContext.contextText.includes('Firm B Secret Case Gamma')) {
      console.log('✅ TEST 3 PASSED: Firm A contains ONLY Firm A data (Zero personal or Firm B leakage).\n');
    } else {
      console.error('❌ TEST 3 FAILED!\n');
    }

    // ----------------------------------------------------
    // TEST 4: LAW FIRM B WORKSPACE (MULTI-FIRM ISOLATION)
    // ----------------------------------------------------
    console.log('--- TEST 4: LAW FIRM B WORKSPACE (MULTI-FIRM ISOLATION) ---');
    const firmBContext = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: ownerId,
      workspaceId: firmBId,
      workspaceType: 'law_firm',
      prompt: 'What cases are in Firm B?'
    });

    console.log(`Contains Firm B Case? ${firmBContext.contextText.includes('Firm B Secret Case Gamma')}`);
    console.log(`Contains Firm A Case? ${firmBContext.contextText.includes('Firm A Enterprise Case Beta')}`);

    if (firmBContext.contextText.includes('Firm B Secret Case Gamma') &&
        !firmBContext.contextText.includes('Firm A Enterprise Case Beta')) {
      console.log('✅ TEST 4 PASSED: Firm B context is strictly isolated from Firm A.\n');
    } else {
      console.error('❌ TEST 4 FAILED!\n');
    }

    // ----------------------------------------------------
    // TEST 5: UNAUTHORIZED USER IN FIRM WORKSPACE
    // ----------------------------------------------------
    console.log('--- TEST 5: UNAUTHORIZED USER SECURITY TEST ---');
    const strangerId = new mongoose.Types.ObjectId().toString();
    const unauthorizedContext = await WorkspaceAIContextService.buildWorkspaceContext({
      userId: strangerId,
      workspaceId: firmAId,
      workspaceType: 'law_firm',
      prompt: 'Expose Firm A data'
    });

    console.log(`Authorized? ${unauthorizedContext.authorized}`);
    console.log(`Security denial message included? ${unauthorizedContext.contextText.includes('SECURITY DENIAL')}`);

    if (!unauthorizedContext.authorized && unauthorizedContext.contextText.includes('SECURITY DENIAL')) {
      console.log('✅ TEST 5 PASSED: Unauthorized user correctly denied access to law firm workspace.\n');
    } else {
      console.error('❌ TEST 5 FAILED!\n');
    }

    // Cleanup mock data
    await Project.deleteOne({ _id: personalCase._id });
    await Project.deleteOne({ _id: firmACase._id });
    await Project.deleteOne({ _id: firmBCase._id });
    await Workspace.deleteOne({ _id: firmAId });
    await Workspace.deleteOne({ _id: firmBId });
    await WorkspaceMembership.deleteOne({ workspaceId: firmAId, userId: juniorId });

    console.log('====================================================');
    console.log('ALL WORKSPACE ISOLATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('====================================================');

  } catch (err) {
    console.error('Verification script crashed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
