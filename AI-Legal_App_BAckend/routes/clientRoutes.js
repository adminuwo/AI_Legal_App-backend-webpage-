import express from 'express';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import { verifyToken } from '../middleware/authorization.js';

const router = express.Router();

// Helper to validate email format
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Helper to validate mobile number (typically 10 digits)
const isValidPhone = (phone) => {
    const re = /^\+?([0-9]{1,4})?[-. ]?([0-9]{10})$/;
    return re.test(phone.replace(/\s+/g, ''));
};

// @desc    Create a new standalone client
// @route   POST /api/clients
// @access  Private
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, mobileNumber, whatsAppNumber, email, organization, notes } = req.body;

        // Validation
        const errors = {};
        if (!name || !name.trim()) errors.name = 'Client Full Name is required';
        
        if (!mobileNumber || !mobileNumber.trim()) {
            errors.mobileNumber = 'Mobile Number is required';
        } else if (!isValidPhone(mobileNumber)) {
            errors.mobileNumber = 'Please enter a valid 10-digit mobile number';
        } else {
            // Prevent duplicate mobile numbers under this user
            const existing = await Client.findOne({ userId: req.user.id, mobileNumber: mobileNumber.trim() });
            if (existing) {
                errors.mobileNumber = 'A client with this mobile number already exists.';
            }
        }

        if (whatsAppNumber && whatsAppNumber.trim() && !isValidPhone(whatsAppNumber)) {
            errors.whatsAppNumber = 'Please enter a valid 10-digit WhatsApp number';
        }

        if (email && email.trim() && !isValidEmail(email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const client = new Client({
            userId: req.user.id,
            name: name.trim(),
            mobileNumber: mobileNumber.trim(),
            whatsAppNumber: (whatsAppNumber || mobileNumber || '').trim(),
            email: (email || '').trim().toLowerCase(),
            organization: (organization || '').trim(),
            notes: (notes || '').trim()
        });
        await client.save();

        // Create a standalone case workspace project representation for the client
        const project = new Project({
            userId: req.user.id,
            clientId: client._id,
            name: `Client Workspace: ${client.name}`,
            clientName: client.name,
            clientMobileNumber: client.mobileNumber,
            clientWhatsAppNumber: client.whatsAppNumber,
            clientEmail: client.email,
            isLegalCase: false,
            status: 'Active',
            summary: client.notes || 'Standalone client connect workspace.'
        });
        await project.save();

        res.status(201).json({
            success: true,
            client,
            project
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// @desc    Get all standalone clients for the active user
// @route   GET /api/clients
// @access  Private
router.get('/', verifyToken, async (req, res) => {
    try {
        const clients = await Client.find({ userId: req.user.id }).sort({ name: 1 });
        const projects = await Project.find({ userId: req.user.id, isLegalCase: false });

        // Map the correct project workspace to each client object
        const clientsWithProjects = clients.map(client => {
            const project = projects.find(p => p.clientId?.toString() === client._id.toString());
            return {
                ...client.toObject(),
                project: project || null
            };
        });

        res.json({ success: true, clients: clientsWithProjects });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// @desc    Delete a standalone client and their workspace
// @route   DELETE /api/clients/:id
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const client = await Client.findOne({ _id: req.params.id, userId: req.user.id });
        if (!client) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        // Delete client
        await Client.deleteOne({ _id: client._id });

        // Delete associated standalone project/workspace
        await Project.deleteMany({ clientId: client._id, userId: req.user.id, isLegalCase: false });

        res.json({ success: true, message: 'Client and associated workspace deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

export default router;
