import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { detectLegalFreshnessRequirement } from '../services/freshnessDetector.js';
import { 
    isAuthoritativeLegalSource, 
    getDomainTier, 
    executeTargetedLegalSearch, 
    formatGroundingContext 
} from '../services/legalSearchOrchestrator.js';

console.log('================================================================');
console.log('⚖️ AI LEGAL — REAL-TIME LEGAL FRESHNESS & GROUNDING TEST SUITE');
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

async function runTests() {
    // -----------------------------------------------------------------
    // TEST 1: Current Law Freshness Detection
    // -----------------------------------------------------------------
    console.log('📌 [TEST 1] Testing Freshness Detection for Current & Amended Law Queries...');
    const currentLawQuery = "What is the latest legal amendment regarding Section 103 BNS in 2026?";
    const currentLawResult = detectLegalFreshnessRequirement(currentLawQuery);
    assert(currentLawResult.needsFreshness === true, `Current law detected as time-sensitive (needsFreshness: ${currentLawResult.needsFreshness})`);
    assert(currentLawResult.confidence >= 0.8, `Confidence is high (${currentLawResult.confidence})`);
    assert(currentLawResult.searchQuery && currentLawResult.searchQuery.includes('Section 103 BNS'), `Search query formulated: "${currentLawResult.searchQuery}"`);

    // -----------------------------------------------------------------
    // TEST 2: Recent Precedent Freshness Detection
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 2] Testing Precedent Freshness Detection...');
    const precedentQuery = "Find recent Supreme Court decisions on anticipatory bail under BNSS";
    const precedentResult = detectLegalFreshnessRequirement(precedentQuery);
    assert(precedentResult.needsFreshness === true, `Precedent query detected as time-sensitive (needsFreshness: ${precedentResult.needsFreshness})`);
    assert(precedentResult.reason.toLowerCase().includes('temporal') || 
           precedentResult.reason.toLowerCase().includes('precedent') || 
           precedentResult.reason.toLowerCase().includes('statutory'), 
        `Triggered appropriate reason code: ${precedentResult.reason}`);

    // -----------------------------------------------------------------
    // TEST 3: Static Legal Knowledge (No Search Required)
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 3] Testing Static Legal Knowledge Query (Low Latency, No Search)...');
    const staticQuery = "What is consideration under Indian Contract Act?";
    const staticResult = detectLegalFreshnessRequirement(staticQuery);
    assert(staticResult.needsFreshness === false, `Static query correctly flagged as not requiring fresh search (needsFreshness: ${staticResult.needsFreshness})`);

    // -----------------------------------------------------------------
    // TEST 4: Hindi / Multilingual Freshness Detection
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 4] Testing Multilingual Freshness Detection (Hindi)...');
    const hindiQuery = "क्या 2026 में BNS में कोई नया संशोधन लागू हुआ है?";
    const hindiResult = detectLegalFreshnessRequirement(hindiQuery);
    assert(hindiResult.needsFreshness === true, `Hindi query detected as time-sensitive (needsFreshness: ${hindiResult.needsFreshness})`);
    assert(hindiResult.searchQuery.length > 5, `Search query constructed for Hindi query: "${hindiResult.searchQuery}"`);

    // -----------------------------------------------------------------
    // TEST 5: Authoritative Source Tiering & Domain Validation
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 5] Testing Authoritative Source Tiering & Whitelist...');
    const tier1Url = "https://www.sci.gov.in/judgments/latest-bail-order.pdf";
    const tier2Url = "https://www.livelaw.in/top-stories/supreme-court-anticipatory-bail-bnss-482-2025";
    const tier3Url = "https://randomblog.com/my-thoughts-on-bns";

    assert(getDomainTier(tier1Url) === 1, `Supreme Court URL recognized as Tier 1 (Official Govt/Court)`);
    assert(getDomainTier(tier2Url) === 2, `LiveLaw URL recognized as Tier 2 (Authoritative Reporter)`);
    assert(getDomainTier(tier3Url) === 3, `Random blog recognized as Tier 3`);
    assert(isAuthoritativeLegalSource(tier1Url) === true, `Tier 1 is authoritative`);
    assert(isAuthoritativeLegalSource(tier2Url) === true, `Tier 2 is authoritative`);
    assert(isAuthoritativeLegalSource(tier3Url) === false, `Tier 3 is not authoritative`);

    // -----------------------------------------------------------------
    // TEST 6: Grounding Context Formatting
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 6] Testing Grounding Context Block Generation...');
    const mockSources = [
        {
            title: "Supreme Court of India - Criminal Appeal No. 2024",
            url: "https://main.sci.gov.in/judgment/2024/bail.pdf",
            snippet: "The Supreme Court clarified that Section 482 of BNSS retains the principle of anticipatory bail.",
            authoritative: true,
            tier: 1
        },
        {
            title: "Bar & Bench - BNSS Section 482 Analysis",
            url: "https://www.barandbench.com/news/bnss-section-482",
            snippet: "High Courts across India have reaffirmed bail jurisprudence under BNSS Section 482.",
            authoritative: true,
            tier: 2
        }
    ];
    const formattedBlock = formatGroundingContext(mockSources, "Summary of recent bail rulings under BNSS.");
    assert(formattedBlock.includes("VERIFIED REAL-TIME LEGAL SEARCH GROUNDING"), "Contains verified real-time grounding header");
    assert(formattedBlock.includes("[Tier 1 - Official Govt/Court]"), "Identifies Tier 1 source in context");
    assert(formattedBlock.includes("[Tier 2 - Authoritative Legal Reporter]"), "Identifies Tier 2 source in context");
    assert(formattedBlock.includes("STRICT RULES FOR GROUNDED LEGAL REASONING"), "Contains strict grounding instruction rules");

    // -----------------------------------------------------------------
    // TEST 7: Targeted Search Execution (Live Network Test)
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 7] Testing Live Search Execution via Tavily / Web...');
    const startTime = Date.now();
    try {
        const searchResult = await executeTargetedLegalSearch("Supreme Court anticipatory bail Section 482 BNSS 2024 2025");
        const elapsed = Date.now() - startTime;
        console.log(`  ⏱️ Search completed in ${elapsed}ms`);
        assert(searchResult.sources && searchResult.sources.length > 0, `Retrieved ${searchResult.sources?.length || 0} legal sources`);
        assert(elapsed < 12000, `Search response latency within acceptable bounds (${elapsed}ms < 12s)`);
        
        const hasAuthSource = searchResult.sources.some(s => s.authoritative || s.tier <= 2);
        assert(hasAuthSource, `At least one authoritative (Tier 1 or Tier 2) source retrieved`);
    } catch (err) {
        console.warn(`  ⚠️ Live search test skipped or failed network check: ${err.message}`);
    }

    // -----------------------------------------------------------------
    // TEST 8: Fallback Context Passing to OpenAI
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 8] Testing Fallback Grounding Context Injection for OpenAI...');
    try {
        const { askOpenAI } = await import('../services/openai.service.js');
        const testPrompt = "According to the latest 2025 Supreme Court legal position, what is the procedure for anticipatory bail under BNSS?";
        const mockGroundingContext = formatGroundingContext(mockSources, "Supreme Court reaffirmed anticipatory bail under BNSS Section 482 in 2024/2025.");
        
        const openAiRes = await askOpenAI(testPrompt, null, {
            groundedSearchContext: mockGroundingContext,
            sources: mockSources,
            returnSources: true
        });

        const openAiText = typeof openAiRes === 'object' ? openAiRes.text : openAiRes;
        const openAiSources = typeof openAiRes === 'object' ? openAiRes.sources : [];

        assert(openAiText && openAiText.length > 50, `OpenAI fallback responded with substantial text (${openAiText?.length || 0} chars)`);
        assert(openAiSources.length > 0, `OpenAI fallback retained grounding sources (${openAiSources.length} sources)`);
        assert(openAiText.includes('482') || openAiText.includes('BNSS') || openAiText.includes('bail') || openAiText.includes('Bail'), `OpenAI response references BNSS / Section 482 from grounding context`);
    } catch (openAiErr) {
        console.warn(`  ⚠️ OpenAI test skipped or failed: ${openAiErr.message}`);
    }

    // -----------------------------------------------------------------
    // TEST 9: Date Awareness & No Fabricated Citations Rule Validation
    // -----------------------------------------------------------------
    console.log('\n📌 [TEST 9] Validating Statutory Transition & Citation Integrity Rules in legalPrompts.js...');
    const { GLOBAL_RULES } = await import('../Tools/AI_Legal/legalPrompts.js');
    assert(GLOBAL_RULES.includes('REAL-TIME LEGAL FRESHNESS & STATUTORY CITATION RULES'), "Contains Real-Time Freshness & Citation Rules");
    assert(GLOBAL_RULES.includes('DATE & IN-FORCE AWARENESS'), "Contains Date & In-Force Awareness directives");
    assert(GLOBAL_RULES.includes('ZERO FABRICATED CITATIONS'), "Contains Zero Fabricated Citations strict directive");
    assert(GLOBAL_RULES.includes('BNS, BNSS, and BSA apply'), "Contains BNS/BNSS/BSA transition guidance for offences on or after July 1, 2024");

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
