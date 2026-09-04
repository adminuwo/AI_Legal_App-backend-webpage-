import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { verifyToken } from '../middleware/authorization.js';
import generateTokenAndSetCookies from '../utils/generateTokenAndSetCookies.js';
import userModel from '../models/User.js';
import Session from '../models/Session.js';
import AuditLog from '../models/AuditLog.js';

// Import models to delete data associated with user on account purge
import ChatSession from '../models/ChatSession.js';
import Reminder from '../models/Reminder.js';
import Feedback from '../models/Feedback.js';
import Report from '../models/Report.js';
import SupportTicket from '../models/SupportTicket.js';
import ContractAnalysis from '../models/ContractAnalysis.js';
import CasePrediction from '../models/CasePrediction.js';
import StrategyHistory from '../models/StrategyHistory.js';

const router = express.Router();

// Helper to log security events
const logSecurityEvent = async (userId, event, req, sessionInfo = null) => {
    try {
        const userAgent = req.headers['user-agent'] || 'Unknown Device';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
        
        let device = sessionInfo?.device || 'Desktop';
        if (/mobile/i.test(userAgent)) device = 'Mobile';
        else if (/tablet/i.test(userAgent)) device = 'Tablet';

        let browser = sessionInfo?.browser || 'Other';
        if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
        else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
        else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Safari';
        else if (/edg/i.test(userAgent)) browser = 'Edge';

        let os = sessionInfo?.os || 'Other';
        if (/windows/i.test(userAgent)) os = 'Windows';
        else if (/mac/i.test(userAgent)) os = 'macOS';
        else if (/linux/i.test(userAgent)) os = 'Linux';
        else if (/android/i.test(userAgent)) os = 'Android';
        else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';

        await AuditLog.create({
            userId,
            event,
            device,
            ip,
            browser,
            os
        });
    } catch (err) {
        console.error('[AUDIT LOG ERROR]', err);
    }
};

// 1. GET /security/sessions - Retrieve active sessions
router.get('/sessions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const currentToken = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

        if (mongoose.connection.readyState !== 1) {
            // MongoDB Unreachable fallback
            return res.json({
                success: true,
                data: [
                    { _id: 'mock_current', device: 'Mobile', os: 'Android', ip: '127.0.0.1', isCurrent: true, lastActive: new Date() }
                ]
            });
        }

        const list = await Session.find({ userId });
        const formatted = list.map(s => {
            const obj = s.toObject();
            obj.isCurrent = (s.token === currentToken);
            return obj;
        });

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('[GET SESSIONS ERROR]', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// 2. POST /security/change-password - Update User Access Password
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { currentPassword, newPassword, logoutOthers } = req.body;
        const currentToken = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required.' });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        // Verify non-reuse
        if (newPassword === currentPassword) {
            return res.status(400).json({ error: 'New password cannot be the same as your current password.' });
        }

        // Policy Validation
        // Min 8 characters, Upper, Lower, Number, Special character
        const policyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!policyRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'New password does not satisfy safety policy. Password must be at least 8 characters long, containing uppercase, lowercase, numbers, and a special character.'
            });
        }

        // Securely hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordUpdatedAt = Date.now();
        await user.save();

        // Audit Log
        await logSecurityEvent(userId, 'PASSWORD_CHANGED', req);

        // Option to logout other devices
        if (logoutOthers) {
            await Session.deleteMany({ userId, token: { $ne: currentToken } });
        }

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        console.error('[CHANGE PASSWORD ERROR]', error);
        res.status(500).json({ error: 'Internal server error occurred.' });
    }
});

// 3. POST /security/logout-session - Terminate a specific session
router.post('/logout-session', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required.' });
        }

        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found or unauthorized.' });
        }

        await Session.findByIdAndDelete(sessionId);
        await logSecurityEvent(userId, 'DEVICE_LOGGED_OUT', req, session);

        res.json({ success: true, message: 'Session revoked successfully.' });
    } catch (error) {
        console.error('[LOGOUT SESSION ERROR]', error);
        res.status(500).json({ error: 'Failed to terminate session.' });
    }
});

