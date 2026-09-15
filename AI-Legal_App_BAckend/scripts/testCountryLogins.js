import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import connectDB from '../config/db.js';
import { COUNTRY_ACCOUNTS } from './seedCountryAccounts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyAccounts() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     AI LEGAL™ - 5 COUNTRY ACCOUNTS VERIFICATION TEST SUITE     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await connectDB();
  let passCount = 0;
  let failCount = 0;

  for (const item of COUNTRY_ACCOUNTS) {
    console.log(`\n─────────────────────────────────────────────────────────────`);
    console.log(`Testing Account: ${item.flag} ${item.name} (${item.email})`);
    console.log(`Expected Country: ${item.country} [${item.countryCode}]`);
    console.log(`Expected Jurisdiction: ${item.jurisdiction}`);
    console.log(`─────────────────────────────────────────────────────────────`);

    const user = await User.findOne({ email: item.email.toLowerCase() }).select('+password');
    if (!user) {
      console.error(`❌ [FAIL] User not found in MongoDB: ${item.email}`);
      failCount++;
      continue;
    }

    // 1. Password verification
    const isPasswordValid = await bcrypt.compare(item.passwordRaw, user.password);
    if (isPasswordValid) {
      console.log(`✅ [PASS] Password verified correctly for: ${item.email}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] Password mismatch for: ${item.email}`);
      failCount++;
    }

    // 2. Country & Country Code verification
    if (user.country === item.country && user.countryCode === item.countryCode) {
      console.log(`✅ [PASS] Country matches: ${user.country} (${user.countryCode})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] Country mismatch! Got ${user.country} (${user.countryCode}), expected ${item.country} (${item.countryCode})`);
      failCount++;
    }

    // 3. Legal Jurisdiction subdocument verification
    if (user.legalJurisdiction && user.legalJurisdiction.country === item.country && user.legalJurisdiction.state === item.state) {
      console.log(`✅ [PASS] legalJurisdiction subdoc: ${user.legalJurisdiction.country} — ${user.legalJurisdiction.state} (Code: ${user.legalJurisdiction.countryCode})`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] legalJurisdiction subdoc mismatch:`, user.legalJurisdiction);
      failCount++;
    }

    // 4. Verification & Status
    if (user.isVerified && user.accountStatus === 'active') {
      console.log(`✅ [PASS] User verified & active: isVerified=${user.isVerified}, status=${user.accountStatus}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] User not active or not verified:`, { isVerified: user.isVerified, status: user.accountStatus });
      failCount++;
    }

    // 5. Credits
    if (user.credits >= 100000) {
      console.log(`✅ [PASS] User has ${user.credits.toLocaleString()} credits.`);
      passCount++;
    } else {
      console.warn(`⚠️ [WARN] User has ${user.credits} credits.`);
    }
  }

  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`FINAL RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`════════════════════════════════════════════════════════════════\n`);

  process.exit(failCount === 0 ? 0 : 1);
}

verifyAccounts().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
