import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger.js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import crypto from 'crypto';

/**
 * Scrape content from a URL
 */
export const scrapeUrl = async (url) => {
    try {
        logger.info(`Scraping URL: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // Remove scripts, styles, and other noise
        $('script, style, nav, footer, header, ads, .ads, #ads, .sidebar, #sidebar, .menu, #menu, .modal, .overlay, .popup, .footer, .header, video, audio, iframe, noscript').remove();

        // Extract Title
        const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';

        // Extract main text - try the most common content containers first
        let mainText = $('article, main, [role="main"], .content, #content, .post, #post, .post-content, .entry-content, .article-content').text();
        
        // If main containers not found or empty, fall back to body but filter it
        if (!mainText || mainText.trim().length < 200) {
            mainText = $('body').text();
        }

        // Clean and normalize text
        const cleanedText = mainText
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .replace(/Click here|Read more|Follow us|Sign up|Log in|Privacy Policy|Terms of Service/gi, '') // Remove common link text noise
            .trim();

        // If the resulting text is too short, it's likely a junk page or splash page
        if (cleanedText.length < 150) {
            logger.info(`Skipping page ${url} - Content too thin (${cleanedText.length} chars)`);
            return null;
        }

        return {
            title,
            text: cleanedText,
            url
        };
    } catch (error) {
        logger.error(`Scraping Error for ${url}: ${error.message}`);
        throw new Error(`Failed to scrape URL: ${error.message}`);
    }
};

/**
 * Split text into chunks
 */
export const chunkText = async (text, metadata = {}) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
    });

    const docs = await splitter.createDocuments([text], [metadata]);
    return docs;
};

/**
 * Generate a hash for content to prevent duplicates
 */
export const generateHash = (content) => {
    return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Crawl internal links with depth and limit
 */
export const crawlWebsite = async (startUrl, maxDepth = 2, maxPages = 20) => {
    const visited = new Set();
    const queue = [{ url: startUrl, depth: 1 }];
    const results = [];
    const domain = new URL(startUrl).hostname;

    while (queue.length > 0 && results.length < maxPages) {
        const { url, depth } = queue.shift();

        if (visited.has(url)) continue;
        visited.add(url);

        try {
            const content = await scrapeUrl(url);
            if (content) {
                results.push(content);
            }

            if (depth < maxDepth) {
                // Find more links
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);
                
                $('a').each((i, el) => {
                    let href = $(el).attr('href');
                    if (!href) return;

                    try {
                        const absoluteUrl = new URL(href, url).href;
                        const targetUrl = new URL(absoluteUrl);

                        // Only internal links, no fragments, no mailto
                        if (targetUrl.hostname === domain && 
                            !targetUrl.hash && 
                            targetUrl.protocol.startsWith('http')) {
                            
                            const cleanUrl = targetUrl.origin + targetUrl.pathname;
                            if (!visited.has(cleanUrl)) {
                                queue.push({ url: cleanUrl, depth: depth + 1 });
                            }
                        }
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                });
            }
        } catch (error) {
            logger.warn(`Crawling failed for ${url}: ${error.message}`);
        }
    }

    return results;
};

/**
 * Process URL ingestion: Crawl, Scrape, Hash, Save to GCS, Store Metadata, Import to Vertex
 */
export const processUrlIngestion = async (url, sourceId = null, options = {}) => {
    const { category = 'Web', maxDepth = 2, maxPages = 20 } = options;
    
    logger.info(`[Ingestion] Starting process for ${url} (Source: ${sourceId || 'Manual'})`);
    
    const parsedUrl = new URL(url);
    const isRootDomain = parsedUrl.pathname === '/' || parsedUrl.pathname === '';
    
    let pagesToProcess = [];
    if (isRootDomain) {
        pagesToProcess = await crawlWebsite(url, maxDepth, maxPages);
    } else {
        const page = await scrapeUrl(url);
        if (page) pagesToProcess = [page];
    }
    
    if (pagesToProcess.length === 0) {
        throw new Error('No content could be extracted from the URL');
    }

    const { Storage } = await import('@google-cloud/storage');
    const Knowledge = (await import('../models/Knowledge.model.js')).default;
    const vertexService = await import('./vertex.service.js');
    
    const storageOptions = process.env.GCP_PROJECT_ID ? { projectId: process.env.GCP_PROJECT_ID } : {};
    const storageClient = new Storage(storageOptions);
    const bucketName = 'aisa_knowledge_base';
    const bucket = storageClient.bucket(bucketName);

    const results = [];
    const gcsUris = [];

    for (const page of pagesToProcess) {
        const contentHash = generateHash(page.text);
        
        // Change Detection: Check if content with this hash already exists
        const existing = await Knowledge.findOne({ contentHash });
        if (existing) {
            logger.info(`[Ingestion] Skipping unchanged content from ${page.url}`);
            continue;
        }

        // Check if there's an old version for this specific URL and delete it if so
        const oldVersion = await Knowledge.findOne({ sourceUrl: page.url });
        if (oldVersion) {
            logger.info(`[Ingestion] Found old version of ${page.url}, cleaning up...`);
            // Delete from GCS
            if (oldVersion.gcsUri) {
                try {
                    const urlParts = oldVersion.gcsUri.replace('gs://', '').split('/');
                    const bName = urlParts[0];
                    const fName = urlParts.slice(1).join('/');
                    await storageClient.bucket(bName).file(fName).delete();
                } catch (e) { logger.warn(`[Ingestion] GCS Delete failed: ${e.message}`); }
                
                // Delete from Vertex
                vertexService.deleteFromVertexRag(oldVersion.gcsUri, oldVersion.filename).catch(e => {
                    logger.warn(`[Ingestion] Vertex RAG delete failed: ${e.message}`);
                });
            }
            await Knowledge.findByIdAndDelete(oldVersion._id);
        }

        // Save new content to GCS
        const domain = parsedUrl.hostname;
        const fileName = `website-knowledge/${domain}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
        const fileRef = bucket.file(fileName);
        
        await fileRef.save(page.text, {
            contentType: 'text/plain',
            resumable: false,
            metadata: {
                sourceUrl: page.url,
                title: page.title,
                ingestedAt: new Date().toISOString()
            }
        });

        const gcsUri = `gs://${bucketName}/${fileName}`;
        gcsUris.push(gcsUri);

        // Estimate chunks for display
        const chunks = await chunkText(page.text);

        // Store metadata in MongoDB
        await Knowledge.create({
            filename: page.title || fileName,
            gcsUri: gcsUri,
            mimetype: 'text/plain',
            size: Buffer.byteLength(page.text),
            category: category,
            sourceUrl: page.url,
            contentHash: contentHash,
            knowledgeSourceId: sourceId,
            totalChunks: chunks.length,
            status: 'Active'
        });

        results.push({
            url: page.url,
            title: page.title,
            gcsUri: gcsUri
        });
    }

    // Batch Import to Vertex RAG Engine
    if (gcsUris.length > 0) {
        logger.info(`[Ingestion] Importing ${gcsUris.length} new/updated files to Vertex RAG.`);
        await vertexService.importToVertexRag(gcsUris, `Update: ${url}`);
    }

    return {
        total_pages: pagesToProcess.length,
        updated_pages: results.length,
        results
    };
};
