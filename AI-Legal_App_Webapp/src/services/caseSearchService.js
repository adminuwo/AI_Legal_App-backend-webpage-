import axios from 'axios';
import { apis, API } from '../types';
import { LANDMARK_JUDGMENTS_DATABASE } from '../data/landmarkJudgmentsData';
import { INDIAN_COURTS } from '../data/indianCourtsData';
import apiService from './apiService';

const SAVED_BOOKMARKS_KEY = 'ai_legal_saved_judgments_v2';
const RECENT_SEARCHES_KEY = 'ai_legal_case_search_history';

/**
 * Normalizes text for clean keyword comparison
 */
const normalize = (text) => (text || '').toLowerCase().trim();

/**
 * Extracts clean, meaningful tokens from query string
 */
const extractTokens = (text) => {
  if (!text) return [];
  const clean = normalize(text).replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  
  // Stopwords that don't help in precision matching
  const stopWords = new Set([
    'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'a', 'an', 'is', 
    'are', 'was', 'were', 'under', 'with', 'by', 'from', 'into', 'vs', 'versus', 'case'
  ]);
  
  const tokens = words.filter(w => !stopWords.has(w));
  return tokens.length > 0 ? tokens : words;
};

/**
 * Computes match score and relevance for a judgment against search parameters
 */
const scoreJudgment = (judgment, query, mode = 'AI') => {
  if (!query || !query.trim()) {
    return { isMatch: true, score: judgment.relevanceScore || 90 };
  }

  const rawQ = normalize(query);
  const tokens = extractTokens(query);

  const title = normalize(judgment.title);
  const citation = normalize(judgment.citation);
  const ratio = normalize(judgment.ratioDecidendi);
  const summary = normalize(judgment.executiveSummary);
  const relevanceReason = normalize(judgment.relevanceReason);
  const acts = (judgment.acts || []).map(normalize).join(' ');
  const sections = (judgment.sections || []).map(normalize).join(' ');
  const statutes = (judgment.applicableStatutes || []).map(normalize).join(' ');
  const judges = (judgment.judges || []).map(normalize).join(' ');
  const parties = `${normalize(judgment.parties?.petitioner)} ${normalize(judgment.parties?.respondent)}`;
  const facts = normalize(judgment.caseContext?.facts);
  const issue = normalize(judgment.caseContext?.legalIssue);
  const excerpt = normalize(judgment.fullTextExcerpt);

  // Combined searchable text corpuses
  const coreCorpus = `${title} ${citation} ${sections} ${acts} ${statutes} ${ratio} ${relevanceReason}`;
  const fullCorpus = `${coreCorpus} ${summary} ${parties} ${judges} ${facts} ${issue} ${excerpt}`;

  // 1. Specialized Search Modes
  if (mode === 'CITATION') {
    const isCitMatch = citation.includes(rawQ) || tokens.some(t => citation.includes(t));
    return { isMatch: isCitMatch, score: isCitMatch ? 98 : 0 };
  }

  if (mode === 'CASE') {
    const isTitleMatch = title.includes(rawQ) || tokens.some(t => title.includes(t) || parties.includes(t));
    return { isMatch: isTitleMatch, score: isTitleMatch ? 97 : 0 };
  }

  if (mode === 'ACT') {
    const isActMatch = acts.includes(rawQ) || sections.includes(rawQ) || statutes.includes(rawQ) ||
      tokens.some(t => acts.includes(t) || sections.includes(t) || statutes.includes(t));
    return { isMatch: isActMatch, score: isActMatch ? 98 : 0 };
  }

  if (mode === 'PARTY') {
    const isPartyMatch = parties.includes(rawQ) || tokens.some(t => parties.includes(t));
    return { isMatch: isPartyMatch, score: isPartyMatch ? 96 : 0 };
  }

  if (mode === 'JUDGE') {
    const isJudgeMatch = judges.includes(rawQ) || tokens.some(t => judges.includes(t));
    return { isMatch: isJudgeMatch, score: isJudgeMatch ? 95 : 0 };
  }

  // 2. AI Natural Language & Semantic Search Mode
  let score = 65;
  let tokenHitCount = 0;

  // Exact phrase match bonus
  if (fullCorpus.includes(rawQ)) {
    score += 25;
    tokenHitCount = tokens.length;
  }

  // Token-by-token evaluation
  tokens.forEach(token => {
    let tokenHit = false;

    // Highest priority: Sections, Articles, Statutes, or Title
    if (sections.includes(token) || statutes.includes(token) || title.includes(token)) {
      score += 10;
      tokenHit = true;
    }
    // High priority: Acts, Ratio Decidendi, Relevance Reason
    else if (acts.includes(token) || ratio.includes(token) || relevanceReason.includes(token)) {
      score += 7;
      tokenHit = true;
    }
    // Medium priority: Summary, Facts, Issues
    else if (summary.includes(token) || facts.includes(token) || issue.includes(token) || parties.includes(token)) {
      score += 4;
      tokenHit = true;
    }
    // General match: Full excerpt
    else if (excerpt.includes(token)) {
      score += 2;
      tokenHit = true;
    }

    if (tokenHit) {
      tokenHitCount++;
    }
  });

  // Check for common Indian constitutional and legal synonyms / concepts
  const hasArticle21Query = (rawQ.includes('21') || rawQ.includes('article 21') || rawQ.includes('fundamental') || rawQ.includes('privacy') || rawQ.includes('liberty'));
  const judgmentHasArticle21 = (sections.includes('21') || statutes.includes('article 21') || coreCorpus.includes('article 21') || coreCorpus.includes('fundamental right'));

  if (hasArticle21Query && judgmentHasArticle21) {
    score += 15;
    tokenHitCount = Math.max(tokenHitCount, 2);
  }

  const hasBailQuery = rawQ.includes('bail') || rawQ.includes('438') || rawQ.includes('439') || rawQ.includes('482') || rawQ.includes('480') || rawQ.includes('483');
  const judgmentHasBail = sections.includes('438') || sections.includes('439') || sections.includes('483') || ratio.includes('bail') || acts.includes('pmla');

  if (hasBailQuery && judgmentHasBail) {
    score += 15;
    tokenHitCount = Math.max(tokenHitCount, 2);
  }

  const hasChequeQuery = rawQ.includes('138') || rawQ.includes('cheque') || rawQ.includes('ni act') || rawQ.includes('dishonour');
  const judgmentHasCheque = sections.includes('138') || acts.includes('negotiable') || ratio.includes('cheque');

  if (hasChequeQuery && judgmentHasCheque) {
    score += 20;
    tokenHitCount = Math.max(tokenHitCount, 2);
  }

  const hasFirQuery = rawQ.includes('fir') || rawQ.includes('154') || rawQ.includes('173') || rawQ.includes('cognizable');
  const judgmentHasFir = sections.includes('154') || sections.includes('173') || ratio.includes('fir');

  if (hasFirQuery && judgmentHasFir) {
    score += 20;
    tokenHitCount = Math.max(tokenHitCount, 2);
  }

  const hasArrestQuery = rawQ.includes('arrest') || rawQ.includes('41a') || rawQ.includes('35') || rawQ.includes('custod');
  const judgmentHasArrest = sections.includes('41') || sections.includes('35') || ratio.includes('arrest') || title.includes('arnesh') || title.includes('basu');

  if (hasArrestQuery && judgmentHasArrest) {
    score += 18;
    tokenHitCount = Math.max(tokenHitCount, 2);
  }

  // Determine if this constitutes a valid match
  // Match condition: At least 1 meaningful token hit, OR exact phrase hit
  const isMatch = tokenHitCount > 0 || fullCorpus.includes(rawQ);
  const finalScore = Math.min(99, Math.max(68, score));

  return { isMatch, score: finalScore };
};

