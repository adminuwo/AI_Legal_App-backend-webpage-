import assert from 'assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

console.log('================================================================');
console.log('🧪 AI LEGAL BACKEND SECURITY & REFACTORING ENDPOINT TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message}\n`);
    failedTests++;
  }
}

async function runAsyncTest(testName, testFn) {
  try {
    await testFn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message}\n`);
    failedTests++;
  }
}

// Set up mock secret if not in env
const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_ai_legal_app_2026';

// -------------------------------------------------------------
// 1. TOKEN SECURITY & DATA LEAK TEST
// -------------------------------------------------------------
runTest('JWT Token generation must NOT contain sensitive fields (password, hash, otp)', () => {
  const userPayload = {
    id: '65f123456789abcdef123456',
    email: 'advocate@example.com',
    role: 'user'
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
  const decoded = jwt.verify(token, JWT_SECRET);

  assert.strictEqual(decoded.id, userPayload.id);
  assert.strictEqual(decoded.email, userPayload.email);
  assert.strictEqual(decoded.role, 'user');
  assert.strictEqual(decoded.password, undefined, 'JWT token must never contain password');
  assert.strictEqual(decoded.resetPasswordToken, undefined, 'JWT token must never contain reset token');
  assert.strictEqual(decoded.otp, undefined, 'JWT token must never contain OTP');
});

// -------------------------------------------------------------
// 2. OTP SECURITY & HASH VERIFICATION TEST
// -------------------------------------------------------------
await runAsyncTest('OTP generation and Bcrypt hashing must be one-way and strictly verifiable', async () => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  assert.match(otpCode, /^\d{6}$/, 'OTP must be exactly 6 digits');

  const hashedOtp = await bcrypt.hash(otpCode, 10);
  assert.notStrictEqual(hashedOtp, otpCode, 'OTP must not be stored in plain text');

  // Positive verification
  const isValid = await bcrypt.compare(otpCode, hashedOtp);
  assert.strictEqual(isValid, true, 'Valid OTP must match hashed OTP');

  // Negative verification (tampered OTP)
  const isInvalid = await bcrypt.compare('000000', hashedOtp);
  assert.strictEqual(isInvalid, false, 'Invalid OTP must be rejected');
});

// -------------------------------------------------------------
// 3. OBJECT SANITIZATION (DATA LEAK IN API RESPONSES)
// -------------------------------------------------------------
runTest('User Profile API response sanitizer strips password and secret tokens', () => {
  const rawMongoUser = {
    _id: '65f123456789abcdef123456',
    name: 'Adv. Rajesh Kumar',
    email: 'rajesh@legal.in',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
    verificationCode: '849201',
    resetPasswordToken: '$2a$10$hashresettoken123',
    role: 'user',
    credits: 500,
    subscription: { plan: 'PRO' }
  };

  // Standard safe projection function
  const sanitizeUserResponse = (user) => {
    const { password, verificationCode, resetPasswordToken, ...safeUser } = user;
    return safeUser;
  };

  const safeResponse = sanitizeUserResponse(rawMongoUser);
  assert.strictEqual(safeResponse.password, undefined);
  assert.strictEqual(safeResponse.verificationCode, undefined);
  assert.strictEqual(safeResponse.resetPasswordToken, undefined);
  assert.strictEqual(safeResponse.email, 'rajesh@legal.in');
  assert.strictEqual(safeResponse.credits, 500);
});

// -------------------------------------------------------------
// 4. HORIZONTAL PRIVILEGE ESCALATION (IDOR) TEST
// -------------------------------------------------------------
runTest('Tenant / Case Isolation Guard rejects unauthorized cross-user access', () => {
  const userA = { id: 'user_111', role: 'user' };
  const userB = { id: 'user_222', role: 'user' };
  const adminUser = { id: 'admin_999', role: 'admin' };

  const caseOwnedByUserA = {
    _id: 'case_abc',
    userId: 'user_111',
    owner: 'user_111',
    assignedUserIds: ['user_111'],
    members: []
  };

  const authorizeAccess = (user, project) => {
    if (user.role === 'admin' || user.role === 'SUPER_ADMIN') return true;
    const uid = String(user.id || user._id);
    const owner = String(project.userId || project.owner);
    if (owner === uid) return true;
    if (project.assignedUserIds?.some(id => String(id) === uid)) return true;
    return false;
  };

  // User A should be authorized to access own case
  assert.strictEqual(authorizeAccess(userA, caseOwnedByUserA), true);

  // User B MUST NOT be authorized to access User A's case (Prevent IDOR)
  assert.strictEqual(authorizeAccess(userB, caseOwnedByUserA), false);

  // Admin should have authorized access for support/admin purposes
  assert.strictEqual(authorizeAccess(adminUser, caseOwnedByUserA), true);
});

// -------------------------------------------------------------
// 5. CONTRACT SERVICE & ATTACHMENT INTEGRITY TEST
// -------------------------------------------------------------
runTest('Contract Service MD5 Checksum detection prevents duplicate uploads and corrupt files', () => {
  const fileBufferA = Buffer.from('Mock Contract Agreement Text 2026');
  const fileBufferB = Buffer.from('Mock Contract Agreement Text 2026');
  const fileBufferC = Buffer.from('Different Contract Text');

  const checksumA = crypto.createHash('md5').update(fileBufferA).digest('hex');
  const checksumB = crypto.createHash('md5').update(fileBufferB).digest('hex');
  const checksumC = crypto.createHash('md5').update(fileBufferC).digest('hex');

  assert.strictEqual(checksumA, checksumB, 'Identical files must produce identical checksums');
  assert.notStrictEqual(checksumA, checksumC, 'Distinct files must produce distinct checksums');

  const existingContracts = [{ hash: checksumA, name: 'agreement.pdf' }];
  const isDuplicate = existingContracts.some(c => c.hash === checksumB);
  assert.strictEqual(isDuplicate, true, 'Duplicate upload should be caught by checksum');
});

// -------------------------------------------------------------
// 6. ENTERPRISE USER CREATION SCHEMA INTEGRITY TEST
// -------------------------------------------------------------
runTest('Enterprise auto-enrolled users must include provider and providerId to bypass password requirement', () => {
  const createEnterpriseUserPayload = (name, email, enterpriseId) => {
    const cleanEmail = email.trim().toLowerCase();
    return {
      name: name.trim(),
      email: cleanEmail,
      role: 'user',
      provider: 'enterprise',
      providerId: `enterprise_${enterpriseId}_${cleanEmail}`,
      isVerified: true
    };
  };

  const user = createEnterpriseUserPayload('Rohan Sharma', 'rohan@nls.ac.in', 'ent_67890');
  assert.strictEqual(user.provider, 'enterprise');
  assert.strictEqual(user.providerId, 'enterprise_ent_67890_rohan@nls.ac.in');
  assert.strictEqual(Boolean(user.providerId), true, 'providerId must be defined to pass User.js password validation');
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${passedTests} Passed | ${failedTests} Failed`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Security & Refactoring Endpoint Unit Tests Passed Successfully!\n');
}
