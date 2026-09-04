import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import ChatSession from '../models/ChatSession.js';
import UserMemory from '../models/UserMemory.js';
import Reminder from '../models/Reminder.js';
import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
const router = express.Router();

/**
 * DELETE /api/user/data
 * GDPR / CCPA compliant data deletion endpoint
 * Deletes all user-generated data (chats, memory, reminders, feedback)
 * Payment/Transaction records are retained for legal/financial compliance
 */
router.delete('/data', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const results = {};

        // 1. Delete Chat Sessions
        const chatResult = await ChatSession.deleteMany({ userId });
        results.chatSessions = chatResult.deletedCount;

        // 2. Delete AI Memory
        const memoryResult = await UserMemory.deleteMany({ userId });
        results.memory = memoryResult.deletedCount;

        // 3. Delete Reminders
        const reminderResult = await Reminder.deleteMany({ userId });
        results.reminders = reminderResult.deletedCount;

        // 5. Delete Feedback
        const feedbackResult = await Feedback.deleteMany({ userId });
        results.feedback = feedbackResult.deletedCount;

        // 6. Delete Notifications
        const notifResult = await Notification.deleteMany({ userId });
        results.notifications = notifResult.deletedCount;

        console.log(`[DATA DELETION] User ${userId} - Deleted:`, results);

        res.status(200).json({
            success: true,
            message: 'Your personal data has been successfully deleted in accordance with applicable privacy regulations.',
            details: results,
            note: 'Payment and transaction records are retained for legal and financial compliance as required by law.'
        });

    } catch (error) {
        console.error('[DATA DELETION ERROR]', error);
        res.status(500).json({
            success: false,
            error: `Failed to process data deletion request. Please contact support at ${process.env.ADMIN_EMAIL || 'admin@aisa24.com'} for assistance.`
        });
    }
});

/**
 * GET /api/user/data/export
 * Data portability endpoint — allows users to request their data
 */
router.get('/data/export', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [chatSessions, memory, reminders] = await Promise.all([
            ChatSession.find({ userId }).select('-__v').lean(),
            UserMemory.findOne({ userId }).select('-__v').lean(),
            Reminder.find({ userId }).select('-__v').lean()
        ]);

        res.status(200).json({
            success: true,
            exportDate: new Date().toISOString(),
            data: {
                chatSessions: chatSessions || [],
                memory: memory || null,
                reminders: reminders || []
            }
        });

    } catch (error) {
        console.error('[DATA EXPORT ERROR]', error);
        res.status(500).json({
            success: false,
            error: `Failed to export data. Please contact support at ${process.env.ADMIN_EMAIL || 'admin@aisa24.com'} for assistance.`
        });
    }
});

export default router;
