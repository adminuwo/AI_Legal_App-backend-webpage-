import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authorization.js';
import { verifyFeatureAccess } from '../middleware/subscriptionCheck.middleware.js';
import { creditMiddleware } from '../middleware/creditSystem.js';
import { askOpenAI } from '../services/openai.service.js';
import { extractTextFromBuffer } from '../services/documentIntelligence.service.js';
import StrategyHistory from '../models/StrategyHistory.js';
import Project from '../models/Project.js';
import logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// System prompt for parsing multiple uploaded documents
const OCR_SYSTEM_PROMPT = `You are a professional Enterprise Legal Document Parser.
Analyze the provided legal document text and extract key litigation details.
If multiple documents are provided, merge their facts and timeline entries intelligently and chronologically.
If you are uncertain about any value, set the value to null or empty string, and list the field name in the "uncertainFields" array.

Provide your response strictly as a JSON object matching the following schema. Do not wrap in markdown tags like \`\`\`json.

{
  "caseName": "Descriptive name based on parties or subject matter, e.g. ABC Pvt Ltd vs XYZ Corp",
  "caseSummary": "Concise summary of the dispute...",
  "facts": [
    { "title": "Fact title", "description": "Factual details...", "date": "YYYY-MM-DD or display date" }
  ],
  "timeline": [
    { "event": "Milestone name", "date": "YYYY-MM-DD or display date" }
  ],
  "clientClaims": "Key claims of the client/petitioner...",
  "opponentClaims": "Key arguments/claims of the opponent...",
  "witnesses": ["Witness Name 1", "Witness Name 2"],
  "contracts": ["Contract details or agreement dates..."],
  "courtOrders": ["Any past orders or court directives..."],
  "notices": ["Notices sent or received details..."],
  "legalSections": ["Relevant legal sections, e.g., Section 138 of NI Act"],
  "applicableActs": ["Acts, e.g., Negotiable Instruments Act, 1881"],
  "courtName": "Court name if specified...",
  "jurisdiction": "Territorial or pecuniary jurisdiction details...",
  "reliefSought": "Details of the relief or prayer sought...",
  "financialClaims": "Cheque amount, outstanding dues, or damage claims...",
  "deadlines": ["Any critical procedural deadlines mentioned..."],
  "proceduralEvents": ["Procedural stage or history..."],
  "confidenceScore": 85,
  "uncertainFields": []
}`;

