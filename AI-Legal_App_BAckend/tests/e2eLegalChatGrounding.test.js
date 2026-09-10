import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { chat } from '../services/ai.service.js';

import connectDB from '../config/db.js';
import mongoose from 'mongoose';

console.log('================================================================');
console.log('🏛️ AI LEGAL — END-TO-END CHAT & GROUNDING INTEGRATION TEST');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failedTests++;
    }
}

async function runE2ETests() {
    try {
        await connectDB(1, 1000);
    } catch {
        console.log('DB connection skipped for isolated unit test run');
    }
    // -----------------------------------------------------------------
    // E2E TEST 1: Current Law / 2026 Legal Query (Freshness Required)
    // -----------------------------------------------------------------
    console.log('📌 [E2E TEST 1] Executing Current Law Query ("What is the latest legal status of Section 103 BNS in 2026?")...');
    const start1 = Date.now();
    const res1 = await chat(
        "What is the latest legal status of Section 103 BNS in 2026?", 
        null, 
        { mode: 'LEGAL_TOOLKIT', toolName: 'legal_research_assistant' }
    );
    const elapsed1 = Date.now() - start1;
    console.log(`  ⏱️ Responded in ${elapsed1}ms`);
    console.log(`  📊 Metadata:`, JSON.stringify(res1.metadata, null, 2));

    assert(res1 && res1.text && res1.text.length > 50, `Received substantial text response (${res1?.text?.length || 0} chars)`);
    assert(res1.metadata?.currentnessRequired === true, `Currentness required flagged true`);
    assert(res1.metadata?.groundingStatus !== 'not_required', `Grounding status is active: ${res1.metadata?.groundingStatus}`);
    assert(res1.text.toLowerCase().includes('103') || res1.text.toLowerCase().includes('bns'), `Response specifically addresses Section 103 BNS`);
    assert(Array.isArray(res1.sources) && res1.sources.length > 0, `Verified live legal sources attached (${res1.sources?.length} sources)`);

    // -----------------------------------------------------------------
    // E2E TEST 2: Static Law Query (Freshness Not Required, Low Latency)
    // -----------------------------------------------------------------
    console.log('\n📌 [E2E TEST 2] Executing Static Law Query ("What is consideration under Section 2(d) of Indian Contract Act 1872?")...');
    const start2 = Date.now();
    const res2 = await chat(
        "What is consideration under Section 2(d) of Indian Contract Act 1872?", 
        null, 
        { mode: 'LEGAL_TOOLKIT' }
    );
    const elapsed2 = Date.now() - start2;
    console.log(`  ⏱️ Responded in ${elapsed2}ms`);
    console.log(`  📊 Metadata:`, JSON.stringify(res2.metadata, null, 2));

    assert(res2 && res2.text && res2.text.length > 50, `Received substantial text response (${res2?.text?.length || 0} chars)`);
    assert(res2.metadata?.currentnessRequired === false, `Currentness required correctly flagged false for static law`);
    assert(res2.metadata?.groundingStatus === 'not_required', `Grounding status correctly flagged as not_required`);
    assert(res2.text.toLowerCase().includes('consideration') || res2.text.toLowerCase().includes('promisor'), `Response accurately addresses consideration`);

    // -----------------------------------------------------------------
    // E2E TEST 3: User Uploaded Case Document + Statutory Freshness
    // -----------------------------------------------------------------
    console.log('\n📌 [E2E TEST 3] Executing Case Document + Statutory Applicability Query...');
    const sampleCaseDoc = `CLIENT CASE FILE:
Client Name: Ramesh Kumar
Allegation: Arrested in Mumbai on 15th January 2025 for alleged financial cheating of Rs. 45 Lakhs.
Court: Metropolitan Magistrate Court, Andheri, Mumbai.
Current Status: In judicial custody. Remand application pending.`;

    const start3 = Date.now();
    const res3 = await chat(
        "According to the current 2025/2026 legal position under BNSS, what are Ramesh's remedies for regular bail in this court?",
        sampleCaseDoc,
        { mode: 'LEGAL_TOOLKIT', toolName: 'legal_bail_assistant' }
    );
    const elapsed3 = Date.now() - start3;
    console.log(`  ⏱️ Responded in ${elapsed3}ms`);
    console.log(`  📊 Metadata:`, JSON.stringify(res3.metadata, null, 2));

    assert(res3 && res3.text && res3.text.length > 50, `Received substantial text response (${res3?.text?.length || 0} chars)`);
    assert(res3.metadata?.uploadedDocumentsUsed === true, `Metadata confirms uploaded case document was utilized`);
    assert(res3.metadata?.currentnessRequired === true, `Currentness required flagged true due to 2025/2026 BNSS bail query`);
    assert(res3.text.includes('Ramesh') || res3.text.toLowerCase().includes('ramesh'), `Response preserves client name "Ramesh" from case document`);
    assert(res3.text.toLowerCase().includes('bail') || res3.text.toLowerCase().includes('bnss'), `Response includes statutory bail remedies under BNSS`);

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 E2E TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('================================================================\n');

    await mongoose.disconnect();

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runE2ETests().catch(async (err) => {
    console.error('Unhandled E2E test error:', err);
    await mongoose.disconnect();
    process.exit(1);
});
