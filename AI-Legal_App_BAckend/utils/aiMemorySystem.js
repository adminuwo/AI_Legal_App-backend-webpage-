import mongoose from 'mongoose';
import Project from '../models/Project.js';
import ContractAnalysis from '../models/ContractAnalysis.js';
import ChatSession from '../models/ChatSession.js';
import Reminder from '../models/Reminder.js';
import UserMemory from '../models/UserMemory.js';
import { getMemoryContext } from './memoryService.js';
import * as vertexService from '../services/vertex.service.js';
import { safeParseLLMJson } from './jsonUtils.js';

import WorkspaceAIContextService from '../services/WorkspaceAIContextService.js';

/**
 * Level 1, 2, 3 Unified Shared Memory Context Builder (Workspace Isolated)
 */
export const getUnifiedSharedMemoryContext = async (userId, activeProjectId, activeTool, workspaceId = 'personal_practice', workspaceType = 'personal', prompt = '') => {
    let contextText = "";
    try {
        if (!userId) return "";

        const wsContext = await WorkspaceAIContextService.buildWorkspaceContext({
            userId,
            workspaceId,
            workspaceType,
            prompt,
            activeCaseId: activeProjectId
        });

        contextText = wsContext?.contextText || "";

        // Level 1: Global User Profile & Preferences (Non-case metadata)
        const memory = await UserMemory.findOne({ userId, isMemoryEnabled: true }).lean();
        if (memory) {
            contextText += `
### USER PROFILE & PREFERENCES:
- User Name: ${memory.name || 'Advocate'}
- Profession: ${memory.businessType || 'Legal Practitioner'}
- Preferred Tone: ${memory.preferences?.tone || 'Professional'}
- Preferred Language: ${memory.preferences?.language || 'English'}
- Preferred Drafting Style: ${memory.preferredDraftingStyle || 'Standard formal legal writing'}
`;
        }

        // Level 2: Specific Focused Active Case Context (if explicitly requested)
        if (activeProjectId && mongoose.Types.ObjectId.isValid(activeProjectId)) {
            const proj = await Project.findOne({ _id: activeProjectId }).lean();
            if (proj) {
                // Ensure project belongs to the user or current workspace before adding extra detail
                const isPersonalMatch = String(proj.userId) === String(userId);
                const isWorkspaceMatch = proj.workspaceId && String(proj.workspaceId) === String(workspaceId);

                if (isPersonalMatch || isWorkspaceMatch) {
                    const ci = proj.caseIntelligence || {};
                    contextText += `
### FOCUSED CASE DETAIL:
- Case Name: ${proj.name || 'Untitled Case'}
- Case Type: ${proj.caseType || ci.caseType || 'Litigation'}
- Client: ${proj.clientName || 'N/A'} (Mobile: ${proj.clientMobileNumber || 'N/A'})
- Opponent: ${proj.opponentName || 'N/A'}
- Court: ${proj.court || 'N/A'} | Judge: ${proj.judge || 'N/A'}
- Status: ${proj.status || 'Active'} | Stage: ${proj.stage || 'Pre-litigation'}
- Case Summary: ${proj.summary || proj.caseSummary || 'No summary recorded.'}

### CASE FACTS:
${(ci.facts || []).map(f => `- ${f}`).join('\n') || 'None recorded.'}

### TIMELINE & EVENTS:
${(proj.timeline || ci.timeline || []).map(t => `- [${t.date || t.displayDate || 'Date N/A'}] ${t.title}: ${t.description || ''}`).join('\n') || 'No events.'}

### UPCOMING HEARINGS:
${(proj.hearings || []).map(h => `- [${h.date || 'Scheduled'}] ${h.title || 'Hearing'} @ ${h.courtroom || 'Court'}`).join('\n') || 'None.'}

### WITNESSES:
${(proj.witnesses || []).map(w => `- ${w.name} (${w.role}): ${w.statement || ''}`).join('\n') || 'None.'}
`;

                    if (activeTool === 'legal_evidence_checker' || activeTool === 'legal_evidence_analyst') {
                        contextText += `
### EVIDENCE COPILOT FOCUS MEMORY:
- Uploaded Evidence:
${(proj.evidence || []).map(e => `- Name: ${e.name} | Type: ${e.type} | Exhibit: ${e.exhibitNumber || 'N/A'} | Status: ${e.status} | Strength: ${e.strength || 'N/A'} | Notes: ${e.notes || 'N/A'}`).join('\n') || 'No evidence.'}
- Missing Evidence Needed: ${(proj.missingDocuments || []).map(m => `- ${m.title}`).join(', ') || 'None'}
`;
                    }

                    if (activeTool === 'legal_contract_analyzer') {
                        contextText += `
### CONTRACT COPILOT FOCUS MEMORY:
- Ingested Case Contracts:
${(proj.contracts || []).map(c => `- Name: ${c.name || 'Contract'} | Summary: ${c.aiSummary || 'N/A'}`).join('\n') || 'No contracts.'}
`;
                    }

                    if (activeTool === 'legal_strategy_engine') {
                        contextText += `
### STRATEGY ENGINE FOCUS MEMORY:
- Relief Goals: ${proj.reliefGoals || 'N/A'}
- Winning Strategy: ${ci.winningStrategy || 'N/A'}
- Opponent Weaknesses: ${(ci.opponentWeaknesses || []).join(', ') || 'N/A'}
- Precedents Referenced: ${(proj.savedPrecedents || []).map(p => `- ${p.title || p.citation}`).join('\n') || 'None'}
`;
                    }

                    if (activeTool === 'legal_argument_builder') {
                        contextText += `
### COURT PREPARATION FOCUS MEMORY:
- Case Arguments & Rebuttals:
${(ci.arguments || []).map(a => `- Argument: ${a.title || a.argument} | Rebuttal: ${a.rebuttal || 'N/A'}`).join('\n') || 'None.'}
`;
                    }
                }
            }
        }
    } catch (err) {
        console.error("[Memory System] Error generating unified memory context:", err);
    }

    contextText += `\n=========================================\n`;
    return contextText;
};

