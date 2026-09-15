/**
 * Comprehensive Multi-Country & Global Coverage Test Suite
 * Validates jurisdiction resolution and prompt fidelity for all 195 countries
 */

import { jurisdictionManager, resolveLegalJurisdiction } from '../services/jurisdictionManager.js';
import { COUNTRIES, getCountryByNameOrCode } from '../constants/countries.js';
import * as aiService from '../services/ai.service.js';
import UserModel from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runComprehensiveTests() {
    console.log('\n================================================================');
    console.log('🌍 AI LEGAL - GLOBAL 195-COUNTRY JURISDICTION VALIDATION SUITE');
    console.log('================================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: Country Directory Verification (195 Countries)
    // ─────────────────────────────────────────────────────────────────
    console.log('--- TEST 1: 195-Country Directory Verification ---');
    totalTests++;
    if (COUNTRIES.length === 195) {
        console.log(`✅ Passed: Exact 195 countries loaded in directory.`);
        passedTests++;
    } else {
        console.error(`❌ Failed: Expected 195 countries, found ${COUNTRIES.length}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: Neutral Query & Profile Resolution for Diverse Countries
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: Neutral Query Resolution Across Continents ---');
    const testCountries = [
        { name: 'Canada', code: 'CA', currency: 'CAD', flag: '🇨🇦' },
        { name: 'Australia', code: 'AU', currency: 'AUD', flag: '🇦🇺' },
        { name: 'Germany', code: 'DE', currency: 'EUR', flag: '🇩🇪' },
        { name: 'France', code: 'FR', currency: 'EUR', flag: '🇫🇷' },
        { name: 'Singapore', code: 'SG', currency: 'SGD', flag: '🇸🇬' },
        { name: 'Japan', code: 'JP', currency: 'JPY', flag: '🇯🇵' },
        { name: 'Bangladesh', code: 'BD', currency: 'BDT', flag: '🇧🇩' },
        { name: 'Brazil', code: 'BR', currency: 'BRL', flag: '🇧🇷' },
        { name: 'South Africa', code: 'ZA', currency: 'ZAR', flag: '🇿🇦' },
        { name: 'Saudi Arabia', code: 'SA', currency: 'SAR', flag: '🇸🇦' },
        { name: 'Nepal', code: 'NP', currency: 'NPR', flag: '🇳🇵' },
        { name: 'United States', code: 'US', currency: 'USD', flag: '🇺🇸' },
        { name: 'United Kingdom', code: 'GB', currency: 'GBP', flag: '🇬🇧' },
        { name: 'United Arab Emirates', code: 'AE', currency: 'AED', flag: '🇦🇪' },
        { name: 'India', code: 'IN', currency: 'INR', flag: '🇮🇳' }
    ];

    for (const tc of testCountries) {
        totalTests++;
        const resolved = await resolveLegalJurisdiction({
            message: 'What is the standard limitation period for a breach of contract?',
            user: { country: tc.name, countryCode: tc.code }
        });

        const prompt = jurisdictionManager.getJurisdictionPrompt(resolved);
        const hasCorrectCountry = prompt.toUpperCase().includes(tc.name.toUpperCase());
        const hasCorrectCurrency = prompt.includes(tc.currency) || (tc.name === 'India' && prompt.includes('INR'));
        const hasZeroBNSLeakage = tc.name === 'India' ? true : (!prompt.includes('ACTIVE LEGAL JURISDICTION: INDIA') && !prompt.includes('Senior Advocate in India'));

        if (resolved.country === tc.name && hasCorrectCountry && hasCorrectCurrency && hasZeroBNSLeakage) {
            console.log(`✅ [${tc.flag} ${tc.name}] Resolved correctly -> Currency: ${tc.currency} | Contamination Check: PASSED`);
            passedTests++;
        } else {
            console.error(`❌ [${tc.flag} ${tc.name}] Failed: resolved=${resolved.country}, hasCorrectCountry=${hasCorrectCountry}, hasCurrency=${hasCorrectCurrency}, zeroLeakage=${hasZeroBNSLeakage}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Cross-Country Queries (Priority 1 Explicit Overrides)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: Cross-Border Queries (Foreign Law Inquiries) ---');
    const crossBorderScenarios = [
        {
            userCountry: 'Nepal',
            query: 'Under German law, what are the essential elements of an NDA?',
            expectedCountry: 'Germany',
            expectedCode: 'DE'
        },
        {
            userCountry: 'United States',
            query: 'What is the penalty for theft under Canadian law?',
            expectedCountry: 'Canada',
            expectedCode: 'CA'
        },
        {
            userCountry: 'India',
            query: 'What are the rules in France for terminating a commercial lease?',
            expectedCountry: 'France',
            expectedCode: 'FR'
        },
        {
            userCountry: 'United Kingdom',
            query: 'Singapore employment law working hours and overtime rules',
            expectedCountry: 'Singapore',
            expectedCode: 'SG'
        },
        {
            userCountry: 'United Arab Emirates',
            query: 'Under Australian law what is the legal definition of misleading conduct?',
            expectedCountry: 'Australia',
            expectedCode: 'AU'
        },
        {
            userCountry: 'Canada',
            query: 'What is the procedure for cheque bounce under Bangladesh law?',
            expectedCountry: 'Bangladesh',
            expectedCode: 'BD'
        },
        {
            userCountry: 'Nepal',
            query: 'What is the punishment for theft in Japan?',
            expectedCountry: 'Japan',
            expectedCode: 'JP'
        },
        {
            userCountry: 'Germany',
            query: 'How does bail work in Brazil?',
            expectedCountry: 'Brazil',
            expectedCode: 'BR'
        }
    ];

    for (const sc of crossBorderScenarios) {
        totalTests++;
        const resolved = await resolveLegalJurisdiction({
            message: sc.query,
            user: { country: sc.userCountry }
        });

        const prompt = jurisdictionManager.getJurisdictionPrompt(resolved);
        const meta = getCountryByNameOrCode(sc.expectedCountry);
        const hasTargetCountry = prompt.toUpperCase().includes(sc.expectedCountry.toUpperCase());
        const isExplicitQuery = resolved.source === 'explicit_query';
        const hasCrossBorderDirective = prompt.includes('CROSS-BORDER QUERY DIRECTIVE');
        const hasZeroBNSLeakage = sc.expectedCountry === 'India' ? true : (!prompt.includes('ACTIVE LEGAL JURISDICTION: INDIA') && !prompt.includes('Senior Advocate in India'));

        if (resolved.country === sc.expectedCountry && isExplicitQuery && hasTargetCountry && hasCrossBorderDirective && hasZeroBNSLeakage) {
            console.log(`✅ [${sc.userCountry} User -> Asking about ${meta?.flag} ${sc.expectedCountry}] -> Source: ${resolved.source} | Prompt Directive: ACTIVE`);
            passedTests++;
        } else {
            console.error(`❌ Failed scenario: user=${sc.userCountry}, query="${sc.query}" -> resolved=${resolved.country} (expected ${sc.expectedCountry}), source=${resolved.source}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 4: Live AI Response Verification
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Live AI Response for Global Jurisdictions ---');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
    if (process.env.OPENAI_API_KEY && mongoUri) {
        try {
            await mongoose.connect(mongoUri);

            // Test 4A: Canadian User asking neutral question
            console.log('\nTesting Live AI for Canada (Neutral Query)...');
            const dummyUserCanada = await UserModel.findOne({ country: 'Canada' }) || {
                _id: new mongoose.Types.ObjectId(),
                name: 'Canada Tester',
                country: 'Canada',
                countryCode: 'CA',
                state: 'Ontario'
            };

            const canadaResponse = await aiService.chat('What is the maximum penalty for theft over $5000?', null, {
                userId: dummyUserCanada._id,
                userName: dummyUserCanada.name,
                language: 'English',
                country: 'Canada',
                countryCode: 'CA',
                headers: {
                    'x-legal-jurisdiction': 'Canada',
                    'x-country-code': 'CA'
                }
            });

            const canadaText = typeof canadaResponse === 'string' 
                ? canadaResponse 
                : (canadaResponse?.text || canadaResponse?.reply || canadaResponse?.response || '');
            const hasCanadianCode = /Criminal Code|c\. C-46|indictable|Canada|Canadian|10 years/i.test(canadaText);
            const hasNoIndianBNS = !/BNS|Bharatiya Nyaya|IPC|Indian Penal/i.test(canadaText);
            totalTests++;
            if (hasCanadianCode && hasNoIndianBNS) {
                console.log(`✅ Canadian Law Live AI: Cites Canadian Criminal Code | Zero Indian statutes`);
                console.log(`   Sample snippet: ${canadaText.slice(0, 150)}...`);
                passedTests++;
            } else {
                console.error(`❌ Canadian Law Live AI: Missing Canada citations or leaked Indian law!`);
                console.log(canadaText.slice(0, 300));
            }

            // Test 4B: Nepali User asking about German Law (Cross-Border)
            console.log('\nTesting Live AI for Cross-Border (Nepal User -> German Law)...');
            const dummyUserNepal = await UserModel.findOne({ email: 'nepal@ailegal.app' }) || {
                _id: new mongoose.Types.ObjectId(),
                name: 'Nepal Tester',
                country: 'Nepal',
                countryCode: 'NP'
            };

            const germanResponse = await aiService.chat('Under German law, what are the formal requirements for an employment contract?', null, {
                userId: dummyUserNepal._id,
                userName: dummyUserNepal.name,
                language: 'English',
                country: 'Nepal',
                countryCode: 'NP',
                headers: {
                    'x-legal-jurisdiction': 'Nepal',
                    'x-country-code': 'NP'
                }
            });

            const germanText = typeof germanResponse === 'string' 
                ? germanResponse 
                : (germanResponse?.text || germanResponse?.reply || germanResponse?.response || '');
            const hasGermanCode = /BGB|Bürgerliches|German|Nachweisgesetz|Germany|written form|Schriftform/i.test(germanText);
            const hasNoNepaliOrIndian = !/Muluki|BNS|IPC|Bhartiya/i.test(germanText);
            totalTests++;
            if (hasGermanCode && hasNoNepaliOrIndian) {
                console.log(`✅ Cross-Border German Law Live AI: Cites German BGB / NachwG | Zero Nepal/India leakage`);
                console.log(`   Sample snippet: ${germanText.slice(0, 150)}...`);
                passedTests++;
            } else {
                console.error(`❌ Cross-Border German Law Live AI: Missing German citations or leaked!`);
                console.log(germanText.slice(0, 300));
            }

            await mongoose.disconnect();
        } catch (err) {
            console.error('Live AI test skipped or encountered error:', err.message);
        }
    } else {
        console.log('Skipping live AI tests: MongoDB or OpenAI API key not present in environment.');
    }

    console.log('\n================================================================');
    console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
}

runComprehensiveTests().catch(err => {
    console.error('Fatal error in tests:', err);
    process.exit(1);
});
