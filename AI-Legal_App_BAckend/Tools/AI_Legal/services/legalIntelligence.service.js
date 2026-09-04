import * as vertexService from '../../../services/vertex.service.js';
import logger from '../../../utils/logger.js';
import { safeParseLLMJson } from '../../../utils/jsonUtils.js';

/**
 * generateUnifiedCaseIntelligence
 * Reads user case summary and generates a single structured Case Intelligence JSON object.
 */
export const generateUnifiedCaseIntelligence = async (rawText, currentData = {}, language = 'English') => {
    const store = vertexService.langStorage?.getStore();
    const activeLang = (language && language !== 'English') 
        ? language 
        : ((store && typeof store === 'object' ? store.language : store) || language || 'English');

    const globalLangInstruction = vertexService.getGlobalLanguageInstruction(activeLang);

    const prompt = [
        'You are an elite autonomous Legal Intelligence Engine.',
        'Your job is to read a legal case summary and generate ONE structured Case Intelligence JSON object that will power an entire legal case management system.',
        '',
        '-------------------------------------',
        '⚠️ CRITICAL RULES (MUST FOLLOW STRICTLY):',
        '1. Output ONLY valid JSON.',
        '2. Do NOT return any markdown formatting, backticks, or explanation outside the JSON.',
        '3. Do NOT invent fake or placeholder parties, contracts, or facts not implied by the input summary.',
        '4. Every section MUST be derived exclusively from the actual Case Summary entered by the user.',
        '5. ZERO SCORE RULE: If the case summary is unclear, gibberish, incomplete, or lacks factual details, set winProbability to 0 and caseStrength to 0, risks.level to "Critical", and return empty arrays for arguments and counterArguments.',
        '-------------------------------------',
        '',
        'INPUT CASE SUMMARY:',
        `Case Name/Title: ${currentData.name || 'Legal Case'}`,
        `Case Summary / Facts: ${rawText}`,
        `Client Name: ${currentData.clientName || 'Client'}`,
        `Opponent Name: ${currentData.opponentName || currentData.accused || 'Opponent'}`,
        `Case Type: ${currentData.caseType || 'General Litigation'}`,
        '-------------------------------------',
        '',
        'OUTPUT JSON FORMAT (STRICT):',
        JSON.stringify({
            parties: {
                plaintiff: { name: "Client Name", role: "Petitioner/Plaintiff" },
                defendant: { name: "Opponent Name", role: "Respondent/Defendant" },
                others: []
            },
            caseType: "Civil Case / Criminal Case / Commercial Dispute / ...",
            facts: [
                "Fact 1 derived from summary",
                "Fact 2 derived from summary"
            ],
            timeline: [
                {
                    title: "Event Title",
                    description: "Details",
                    date: "YYYY-MM-DD",
                    displayDate: "Human readable date",
                    category: "Agreement/Contract/Payment/Notice/Default/Court/...",
                    importance: "High/Medium/Low"
                }
            ],
            events: [
                { title: "Key Event", date: "YYYY-MM-DD", impact: "High/Medium/Low" }
            ],
            issues: [
                "Legal Issue 1 regarding breach or liability",
                "Legal Issue 2 regarding limitation or evidence"
            ],
            evidence: [
                { title: "Evidence item name", type: "Document/Financial/Witness", description: "Relevance", strength: "Strong/Medium/Weak" }
            ],
            missingEvidence: [
                "Missing proof item 1 needed for court",
                "Missing proof item 2 needed for claim"
            ],
            documents: [
                { name: "Document name needed or identified", type: "Notice/Agreement/Affidavit", status: "Uploaded/Pending" }
            ],
            legalSections: [
                { law: "Act Name", section: "Section Number", description: "Relevance to case" }
            ],
            arguments: [
                {
                    id: "arg_1",
                    title: "Winning Petitioner Argument Title",
                    description: "Detailed argument reasoning derived from facts",
                    supportingEvidence: ["Evidence title"],
                    supportingLaws: ["Section & Law name"],
                    supportingTimelineEvents: ["Event date/title"],
                    impact: "High/Critical",
                    category: "Contract Law/Financial Liability/..."
                }
            ],
            counterArguments: [
                {
                    id: "carg_1",
                    title: "Opponent Counter Argument / Defense Title",
                    description: "Possible defense claim by opponent",
                    refutation: "Our strategic rebuttal to defeat this counter argument",
                    impact: "High/Medium",
                    category: "Procedure/Defense"
                }
            ],
            strategy: {
                trialSequence: [
                    { step: 1, title: "Initial Court Step", detail: "Strategic action", status: "Primary/Crucial" }
                ],
                avoidList: ["Weak strategy or trap to avoid"],
                judicialConcerns: ["Potential concern or question the Judge may raise"],
                closingSubmission: "Summary statement for final arguments"
            },
            risks: {
                level: "Low/Medium/High/Critical",
                reason: "Summary of overall legal risks",
                criticalVulnerabilities: ["Vulnerability 1", "Vulnerability 2"]
            },
            winProbability: 75,
            caseStrength: 80,
            tasks: [
                { title: "Action item 1", priority: "High/Medium/Low", deadline: "YYYY-MM-DD or timeframe", status: "Pending" }
            ],
            hearings: [
                { title: "Proposed Next Hearing / Proceeding", date: "YYYY-MM-DD", courtroom: "Courtroom No.", purpose: "Purpose", status: "Scheduled" }
            ],
            recommendations: [
                "Immediate recommended next step 1",
                "Immediate recommended next step 2"
            ],
            aiAssistant: {
                litigationStatus: "Consultation/Pre-Litigation/Legal Notice/Negotiation/Suit Filed/Written Statement/Pleadings/Issues Framed/Evidence Stage/Cross Examination/Final Arguments/Judgment Reserved/Judgment Delivered/Appeal/Execution/Unable to determine litigation stage.",
                latestAdvice: "Single highest-priority legal recommendation based on actual case summary/facts",
                recommendedAction: "Immediate next legal action (e.g. Draft legal notice / File reply / Upload original agreement)",
                evidenceAlerts: "Summary of missing/weak evidence or 'No critical evidence issues detected.'",
                nextDeadline: "Calculated next deadline or 'No pending procedural deadlines.'",
                confidence: 80,
                missingInformation: ["List of missing facts or documents required for full analysis"]
            },
            deadlines: [
                { title: "Limitation / Filing Deadline", description: "Explanation of deadline", date: "YYYY-MM-DD" }
            ]
        }, null, 2),
        '',
        `🌐 LANGUAGE INSTRUCTION:\n${globalLangInstruction}\n-------------------------------------`,
        'FINAL INSTRUCTION: Return ONLY JSON.'
    ].join('\n');

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 8192,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-flash',
            language: activeLang,
            isJson: true
        });

        const fallback = {
            parties: { plaintiff: { name: currentData.clientName || "Plaintiff", role: "Plaintiff" }, defendant: { name: currentData.opponentName || "Defendant", role: "Defendant" }, others: [] },
            caseType: currentData.caseType || "Legal Case",
            facts: [rawText],
            timeline: [{ title: "Case Overview Logged", description: rawText, date: new Date().toISOString().split('T')[0], displayDate: "Today", category: "Other", importance: "High" }],
            events: [{ title: "Case Created", date: new Date().toISOString().split('T')[0], impact: "High" }],
            issues: ["Verification of facts provided."],
            evidence: [],
            missingEvidence: [],
            documents: [],
            legalSections: [],
            arguments: [{ id: "arg_1", title: "Claim for Relief based on Facts", description: rawText, supportingEvidence: [], supportingLaws: [], supportingTimelineEvents: [], impact: "High", category: "General" }],
            counterArguments: [],
            strategy: { trialSequence: [{ step: 1, title: "Establish Primary Claims", detail: "Present submitted facts before court.", status: "Primary" }], avoidList: [], judicialConcerns: [], closingSubmission: "Pray for relief as stated in petition." },
            risks: { level: "Medium", reason: "Initial evaluation based on summary.", criticalVulnerabilities: [] },
            winProbability: 50,
            caseStrength: 50,
            tasks: [{ title: "Review case documents and verify evidence", priority: "High", deadline: "Within 7 days", status: "Pending" }],
            hearings: [],
            recommendations: ["Compile all physical evidence and verify witness statements."],
            deadlines: []
        };

        return safeParseLLMJson(response, fallback);
    } catch (error) {
        logger.error(`[LegalIntelligence] generateUnifiedCaseIntelligence failed: ${error.message}`);
        return {
            parties: { plaintiff: { name: currentData.clientName || "Plaintiff", role: "Plaintiff" }, defendant: { name: currentData.opponentName || "Defendant", role: "Defendant" }, others: [] },
            caseType: currentData.caseType || "Legal Case",
            facts: [rawText],
            timeline: [],
            events: [],
            issues: [],
            evidence: [],
            missingEvidence: [],
            documents: [],
            legalSections: [],
            arguments: [],
            counterArguments: [],
            strategy: { trialSequence: [], avoidList: [], judicialConcerns: [], closingSubmission: "" },
            risks: { level: "High", reason: "AI generation request encountered an error.", criticalVulnerabilities: [error.message] },
            winProbability: 0,
            caseStrength: 0,
            tasks: [],
            hearings: [],
            recommendations: [],
            deadlines: []
        };
    }
};

