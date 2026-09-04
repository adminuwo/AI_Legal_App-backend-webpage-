/**
 * AI Legal Mobile - Centralized App Update System Test Suite
 * Validates semantic version comparison, optional update detection,
 * mandatory update classification, and resilience against invalid version metadata.
 */

import { compareVersions, isUpdateAvailable, isMandatoryUpdate, parseVersion } from '../utils/version';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

export function runVersionTests() {
  console.log('--- Running AI LEGAL™ Version Unit Tests ---');

  // TEST 12: 1.9.0 < 1.10.0 correct version comparison
  assert(compareVersions('1.9.0', '1.10.0') === -1, 'TEST 12: 1.9.0 < 1.10.0');
  assert(compareVersions('1.10.0', '1.9.0') === 1, 'TEST 12: 1.10.0 > 1.9.0');
  assert(isUpdateAvailable('1.9.0', '1.10.0') === true, 'TEST 12: Update available for 1.9.0 -> 1.10.0');

  // TEST 1: Current = 1.2.0, Latest = 1.2.0
  assert(compareVersions('1.2.0', '1.2.0') === 0, 'TEST 1: 1.2.0 === 1.2.0');
  assert(isUpdateAvailable('1.2.0', '1.2.0') === false, 'TEST 1: No update for 1.2.0');
  assert(isMandatoryUpdate('1.2.0', '1.1.0') === false, 'TEST 1: Not mandatory for 1.2.0');

  // TEST 2: Current = 1.1.0, Latest = 1.2.0, Minimum = 1.1.0
  assert(isUpdateAvailable('1.1.0', '1.2.0') === true, 'TEST 2: Optional update available');
  assert(isMandatoryUpdate('1.1.0', '1.1.0') === false, 'TEST 2: Minimum supported, not mandatory');

  // TEST 3: Current = 1.0.0, Latest = 1.2.0, Minimum = 1.1.0
  assert(isUpdateAvailable('1.0.0', '1.2.0') === true, 'TEST 3: Update available');
  assert(isMandatoryUpdate('1.0.0', '1.1.0') === true, 'TEST 3: Mandatory update required');

  // Patch version updates (1.0.0 vs 1.0.1)
  assert(compareVersions('1.0.0', '1.0.1') === -1, 'Patch version comparison');
  assert(isUpdateAvailable('1.0.0', '1.0.1') === true, 'Patch update available');

  // Major version updates (1.9.9 vs 2.0.0)
  assert(compareVersions('1.9.9', '2.0.0') === -1, 'Major version comparison');
  assert(isUpdateAvailable('1.9.9', '2.0.0') === true, 'Major update available');

  // Pre-release tags and build metadata
  const parsed1 = parseVersion('1.2.0-rc.1');
  assert(parsed1[0] === 1 && parsed1[1] === 2 && parsed1[2] === 0, 'Pre-release tag handling');
  
  const parsed2 = parseVersion('v2.5.1+102');
  assert(parsed2[0] === 2 && parsed2[1] === 5 && parsed2[2] === 1, 'Build metadata tag handling');

  // TEST 10 & 11: Malformed and missing version input resilience
  assert(compareVersions(null as any, '1.2.0') === -1, 'TEST 10/11: Null version handling');
  assert(compareVersions('1.0.0', undefined as any) === 1, 'TEST 10/11: Undefined version handling');
  assert(compareVersions('invalid-version', '1.2.0') === -1, 'TEST 10/11: Malformed version handling');
  assert(compareVersions('invalid', 'invalid') === 0, 'TEST 10/11: Equal invalid strings handling');

  console.log('✅ ALL 12 VERSION TEST CASES PASSED SUCCESSFULLY!');
}

// Execute tests automatically if run directly
try {
  runVersionTests();
} catch (err: any) {
  console.error('❌ Version test failure:', err.message);
}
