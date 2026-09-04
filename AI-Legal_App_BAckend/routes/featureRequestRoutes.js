import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import User from '../models/User.js';
import FeatureRequest from '../models/FeatureRequest.js';
import { getIO } from '../utils/socket.js';

const router = express.Router();

// GET all Feature Requests (with search, pagination, filtering)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { search, priority, category, plan, status, page = 1, limit = 50 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (priority) query.priority = priority;
        if (category) query.category = category;
        if (plan) query.userPlan = plan;
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const list = await FeatureRequest.find(query)
            .populate('requestedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await FeatureRequest.countDocuments(query);

        res.status(200).json({ success: true, list, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST submit Feature Request
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, priority, category, attachments } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const reqDoc = await FeatureRequest.create({
            title,
            description,
            requestedBy: user._id,
            email: user.email,
            userPlan: user.role === 'admin' ? 'Enterprise' : 'Free', // Or read current subscription
            priority,
            category,
            attachments
        });

        // Trigger Socket.io real-time update
        try {
            const io = getIO();
            io.emit('feature:submitted', reqDoc);
        } catch (e) {
            console.warn('[Socket] Failed to broadcast feature request submission:', e.message);
        }

        res.status(201).json({ success: true, featureRequest: reqDoc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update Feature Request (Admin Only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await FeatureRequest.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Feature request not found' });

        // Trigger Socket.io real-time update
        try {
            const io = getIO();
            io.emit('feature:updated', updated);
        } catch (e) {
            console.warn('[Socket] Failed to broadcast feature request update:', e.message);
        }

        res.status(200).json({ success: true, featureRequest: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE Feature Request (Admin Only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await FeatureRequest.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Feature request deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
