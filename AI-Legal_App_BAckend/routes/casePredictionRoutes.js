import express from 'express';
import mongoose from 'mongoose';
import CasePrediction from '../models/CasePrediction.js';
import Project from '../models/Project.js';
import { verifyToken } from '../middleware/authorization.js';
import { verifyFeatureAccess } from '../middleware/subscriptionCheck.middleware.js';

const router = express.Router();

// GET /api/case-predictions - List latest versions of predictions for current user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { search, filter, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skipNum = (pageNum - 1) * limitNum;

        // Base match object for the user
        const matchObj = { userId: new mongoose.Types.ObjectId(userId) };

        // 1. Apply quick filters
        if (filter === 'linked') {
            matchObj.workspaceId = { $ne: null };
        } else if (filter === 'manual') {
            matchObj.workspaceId = null;
            matchObj.manualFacts = { $ne: null };
        } else if (filter === 'uploaded') {
            matchObj.uploadedDocuments = { $exists: true, $not: { $size: 0 } };
        }

        // Win probability filter
        if (filter === 'high_win') {
            // Match win probability strings like "75%", "80%", "85%", etc.
            matchObj.winProbability = { $regex: /^(7[5-9]|8[0-9]|9[0-9]|100)%?/ };
        }

        // Date limits
        const now = new Date();
        if (filter === 'today') {
            const startOfToday = new Date(now.setHours(0, 0, 0, 0));
            matchObj.createdAt = { $gte: startOfToday };
        } else if (filter === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - 7));
            matchObj.createdAt = { $gte: startOfWeek };
        } else if (filter === 'month') {
            const startOfMonth = new Date(now.setDate(now.getDate() - 30));
            matchObj.createdAt = { $gte: startOfMonth };
        }

        // 2. Search query (matches caseName, manualFacts context, or riskAnalysis text)
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');

            // Find matching cases/projects to query workspaceId
            const matchingCases = await Project.find({
                userId,
                $or: [
                    { name: searchRegex },
                    { clientName: searchRegex }
                ]
            }).select('_id');

            matchObj.$or = [
                { caseName: searchRegex },
                { riskAnalysis: searchRegex },
                { generatedPrediction: searchRegex },
                { 'manualFacts.facts': searchRegex },
                { workspaceId: { $in: matchingCases.map(c => c._id) } }
            ];
        }

        // Aggregate pipeline: match user's predictions -> sort descending by version -> group by versionGroupId -> select latest
        const pipeline = [
            { $match: matchObj },
            { $sort: { version: -1, createdAt: -1 } },
            {
                $group: {
                    _id: "$versionGroupId",
                    latestDoc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$latestDoc" } },
            { $sort: { createdAt: -1 } },
            { $skip: skipNum },
            { $limit: limitNum }
        ];

        const results = await CasePrediction.aggregate(pipeline);

        // Populate workspaceId details on the results
        await CasePrediction.populate(results, {
            path: 'workspaceId',
            select: 'name clientName caseType'
        });

        // Compute total count for pagination
        const countPipeline = [
            { $match: matchObj },
            {
                $group: {
                    _id: "$versionGroupId"
                }
            },
            { $count: "total" }
        ];
        const countResult = await CasePrediction.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        res.json({
            success: true,
            data: results,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching case prediction history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch prediction history' });
    }
});

// GET /api/case-predictions/versions/:versionGroupId - Get all versions of a prediction
router.get('/versions/:versionGroupId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { versionGroupId } = req.params;

        const versions = await CasePrediction.find({
            userId,
            versionGroupId
        })
        .sort({ version: -1 })
        .populate('workspaceId', 'name clientName caseType');

        res.json({
            success: true,
            data: versions
        });
    } catch (error) {
        console.error('Error fetching prediction versions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch prediction versions' });
    }
});

// GET /api/case-predictions/:id - Get details of a single prediction
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const prediction = await CasePrediction.findOne({
            _id: req.params.id,
            userId
        }).populate('workspaceId', 'name clientName caseType');

        if (!prediction) {
            return res.status(404).json({ success: false, error: 'Prediction not found' });
        }

        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('Error fetching prediction details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch prediction details' });
    }
});

