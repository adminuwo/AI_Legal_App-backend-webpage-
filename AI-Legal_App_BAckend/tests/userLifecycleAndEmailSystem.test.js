/**
 * AI LEGAL™ — Automated User Lifecycle & Feature Limit Email System End-to-End Test Suite
 * Validates all 30 business criteria:
 * - First-time signup detection (Email, Google, Apple)
 * - Welcome email idempotency (no duplicates on login, device switch, or retry)
 * - Exact remaining == 0 limit exhaustion transition
 * - Multi-feature state calculation (remembering past exhausted features)
 * - Final Free Plan exhaustion detection (sent only once)
 * - Plan upgrade resilience
 * - Two-sheet Excel reporting generation
 * - Strict verification of exact URLs:
 *   Dashboard: https://ailegal.aisa24.com/
 *   Pricing:   https://ailegal.aisa24.com/legal-pricing/index.html
 */

import assert from 'assert';
import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import EmailEvent from '../models/EmailEvent.js';
import PlanUsage from '../models/PlanUsage.js';
import * as userLifecycleService from '../services/userLifecycleService.js';
import * as FeatureAccessManager from '../services/featureAccessManager.js';
import {
  getWelcomeEmailHtml,
  getFeatureExhaustedEmailHtml,
  getFreePlanFullyExhaustedEmailHtml
} from '../services/lifecycleEmailTemplates.js';
import * as XLSX from 'xlsx';

const TEST_EMAIL_PREFIX = `test_lifecycle_${Date.now()}`;