/**
 * analyzeCaseDetails
 * Legacy wrapper calling generateUnifiedCaseIntelligence for backward compatibility.
 */
export const analyzeCaseDetails = async (rawText, currentData = {}, language = 'English') => {
    const unified = await generateUnifiedCaseIntelligence(rawText, currentData, language);
    return {
        executive_summary: unified.facts ? unified.facts.join('. ') : rawText,
        case_strength: unified.caseStrength || 50,
        win_probability: unified.winProbability || 50,
        timeline: unified.timeline || [],
        limitation_warnings: unified.deadlines || [],
        upcoming_deadlines: unified.deadlines || [],
        missing_documents: (unified.missingEvidence || []).map(m => typeof m === 'string' ? { title: m, description: m } : m),
        parties: unified.parties || {},
        evidence: unified.evidence || [],
        legal_research: (unified.legalSections || []).map(l => ({ law: l.law, section: l.section, description: l.description })),
        process_steps: (unified.tasks || []).map(t => ({ step: t.title, priority: t.priority })),
        risk_assessment: unified.risks || { level: "Medium", reason: "" },
        critical_vulnerabilities: unified.risks?.criticalVulnerabilities || [],
        opponent_strategy: (unified.counterArguments || []).map(c => c.title),
        primary_relief: unified.issues ? unified.issues.join('; ') : "Legal Relief",
        strategy_recommendation: unified.recommendations || []
    };
};

/**
 * analyzeDocumentContent
 * Extracts structured data from a specific document.
 */
export const analyzeDocumentContent = async (content, fileName) => {
    const prompt = [
        'Analyze the following legal document and extract key information.',
        `File: ${fileName}`,
        '',
        'Content:',
        content,
        '',
        'Return ONLY this JSON structure:',
        JSON.stringify({
            docType: "Notice",
            tags: ["tag1", "tag2"],
            summary: "Short summary of the document",
            keyClauses: [{ title: "Clause Name", description: "Why it matters" }]
        }, null, 2)
    ].join('\n');

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 1024,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-flash',
            isJson: true
        });

        return safeParseLLMJson(response);
    } catch (error) {
        logger.error(`[LegalIntelligence] Document analysis failed: ${error.message}`);
        logger.error(`[LegalIntelligence] Stack trace: ${error.stack}`);
        return null;
    }
};

/**
 * enrichHearingDetails
 * Analyzes hearing notes or court order texts and extracts/generates structured data.
 */
