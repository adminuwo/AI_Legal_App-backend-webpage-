import express from 'express';
import { verifyToken, optionalVerifyToken } from '../middleware/authorization.js';
import { 
    createNotification, 
    getNotifications, 
    markAsRead, 
    markAllRead, 
    deleteNotification, 
    deleteAll, 
    getUnreadCount 
} from '../services/notificationService.js';
import userModel from '../models/User.js';

const router = express.Router();

// GET /api/notifications - Get user notifications
router.get('/', optionalVerifyToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(200).json([]);
        }
        const userId = req.user.id || req.user._id;
        const category = req.query.category;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const inbox = await getNotifications(userId, { category, page, limit });
        res.status(200).json(inbox);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const count = await getUnreadCount(userId);
        res.status(200).json({ success: true, count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/test - Trigger a test notification (For Demo/Testing)
router.post('/test', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const payload = req.body;

        const notification = await createNotification(userId, {
            title: payload.title || 'Real-time Legal Alert',
            desc: payload.desc || payload.message || 'Event triggered successfully via backend notification engine.',
            category: payload.category || 'Cases',
            priority: payload.priority || 'Medium',
            caseName: payload.caseName || '',
            caseId: payload.caseId || null,
            type: payload.type || 'info',
            data: payload.data || null
        });

        res.status(201).json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/register-token - Register push notification token
router.post('/register-token', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "Token is required" });

        await userModel.findByIdAndUpdate(userId, {
            $set: { pushToken: token }
        });

        res.status(200).json({ success: true, message: "Push token registered successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await markAllRead(userId);
        res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { id } = req.params;
        await markAsRead(userId, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { id } = req.params;
        await deleteNotification(userId, id);
        res.json({ success: true, msg: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/notifications - Clear all notifications
router.delete('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await deleteAll(userId);
        res.json({ success: true, msg: "All notifications cleared" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
