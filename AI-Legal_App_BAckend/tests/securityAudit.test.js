import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('🔍 AI LEGAL BACKEND SECURITY & DATA LEAK STATIC AUDIT SUITE');
console.log('================================================================\n');

const SENSITIVE_KEYWORDS = [
  'password',
  'resetPasswordToken',
  'verificationCode',
  'otp',
  'secret',
  'private_key',
  'refreshToken',
  'access_token'
];

let totalIssues = 0;
const findings = [];

function scanDirectory(dir, filter = (f) => f.endsWith('.js')) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'tests') {
      files = files.concat(scanDirectory(fullPath, filter));
    } else if (entry.isFile() && filter(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 1. Audit Route Authorization Guards
console.log('📌 [AUDIT 1] Scanning API Routes for Missing Authentication & Admin Guards...');
const routeFiles = scanDirectory(path.join(backendRoot, 'routes'));

const sensitiveRoutePatterns = [
  { pattern: /\/admin/i, expected: ['isAdmin', 'verifyToken', 'checkRole', 'adminAuth'] },
  { pattern: /\/all/i, expected: ['isAdmin', 'verifyToken', 'checkRole'] },
  { pattern: /\/users/i, expected: ['verifyToken', 'isAdmin'] },
  { pattern: /\/enterprise/i, expected: ['verifyToken'] }
];

for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(backendRoot, file);

  lines.forEach((line, index) => {
    // Check router method calls: router.get, router.post, router.put, router.delete
    const routeMatch = line.match(/router\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`](.*)/i);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const routePath = routeMatch[2];
      const rest = routeMatch[3];

      // Check for user deletion or blocking without isAdmin
      if (routePath.includes('/:id/block') || routePath.includes('/all')) {
        if (!rest.includes('isAdmin') && !rest.includes('checkRole') && !rest.includes('SUPER_ADMIN')) {
          findings.push({
            severity: 'CRITICAL',
            file: relPath,
            line: index + 1,
            type: 'Privilege Escalation / Authorization Flaw',
            message: `Route [${method} ${routePath}] is missing 'isAdmin' middleware guard.`
          });
          totalIssues++;
        }
      }

      // Check for dangerous unauthenticated endpoints
      if (routePath.includes('delete') || routePath.includes('update') || routePath.includes('reset-password-admin')) {
        if (!rest.includes('verifyToken') && !rest.includes('isAdmin') && !relPath.includes('authRoutes')) {
          findings.push({
            severity: 'HIGH',
            file: relPath,
            line: index + 1,
            type: 'Unauthenticated Sensitive Route',
            message: `Route [${method} ${routePath}] appears unauthenticated.`
          });
          totalIssues++;
        }
      }
    }
  });
}

// 2. Audit Controllers & Models for Direct Password / Token Leaks
console.log('📌 [AUDIT 2] Scanning Controllers and Services for Sensitive Field Exposure...');
const controllerFiles = scanDirectory(path.join(backendRoot, 'controllers'))
  .concat(scanDirectory(path.join(backendRoot, 'services')))
  .concat(scanDirectory(path.join(backendRoot, 'routes')));

for (const file of controllerFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(backendRoot, file);

  lines.forEach((line, index) => {
    // Check for res.json returning raw user query without select('-password')
    if (line.includes('userModel.find') || line.includes('User.find')) {
      if (!line.includes('.select(') && !content.includes('.select(') && !line.includes('findByIdAndUpdate')) {
        // Potential leak if returned directly
      }
    }

    // Check if OTP or raw password or token is returned in response body
    const jsonMatch = line.match(/res\.(status\(\d+\)\.)?json\(\{([^}]+)\}\)/);
    if (jsonMatch) {
      const jsonBody = jsonMatch[2];
      for (const kw of SENSITIVE_KEYWORDS) {
        // Match key: value where key is sensitive
        const kwRegex = new RegExp(`\\b${kw}\\s*:`, 'i');
        if (kwRegex.test(jsonBody)) {
          // Allow harmless messages like message: "Password updated"
          if (!jsonBody.includes(`message`) && !jsonBody.includes(`error`) && !jsonBody.includes(`msg`)) {
            findings.push({
              severity: 'CRITICAL',
              file: relPath,
              line: index + 1,
              type: 'Sensitive Data Exposure',
              message: `Potential leakage of sensitive field '${kw}' in response payload: ${line.trim()}`
            });
            totalIssues++;
          }
        }
      }
    }
  });
}

// 3. Audit User Model Creation in Enterprise & Auth Controllers (Missing Password Required Bug)
console.log('📌 [AUDIT 3] Checking User instantiation in Enterprise Controller for Mongoose validation...');
const enterpriseCtrlPath = path.join(backendRoot, 'controllers', 'enterpriseController.js');
if (fs.existsSync(enterpriseCtrlPath)) {
  const entContent = fs.readFileSync(enterpriseCtrlPath, 'utf8');
  if (entContent.includes('new User({') && !entContent.includes('providerId')) {
    const lines = entContent.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('new User({')) {
        findings.push({
          severity: 'HIGH',
          file: 'controllers/enterpriseController.js',
          line: idx + 1,
          type: 'Runtime Bug / Unhandled Validation Error',
          message: `User created without 'providerId' or 'password'. Mongoose UserSchema validation will reject user.save() with ValidationError!`
        });
        totalIssues++;
      }
    });
  }
}

// Summary Report
console.log('\n================================================================');
console.log(`📊 AUDIT SUMMARY: Found ${totalIssues} Potential Security / Stability Issues`);
console.log('================================================================\n');

if (findings.length === 0) {
  console.log('✅ No critical security or data leak issues found in static analysis.');
} else {
  findings.forEach((f, i) => {
    console.log(`[${i + 1}] [${f.severity}] ${f.type}`);
    console.log(`    File: ${f.file}:${f.line}`);
    console.log(`    Detail: ${f.message}\n`);
  });
}
