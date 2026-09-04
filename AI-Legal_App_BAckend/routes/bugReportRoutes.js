import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import User from '../models/User.js';
import BugReport from '../models/BugReport.js';
import { getIO } from '../utils/socket.js';

const router = express.Router();

// GET all Bug Reports
router.get('/', verifyToken, async (req, res) => {
    try {
        const { search, severity, platform, status, page = 1, limit = 50 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (severity) query.severity = severity;
        if (platform) query.platform = platform;
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const list = await BugReport.find(query)
            .populate('reporter', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await BugReport.countDocuments(query);

        res.status(200).json({ success: true, list, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST submit Bug Report
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, device, platform, appVersion, osVersion, screenshot, logFile, severity } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const bugDoc = await BugReport.create({
            title,
            description,
            reporter: user._id,
            email: user.email,
            device,
            platform,
            appVersion,
            osVersion,
            screenshot,
            logFile,
            severity
        });

        // Trigger Socket.io real-time update
        try {
            const io = getIO();
            io.emit('bug:submitted', bugDoc);
        } catch (e) {
            console.warn('[Socket] Failed to broadcast bug report submission:', e.message);
        }

        res.status(201).json({ success: true, bugReport: bugDoc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update Bug Report (Admin Only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await BugReport.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Bug report not found' });

        // Trigger Socket.io real-time update
        try {
            const io = getIO();
            io.emit('bug:updated', updated);
        } catch (e) {
            console.warn('[Socket] Failed to broadcast bug report update:', e.message);
        }

        res.status(200).json({ success: true, bugReport: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE Bug Report (Admin Only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await BugReport.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Bug report deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
