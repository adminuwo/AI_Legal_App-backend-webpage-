import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_audit_32_chars_min';

// Generate test tokens
const regularUserToken = jwt.sign(
  { id: 'usr_audit_regular_123', email: 'regular_user@example.com', role: 'USER' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminUserToken = jwt.sign(
  { id: 'usr_audit_admin_999', email: 'admin@uwo24.com', role: 'SUPER_ADMIN' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('=== Backend Endpoint Security & Data Leak Test Suite ===');
console.log('Generated Regular User Token (role: USER)');
console.log('Generated Admin User Token (role: SUPER_ADMIN)\n');

// Scan all route definitions
const routesDir = './routes';
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const testResults = [];

// Inspect every route file for security patterns and data exposure
for (const file of routeFiles) {
  const fullPath = path.join(routesDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Find all endpoints in file
  const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^;]+)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const endpointPath = match[2];
    const handlerChain = match[3];

    const hasVerifyToken = handlerChain.includes('verifyToken') || handlerChain.includes('auth') || content.includes('router.use(verifyToken)');
    const hasAdminCheck = handlerChain.includes('isAdmin') || handlerChain.includes('requireAdmin') || handlerChain.includes('adminAuth');
    const isPublicAuthRoute = file.includes('authRoutes') || file.includes('ssoRoutes') || file.includes('emailVerification') || endpointPath.includes('/login') || endpointPath.includes('/signup') || endpointPath.includes('/pricing');

    let securityStatus = 'PASS';
    let leakRisk = 'NONE';
    let severity = 'NONE';
    let notes = 'Properly guarded';

    // 1. Check if admin endpoint lacks admin guard
    if ((endpointPath.includes('admin') || file.includes('admin')) && !hasAdminCheck && !isPublicAuthRoute) {
      securityStatus = 'FAIL';
      severity = 'HIGH';
      leakRisk = 'UNAUTHORIZED_ADMIN_ACCESS';
      notes = 'Admin endpoint missing isAdmin / requireAdmin middleware';
    }

    // 2. Check if state mutating endpoint is completely unprotected
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !hasVerifyToken && !isPublicAuthRoute) {
      securityStatus = 'FAIL';
      severity = 'HIGH';
      leakRisk = 'UNAUTHENTICATED_MUTATION';
      notes = 'Mutating endpoint lacks verifyToken authentication';
    }

    // 3. Check for sensitive endpoints like logs, users dump, export
    if (endpointPath.includes('users') || endpointPath.includes('logs') || endpointPath.includes('export') || endpointPath.includes('config')) {
      if (!hasAdminCheck && !hasVerifyToken) {
        securityStatus = 'CRITICAL_FAIL';
        severity = 'CRITICAL';
        leakRisk = 'SENSITIVE_DATA_LEAK';
        notes = 'Potentially exposes user or configuration data without authentication';
      }
    }

    testResults.push({
      routeFile: file,
      method,
      endpoint: endpointPath,
      hasVerifyToken,
      hasAdminCheck,
      isPublicAuthRoute,
      securityStatus,
      severity,
      leakRisk,
      notes
    });
  }
}

console.log(`Audited ${testResults.length} endpoints across ${routeFiles.length} route files.`);
const failedEndpoints = testResults.filter(t => t.securityStatus !== 'PASS');
console.log(`Failed / High-Risk Endpoints: ${failedEndpoints.length}`);

// Write JSON output
fs.writeFileSync(
  '../audit_reports/raw_endpoint_test_results.json',
  JSON.stringify(testResults, null, 2)
);

console.log('Results saved to audit_reports/raw_endpoint_test_results.json');
