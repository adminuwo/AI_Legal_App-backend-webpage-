import express from 'express';
import { createComplaint, getComplaints, updateComplaintStatus } from '../controllers/complaintController.js';

const router = express.Router();

// Optional auth token verification middleware so guest or logged-in users can both submit
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            // Import verifyToken middleware dynamically if needed, or pass through
            next();
        } catch (e) {
            next();
        }
    } else {
        next();
    }
};

import { verifyToken, isAdmin } from '../middleware/authorization.js';

// @route POST /api/complaints - Submit complaint/feedback for an AI response
router.post('/', verifyToken, createComplaint);

// @route GET /api/complaints - List all complaints for Admin Dashboard
router.get('/', verifyToken, isAdmin, getComplaints);

// @route PATCH /api/complaints/:id/status - Update complaint status
router.patch('/:id/status', verifyToken, isAdmin, updateComplaintStatus);

export default router;
