import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import User from '../models/User.js';
import { runJurisdictionSandboxTest } from '../services/jurisdictionSandboxService.js';
import { getStatesForCountry, INDIAN_STATES_LIST, NEPAL_PROVINCES } from '../constants/jurisdictionConstants.js';
import { jurisdictionManager } from '../services/jurisdictionManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /api/jurisdictions/states
 * @desc    Get states / provinces for a given country name or code
 * @query   country (e.g. India, Nepal, IN, NP)
 */
router.get('/states', (req, res) => {
    try {
        const country = req.query.country || req.query.countryCode || 'India';
        const states = getStatesForCountry(country);
        return res.json({
            success: true,
            country,
            count: states.length,
            states
        });
    } catch (err) {
        logger.error(`[JurisdictionRoutes] Failed to get states: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to retrieve states list.' });
    }
});

/**
 * @route   GET /api/jurisdictions/countries/:countryCode/states
 * @desc    Get states for a specific country code parameter
 */
router.get('/countries/:countryCode/states', (req, res) => {
    try {
        const { countryCode } = req.params;
        const states = getStatesForCountry(countryCode);
        return res.json({
            success: true,
            countryCode,
            count: states.length,
            states
        });
    } catch (err) {
        logger.error(`[JurisdictionRoutes] Failed to get states for ${req.params.countryCode}: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to retrieve states list.' });
    }
});

/**
 * @route   POST /api/jurisdictions/test
 * @desc    Run an isolated jurisdiction test without mutating any user account
 * @body    { query, country, state, model }
 */
router.post('/test', async (req, res) => {
    try {
        const { query, country, state, model } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Test query is required.'
            });
        }

        const result = await runJurisdictionSandboxTest({
            query,
            country: country || 'India',
            state: state || '',
            userId: req.user?.id || 'mobile_sandbox',
            model: model || 'gemini-2.5-flash'
        });

        return res.json(result);
    } catch (err) {
        logger.error(`[JurisdictionRoutes] Sandbox test failed: ${err.message}`);
        return res.status(500).json({
            success: false,
            message: err.message || 'Jurisdiction test execution failed.'
        });
    }
});

/**
 * @route   GET /api/jurisdictions/my-jurisdiction
 * @desc    Retrieve the logged-in user's active legal jurisdiction
 */
router.get('/my-jurisdiction', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('country countryCode state legalJurisdiction');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const activeJurisdiction = user.legalJurisdiction?.country ? user.legalJurisdiction : {
            country: user.country || 'India',
            countryCode: user.countryCode || 'IN',
            state: user.state || '',
            jurisdictionType: user.state ? 'state' : 'national',
            savedAt: user.updatedAt,
            source: 'profile_default'
        };

        return res.json({
            success: true,
            jurisdiction: activeJurisdiction
        });
    } catch (err) {
        logger.error(`[JurisdictionRoutes] Get my jurisdiction failed: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to retrieve user jurisdiction.' });
    }
});

/**
 * @route   PUT /api/jurisdictions/my-jurisdiction
 * @desc    Save the user's permanent legal jurisdiction
 * @body    { country, countryCode, state, jurisdictionType }
 */
router.put('/my-jurisdiction', verifyToken, async (req, res) => {
    try {
        const { country, countryCode, state, jurisdictionType } = req.body;
        if (!country || !country.trim()) {
            return res.status(400).json({ success: false, message: 'Country is required.' });
        }

        const cleanCountry = country.trim();
        const cleanState = (state || '').trim();
        const cleanCode = (countryCode || '').trim();

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update top-level country & state fields for backwards compatibility
        user.country = cleanCountry;
        if (cleanCode) user.countryCode = cleanCode;
        user.state = cleanState;

        // Update dedicated legalJurisdiction subdocument
        user.legalJurisdiction = {
            country: cleanCountry,
            countryCode: cleanCode || (cleanCountry.toLowerCase() === 'nepal' ? 'NP' : (cleanCountry.toLowerCase() === 'india' ? 'IN' : '')),
            state: cleanState,
            jurisdictionType: jurisdictionType || (cleanState ? 'state' : 'national'),
            savedAt: new Date(),
            source: 'user_settings'
        };

        await user.save();
        logger.info(`[JurisdictionRoutes] Saved legal jurisdiction for user ${user._id}: ${cleanState ? cleanState + ', ' : ''}${cleanCountry}`);

        return res.json({
            success: true,
            message: 'Legal jurisdiction saved successfully.',
            jurisdiction: user.legalJurisdiction,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                country: user.country,
                countryCode: user.countryCode,
                state: user.state,
                legalJurisdiction: user.legalJurisdiction
            }
        });
    } catch (err) {
        logger.error(`[JurisdictionRoutes] Save jurisdiction failed: ${err.message}`);
        return res.status(500).json({ success: false, message: 'Failed to save legal jurisdiction.' });
    }
});

export default router;