// POST /api/case-predictions - Save a new prediction or version
router.post('/', verifyToken, verifyFeatureAccess('case_predictor'), async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            caseName,
            workspaceId,
            uploadedDocuments,
            ocrResults,
            manualFacts,
            generatedPrediction,
            riskAnalysis,
            winProbability,
            aiSummary,
            versionGroupId
        } = req.body;

        if (!caseName || !generatedPrediction) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        let finalVersionGroupId = versionGroupId;
        let nextVersion = 1;

        if (finalVersionGroupId) {
            const latest = await CasePrediction.findOne({
                userId,
                versionGroupId: finalVersionGroupId
            })
            .sort({ version: -1 })
            .select('version');

            if (latest) {
                nextVersion = latest.version + 1;
            }
        } else {
            finalVersionGroupId = new mongoose.Types.ObjectId().toString();
        }

        const newPrediction = new CasePrediction({
            userId,
            caseName,
            workspaceId: workspaceId || null,
            uploadedDocuments: uploadedDocuments || [],
            ocrResults: ocrResults || '',
            manualFacts: manualFacts || null,
            generatedPrediction,
            riskAnalysis: riskAnalysis || '',
            winProbability: winProbability || '50%',
            aiSummary: aiSummary || '',
            version: nextVersion,
            versionGroupId: finalVersionGroupId
        });

        await newPrediction.save();

        if (req.commitUsage) await req.commitUsage();
        const FeatureAccessManager = await import('../services/featureAccessManager.js');
        const latestUsageStatus = await FeatureAccessManager.getUsageStatus(userId);

        res.status(201).json({
            success: true,
            message: 'Prediction saved successfully',
            data: newPrediction,
            usageStatus: latestUsageStatus
        });
    } catch (error) {
        console.error('Error saving case prediction:', error);
        res.status(500).json({ success: false, error: 'Failed to save prediction' });
    }
});

// POST /api/case-predictions/duplicate/:id - Duplicate a prediction under a new version group
router.post('/duplicate/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const prediction = await CasePrediction.findOne({ _id: req.params.id, userId });
        if (!prediction) {
            return res.status(404).json({ success: false, error: 'Prediction to duplicate not found' });
        }

        const newGroupId = new mongoose.Types.ObjectId().toString();

        const duplicate = new CasePrediction({
            userId,
            caseName: `${prediction.caseName} (Copy)`,
            workspaceId: prediction.workspaceId,
            uploadedDocuments: prediction.uploadedDocuments,
            ocrResults: prediction.ocrResults,
            manualFacts: prediction.manualFacts,
            generatedPrediction: prediction.generatedPrediction,
            riskAnalysis: prediction.riskAnalysis,
            winProbability: prediction.winProbability,
            aiSummary: prediction.aiSummary,
            version: 1,
            versionGroupId: newGroupId
        });

        await duplicate.save();

        res.status(201).json({
            success: true,
            message: 'Prediction duplicated successfully',
            data: duplicate
        });
    } catch (error) {
        console.error('Error duplicating case prediction:', error);
        res.status(500).json({ success: false, error: 'Failed to duplicate prediction' });
    }
});

// PUT /api/case-predictions/:id - Edit metadata across all versions in versionGroupId
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { caseName, workspaceId, notes, tags } = req.body;

        const prediction = await CasePrediction.findOne({ _id: req.params.id, userId });
        if (!prediction) {
            return res.status(404).json({ success: false, error: 'Prediction not found' });
        }

        const updateFields = {};
        if (caseName !== undefined) updateFields.caseName = caseName;
        if (workspaceId !== undefined) updateFields.workspaceId = workspaceId || null;

        await CasePrediction.updateMany(
            { userId, versionGroupId: prediction.versionGroupId },
            { $set: updateFields }
        );

        const updatedDoc = await CasePrediction.findById(req.params.id)
            .populate('workspaceId', 'name clientName caseType');

        res.json({
            success: true,
            message: 'Prediction metadata updated across all versions',
            data: updatedDoc
        });
    } catch (error) {
        console.error('Error updating prediction:', error);
        res.status(500).json({ success: false, error: 'Failed to update prediction metadata' });
    }
});

// DELETE /api/case-predictions/:id - Delete a case prediction and all versions in versionGroupId
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const prediction = await CasePrediction.findOne({ _id: req.params.id, userId });
        if (!prediction) {
            return res.status(404).json({ success: false, error: 'Prediction not found' });
        }

        const deleteResult = await CasePrediction.deleteMany({
            userId,
            versionGroupId: prediction.versionGroupId
        });

        res.json({
            success: true,
            message: `Successfully deleted prediction and all of its ${deleteResult.deletedCount} versions.`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('Error deleting prediction:', error);
        res.status(500).json({ success: false, error: 'Failed to delete prediction' });
    }
});

export default router;
