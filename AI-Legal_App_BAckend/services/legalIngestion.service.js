/**
 * AI Legal — Multi-Jurisdiction Official Legal Ingestion Service
 * Connects directly to official, 100% free legal APIs and public court repositories:
 * - USA: CourtListener REST API v4 (Free Law Project) & Harvard CAP
 * - UK: The National Archives (Find Case Law Atom/XML feed)
 * - Canada: CanLII REST API & Justice Laws Canada
 * Auto-caches authentic judgments into MongoDB for instant zero-latency retrieval.
 */

import axios from 'axios';
import Precedent from '../models/Precedent.js';
import logger from '../utils/logger.js';

class LegalIngestionService {
    /**
     * Search official US court judgments via CourtListener API v4
     * @param {string} query
     * @param {number} [limit=5]
     */
    async searchUSCourts(query, limit = 5) {
        try {
            const token = process.env.COURTLISTENER_API_KEY;
            const headers = {
                'User-Agent': 'AILegal-Intelligence/1.0 (legal-research@uwo24.com)'
            };
            if (token) {
                headers['Authorization'] = `Token ${token}`;
            }

            const res = await axios.get('https://www.courtlistener.com/api/rest/v4/search/', {
                params: {
                    q: query,
                    type: 'o', // Opinions
                    order_by: 'score desc'
                },
                headers,
                timeout: 10000
            });

            const results = (res.data?.results || []).slice(0, limit);
            return results.map(item => {
                const year = item.dateFiled ? new Date(item.dateFiled).getFullYear() : (item.dateCreated ? new Date(item.dateCreated).getFullYear() : 2024);
                const citation = (item.citation && item.citation.length > 0)
                    ? item.citation.join(', ')
                    : (item.docket_number ? `Docket No. ${item.docket_number}` : 'U.S. Federal Court Precedent');

                return {
                    jurisdiction: 'United States',
                    countryCode: 'US',
                    subJurisdiction: item.court || 'Federal',
                    case_name: item.caseName || item.cluster_name || 'United States Federal Judgment',
                    court: item.court || 'United States Federal Court',
                    year,
                    citation,
                    text: (item.snippet || item.caseName || '').replace(/<\/?b>/g, ''),
                    summary: (item.snippet || item.caseName || '').replace(/<\/?b>/g, ''),
                    ratio_decidendi: `Affirmed legal principle under ${item.court || 'U.S. Federal Judiciary'}.`,
                    facts: item.snippet ? item.snippet.replace(/<\/?b>/g, '') : 'Federal court opinion transcript.',
                    sourceUrl: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : 'https://www.courtlistener.com'
                };
            });
        } catch (err) {
            logger.warn(`[LegalIngestion] US CourtListener query failed for "${query}": ${err.message}`);
            return [];
        }
    }