/**
 * Cross-App Database Search Tool for AI Requests
 */
export const performGlobalDatabaseSearch = async (userId, message, currentSessionId = null) => {
    if (!userId || !message) return "";

    const isRecallQuery = /\b(tumhe yaad|tumhe ytaad|yaad hai|pehle kis topic|pehle kya|purani baat|purana chat|kal ki baat|last time kya|pehle wala|pehle baat|pehle discussion|kya baat hui|kya baat hua|do you remember|continue from|continue my|last time|yesterday|previous conversation|previous chat|discussed|our last|prior conversation|remember our|last discussion|remember me|remember my|previous topic|what were we discussing|what did we talk|आठवते का|मागील चर्चा|क्या तुम्हें याद है|तुम्हें याद|पिछला चैट|मागील चर्चा)\b/i.test(message) || (message.includes('याद') || message.includes('चर्चा') || message.includes('आठवते'));

    const keywords = message.split(/\s+/)
        .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim())
        .filter(w => w.length > 3 && !['what', 'show', 'find', 'search', 'related', 'with', 'about', 'some', 'details', 'that', 'this', 'where', 'contract', 'case', 'evidence', 'laws'].includes(w.toLowerCase()));

    const searchRegex = keywords.length > 0 ? new RegExp(keywords.join('|'), 'i') : null;
    let searchContext = "\n=== USER PERMANENT CONVERSATION & LEGAL MEMORY ARCHIVE ===\n";
    let found = false;

    try {
        // ALWAYS RETRIEVE RECENT CHAT SESSIONS FOR LONG-TERM PERMANENT MEMORY
        const sessionFilter = { userId };
        if (currentSessionId) {
            sessionFilter.sessionId = { $ne: currentSessionId };
        }

        const recentChats = await ChatSession.find(sessionFilter)
            .sort({ lastModified: -1 })
            .limit(5)
            .lean();

        if (recentChats.length > 0) {
            found = true;
            searchContext += `\n### USER PREVIOUS CHAT SESSIONS ARCHIVE:\n`;
            recentChats.forEach(ch => {
                const lastUserMsg = ch.messages.filter(m => m.role === 'user').pop();
                const lastAiMsg = ch.messages.filter(m => m.role === 'model' || m.role === 'assistant').pop();
                searchContext += `- Session Title: "${ch.title}" (ID: ${ch.sessionId})\n`;
                if (lastUserMsg) searchContext += `  * User Request: "${(lastUserMsg.content || lastUserMsg.text || '').substring(0, 200)}"\n`;
                if (lastAiMsg) searchContext += `  * AI Output / Draft: "${(lastAiMsg.content || lastAiMsg.text || '').substring(0, 300)}..."\n`;
            });
        }

        if (searchRegex) {
            // 1. Search Cases
        const cases = await Project.find({
            userId,
            $or: [
                { name: searchRegex },
                { summary: searchRegex },
                { clientName: searchRegex },
                { opponentName: searchRegex },
                { 'facts.description': searchRegex },
                { 'evidence.name': searchRegex }
            ]
        }).limit(3).lean();

        if (cases.length > 0) {
            found = true;
            searchContext += `\nMatching Cases:\n`;
            cases.forEach((c) => {
                searchContext += `- Case: "${c.name}" | Client: ${c.clientName} vs Opponent: ${c.opponentName}\n  Summary: ${c.summary || 'N/A'}\n`;
            });
        }

        // 2. Search Contracts
        const contracts = await ContractAnalysis.find({
            userId,
            $or: [
                { contractName: searchRegex },
                { aiSummary: searchRegex },
                { ocrText: searchRegex }
            ]
        }).limit(3).lean();

        if (contracts.length > 0) {
            found = true;
            searchContext += `\nMatching Contracts:\n`;
            contracts.forEach((c) => {
                searchContext += `- Contract: "${c.contractName}" | Risk Level: ${c.riskLevel} | Summary: ${c.aiSummary || 'N/A'}\n`;
            });
        }

        // 3. Search Chat History
        const chats = await ChatSession.find({
            userId,
            $or: [
                { title: searchRegex },
                { 'messages.content': searchRegex }
            ]
        }).limit(3).lean();

        if (chats.length > 0) {
            found = true;
            searchContext += `\nMatching Chat Logs:\n`;
            chats.forEach((ch) => {
                const matchingMsgs = ch.messages
                    .filter(m => m.content && searchRegex.test(m.content))
                    .slice(0, 2)
                    .map(m => `  * [${m.role}]: "${m.content.substring(0, 150)}..."`)
                    .join('\n');
                searchContext += `- Chat Session: "${ch.title}"\n${matchingMsgs}\n`;
            });
        }
    }

    } catch (err) {
        console.warn("[Search Memory] Database cross search failed:", err.message);
    }

    if (!found) return "";
    searchContext += "=========================================\n";
    return searchContext;
};