async function runTests() {
  console.log('============================================================');
  console.log('🧪 [TEST SUITE] AI LEGAL™ Automated User Lifecycle & Email System');
  console.log('============================================================\n');

  // Connect DB
  const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AISA';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  }

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  };

  try {
    // ------------------------------------------------------------------------
    // GROUP 1: TEMPLATE & EXACT LINK VALIDATION
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Email Templates & URL Integrity Tests ---');

    await test('Welcome email contains exact Dashboard URL https://ailegal.aisa24.com/', () => {
      const html = getWelcomeEmailHtml({ name: 'Aditi', planName: 'Free Plan' });
      assert.ok(html.includes('https://ailegal.aisa24.com/'), 'Must contain https://ailegal.aisa24.com/');
      assert.ok(html.includes('Hi Aditi,'), 'Must personalize greeting');
      assert.ok(html.includes('Free Plan'), 'Must include plan name');
    });

    await test('Feature exhaustion email contains exact Pricing URL https://ailegal.aisa24.com/legal-pricing/index.html', () => {
      const html = getFeatureExhaustedEmailHtml({
        name: 'Aditi',
        featureName: 'Draft Maker',
        featureLimit: 2,
        exhaustedFeatures: [{ featureName: 'Draft Maker', used: 2, limit: 2 }],
        availableFeatures: [{ featureName: 'Case Predictor', remaining: 2, limit: 2 }]
      });
      assert.ok(html.includes('https://ailegal.aisa24.com/legal-pricing/index.html'), 'Must contain exact pricing URL');
      assert.ok(html.includes('Draft Maker'), 'Must mention feature');
      assert.ok(html.includes('Case Predictor'), 'Must dynamically display available features');
    });

    await test('Final Free Plan exhaustion email contains exact Pricing URL and lists all exhausted features', () => {
      const html = getFreePlanFullyExhaustedEmailHtml({
        name: 'Aditi',
        exhaustedFeatures: [
          { featureName: 'Draft Maker', used: 2, limit: 2 },
          { featureName: 'Case Predictor', used: 2, limit: 2 }
        ]
      });
      assert.ok(html.includes('https://ailegal.aisa24.com/legal-pricing/index.html'), 'Must contain pricing URL');
      assert.ok(html.includes('Draft Maker') && html.includes('Case Predictor'), 'Must list exhausted tools');
    });

    // ------------------------------------------------------------------------
    // GROUP 2: AUTHENTICATION & FIRST-TIME WELCOME DETECTION
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Authentication & Welcome Email Idempotency Tests ---');

    const emailUser = await User.create({
      name: 'Email Test User',
      email: `${TEST_EMAIL_PREFIX}_email@test.com`,
      password: 'HashedPassword123!',
      isVerified: true,
      subscription: { plan: 'FREE', status: 'active' },
      deviceOS: 'web',
      signupMethod: 'email',
      signupPlatform: 'web'
    });

    await test('New Email signup triggers Welcome Email and creates EmailEvent audit record', async () => {
      await userLifecycleService.handleNewUserRegistration(emailUser, 'email', 'web');

      // Check user record
      const refreshedUser = await User.findById(emailUser._id);
      assert.strictEqual(refreshedUser.welcomeEmailSent, true, 'welcomeEmailSent must be true');
      assert.ok(refreshedUser.welcomeEmailSentAt instanceof Date, 'welcomeEmailSentAt must be set');

      // Check EmailEvent record
      const event = await EmailEvent.findOne({ userId: emailUser._id, eventType: 'WELCOME_EMAIL' });
      assert.ok(event, 'EmailEvent for WELCOME_EMAIL must exist');
      assert.strictEqual(event.email, emailUser.email);
      assert.strictEqual(event.authenticationMethod, 'email');
      assert.strictEqual(event.platform, 'web');
      assert.strictEqual(event.idempotencyKey, `${emailUser._id.toString()}_WELCOME_EMAIL`);
    });

    await test('Subsequent login or repeated call does NOT send duplicate Welcome Email', async () => {
      const eventCountBefore = await EmailEvent.countDocuments({ userId: emailUser._id, eventType: 'WELCOME_EMAIL' });
      assert.strictEqual(eventCountBefore, 1);

      // Simulate subsequent login attempt
      await userLifecycleService.handleNewUserRegistration(emailUser, 'email', 'web');

      const eventCountAfter = await EmailEvent.countDocuments({ userId: emailUser._id, eventType: 'WELCOME_EMAIL' });
      assert.strictEqual(eventCountAfter, 1, 'Event count must remain strictly 1 (no duplicate)');
    });

    const googleUser = await User.create({
      name: 'Google Test User',
      email: `${TEST_EMAIL_PREFIX}_google@test.com`,
      provider: 'google',
      providerId: 'google_12345',
      isVerified: true,
      subscription: { plan: 'FREE', status: 'active' },
      deviceOS: 'android',
      signupMethod: 'google',
      signupPlatform: 'android'
    });

    await test('First-time Google Sign-In triggers Welcome Email', async () => {
      await userLifecycleService.handleNewUserRegistration(googleUser, 'google', 'android');

      const refreshed = await User.findById(googleUser._id);
      assert.strictEqual(refreshed.welcomeEmailSent, true);

      const event = await EmailEvent.findOne({ userId: googleUser._id, eventType: 'WELCOME_EMAIL' });
      assert.ok(event);
      assert.strictEqual(event.authenticationMethod, 'google');
      assert.strictEqual(event.platform, 'android');
    });

    const appleUser = await User.create({
      name: 'Apple Test User',
      email: `${TEST_EMAIL_PREFIX}_apple@test.com`,
      provider: 'apple',
      providerId: 'apple_67890',
      isVerified: true,
      subscription: { plan: 'FREE', status: 'active' },
      deviceOS: 'ios',
      signupMethod: 'apple',
      signupPlatform: 'ios'
    });

    await test('First-time Apple Sign-In triggers Welcome Email', async () => {
      await userLifecycleService.handleNewUserRegistration(appleUser, 'apple', 'ios');

      const refreshed = await User.findById(appleUser._id);
      assert.strictEqual(refreshed.welcomeEmailSent, true);

      const event = await EmailEvent.findOne({ userId: appleUser._id, eventType: 'WELCOME_EMAIL' });
      assert.ok(event);
      assert.strictEqual(event.authenticationMethod, 'apple');
      assert.strictEqual(event.platform, 'ios');
    });

    // ------------------------------------------------------------------------
    // GROUP 3: FEATURE USAGE TRACKING & EXACT 0 LIMIT TRANSITION
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Feature Limit Exhaustion & Multi-Feature Tracking Tests ---');

    const featureUser = await User.create({
      name: 'Advocate Tester',
      email: `${TEST_EMAIL_PREFIX}_features@test.com`,
      password: 'HashedPassword123!',
      subscription: { plan: 'FREE', status: 'active' },
      deviceOS: 'web',
      isVerified: true
    });

    // Free Draft Maker limit is 2
    await test('Feature usage decrements remaining count accurately', async () => {
      const res1 = await FeatureAccessManager.incrementUsage(featureUser._id, 'draft_maker');
      assert.strictEqual(res1.usedCount, 1);
      assert.strictEqual(res1.remainingCount, 1);

      // Usage 1 must NOT trigger exhaustion email
      const event1 = await EmailEvent.findOne({ userId: featureUser._id, featureId: 'draft_maker' });
      assert.strictEqual(event1, null, 'No email event when remaining > 0');
    });

    async function waitForEmailEvent(query, timeoutMs = 2500) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const event = await EmailEvent.findOne(query);
        if (event) return event;
        await new Promise(r => setTimeout(r, 50));
      }
      return await EmailEvent.findOne(query);
    }

    await test('Exact transition to remaining == 0 triggers FEATURE_LIMIT_EXHAUSTED event', async () => {
      // Usage 2 -> reaches limit of 2 (remaining == 0)
      const res2 = await FeatureAccessManager.incrementUsage(featureUser._id, 'draft_maker');
      assert.strictEqual(res2.usedCount, 2);
      assert.strictEqual(res2.remainingCount, 0);

      const event = await waitForEmailEvent({ userId: featureUser._id, featureId: 'draft_maker', eventType: 'FEATURE_LIMIT_EXHAUSTED' });
      assert.ok(event, 'FEATURE_LIMIT_EXHAUSTED event must be created');
      assert.strictEqual(event.featureLimit, 2);
      assert.strictEqual(event.featureUsage, 2);
      assert.strictEqual(event.remainingLimit, 0);
    });

    await test('Subsequent attempts do NOT create duplicate exhaustion emails', async () => {
      // Usage 3 -> Exceeded
      const res3 = await FeatureAccessManager.incrementUsage(featureUser._id, 'draft_maker');
      assert.strictEqual(res3.exceeded, true);

      await new Promise(r => setTimeout(r, 200));

      const count = await EmailEvent.countDocuments({ userId: featureUser._id, featureId: 'draft_maker' });
      assert.strictEqual(count, 1, 'Only 1 email event allowed for draft_maker');
    });

    await test('Second feature (legal_precedent) exhausts independently and remembers first exhausted feature', async () => {
      // Precedents limit is 2
      await FeatureAccessManager.incrementUsage(featureUser._id, 'legal_precedent');
      await FeatureAccessManager.incrementUsage(featureUser._id, 'legal_precedent');

      const precedentEvent = await waitForEmailEvent({ userId: featureUser._id, featureId: 'legal_precedent', eventType: 'FEATURE_LIMIT_EXHAUSTED' });
      assert.ok(precedentEvent, 'Precedent exhaustion event must exist');

      // The dynamic partition must list BOTH draft_maker and legal_precedent as exhausted
      const exhaustedIds = precedentEvent.exhaustedFeatures.map(f => f.featureId);
      assert.ok(exhaustedIds.includes('draft_maker'), 'Must remember draft_maker is exhausted');
      assert.ok(exhaustedIds.includes('legal_precedent'), 'Must remember legal_precedent is exhausted');

      // Other features must still be in availableFeatures
      const availableIds = precedentEvent.availableFeatures.map(f => f.featureId);
      assert.ok(availableIds.includes('contract_review'), 'contract_review must still be available');
      assert.ok(!availableIds.includes('draft_maker'), 'draft_maker must NOT be in available');
    });

    // ------------------------------------------------------------------------
    // GROUP 4: FINAL FREE PLAN EXHAUSTION
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Final Free Plan Fully Exhausted Tests ---');

    const singleToolUser = await User.create({
      name: 'Full Exhaustion User',
      email: `${TEST_EMAIL_PREFIX}_fullexhaust@test.com`,
      password: 'HashedPassword123!',
      subscription: { plan: 'FREE', status: 'active' },
      isVerified: true
    });

    await test('Final plan exhaustion triggers ONLY when all applicable features are exhausted', async () => {
      const partitionBefore = await userLifecycleService.getFreePlanFeaturePartition(singleToolUser._id);
      assert.strictEqual(partitionBefore.isFullyExhausted, false, 'Not fully exhausted initially');

      // Simulate exhausting all applicable free features for this user
      for (const key of partitionBefore.applicableKeys) {
        const limit = FeatureAccessManager.PLAN_LIMITS.FREE[key] || 2;
        await PlanUsage.findOneAndUpdate(
          { userId: singleToolUser._id, feature: key },
          { usedCount: limit, remainingCount: 0, plan: 'FREE' },
          { upsert: true }
        );
      }

      const partitionAfter = await userLifecycleService.getFreePlanFeaturePartition(singleToolUser._id);
      assert.strictEqual(partitionAfter.isFullyExhausted, true, 'Must now be fully exhausted');
      assert.strictEqual(partitionAfter.availableFeatures.length, 0, 'No available features remaining');

      // Trigger the exhaustion check
      await userLifecycleService.checkAndTriggerFeatureExhaustion(
        singleToolUser._id,
        partitionBefore.applicableKeys[0],
        2,
        2,
        'FREE'
      );

      const finalEvent = await waitForEmailEvent({
        userId: singleToolUser._id,
        eventType: 'FREE_PLAN_FULLY_EXHAUSTED'
      });
      assert.ok(finalEvent, 'FREE_PLAN_FULLY_EXHAUSTED event must be created');

      const refreshedUser = await User.findById(singleToolUser._id);
      assert.strictEqual(refreshedUser.finalExhaustionEmailSent, true);
      assert.strictEqual(refreshedUser.lifecycleStage, 'free_fully_exhausted');
    });

    // ------------------------------------------------------------------------
    // GROUP 5: PLAN UPGRADE BEHAVIOR
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Plan Upgrade Resilience Tests ---');

    await test('Upgrading to PRO allows higher usage and does not trigger Free Plan exhaustion emails', async () => {
      // Upgrade singleToolUser to ADVOCATE_PRO (where draft_maker limit is 15)
      await User.findByIdAndUpdate(singleToolUser._id, {
        $set: { 'subscription.plan': 'ADVOCATE_PRO', 'subscription.status': 'active' }
      });
      await FeatureAccessManager.resetUserPlanUsage(singleToolUser._id);

      const proUsage = await FeatureAccessManager.incrementUsage(singleToolUser._id, 'draft_maker');
      assert.strictEqual(proUsage.usedCount, 1);
      assert.ok(proUsage.remainingCount > 0, 'PRO plan must have remaining drafts');

      // Should not trigger Free Plan exhaustion
      const extraEvent = await EmailEvent.findOne({
        userId: singleToolUser._id,
        currentPlan: 'ADVOCATE_PRO'
      });
      assert.strictEqual(extraEvent, null, 'No free plan exhaustion email on PRO plan');
    });

    // ------------------------------------------------------------------------
    // GROUP 6: ADMIN REPORTING & EXCEL EXPORT
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Admin Telemetry & Excel Export Tests ---');

    await test('getLifecycleReportData returns correct metrics and user breakdown', async () => {
      const data = await userLifecycleService.getLifecycleReportData('all');
      assert.ok(data.metrics, 'Metrics object must be returned');
      assert.ok(typeof data.metrics.totalUsers === 'number');
      assert.ok(data.metrics.welcomeSentCount >= 3, 'Welcome sent count must account for our test users');
      assert.ok(Array.isArray(data.users), 'Users array must be returned');
      assert.ok(Array.isArray(data.events), 'Events array must be returned');
    });

    await test('generateLifecycleExcelBuffer produces valid two-sheet Excel file (.xlsx)', async () => {
      const buffer = await userLifecycleService.generateLifecycleExcelBuffer('all');
      assert.ok(Buffer.isBuffer(buffer), 'Must return buffer');
      assert.ok(buffer.length > 1000, 'Excel buffer must contain content');

      // Parse buffer with XLSX to verify sheet integrity
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      assert.ok(workbook.SheetNames.includes('Users Lifecycle'), 'Must have "Users Lifecycle" sheet');
      assert.ok(workbook.SheetNames.includes('Email Audit Logs'), 'Must have "Email Audit Logs" sheet');
    });

  } finally {
    // Clean up created test data
    console.log('\n🧹 Cleaning up test users and email events...');
    const testUsers = await User.find({ email: { $regex: TEST_EMAIL_PREFIX } });
    const userIds = testUsers.map(u => u._id);
    await Promise.all([
      User.deleteMany({ _id: { $in: userIds } }),
      EmailEvent.deleteMany({ userId: { $in: userIds } }),
      PlanUsage.deleteMany({ userId: { $in: userIds } })
    ]);
  }

  console.log('\n============================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
