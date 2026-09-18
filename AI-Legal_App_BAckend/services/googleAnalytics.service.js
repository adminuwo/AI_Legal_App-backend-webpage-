import { google } from 'googleapis';
import AppInstall from '../models/AppInstall.js';
import GaAnalyticsSync from '../models/GaAnalyticsSync.js';

let cachedClient = null;

/**
 * Initializes and caches Google Analytics Data API client
 */
export const getAnalyticsDataClient = () => {
    if (cachedClient) return cachedClient;

    try {
        let auth = null;

        // 1. Try GOOGLE_PLAY_SERVICE_ACCOUNT_KEY in .env
        if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY) {
            try {
                const creds = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY);
                auth = new google.auth.GoogleAuth({
                    credentials: {
                        client_email: creds.client_email,
                        private_key: creds.private_key
                    },
                    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
                });
            } catch (parseErr) {
                console.warn('[GA4 Service] Could not parse GOOGLE_PLAY_SERVICE_ACCOUNT_KEY as JSON:', parseErr.message);
            }
        }

        // 2. Fallback to GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC
        if (!auth) {
            auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/analytics.readonly']
            });
        }

        cachedClient = google.analyticsdata({
            version: 'v1beta',
            auth
        });

        return cachedClient;
    } catch (err) {
        console.error('[GA4 Service] Error initializing Analytics client:', err.message);
        throw err;
    }
};

/**
 * Helper to get active GA4 Property ID
 */
export const getPropertyId = () => {
    const raw = process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    if (!raw) return null;
    return raw.replace(/^properties\//, '').trim();
};

/**
 * Test GA4 API Connection and Authentication status
 */
export const testGa4Connection = async (overridePropertyId = null) => {
    const propertyId = overridePropertyId || getPropertyId();
    const serviceAccountEmail = "743928421487-compute@developer.gserviceaccount.com";

    if (!propertyId) {
        return {
            connected: false,
            configured: false,
            message: "GA4_PROPERTY_ID is not configured in .env",
            instructions: [
                "1. Open Google Analytics (analytics.google.com).",
                "2. Go to Admin -> Property Settings and copy your numeric Property ID (e.g. 412345678).",
                "3. Add 'GA4_PROPERTY_ID=your_id' in AI-Legal_App_BAckend/.env.",
                `4. In GA4 Admin -> Property Access Management, add: '${serviceAccountEmail}' as Viewer.`
            ]
        };
    }

    try {
        const client = getAnalyticsDataClient();
        const res = await client.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
                metrics: [{ name: 'eventCount' }],
                limit: 1
            }
        });

        return {
            connected: true,
            configured: true,
            propertyId,
            message: `Successfully connected to GA4 Property ${propertyId}!`,
            rowCount: res.data.rowCount || 0
        };
    } catch (err) {
        return {
            connected: false,
            configured: true,
            propertyId,
            error: err.message,
            message: `Authentication or permission check failed for GA4 Property ${propertyId}.`,
            instructions: [
                `Ensure that service account '${serviceAccountEmail}' has been added with 'Viewer' permission in GA4 Property Access Management.`,
                "Ensure Google Analytics Data API is enabled in Google Cloud Console project 'ai-mall-484810'."
            ]
        };
    }
};

/**
 * Fetch app_remove (uninstalls) event counts from GA4
 */
