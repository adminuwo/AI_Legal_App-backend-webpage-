import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import {
    getDownloadSummary,
    getCountryDownloads,
    getCountryDetails,
    getDownloadTrends,
    exportDownloadReport,
    syncHistoricalInstalls,
    syncGaUninstallsHandler,
    testGaConnectionHandler,
    syncSilentUninstallsHandler,
    getUninstalledUsers
} from '../controllers/downloadAnalyticsController.js';

const router = express.Router();

// Guard all admin analytics endpoints with verifyToken and isAdmin
router.use(verifyToken, isAdmin);

// 1. Dashboard summary KPIs
router.get('/', getDownloadSummary);
router.get('/summary', getDownloadSummary);

// 2. Country-wise download table with search, sort, pagination
router.get('/countries', getCountryDownloads);

// 3. Country detail view & State/Region drill-down
router.get('/countries/:country', getCountryDetails);

// 4. Time-series install trend chart
router.get('/trends', getDownloadTrends);

// 5. Export report (JSON/CSV)
router.get('/export', exportDownloadReport);

// 5b. Uninstalled users & devices detail list
router.get('/uninstalls', getUninstalledUsers);

// 6. Manual trigger to sync historical registered users into AppInstall telemetry
router.post('/sync-historical', async (req, res) => {
    try {
        const result = await syncHistoricalInstalls();
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 7. Google Analytics GA4 Uninstalls Sync Endpoint
router.post('/sync-ga-uninstalls', syncGaUninstallsHandler);

// 8. Google Analytics GA4 Connection Test Endpoint
router.get('/test-ga-connection', testGaConnectionHandler);

// 9. Real-Time Silent Ping Uninstalls Sync Endpoint (Same-day detection via Expo/FCM)
router.post('/sync-silent-uninstalls', syncSilentUninstallsHandler);

export default router;
