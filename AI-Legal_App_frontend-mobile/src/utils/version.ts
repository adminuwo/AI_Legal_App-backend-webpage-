/**
 * AI Legal Mobile - Semantic Version Comparison Utility
 * Clean, safe semantic version handling for update management.
 * Handles 1.9.0 < 1.10.0, 1.0.0 < 1.0.1, build metadata, and missing/malformed inputs safely.
 */

/**
 * Normalizes a version string by stripping non-numeric/dot/hyphen characters and splitting into numeric components.
 * Example: "1.10.0-rc1" -> [1, 10, 0]
 */
export function parseVersion(versionStr: string | null | undefined): number[] {
  if (!versionStr || typeof versionStr !== 'string') {
    return [0, 0, 0];
  }

  // Strip leading 'v' or 'V' if present
  const cleaned = versionStr.trim().replace(/^v/i, '');
  
  // Extract main version before any build metadata (+) or pre-release tags (-)
  const mainPart = cleaned.split('-')[0].split('+')[0];

  const parts = mainPart.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  });

  // Ensure at least 3 components [major, minor, patch]
  while (parts.length < 3) {
    parts.push(0);
  }

  return parts;
}

/**
 * Compares two semantic version strings.
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string | null | undefined, v2: string | null | undefined): number {
  try {
    const p1 = parseVersion(v1);
    const p2 = parseVersion(v2);

    const maxLength = Math.max(p1.length, p2.length);
    for (let i = 0; i < maxLength; i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;

      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }

    return 0;
  } catch (err) {
    console.warn('[Version] Failed to compare versions safely:', err);
    return 0;
  }
}

/**
 * Checks if a newer version is available.
 * Returns true if installedVersion < latestVersion.
 */
export function isUpdateAvailable(installedVersion: string, latestVersion: string): boolean {
  if (!latestVersion) return false;
  return compareVersions(installedVersion, latestVersion) < 0;
}

/**
 * Checks if a mandatory update is required.
 * Returns true if installedVersion < minimumSupportedVersion.
 */
export function isMandatoryUpdate(installedVersion: string, minimumSupportedVersion: string): boolean {
  if (!minimumSupportedVersion) return false;
  return compareVersions(installedVersion, minimumSupportedVersion) < 0;
}
