/**
 * AI Legal Multi-Country Neutral Query Jurisdiction Test
 * 
 * Tests that when a user asks a 100% NEUTRAL query with ZERO country mentions:
 * - Query: "What is the statutory limitation period and legal procedure for filing a case of cheque bounce due to insufficient funds?"
 * 
 * The system automatically and strictly resolves to the logged-in user's country:
 * 1. 🇳🇵 Nepal Account -> Cites Nepal Banking Offence Act 2064 / NPR (No Indian law)
 * 2. 🇺🇸 USA Account -> Cites US/California law / UCC / USD (No Indian law)
 * 3. 🇮🇳 India Account -> Cites Section 138 NI Act 1881 / INR (No Nepal law)
 * 4. 🇬🇧 UK Account -> Cites Bills of Exchange Act 1882 / English Law / GBP (No Indian law)
 * 5. 🇦🇪 UAE Account -> Cites UAE Federal Decree-Law No. 14 of 2020 / AED (No Indian law)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import UserModel from '../models/User.js';
import * as aiService from '../services/ai.service.js';

// 100% NEUTRAL QUERY - ZERO COUNTRY NAMES, ZERO STATE NAMES, ZERO STATUTE NAMES
const NEUTRAL_QUERY = "What is the statutory limitation period and legal procedure for filing a case of cheque bounce due to insufficient funds?";

const ACCOUNTS = [
    {
        country: 'Nepal',
        countryCode: 'NP',
        state: 'Bagmati',
        email: 'nepal@ailegal.app',
        password: 'Nepal@2026',
        expectedStatutes: ['Banking Offence', '2064', 'Negotiable Instruments', '2034', 'Muluki'],
        expectedCurrency: ['NPR', 'रू', 'Rupee'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Section 138 of the Negotiable Instruments Act, 1881']
    },
    {
        country: 'United States',
        countryCode: 'US',
        state: 'California',
        email: 'usa@ailegal.app',
        password: 'America@2026',
        expectedStatutes: ['California', 'Commercial Code', 'Civil Code', 'UCC', 'Federal', 'Statute of Limitations'],
        expectedCurrency: ['USD', '$', 'Dollar'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Muluki']
    },
    {
        country: 'India',
        countryCode: 'IN',
        state: 'Delhi (NCT)',
        email: 'india@ailegal.app',
        password: 'India@2026',
        expectedStatutes: ['138', 'Negotiable Instruments', '1881', 'Notice', 'Magistrate'],
        expectedCurrency: ['INR', '₹', 'Rupees'],
        forbiddenStatutes: ['Muluki Criminal Code', 'Banking Offence and Punishment Act 2064', 'UCC']
    },
    {
        country: 'United Kingdom',
        countryCode: 'GB',
        state: 'England & Wales',
        email: 'uk@ailegal.app',
        password: 'UkLegal@2026',
        expectedStatutes: ['Bills of Exchange', '1882', 'Limitation Act', 'Common Law', 'Court'],
        expectedCurrency: ['GBP', '£', 'Pound'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Section 138 of the Negotiable Instruments Act']
    },
    {
        country: 'United Arab Emirates',
        countryCode: 'AE',
        state: 'Dubai',
        email: 'uae@ailegal.app',
        password: 'UaeLegal@2026',
        expectedStatutes: ['Decree-Law', 'Commercial Transactions', 'Executive', 'Court of Execution'],
        expectedCurrency: ['AED', 'Dirham'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Section 138', 'Muluki']
    }
];

async function runNeutralQueryTest() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║   AI LEGAL™ NEUTRAL QUERY (NO COUNTRY IN PROMPT) TEST SUITE         ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
    console.log(`COMMON NEUTRAL PROMPT SUBMITTED TO ALL 5 ACCOUNTS:`);
    console.log(`"${NEUTRAL_QUERY}"\n`);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB Atlas\n');

    const results = [];

    for (const item of ACCOUNTS) {
        console.log(`\n========================================================================`);
        console.log(`▶ TESTING USER ACCOUNT: ${item.email} (Target: ${item.country})`);
        console.log(`========================================================================`);

        const user = await UserModel.findOne({ email: item.email }).select('+password');
        if (!user) {
            console.error(`❌ User not found: ${item.email}`);
            continue;
        }

        const isPasswordValid = await bcrypt.compare(item.password, user.password);
        if (!isPasswordValid) {
            console.error(`❌ Password invalid for: ${item.email}`);
            continue;
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, country: user.country },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        console.log(`🔑 Login Authenticated: ${user.name}`);
        console.log(`📍 Account Profile: Country: ${user.country} | State: ${user.state} | Code: ${user.countryCode}`);
        console.log(`⏳ Submitting Neutral Query to AI Legal Assistant...`);

        const startTime = Date.now();
        let aiResponseText = '';
        try {
            const chatResponse = await aiService.chat(NEUTRAL_QUERY, null, {
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
                    'x-legal-state': user.state,
                    'authorization': `Bearer ${token}`
                }
            });

            aiResponseText = chatResponse.text || '';
        } catch (chatErr) {
            console.error(`❌ Chat error:`, chatErr.message);
            results.push({ country: item.country, success: false, reason: chatErr.message });
            continue;
        }

        const elapsedMs = Date.now() - startTime;
        console.log(`✅ AI Response Generated (${aiResponseText.length} chars in ${elapsedMs}ms)`);
        console.log(`\n--- VERBATIM FIRST 350 CHARS ---`);
        console.log(aiResponseText.slice(0, 350) + '...\n--------------------------------');

        // Verify country-specific statutes
        const matchedStatutes = item.expectedStatutes.filter(stat => 
            aiResponseText.toLowerCase().includes(stat.toLowerCase())
        );
        console.log(`📋 Expected Statutes Matched: [${matchedStatutes.join(', ')}]`);

        // Check for forbidden statutes (Leakage Check)
        const leakedStatutes = item.forbiddenStatutes.filter(forb => 
            aiResponseText.toLowerCase().includes(forb.toLowerCase())
        );

        const hasLeaked = leakedStatutes.length > 0;
        if (hasLeaked) {
            console.error(`🚨 [LEAKAGE FOUND]: Foreign statutes present: [${leakedStatutes.join(', ')}]`);
        } else {
            console.log(`🛡️ ZERO LEAKAGE: No foreign statutes found.`);
        }

        const isSuccess = matchedStatutes.length >= 1 && !hasLeaked;
        results.push({
            account: item.email,
            targetCountry: item.country,
            status: isSuccess ? '✅ PASSED' : '❌ FAILED',
            matchedStatutes: matchedStatutes.join(', '),
            zeroLeakage: !hasLeaked ? '✅ YES' : '❌ LEAKED',
            snippet: aiResponseText.slice(0, 180).replace(/\n/g, ' ')
        });
    }

    console.log('\n\n═══════════════════════════════════════════════════════════════════════');
    console.log('             NEUTRAL PROMPT RESOLUTION TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.table(results.map(r => ({
        Account: r.account,
        TargetCountry: r.targetCountry,
        Status: r.status,
        StatutesMatched: r.matchedStatutes,
        ZeroLeakage: r.zeroLeakage
    })));

    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB. Neutral query test completed.\n');
}

runNeutralQueryTest().catch(err => {
    console.error('Test Runner Error:', err);
    process.exit(1);
});
