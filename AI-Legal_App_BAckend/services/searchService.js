import axios from 'axios';
import google from 'googlethis';

/**
 * Search Service for AISA
 * Integrates with external search APIs for real-time information
 */

const SEARCH_API_KEY = process.env.SEARCH_API_KEY || '';
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID || '';
const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || 'google'; // google, serpapi, bing

/**
 * Perform web search using configured provider
 */
export async function performWebSearch(query, maxResults = 5) {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Search timeout")), 10000));
    try {
        console.log(`[SEARCH] Performing web search for: "${query}"`);
        const searchTask = (async () => {
            if (SEARCH_PROVIDER === 'google' && SEARCH_API_KEY && SEARCH_ENGINE_ID) {
                return await googleCustomSearch(query, maxResults);
            } else if (SEARCH_PROVIDER === 'serpapi' && SEARCH_API_KEY) {
                return await serpApiSearch(query, maxResults);
            }

            console.log('[SEARCH] Using scraper-based search (googlethis)...');
            const options = { page: 0, safe: true, additional_params: { hl: 'en' } };
            const response = await google.search(query, options);
            if (!response || !response.results || !Array.isArray(response.results)) {
                console.warn(`[SEARCH] googlethis returned no results for: ${query}`);
                return null;
            }

            return {
                results: response.results.slice(0, maxResults).map(item => ({
                    title: item.title,
                    snippet: item.description || item.snippet || '',
                    link: item.url || item.link,
                    source: extractDomain(item.url || item.link)
                }))
            };
        })();

        return await Promise.race([searchTask, timeoutPromise]);
    } catch (error) {
        console.error('[SEARCH] Error or Timeout performing web search:', error.message);
        return null;
    }
}

/**
 * Google Custom Search API
 */
async function googleCustomSearch(query, maxResults) {
    const url = 'https://www.googleapis.com/customsearch/v1';

    const response = await axios.get(url, {
        params: {
            key: SEARCH_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query,
            num: maxResults
        }
    });

    if (!response.data.items) {
        return null;
    }

    return {
        results: response.data.items.map(item => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            source: extractDomain(item.link)
        }))
    };
}

/**
 * SerpAPI Search
 */
async function serpApiSearch(query, maxResults) {
    const url = 'https://serpapi.com/search';

    const response = await axios.get(url, {
        params: {
            api_key: SEARCH_API_KEY,
            q: query,
            num: maxResults,
            engine: 'google'
        }
    });

    if (!response.data.organic_results) {
        return null;
    }

    return {
        results: response.data.organic_results.map(item => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            source: extractDomain(item.link)
        }))
    };
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'Unknown Source';
    }
}


export { SEARCH_API_KEY, SEARCH_ENGINE_ID, SEARCH_PROVIDER };
