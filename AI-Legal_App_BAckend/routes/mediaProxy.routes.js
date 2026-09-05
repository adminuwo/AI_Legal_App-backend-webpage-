import express from 'express';
import { Storage } from '@google-cloud/storage';
import { optionalVerifyToken } from '../middleware/authorization.js';

const router = express.Router();
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

// Allowed domain suffixes for external media proxying
const ALLOWED_PROXY_HOSTS = [
  'storage.googleapis.com',
  'res.cloudinary.com',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'images.unsplash.com',
  'uwo24.com',
  'aisa.uwo24.com'
];

// Helper to check for private / internal / metadata IPs (SSRF protection)
const isPrivateHost = (hostname) => {
  if (!hostname) return true;
  const host = hostname.toLowerCase().trim();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '169.254.169.254' || // Cloud metadata service
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.17.') ||
    host.startsWith('172.18.') ||
    host.startsWith('172.19.') ||
    host.startsWith('172.20.') ||
    host.startsWith('172.31.')
  ) {
    return true;
  }
  return false;
};

/**
 * Proxy media from GCS to bypass client-side CORS/Auth issues when using ADC locally.
 * Usage: GET /api/media/proxy?url=https://storage.googleapis.com/bucket-name/folder/file.png
 */
router.get('/proxy', optionalVerifyToken, async (req, res) => {
  let { url } = req.query;
  
  if (!url) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    const parsed = new URL(url);

    // SSRF Check 1: Block non-http/https schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).send('Invalid URL protocol');
    }

    // SSRF Check 2: Block private / internal IPs
    if (isPrivateHost(parsed.hostname)) {
      return res.status(403).send('Forbidden: Access to private or internal IP addresses is blocked');
    }

    // SSRF Check 3: Domain allowlist verification
    const isAllowedHost = ALLOWED_PROXY_HOSTS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
    if (!isAllowedHost && process.env.NODE_ENV === 'production') {
      return res.status(403).send('Forbidden: Domain is not allowed for media proxying');
    }

    // Guard: Detect double-proxied URLs
    if (parsed.pathname.endsWith('/proxy') && parsed.searchParams.has('url')) {
      const innerUrl = parsed.searchParams.get('url');
      console.warn(`[Media Proxy] Double-proxy detected — unwrapping inner URL: ${innerUrl}`);
      url = innerUrl;
    }
  } catch (urlErr) {
    return res.status(400).send('Invalid absolute URL');
  }

  try {
    // 1. If it's a GCS URL, use the Storage SDK for authenticated/optimized access
    if (url.includes('storage.googleapis.com')) {
      const rawParts = url.split('storage.googleapis.com/')[1];

      // Safety guard: malformed or missing GCS path
      if (!rawParts) {
        return res.status(400).send('Invalid GCS URL — missing bucket/object path');
      }

      const bucketInUrl = rawParts.split('/')[0];
      let fileName = rawParts.split('/').slice(1).join('/');
      
      // Strip any query parameters strictly from the filename to accurately locate the object in GCS
      fileName = fileName.split('?')[0];

      const bucket = storage.bucket(bucketInUrl);
      const file = bucket.file(fileName);

      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).send('File not found in GCS');
      }

      const [metadata] = await file.getMetadata();
      res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); 
      
      file.createReadStream().pipe(res);
    } 
    // 2. If it's a generic external URL, use axios to proxy with timeout & size limits
    else {
      const axios = (await import('axios')).default;
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 10000,
        maxContentLength: 25 * 1024 * 1024,
        maxRedirects: 3
      });
      
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      response.data.pipe(res);
    }
  } catch (error) {
    console.error('[Media Proxy] Error proxying file:', error.message);
    if (!res.headersSent) {
      res.status(500).send('Failed to proxy media');
    }
  }
});

export default router;
