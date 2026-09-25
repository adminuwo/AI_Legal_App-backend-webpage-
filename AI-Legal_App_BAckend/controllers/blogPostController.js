import BlogPost from '../models/BlogPost.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOG_UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'blogs');

/**
 * Save base64 image data URL to disk to prevent massive BSON documents in MongoDB
 */
function saveBase64Image(dataString, slug = 'blog') {
    if (!dataString || typeof dataString !== 'string') return dataString || '';
    if (!dataString.startsWith('data:image/')) return dataString;

    try {
        if (!fs.existsSync(BLOG_UPLOADS_DIR)) {
            fs.mkdirSync(BLOG_UPLOADS_DIR, { recursive: true });
        }

        const matches = dataString.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length < 3) return dataString;

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const safeSlug = (slug || 'blog').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40);
        const filename = `blog_${safeSlug}_${Date.now()}.${ext}`;
        const filePath = path.join(BLOG_UPLOADS_DIR, filename);

        fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        return `/uploads/blogs/${filename}`;
    } catch (err) {
        console.error('[Save Blog Image Error]:', err);
        return dataString;
    }
}

/**
 * Generate clean URL-friendly slug
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Public Endpoint: Get all published blogs
 * GET /api/blogs
 */
export async function getAllBlogPosts(req, res) {
    try {
        const { category, search, limit = 50 } = req.query;
        const query = { status: 'Published' };

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { title: regex },
                { summary: regex },
                { category: regex },
                { author: regex }
            ];
        }

        const blogs = await BlogPost.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit, 10))
            .lean();

        return res.json({
            success: true,
            blogs
        });
    } catch (error) {
        console.error('[Get Blogs Error]:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve blog posts.'
        });
    }
}

/**
 * Public Endpoint: Get single blog post by slug
 * GET /api/blogs/:slug
 */
export async function getBlogPostBySlug(req, res) {
    try {
        const { slug } = req.params;
        const blog = await BlogPost.findOne({ slug });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Article not found.'
            });
        }

        return res.json({
            success: true,
            blog
        });
    } catch (error) {
        console.error('[Get Blog By Slug Error]:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve article.'
        });
    }
}

/**
 * In-House / Editorial Endpoint: Publish or Draft New Blog Post
 * POST /api/blogs/publish
 */
export async function createBlogPost(req, res) {
    try {
        const {
            title,
            subtitle,
            keywords,
            description,
            image,
            category,
            author,
            authorRole,
            readTime,
            summary,
            content,
            tags,
            coverImage,
            hasMobileDownload,
            isFeatured,
            status = 'Published'
        } = req.body;

        const finalTitle = (title || '').trim();
        const finalSubtitle = (subtitle || summary || '').trim();
        const finalContent = (description || content || '').trim();
        const finalKeywords = Array.isArray(keywords) ? keywords : (Array.isArray(tags) ? tags : ((keywords || tags || '').split(',').map(t => t.trim()).filter(Boolean)));
        const finalImage = (image || coverImage || '').trim();

        if (!finalTitle) {
            return res.status(400).json({ success: false, message: 'Article title is required.' });
        }
        if (!finalSubtitle) {
            return res.status(400).json({ success: false, message: 'Article subtitle/summary is required.' });
        }
        if (!finalContent) {
            return res.status(400).json({ success: false, message: 'Article description/content is required.' });
        }

        // Generate a unique slug
        let baseSlug = slugify(finalTitle);
        if (!baseSlug) baseSlug = `article-${Date.now()}`;
        
        let uniqueSlug = baseSlug;
        let count = 1;
        while (await BlogPost.exists({ slug: uniqueSlug })) {
            uniqueSlug = `${baseSlug}-${count}`;
            count++;
        }

        // Estimate read time if not provided
        let estimatedReadTime = readTime;
        if (!estimatedReadTime) {
            const wordCount = finalContent.split(/\s+/).length;
            const minutes = Math.max(1, Math.ceil(wordCount / 200));
            estimatedReadTime = `${minutes} min read`;
        }

        const savedImage = saveBase64Image(finalImage, uniqueSlug);

        const newPost = await BlogPost.create({
            title: finalTitle,
            subtitle: finalSubtitle,
            summary: finalSubtitle,
            description: finalContent,
            content: finalContent,
            slug: uniqueSlug,
            category: (category || 'Legal Insights').trim(),
            author: (author || 'AI LEGAL™ In-House Editorial Board').trim(),
            authorRole: (authorRole || 'Legal Intelligence Team').trim(),
            readTime: estimatedReadTime,
            keywords: finalKeywords,
            tags: finalKeywords,
            image: savedImage,
            coverImage: savedImage,
            hasMobileDownload: Boolean(hasMobileDownload),
            isFeatured: Boolean(isFeatured),
            status,
            source: 'inhouse'
        });

        console.log(`[Blog Published] ✅ In-house article published: "${newPost.title}" (/blog/${newPost.slug})`);

        return res.status(201).json({
            success: true,
            message: 'In-House article published successfully!',
            blog: newPost
        });
    } catch (error) {
        console.error('[Publish Blog Error]:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to publish article.'
        });
    }
}

