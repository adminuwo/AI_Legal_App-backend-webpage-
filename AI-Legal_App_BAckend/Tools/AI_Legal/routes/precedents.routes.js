import express from 'express';
import { findPrecedents } from '../services/precedents.service.js';
import Project from '../../../models/Project.js';
import Precedent from '../../../models/Precedent.js';
import logger from '../../../utils/logger.js';
import { generatePrecedentPDF } from '../services/pdf.service.js';

import { verifyToken } from '../../../middleware/authorization.js';
import { verifyFeatureAccess } from '../../../middleware/subscriptionCheck.middleware.js';

const router = express.Router();

/**
 * @route POST /api/precedents/search
 * @desc Find legal precedents based on query or case context
 */
router.post('/search', verifyToken, verifyFeatureAccess('legal_precedent'), async (req, res) => {
    const startTime = Date.now();
    try {
        const { query, projectId, language } = req.body;
        
        let caseContext = null;
        if (projectId) {
            caseContext = await Project.findOne({
                _id: projectId,
                $or: [
                    { userId: req.user.id },
                    { owner: req.user.id },
                    { assignedUserIds: req.user.id },
                    { 'members.user': req.user.id }
                ]
            });
            if (!caseContext) {
                return res.status(403).json({ error: 'Access denied: Project not found or unauthorized' });
            }
        }

        const results = await findPrecedents(query, caseContext, language);
        if (req.commitUsage) await req.commitUsage();
        res.json(results);
    } catch (error) {
        logger.error(`[PrecedentsRoute] Search failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to retrieve precedents.' });
    }
});

/**
 * @route POST /api/precedents/analyze
 * @desc Perform AI analysis on a specific precedent
 */
router.post('/analyze', verifyToken, verifyFeatureAccess('legal_precedent'), async (req, res) => {
    try {
        const { actionType, precedentData, projectId, language } = req.body;
        
        let activeCaseData = null;
        if (projectId) {
            activeCaseData = await Project.findOne({
                _id: projectId,
                $or: [
                    { userId: req.user.id },
                    { owner: req.user.id },
                    { assignedUserIds: req.user.id },
                    { 'members.user': req.user.id }
                ]
            });
            if (!activeCaseData) {
                return res.status(403).json({ error: 'Access denied: Project not found or unauthorized' });
            }
        }

        // Fetch full precedent from DB if only lightweight info/ID is provided
        let fullPrecedentData = precedentData;
        if (precedentData && precedentData._id) {
            const dbPrecedent = await Precedent.findById(precedentData._id);
            if (dbPrecedent) {
                fullPrecedentData = dbPrecedent.toObject();
            }
        } else if (precedentData && (precedentData.case_name || precedentData.case_identity?.case_name)) {
            const searchName = precedentData.case_name || precedentData.case_identity?.case_name;
            const dbPrecedent = await Precedent.findOne({
                case_name: { $regex: new RegExp(`^${searchName.trim()}$`, 'i') }
            });
            if (dbPrecedent) {
                fullPrecedentData = dbPrecedent.toObject();
            }
        }

        const { analyzePrecedent } = await import('../services/precedents.service.js');
        const analysis = await analyzePrecedent(actionType, fullPrecedentData, activeCaseData, language);
        
        if (req.commitUsage) await req.commitUsage();
        res.json({ analysis });
    } catch (error) {
        logger.error(`[PrecedentsRoute] Analysis failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to generate AI analysis.', details: error.message });
    }
});

/**
 * @route POST /api/precedents/reanalyze
 * @desc Re-analyze a specific precedent against a new case context
 */
router.post('/reanalyze', verifyToken, verifyFeatureAccess('legal_precedent'), async (req, res) => {
    try {
        const { precedentData, projectId, language } = req.body;
        
        let activeCaseData = null;
        if (projectId) {
            const { authorizeCaseAccess } = await import('../../../middleware/authorization.js');
            activeCaseData = await Project.findById(projectId);
            if (activeCaseData && req.user && !authorizeCaseAccess(req.user, activeCaseData)) {
                return res.status(403).json({ error: 'Access denied: You do not have permission for this case' });
            }
        }

        const { processPrecedentWithAI } = await import('../services/precedents.service.js');
        const reanalyzedData = await processPrecedentWithAI(precedentData, activeCaseData, language);
        
        if (req.commitUsage) await req.commitUsage();
        res.json(reanalyzedData);
    } catch (error) {
        logger.error(`[PrecedentsRoute] Re-analysis failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to re-analyze precedent.', details: error.message });
    }
});

/**
 * @route POST /api/precedents/generate-pdf
 * @desc Generate a professional PDF for a precedent
 */
router.post('/generate-pdf', async (req, res) => {
    try {
        const { precedentData } = req.body;
        
        if (!precedentData) {
            return res.status(400).json({ error: 'Precedent data is required' });
        }

        // Fetch full precedent from DB if only lightweight info/ID is provided
        let fullPrecedentData = precedentData;
        if (precedentData && precedentData._id) {
            const dbPrecedent = await Precedent.findById(precedentData._id);
            if (dbPrecedent) {
                fullPrecedentData = dbPrecedent.toObject();
            }
        } else if (precedentData && (precedentData.case_name || precedentData.case_identity?.case_name)) {
            const searchName = precedentData.case_name || precedentData.case_identity?.case_name;
            const dbPrecedent = await Precedent.findOne({
                case_name: { $regex: new RegExp(`^${searchName.trim()}$`, 'i') }
            });
            if (dbPrecedent) {
                fullPrecedentData = dbPrecedent.toObject();
            }
        }

        const pdfBuffer = await generatePrecedentPDF(fullPrecedentData);
        
        const caseName = (precedentData.case_identity?.case_name || precedentData.case_name || "Precedent").replace(/[^a-z0-9]/gi, '_');
        const court = (precedentData.case_identity?.court || precedentData.court || "Court").replace(/[^a-z0-9]/gi, '_');
        const year = precedentData.case_identity?.year || precedentData.year || "2025";
        
        const fileName = `${caseName}_${court}_${year}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error(`[PrecedentsRoute] PDF generation failed: ${error.message}`);
        console.error("[PDF_ERROR_TRACE]", error);
        
        // Check for specific Puppeteer/Cloud Run errors
        let errorMessage = 'Failed to generate PDF document.';
        if (error.message.includes('launch')) {
            errorMessage = 'PDF Engine failed to start. Please contact support.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'PDF generation timed out. The document might be too large.';
        }

        res.status(500).json({ 
            success: false,
            error: errorMessage, 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
});

export default router;
