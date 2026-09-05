import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import { verifyFeatureAccess } from '../middleware/subscriptionCheck.middleware.js';
import StudentNote from '../models/StudentNote.js';

const router = express.Router();

const getUserId = (req) => {
    return req.user?.id || req.user?._id || req.user?.userId;
};

// @route   POST /api/student-notes
// @desc    Save a new student note
// @access  Private
router.post('/', verifyToken, verifyFeatureAccess('notes_maker'), async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized user identity.' });
        }

        const {
            title,
            originalInput,
            inputSource,
            academicLevel,
            noteFormat,
            generatedNotes,
            language,
        } = req.body;

        const noteTitle = (title || 'Personal Study Note').trim();
        const noteContent = generatedNotes || originalInput || '';

        if (!noteContent) {
            return res.status(400).json({ success: false, error: 'Note content is required.' });
        }

        const newNote = new StudentNote({
            userId,
            title: noteTitle,
            originalInput: originalInput || noteContent,
            inputSource: inputSource || 'manual',
            academicLevel: academicLevel || 'BA LLB',
            noteFormat: noteFormat || 'As Written',
            generatedNotes: noteContent,
            language: language || 'English',
        });

        await newNote.save();

        if (req.commitUsage) await req.commitUsage();
        const FeatureAccessManager = await import('../services/featureAccessManager.js');
        await FeatureAccessManager.incrementUsage(userId, 'notes_maker');
        const latestUsageStatus = await FeatureAccessManager.getUsageStatus(userId);

        res.status(201).json({ success: true, note: newNote, usageStatus: latestUsageStatus });
    } catch (error) {
        console.error('[STUDENT NOTE CREATE ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to save student note.', details: error.message });
    }
});

// @route   GET /api/student-notes
// @desc    List all saved student notes for logged-in user
// @access  Private
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized user identity.' });
        }

        const notes = await StudentNote.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, notes });
    } catch (error) {
        console.error('[STUDENT NOTE LIST ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to fetch student notes.' });
    }
});

// @route   GET /api/student-notes/:id
// @desc    Get a single saved student note by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const note = await StudentNote.findOne({ _id: req.params.id, userId }).lean();
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found.' });
        }

        res.json({ success: true, note });
    } catch (error) {
        console.error('[STUDENT NOTE GET ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to fetch note details.' });
    }
});

// @route   PUT /api/student-notes/:id
// @desc    Update a saved student note
// @access  Private
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { title, generatedNotes, noteFormat, academicLevel } = req.body;

        const note = await StudentNote.findOne({ _id: req.params.id, userId });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found or access denied.' });
        }

        if (title !== undefined) note.title = title.trim();
        if (generatedNotes !== undefined) note.generatedNotes = generatedNotes;
        if (noteFormat !== undefined) note.noteFormat = noteFormat;
        if (academicLevel !== undefined) note.academicLevel = academicLevel;

        await note.save();

        res.json({ success: true, note });
    } catch (error) {
        console.error('[STUDENT NOTE UPDATE ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to update student note.' });
    }
});

// @route   DELETE /api/student-notes/:id
// @desc    Delete a saved student note
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const note = await StudentNote.findOneAndDelete({ _id: req.params.id, userId });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found or access denied.' });
        }

        res.json({ success: true, message: 'Note deleted successfully.' });
    } catch (error) {
        console.error('[STUDENT NOTE DELETE ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to delete student note.' });
    }
});

export default router;
