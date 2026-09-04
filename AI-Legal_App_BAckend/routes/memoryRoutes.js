import express from 'express';
import UserMemory from '../models/UserMemory.js';
import { verifyToken } from '../middleware/authorization.js';

const router = express.Router();

// Get User Memory
router.get('/', verifyToken, async (req, res) => {
    try {
        let memory = await UserMemory.findOne({ userId: req.user.id });
        if (!memory) {
            memory = new UserMemory({ userId: req.user.id });
            await memory.save();
        }
        res.json(memory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch memory' });
    }
});

// Update User Memory
router.put('/', verifyToken, async (req, res) => {
    try {
        const { name, businessType, interests, goals, preferences, isMemoryEnabled } = req.body;

        const memory = await UserMemory.findOneAndUpdate(
            { userId: req.user.id },
            {
                $set: {
                    name,
                    businessType,
                    interests,
                    goals,
                    preferences,
                    isMemoryEnabled,
                    updatedAt: Date.now()
                }
            },
            { new: true, upsert: true }
        );

        res.json(memory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update memory' });
    }
});

// Delete (Reset) Memory
router.delete('/', verifyToken, async (req, res) => {
    try {
        await UserMemory.findOneAndDelete({ userId: req.user.id });
        res.json({ message: 'Memory cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear memory' });
    }
});

export default router;
