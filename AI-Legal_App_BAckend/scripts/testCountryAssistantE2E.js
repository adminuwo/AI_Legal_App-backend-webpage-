/**
 * End-to-End Multi-Country AI Legal Assistant Verification Script
 * 
 * Authenticates as:
 * 1. 🇳🇵 nepal@ailegal.app (Nepal)
 * 2. 🇺🇸 usa@ailegal.app (United States)
 * 3. 🇮🇳 india@ailegal.app (India)
 * 4. 🇬🇧 uk@ailegal.app (United Kingdom)
 * 5. 🇦🇪 uae@ailegal.app (United Arab Emirates)
 * 
 * For each country:
 * - Verifies user credentials & loaded profile
 * - Queries the AI Assistant
 * - Rigorously checks for country-specific statutes, courts, currencies
 * - Confirms ZERO cross-border legal leakage
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
import { jurisdictionManager } from '../services/jurisdictionManager.js';
import * as aiService from '../services/ai.service.js';

const TEST_ACCOUNTS = [
    {
        country: 'Nepal',
        countryCode: 'NP',
        state: 'Bagmati',
        email: 'nepal@ailegal.app',
        password: 'Nepal@2026',
        query: 'What is the legal procedure, limitation period, and punishment for a cheque bounce due to insufficient funds in Nepal?',
        expectedStatutes: ['Banking Offence', '2064', 'Negotiable Instruments', '2034', 'Muluki', '2074'],
        expectedCurrency: ['NPR', 'रू', 'Rupee'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Section 138 of the Negotiable Instruments Act, 1881']
    },
    {
        country: 'United States',
        countryCode: 'US',
        state: 'California',
        email: 'usa@ailegal.app',
        password: 'America@2026',
        query: 'What are the legal remedies, statutory causes of action, and civil procedure for a fraudulent or bounced cheque under California and US federal law?',
        expectedStatutes: ['California', 'Commercial Code', 'Civil Code', 'UCC', 'Federal', 'Damages'],
        expectedCurrency: ['USD', '$', 'Dollar'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Muluki']
    },
    {
        country: 'India',
        countryCode: 'IN',
        state: 'Delhi (NCT)',
        email: 'india@ailegal.app',
        password: 'India@2026',
        query: 'What is the legal procedure, statutory limitation, and punishment for cheque dishonour in India?',
        expectedStatutes: ['138', 'Negotiable Instruments', '1881', 'BNS', 'BNSS', 'Notice'],
        expectedCurrency: ['INR', '₹', 'Rupees'],
        forbiddenStatutes: ['Muluki Criminal Code', 'Banking Offence and Punishment Act 2064', 'UCC', 'Federal Rules']
    },
    {
        country: 'United Kingdom',
        countryCode: 'GB',
        state: 'England & Wales',
        email: 'uk@ailegal.app',
        password: 'UkLegal@2026',
        query: 'What are the legal causes of action, remedies, and court procedures for non-payment of a commercial cheque and breach of debt agreement in England and Wales?',
        expectedStatutes: ['Bills of Exchange', '1882', 'Fraud Act', 'Common Law', 'High Court', 'County Court'],
        expectedCurrency: ['GBP', '£', 'Pound'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Section 138 of the Negotiable Instruments Act']
    },
    {
        country: 'United Arab Emirates',
        countryCode: 'AE',
        state: 'Dubai',
        email: 'uae@ailegal.app',
        password: 'UaeLegal@2026',
        query: 'What is the legal procedure, executive deed enforcement, and penalty for a bounced cheque in Dubai under UAE Federal Law?',
        expectedStatutes: ['Decree-Law', 'Commercial Transactions', 'Executive', 'Court of Execution', 'Federal Law'],
        expectedCurrency: ['AED', 'Dirham'],
        forbiddenStatutes: ['Bharatiya Nyaya', 'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'Section 138', 'Muluki']
    }
];

async function runE2EVerification() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║  AI LEGAL™ E2E MULTI-COUNTRY ASSISTANT JURISDICTION VERIFICATION    ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ MONGO_URI missing in .env');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB Atlas (AISA Database)\n');

    const results = [];

    for (const item of TEST_ACCOUNTS) {
        console.log(`\n========================================================================`);
        console.log(`▶ TESTING JURISDICTION: ${item.country.toUpperCase()} (${item.countryCode}) - ${item.state}`);
        console.log(`========================================================================`);

        // 1. Authenticate user from database
        const user = await UserModel.findOne({ email: item.email }).select('+password');
        if (!user) {
            console.error(`❌ User not found in DB: ${item.email}`);
            results.push({ country: item.country, success: false, reason: 'User not found' });
            continue;
        }

        const isPasswordValid = await bcrypt.compare(item.password, user.password);
        if (!isPasswordValid) {
            console.error(`❌ Password mismatch for: ${item.email}`);
            results.push({ country: item.country, success: false, reason: 'Password invalid' });
            continue;
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, country: user.country },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        console.log(`🔑 Login Authenticated: ${user.email} (ID: ${user._id})`);
        console.log(`📍 DB Profile Country: ${user.country} | State: ${user.state} | Code: ${user.countryCode}`);
        console.log(`💎 Active Plan: ${user.subscription?.planName} | Credits: ${user.credits}`);

        // 2. Query AI Legal Assistant
        console.log(`\n❓ Query Submitted: "${item.query}"`);
        console.log(`⏳ Invoking AI Legal Assistant with ${item.country} Jurisdiction Context...`);

        const startTime = Date.now();
        let aiResponseText = '';
        try {
            const chatResponse = await aiService.chat(item.query, null, {
                userId: user._id,
                userName: user.name,
                language: 'English',
                jurisdiction: item.country,
                country: item.country,
                state: item.state,
                countryCode: item.countryCode,
                headers: {
                    'x-legal-jurisdiction': item.country,
                    'x-country-code': item.countryCode,
                    'x-legal-state': item.state,
                    'authorization': `Bearer ${token}`
                }
            });

            aiResponseText = chatResponse.text || '';
        } catch (chatErr) {
            console.error(`❌ Chat invocation failed:`, chatErr.message);
            results.push({ country: item.country, success: false, reason: chatErr.message });
            continue;
        }

        const elapsedMs = Date.now() - startTime;
        console.log(`✅ AI Response Received (${aiResponseText.length} characters in ${elapsedMs}ms)`);

        // 3. Inspect Response
        console.log(`\n--- VERBATIM SNIPPET (First 400 Chars) ---`);
        console.log(aiResponseText.slice(0, 400) + '...\n------------------------------------------');

        // Check for expected statutes
        const matchedStatutes = item.expectedStatutes.filter(stat => 
            aiResponseText.toLowerCase().includes(stat.toLowerCase())
        );
        console.log(`📋 Expected Statutes Matched: [${matchedStatutes.join(', ')}] (${matchedStatutes.length}/${item.expectedStatutes.length})`);

        // Check for expected currency
        const matchedCurrencies = item.expectedCurrency.filter(curr => 
            aiResponseText.toLowerCase().includes(curr.toLowerCase())
        );
        console.log(`💰 Expected Currency Matched: [${matchedCurrencies.join(', ')}]`);

        // Check for forbidden statutes (LEAKAGE CHECK)
        const leakedStatutes = item.forbiddenStatutes.filter(forb => 
            aiResponseText.toLowerCase().includes(forb.toLowerCase())
        );

        const hasLeaked = leakedStatutes.length > 0;
        if (hasLeaked) {
            console.error(`🚨 [CRITICAL LEAKAGE DETECTED]: Found foreign statutes in ${item.country} response: [${leakedStatutes.join(', ')}]`);
        } else {
            console.log(`🛡️ ZERO LEAKAGE CONFIRMED: No forbidden foreign statutes found.`);
        }

        const isSuccess = matchedStatutes.length >= 1 && !hasLeaked;
        results.push({
            country: item.country,
            countryCode: item.countryCode,
            success: isSuccess,
            matchedStatutes,
            matchedCurrencies,
            leakedStatutes,
            responseSnippet: aiResponseText.slice(0, 250).replace(/\n/g, ' ')
        });
    }

    console.log('\n\n═══════════════════════════════════════════════════════════════════════');
    console.log('                   FINAL VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.table(results.map(r => ({
        Country: r.country,
        Status: r.success ? '✅ PASSED' : '❌ FAILED',
        StatutesMatched: r.matchedStatutes ? r.matchedStatutes.join(', ') : 'None',
        ZeroLeakage: (!r.leakedStatutes || r.leakedStatutes.length === 0) ? '✅ YES' : '❌ LEAKED',
        Snippet: r.responseSnippet ? r.responseSnippet.slice(0, 60) + '...' : ''
    })));

    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB. Test run completed.\n');
}

runE2EVerification().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