// System prompt for Strategy Generation (27-section detailed report + structural lists)
export const STRATEGY_GENERATION_PROMPT = `You are AI LEGAL – Strategy Engine, a premium, senior litigation strategy advisor.
Your task is to analyze the provided case materials (facts, timeline, evidence, pleadings, or manual facts) and generate a highly customized, professional litigation strategy.
Do not use default or generic strategies. Every detail must adapt dynamically to the inputs provided.

Provide your response STRICTLY as a JSON object matching the following structure. Do not wrap in markdown tags like \`\`\`json.

{
  "readinessScore": 85,
  "litigationStage": "Pre Trial",
  "riskLevel": "Medium",
  "aiSummary": "A concise, high-level summary of the strategy for a quick overview card (2-3 lines).",
  "overview": [
    {
      "key": "summary",
      "title": "Executive Strategy Summary",
      "summary": "Concise summary of overall case position...",
      "analysis": "Detailed analytical breakdown...",
      "score": "Case Strength metric (e.g. 85% Case Strength)",
      "law": "Applicable laws, statutes or provisions...",
      "precedents": "Relevant precedents or citations...",
      "risks": "Litigation risks associated with this item...",
      "action": "Immediate recommended action..."
    },
    {
      "key": "obj",
      "title": "Case Objectives",
      "summary": "...",
      "analysis": "...",
      "score": "Objective alignment metric...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "win_prob",
      "title": "Winning Probability",
      "summary": "...",
      "analysis": "...",
      "score": "Winning probability metric...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "next_action",
      "title": "Immediate Next Action",
      "summary": "...",
      "analysis": "...",
      "score": "Urgency rating (e.g. 95% Urgency)...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "ai_recs",
      "title": "AI Strategic Recommendations",
      "summary": "...",
      "analysis": "...",
      "score": "Effectiveness score (e.g. 88% Effectiveness)...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "top_risks",
      "title": "Top Litigation Risks",
      "summary": "...",
      "analysis": "...",
      "score": "Risk Level...",
      "law": "...",
      "precedents": "...",
      "risks": "List top 3-5 specific risks...",
      "action": "..."
    },
    {
      "key": "missing_docs",
      "title": "Missing Documents Alert",
      "summary": "...",
      "analysis": "...",
      "score": "Impact level (e.g. Critical Impact)...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "strat_score",
      "title": "Litigation Strategy Score",
      "summary": "...",
      "analysis": "...",
      "score": "Score (e.g. 88/100 Readiness)...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    }
  ],
  "opponent": [
    {
      "key": "theory",
      "title": "Likely Defence Theory",
      "summary": "...",
      "analysis": "...",
      "score": "Success probability for opponent...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "strong_args",
      "title": "Opponent Strongest Arguments",
      "summary": "...",
      "analysis": "...",
      "score": "Threat Level...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "weak_args",
      "title": "Opponent Weakest Arguments",
      "summary": "...",
      "analysis": "...",
      "score": "Vulnerability level...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "behavior",
      "title": "Previous Behaviour Pattern",
      "summary": "...",
      "analysis": "...",
      "score": "Settlement Likelihood...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "delay",
      "title": "Expected Delay Tactics",
      "summary": "...",
      "analysis": "...",
      "score": "Likelihood of Delay...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "witnesses",
      "title": "Possible Opponent Witnesses",
      "summary": "...",
      "analysis": "...",
      "score": "Impact level...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "evidence_docs",
      "title": "Possible Documentary Evidence",
      "summary": "...",
      "analysis": "...",
      "score": "Threat level...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "cross_opps",
      "title": "Cross Examination Opportunities",
      "summary": "...",
      "analysis": "...",
      "score": "Success rate...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "counter_strat",
      "title": "Recommended Counter Strategy",
      "summary": "...",
      "analysis": "...",
      "score": "Strength score...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    }
  ],
  "evidence": [
    {
      "key": "strength",
      "title": "Strong Primary Evidence",
      "summary": "...",
      "analysis": "...",
      "score": "Admissibility percentage...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "missing",
      "title": "Missing Evidence",
      "summary": "...",
      "analysis": "...",
      "score": "Impact level...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "priority",
      "title": "Priority Collection",
      "summary": "...",
      "analysis": "...",
      "score": "Urgency rating...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "weak",
      "title": "Weak / Challenged Evidence",
      "summary": "...",
      "analysis": "...",
      "score": "Admissibility rating...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    }
  ],
  "arguments": [
    {
      "key": "opening",
      "title": "Opening Statement",
      "summary": "...",
      "analysis": "...",
      "score": "Readiness percentage...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "primary",
      "title": "Main Legal Arguments",
      "summary": "...",
      "analysis": "...",
      "score": "Strength rating...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "supporting",
      "title": "Supporting Facts",
      "summary": "...",
      "analysis": "...",
      "score": "Compliance rating...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "avoid",
      "title": "Arguments to Avoid",
      "summary": "...",
      "analysis": "...",
      "score": "Avoidance recommendation percentage...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "cross",
      "title": "Cross Questions Checklist",
      "summary": "...",
      "analysis": "...",
      "score": "Effectiveness score...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "prayer",
      "title": "Final Prayer",
      "summary": "...",
      "analysis": "...",
      "score": "Prayer alignment score...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "backup",
      "title": "Emergency Backup Argument",
      "summary": "...",
      "analysis": "...",
      "score": "Strength rating...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    }
  ],
  "risk": [
    {
      "key": "financial",
      "title": "Financial Risk Exposure",
      "summary": "...",
      "analysis": "...",
      "score": "Probability percentage...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "witness",
      "title": "Witness Risks",
      "summary": "...",
      "analysis": "...",
      "score": "Probability percentage...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    },
    {
      "key": "procedural",
      "title": "Procedural Delay Risks",
      "summary": "...",
      "analysis": "...",
      "score": "Probability percentage...",
      "law": "...",
      "precedents": "...",
      "risks": "...",
      "action": "..."
    }
  ],
  "roadmap": [
    {
      "stage": "Legal Demand Notice",
      "status": "COMPLETED",
      "duration": "14 Days",
      "docs": "Copy of legal notice, postal receipts",
      "checklist": "Verify notice dispatched within 30 days of dishonour memo.",
      "filing": "Not Applicable (Pre-litigation stage)"
    },
    {
      "stage": "...",
      "status": "CURRENT",
      "duration": "...",
      "docs": "...",
      "checklist": "...",
      "filing": "..."
    },
    {
      "stage": "...",
      "status": "UPCOMING",
      "duration": "...",
      "docs": "...",
      "checklist": "...",
      "filing": "..."
    }
  ],
  "reportText": "A comprehensive strategy report in Markdown style. It MUST include all 13 of the following headers verbatim, with deep analysis for each, matching the case facts:\\n\\n## Executive Summary\\n[Case overview and dispute summary]\\n\\n## Strength Assessment\\n[Strength Score, Weakness Score, and Probability of Success]\\n\\n## Key Legal Issues\\n[Identify and categorize: Civil Issues, Criminal Issues, Contract Issues, Property Issues, Consumer Issues, and/or Employment Issues]\\n\\n## Applicable Laws\\n[Relevant: Acts, Sections, Rules, Case Laws, and Legal Principles]\\n\\n## Opponent Analysis\\n[Predict: Opponent's arguments, likely defenses, weak points, and counter strategies]\\n\\n## Evidence Analysis\\n[Evidence available, evidence missing, strong evidence, weak evidence, and additional evidence required]\\n\\n## Litigation Strategy\\n[Step-by-step litigation strategy roadmap, e.g. issue legal notice, file recovery suit, seek interim injunction]\\n\\n## Courtroom Strategy\\n[Arguments, opening submissions, cross examination strategy, judge persuasion points, evidence presentation order]\\n\\n## Risk Analysis\\n[High Risk, Medium Risk, Low Risk, Probability of settlement, Probability of appeal, Probability of dismissal]\\n\\n## Settlement Strategy\\n[Advisability of settlement, negotiation approach, and compromise options]\\n\\n## Timeline\\n[Recommended roadmap: Week 1, Week 2, Month 1, Month 3, Final Hearing]\\n\\n## AI Recommendations\\n[Top 10 strategic recommendations]\\n\\n## Confidence Score\\n[Overall AI confidence percentage]"
}`;