export const enrichHearingDetails = async (notes, documentText, documentName, language = 'English') => {
    let languageInstruction = '';
    if (language === 'Hindi') {
        languageInstruction = 'Please generate all notes, purpose, title, orderSummary, and checklist item text values in Hindi. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers. Keep them in their original form.';
    } else if (language === 'Bilingual') {
        languageInstruction = 'Please generate all notes, purpose, title, orderSummary, and checklist item text values in Bilingual style (English + Hindi). Use English for structural titles/terms, and Hindi for descriptions/explanations. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers.';
    } else if (language === 'Gujarati') {
        languageInstruction = 'Please generate all notes, purpose, title, orderSummary, and checklist item text values in Gujarati. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers.';
    } else if (language === 'Marathi') {
        languageInstruction = 'Please generate all notes, purpose, title, orderSummary, and checklist item text values in Marathi. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers.';
    } else if (language === 'Tamil') {
        languageInstruction = 'Please generate all notes, purpose, title, orderSummary, and checklist item text values in Tamil. Do NOT translate client names, case numbers, evidence names, file names, phone numbers, emails, and legal section numbers.';
    }

    const prompt = [
        'You are an advanced autonomous Legal Intelligence Engine.',
        'Your job is to analyze case hearing notes or a court order text, and extract structured legal hearing info.',
        '',
        '-------------------------------------',
        'INPUT CASE DETAIL:',
        notes ? `Advocate Notes: ${notes}` : '',
        documentText ? `Order Document Content: ${documentText}` : '',
        documentName ? `Document File Name: ${documentName}` : '',
        '-------------------------------------',
        '',
        '⚠️ CRITICAL RULES (MUST FOLLOW):',
        '1. Output ONLY valid JSON.',
        '2. Do NOT return any markdown formatting or text outside the JSON.',
        '3. Extract or intelligently infer the following structured fields.',
        '4. Extract or infer checklist items for Preparation (documents, evidence, witnesses, compliance). Each checklist item MUST have a title and a checked boolean (default false). For compliance items, set status to "Pending".',
        '5. If a next hearing date or compliance deadline is detected, return it in YYYY-MM-DD or standard display format.',
        '6. Keep summaries concise and professional.',
        '',
        'OUTPUT FORMAT (STRICT):',
        JSON.stringify({
            courtName: "Extracted Court Name",
            judge: "Extracted Judge Name",
            hearingDate: "YYYY-MM-DD or date string",
            nextHearingDate: "YYYY-MM-DD or date string",
            courtroom: "Extracted Courtroom/Room Number",
            title: "Descriptive hearing title",
            purpose: "Purpose of this hearing",
            notes: "Refined/cleaned advocate notes or summary",
            orderSummary: "AI summary of orders passed (e.g. Interim injunction granted. Defendant ordered to file Written Statement within 30 days.)",
            isAiEnriched: true,
            checklist: {
                documents: [{ title: "Original Agreement", checked: false }],
                evidence: [{ title: "Proof of Payment", checked: false }],
                witnesses: [{ title: "Plaintiff Witness 1", checked: false }],
                compliance: [
                    { title: "Written Statement", checked: false, status: "Pending" },
                    { title: "Affidavit Submission", checked: false, status: "Pending" }
                ]
            }
        }, null, 2),
        '',
        '-------------------------------------',
        languageInstruction ? `🌐 LANGUAGE INSTRUCTION:\n${languageInstruction}\n-------------------------------------` : '',
        'FINAL INSTRUCTION:',
        'Return ONLY JSON.'
    ].join('\n');

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 8192,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-flash',
            isJson: true
        });

        const fallback = {
            courtName: "",
            judge: "",
            hearingDate: "",
            nextHearingDate: "",
            courtroom: "",
            title: "Enriched Court Hearing",
            purpose: "Court Proceeding",
            notes: notes || "AI analysis completed.",
            orderSummary: "Summary could not be parsed from document content.",
            isAiEnriched: true,
            checklist: {
                documents: [],
                evidence: [],
                witnesses: [],
                compliance: []
            }
        };

        return safeParseLLMJson(response, fallback);
    } catch (error) {
        logger.error(`[LegalIntelligence] enrichHearingDetails failed: ${error.message}`);
        return null;
    }
};

/**
 * generateCompleteCaseAnalysis
 * Exhaustive case intelligence analysis generating the Step 3 report sections.
 */
