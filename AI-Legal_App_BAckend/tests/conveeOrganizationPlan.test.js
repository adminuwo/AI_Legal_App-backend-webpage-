import assert from 'assert';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Plan from '../models/Plan.js';
import { PLAN_LIMITS, resolveActiveUserPlan } from '../services/featureAccessManager.js';

console.log('🧪 RUNNING CONVEE-EDUCATION LINKED ORGANIZATION & PLAN TESTS...\n');

// Test 1: Validate CONVEE_INSTITUTIONAL plan limits
console.log('Test 1: Validate CONVEE_INSTITUTIONAL in PLAN_LIMITS');
assert(PLAN_LIMITS.CONVEE_INSTITUTIONAL, 'CONVEE_INSTITUTIONAL must exist in PLAN_LIMITS');
assert.strictEqual(PLAN_LIMITS.CONVEE_INSTITUTIONAL.cases, 150, 'Cases limit should be 150');
assert.strictEqual(PLAN_LIMITS.CONVEE_INSTITUTIONAL.quiz_practice, Infinity, 'Quiz practice should be Infinity');
assert.strictEqual(PLAN_LIMITS.CONVEE_INSTITUTIONAL.draft_maker, Infinity, 'Draft maker should be Infinity');
assert.strictEqual(PLAN_LIMITS.CONVEE_INSTITUTIONAL.legal_precedent, Infinity, 'Legal precedent should be Infinity');
assert.strictEqual(PLAN_LIMITS.CONVEE_INSTITUTIONAL.mock_courtroom, 25, 'Mock courtroom should be 25');
assert.strictEqual(PLAN_LIMITS.CONVEE_INSTITUTIONAL.notes_maker, Infinity, 'Notes maker should be Infinity');
console.log('✅ Passed: CONVEE_INSTITUTIONAL limits properly configured.\n');

// Test 2: Organization Schema validation
console.log('Test 2: Validate Organization Schema instantiation');
const testDoc = new Organization({
  organizationName: 'National Law University, Delhi',
  organizationSlug: 'nlu-delhi',
  studentName: 'Aarav Sharma',
  studentEmail: 'aarav.sharma@nludelhi.ac.in',
  studentId: 'NLU2024-041',
  className: 'BA.LLB (Hons) - 3rd Year',
  plan: {
    planId: 'convee_institutional',
    planName: 'Convee Institutional Academic Plan',
    subscribed: true,
    status: 'active',
    credits: 5000
  },
  credits: 5000,
  status: 'active'
});

const validationError = testDoc.validateSync();
assert(!validationError, `Schema validation should pass but got: ${validationError}`);
assert.strictEqual(testDoc.organizationName, 'National Law University, Delhi');
assert.strictEqual(testDoc.studentEmail, 'aarav.sharma@nludelhi.ac.in');
assert.strictEqual(testDoc.plan.planId, 'convee_institutional');
assert.strictEqual(testDoc.plan.subscribed, true);
assert.strictEqual(testDoc.status, 'active');
console.log('✅ Passed: Organization schema validates correctly with Convee fields.\n');

// Test 3: Validate Plan Model configuration
console.log('Test 3: Validate Convee Plan Configuration in Plan schema');
const samplePlan = new Plan({
  planId: 'convee_institutional',
  planName: 'Convee Institutional Academic Plan',
  priceMonthly: 0,
  priceYearly: 0,
  credits: 5000,
  creditsYearly: 60000,
  badge: 'CONVEE ACADEMIC',
  storageGB: 50,
  isActive: true
});
const planErr = samplePlan.validateSync();
assert(!planErr, `Plan validation failed: ${planErr}`);
assert.strictEqual(samplePlan.planId, 'convee_institutional');
assert.strictEqual(samplePlan.badge, 'CONVEE ACADEMIC');
assert.strictEqual(samplePlan.credits, 5000);
console.log('✅ Passed: Convee Plan schema instantiates correctly.\n');

console.log('🎉 ALL CONVEE LINKED ORGANIZATION & PLAN TESTS PASSED SUCCESSFULLY!');
process.exit(0);