// 4. POST /security/logout-all - Logout other devices
router.post('/logout-all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const currentToken = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

        await Session.deleteMany({ userId, token: { $ne: currentToken } });
        await logSecurityEvent(userId, 'DEVICE_LOGGED_OUT', req);

        res.json({ success: true, message: 'Successfully signed out of all other sessions.' });
    } catch (error) {
        console.error('[LOGOUT ALL ERROR]', error);
        res.status(500).json({ error: 'Failed to revoke other sessions.' });
    }
});

// 5. POST /security/deactivate - Temporary Account Deactivation
router.post('/deactivate', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        user.accountStatus = 'inactive';
        user.deactivatedAt = Date.now();
        await user.save();

        // Wipe all sessions so user is completely logged out
        await Session.deleteMany({ userId });
        await logSecurityEvent(userId, 'ACCOUNT_DEACTIVATED', req);

        res.json({ success: true, message: 'Account deactivated successfully.' });
    } catch (error) {
        console.error('[DEACTIVATE ERROR]', error);
        res.status(500).json({ error: 'Failed to deactivate account.' });
    }
});

// 6. POST /security/reactivate - Public Reactivation flow
router.post('/reactivate', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect credentials.' });
        }

        // Reactivate
        user.accountStatus = 'active';
        user.deactivatedAt = null;
        user.failedAttempts = 0;
        user.lastLogin = Date.now();
        await user.save();

        // Log security reactivation event
        await logSecurityEvent(user._id, 'ACCOUNT_REACTIVATED', req);

        // Generate JWT to automatically log them back in
        const userPlan = user.plan || 'FREE';
        const token = generateTokenAndSetCookies(res, user._id, user.email, user.name, userPlan, user.role);
        
        // Track the new login session
        const userAgent = req.headers['user-agent'] || 'Unknown Device';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
        let device = 'Desktop';
        if (/mobile/i.test(userAgent)) device = 'Mobile';
        else if (/tablet/i.test(userAgent)) device = 'Tablet';

        let browser = 'Other';
        if (/chrome/i.test(userAgent)) browser = 'Chrome';
        else if (/safari/i.test(userAgent)) browser = 'Safari';

        let os = 'Other';
        if (/windows/i.test(userAgent)) os = 'Windows';
        else if (/mac/i.test(userAgent)) os = 'macOS';
        else if (/android/i.test(userAgent)) os = 'Android';
        else if (/iphone|ipad/i.test(userAgent)) os = 'iOS';

        await Session.create({
            userId: user._id,
            token,
            device,
            browser,
            os,
            ip,
            lastActive: Date.now()
        });

        res.json({
            success: true,
            message: 'Account reactivated successfully.',
            data: {
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('[REACTIVATE ERROR]', error);
        res.status(500).json({ error: 'Failed to reactivate account.' });
    }
});

// 7. DELETE /security/account - Permanent Account Purge
router.delete('/account', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { password, verifyText } = req.body;

        if (!password || verifyText !== 'DELETE') {
            return res.status(400).json({ error: 'Password confirmation and word "DELETE" are required.' });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect password authorization.' });
        }

        // Audit permanent delete
        await logSecurityEvent(userId, 'ACCOUNT_PERMANENTLY_DELETED', req);

        // Delete all associated models
        const safeDelete = async (Model, query) => {
            try {
                await Model.deleteMany(query);
            } catch (err) {
                console.warn(`[CLEANUP ERROR] Failed to purge associated model:`, err.message);
            }
        };

        await Promise.all([
            safeDelete(Session, { userId }),
            safeDelete(ChatSession, { userId }),
            safeDelete(Reminder, { userId }),
            safeDelete(Feedback, { userId }),
            safeDelete(Report, { userId }),
            safeDelete(SupportTicket, { userId }),
            safeDelete(ContractAnalysis, { userId }),
            safeDelete(CasePrediction, { userId }),
            safeDelete(StrategyHistory, { userId }),
            userModel.findByIdAndDelete(userId)
        ]);

        res.json({ success: true, message: 'Account permanently purged successfully.' });
    } catch (error) {
        console.error('[ACCOUNT PERMANENT PURGE ERROR]', error);
        res.status(500).json({ error: 'Failed to permanently purge user profile.' });
    }
});

export default router;
