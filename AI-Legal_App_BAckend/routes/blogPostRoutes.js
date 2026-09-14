import express from 'express';
import {
    getAllBlogPosts,
    getBlogPostBySlug,
    createBlogPost,
    updateBlogPost,
    deleteBlogPost
} from '../controllers/blogPostController.js';

const router = express.Router();

// ─── Public Blog Routes ──────────────────────────────────────────────────────
router.get('/', getAllBlogPosts);
router.get('/:slug', getBlogPostBySlug);

// ─── In-House Publishing & Management Routes ─────────────────────────────────
router.post('/publish', createBlogPost);
router.post('/', createBlogPost);
router.put('/:id', updateBlogPost);
router.patch('/:id', updateBlogPost);
router.delete('/:id', deleteBlogPost);

export default router;
