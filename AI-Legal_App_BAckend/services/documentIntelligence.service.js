import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { askOpenAI } from './openai.service.js';
import logger from '../utils/logger.js';

/**
 * Extracts raw text from a document buffer using format-specific parsers or OCR.
 */
export const extractTextFromBuffer = async (fileBuffer, originalName, mimeType) => {
    const ext = (originalName || '').split('.').pop().toLowerCase();
    logger.info(`[DocIntel] Extracting text from: ${originalName} (Extension: ${ext}, Mime: ${mimeType})`);

    try {
        if (ext === 'pdf' || mimeType === 'application/pdf') {
            const data = await pdfParse(fileBuffer);
            return data.text || '';
        } else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return result.value || '';
        } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext) || (mimeType || '').startsWith('image/')) {
            const ocrResult = await Tesseract.recognize(fileBuffer, 'eng');
            return ocrResult.data?.text || '';
        } else if (ext === 'txt' || mimeType === 'text/plain') {
            return fileBuffer.toString('utf-8');
        } else {
            // Fallback for other files
            return fileBuffer.toString('utf-8');
        }
    } catch (err) {
        logger.error(`[DocIntel] Extraction error for ${originalName}: ${err.message}`);
        throw err;
    }
};

export const parseLegalTextToMetadata = async (rawText, userId, language = 'English') => {
    if (!rawText || !rawText.trim()) {
        throw new Error('No raw text found to parse');
    }

    const maxChars = 30000;
    const truncatedText = rawText.length > maxChars ? rawText.substring(0, maxChars) + '\n[Content Truncated...]' : rawText;

    const displayLanguage = language === 'Bilingual' ? 'Bilingual (English + Hindi)' : language;
    let languageInstruction = `
### MANDATORY LANGUAGE RULE:
- You MUST generate all string values in the JSON (such as caseSummary, facts description, timeline events, clauses, legalIssues, etc.) entirely in ${displayLanguage}.
- Never default to English.
- Keep legal terminology understandable.
- If necessary, mention the original Act or Section names in English (e.g. "Section 138 NI Act") while explaining everything else in ${displayLanguage}.
- Think and answer in ${displayLanguage}. Generate naturally. Do not translate afterwards.
`;
    if (language === 'Hindi') {
        languageInstruction += `
- Every description and text value must be in पूरा उत्तर हिन्दी में (Full Hindi), प्राकृतिक हिन्दी (Natural Hindi), कानूनी लेकिन सरल भाषा (Simple legal language).
- Do NOT translate proper legal identifiers (e.g. "Section 138 NI Act", "BNS", "BNSS", "Supreme Court", "High Court"). Keep them in English/Roman script.
`;
    }

    const systemInstruction = `You are a professional Enterprise Legal Document Parser and Intake Intelligence engine.
Your task is to analyze the provided legal document text and extract structured metadata properties.
Do not invent or assume any facts. If information cannot be found in the document, set the respective values to empty arrays, empty strings, or null as appropriate.

${languageInstruction}

Provide the response strictly in JSON format. Do not wrap in markdown tags like \`\`\`json.
JSON Schema:
{
  "caseSummary": "A concise executive summary of the dispute and main details.",
  "facts": [{"title": "Fact title", "description": "Factual details", "date": "YYYY-MM-DD or display date"}],
  "timeline": [{"event": "Milestone name", "date": "YYYY-MM-DD or display date"}],
  "parties": ["Plaintiff/Petitioner Name", "Defendant/Respondent Name"],
  "witnesses": ["Witness Name 1", "Witness Name 2"],
  "documents": ["Uploaded or referenced document titles"],
  "clauses": ["Key agreement terms, penalty clauses, termination rules, etc."],
  "sections": ["Relevant legal act sections mentioned, e.g., Section 138 of NI Act"],
  "legalIssues": ["Core legal questions or disputes identified in document"],
  "court": "Name of the court (if specified)",
  "judge": "Name of the judge (if specified)",
  "amount": "Disputed monetary value or cheque amount (if specified)",
  "importantDates": [{"label": "Milestone label", "date": "YYYY-MM-DD"}],
  "citations": ["Legal precedents or citations referenced, e.g., 2024 SCC 12"],
  "confidenceScore": 95
}`;

    const prompt = `Parse the following legal document text:
-----------------
${truncatedText}
-----------------

preferred_response_language=${language}`;

    try {
        const rawJson = await askOpenAI(prompt, null, {
            systemInstruction,
            jsonMode: true,
            model: 'gpt-4o',
            temperature: 0.2,
            userId
        });

        const parsed = JSON.parse(rawJson);
        return parsed;
    } catch (err) {
        logger.error(`[DocIntel] LLM metadata parsing failed: ${err.message}`);
        throw err;
    }
};