export const fetchAppRemoveMetrics = async ({ startDate = '30daysAgo', endDate = 'today', propertyIdOverride = null } = {}) => {
    const propertyId = propertyIdOverride || getPropertyId();
    if (!propertyId) {
        throw new Error("GA4_PROPERTY_ID is not configured. Please set it in .env.");
    }

    const client = getAnalyticsDataClient();

    const response = await client.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [
                { name: 'date' },
                { name: 'operatingSystem' }
            ],
            metrics: [
                { name: 'eventCount' }
            ],
            dimensionFilter: {
                filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                        matchType: 'EXACT',
                        value: 'app_remove'
                    }
                }
            },
            orderBys: [
                {
                    dimension: { dimensionName: 'date' },
                    desc: false
                }
            ]
        }
    });

    const rows = response.data.rows || [];
    const results = [];

    for (const row of rows) {
        // row.dimensionValues[0] = date 'YYYYMMDD'
        // row.dimensionValues[1] = operatingSystem ('Android', 'iOS', etc.)
        // row.metricValues[0] = eventCount
        const rawDate = row.dimensionValues?.[0]?.value || '';
        const rawOs = (row.dimensionValues?.[1]?.value || '').toLowerCase();
        const count = parseInt(row.metricValues?.[0]?.value || '0', 10);

        let formattedDate = rawDate;
        if (rawDate.length === 8) {
            formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
        }

        const platform = rawOs.includes('android') ? 'android' : rawOs.includes('ios') ? 'ios' : 'unknown';

        results.push({
            date: formattedDate,
            rawOs,
            platform,
            count
        });
    }

    return {
        propertyId,
        startDate,
        endDate,
        totalEvents: results.reduce((sum, r) => sum + r.count, 0),
        records: results
    };
};

/**
 * Sync GA4 Uninstalls directly into Database (GaAnalyticsSync & AppInstall)
 */
export const syncUninstallsToDatabase = async ({ days = 30, propertyIdOverride = null, dryRun = false } = {}) => {
    const propertyId = propertyIdOverride || getPropertyId();
    if (!propertyId) {
        return {
            success: false,
            message: "GA4_PROPERTY_ID is not configured in .env",
            needsConfig: true
        };
    }

    const startDate = days === 'all' ? '2024-01-01' : `${days}daysAgo`;
    const endDate = 'today';

    const metricsData = await fetchAppRemoveMetrics({
        startDate,
        endDate,
        propertyIdOverride: propertyId
    });

    if (dryRun) {
        return {
            success: true,
            dryRun: true,
            propertyId,
            records: metricsData.records,
            totalUninstalls: metricsData.totalEvents
        };
    }

    let upsertedCount = 0;
    let totalUninstallsSynced = 0;

    for (const item of metricsData.records) {
        totalUninstallsSynced += item.count;

        // 1. Record daily platform stats in GaAnalyticsSync
        await GaAnalyticsSync.findOneAndUpdate(
            {
                propertyId,
                date: item.date,
                platform: item.platform,
                metricName: 'app_remove'
            },
            {
                $set: {
                    count: item.count,
                    syncedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );
        upsertedCount++;

        // 2. Reflect in AppInstall collection:
        // Mark corresponding existing install records as 'uninstalled' or create uninstall records
        if (item.count > 0) {
            const dateStart = new Date(item.date);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(item.date);
            dateEnd.setHours(23, 59, 59, 999);

            // Find installed records on that date
            const existingToMark = await AppInstall.find({
                platform: item.platform,
                status: 'installed',
                installedAt: { $lte: dateEnd }
            }).limit(item.count).select('_id');

            if (existingToMark.length > 0) {
                const ids = existingToMark.map(doc => doc._id);
                await AppInstall.updateMany(
                    { _id: { $in: ids } },
                    { $set: { status: 'uninstalled', uninstalledAt: dateEnd } }
                );
            } else {
                // If fewer installed documents exist than GA uninstalls, create designated telemetry records
                for (let i = 0; i < item.count; i++) {
                    const uniqueInstallId = `ga4_uninst_${item.platform}_${item.date}_${i + 1}`;
                    await AppInstall.findOneAndUpdate(
                        { installId: uniqueInstallId },
                        {
                            $setOnInsert: {
                                installId: uniqueInstallId,
                                platform: item.platform,
                                country: 'India',
                                countryCode: 'IN',
                                status: 'uninstalled',
                                installedAt: dateStart,
                                uninstalledAt: dateEnd,
                                source: item.platform === 'ios' ? 'app-store' : 'google-play',
                                firstInstall: false,
                                appVersion: '1.0.11'
                            }
                        },
                        { upsert: true }
                    );
                }
            }
        }
    }

    return {
        success: true,
        propertyId,
        days,
        recordsCount: upsertedCount,
        totalUninstallsSynced,
        message: `Successfully synchronized ${totalUninstallsSynced} app uninstalls from GA4 across ${upsertedCount} daily buckets.`
    };
};