export const generateCompleteCaseAnalysis = async (project, readinessScore = 100, language = 'English') => {
    const store = vertexService.langStorage?.getStore();
    const activeLang = (language && language !== 'English') 
        ? language 
        : ((store && typeof store === 'object' ? store.language : store) || language || 'English');

    const globalLangInstruction = vertexService.getGlobalLanguageInstruction(activeLang);

    const caseTimeline = (project.facts || []).map(f => `${f.date || f.displayDate || 'N/A'}: ${f.title || ''} - ${f.description || ''}`).join('\n');
    const caseHearings = (project.hearings || []).map(h => `${h.date || ''} ${h.time || ''}: ${h.title || ''} (Court: ${h.courtName || ''}, Judge: ${h.judge || ''}, Room: ${h.courtroom || ''}). Notes: ${h.notes || ''}. Enriched: ${h.orderSummary || ''}`).join('\n');
    const caseEvidence = (project.evidence || []).map(e => `${e.exhibitNumber || 'Exhibit'}: ${e.name || ''} (Type: ${e.type || ''}, Status: ${e.status || ''}). Desc: ${e.description || ''}. Notes: ${e.notes || ''}`).join('\n');
    const caseDocuments = (project.documents || []).map(d => `${d.name || ''} (Type: ${d.type || ''})`).join('\n');
    const caseResearch = (project.research || []).map(r => `${r.lawName || ''} Sec ${r.section || ''}: ${r.description || ''}`).join('\n');
    const caseTasks = (project.tasks || []).map(t => `${t.title || ''} (Status: ${t.status || ''}, Priority: ${t.priority || ''}, Deadline: ${t.deadline || ''})`).join('\n');
    const caseNotes = (project.notes || []).map(n => `Title: ${n.title || ''}\nContent: ${n.content || ''}\nSummary: ${n.aiSummary?.shortSummary || ''}`).join('\n---\n');
    const courtOrders = (project.courtOrders || []).map(o => `${o.name || ''} (${o.metadata?.orderType || ''}): Summary: ${o.aiSummary?.shortSummary || ''}. Compliance: ${(o.complianceItems || []).map(c => (c.description || '') + ' [' + (c.status || '') + ']').join(', ')}`).join('\n');

    const contextText = [
        `Case Name: ${project.name || 'Unknown'}`,
        `Client Name: ${project.clientName || 'Unknown'}`,
        `Opponent Name: ${project.opponentName || project.accused || 'Unknown'}`,
        `Case Type: ${project.caseType || 'Unknown'}`,
        `Current Stage: ${project.stage || 'Unknown'}`,
        `Priority: ${project.priority || 'Medium'}`,
        `Executive Summary: ${project.summary || project.caseSummary || ''}`,
        `Primary Relief: ${project.reliefGoals || ''}`,
        `Jurisdiction: ${project.courtName || ''}`,
        `Limitation Warnings: ${JSON.stringify(project.limitationWarnings || [])}`,
        `Upcoming Deadlines: ${JSON.stringify(project.upcomingDeadlines || [])}`,
        `Missing Documents: ${JSON.stringify(project.missingDocuments || [])}`,
        `Legal Issues: ${JSON.stringify(project.legalIssues || [])}`,
        `Saved Precedents: ${JSON.stringify(project.savedPrecedents || [])}`,
        '',
        '--- CASE TIMELINE / FACTS ---',
        caseTimeline || 'No timeline facts logged.',
        '',
        '--- HEARINGS ---',
        caseHearings || 'No hearings scheduled.',
        '',
        '--- EVIDENCE VAULT ---',
        caseEvidence || 'No evidence items logged.',
        '',
        '--- UPLOADED DOCUMENTS ---',
        caseDocuments || 'No case documents uploaded.',
        '',
        '--- LEGAL RESEARCH ---',
        caseResearch || 'No research items logged.',
        '',
        '--- TASKS & ASSIGNMENTS ---',
        caseTasks || 'No tasks assigned.',
        '',
        '--- CASE STRATEGIC NOTES ---',
        caseNotes || 'No notes created.',
        '',
        '--- COURT ORDERS & DECREES ---',
        courtOrders || 'No court orders logged.'
    ].join('\n');

    const prompt = [
        'You are an elite AI Co-Counsel and Lead Legal Strategist operating inside a Zero-Hallucination Architecture.',
        'Your task is to perform an exhaustive, complete AI case analysis on the following Case Workspace context.',
        'CRITICAL RULE: DO NOT INVENT or assume any facts, dates, files, timeline events, evidence, court orders, hearings, parties, or recommendations that are not explicitly present in the Case Workspace context.',
        'If information is not available, you MUST output "Information Not Available" or "Not Available" for that field/value, or return an empty array if it is a list of missing information.',
        '',
        'CASE CONTEXT:',
        contextText,
        '',
        '-------------------------------------',
        `READINESS INDICATORS:`,
        `Readiness Score: ${readinessScore}%`,
        '',
        '-------------------------------------',
        '⚠️ ZERO HALLUCINATION RULES (STRICTLY ENFORCED):',
        '1. NO FABRICATIONS: You are strictly forbidden from inventing details, dates, evidence, hearings, laws, or precedents.',
        '2. CITATIONS REQUIRED: Every list item in your output arrays MUST end with a source citation in the format "(Source: <Field Name>)", where <Field Name> is the workspace field supplying the fact.',
        '   For example: "Defendant failed to reply to legal notice on 12 Jan 2026 (Source: Timeline)".',
        '   Valid Field Names are: "Case Summary", "Timeline", "Evidence", "Hearings", "Court Orders", "Legal Research", "Notes".',
        '   If you are referencing multiple fields, combine them: "(Source: Timeline, Evidence)".',
        '   If NO workspace data supports an item, DO NOT generate it. Do not guess.',
        '3. PRECEDENTS & LAW CONSTRAINT:',
        '   - If Case Type, Jurisdiction, or Legal Issue are missing or empty in the Case Context, you MUST bypass landmark precedents citation entirely.',
        '   - Under this constraint, set "supremeCourtJudgments", "highCourtJudgments", and "importantPrecedents" to empty arrays [], or write "Information Not Available". Do NOT invent generic precedents.',
        '4. WIN PROBABILITY CONSTRAINT:',
        `   - If the Readiness Score is low (below 50%), you are FORBIDDEN from calculating a win probability. You MUST set the "winProbability" key to the exact string "Unavailable".`,
        '5. NOT AVAILABLE FALLBACK: If information is unavailable for any string fields, set the value to "Information Not Available". For array fields, if no items are supported by the workspace context, return an empty array [].',
        '',
        '-------------------------------------',
        '⚠️ STAGE 3 - AI OUTPUT SECTIONS REQUIREMENT:',
        'Generate a highly comprehensive, professional legal report matching these exact keys in valid JSON format:',
        '- strengthScore: Number (0-100, case strength score based on timeline facts, evidence quality, laws)',
        '- winProbability: Number (0-100) or String ("Unavailable") (Note: Set to "Unavailable" if readiness score is under 50%)',
        '- caseSummary: String (detailed executive case summary, facts background, legal context. If missing, "Information Not Available")',
        '- majorLegalIssues: Array of strings (main legal questions to be decided. Must cite source.)',
        '- applicableLaws: Array of strings (e.g. "Negotiable Instruments Act, 1881 (Source: Legal Research)")',
        '- applicableSections: Array of strings (specific sections e.g. "Section 138 (Source: Legal Research)")',
        '- supremeCourtJudgments: Array of strings (landmark Supreme Court judgments relevant to this case. Cite source. Leave empty if jurisdiction/caseType/legalIssue is missing)',
        '- highCourtJudgments: Array of strings (relevant High Court rulings. Cite source. Leave empty if jurisdiction/caseType/legalIssue is missing)',
        '- importantPrecedents: Array of strings (key legal precedents to cite in arguments. Cite source. Leave empty if jurisdiction/caseType/legalIssue is missing)',
        '- evidenceStrength: String ("Strong", "Medium", "Weak")',
        '- missingEvidence: Array of strings (specific proof items needed but not in vault. Cite source.)',
        '- weaknesses: Array of strings (risks, procedural gaps, loopholes in our case. Cite source.)',
        '- contradictions: Array of strings (inconsistent statements, timeline mismatch. Cite source.)',
        '- missingDocuments: Array of strings (official filings, certificates or contracts needed. Cite source.)',
        '- pendingHearings: Array of strings (summary of upcoming hearings and action steps. Cite source.)',
        '- pendingTasks: Array of strings (priority checklist to execute. Cite source.)',
        '- riskAssessment: String ("Low", "Medium", "High", "Critical")',
        '- recommendedNextSteps: Array of strings (immediate action plan. Cite source.)',
        '- litigationStrategy: String (complete step-by-step trial/court strategy based only on context. If unavailable, "Information Not Available")',
        '- settlementPossibility: String (feasibility of out-of-court settlement, suggested terms based on context. If unavailable, "Information Not Available")',
        '- questionsToAskClient: Array of strings (critical questions to ask the client to clarify gaps. Cite source.)',
        '- draftRecommendations: Array of strings (documents/contracts/replies to compile next. Cite source.)',
        '- argumentsToUse: Array of strings (winning arguments to advance in pleadings. Cite source.)',
        '- argumentsToAvoid: Array of strings (weak arguments to avoid raising. Cite source.)',
        '- timelineIssues: Array of strings (date calculations, delays, limitation risks. Cite source.)',
        '- limitationRisks: Array of strings (expiration timelines, latches, bar by limitation. Cite source.)',
        '- complianceChecklist: Array of strings (procedural court rules compliance items. Cite source.)',
        '- judgePreparation: String (advice on how to present before the bench based on context. If unavailable, "Information Not Available")',
        '- crossExaminationNotes: String (key pointers/questions for cross-examining opponent witnesses. If unavailable, "Information Not Available")',
        '',
        '-------------------------------------',
        '⚠️ CRITICAL RULES (MUST FOLLOW):',
        '1. Output ONLY valid JSON matching this exact structure.',
        '2. Do NOT return any markdown formatting, backticks, or explanation outside the JSON.',
        '3. Do NOT invent information. If details are missing, return empty arrays or "Information Not Available".',
        '4. Every string inside an array/list MUST include the source citation "(Source: <Field Name>)" referencing one or more of: "Case Summary", "Timeline", "Evidence", "Hearings", "Court Orders", "Legal Research", "Notes".',
        '-------------------------------------',
        `🌐 LANGUAGE INSTRUCTION:\n${globalLangInstruction}\n-------------------------------------`,
        'FINAL INSTRUCTION: Return ONLY JSON.'
    ].join('\n');

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 8192,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-pro',
            language: activeLang,
            isJson: true
        });

        const fallback = {
            strengthScore: 50,
            winProbability: readinessScore < 50 ? "Unavailable" : 50,
            caseSummary: "Information Not Available",
            majorLegalIssues: [],
            applicableLaws: [],
            applicableSections: [],
            supremeCourtJudgments: [],
            highCourtJudgments: [],
            importantPrecedents: [],
            evidenceStrength: "Medium",
            missingEvidence: [],
            weaknesses: [],
            contradictions: [],
            missingDocuments: [],
            pendingHearings: [],
            pendingTasks: [],
            riskAssessment: "Medium",
            recommendedNextSteps: [],
            litigationStrategy: "Information Not Available",
            settlementPossibility: "Information Not Available",
            questionsToAskClient: [],
            draftRecommendations: [],
            argumentsToUse: [],
            argumentsToAvoid: [],
            timelineIssues: [],
            limitationRisks: [],
            complianceChecklist: [],
            judgePreparation: "Information Not Available",
            crossExaminationNotes: "Information Not Available"
        };

        const parsed = safeParseLLMJson(response, fallback);

        // Programmatic post-processing constraints for zero-hallucination
        const caseType = (project.caseType || '').trim();
        const jurisdiction = (project.courtName || '').trim();
        const hasLegalIssues = project.legalIssues && project.legalIssues.length > 0;

        if (!caseType || !jurisdiction || !hasLegalIssues) {
            parsed.supremeCourtJudgments = [];
            parsed.highCourtJudgments = [];
            parsed.importantPrecedents = [];
        }

        if (readinessScore < 50) {
            parsed.winProbability = "Unavailable";
        }

        return parsed;
    } catch (error) {
        logger.error(`[LegalIntelligence] generateCompleteCaseAnalysis failed: ${error.message}`);
        throw error;
    }
};

