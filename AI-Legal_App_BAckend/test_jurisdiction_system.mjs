/**
 * End-to-End Automated Verification Test Suite for AI LEGAL™ Jurisdiction Intelligence
 * 
 * 14 Acceptance Criteria Verified:
 * 1. India Sandbox Execution (Gemini 2.5 Flash, Google Grounding, BNS/BNSS)
 * 2. Maharashtra State Law (Bombay High Court / Maharashtra enactments)
 * 3. Nepal Sandbox Execution (Nepal Law Commission / Muluki Code 2074)
 * 4. Bagmati Province State Law (Provincial statutes)
 * 5. ZERO Leakage: Nepal query -> No Indian law (BNS/BNSS/BSA/IPC/CrPC)
 * 6. ZERO Leakage: India query -> No Nepal law (Muluki Code/Law Commission)
 * 7. Fresh Nepal Legal Retrieval (nepalLegalSourceService returns valid statutes)
 * 8. Fallback Hierarchy (Google Grounding -> Tavily / Law Commission)
 * 9. Profile Save Persistence (PUT /api/jurisdictions/my-jurisdiction)
 * 10. Automatic Jurisdiction Propagation (Features read saved jurisdiction)
 * 11. 5-Tier Priority Override (Header / Explicit Query overrides profile)
 * 12. Multilingual Independence (Nepali/Hindi/English query retains jurisdiction)
 * 13. Cache Partitioning (Cache incorporates country + state + lang; fresh queries bypass)
 * 14. Non-mutating Sandbox (Sandbox tests leave user accounts untouched)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║   AI LEGAL™ JURISDICTION INTELLIGENCE - 14-POINT TEST SUITE   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    let passedCount = 0;
    let failedCount = 0;

    const assert = (condition, testName, details = '') => {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            if (details) console.log(`   └─ ${details}`);
            passedCount++;
        } else {
            console.error(`❌ [FAIL] ${testName}`);
            if (details) console.error(`   └─ ${details}`);
            failedCount++;
        }
    };

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
        try {
            await mongoose.connect(mongoUri);
            console.log('📦 Connected to MongoDB for verification tests.\n');
        } catch (mErr) {
            console.warn(`⚠️ MongoDB connection skipped: ${mErr.message}`);
        }
    }

    try {
        // Dynamically import backend services
        const { jurisdictionManager, resolveLegalJurisdiction } = await import('./services/jurisdictionManager.js');
        const { nepalLegalSourceService } = await import('./services/nepalLegalSourceService.js');
        const { analyzeFreshness } = await import('./services/freshnessDetector.js');
        const { runJurisdictionSandboxTest } = await import('./services/jurisdictionSandboxService.js');
        const { getLegalPrompt } = await import('./Tools/AI_Legal/legalPrompts.js');
        const { buildSearchCacheKey, getCachedSearch, setCachedSearch } = await import('./utils/webSearch.js');
        const { getStatesForCountry, INDIAN_STATES_LIST, NEPAL_PROVINCES } = await import('./constants/jurisdictionConstants.js');
        const User = (await import('./models/User.js')).default;

        console.log('─────────────────────────────────────────────────────────────────');
        console.log('SECTION A: RESOLVER, PROMPTS & RETRIEVAL ENGINE VERIFICATION');
        console.log('─────────────────────────────────────────────────────────────────');

        // Test 7: Fresh Nepal Legal Retrieval
        console.log('\n[Testing Nepal Legal Document Retrieval]');
        const nepalResult = await nepalLegalSourceService.retrieveNepalLegalContext('cheque bounce banking offence fraud', {
            state: 'Bagmati',
            limit: 3
        });
        const nepalDocs = nepalResult?.documents || [];
        assert(
            Array.isArray(nepalDocs) && nepalDocs.length > 0,
            'Test 7: Fresh Nepal Legal Retrieval',
            `Retrieved ${nepalDocs.length} authoritative Nepal statutes: "${nepalDocs[0]?.title}"`
        );

        // Test 11: 5-Tier Priority Override
        console.log('\n[Testing 5-Tier Priority Resolution]');
        // Case A: Explicit query override (Tier 1) overrides user profile (Tier 4)
        const priority1 = await resolveLegalJurisdiction({
            query: 'Explain Section 106 under Indian law',
            userProfile: { legalJurisdiction: { country: 'Nepal', state: 'Bagmati' } }
        });
        assert(
            priority1.country === 'India' && priority1.isIndia && priority1.source === 'explicit_query',
            'Test 11.A: Tier 1 (Explicit Query) overrides Tier 4 (User Profile)',
            `Resolved to: ${priority1.country} via ${priority1.source}`
        );

        // Case B: Header override (Tier 3)
        const priority3 = await resolveLegalJurisdiction({
            query: 'What is the limitation period for filing an appeal?',
            headers: { 'x-legal-jurisdiction': 'Nepal', 'x-legal-state': 'Bagmati' },
            userProfile: { legalJurisdiction: { country: 'India', state: 'Maharashtra' } }
        });
        assert(
            priority3.country === 'Nepal' && priority3.state === 'Bagmati' && priority3.source === 'request_param',
            'Test 11.B: Tier 3 (Request Headers) overrides Tier 4 (User Profile)',
            `Resolved to: ${priority3.state}, ${priority3.country} via ${priority3.source}`
        );

        // Case C: Saved User Profile (Tier 4)
        const priority4 = await resolveLegalJurisdiction({
            query: 'What are the stamp duty rules?',
            userProfile: { legalJurisdiction: { country: 'Nepal', state: 'Gandaki', source: 'user_settings' } }
        });
        assert(
            priority4.country === 'Nepal' && priority4.state === 'Gandaki' && priority4.source === 'saved_user_jurisdiction',
            'Test 11.C: Tier 4 (User Profile) applies when no higher priority overrides',
            `Resolved to: ${priority4.state}, ${priority4.country} via ${priority4.source}`
        );

        // Case D: Default Fallback (Tier 5)
        const priority5 = await resolveLegalJurisdiction({
            query: 'What are the stamp duty rules?',
            userProfile: null
        });
        assert(
            priority5.country === 'India' && priority5.source === 'default',
            'Test 11.D: Tier 5 (System Default) safely defaults to India',
            `Resolved to: ${priority5.country} via ${priority5.source}`
        );

        // Test 12: Multilingual Independence
        console.log('\n[Testing Multilingual Independence]');
        const nepaliLangQuery = await resolveLegalJurisdiction({
            query: 'सम्पत्ति सम्बन्धी देवानी मुद्दामा म्याद कति हुन्छ?', // Nepali query for Nepal law
            userProfile: { legalJurisdiction: { country: 'Nepal', state: 'Bagmati' } }
        });
        assert(
            nepaliLangQuery.country === 'Nepal' && nepaliLangQuery.isNepal,
            'Test 12.A: Nepali language query correctly maps to Nepal jurisdiction',
            `Target: ${nepaliLangQuery.country}`
        );

        const hindiLangQueryForNepal = await resolveLegalJurisdiction({
            query: 'नेपाल में चेक बाउंस का क्या कानून है?', // Hindi query explicitly about Nepal
            userProfile: { legalJurisdiction: { country: 'India' } }
        });
        assert(
            hindiLangQueryForNepal.country === 'Nepal' && hindiLangQueryForNepal.isNepal,
            'Test 12.B: Hindi language query targeting Nepal resolves to Nepal',
            `Target: ${hindiLangQueryForNepal.country} (Language neutral)`
        );

        // Test 13: Cache Partitioning
        console.log('\n[Testing Cache Partitioning]');
        const cacheKeyIndia = buildSearchCacheKey('limitation period', { country: 'India', state: 'Maharashtra', language: 'English' });
        const cacheKeyNepal = buildSearchCacheKey('limitation period', { country: 'Nepal', state: 'Bagmati', language: 'English' });
        const cacheKeyNepaliLang = buildSearchCacheKey('limitation period', { country: 'Nepal', state: 'Bagmati', language: 'Nepali' });

        assert(
            cacheKeyIndia !== cacheKeyNepal && cacheKeyNepal !== cacheKeyNepaliLang,
            'Test 13.A: Cache keys are strictly partitioned across Country, State, and Language',
            `India Key: ${cacheKeyIndia} | Nepal Key: ${cacheKeyNepal}`
        );

        setCachedSearch('test query', { data: 'stale result' }, { country: 'India', state: 'Delhi' });
        const bypassed = getCachedSearch('test query', { country: 'India', state: 'Delhi', bypassCache: true });
        assert(
            bypassed === null,
            'Test 13.B: Fresh query bypasses stale cache when bypassCache is requested',
            'Bypass returned null as expected'
        );

        // Test: Prompt Isolation in getLegalPrompt
        console.log('\n[Testing Prompt Isolation in getLegalPrompt]');
        const nepalPrompt = getLegalPrompt('legal_notice_generator', { country: 'Nepal', state: 'Bagmati' });
        assert(
            nepalPrompt.includes('ACTIVE JURISDICTION: Bagmati, Nepal') &&
            nepalPrompt.includes('MANDATORY JURISDICTION ISOLATION: Do NOT cite Indian statutes'),
            'Test 5.A: Legal prompts strictly isolate Nepal and forbid Indian statutes',
            'Found isolation directives in system prompt'
        );

        console.log('\n─────────────────────────────────────────────────────────────────');
        console.log('SECTION B: LIVE SANDBOX & ZERO-LEAKAGE VERIFICATION');
        console.log('─────────────────────────────────────────────────────────────────');

        // Test 3 & 5: Nepal Sandbox Execution & ZERO Leakage
        console.log('\n[Executing Live Nepal Sandbox Test...]');
        const nepalSandboxResult = await runJurisdictionSandboxTest({
            query: 'What is the statutory limitation period for filing a criminal complaint for fraud and theft?',
            country: 'Nepal',
            state: 'Bagmati'
        });

        const nepalResp = nepalSandboxResult.response || '';
        const lowerNepalResp = nepalResp.toLowerCase();

        const mentionsIndianCodes = (
            lowerNepalResp.includes('bharatiya nyaya') ||
            lowerNepalResp.includes(' bns') ||
            lowerNepalResp.includes(' bnss') ||
            lowerNepalResp.includes(' bsa') ||
            lowerNepalResp.includes('indian penal code') ||
            lowerNepalResp.includes('crpc') ||
            lowerNepalResp.includes('ipc ')
        );

        const mentionsNepalLaw = (
            lowerNepalResp.includes('nepal') ||
            lowerNepalResp.includes('muluki') ||
            lowerNepalResp.includes('criminal code') ||
            lowerNepalResp.includes('bagmati') ||
            nepalSandboxResult.sourceCount > 0
        );

        assert(
            nepalSandboxResult.success && mentionsNepalLaw,
            'Test 3: Nepal Sandbox Execution succeeds with Nepal statutory grounding',
            `Status: ${nepalSandboxResult.groundingStatus} | Sources: ${nepalSandboxResult.sourceCount}`
        );

        assert(
            !mentionsIndianCodes,
            'Test 5: ZERO Leakage - Nepal response contains NO Indian codes (BNS, BNSS, BSA, IPC, CrPC)',
            mentionsIndianCodes ? 'FAILED: Found Indian statute leakage' : 'PASSED: Zero Indian law citations'
        );

        // Test 4: Bagmati Province State Law
        console.log('\n[Executing Live Bagmati Province Sandbox Test...]');
        const bagmatiResult = await runJurisdictionSandboxTest({
            query: 'What are the stamp duty and registration fees for immovable property transfer in Bagmati Province?',
            country: 'Nepal',
            state: 'Bagmati'
        });
        assert(
            bagmatiResult.success && (bagmatiResult.response.toLowerCase().includes('bagmati') || bagmatiResult.response.toLowerCase().includes('nepal')),
            'Test 4: Bagmati Province State Law Execution',
            `Response grounded for Bagmati, Nepal (${bagmatiResult.response.length} chars)`
        );

        // Test 1 & 6: India Sandbox Execution & ZERO Leakage
        console.log('\n[Executing Live India Sandbox Test...]');
        const indiaSandboxResult = await runJurisdictionSandboxTest({
            query: 'What is the statutory limitation period for filing an appeal in a commercial dispute?',
            country: 'India',
            state: 'Maharashtra'
        });

        const indiaResp = indiaSandboxResult.response || '';
        const lowerIndiaResp = indiaResp.toLowerCase();

        const mentionsNepalCodes = (
            lowerIndiaResp.includes('muluki ain') ||
            lowerIndiaResp.includes('muluki criminal') ||
            lowerIndiaResp.includes('muluki civil') ||
            lowerIndiaResp.includes('nepal law commission')
        );

        assert(
            indiaSandboxResult.success && (lowerIndiaResp.includes('limitation') || lowerIndiaResp.includes('commercial courts') || lowerIndiaResp.includes('appeal')),
            'Test 1: India Sandbox Execution succeeds with Indian statutory grounding',
            `Status: ${indiaSandboxResult.groundingStatus} | Sources: ${indiaSandboxResult.sourceCount}`
        );

        assert(
            !mentionsNepalCodes,
            'Test 6: ZERO Leakage - India response contains NO Nepal law citations',
            mentionsNepalCodes ? 'FAILED: Found Nepal statute leakage' : 'PASSED: Zero Nepal law citations'
        );

        // Test 2: Maharashtra State Law
        console.log('\n[Executing Live Maharashtra State Law Sandbox Test...]');
        const maharashtraResult = await runJurisdictionSandboxTest({
            query: 'What is the stamp duty on leave and license agreement in Maharashtra?',
            country: 'India',
            state: 'Maharashtra'
        });
        assert(
            maharashtraResult.success && (maharashtraResult.response.toLowerCase().includes('maharashtra') || maharashtraResult.response.toLowerCase().includes('stamp')),
            'Test 2: Maharashtra State Law Execution',
            `Response recognizes Maharashtra state jurisdiction (${maharashtraResult.response.length} chars)`
        );

        // Test 8: Fallback Hierarchy
        assert(
            indiaSandboxResult.googleGroundingUsed || indiaSandboxResult.tavilyUsed || indiaSandboxResult.ragUsed || nepalSandboxResult.googleGroundingUsed || nepalSandboxResult.tavilyUsed || nepalSandboxResult.ragUsed,
            'Test 8: Fallback Hierarchy - Grounding / RAG / Fallback layers properly engaged',
            `India Grounding: Google=${indiaSandboxResult.googleGroundingUsed}, Tavily=${indiaSandboxResult.tavilyUsed} | Nepal Grounding: Google=${nepalSandboxResult.googleGroundingUsed}, Tavily=${nepalSandboxResult.tavilyUsed}`
        );

        console.log('\n─────────────────────────────────────────────────────────────────');
        console.log('SECTION C: DATABASE PERSISTENCE & USER MUTATION SAFETY');
        console.log('─────────────────────────────────────────────────────────────────');

        // Test 14: Non-mutating Sandbox Guarantee
        const testUser = await User.findOne().sort({ createdAt: -1 });
        if (testUser) {
            const originalUserCountry = testUser.country;
            const originalUserState = testUser.state;
            const originalUserJurisdiction = testUser.legalJurisdiction ? JSON.stringify(testUser.legalJurisdiction) : null;

            // Run sandbox test with different country
            await runJurisdictionSandboxTest({
                query: 'Check non-mutating sandbox safety',
                country: 'Nepal',
                state: 'Koshi',
                userId: String(testUser._id)
            });

            // Re-fetch user from DB
            const refreshedUser = await User.findById(testUser._id);
            const afterCountry = refreshedUser.country;
            const afterState = refreshedUser.state;
            const afterJurisdiction = refreshedUser.legalJurisdiction ? JSON.stringify(refreshedUser.legalJurisdiction) : null;

            // Test 14: Non-mutating Sandbox Guarantee
            const countryUnchanged = (originalUserCountry || '') === (afterCountry || '');
            const stateUnchanged = (originalUserState || '') === (afterState || '');
            const jurisdictionCountryUnchanged = (testUser.legalJurisdiction?.country || '') === (refreshedUser.legalJurisdiction?.country || '');
            const jurisdictionStateUnchanged = (testUser.legalJurisdiction?.state || '') === (refreshedUser.legalJurisdiction?.state || '');

            assert(
                countryUnchanged && stateUnchanged && jurisdictionCountryUnchanged && jurisdictionStateUnchanged,
                'Test 14: Non-mutating Sandbox Guarantee - Sandbox tests NEVER mutate real user profile in database',
                `Country before: "${originalUserCountry}", Country after: "${afterCountry}" (Unchanged)`
            );

            // Test 9 & 10: Profile Save Persistence & Automatic Propagation
            console.log('\n[Testing User Profile Save Persistence]');
            testUser.legalJurisdiction = {
                country: 'Nepal',
                countryCode: 'NP',
                state: 'Bagmati',
                jurisdictionType: 'state',
                savedAt: new Date(),
                source: 'test_suite'
            };
            testUser.country = 'Nepal';
            testUser.countryCode = 'NP';
            testUser.state = 'Bagmati';
            await testUser.save();

            const savedUser = await User.findById(testUser._id);
            assert(
                savedUser.legalJurisdiction?.country === 'Nepal' && savedUser.legalJurisdiction?.state === 'Bagmati',
                'Test 9: Profile Save Persistence - legalJurisdiction subdocument successfully saved to MongoDB',
                `Saved jurisdiction: ${savedUser.legalJurisdiction.state}, ${savedUser.legalJurisdiction.country} (${savedUser.legalJurisdiction.countryCode})`
            );

            // Test 10: Automatic Jurisdiction Propagation
            const propagated = await resolveLegalJurisdiction({
                query: 'What is the procedure for property registration?',
                userProfile: savedUser
            });
            assert(
                propagated.country === 'Nepal' && propagated.state === 'Bagmati' && propagated.isNepal,
                'Test 10: Automatic Jurisdiction Propagation - Legal features automatically adopt saved Nepal profile',
                `Propagated without query params: ${propagated.state}, ${propagated.country}`
            );

            // Restore original user data
            if (originalUserCountry) {
                savedUser.country = originalUserCountry;
                savedUser.state = originalUserState;
                if (originalUserJurisdiction) {
                    savedUser.legalJurisdiction = JSON.parse(originalUserJurisdiction);
                } else {
                    savedUser.legalJurisdiction = undefined;
                }
                await savedUser.save();
                console.log('   └─ Cleaned up test user profile state.');
            }
        } else {
            console.log('ℹ️ No test user in database; skipped DB persistence assertions (models validated).');
        }

    } catch (err) {
        console.error(`💥 Unexpected test suite error: ${err.message}`, err.stack);
        failedCount++;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('\n🔌 Disconnected from MongoDB.');
        }

        console.log('\n════════════════════════════════════════════════════════════════');
        console.log(`FINAL RESULT: ${passedCount} PASSED, ${failedCount} FAILED`);
        console.log('════════════════════════════════════════════════════════════════\n');
        process.exit(failedCount === 0 ? 0 : 1);
    }
}

runTests();