/**
 * Editorial Endpoint: Update an existing blog post
 * PUT /api/blogs/:id
 */
export async function updateBlogPost(req, res) {
    try {
        const { id } = req.params;
        const {
            title,
            subtitle,
            keywords,
            description,
            image,
            category,
            author,
            authorRole,
            readTime,
            summary,
            content,
            tags,
            coverImage,
            hasMobileDownload,
            isFeatured,
            status
        } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (subtitle !== undefined) {
            updateData.subtitle = subtitle.trim();
            updateData.summary = subtitle.trim();
        } else if (summary !== undefined) {
            updateData.subtitle = summary.trim();
            updateData.summary = summary.trim();
        }

        if (description !== undefined) {
            updateData.description = description.trim();
            updateData.content = description.trim();
        } else if (content !== undefined) {
            updateData.description = content.trim();
            updateData.content = content.trim();
        }

        if (keywords !== undefined) {
            const arr = Array.isArray(keywords) ? keywords : keywords.split(',').map(t => t.trim()).filter(Boolean);
            updateData.keywords = arr;
            updateData.tags = arr;
        } else if (tags !== undefined) {
            const arr = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
            updateData.keywords = arr;
            updateData.tags = arr;
        }

        if (image !== undefined) {
            const savedImg = saveBase64Image(image.trim(), id);
            updateData.image = savedImg;
            updateData.coverImage = savedImg;
        } else if (coverImage !== undefined) {
            const savedImg = saveBase64Image(coverImage.trim(), id);
            updateData.image = savedImg;
            updateData.coverImage = savedImg;
        }

        if (category !== undefined) updateData.category = category.trim();
        if (author !== undefined) updateData.author = author.trim();
        if (authorRole !== undefined) updateData.authorRole = authorRole.trim();
        if (readTime !== undefined) updateData.readTime = readTime;
        if (hasMobileDownload !== undefined) updateData.hasMobileDownload = Boolean(hasMobileDownload);
        if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
        if (status !== undefined) updateData.status = status;

        const updated = await BlogPost.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Article not found.' });
        }

        console.log(`[Blog Updated] ✏️ In-house article updated: "${updated.title}"`);

        return res.json({
            success: true,
            message: 'Article updated successfully!',
            blog: updated
        });
    } catch (error) {
        console.error('[Update Blog Error]:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update article.'
        });
    }
}

/**
 * Editorial Endpoint: Delete a blog post
 * DELETE /api/blogs/:id
 */
export async function deleteBlogPost(req, res) {
    try {
        const { id } = req.params;
        const deleted = await BlogPost.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Article not found.' });
        }

        return res.json({
            success: true,
            message: 'Article removed successfully.'
        });
    } catch (error) {
        console.error('[Delete Blog Error]:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete article.' });
    }
}

