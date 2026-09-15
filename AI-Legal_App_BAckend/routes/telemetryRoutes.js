import express from 'express';
import { recordInstallTelemetry } from '../controllers/downloadAnalyticsController.js';

const router = express.Router();

// Public telemetry ping endpoint for mobile first launch & install referrer attribution
router.post('/install', recordInstallTelemetry);

export default router;