// Helper to build case prompt from Project model data
const buildProjectWorkspaceDetailsText = (project) => {
    let details = `CASE NAME: ${project.name}\n`;
    details += `CLIENT: ${project.clientName || 'N/A'} (Email: ${project.clientEmail || 'N/A'}, Phone: ${project.clientMobileNumber || 'N/A'})\n`;
    details += `OPPONENT: ${project.opponentName || 'N/A'}\n`;
    details += `CASE TYPE: ${project.caseType || 'N/A'}\n`;
    details += `STAGE: ${project.stage || 'N/A'}\n`;
    details += `SUMMARY: ${project.summary || project.caseSummary || 'N/A'}\n`;
    details += `RELIEF GOALS: ${project.reliefGoals || 'N/A'}\n\n`;

    if (project.facts && project.facts.length > 0) {
        details += `### Timeline & Key Facts:\n`;
        project.facts.forEach((f, i) => {
            details += `${i + 1}. [${f.date || 'Unknown Date'}] ${f.title}: ${f.description}\n`;
        });
        details += `\n`;
    }

    if (project.evidence && project.evidence.length > 0) {
        details += `### Evidence Vault:\n`;
        project.evidence.forEach((ev, i) => {
            details += `${i + 1}. ${ev.name} (${ev.type}) - ${ev.description} [Status: ${ev.status}]\n`;
        });
        details += `\n`;
    }

    if (project.documents && project.documents.length > 0) {
        details += `### Case Documents & Contracts:\n`;
        project.documents.forEach((d, i) => {
            details += `${i + 1}. [${d.type}] ${d.name}\n`;
        });
        details += `\n`;
    }

    if (project.hearings && project.hearings.length > 0) {
        details += `### Court Hearings:\n`;
        project.hearings.forEach((h, i) => {
            details += `${i + 1}. [${h.date} ${h.time || ''}] ${h.courtName} - purpose: ${h.purpose} [Status: ${h.status}]\n`;
        });
        details += `\n`;
    }

    if (project.research && project.research.length > 0) {
        details += `### Saved Research & Laws:\n`;
        project.research.forEach((r, i) => {
            details += `${i + 1}. ${r.lawName} Section ${r.section} - ${r.description}\n`;
        });
        details += `\n`;
    }

    if (project.intelligence) {
        details += `### Existing AI Analysis:\n`;
        details += `Strength Score: ${project.intelligence.strengthScore || 'N/A'}\n`;
        details += `Win Probability: ${project.intelligence.winProbability || 'N/A'}\n`;
        details += `Risk Level: ${project.intelligence.riskLevel || 'N/A'}\n`;
        details += `Weak Points: ${(project.intelligence.weakPoints || []).join(', ') || 'N/A'}\n`;
        details += `Missing Evidence: ${(project.intelligence.missingEvidence || []).join(', ') || 'N/A'}\n`;
        details += `Opponent Strategies: ${(project.intelligence.opponentStrategies || []).join(', ') || 'N/A'}\n`;
        details += `Strategy Recommendations: ${(project.intelligence.strategyRecommendations || []).join(', ') || 'N/A'}\n\n`;
    }

    if (project.drafts && project.drafts.length > 0) {
        details += `### Case Drafts:\n`;
        project.drafts.slice(0, 3).forEach((d, i) => {
            details += `${i + 1}. ${d.name} (${d.type})\n`;
        });
        details += `\n`;
    }

    return details;
};