/**
 * generatePersonalCaseAnalysis
 * Generates an exhaustive 15-section AI Case Analysis report for Advocate / Student personal cases.
 * Strictly adheres to zero-hallucination rules and avoids artificial readiness/win probability scores.
 */
export const generatePersonalCaseAnalysis = async (project, language = 'English') => {
    const store = vertexService.langStorage?.getStore();
    const activeLang = (language && language !== 'English') 
        ? language 
        : ((store && typeof store === 'object' ? store.language : store) || language || 'English');

    const globalLangInstruction = vertexService.getGlobalLanguageInstruction(activeLang);

    const caseTimeline = (project.facts || []).map(f => `${f.date || f.displayDate || 'N/A'}: ${f.title || ''} - ${f.description || ''}`).join('\n');
    const caseHearings = (project.hearings || []).map(h => `${h.date || ''} ${h.time || ''}: ${h.title || ''} (Court: ${h.courtName || ''}, Judge: ${h.judge || ''}). Notes: ${h.notes || ''}`).join('\n');
    const caseEvidence = (project.evidence || []).map(e => `${e.exhibitNumber || 'Exhibit'}: ${e.name || ''} (${e.type || ''}, Status: ${e.status || ''}). Desc: ${e.description || ''}`).join('\n');
    const caseDocuments = (project.documents || []).map(d => `${d.name || ''} (Type: ${d.type || ''})`).join('\n');
    const caseResearch = (project.research || project.savedPrecedents || []).map(r => `${r.title || r.lawName || ''} (${r.citation || r.section || ''}): ${r.description || ''}`).join('\n');
    const caseNotes = (project.notes || []).map(n => `Title: ${n.title || ''}\nContent: ${n.content || ''}`).join('\n---\n');
    const courtOrders = (project.courtOrders || []).map(o => `${o.name || ''}: ${o.ocrText || o.summary || ''}`).join('\n');

    const contextText = [
        `Case Title: ${project.name || 'Unknown Case'}`,
        `Client Name: ${project.clientName || 'Not specified'}`,
        `Opposing Party: ${project.opponentName || project.accused || project.opposingParty || 'Not specified'}`,
        `Case Category / Type: ${project.caseType || project.category || 'Litigation Workspace'}`,
        `Court / Jurisdiction: ${project.courtName || project.court || 'Not specified'}`,
        `Current Status / Stage: ${project.status || project.stage || 'Active'}`,
        `Case Summary / Background: ${project.summary || project.caseSummary || 'Not provided'}`,
        `Role Mode: ${project.role === 'student' ? 'Student Study Case' : 'Advocate Personal Case'}`,
        '',
        '--- CASE TIMELINE / FACTS ---',
        caseTimeline || 'No timeline facts recorded.',
        '',
        '--- HEARINGS ---',
        caseHearings || 'No hearings scheduled.',
        '',
        '--- EVIDENCE VAULT ---',
        caseEvidence || 'No evidence logged.',
        '',
        '--- UPLOADED DOCUMENTS ---',
        caseDocuments || 'No case documents uploaded.',
        '',
        '--- LEGAL RESEARCH & PRECEDENTS ---',
        caseResearch || 'No legal research or precedents attached.',
        '',
        '--- CASE NOTES ---',
        caseNotes || 'No notes available.',
        '',
        '--- COURT ORDERS ---',
        courtOrders || 'No court orders logged.'
    ].join('\n');

    const prompt = [
        'You are an elite AI Legal Analyst operating under strict Zero-Hallucination rules.',
        'Perform a comprehensive 15-Section AI Case Analysis for this personal case workspace.',
        '',
        'ZERO-HALLUCINATION INSTRUCTIONS:',
        '1. Never invent facts, evidence, court orders, dates, judges, case numbers, statutes, sections, citations, or parties.',
        '2. If information is unavailable in the workspace context, state explicitly: "Not available in current case data."',
        '3. For AI-inferred legal possibilities, label them clearly as: "AI Suggested — Verify before use".',
        '4. DO NOT calculate or return win probability percentages, readiness percentages, or artificial confidence scores.',
        '',
        'CASE WORKSPACE CONTEXT:',
        contextText,
        '',
        'OUTPUT REQUIREMENT: Generate valid JSON with these exact 15 keys:',
        '{',
        '  "overview": {',
        '    "caseTitle": "string",',
        '    "category": "string",',
        '    "court": "string",',
        '    "stageStatus": "string",',
        '    "parties": "string",',
        '    "importantDates": "string"',
        '  },',
        '  "completeCaseSummary": "Detailed narrative narrative string explaining background, what happened, main dispute, developments, present position.",',
        '  "keyFacts": {',
        '    "confirmedFacts": ["Fact 1", "Fact 2"],',
        '    "requiringVerification": ["Fact requiring verification 1"]',
        '  },',
        '  "partiesAndPositions": {',
        '    "userSide": "User / Client position",',
        '    "opposingSide": "Opposing side position",',
        '    "knownClaims": ["Claim 1"],',
        '    "knownDefence": ["Defence 1"]',
        '  },',
        '  "keyLegalIssues": [',
        '    { "issueNumber": 1, "issue": "Question title", "explanation": "Brief explanation" }',
        '  ],',
        '  "applicableLaws": {',
        '    "fromCaseMaterials": ["Act / Section identified from materials"],',
        '    "aiSuggestedVerification": ["Act / Section (AI Suggested — Verify before use)"]',
        '  },',
        '  "relevantPrecedents": [',
        '    { "caseName": "Name", "court": "Court", "year": "Year", "relevance": "Why relevant" }',
        '  ],',
        '  "evidenceAnalysis": {',
        '    "availableEvidence": ["Item 1"],',
        '    "relevance": "Relevance description",',
        '    "whatItSupports": "Support description",',
        '    "potentialWeaknesses": "Weakness description",',
        '    "evidenceGaps": ["Gap 1"]',
        '  },',
        '  "documentFindings": {',
        '    "importantDocuments": ["Doc 1"],',
        '    "keyInformation": "Key info string",',
        '    "potentialRelevance": "Relevance string",',
        '    "missingOrRequiredDocuments": ["Missing doc 1"]',
        '  },',
        '  "argumentAnalysis": {',
        '    "primaryArguments": ["Primary argument 1"],',
        '    "supportingArguments": ["Supporting argument 1"],',
        '    "possibleCounterarguments": ["Counterargument 1"]',
        '  },',
        '  "caseStrengths": ["Strength factor 1", "Strength factor 2"],',
        '  "weakPointsAndRisks": ["Weak fact or risk 1", "Procedural concern 1"],',
        '  "currentProceduralPosition": "Explanation of where case currently stands",',
        '  "informationGaps": {',
        '    "missingInformation": ["Missing item 1"],',
        '    "recommendedActions": ["Add Information", "Upload Document", "Add Evidence"]',
        '  },',
        '  "recommendedNextSteps": ["1. Step 1", "2. Step 2", "3. Step 3"]',
        '}',
        '',
        'Return ONLY valid JSON.'
    ].join('\n');

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 8192,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-pro',
            language: activeLang,
            isJson: true
        });

        const fallback = {
            overview: {
                caseTitle: project.name || "Personal Case Workspace",
                category: project.caseType || "Litigation Workspace",
                court: project.courtName || "Not available in current case data.",
                stageStatus: project.status || "Active",
                parties: `${project.clientName || 'Client'} vs ${project.opponentName || project.opposingParty || 'Opposing Party'}`,
                importantDates: "Not available in current case data."
            },
            completeCaseSummary: project.summary || project.caseSummary || "Not available in current case data.",
            keyFacts: {
                confirmedFacts: (project.facts || []).map(f => f.title || f.description || 'Fact item'),
                requiringVerification: ["Case facts requiring additional documentation or proof."]
            },
            partiesAndPositions: {
                userSide: project.clientName ? `Representing ${project.clientName}` : "Not available in current case data.",
                opposingSide: project.opponentName || project.opposingParty || "Not available in current case data.",
                knownClaims: [],
                knownDefence: []
            },
            keyLegalIssues: [
                { issueNumber: 1, issue: "Primary Legal Dispute", explanation: "Details pending complete factual submissions." }
            ],
            applicableLaws: {
                fromCaseMaterials: [],
                aiSuggestedVerification: []
            },
            relevantPrecedents: [],
            evidenceAnalysis: {
                availableEvidence: (project.evidence || []).map(e => e.name || 'Evidence Item'),
                relevance: "Not available in current case data.",
                whatItSupports: "Not available in current case data.",
                potentialWeaknesses: "Not available in current case data.",
                evidenceGaps: []
            },
            documentFindings: {
                importantDocuments: (project.documents || []).map(d => d.name || 'Document'),
                keyInformation: "Not available in current case data.",
                potentialRelevance: "Not available in current case data.",
                missingOrRequiredDocuments: []
            },
            argumentAnalysis: {
                primaryArguments: [],
                supportingArguments: [],
                possibleCounterarguments: []
            },
            caseStrengths: ["Documentary record in progress"],
            weakPointsAndRisks: ["Additional verification required for complete evidence chain"],
            currentProceduralPosition: `Case currently logged at stage: ${project.stage || project.status || 'Active'}.`,
            informationGaps: {
                missingInformation: ["Detailed case background", "Uploaded supporting documents"],
                recommendedActions: ["Add Information", "Upload Document"]
            },
            recommendedNextSteps: [
                "1. Add detailed case summary and facts timeline.",
                "2. Upload supporting documents to Evidence Vault.",
                "3. Log scheduled court hearing dates."
            ]
        };

        const parsed = safeParseLLMJson(response, fallback);
        return parsed;
    } catch (err) {
        logger.error(`[LegalIntelligence] generatePersonalCaseAnalysis failed: ${err.message}`);
        throw err;
    }
};

