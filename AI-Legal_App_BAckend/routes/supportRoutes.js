import express from 'express';
import SupportTicket from '../models/SupportTicket.js';
import { verifyAdmin } from '../middleware/adminAuth.js';
import { sendAdminNotification } from '../services/emailService.js';

const router = express.Router();

import { verifyToken } from '../middleware/authorization.js';

router.post('/', verifyToken, async (req, res) => {
    try {
        const {
            name,
            email,
            issueType,
            message,
            title,
            priority,
            category,
            device,
            appVersion,
            steps,
            whyNeeded,
            whoBenefit,
            attachments,
            diagnosticLogs
        } = req.body;

        const resolvedEmail = req.user?.email || email;
        const resolvedName = (req.user?.name || req.user?.fullName) || name || "AISA User";
        const userId = req.user?.id || req.user?._id || null;

        if (!resolvedEmail || !message) {
            return res.status(400).json({ error: 'Missing required fields (email or message)' });
        }

        const newTicket = new SupportTicket({
            name: resolvedName,
            email: resolvedEmail,
            issueType: issueType || 'Technical Support',
            message,
            userId,
            title,
            priority,
            category,
            device,
            appVersion,
            steps,
            whyNeeded,
            whoBenefit,
            attachments: attachments || [],
            diagnosticLogs: diagnosticLogs || null,
            status: 'pending'
        });

        await newTicket.save();

        // Send email notification to admin asynchronously (don't block the client response)
        sendAdminNotification(newTicket).catch(err => {
            console.error('[EMAIL NOTIFICATION ERROR] Failed to notify admin:', err);
        });

        res.status(201).json({ message: 'Support ticket created successfully', ticket: newTicket });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Route: Get all support tickets
router.get('/tickets', verifyAdmin, async (req, res) => {
    try {
        const tickets = await SupportTicket.find().sort({ createdAt: -1 });
        console.log(`[SUPPORT API] Fetched ${tickets.length} tickets for admin.`);
        res.status(200).json({ tickets });
    } catch (error) {
        console.error('[SUPPORT API ERROR] Error fetching support tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Admin Route: Update a specific ticket status
router.patch('/tickets/:id', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true }
        );
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.status(200).json({ message: 'Ticket updated successfully', ticket });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Route: Delete a specific ticket
router.delete('/tickets/:id', verifyAdmin, async (req, res) => {
    try {
        const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
