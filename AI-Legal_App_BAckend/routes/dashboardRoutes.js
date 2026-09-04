import express from 'express';
const router = express.Router();

// Placeholder for dashboard routes to prevent 404s
router.get('/stats', (req, res) => {
    res.json({ success: true, stats: {} });
});

export default router;
