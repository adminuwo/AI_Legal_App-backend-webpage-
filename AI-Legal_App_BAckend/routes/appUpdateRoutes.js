import express from 'express';
import AdminSettings from '../models/AdminSettings.js';
import AppRelease from '../models/AppRelease.js';
import { verifyToken, isAdmin } from '../middleware/authorization.js';

const router = express.Router();

function compareSemVer(v1, v2) {
  const p1 = (v1 || '0').replace(/^v/i, '').split('-')[0].split('+')[0].split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '0').replace(/^v/i, '').split('-')[0].split('+')[0].split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length, 3);
  for (let i = 0; i < len; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

/**
 * Helper to compute the latest released version for a given platform.
 * Returns the highest semantic version among all records marked as Released.
 */
async function getLatestReleasedVersion(platform) {
  const releases = await AppRelease.find({ platform: { $in: [platform, 'both'] }, status: 'Released' }).lean().exec();
  if (!releases || releases.length === 0) {
    return { version: '1.0.1', buildNumber: 1, releaseNotes: 'Initial release', releasedAt: null };
  }

  // Sort by semantic version descending, then by buildNumber descending
  releases.sort((a, b) => {
    const semCmp = compareSemVer(b.version, a.version);
    if (semCmp !== 0) return semCmp;
    return (b.buildNumber || 0) - (a.buildNumber || 0);
  });

  const latest = releases[0];
  return {
    version: latest.version || '1.0.1',
    buildNumber: latest.buildNumber || 1,
    releaseNotes: latest.releaseNotes || '',
    releasedAt: latest.releasedAt || latest.createdAt,
  };
}

/**
 * Helper to fetch all valid released versions for a given platform (sorted descending).
 */
async function getReleasedVersionsList(platform) {
  const releases = await AppRelease.find({ platform: { $in: [platform, 'both'] }, status: 'Released' }).lean().exec();
  const versionSet = new Set(['1.0.0']);
  if (releases && releases.length > 0) {
    releases.forEach((r) => {
      if (r.version) versionSet.add(r.version);
    });
  }
  const uniqueVersions = Array.from(versionSet);
  uniqueVersions.sort((a, b) => compareSemVer(b, a));
  return uniqueVersions;
}

const DEFAULT_SETTINGS = {
  android: {
    minimumSupportedVersion: '1.0.0',
    updatePolicy: 'optional',
    title: 'AI LEGAL™ Update Available',
    message: 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.uwo.ailegal',
    enabled: true,
  },
  ios: {
    minimumSupportedVersion: '1.0.0',
    updatePolicy: 'optional',
    title: 'AI LEGAL™ Update Available',
    message: 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
    storeUrl: 'https://apps.apple.com/app/ai-legal/id123456789',
    enabled: true,
  },
};

// ==========================================
// PUBLIC ENDPOINTS FOR MOBILE APP
// ==========================================

/**
 * GET /api/app-update/config
 * Public endpoint consumed by mobile client.
 * Returns automatically calculated latest version and admin-controlled minimum version / policy.
 */
router.get('/config', async (req, res) => {
  try {
    const settingsDoc = await AdminSettings.findOne({}).lean().exec();
    const appUpdateConfig = settingsDoc?.appUpdate || DEFAULT_SETTINGS;

    const [androidLatest, iosLatest] = await Promise.all([
      getLatestReleasedVersion('android'),
      getLatestReleasedVersion('ios'),
    ]);

    const androidSettings = { ...DEFAULT_SETTINGS.android, ...(appUpdateConfig.android || {}) };
    const iosSettings = { ...DEFAULT_SETTINGS.ios, ...(appUpdateConfig.ios || {}) };

    return res.status(200).json({
      success: true,
      config: {
        android: {
          latestVersion: androidLatest.version,
          latestBuildNumber: androidLatest.buildNumber,
          releaseNotes: androidLatest.releaseNotes,
          minimumSupportedVersion: androidSettings.minimumSupportedVersion || '1.0.0',
          updatePolicy: androidSettings.updatePolicy || 'optional',
          title: androidSettings.title || 'AI LEGAL™ Update Available',
          message: androidSettings.message || 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
          storeUrl: androidSettings.storeUrl,
          enabled: androidSettings.enabled !== false,
        },
        ios: {
          latestVersion: iosLatest.version,
          latestBuildNumber: iosLatest.buildNumber,
          releaseNotes: iosLatest.releaseNotes,
          minimumSupportedVersion: iosSettings.minimumSupportedVersion || '1.0.0',
          updatePolicy: iosSettings.updatePolicy || 'optional',
          title: iosSettings.title || 'AI LEGAL™ Update Available',
          message: iosSettings.message || 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
          storeUrl: iosSettings.storeUrl,
          enabled: iosSettings.enabled !== false,
        },
      },
    });
  } catch (error) {
    console.warn('[AppUpdateRoute] Error building config, returning defaults:', error.message);
    return res.status(200).json({
      success: true,
      config: {
        android: {
          latestVersion: '1.0.1',
          latestBuildNumber: 1,
          releaseNotes: 'General improvements',
          minimumSupportedVersion: '1.0.0',
          updatePolicy: 'optional',
          title: 'AI LEGAL™ Update Available',
          message: 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
          storeUrl: DEFAULT_SETTINGS.android.storeUrl,
          enabled: true,
        },
        ios: {
          latestVersion: '1.0.1',
          latestBuildNumber: 1,
          releaseNotes: 'General improvements',
          minimumSupportedVersion: '1.0.0',
          updatePolicy: 'optional',
          title: 'AI LEGAL™ Update Available',
          message: 'A new version of AI LEGAL™ is available with improvements and bug fixes.',
          storeUrl: DEFAULT_SETTINGS.ios.storeUrl,
          enabled: true,
        },
      },
    });
  }
});

// ==========================================
// ADMIN CONSOLE ENDPOINTS (AUTHENTICATED & ADMIN ONLY)
// ==========================================

/**
 * GET /api/app-update/admin/releases
 * Admin endpoint to list release history, top summary, and valid released versions for dropdowns.
 */
router.get('/admin/releases', verifyToken, isAdmin, async (req, res) => {
  try {
    const [releases, settingsDoc] = await Promise.all([
      AppRelease.find({}).sort({ releasedAt: -1, createdAt: -1 }).lean().exec(),
      AdminSettings.findOne({}).lean().exec(),
    ]);

    const appUpdateConfig = settingsDoc?.appUpdate || DEFAULT_SETTINGS;
    const androidSettings = { ...DEFAULT_SETTINGS.android, ...(appUpdateConfig.android || {}) };
    const iosSettings = { ...DEFAULT_SETTINGS.ios, ...(appUpdateConfig.ios || {}) };

    const [androidLatest, iosLatest, androidReleasedVersions, iosReleasedVersions] = await Promise.all([
      getLatestReleasedVersion('android'),
      getLatestReleasedVersion('ios'),
      getReleasedVersionsList('android'),
      getReleasedVersionsList('ios'),
    ]);

    const androidReleases = releases.filter((r) => r.platform === 'android' || r.platform === 'both');
    const iosReleases = releases.filter((r) => r.platform === 'ios' || r.platform === 'both');

    const lastAndroidRelease = androidReleases.find((r) => r.status === 'Released');
    const lastIosRelease = iosReleases.find((r) => r.status === 'Released');

    let lastReleaseDate = null;
    if (lastAndroidRelease || lastIosRelease) {
      const dates = [lastAndroidRelease?.releasedAt, lastIosRelease?.releasedAt].filter(Boolean);
      dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      lastReleaseDate = dates[0];
    }

    return res.status(200).json({
      success: true,
      summary: {
        android: {
          latestVersion: androidLatest.version,
          minimumSupportedVersion: androidSettings.minimumSupportedVersion || '1.0.0',
          updatePolicy: androidSettings.updatePolicy || 'optional',
          storeUrl: androidSettings.storeUrl,
          title: androidSettings.title,
          message: androidSettings.message,
          enabled: androidSettings.enabled !== false,
        },
        ios: {
          latestVersion: iosLatest.version,
          minimumSupportedVersion: iosSettings.minimumSupportedVersion || '1.0.0',
          updatePolicy: iosSettings.updatePolicy || 'optional',
          storeUrl: iosSettings.storeUrl,
          title: iosSettings.title,
          message: iosSettings.message,
          enabled: iosSettings.enabled !== false,
        },
        totalReleases: releases.length,
        lastReleaseDate,
      },
      releases,
      releasedVersions: {
        android: androidReleasedVersions,
        ios: iosReleasedVersions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/app-update/admin/releases
 * Admin endpoint to add a new Release Record.
 * Supports platform: 'android', 'ios', or 'both'.
 */
router.post('/admin/releases', verifyToken, isAdmin, async (req, res) => {
  try {
    const { platform, version, buildNumber, releaseType, releaseNotes, storeUrl, status } = req.body;

    if (!platform || !version || !buildNumber) {
      return res.status(400).json({ success: false, message: 'Platform, version, and build number are required.' });
    }

    const releaseStatus = status || 'Released';
    const createdReleases = [];

    const platformsToCreate = platform === 'both' ? ['android', 'ios'] : [platform];

    for (const plt of platformsToCreate) {
      const newRelease = await AppRelease.create({
        platform: plt,
        version: version.trim(),
        buildNumber: parseInt(buildNumber, 10) || 1,
        releaseType: releaseType || 'Feature',
        releaseNotes: releaseNotes || '',
        storeUrl: storeUrl || '',
        status: releaseStatus,
        releasedAt: new Date(),
      });
      createdReleases.push(newRelease);
    }

    return res.status(201).json({
      success: true,
      message: `New release ${version} created successfully.`,
      releases: createdReleases,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/app-update/admin/releases/:id
 * Admin endpoint to update a release record.
 */
router.put('/admin/releases/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const updated = await AppRelease.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Release record not found.' });
    }
    return res.status(200).json({ success: true, release: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/app-update/admin/releases/:id
 * Admin endpoint to delete a release record.
 */
router.delete('/admin/releases/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await AppRelease.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Release record deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/app-update/admin/settings
 * Admin endpoint to update minimum supported versions, update policies, titles, messages, and store URLs.
 * NOTE: Creating or updating settings NEVER changes minimum supported version automatically.
 */
router.put('/admin/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    let settingsDoc = await AdminSettings.findOne({});
    if (!settingsDoc) {
      settingsDoc = await AdminSettings.create({});
    }

    const currentAppUpdate = settingsDoc.appUpdate || DEFAULT_SETTINGS;
    const updatedAppUpdate = {
      android: {
        ...DEFAULT_SETTINGS.android,
        ...(currentAppUpdate.android || {}),
        ...(req.body.android || {}),
      },
      ios: {
        ...DEFAULT_SETTINGS.ios,
        ...(currentAppUpdate.ios || {}),
        ...(req.body.ios || {}),
      },
    };

    settingsDoc.appUpdate = updatedAppUpdate;
    await settingsDoc.save();

    return res.status(200).json({
      success: true,
      message: 'App Update Settings updated successfully.',
      appUpdate: settingsDoc.appUpdate,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