/**
 * AI-to-AI Cross Communication Coordinator
 */
export const triggerAiCrossCommunication = async (userId, projectId, userMessage, aiResponse) => {
    try {
        if (!userId || !projectId || !mongoose.Types.ObjectId.isValid(projectId)) return;

        // Fast evaluation using LLM to extract actions
        const evaluationPrompt = `
You are the Legal AI Coordination Engine. Analyze this legal conversation turn (User Question & AI Response).
Determine if there are any automatic actions to trigger across other systems:
1. Missing Document/Signature: If the AI detects a missing signature, unsigned contract, or missing proof, describe it.
2. New Task/Reminder: If a task, follow-up, or deadline is mentioned or needed, create a reminder (title, description, daysFromNow).
3. Strategy Warning: If a risk, weakness, or confidence warning is identified, describe it.

Return ONLY a JSON response in the format:
{
  "detectedMissingDocument": { "title": "string or null", "description": "string or null" },
  "createdReminder": { "title": "string or null", "description": "string or null", "daysFromNow": 1 },
  "strategyWarning": "string or null"
}

User Message:
${userMessage}

AI Response:
${aiResponse}
`;

        const resultText = await vertexService.askVertex(evaluationPrompt, null, {
            modelOverride: 'gemini-2.5-flash',
            isJson: true
        });

        const data = safeParseLLMJson(resultText, {});
        const project = await Project.findOne({ _id: projectId, userId });
        if (!project) return;

        let projectModified = false;

        // 1. Missing Document
        if (data.detectedMissingDocument && data.detectedMissingDocument.title) {
            const hasDoc = (project.missingDocuments || []).some(
                d => d.title.toLowerCase().includes(data.detectedMissingDocument.title.toLowerCase())
            );
            if (!hasDoc) {
                project.missingDocuments = project.missingDocuments || [];
                project.missingDocuments.push({
                    title: data.detectedMissingDocument.title,
                    description: data.detectedMissingDocument.description || "Automatically identified by Copilot",
                    date: new Date().toISOString()
                });
                projectModified = true;
            }
        }

        // 2. Strategy Warning
        if (data.strategyWarning) {
            if (!project.caseIntelligence) project.caseIntelligence = {};
            if (!project.caseIntelligence.opponentWeaknesses) project.caseIntelligence.opponentWeaknesses = [];
            project.caseIntelligence.opponentWeaknesses.push(`[Strategy Warning] ${data.strategyWarning}`);
            projectModified = true;
        }

        if (projectModified) {
            await project.save();
        }

        // 3. New Reminder / Task
        if (data.createdReminder && data.createdReminder.title) {
            const reminderDate = new Date();
            reminderDate.setDate(reminderDate.getDate() + (data.createdReminder.daysFromNow || 1));

            const reminder = new Reminder({
                userId,
                title: data.createdReminder.title,
                description: data.createdReminder.description || "Created automatically by AI Assistant",
                datetime: reminderDate,
                repeat: 'none',
                notificationType: 'both',
                status: 'pending',
                intent: 'task_only'
            });
            await reminder.save();
        }

    } catch (err) {
        console.warn("[Cross Communication] Error running cross-copilot communication:", err.message);
    }
};
