/**
 * Cross-Country Query Behavior Test
 * 
 * Tests what happens when a user registered in Country A asks about the laws of Country B:
 * 1. Nepal Account -> Asks about US / California Law
 * 2. Nepal Account -> Asks about Indian Law (mentioning "I am in Nepal, but what is Indian law...")
 * 3. India Account -> Asks about UK / English Law
 * 4. USA Account   -> Asks about UAE / Dubai Law
 * 5. UK Account    -> Asks about Nepal Law
 * 6. UAE Account   -> Asks about Indian Law (Section 138 NI Act)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import UserModel from '../models/User.js';
import * as aiService from '../services/ai.service.js';
import { jurisdictionManager } from '../services/jurisdictionManager.js';

const TEST_CASES = [
    {
        userEmail: 'nepal@ailegal.app',
        homeCountry: 'Nepal',
        homeCode: 'NP',
        targetCountry: 'United States',
        query: 'What are the legal requirements and validity of an employee non-compete clause under California law in the United States?',
        targetKeywords: ['California', '16600', 'United States', 'void', 'Business and Professions Code'],
        homeKeywords: ['Nepal', 'Muluki', 'NPR', 'रू']
    },
    {
        userEmail: 'nepal@ailegal.app',
        homeCountry: 'Nepal',
        homeCode: 'NP',
        targetCountry: 'India',
        query: 'I am based in Nepal, but I have a legal matter in India: Can you explain Section 138 of the Negotiable Instruments Act and cheque bounce under Indian law?',
        targetKeywords: ['Section 138', 'Negotiable Instruments Act', '1881', 'India', 'Magistrate', 'INR', '₹'],
        homeKeywords: ['Muluki', 'Banking Offence and Punishment Act 2064']
    },
    {
        userEmail: 'india@ailegal.app',
        homeCountry: 'India',
        homeCode: 'IN',
        targetCountry: 'United Kingdom',
        query: 'What is the statutory limitation period and legal procedure for breach of contract under English law in the United Kingdom?',
        targetKeywords: ['Limitation Act 1980', 'English law', 'United Kingdom', 'England', 'Common Law', '6 years', 'High Court'],
        homeKeywords: ['BNS', 'BNSS', 'BSA', 'Indian Contract Act, 1872', 'CPC']
    },
    {
        userEmail: 'usa@ailegal.app',
        homeCountry: 'United States',
        homeCode: 'US',
        targetCountry: 'United Arab Emirates',
        query: 'What is the legal status and execution procedure for a bounced cheque in Dubai under UAE Federal Law?',
        targetKeywords: ['UAE', 'Dubai', 'Federal Decree-Law', 'Court of Execution', 'AED', 'Dirhams'],
        homeKeywords: ['California Penal Code', 'UCC', 'SCOTUS', 'USD']
    },
    {
        userEmail: 'uk@ailegal.app',
        homeCountry: 'United Kingdom',
        homeCode: 'GB',
        targetCountry: 'Nepal',
        query: 'What are the legal provisions and penalties for cheque bounce under the Banking Offence and Punishment Act and laws of Nepal?',
        targetKeywords: ['Nepal', 'Banking Offence and Punishment Act', '2064', 'Muluki', 'NPR', 'रू'],
        homeKeywords: ['Bills of Exchange Act 1882', 'English Law', 'CPR', 'GBP', '£']
    },
    {
        userEmail: 'uae@ailegal.app',
        homeCountry: 'United Arab Emirates',
        homeCode: 'AE',
        targetCountry: 'India',
        query: 'What is the mandatory statutory notice period and procedure to file a cheque bounce complaint under Section 138 of the Negotiable Instruments Act in India?',
        targetKeywords: ['Section 138', 'Negotiable Instruments Act, 1881', 'India', '15 days', '30 days', 'INR', '₹'],
        homeKeywords: ['Federal Decree-Law', 'Dubai Court of Execution', 'AED']
    }
];

async function runCrossCountryDiagnostic() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║        CROSS-COUNTRY QUERY RESOLUTION DIAGNOSTIC SUITE               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB Atlas\n');

    const results = [];

    for (let i = 0; i < TEST_CASES.length; i++) {
        const tc = TEST_CASES[i];
        console.log(`\n========================================================================`);
        console.log(`▶ TEST CASE ${i + 1}: ${tc.userEmail} (${tc.homeCountry}) ➔ ASKS ABOUT: ${tc.targetCountry}`);
        console.log(`Query: "${tc.query}"`);
        console.log(`========================================================================`);

        const user = await UserModel.findOne({ email: tc.userEmail }).lean();
        if (!user) {
            console.error(`❌ User not found: ${tc.userEmail}`);
            continue;
        }

        // 1. Test how jurisdictionManager resolves this query
        const resolved = await jurisdictionManager.resolveLegalJurisdiction({
            query: tc.query,
            userId: user._id,
            userProfile: user,
            country: user.country,
            state: user.state,
            countryCode: user.countryCode,
            headers: {
                'x-legal-jurisdiction': user.country,
                'x-country-code': user.countryCode,
                'x-legal-state': user.state
            }
        });

        console.log(`🔍 JurisdictionResolver Output:`);
        console.log(`   - Resolved Country: ${resolved.country} (Code: ${resolved.countryCode})`);
        console.log(`   - Priority Source:   ${resolved.source}`);
        console.log(`   - Is Comparative:    ${resolved.isComparative}`);

        // 2. Call the AI Legal assistant with this user's account and session
        console.log(`⏳ Generating AI Assistant Response...`);
        let aiResponseText = '';
        try {
            const chatResponse = await aiService.chat(tc.query, null, {
                userId: user._id,
                userName: user.name,
                language: 'English',
                jurisdiction: user.country,
                country: user.country,
                state: user.state,
                countryCode: user.countryCode,
                headers: {
                    'x-legal-jurisdiction': user.country,
                    'x-country-code': user.countryCode,
                    'x-legal-state': user.state
                }
            });
            aiResponseText = chatResponse.text || '';
        } catch (err) {
            console.error(`❌ Error calling AI Assistant:`, err.message);
            results.push({
                user: tc.userEmail,
                home: tc.homeCountry,
                asked: tc.targetCountry,
                resolvedTo: resolved.country,
                whichCountryLawAnswered: 'ERROR: ' + err.message
            });
            continue;
        }

        console.log(`✅ Response Received (${aiResponseText.length} chars)`);
        console.log(`\n--- FIRST 350 CHARS OF RESPONSE ---`);
        console.log(aiResponseText.slice(0, 350) + '...\n----------------------------------');

        // Check which country's law was actually answered
        const targetMatches = tc.targetKeywords.filter(kw => aiResponseText.toLowerCase().includes(kw.toLowerCase()));
        const homeMatches = tc.homeKeywords.filter(kw => aiResponseText.toLowerCase().includes(kw.toLowerCase()));

        console.log(`🎯 Target Country (${tc.targetCountry}) Keywords Found: [${targetMatches.join(', ')}] (${targetMatches.length}/${tc.targetKeywords.length})`);
        console.log(`🏠 Home Account (${tc.homeCountry}) Keywords Found:   [${homeMatches.join(', ')}] (${homeMatches.length}/${tc.homeKeywords.length})`);

        let answeredLaw = 'UNCLEAR';
        if (targetMatches.length > homeMatches.length && targetMatches.length >= 2) {
            answeredLaw = `ASKED COUNTRY (${tc.targetCountry})`;
        } else if (homeMatches.length > targetMatches.length) {
            answeredLaw = `OWN HOME COUNTRY (${tc.homeCountry})`;
        } else if (targetMatches.length > 0) {
            answeredLaw = `ASKED COUNTRY (${tc.targetCountry})`;
        }

        results.push({
            user: tc.userEmail,
            home: tc.homeCountry,
            asked: tc.targetCountry,
            resolvedTo: resolved.country,
            resolutionSource: resolved.source,
            whichLawAnswered: answeredLaw,
            targetMatches: targetMatches.join(', ')
        });
    }

    console.log('\n\n═══════════════════════════════════════════════════════════════════════');
    console.log('              CROSS-COUNTRY QUERY TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.table(results);

    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB.\n');
}

runCrossCountryDiagnostic().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
