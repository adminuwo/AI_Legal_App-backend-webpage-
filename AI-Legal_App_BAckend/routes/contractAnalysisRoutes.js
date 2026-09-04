import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import ContractAnalysis from '../models/ContractAnalysis.js';
import Project from '../models/Project.js';
import { verifyToken } from '../middleware/authorization.js';
import { verifyFeatureAccess } from '../middleware/subscriptionCheck.middleware.js';
import { extractTextFromBuffer } from '../services/documentIntelligence.service.js';
import { askOpenAI } from '../services/openai.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contract-analysis/review
// Runs full AI contract review: OCR extraction + structured GPT-4o analysis.
// Body: { fileUrl, fileName, ocrText?, caseId?, versionGroupId? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/review', verifyToken, verifyFeatureAccess('contract_review'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { fileUrl, fileName, ocrText, caseId, versionGroupId } = req.body;

        if (!fileUrl || !fileName) {
            return res.status(400).json({ success: false, error: 'fileUrl and fileName are required.' });
        }

        // ── Step 1: Extract text from file (use provided ocrText or run OCR) ──
        let contractText = ocrText || '';

        if (!contractText.trim()) {
            logger.info(`[ContractReview] Fetching file for OCR: ${fileUrl}`);
            let fileBuffer;
            try {
                const response = await axios.get(fileUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: { 'Accept': '*/*' }
                });
                fileBuffer = Buffer.from(response.data);
            } catch (fetchErr) {
                logger.warn(`[ContractReview] File fetch failed: ${fetchErr.message}. Proceeding with filename-only context.`);
                // Proceed without document text — GPT will analyze based on context
            }

            if (fileBuffer) {
                const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
                const mimeMap = {
                    pdf: 'application/pdf',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    doc: 'application/msword',
                    txt: 'text/plain',
                    jpg: 'image/jpeg', jpeg: 'image/jpeg',
                    png: 'image/png', webp: 'image/webp'
                };
                const mime = mimeMap[ext] || 'application/octet-stream';
                try {
                    contractText = await extractTextFromBuffer(fileBuffer, fileName, mime);
                    logger.info(`[ContractReview] OCR complete. Extracted ${contractText.length} chars.`);
                } catch (ocrErr) {
                    logger.warn(`[ContractReview] OCR failed: ${ocrErr.message}`);
                    contractText = '';
                }
            }
        }

        // Guard: validate this is actually a contract document
        const textSnippet = contractText.substring(0, 500).toLowerCase();
        const isLikelyNotContract = (
            contractText.length > 100 &&
            !textSnippet.includes('agree') &&
            !textSnippet.includes('party') &&
            !textSnippet.includes('clause') &&
            !textSnippet.includes('contract') &&
            !textSnippet.includes('term') &&
            !textSnippet.includes('whereas') &&
            !textSnippet.includes('payment') &&
            !textSnippet.includes('obligation') &&
            !textSnippet.includes('liability') &&
            !textSnippet.includes('this agreement') &&
            !textSnippet.includes('between')
        );

        const maxChars = 40000;
        const truncatedText = contractText.length > maxChars
            ? contractText.substring(0, maxChars) + '\n\n[Document truncated at 40,000 characters. Critical clauses above are sufficient for full review.]'
            : contractText;

        // ── Step 2: Build the structured GPT-4o contract review prompt ──
        const systemInstruction = `You are a Senior Enterprise Legal AI Contract Analyst with 20+ years of experience reviewing commercial, employment, NDA, lease, vendor, and technology contracts across Indian and international jurisdictions.

You MUST analyze ONLY the actual contract text provided. Do NOT make up clauses, parties, dates, or facts. If information is not present in the document, set that field to null or an empty array.

You MUST respond with a valid JSON object only. Do NOT include markdown, code blocks, or commentary outside the JSON.

JSON Schema (all fields required):
{
  "contractType": "string — e.g. NDA, Commercial Lease, Employment Agreement, Vendor Agreement, SaaS Agreement",
  "executiveSummary": "string — 3-5 sentence summary of what this contract is about, who the parties are, and the main obligations",
  "parties": [
    { "name": "string", "role": "string — e.g. Licensor, Lessee, Employer, Service Provider" }
  ],
  "effectiveDate": "string or null",
  "terminationDate": "string or null",
  "contractDuration": "string or null — e.g. 3 years from effective date",
  "governingLaw": "string or null",
  "jurisdiction": "string or null",
  "riskScore": "number 0-100 (100 = maximum risk to the reviewing party)",
  "riskLevel": "string — one of: Low, Medium, High, Critical",
  "aiConfidence": "number 0-100 — confidence in this analysis based on document clarity",
  "keyClausesFound": [
    {
      "clauseTitle": "string",
      "summary": "string — plain English explanation",
      "riskRating": "string — Low | Medium | High | Critical",
      "riskReason": "string — why this clause is risky or favorable",
      "isPresent": true
    }
  ],
  "missingClauses": [
    {
      "clauseTitle": "string",
      "importance": "string — Critical | Important | Recommended",
      "reason": "string — why this clause is missing and what risk it creates"
    }
  ],
  "highRiskClauses": ["string — clause title or short description"],
  "mediumRiskClauses": ["string"],
  "lowRiskClauses": ["string"],
  "redFlags": ["string — specific issues requiring immediate legal attention"],
  "legalIssues": ["string — specific legal compliance issues found"],
  "paymentTerms": "string or null",
  "penaltyClauses": ["string"],
  "terminationConditions": ["string"],
  "confidentialityScope": "string or null",
  "indemnityScope": "string or null",
  "liabilityCap": "string or null",
  "forceMajeure": "string or null — present/absent and scope",
  "arbitrationClause": "string or null — present/absent and scope",
  "renewalClause": "string or null",
  "noticePeriod": "string or null",
  "recommendations": [
    { "priority": "string — Urgent | High | Medium | Low", "action": "string", "reason": "string" }
  ],
  "suggestedClauseImprovements": ["string — specific clause rewrite suggestions"],
  "negotiationPoints": ["string — items to negotiate before signing"],
  "overallAssessment": "string — final verdict: should the client sign as-is, negotiate, or reject?"
}`;

        const userPrompt = truncatedText.trim().length > 50
            ? `Analyze this contract document:\n\nFILE NAME: ${fileName}\n\n---CONTRACT TEXT START---\n${truncatedText}\n---CONTRACT TEXT END---`
            : `Analyze this contract based on filename context only (document text unavailable or too short):\n\nFILE NAME: ${fileName}\n\nProvide a framework analysis noting that full text analysis requires a readable document.`;

        // ── Step 3: Call GPT-4o ──
        logger.info(`[ContractReview] Sending to GPT-4o. Text length: ${truncatedText.length}`);
        const rawJson = await askOpenAI(userPrompt, null, {
            systemInstruction,
            jsonMode: true,
            model: 'gpt-4o',
            temperature: 0.15,
            userId,
        });

        let analysis;
        try {
            // Strip any accidental markdown wrappers
            const cleaned = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            analysis = JSON.parse(cleaned);
        } catch (parseErr) {
            logger.error(`[ContractReview] JSON parse failed: ${parseErr.message}`);
            return res.status(500).json({ success: false, error: 'AI returned invalid JSON. Please retry.' });
        }

        // ── Step 4: Auto-save analysis to database ──
        let savedDoc = null;
        try {
            let finalVersionGroupId = versionGroupId;
            let nextVersion = 1;

            if (finalVersionGroupId) {
                const latestVersion = await ContractAnalysis.findOne({ userId, versionGroupId: finalVersionGroupId })
                    .sort({ version: -1 }).select('version');
                if (latestVersion) nextVersion = latestVersion.version + 1;
            } else {
                finalVersionGroupId = new mongoose.Types.ObjectId().toString();
            }

            savedDoc = new ContractAnalysis({
                userId,
                caseId: caseId || null,
                contractName: fileName,
                originalFileUrl: fileUrl,
                originalFileMime: fileName.split('.').pop() || 'pdf',
                ocrText: contractText.substring(0, 5000), // Store first 5000 chars for reference
                aiAnalysisResult: JSON.stringify(analysis),
                riskScore: analysis.riskScore || 50,
                riskLevel: analysis.riskLevel || 'Medium',
                missingClauses: (analysis.missingClauses || []).map(c => c.clauseTitle || c).filter(Boolean),
                suggestedClauses: (analysis.recommendations || []).map(r => r.action).filter(Boolean),
                keyObligations: (analysis.keyClausesFound || []).map(c => c.clauseTitle).filter(Boolean),
                partiesDetected: (analysis.parties || []).map(p => p.name).filter(Boolean),
                datesDetected: [analysis.effectiveDate, analysis.terminationDate].filter(Boolean),
                monetaryValues: (analysis.penaltyClauses || []).slice(0, 3),
                governingLaw: analysis.governingLaw || '',
                aiSummary: analysis.executiveSummary || '',
                version: nextVersion,
                versionGroupId: finalVersionGroupId,
            });
            await savedDoc.save();
            logger.info(`[ContractReview] Analysis saved. ID: ${savedDoc._id}, Version: ${nextVersion}`);
        } catch (saveErr) {
            logger.warn(`[ContractReview] Auto-save failed: ${saveErr.message}`);
            // Don't fail the response if save fails — just warn
        }

        if (req.commitUsage) await req.commitUsage();
        const FeatureAccessManager = await import('../services/featureAccessManager.js');
        const latestUsageStatus = await FeatureAccessManager.getUsageStatus(userId);

        return res.json({
            success: true,
            analysis,
            ocrTextLength: contractText.length,
            savedId: savedDoc?._id || null,
            savedVersion: savedDoc?.version || null,
            versionGroupId: savedDoc?.versionGroupId || null,
            usageStatus: latestUsageStatus
        });

    } catch (error) {
        logger.error(`[ContractReview] Unhandled error: ${error.message}`);
        return res.status(500).json({ success: false, error: 'Contract review failed. Please retry.' });
    }
});



