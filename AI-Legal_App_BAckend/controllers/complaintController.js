import Complaint from '../models/Complaint.js';
import { sendComplaintEmail } from '../services/emailService.js';

// Helper to generate a unique Complaint ID (CMP-XXXXX)
const generateComplaintId = () => {
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `CMP-${randomHex}`;
};

/**
 * @desc Submit a new AI response complaint
 * @route POST /api/complaints
 * @access Public / Authenticated
 */
export const createComplaint = async (req, res) => {
    try {
        const {
            messageId,
            conversationId,
            aiTool = 'AI Copilot',
            originalPrompt = '',
            aiResponse = '',
            category,
            comment = '',
            language = 'English',
            workspace = 'Default Workspace',
            subscriptionPlan = 'Free Plan',
            appVersion = '1.0.0',
            osVersion = 'Mobile OS',
            deviceInfo = 'Mobile Device',
            userName,
            userEmail
        } = req.body;

        if (!messageId || !category) {
            return res.status(400).json({
                success: false,
                error: 'messageId and category are required'
            });
        }

        // Duplicate protection check (within 1 hour for same messageId and category/user)
        const existingComplaint = await Complaint.findOne({
            messageId,
            timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        });

        if (existingComplaint) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                message: 'A complaint for this response has already been submitted recently.',
                complaintId: existingComplaint.complaintId,
                data: existingComplaint
            });
        }

        const complaintId = generateComplaintId();
        const userId = req.user ? (req.user.id || req.user._id) : null;
        const resolvedName = (req.user?.name || req.user?.fullName) || userName || 'Anonymous User';
        const resolvedEmail = req.user?.email || userEmail || 'Not provided';

        const complaint = new Complaint({
            complaintId,
            userId,
            userName: resolvedName,
            userEmail: resolvedEmail,
            workspace,
            subscriptionPlan,
            aiTool,
            conversationId,
            messageId,
            originalPrompt,
            aiResponse,
            category,
            comment,
            language,
            appVersion,
            osVersion,
            deviceInfo,
            status: 'Open',
            timestamp: new Date()
        });

        await complaint.save();

        // Asynchronously send email notification
        sendComplaintEmail(complaint).catch(err => {
            console.error('❌ [ComplaintController] Email trigger failed:', err.message);
        });

        return res.status(201).json({
            success: true,
            message: 'Thank you for your feedback. Your report has been submitted successfully. Our team will review it to improve AI Legal™.',
            complaintId: complaint.complaintId,
            data: complaint
        });
    } catch (error) {
        console.error('❌ [ComplaintController] Error creating complaint:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to record complaint'
        });
    }
};

/**
 * @desc Get list of complaints for Admin module
 * @route GET /api/complaints
 * @access Admin
 */
export const getComplaints = async (req, res) => {
    try {
        const { status, category, search, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { complaintId: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { comment: { $regex: search, $options: 'i' } },
                { aiTool: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const complaints = await Complaint.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Complaint.countDocuments(query);

        return res.json({
            success: true,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: complaints
        });
    } catch (error) {
        console.error('❌ [ComplaintController] Error fetching complaints:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch complaints'
        });
    }
};

/**
 * @desc Update complaint status (Open, In Review, Resolved, Closed)
 * @route PATCH /api/complaints/:id/status
 * @access Admin
 */
export const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Open', 'In Review', 'Resolved', 'Closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status value. Must be Open, In Review, Resolved, or Closed'
            });
        }

        const complaint = await Complaint.findOneAndUpdate(
            { $or: [{ _id: id }, { complaintId: id }] },
            { status },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                error: 'Complaint not found'
            });
        }

        return res.json({
            success: true,
            message: `Complaint status updated to ${status}`,
            data: complaint
        });
    } catch (error) {
        console.error('❌ [ComplaintController] Status update error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update complaint status'
        });
    }
};