/**
 * generatePersonalCaseStrategy
 * Generates an exhaustive 14-section AI Case Strategy report for Advocate / Student personal cases.
 * Uses case workspace details + existing analysis to formulate legal strategy.
 */
export const generatePersonalCaseStrategy = async (project, existingAnalysis = null, language = 'English') => {
    const store = vertexService.langStorage?.getStore();
    const activeLang = (language && language !== 'English') 
        ? language 
        : ((store && typeof store === 'object' ? store.language : store) || language || 'English');

    const caseTimeline = (project.facts || []).map(f => `${f.date || f.displayDate || 'N/A'}: ${f.title || ''} - ${f.description || ''}`).join('\n');
    const caseHearings = (project.hearings || []).map(h => `${h.date || ''} ${h.time || ''}: ${h.title || ''} (Court: ${h.courtName || ''}, Purpose: ${h.purpose || ''})`).join('\n');
    const caseEvidence = (project.evidence || []).map(e => `${e.exhibitNumber || 'Exhibit'}: ${e.name || ''} (${e.type || ''}, Status: ${e.status || ''})`).join('\n');
    const caseDocuments = (project.documents || []).map(d => `${d.name || ''}`).join('\n');
    const caseResearch = (project.research || project.savedPrecedents || []).map(r => `${r.title || r.lawName || ''} (${r.citation || ''})`).join('\n');

    const analysisSummary = existingAnalysis ? JSON.stringify(existingAnalysis) : 'No prior analysis generated.';

    const contextText = [
        `Case Title: ${project.name || 'Unknown Case'}`,
        `Client: ${project.clientName || 'Not specified'}`,
        `Opposing Party: ${project.opponentName || project.opposingParty || 'Not specified'}`,
        `Case Type: ${project.caseType || 'Litigation Workspace'}`,
        `Court: ${project.courtName || 'Not specified'}`,
        `Summary: ${project.summary || project.caseSummary || 'Not provided'}`,
        '',
        '--- TIMELINE & FACTS ---',
        caseTimeline || 'No timeline.',
        '',
        '--- HEARINGS ---',
        caseHearings || 'No upcoming hearing recorded.',
        '',
        '--- EVIDENCE ---',
        caseEvidence || 'No evidence.',
        '',
        '--- DOCUMENTS ---',
        caseDocuments || 'No documents.',
        '',
        '--- RESEARCH ---',
        caseResearch || 'No research.',
        '',
        '--- EXISTING ANALYSIS ---',
        analysisSummary
    ].join('\n');

    const prompt = [
        'You are an elite Lead Litigation Strategist.',
        'Prepare a structured 14-Section AI Case Strategy Report for this case workspace.',
        '',
        'ZERO-HALLUCINATION & SAFETY RULES:',
        '1. Never invent facts, evidence, court orders, hearings, judges, statutes, sections, or citations.',
        '2. Do NOT recommend fabrication, alteration, concealment, or destruction of evidence.',
        '3. If no upcoming hearing is scheduled, state explicitly: "No upcoming hearing is currently recorded."',
        '4. If information is unavailable, explicitly state: "Not available in current case data."',
        '5. Label AI-inferred strategy recommendations as: "AI Suggested — Verify before use".',
        '',
        'CASE WORKSPACE CONTEXT:',
        contextText,
        '',
        'OUTPUT REQUIREMENT: Generate valid JSON with these exact 14 keys:',
        '{',
        '  "strategicObjective": "Main litigation objective based on case data",',
        '  "currentCasePosition": "Short summary of current procedural and factual standing",',
        '  "recommendedLegalApproach": "AI-assisted approach for preparing/handling matter",',
        '  "priorityLegalIssues": ["Issue 1 requiring immediate focus", "Issue 2"],',
        '  "evidenceStrategy": {',
        '    "evidenceToRelyOn": ["Item 1"],',
        '    "requiringVerification": ["Item needing verification"],',
        '    "evidenceWeaknesses": ["Weakness 1"],',
        '    "potentialGaps": ["Gap 1"],',
        '    "additionalConsiderations": ["Additional proof to consider"]',
        '  },',
        '  "documentStrategy": {',
        '    "criticalDocuments": ["Critical doc 1"],',
        '    "requiringReview": ["Doc needing review"],',
        '    "missingDocuments": ["Missing doc 1"],',
        '    "requiringVerification": ["Doc needing verification"]',
        '  },',
        '  "argumentStrategy": {',
        '    "primaryArguments": [{ "argument": "Arg 1", "whyItMatters": "Why" }],',
        '    "supportingArguments": [{ "argument": "Arg 2", "whyItMatters": "Why" }],',
        '    "alternativeArguments": [{ "argument": "Arg 3", "whyItMatters": "Why" }]',
        '  },',
        '  "oppositionAnalysis": ["Potential opposing argument 1 based on known facts"],',
        '  "responseCounterStrategy": ["Possible legal/factual response 1"],',
        '  "researchPrecedentStrategy": {',
        '    "questionsToResearch": ["Legal question 1"],',
        '    "statutoryAreas": ["Relevant statutory area 1"],',
        '    "savedPrecedentsToReview": ["Precedent 1"],',
        '    "additionalResearchNeeded": ["Area 1"]',
        '  },',
        '  "hearingPreparation": {',
        '    "nextHearing": "Date or No upcoming hearing is currently recorded.",',
        '    "purpose": "Hearing purpose",',
        '    "whatToPrepare": ["Item 1"],',
        '    "documentsRequired": ["Doc 1"],',
        '    "argumentsToPrepare": ["Argument 1"],',
        '    "evidenceToReview": ["Evidence 1"]',
        '  },',
        '  "riskManagement": {',
        '    "legalRisks": ["Risk 1"],',
        '    "evidenceRisks": ["Risk 1"],',
        '    "proceduralRisks": ["Risk 1"],',
        '    "missingInformation": ["Missing 1"],',
        '    "issuesRequiringVerification": ["Issue 1"]',
        '  },',
        '  "priorityActionPlan": {',
        '    "highPriority": ["Immediate task 1"],',
        '    "mediumPriority": ["Medium task 1"],',
        '    "lowPriority": ["Low task 1"]',
        '  },',
        '  "recommendedNextSteps": ["1. Step 1", "2. Step 2", "3. Step 3"]',
        '}',
        '',
        'Return ONLY valid JSON.'
    ].join('\n');

    try {
        const response = await vertexService.AskVertexRaw(prompt, {
            maxOutputTokens: 8192,
            temperature: 0.1,
            modelOverride: 'gemini-2.5-pro',
            language: activeLang,
            isJson: true
        });

        const fallback = {
            strategicObjective: `Establish core legal claims for ${project.name || 'this case'}.`,
            currentCasePosition: `Case matter pending at stage: ${project.stage || project.status || 'Active'}.`,
            recommendedLegalApproach: "Consolidate documentary evidence and verify statutory compliance before oral submissions.",
            priorityLegalIssues: ["Establishment of liability", "Verification of notice delivery"],
            evidenceStrategy: {
                evidenceToRelyOn: (project.evidence || []).map(e => e.name || 'Evidence Item'),
                requiringVerification: ["Authenticity of uncertified document copies"],
                evidenceWeaknesses: ["Absence of independent witness statement"],
                potentialGaps: ["Primary return memo"],
                additionalConsiderations: ["Obtain certified court copies"]
            },
            documentStrategy: {
                criticalDocuments: (project.documents || []).map(d => d.name || 'Document'),
                requiringReview: ["Initial legal notice and reply"],
                missingDocuments: ["Proof of service"],
                requiringVerification: ["Bank scroll entries"]
            },
            argumentStrategy: {
                primaryArguments: [{ argument: "Documentary obligation fulfilled", whyItMatters: "Establishes prima facie case" }],
                supportingArguments: [],
                alternativeArguments: []
            },
            oppositionAnalysis: ["Opponent may challenge limitation or service of notice."],
            responseCounterStrategy: ["Rely on statutory presumption under applicable procedural law."],
            researchPrecedentStrategy: {
                questionsToResearch: ["Scope of statutory presumptions under relevant acts"],
                statutoryAreas: ["Indian Evidence Act / procedural provisions"],
                savedPrecedentsToReview: [],
                additionalResearchNeeded: ["Recent High Court rulings on service verification"]
            },
            hearingPreparation: {
                nextHearing: (project.hearings && project.hearings.length > 0) ? (project.hearings[0].date || 'Scheduled') : "No upcoming hearing is currently recorded.",
                purpose: (project.hearings && project.hearings.length > 0) ? (project.hearings[0].purpose || 'Court appearance') : "N/A",
                whatToPrepare: ["Brief note of arguments"],
                documentsRequired: ["Original case file"],
                argumentsToPrepare: ["Prima facie maintainability"],
                evidenceToReview: ["Exhibit list"]
            },
            riskManagement: {
                legalRisks: ["Delay in filing formal affidavit"],
                evidenceRisks: ["Uncertified electronic records"],
                proceduralRisks: ["Limitation timeline"],
                missingInformation: ["Exact dates of default"],
                issuesRequiringVerification: ["Opponent authority to appear"]
            },
            priorityActionPlan: {
                highPriority: ["Verify key evidence items", "Upload primary contracts/documents"],
                mediumPriority: ["Conduct precedent research"],
                lowPriority: ["Organize workspace notes"]
            },
            recommendedNextSteps: [
                "1. Upload missing supporting document.",
                "2. Verify relevant statutory provision.",
                "3. Review key evidence.",
                "4. Research relevant precedent.",
                "5. Prepare arguments for next hearing."
            ]
        };

        const parsed = safeParseLLMJson(response, fallback);
        return parsed;
    } catch (err) {
        logger.error(`[LegalIntelligence] generatePersonalCaseStrategy failed: ${err.message}`);
        throw err;
    }
};