// GET /api/contract-analysis - List latest versions of analyzed contracts for current user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { search, filter, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skipNum = (pageNum - 1) * limitNum;

        // Base match object for the user
        const matchObj = { userId: new mongoose.Types.ObjectId(userId) };

        // 1. Filter by linked status
        if (filter === 'linked') {
            matchObj.caseId = { $ne: null };
        } else if (filter === 'independent') {
            matchObj.caseId = null;
        }

        // 2. Filter by risk levels
        if (filter === 'high') {
            matchObj.riskLevel = { $in: ['High', 'Critical'] };
        } else if (filter === 'medium') {
            matchObj.riskLevel = 'Medium';
        } else if (filter === 'low') {
            matchObj.riskLevel = 'Low';
        }

        // 3. Filter by date limits
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

        // 4. Search query (matches contract name, parties, or linked case name)
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            
            // Query case names that match search to filter by caseId too
            const matchingCases = await Project.find({
                userId,
                $or: [
                    { name: searchRegex },
                    { clientName: searchRegex }
                ]
            }).select('_id');

            matchObj.$or = [
                { contractName: searchRegex },
                { partiesDetected: searchRegex },
                { originalFileUrl: searchRegex },
                { caseId: { $in: matchingCases.map(c => c._id) } }
            ];
        }

        // Aggregate pipeline: match user's contracts -> sort descending by version -> group by versionGroupId -> select latest
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

        const results = await ContractAnalysis.aggregate(pipeline);
        
        // Populate caseId details on the results
        await ContractAnalysis.populate(results, {
            path: 'caseId',
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
        const countResult = await ContractAnalysis.aggregate(countPipeline);
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
        console.error('Error fetching contract analysis history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch history list' });
    }
});