// @route   POST /api/strategy-history/ocr
// @desc    Perform OCR and metadata extraction on multiple files
// @access  Private
router.post('/ocr', verifyToken, upload.array('files'), async (req, res) => {
    try {
        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        logger.info(`[StrategyHistory] Extracting OCR data for ${files.length} files`);
        let combinedText = '';

        for (const file of files) {
            const fileText = await extractTextFromBuffer(file.buffer, file.originalname, file.mimetype);
            combinedText += `\n=== DOCUMENT: ${file.originalname} ===\n${fileText}\n`;
        }

        const prompt = `Perform OCR extraction on the following combined documents and extract case metadata fields.\n\n${combinedText}`;
        const rawJson = await askOpenAI(prompt, null, {
            systemInstruction: OCR_SYSTEM_PROMPT,
            jsonMode: true,
            model: 'gpt-4o',
            temperature: 0.1,
            userId: req.user.id
        });

        const parsedData = JSON.parse(rawJson);
        res.json({
            success: true,
            data: parsedData
        });

    } catch (err) {
        logger.error(`[StrategyHistory] OCR extraction failed: ${err.message}`);
        res.status(500).json({ success: false, error: 'OCR processing failed', details: err.message });
    }
});

// @route   POST /api/strategy-history/generate
// @desc    Generate strategy and save/version in database
// @access  Private
router.post('/generate', verifyToken, verifyFeatureAccess('strategy_engine'), creditMiddleware, async (req, res) => {
    try {
        const {
            strategyId, // If editing/adding a version of an existing strategy
            workspaceId,
            caseName,
            manualFacts,
            caseType,
            courtLevel,
            outputLanguage,
            language = 'English',
            uploadedDocuments = [], // Meta information of files already parsed
            ocrData = {}
        } = req.body;

        const targetLang = outputLanguage || language || 'English';

        let compiledContext = '';
        let targetCaseName = caseName || 'Independent Litigation Strategy';
        let linkedWorkspaceId = workspaceId || null;

        // 1. Fetch case workspace if linked
        if (workspaceId) {
            const project = await Project.findOne({ _id: workspaceId, userId: req.user.id });
            if (project) {
                targetCaseName = project.name;
                linkedWorkspaceId = project._id;
                compiledContext += `=== LINKED CASE WORKSPACE DETAILS ===\n${buildProjectWorkspaceDetailsText(project)}\n`;
            }
        }

        // 2. Add manual inputs
        if (manualFacts && manualFacts.trim()) {
            compiledContext += `=== MANUAL FACTS & LEGAL OBJECTIVE ===\n${manualFacts}\n`;
        }
        if (caseType) {
            compiledContext += `Case Type: ${caseType}\n`;
        }
        if (courtLevel) {
            compiledContext += `Court Level: ${courtLevel}\n`;
        }

        // 3. Add OCR parsed document data
        if (ocrData && Object.keys(ocrData).length > 0) {
            compiledContext += `=== UPLOADED PLEADINGS DATA ===\n${JSON.stringify(ocrData, null, 2)}\n`;
        }

        if (!compiledContext.trim()) {
            return res.status(400).json({ success: false, error: 'No facts, pleadings, or case workspaces provided.' });
        }

        // 4. Call LLM to generate strategy JSON
        const prompt = `Prepare a complete, customized litigation strategy in structured JSON. Target Output Language: ${targetLang}.\nCRITICAL MULTILINGUAL MANDATE: All titles, descriptions, recommendations, rebuttals, tactics, risks, and stage names in the returned JSON MUST be strictly translated into ${targetLang}.\n\nCase Context:\n${compiledContext}`;
        const responseJson = await askOpenAI(prompt, null, {
            systemInstruction: STRATEGY_GENERATION_PROMPT,
            jsonMode: true,
            model: 'gpt-4o',
            language: targetLang,
            temperature: 0.3,
            max_tokens: 16384,
            userId: req.user.id
        });

        const generatedStrategy = JSON.parse(responseJson);

        // 5. Save or version in Database
        let strategyDoc;
        let newVersionNumber = 1;

        if (strategyId) {
            // Find existing strategy
            strategyDoc = await StrategyHistory.findOne({ _id: strategyId, userId: req.user.id });
            if (!strategyDoc) {
                return res.status(404).json({ success: false, error: 'Strategy not found to add version.' });
            }
            newVersionNumber = strategyDoc.versions.length + 1;
        } else if (linkedWorkspaceId) {
            // Check if there is already a strategy history for this workspace
            strategyDoc = await StrategyHistory.findOne({ workspaceId: linkedWorkspaceId, userId: req.user.id });
            if (strategyDoc) {
                newVersionNumber = strategyDoc.versions.length + 1;
            }
        }

        const newVersion = {
            version: newVersionNumber,
            uploadedDocuments,
            ocrData,
            manualFacts,
            caseType,
            courtLevel,
            language,
            generatedStrategy,
            aiSummary: generatedStrategy.aiSummary || '',
            riskAnalysis: {
                riskLevel: generatedStrategy.riskLevel || 'Medium',
                risks: generatedStrategy.risk || []
            }
        };

        if (strategyDoc) {
            // Add new version
            strategyDoc.versions.push(newVersion);
            strategyDoc.activeVersionIndex = strategyDoc.versions.length - 1;
            strategyDoc.caseName = targetCaseName;
            strategyDoc.updatedAt = new Date();
            await strategyDoc.save();
        } else {
            // Create a brand new strategy document
            strategyDoc = new StrategyHistory({
                userId: req.user._id || req.user.id,
                workspaceId: linkedWorkspaceId,
                caseName: targetCaseName,
                versions: [newVersion],
                activeVersionIndex: 0
            });
            await strategyDoc.save();
        }

        // --- SYNC TO LINKED CASE WORKSPACE (Project) ---
        if (linkedWorkspaceId) {
            try {
                const project = await Project.findOne({ _id: linkedWorkspaceId, userId: req.user.id });
                if (project) {
                    // 1. Save strategy report and recommendations
                    project.strategy = generatedStrategy;

                    // Set riskLevel in project.intelligence
                    if (!project.intelligence) {
                        project.intelligence = { strengthScore: 0, winProbability: 0, riskLevel: 'Medium' };
                    }
                    project.intelligence.riskLevel = generatedStrategy.riskLevel || 'Medium';

                    // Sync strategyRecommendations from overview
                    const aiRecs = generatedStrategy.overview?.find(o => o.key === 'ai_recs');
                    if (aiRecs && aiRecs.action) {
                        project.intelligence.strategyRecommendations = [aiRecs.action];
                    }

                    // 2. Add Strategy Report to drafts as a complete Generated Document
                    if (!project.drafts) {
                        project.drafts = [];
                    }
                    project.drafts.push({
                        name: `Litigation Strategy Report v${newVersionNumber}`,
                        type: 'Strategy Report',
                        content: generatedStrategy.reportText || '',
                        status: 'Completed',
                        createdBy: 'AI Strategy Engine',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    // 3. Add to notes
                    if (!project.notes) {
                        project.notes = [];
                    }
                    project.notes.push({
                        title: `AI Strategy Summary (v${newVersionNumber})`,
                        content: generatedStrategy.aiSummary || 'Litigation roadmap and details compiled successfully.',
                        category: 'AI Analysis',
                        author: 'AI Strategy Engine',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    // 4. Sync files/uploaded documents
                    if (uploadedDocuments && uploadedDocuments.length > 0) {
                        if (!project.documents) {
                            project.documents = [];
                        }
                        uploadedDocuments.forEach(doc => {
                            const exists = project.documents.some(d => d.name === doc.name);
                            if (!exists) {
                                project.documents.push({
                                    name: doc.name,
                                    type: 'Filing',
                                    url: doc.uri || doc.url || '',
                                    uploadDate: new Date()
                                });
                            }
                        });
                    }

                    await project.save();
                    logger.info(`[StrategyHistory] Successfully synced strategy details back to Project case: ${linkedWorkspaceId}`);
                }
            } catch (syncErr) {
                logger.warn(`[StrategyHistory] Failed to sync strategy details back to Project case: ${syncErr.message}`);
            }
        }

        // Deduct credits if requested
        if (req.creditMeta && req.creditMeta.cost > 0) {
            const { subscriptionService } = await import('../services/subscriptionService.js');
            await subscriptionService.deductCreditsFromMeta(req.creditMeta);
        }

        if (req.commitUsage) await req.commitUsage();
        const FeatureAccessManager = await import('../services/featureAccessManager.js');
        const latestUsageStatus = await FeatureAccessManager.getUsageStatus(req.user.id);

        res.json({
            success: true,
            message: 'Strategy generated and stored successfully',
            data: {
                strategy: strategyDoc,
                activeVersion: newVersion
            },
            usageStatus: latestUsageStatus
        });

    } catch (err) {
        logger.error(`[StrategyHistory] Generation error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to generate litigation strategy', details: err.message });
    }
});

// @route   GET /api/strategy-history
// @desc    Get user's strategy history list (paginated & filtered)
// @access  Private
router.get('/', verifyToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', filter = 'All' } = req.query;
        const query = { userId: req.user.id };

        // Search logic
        if (search) {
            query.$or = [
                { caseName: { $regex: search, $options: 'i' } },
                { 'versions.aiSummary': { $regex: search, $options: 'i' } },
                { 'versions.caseType': { $regex: search, $options: 'i' } }
            ];
        }

        // Filters logic
        const now = new Date();
        if (filter === 'Today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            query.updatedAt = { $gte: startOfDay };
        } else if (filter === 'This Week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            query.updatedAt = { $gte: startOfWeek };
        } else if (filter === 'This Month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            query.updatedAt = { $gte: startOfMonth };
        } else if (filter === 'Workspace') {
            query.workspaceId = { $ne: null };
        } else if (filter === 'Manual Entry') {
            query['versions.manualFacts'] = { $ne: '' };
            query['versions.uploadedDocuments'] = { $size: 0 };
        } else if (filter === 'Uploaded Documents') {
            query['versions.uploadedDocuments.0'] = { $exists: true };
        } else if (filter === 'High Risk') {
            query.versions = {
                $elemMatch: {
                    'generatedStrategy.riskLevel': { $in: ['High', 'Critical'] }
                }
            };
        } else if (filter === 'Low Risk') {
            query.versions = {
                $elemMatch: {
                    'generatedStrategy.riskLevel': 'Low'
                }
            };
        }

        const skip = (page - 1) * limit;
        const total = await StrategyHistory.countDocuments(query);
        const strategies = await StrategyHistory.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.json({
            success: true,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            data: strategies
        });

    } catch (err) {
        logger.error(`[StrategyHistory] Fetch error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to fetch strategy history' });
    }
});

// @route   GET /api/strategy-history/:id
// @desc    Get details of a single strategy
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const strategy = await StrategyHistory.findOne({ _id: req.params.id, userId: req.user.id });
        if (!strategy) {
            return res.status(404).json({ success: false, error: 'Strategy not found' });
        }
        res.json({ success: true, data: strategy });
    } catch (err) {
        logger.error(`[StrategyHistory] Fetch detail error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to fetch strategy details' });
    }
});

// @route   PUT /api/strategy-history/:id
// @desc    Update a strategy metadata (name, notes, tags, activeVersionIndex)
// @access  Private
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { caseName, notes, tags, activeVersionIndex } = req.body;
        const strategy = await StrategyHistory.findOne({ _id: req.params.id, userId: req.user.id });

        if (!strategy) {
            return res.status(404).json({ success: false, error: 'Strategy not found' });
        }

        if (caseName) strategy.caseName = caseName;
        if (notes !== undefined) strategy.notes = notes;
        if (tags !== undefined) strategy.tags = tags;
        if (activeVersionIndex !== undefined && activeVersionIndex >= 0 && activeVersionIndex < strategy.versions.length) {
            strategy.activeVersionIndex = activeVersionIndex;
        }

        await strategy.save();

        // --- SYNC TO LINKED CASE WORKSPACE (Project) ---
        if (strategy.workspaceId) {
            try {
                const project = await Project.findOne({ _id: strategy.workspaceId, userId: req.user.id });
                if (project) {
                    if (caseName) project.name = caseName;
                    if (notes !== undefined) {
                        if (!project.notes) {
                            project.notes = [];
                        }
                        project.notes.push({
                            title: `Strategy Note Update`,
                            content: notes,
                            category: 'AI Analysis',
                            author: 'AI Strategy Engine',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                    await project.save();
                    logger.info(`[StrategyHistory] Successfully synced PUT metadata updates back to Project case: ${strategy.workspaceId}`);
                }
            } catch (syncErr) {
                logger.warn(`[StrategyHistory] Failed to sync PUT metadata updates back to Project case: ${syncErr.message}`);
            }
        }

        res.json({ success: true, message: 'Strategy updated successfully', data: strategy });
    } catch (err) {
        logger.error(`[StrategyHistory] Update error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to update strategy metadata' });
    }
});

// @route   DELETE /api/strategy-history/:id
// @desc    Delete a strategy permanently
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await StrategyHistory.deleteOne({ _id: req.params.id, userId: req.user.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Strategy not found or unauthorized' });
        }
        res.json({ success: true, message: 'Strategy deleted permanently' });
    } catch (err) {
        logger.error(`[StrategyHistory] Delete error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to delete strategy' });
    }
});

// @route   POST /api/strategy-history/:id/duplicate
// @desc    Duplicate a strategy as a new document
// @access  Private
router.post('/:id/duplicate', verifyToken, async (req, res) => {
    try {
        const original = await StrategyHistory.findOne({ _id: req.params.id, userId: req.user.id });
        if (!original) {
            return res.status(404).json({ success: false, error: 'Strategy not found to duplicate' });
        }

        const activeVer = original.versions[original.activeVersionIndex];
        
        // Copy active version as the sole version (v1) of the new duplicated strategy
        const newStrategy = new StrategyHistory({
            userId: req.user.id,
            workspaceId: original.workspaceId,
            caseName: `${original.caseName} (Copy)`,
            notes: original.notes,
            tags: original.tags,
            versions: [{
                version: 1,
                uploadedDocuments: activeVer.uploadedDocuments,
                ocrData: activeVer.ocrData,
                manualFacts: activeVer.manualFacts,
                caseType: activeVer.caseType,
                courtLevel: activeVer.courtLevel,
                language: activeVer.language,
                generatedStrategy: activeVer.generatedStrategy,
                aiSummary: activeVer.aiSummary,
                riskAnalysis: activeVer.riskAnalysis
            }],
            activeVersionIndex: 0
        });

        await newStrategy.save();
        res.json({ success: true, message: 'Strategy duplicated successfully', data: newStrategy });

    } catch (err) {
        logger.error(`[StrategyHistory] Duplication error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to duplicate strategy' });
    }
});

export default router;
