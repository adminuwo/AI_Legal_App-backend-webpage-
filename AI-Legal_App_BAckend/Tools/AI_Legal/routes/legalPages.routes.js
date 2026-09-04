import express from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../../../middleware/authorization.js';
import LegalPage from '../../../models/LegalPage.js';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
};

// GET /api/legal/:pageType - Public, returns legal page content
router.get('/:pageType', async (req, res) => {
    try {
        const { pageType } = req.params;
        const validTypes = ['cookie-policy', 'terms-of-service', 'privacy-policy'];
        if (!validTypes.includes(pageType)) {
            return res.status(400).json({ success: false, message: 'Invalid page type' });
        }

        // DB Down Fallback - prevent indefinite hanging due to Mongoose buffering
        if (mongoose.connection.readyState !== 1) {
            console.log(`[DB] MongoDB unreachable during GET /api/legal/${pageType}. Bypassing query and returning null.`);
            return res.json({ success: true, data: null }); // Frontend will use its defaults
        }

        const page = await LegalPage.findOne({ pageType });
        if (!page) {
            return res.json({ success: true, data: null }); // Frontend uses defaults
        }
        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/legal/:pageType - Admin only, update legal page content
router.put('/:pageType', verifyToken, isAdmin, async (req, res) => {
    try {
        const { pageType } = req.params;
        const { sections } = req.body;

        const validTypes = ['cookie-policy', 'terms-of-service', 'privacy-policy'];
        if (!validTypes.includes(pageType)) {
            return res.status(400).json({ success: false, message: 'Invalid page type' });
        }

        // DB Down Fallback - fail immediately instead of hanging
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database is currently unreachable. Cannot update legal pages.' });
        }

        const page = await LegalPage.findOneAndUpdate(
            { pageType },
            { pageType, sections, lastUpdated: new Date() },
            { new: true, upsert: true }
        );

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