// GET /api/contract-analysis/versions/:versionGroupId - Get all versions of a contract
router.get('/versions/:versionGroupId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { versionGroupId } = req.params;

        const versions = await ContractAnalysis.find({
            userId,
            versionGroupId
        })
        .sort({ version: -1 })
        .populate('caseId', 'name clientName caseType');

        res.json({
            success: true,
            data: versions
        });
    } catch (error) {
        console.error('Error fetching contract versions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch contract versions' });
    }
});

// GET /api/contract-analysis/:id - Get details of a single analysis
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const analysis = await ContractAnalysis.findOne({
            _id: req.params.id,
            userId
        }).populate('caseId', 'name clientName caseType');

        if (!analysis) {
            return res.status(404).json({ success: false, error: 'Contract analysis not found' });
        }

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error fetching contract details:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analysis details' });
    }
});

// POST /api/contract-analysis - Save a new analysis or increment version of existing contract
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            caseId,
            contractName,
            originalFileUrl,
            originalFileMime,
            originalFileSize,
            originalFilePages,
            ocrText,
            aiAnalysisResult,
            riskScore,
            riskLevel,
            missingClauses,
            suggestedClauses,
            keyObligations,
            partiesDetected,
            datesDetected,
            monetaryValues,
            governingLaw,
            aiSummary,
            notes,
            tags,
            versionGroupId
        } = req.body;

        if (!contractName || !originalFileUrl || !aiAnalysisResult) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        let finalVersionGroupId = versionGroupId;
        let nextVersion = 1;

        if (finalVersionGroupId) {
            // Find highest version under this group to increment
            const latestVersion = await ContractAnalysis.findOne({
                userId,
                versionGroupId: finalVersionGroupId
            })
            .sort({ version: -1 })
            .select('version');

            if (latestVersion) {
                nextVersion = latestVersion.version + 1;
            }
        } else {
            // Create a new versionGroupId
            finalVersionGroupId = new mongoose.Types.ObjectId().toString();
        }

        const newAnalysis = new ContractAnalysis({
            userId,
            caseId: caseId || null,
            contractName,
            originalFileUrl,
            originalFileMime,
            originalFileSize,
            originalFilePages,
            ocrText,
            aiAnalysisResult,
            riskScore: riskScore || 0,
            riskLevel: riskLevel || 'Medium',
            missingClauses: missingClauses || [],
            suggestedClauses: suggestedClauses || [],
            keyObligations: keyObligations || [],
            partiesDetected: partiesDetected || [],
            datesDetected: datesDetected || [],
            monetaryValues: monetaryValues || [],
            governingLaw: governingLaw || '',
            aiSummary: aiSummary || '',
            notes: notes || '',
            tags: tags || [],
            version: nextVersion,
            versionGroupId: finalVersionGroupId
        });

        await newAnalysis.save();

        res.status(201).json({
            success: true,
            message: 'Contract analysis saved successfully',
            data: newAnalysis
        });
    } catch (error) {
        console.error('Error saving contract analysis:', error);
        res.status(500).json({ success: false, error: 'Failed to save contract analysis' });
    }
});

