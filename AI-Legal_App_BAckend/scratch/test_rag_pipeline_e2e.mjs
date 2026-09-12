import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as aiService from '../services/ai.service.js';
import WorkspaceAIContextService from '../services/WorkspaceAIContextService.js';

dotenv.config();

async function runE2ETests() {
    await connectDB();
    console.log("Connected to MongoDB via connectDB for E2E Test\n");

    const testUserId = new mongoose.Types.ObjectId().toString();

    // 1. Test AI LEGAL ASSISTANT with query about uploaded document
    console.log("=================================================");
    console.log("TEST 1: AI LEGAL ASSISTANT (Personal Practice)");
    console.log("Query: 'What are the main services and platforms mentioned in our company deck?'");
    console.log("=================================================");

    const personalContext = await WorkspaceAIContextService.buildWorkspaceContext({
        userId: testUserId,
        workspaceId: 'personal_practice',
        workspaceType: 'personal',
        prompt: 'What are the main services and platforms mentioned in our company deck?'
    });

    const response1 = await aiService.chat(
        "What are the main services and platforms mentioned in our company deck?",
        "",
        {
            mode: 'LEGAL_TOOLKIT',
            toolName: 'legal_free_chat',
            caseContext: personalContext.contextText,
            userId: testUserId,
            language: 'English'
        }
    );

    console.log("\n--- Response 1 Text (Snippet) ---");
    console.log(response1.text?.substring(0, 600) + '...\n');
    console.log("--- Response 1 Sources ---");
    console.log(JSON.stringify(response1.sources, null, 2));

    // 2. Test AI LEGAL TUTOR with query in student mode
    console.log("\n=================================================");
    console.log("TEST 2: AI LEGAL TUTOR (Student Workspace)");
    console.log("Query: 'Explain what Unified Web Options (UWO) does according to our uploaded materials in simple points'");
    console.log("=================================================");

    const studentContext = await WorkspaceAIContextService.buildWorkspaceContext({
        userId: 'student_test_user',
        workspaceId: 'student_workspace',
        workspaceType: 'student',
        prompt: 'Explain what Unified Web Options (UWO) does according to our uploaded materials in simple points'
    });

    const response2 = await aiService.chat(
        "Explain what Unified Web Options (UWO) does according to our uploaded materials in simple points",
        "",
        {
            mode: 'LEGAL_TOOLKIT',
            toolName: 'legal_free_chat',
            caseContext: studentContext.contextText,
            language: 'English'
        }
    );

    console.log("\n--- Response 2 Text (Snippet) ---");
    console.log(response2.text?.substring(0, 600) + '...\n');
    console.log("--- Response 2 Sources ---");
    console.log(JSON.stringify(response2.sources, null, 2));

    // 3. Test AI FIRM ASSISTANT
    console.log("\n=================================================");
    console.log("TEST 3: AI FIRM ASSISTANT (Firm Workspace)");
    console.log("Query: 'What are our enterprise service agreement terms according to uploaded agreements?'");
    console.log("=================================================");

    const firmContext = await WorkspaceAIContextService.buildWorkspaceContext({
        userId: testUserId,
        workspaceId: 'personal_practice', // fallback or firm
        workspaceType: 'law_firm',
        prompt: 'What are our enterprise service agreement terms according to uploaded agreements?'
    });

    const response3 = await aiService.chat(
        "What are our enterprise service agreement terms according to uploaded agreements?",
        "",
        {
            mode: 'LEGAL_TOOLKIT',
            toolName: 'legal_free_chat',
            caseContext: firmContext.contextText,
            language: 'English'
        }
    );

    console.log("\n--- Response 3 Text (Snippet) ---");
    console.log(response3.text?.substring(0, 600) + '...\n');
    console.log("--- Response 3 Sources ---");
    console.log(JSON.stringify(response3.sources, null, 2));

    await mongoose.disconnect();
    console.log("\nAll 3 Assistant E2E tests finished successfully.");
}

runE2ETests().catch(err => {
    console.error("E2E Test Error:", err);
    process.exit(1);
});