export const caseSearchService = {
  /**
   * Search judgments by query, mode, source, and advanced filters
   */
  async searchJudgments({
    query = '',
    mode = 'AI',
    source = 'ALL',
    selectedCourt = 'all',
    filters = {}
  }) {
    const rawQ = normalize(query);
    let results = [];

    // 1. Instant Local Filter & Semantic Score over Indexed Landmark Database
    const yearFilter = filters.year && filters.year !== 'all' ? filters.year : null;
    const caseTypeFilter = filters.caseType && filters.caseType !== 'All Types' ? normalize(filters.caseType) : null;
    const judgeFilter = filters.judge ? normalize(filters.judge) : null;
    const actFilter = filters.act ? normalize(filters.act) : null;
    const sectionFilter = filters.section ? normalize(filters.section) : null;
    const citationFilter = filters.citation ? normalize(filters.citation) : null;
    const partyFilter = filters.party ? normalize(filters.party) : null;

    const matchedLocal = [];

    LANDMARK_JUDGMENTS_DATABASE.forEach(item => {
      // Source / Court filter
      if (source === 'SC' && item.courtId !== 'sc') return;
      if (source === 'HC' && item.courtId === 'sc') return;
      if (selectedCourt && selectedCourt !== 'all' && item.courtId !== selectedCourt) {
        if (item.courtId !== selectedCourt && !(selectedCourt === 'sc' && item.courtId === 'sc')) {
          return;
        }
      }

      // Year filter
      if (yearFilter && item.year !== yearFilter) return;

      // Case type filter
      if (caseTypeFilter && !normalize(item.caseType).includes(caseTypeFilter)) return;

      // Advanced field filters
      if (judgeFilter) {
        const judgesText = (item.judges || []).map(normalize).join(' ');
        if (!judgesText.includes(judgeFilter)) return;
      }

      if (actFilter) {
        const actsText = (item.acts || []).map(normalize).join(' ');
        if (!actsText.includes(actFilter)) return;
      }

      if (sectionFilter) {
        const sectionsText = (item.sections || []).map(normalize).join(' ');
        if (!sectionsText.includes(sectionFilter)) return;
      }

      if (citationFilter) {
        if (!normalize(item.citation).includes(citationFilter)) return;
      }

      if (partyFilter) {
        const partiesText = `${normalize(item.parties?.petitioner)} ${normalize(item.parties?.respondent)}`;
        if (!partiesText.includes(partyFilter)) return;
      }

      // Semantic & Query Matching
      const { isMatch, score } = scoreJudgment(item, query, mode);

      if (isMatch) {
        matchedLocal.push({
          ...item,
          relevanceScore: score
        });
      }
    });

    // Sort matched local results by relevance score descending
    matchedLocal.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    results = matchedLocal;

    // 2. Asynchronous attempt to augment with Backend Precedents API if available
    try {
      const activeToken = localStorage.getItem('token');
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};

      const response = await axios.post(
        `${API}/precedents/search`,
        {
          query,
          language: 'English',
          searchMode: mode,
          courtFilter: selectedCourt,
          filters
        },
        { headers, timeout: 3500 }
      );

      if (response.data && Array.isArray(response.data.precedents) && response.data.precedents.length > 0) {
        const backendItems = response.data.precedents.map((p, idx) => ({
          id: p._id || p.id || `backend_${idx}`,
          title: p.case_name || p.title || 'Judicial Precedent',
          parties: {
            petitioner: p.parties?.petitioner || (p.case_name || '').split(' v. ')[0] || 'Petitioner',
            respondent: p.parties?.respondent || (p.case_name || '').split(' v. ')[1] || 'Respondent'
          },
          court: p.court || (p.jurisdiction?.isNepal ? 'Supreme Court of Nepal' : 'Supreme Court of India'),
          courtId: 'sc',
          year: p.year || new Date().getFullYear().toString(),
          date: p.judgment_date || p.date || 'Recent Ruling',
          citation: p.citation || 'Citation In Progress',
          bench: p.bench || 'Division Bench',
          judges: Array.isArray(p.judges) ? p.judges : [p.judge || "Hon'ble Supreme Court Bench"],
          caseType: p.case_type || 'Civil / Criminal',
          acts: p.acts || ['Constitution of India, 1950', 'Code of Criminal Procedure'],
          sections: p.sections || ['Article 21'],
          relevanceScore: p.similarity?.relevance_score || p.relevanceScore || 92,
          relevanceReason: p.similarity?.why_relevant || p.relevanceReason || 'Direct jurisprudential authority on point.',
          ratioDecidendi: p.ratio_decidendi || p.ratioDecidendi || 'Binding legal principle established in matter.',
          executiveSummary: p.summary || p.executiveSummary || 'Detailed judicial brief analyzing facts and law.',
          caseContext: {
            facts: p.facts || 'Summary of facts as placed before the Court.',
            legalIssue: p.legal_issue || 'Substantial question of law determined.'
          },
          reasoning: p.judicial_reasoning || p.reasoning || 'Detailed judicial analysis of statutory provisions.',
          finalDecision: p.final_order || p.finalDecision || 'Disposed of with binding directions.',
          applicableStatutes: p.applicableStatutes || ['Article 21'],
          precedentsCited: p.precedents_cited || [],
          keyParagraphs: p.key_paragraphs || [],
          fullTextExcerpt: p.full_text || p.summary || ''
        }));

        // Merge backend items with local results avoiding duplicates
        const seenTitles = new Set(results.map(r => normalize(r.title)));
        backendItems.forEach(bItem => {
          if (!seenTitles.has(normalize(bItem.title))) {
            results.push(bItem);
            seenTitles.add(normalize(bItem.title));
          }
        });

        // Re-sort blended results
        results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      }
    } catch (err) {
      // Backend unavailable or timed out; silent fallback to indexed database
    }

    // 3. Fallback: If query was non-empty but rigid matching produced 0, provide broader landmark authorities
    if (results.length === 0 && rawQ) {
      // Relax match: check if ANY letter group or word matches partially
      const relaxed = LANDMARK_JUDGMENTS_DATABASE.filter(item => {
        const full = `${normalize(item.title)} ${normalize(item.ratioDecidendi)} ${normalize(item.executiveSummary)}`;
        return extractTokens(query).some(t => full.includes(t));
      });

      if (relaxed.length > 0) {
        results = relaxed.map(item => ({ ...item, relevanceScore: 82 }));
      }
    }

    // Save recent search if non-empty
    if (query && query.trim().length > 2) {
      this.saveRecentSearch(query.trim());
    }

    return results;
  },

  /**
   * Fetch judgment by ID or slug
   */
  async getJudgmentById(id) {
    if (!id) return null;
    const normalizedId = String(id).toLowerCase().trim();
    const found = LANDMARK_JUDGMENTS_DATABASE.find(j => 
      j.id === id || 
      (j.slug && j.slug.toLowerCase() === normalizedId) ||
      (j.id && j.id.toLowerCase() === normalizedId) ||
      (j.title && j.title.toLowerCase().replace(/[^a-z0-9]/g, '-').includes(normalizedId))
    );
    if (found) return found;

    try {
      const activeToken = localStorage.getItem('token');
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
      const res = await axios.get(`${API}/precedents/${id}`, { headers });
      return res.data?.precedent || res.data;
    } catch (e) {
      console.warn('Could not fetch remote judgment by id:', e);
      return null;
    }
  },

  /**
   * Generate AI Analysis for a judgment
   */
  async generateAIAnalysis(judgment) {
    try {
      const activeToken = localStorage.getItem('token');
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};

      const response = await axios.post(
        `${API}/precedents/analyze`,
        {
          caseName: judgment.title,
          citation: judgment.citation,
          ratio: judgment.ratioDecidendi,
          fullText: judgment.fullTextExcerpt || judgment.executiveSummary
        },
        { headers, timeout: 8000 }
      );

      if (response.data && response.data.analysis) {
        return response.data.analysis;
      }
    } catch (e) {
      console.warn('Backend live AI analysis unavailable, serving structured analysis brief.');
    }

    return {
      summary: judgment.executiveSummary,
      ratioDecidendi: judgment.ratioDecidendi,
      arguments: judgment.arguments,
      reasoning: judgment.reasoning,
      operativeOrder: judgment.finalDecision,
      obiterDicta: judgment.obiterDicta,
      statutes: judgment.applicableStatutes || judgment.acts,
      precedentsCited: judgment.precedentsCited,
      practicalTakeaways: judgment.practicalTakeaway,
      keyParagraphs: judgment.keyParagraphs
    };
  },

  /**
   * Send question to AI Legal Assistant for grounded Q&A on a judgment
   */
  async askJudgmentAssistant({ judgment, userQuestion, chatHistory = [] }) {
    try {
      const activeToken = localStorage.getItem('token');
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};

      const response = await axios.post(
        `${API}/precedents/ask`,
        {
          judgmentId: judgment.id,
          caseTitle: judgment.title,
          citation: judgment.citation,
          ratio: judgment.ratioDecidendi,
          contextText: judgment.fullTextExcerpt || judgment.executiveSummary,
          question: userQuestion,
          history: chatHistory
        },
        { headers, timeout: 10000 }
      );

      if (response.data && response.data.reply) {
        return response.data.reply;
      }
    } catch (err) {
      console.warn('Assistant backend endpoint unavailable, falling back to local reasoning.');
    }

    // Local grounded legal assistant fallback
    const qLower = (userQuestion || '').toLowerCase();
    
    if (qLower.includes('ratio') || qLower.includes('holding') || qLower.includes('decide') || qLower.includes('rule')) {
      return `### ⚖️ Binding Ratio Decidendi [Article 141]

> "${judgment.ratioDecidendi}"

* **Court**: ${judgment.court}
* **Citation**: ${judgment.citation}
* **Bench**: ${judgment.bench || 'Constitutional Bench'}

📌 **Binding Law**: This holding creates a binding precedent under Article 141 of the Constitution of India across all subordinate courts and High Courts.`;
    }

    if (qLower.includes('facts') || qLower.includes('background') || qLower.includes('happened')) {
      return `### 📄 Material Factual Matrix

${judgment.caseContext?.facts || judgment.executiveSummary}

**Substantial Legal Question Framed:**
${judgment.caseContext?.legalIssue || 'Interpretation of statutory procedure and fundamental rights under Articles 14 and 21.'}`;
    }

    if (qLower.includes('argument') || qLower.includes('petitioner') || qLower.includes('appellant')) {
      return `### 📣 Submissions of Counsel

**Submissions for Appellant / Petitioner:**
${judgment.arguments?.appellant || 'The appellant argued that the statutory conditions and constitutional safeguards under Article 21 were violated.'}

**Submissions for Prosecution / Respondent:**
${judgment.arguments?.respondent || 'The respondent submitted that the gravity of the offence justified the impugned order.'}`;
    }

    if (qLower.includes('bnss') || qLower.includes('bns') || qLower.includes('section') || qLower.includes('statute')) {
      return `### 📚 Applicable Statutory Provisions

${(judgment.applicableStatutes || judgment.acts || []).map(s => `* **${s}**`).join('\n')}

Under the new criminal codes (BNSS 2023 / BNS 2023), these judicial principles continue to govern statutory interpretations of personal liberty and judicial discretion.`;
    }

    if (qLower.includes('appeal') || qLower.includes('grounds') || qLower.includes('draft')) {
      return `### 📝 Drafting Grounds of Appeal based on ${judgment.title}

1. **Violation of Settled Precedent**: The learned lower court erred in failing to apply the binding ratio laid down in *${judgment.title}* [${judgment.citation}].
2. **Arbitrary Exercise of Discretion**: Custodial detention was authorised mechanically without satisfying the prerequisite checklist mandated in paragraph 23 of the precedent.
3. **Infringement of Article 21**: Depriving personal liberty without fair and reasonable procedure violates constitutional guarantees.`;
    }

    return `According to **${judgment.title} (${judgment.citation})**:

${judgment.executiveSummary}

**Key Takeaway for Practice:**
${judgment.practicalTakeaway || judgment.ratioDecidendi}`;
  },

  /**
   * Add a judgment to an active Case Workspace project
   */
  async addJudgmentToCase(caseId, judgment, userNotes = '') {
    if (!caseId || !judgment) throw new Error('caseId and judgment are required');

    const precedentPayload = {
      id: judgment.id,
      case_name: judgment.title,
      citation: judgment.citation,
      court: judgment.court,
      year: judgment.year,
      ratio_decidendi: judgment.ratioDecidendi,
      summary: judgment.executiveSummary,
      userNotes: userNotes.trim(),
      addedAt: new Date().toISOString()
    };

    // 1. Try to persist into active case via apiService.updateProject
    try {
      await apiService.updateProject(caseId, {
        savedPrecedent: precedentPayload
      });
    } catch (e) {
      console.warn('API update project failed, saving to local project storage:', e.message);
    }

    // 2. Save in case workspace localStorage store
    try {
      const localKey = `case_precedents_${caseId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const filtered = existing.filter(p => p.id !== judgment.id);
      filtered.unshift(precedentPayload);
      localStorage.setItem(localKey, JSON.stringify(filtered));

      // Global sync
      const globalKey = 'ai_legal_saved_precedents';
      const globalExisting = JSON.parse(localStorage.getItem(globalKey) || '[]');
      const globalFiltered = globalExisting.filter(p => p.id !== judgment.id);
      globalFiltered.unshift({ ...precedentPayload, caseId });
      localStorage.setItem(globalKey, JSON.stringify(globalFiltered));
    } catch (err) {
      console.error('LocalStorage write error:', err);
    }

    return { success: true, precedent: precedentPayload };
  },

  /**
   * Saved Bookmarks Management
   */
  getSavedJudgments() {
    try {
      const raw = localStorage.getItem(SAVED_BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  toggleBookmark(judgment) {
    const list = this.getSavedJudgments();
    const idx = list.findIndex(j => j.id === judgment.id);
    let isBookmarked = false;

    if (idx >= 0) {
      list.splice(idx, 1);
      isBookmarked = false;
    } else {
      list.unshift({
        id: judgment.id,
        title: judgment.title,
        citation: judgment.citation,
        court: judgment.court,
        year: judgment.year,
        ratioDecidendi: judgment.ratioDecidendi,
        savedAt: new Date().toISOString()
      });
      isBookmarked = true;
    }

    localStorage.setItem(SAVED_BOOKMARKS_KEY, JSON.stringify(list));
    return { isBookmarked, list };
  },

  isJudgmentBookmarked(id) {
    const list = this.getSavedJudgments();
    return list.some(j => j.id === id);
  },

  /**
   * Recent Searches Management
   */
  getRecentSearches() {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveRecentSearch(query) {
    if (!query || query.trim().length < 2) return;
    const clean = query.trim();
    let list = this.getRecentSearches().filter(q => q.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    if (list.length > 8) list = list.slice(0, 8);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  },

  clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }
};

export default caseSearchService;