/**
 * Merges structured metadata into the Mongo Project case details.
 */
export const mergeMetadataIntoProject = (project, metadata) => {
    if (!metadata) return;

    // Merge basic text fields if empty or placeholder
    if (metadata.caseSummary && (!project.summary || project.summary.trim().length < 20)) {
        project.summary = metadata.caseSummary;
        project.caseSummary = metadata.caseSummary;
    }

    if (metadata.court && (!project.court || project.court === 'Court of Competent Jurisdiction' || project.court === 'Unknown')) {
        project.court = metadata.court;
    }

    if (metadata.judge && (!project.judge || project.judge === 'Honorable Judge' || project.judge === 'Unknown')) {
        project.judge = metadata.judge;
    }

    if (metadata.amount && metadata.amount !== 'Unknown' && (!project.reliefGoals || project.reliefGoals.trim().length === 0)) {
        project.reliefGoals = `Disputed Amount: ${metadata.amount}`;
    }

    // Merge parties
    if (metadata.parties && Array.isArray(metadata.parties) && metadata.parties.length > 0) {
        if (!project.clientName || project.clientName === 'Client' || project.clientName === 'Petitioner') {
            project.clientName = metadata.parties[0];
        }
        if (metadata.parties.length > 1 && (!project.opponentName || project.opponentName === 'Opponent' || project.opponentName === 'Respondent')) {
            project.opponentName = metadata.parties[1];
        }
    }

    // Merge facts (deduplicated by title)
    if (metadata.facts && Array.isArray(metadata.facts)) {
        const existingTitles = new Set((project.facts || []).map(f => (f.title || '').toLowerCase().trim()));
        metadata.facts.forEach(fact => {
            const titleLower = (fact.title || '').toLowerCase().trim();
            if (titleLower && !existingTitles.has(titleLower)) {
                project.facts.push({
                    id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: fact.title,
                    description: fact.description || fact.title,
                    date: fact.date || '',
                    displayDate: fact.date || '',
                    category: 'Other',
                    importance: 'Medium',
                    source: 'Document Ingestion Ingestion',
                    confidence: 'High',
                    createdBy: 'AI'
                });
                existingTitles.add(titleLower);
            }
        });
    }

    // Merge legal issues (deduplicated)
    if (metadata.legalIssues && Array.isArray(metadata.legalIssues)) {
        const existingIssues = new Set((project.legalIssues || []).map(i => i.toLowerCase().trim()));
        metadata.legalIssues.forEach(issue => {
            const issueLower = issue.toLowerCase().trim();
            if (issueLower && !existingIssues.has(issueLower)) {
                project.legalIssues.push(issue);
            }
        });
    }

    // Merge legal sections (deduplicated)
    if (metadata.sections && Array.isArray(metadata.sections)) {
        const existingResearch = new Set((project.research || []).map(r => `${(r.lawName || '').toLowerCase()}:${(r.section || '').toLowerCase()}`));
        metadata.sections.forEach(sec => {
            const secKey = `general:${sec.toLowerCase().trim()}`;
            if (sec && !existingResearch.has(secKey)) {
                project.research.push({
                    lawName: 'Relevant Statute',
                    section: sec,
                    description: `Identified reference: ${sec}`,
                    referenceUrl: ''
                });
            }
        });
    }
};