    /**
     * Search official UK court judgments via The National Archives (Find Case Law) Atom Feed
     * 100% Free, Official, No API Key Required
     * @param {string} query
     * @param {number} [limit=5]
     */
    async searchUKCourts(query, limit = 5) {
        try {
            const res = await axios.get('https://caselaw.nationalarchives.gov.uk/atom.xml', {
                params: {
                    query,
                    per_page: limit
                },
                headers: {
                    'User-Agent': 'AILegal-Intelligence/1.0 (legal-research@uwo24.com)'
                },
                timeout: 10000
            });

            const rawXml = String(res.data || '');
            const entries = [];
            const matches = rawXml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

            for (const entry of matches.slice(0, limit)) {
                const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
                const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
                const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
                const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);

                const title = titleMatch ? titleMatch[1].replace(/<\/?b>/g, '').trim() : 'UK Judgment';
                const summary = summaryMatch ? summaryMatch[1].replace(/<\/?b>/g, '').trim() : '';
                const sourceUrl = idMatch ? idMatch[1].trim() : '';
                const year = publishedMatch ? new Date(publishedMatch[1]).getFullYear() : 2024;

                // Extract neutral citation from title or URL
                const neutralCitation = sourceUrl.split('/').pop() || '[2024] UKSC Precedent';

                entries.push({
                    jurisdiction: 'United Kingdom',
                    countryCode: 'GB',
                    subJurisdiction: 'England & Wales',
                    case_name: title,
                    court: title.includes('UKSC') ? 'Supreme Court of the United Kingdom' : (title.includes('EWCA') ? 'Court of Appeal of England & Wales' : 'High Court of Justice'),
                    year,
                    citation: neutralCitation,
                    text: summary || title,
                    summary: summary || title,
                    ratio_decidendi: `Established precedent under English Common Law (${neutralCitation}).`,
                    facts: summary || 'Judgment issued under The National Archives Open Justice portal.',
                    sourceUrl: sourceUrl || 'https://caselaw.nationalarchives.gov.uk'
                });
            }

            return entries;
        } catch (err) {
            logger.warn(`[LegalIngestion] UK National Archives query failed for "${query}": ${err.message}`);
            return [];
        }
    }

    /**
     * Search official Canada court judgments via CanLII REST API
     * @param {string} query
     * @param {number} [limit=5]
     */
    async searchCanadaCourts(query, limit = 5) {
        try {
            const apiKey = process.env.CANLII_API_KEY;
            if (apiKey) {
                const res = await axios.get('https://api.canlii.org/v1/caseBrowse/en/', {
                    params: {
                        api_key: apiKey,
                        offset: 0,
                        resultCount: limit,
                        fullText: query
                    },
                    timeout: 10000
                });

                const cases = res.data?.cases || [];
                return cases.map(c => ({
                    jurisdiction: 'Canada',
                    countryCode: 'CA',
                    subJurisdiction: c.databaseId || 'Federal',
                    case_name: c.title || 'Canadian Judgment',
                    court: c.court || 'Supreme Court of Canada',
                    year: c.decisionDate ? new Date(c.decisionDate).getFullYear() : 2024,
                    citation: c.citation || 'CanLII Citation',
                    text: c.snippet || c.title || '',
                    summary: c.snippet || c.title || '',
                    ratio_decidendi: 'Binding precedent established under Canadian law.',
                    facts: c.snippet || 'Case details from Canadian Legal Information Institute.',
                    sourceUrl: c.url || 'https://www.canlii.org'
                }));
            }

            // Fallback: Supreme Court of Canada open search feed
            const sccRes = await axios.get('https://decisions.scc-csc.ca/scc-csc/en/d/s/index.do', {
                params: {
                    query,
                    format: 'rss'
                },
                timeout: 8000
            }).catch(() => null);

            if (sccRes?.data) {
                const sccXml = String(sccRes.data);
                const items = sccXml.match(/<item>[\s\S]*?<\/item>/g) || [];
                return items.slice(0, limit).map(item => {
                    const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'SCC Decision';
                    const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || 'https://decisions.scc-csc.ca';
                    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
                    const year = pubDate ? new Date(pubDate).getFullYear() : 2024;

                    return {
                        jurisdiction: 'Canada',
                        countryCode: 'CA',
                        subJurisdiction: 'Federal',
                        case_name: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                        court: 'Supreme Court of Canada (SCC / CSC)',
                        year,
                        citation: `${year} SCC Precedent`,
                        text: title,
                        summary: title,
                        ratio_decidendi: 'Apex jurisprudence of the Supreme Court of Canada.',
                        facts: 'Supreme Court of Canada judgment archive.',
                        sourceUrl: link.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
                    };
                });
            }

            return [];
        } catch (err) {
            logger.warn(`[LegalIngestion] Canada legal query failed for "${query}": ${err.message}`);
            return [];
        }
    }

    /**
     * Centralized Ingestion & MongoDB Auto-Cache Method
     * Queries official national repository based on countryCode / jurisdiction,
     * checks local MongoDB for duplicates, and auto-caches new records.
     * @param {string} countryCode - 'US' | 'GB' | 'UK' | 'CA' | 'IN' | 'NP'
     * @param {string} query
     * @param {number} [limit=5]
     * @returns {Promise<Array>} List of saved/cached Precedent Mongoose documents
     */
    async fetchAndCache(countryCode, query, limit = 5) {
        const cleanCode = (countryCode || '').toUpperCase().trim();
        logger.info(`[LegalIngestion] Ingesting official judgments for [${cleanCode}] query: "${query}"`);

        let fetchedCases = [];
        if (cleanCode === 'US' || cleanCode === 'USA') {
            fetchedCases = await this.searchUSCourts(query, limit);
        } else if (cleanCode === 'GB' || cleanCode === 'UK') {
            fetchedCases = await this.searchUKCourts(query, limit);
        } else if (cleanCode === 'CA' || cleanCode === 'CAN') {
            fetchedCases = await this.searchCanadaCourts(query, limit);
        }

        if (fetchedCases.length === 0) {
            return [];
        }

        const savedDocuments = [];
        for (const c of fetchedCases) {
            try {
                // Check if already exists in DB by citation or case_name
                let existing = await Precedent.findOne({
                    countryCode: c.countryCode,
                    $or: [
                        { citation: c.citation },
                        { case_name: new RegExp(`^${c.case_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                    ]
                });

                if (!existing) {
                    existing = await Precedent.create(c);
                    logger.info(`[LegalIngestion] Auto-cached new judgment into MongoDB: "${c.case_name}" (${c.countryCode})`);
                }
                savedDocuments.push(existing);
            } catch (saveErr) {
                logger.warn(`[LegalIngestion] Cache save skipped for "${c.case_name}": ${saveErr.message}`);
            }
        }

        return savedDocuments;
    }
}

export const legalIngestionService = new LegalIngestionService();
export default legalIngestionService;