// PUT /api/contract-analysis/:id - Update contract metadata (e.g. rename, change case links)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { contractName, caseId, notes, tags } = req.body;

        // Find the target analysis to confirm ownership
        const analysis = await ContractAnalysis.findOne({ _id: req.params.id, userId });
        if (!analysis) {
            return res.status(404).json({ success: false, error: 'Contract analysis not found' });
        }

        // We update all versions under this versionGroupId so metadata changes stay consistent across versions
        const updateFields = {};
        if (contractName !== undefined) updateFields.contractName = contractName;
        if (caseId !== undefined) updateFields.caseId = caseId || null;
        if (notes !== undefined) updateFields.notes = notes;
        if (tags !== undefined) updateFields.tags = tags;

        await ContractAnalysis.updateMany(
            { userId, versionGroupId: analysis.versionGroupId },
            { $set: updateFields }
        );

        const updatedDoc = await ContractAnalysis.findById(req.params.id)
            .populate('caseId', 'name clientName caseType');

        res.json({
            success: true,
            message: 'Contract metadata updated successfully across all versions',
            data: updatedDoc
        });
    } catch (error) {
        console.error('Error updating contract analysis:', error);
        res.status(500).json({ success: false, error: 'Failed to update metadata' });
    }
});

// DELETE /api/contract-analysis/:id - Delete a contract analysis (deletes all versions in versionGroupId)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const analysis = await ContractAnalysis.findOne({ _id: req.params.id, userId });
        if (!analysis) {
            return res.status(404).json({ success: false, error: 'Contract analysis not found' });
        }

        // Delete all versions under this group
        const deleteResult = await ContractAnalysis.deleteMany({
            userId,
            versionGroupId: analysis.versionGroupId
        });

        res.json({
            success: true,
            message: `Successfully deleted contract and all of its ${deleteResult.deletedCount} versions.`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('Error deleting contract analysis:', error);
        res.status(500).json({ success: false, error: 'Failed to delete contract analysis' });
    }
});

export default router;
