import mongoose from 'mongoose';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import CreditLog from '../models/CreditLog.js';
import Payment from '../models/Payment.js';
import Project from '../models/Project.js';
import ContractAnalysis from '../models/ContractAnalysis.js';
import CasePrediction from '../models/CasePrediction.js';
import StrategyHistory from '../models/StrategyHistory.js';
import ChatSession from '../models/ChatSession.js';
import BugReport from '../models/BugReport.js';
import FeatureRequest from '../models/FeatureRequest.js';
import CrashLog from '../models/CrashLog.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getIO } from '../utils/socket.js';
import * as FeatureAccessManager from '../services/featureAccessManager.js';

// Helper: Broadcast real-time refresh to all connected admin clients
export const broadcastAdminRefresh = (type, data) => {
    try {
        const io = getIO();
        io.emit('admin:refresh', { type, data });
    } catch (e) {
        console.warn('[Socket] Admin broadcast failed:', e.message);
    }
};

// 1. Live Aggregated Admin Stats
export const getAdminStats = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0,0,0,0);

        const [
            totalUsers,
            activeUsers,
            onlineUsers,
            premiumUsersFromUser,
            premiumUsersFromSub,
            revTodayAgg,
            revMonthAgg,
            revLifetimeAgg,
            creditUsageData,
            totalCases,
            contractsAnalyzed,
            strategyReports,
            casePredictorReports,
            chatUsage,
            pendingFeatures,
            openBugs,
            draftsGenerated,
            evidenceAnalyses,
            courtPrepSessions,
            apiUsage
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
            User.countDocuments({ 'subscription.plan': { $exists: true, $nin: ['FREE', 'Free', 'free', '', null] } }),
            Subscription.countDocuments({ tier: { $exists: true, $nin: ['FREE', 'Free', 'free', '', null] }, status: 'active' }),
            Payment.aggregate([
                { $match: { gateway: { $regex: /^razorpay$/i }, status: { $in: ['success', 'paid', 'captured'] }, amount: { $gt: 0 }, createdAt: { $gte: todayStart } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Payment.aggregate([
                { $match: { gateway: { $regex: /^razorpay$/i }, status: { $in: ['success', 'paid', 'captured'] }, amount: { $gt: 0 }, createdAt: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Payment.aggregate([
                { $match: { gateway: { $regex: /^razorpay$/i }, status: { $in: ['success', 'paid', 'captured'] }, amount: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            CreditLog.aggregate([
                { $match: { credits: { $lt: 0 } } },
                { $group: { _id: null, totalUsed: { $sum: { $abs: "$credits" } } } }
            ]),
            Project.countDocuments(),
            ContractAnalysis.countDocuments(),
            StrategyHistory.countDocuments(),
            CasePrediction.countDocuments(),
            ChatSession.countDocuments(),
            FeatureRequest.countDocuments({ status: { $in: ['Pending', 'Under Review', 'In Progress'] } }),
            BugReport.countDocuments({ status: { $in: ['Open', 'Assigned', 'Fixing', 'Testing'] } }),
            CreditLog.countDocuments({ $or: [{ action: { $regex: /draft/i } }, { description: { $regex: /draft/i } }] }),
            CreditLog.countDocuments({ $or: [{ action: { $regex: /evidence|ocr|scan|contract/i } }, { description: { $regex: /evidence|ocr|scan|contract/i } }] }),
            CreditLog.countDocuments({ $or: [{ action: { $regex: /court|dossier|prep/i } }, { description: { $regex: /court|dossier|prep/i } }] }),
            CreditLog.countDocuments()
        ]);

        const premiumUsers = Math.max(premiumUsersFromUser, premiumUsersFromSub);
        const freeUsers = Math.max(0, totalUsers - premiumUsers);

        let revenueToday = revTodayAgg[0]?.total || 0;
        let revenueMonth = revMonthAgg[0]?.total || 0;
        let revenueLifetime = revLifetimeAgg[0]?.total || 0;

        const totalCreditsUsed = creditUsageData[0]?.totalUsed || 0;
        const storageUsed = Math.round(totalCases * 1.5 + contractsAnalyzed * 0.8) || 0; // in MB

        // Real 7-day daily activity graph aggregated from MongoDB
        const dailyActivity = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const cLogs = await CreditLog.countDocuments({ createdAt: { $gte: d, $lt: nextD } });
            const cSessions = await ChatSession.countDocuments({ createdAt: { $gte: d, $lt: nextD } });
            const uLogins = await User.countDocuments({ lastLogin: { $gte: d, $lt: nextD } });

            dailyActivity.push({
                label: dayName,
                val: cLogs + cSessions + uLogins
            });
        }

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                onlineUsers,
                premiumUsers,
                freeUsers,
                revenueToday,
                revenueMonth,
                revenueLifetime,
                totalCreditsUsed,
                totalCases,
                contractsAnalyzed,
                courtPrepSessions,
                strategyReports,
                casePredictorReports,
                draftsGenerated,
                evidenceAnalyses,
                chatUsage,
                apiUsage,
                storageUsed,
                pendingFeatures,
                openBugs,
                dailyActivity
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Resolve human-readable plan display name
const getPlanDisplayName = (u, sub) => {
    if (!u) return 'Free';
    if (u.role === 'SUPER_ADMIN') return 'Super Admin';

    let raw = sub?.tier || sub?.planId?.planName || sub?.planId?.planId || u?.subscription?.plan;
    if (!raw && sub?.planId) raw = typeof sub.planId === 'string' ? sub.planId : sub.planId.planName;
    if (!raw) raw = u?.subscription?.plan || 'FREE';

    const p = String(raw).toUpperCase().trim();
    if (p.includes('SUPER_ADMIN')) return 'Super Admin';
    if (p.includes('ENTERPRISE') || p.includes('COMBO') || p.includes('FIRM')) return 'Enterprise / Firm';
    if (p.includes('PREMIUM')) return 'Premium';
    if (p.includes('PRO') || p.includes('PROFESSIONAL')) return 'Pro';
    if (p.includes('BASIC')) return 'Basic';
    if (p !== 'FREE' && p !== 'UNDEFINED' && p !== 'NULL') return String(raw);
    return 'Free';
};

// 2. Query/CRUD Users (Pure MongoDB Live Fetch)
export const getAllUsers = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 200 } = req.query;
        const query = {};

        if (search && search.trim()) {
            const s = search.trim();
            query.$or = [
                { name: { $regex: s, $options: 'i' } },
                { fullName: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } }
            ];
        }

        if (status === 'suspended') {
            query.isBlocked = true;
        } else if (status === 'active') {
            query.isBlocked = { $ne: true };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const list = await Promise.all(users.map(async (u) => {
            let planName = 'Free';
            let casesCount = 0;
            try {
                const sub = await Subscription.findOne({ $or: [{ accountId: u._id }, { userId: u._id }] }).populate('planId').lean();
                planName = getPlanDisplayName(u, sub);
            } catch (e) {
                planName = getPlanDisplayName(u, null);
            }

            try {
                casesCount = await Project.countDocuments({ userId: u._id });
            } catch (e) {}

            return {
                _id: String(u._id),
                name: u.name || u.fullName || (u.email ? u.email.split('@')[0] : 'User'),
                email: u.email || 'N/A',
                credits: typeof u.credits === 'number' ? u.credits : 100,
                role: u.role || 'user',
                isBlocked: Boolean(u.isBlocked),
                lastLogin: u.lastLogin || u.createdAt || new Date(),
                createdAt: u.createdAt || new Date(),
                phone: u.phone || '',
                jurisdiction: u.jurisdiction || u.country || 'India',
                currentPlan: planName,
                totalCases: casesCount
            };
        }));

        const total = await User.countDocuments(query);
        res.status(200).json({ success: true, list, users: list, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('[getAllUsers Error]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. User Detail View
export const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        let user = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).select('-password');
        }
        if (!user) {
            const cleanId = String(id).trim().slice(0, 24);
            if (mongoose.Types.ObjectId.isValid(cleanId)) {
                user = await User.findById(cleanId).select('-password');
            }
        }
        if (!user) {
            user = await User.findOne({ $or: [{ email: id }, { phone: id }] }).select('-password');
        }
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const sub = await Subscription.findOne({ $or: [{ accountId: user._id }, { userId: user._id }] }).populate('planId');
        const planName = getPlanDisplayName(user, sub);
        const casesCount = await Project.countDocuments({ userId: user._id });
        const usageStatus = await FeatureAccessManager.getUsageStatus(user._id);

        res.status(200).json({
            success: true,
            user: {
                ...user.toObject(),
                currentPlan: planName,
                renewalDate: sub?.renewalDate || sub?.expiryDate || null,
                totalCases: casesCount,
                usageStatus: usageStatus
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update User Profile
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, isBlocked } = req.body;
        const updated = await User.findByIdAndUpdate(id, { name, email, role, isBlocked }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
        
        broadcastAdminRefresh('user', updated);
        res.status(200).json({ success: true, user: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Suspend User Toggle
export const toggleSuspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;
        const user = await User.findByIdAndUpdate(id, { $set: { isBlocked } }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        broadcastAdminRefresh('user', user);
        res.status(200).json({ success: true, message: `User status changed to ${isBlocked ? 'suspended' : 'active'}.`, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Delete User & dependencies
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        let reqUserId = req.user?.id || req.user?._id;
        let isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'admin' || req.user?.email === 'aditilakhera0@gmail.com' || req.user?.email === 'admin@uwo24.com';

        if (!isSuperAdmin && reqUserId && reqUserId !== 'admin-auto-id' && mongoose.Types.ObjectId.isValid(reqUserId)) {
            const reqUser = await User.findById(reqUserId);
            if (reqUser && (reqUser.role === 'SUPER_ADMIN' || reqUser.role === 'admin' || reqUser.email === 'aditilakhera0@gmail.com' || reqUser.email === 'admin@uwo24.com')) {
                isSuperAdmin = true;
            }
        }

        if (!isSuperAdmin) {
            return res.status(403).json({ success: false, message: 'Only Super Admins can delete users.' });
        }

        let targetId = id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const u = await User.findOne({ $or: [{ email: id }, { phone: id }] });
            if (u) targetId = u._id;
        }

        const deletedUser = await User.findByIdAndDelete(targetId);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'User not found or already deleted.' });
        }
        
        // Delete all user-owned dependency records to ensure NO orphan records
        await Subscription.deleteMany({ $or: [{ accountId: targetId }, { userId: targetId }] });
        await Payment.deleteMany({ userId: targetId });
        await Project.deleteMany({ userId: targetId });
        await CreditLog.deleteMany({ userId: targetId });
        await ChatSession.deleteMany({ userId: targetId });
        await ContractAnalysis.deleteMany({ userId: targetId });
        await CasePrediction.deleteMany({ userId: targetId });
        await StrategyHistory.deleteMany({ userId: targetId });
        await BugReport.deleteMany({ userId: targetId });
        await FeatureRequest.deleteMany({ userId: targetId });
        
        try {
            const SessionModel = (await import('../models/Session.js')).default;
            await SessionModel.deleteMany({ userId: targetId });
        } catch (e) {
            console.warn('[ADMIN DELETE] Session model delete error:', e.message);
        }
        
        try {
            const PlanUsageModel = (await import('../models/PlanUsage.js')).default;
            await PlanUsageModel.deleteMany({ userId: targetId });
        } catch (e) {
            console.warn('[ADMIN DELETE] PlanUsage model delete error:', e.message);
        }

        broadcastAdminRefresh('user', { _id: String(targetId), deleted: true });
        res.status(200).json({ success: true, message: 'User deleted successfully. The user account and associated data have been permanently removed.' });
    } catch (error) {
        console.error('[ADMIN DELETE USER ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Adjust User Credits
export const adjustUserCredits = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, actionType = 'add' } = req.body; // amount is always positive number
        const delta = actionType === 'remove' ? -Number(amount) : Number(amount);

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const oldBalance = user.credits || 0;
        const newBalance = Math.max(0, oldBalance + delta);

        await User.findByIdAndUpdate(id, { $set: { credits: newBalance } });
        await Subscription.findOneAndUpdate({ userId: id }, { $set: { creditsRemaining: newBalance } });

        // Log this credit transaction
        await CreditLog.create({
            userId: id,
            action: delta > 0 ? 'Credits Added by Admin' : 'Credits Removed by Admin',
            credits: delta,
            balanceAfter: newBalance,
            description: `Manual adjustment by admin.`
        });

        broadcastAdminRefresh('user', { _id: id, credits: newBalance });
        res.status(200).json({ success: true, message: 'Credits adjusted successfully.', credits: newBalance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Upgrade/Downgrade User Subscription Plan
export const changeUserPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { planId, planName, type = 'monthly', expire = false } = req.body;

        let user = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id);
        }
        if (!user) {
            const cleanId = String(id).trim().slice(0, 24);
            if (mongoose.Types.ObjectId.isValid(cleanId)) {
                user = await User.findById(cleanId);
            }
        }
        if (!user) {
            user = await User.findOne({ $or: [{ email: id }, { phone: id }] });
        }
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const targetUserId = user._id;

        if (expire) {
            // Expire subscription
            try {
                await Subscription.findOneAndUpdate(
                    { accountId: targetUserId },
                    { $set: { status: 'expired' } }
                );
            } catch (e) {}

            const expiredUser = await User.findByIdAndUpdate(targetUserId, {
                $set: {
                    credits: 0,
                    'subscription.plan': 'FREE',
                    'subscription.status': 'expired',
                    'subscription.expiryDate': new Date()
                }
            }, { new: true });

            broadcastAdminRefresh('user', { _id: targetUserId, plan: 'FREE', credits: 0 });
            return res.status(200).json({ success: true, message: 'User subscription expired successfully.', user: expiredUser });
        }

        const inputTarget = (planId || planName || '').toString().trim();
        let plan = null;

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (mongoose.Types.ObjectId.isValid(inputTarget)) {
            plan = await Plan.findById(inputTarget);
        }
        if (!plan && inputTarget) {
            plan = await Plan.findOne({ planId: inputTarget }) || await Plan.findOne({ planName: { $regex: new RegExp(`^${escapeRegex(inputTarget)}$`, 'i') } });
        }

        let targetPlanKey = 'FREE';
        let planDisplayName = 'AI Legal™ Free';
        let planCredits = 500;
        let priceMonthly = 0;
        let priceYearly = 0;

        if (plan) {
            planDisplayName = plan.planName;
            planCredits = plan.credits || 500;
            priceMonthly = plan.priceMonthly || 0;
            priceYearly = plan.priceYearly || 0;

            const raw = (plan.planId || plan.planName || '').toUpperCase();
            if (raw.includes('ENTERPRISE') || raw.includes('FIRM') || raw.includes('COMBO')) targetPlanKey = 'ENTERPRISE';
            else if (raw.includes('PREMIUM')) targetPlanKey = 'PREMIUM';
            else if (raw.includes('PRO') || raw.includes('PROFESSIONAL')) targetPlanKey = 'PRO';
            else if (raw.includes('BASIC') || raw.includes('STARTER')) targetPlanKey = 'BASIC';
            else if (raw.includes('FREE')) targetPlanKey = 'FREE';
            else targetPlanKey = 'PRO';
        } else if (inputTarget) {
            const raw = inputTarget.toUpperCase();
            if (raw.includes('ENTERPRISE') || raw.includes('FIRM') || raw.includes('COMBO')) { targetPlanKey = 'ENTERPRISE'; planDisplayName = 'Firm Premium / Enterprise'; }
            else if (raw.includes('PREMIUM')) { targetPlanKey = 'PREMIUM'; planDisplayName = 'AI Legal™ Premium'; }
            else if (raw.includes('PRO') || raw.includes('PROFESSIONAL')) { targetPlanKey = 'PRO'; planDisplayName = 'AI Legal™ Professional'; }
            else if (raw.includes('BASIC')) { targetPlanKey = 'BASIC'; planDisplayName = 'AI Legal™ Basic'; }
            else if (raw.includes('FREE')) { targetPlanKey = 'FREE'; planDisplayName = 'AI Legal™ Free'; }
            else { targetPlanKey = 'FREE'; planDisplayName = inputTarget; }
        }

        if (!plan) {
            plan = await Plan.findOne();
        }
        const planObjId = plan ? plan._id : new mongoose.Types.ObjectId();

        const durationMonths = type === 'yearly' ? 12 : 1;
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + durationMonths);

        let normalizedTier = 'FREE';
        if (targetPlanKey === 'BASIC') normalizedTier = 'BASIC';
        else if (targetPlanKey === 'PRO' || targetPlanKey === 'PROFESSIONAL') normalizedTier = 'PROFESSIONAL';
        else if (targetPlanKey === 'PREMIUM') normalizedTier = 'PREMIUM';
        else if (targetPlanKey === 'ENTERPRISE') normalizedTier = 'ENTERPRISE';

        let sub = null;
        try {
            sub = await Subscription.findOneAndUpdate(
                { accountId: targetUserId },
                {
                    accountId: targetUserId,
                    tier: normalizedTier,
                    status: 'active',
                    expiryDate: renewalDate,
                    billingCycle: type,
                    amount: type === 'yearly' ? priceYearly : priceMonthly
                },
                { new: true, upsert: true }
            );
        } catch (subErr) {
            console.warn('[ADMIN CHANGE PLAN] Subscription upsert warning:', subErr.message);
        }

        const updatedUser = await User.findByIdAndUpdate(targetUserId, {
            $set: {
                credits: planCredits,
                'subscription.plan': targetPlanKey === 'PROFESSIONAL' ? 'PRO' : targetPlanKey,
                'subscription.status': 'active',
                'subscription.expiryDate': renewalDate,
                'subscription.amount': type === 'yearly' ? priceYearly : priceMonthly,
                'subscription.billingCycle': type
            }
        }, { new: true });

        // Add to payments log for SaaS simulation
        try {
            await Payment.create({
                userId: targetUserId,
                planId: planObjId,
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                amount: type === 'yearly' ? priceYearly : priceMonthly,
                gst: type === 'yearly' ? priceYearly * 0.18 : priceMonthly * 0.18,
                gateway: 'Admin Direct Assignment',
                transactionId: `txn_admin_${Date.now()}`,
                status: 'success'
            });
        } catch (payErr) {
            console.warn('[ADMIN CHANGE PLAN] Payment log warning:', payErr.message);
        }

        const userPayload = {
            ...updatedUser.toObject(),
            currentPlan: getPlanDisplayName(updatedUser, sub)
        };

        broadcastAdminRefresh('user', { _id: targetUserId, plan: targetPlanKey, credits: planCredits });
        return res.status(200).json({
            success: true,
            message: `Plan assigned to ${planDisplayName} (${type}) successfully.`,
            user: userPayload,
            subscription: sub
        });
    } catch (error) {
        console.error('[ADMIN CHANGE PLAN ERROR]', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 9. Masquerade Login (Generate JWT token)
export const loginAsUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({ success: true, token, user: { name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 10. Direct Admin Reset Password
export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(id, { $set: { password: hashedPassword } });

        res.status(200).json({ success: true, message: 'User password updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Payments & Invoices list
export const getAllBilling = async (req, res) => {
    try {
        const { status, page = 1, limit = 100 } = req.query;
        const query = {};
        if (status && status !== 'all') {
            if (status === 'success') query.status = { $in: ['success', 'paid'] };
            else query.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const rawPayments = await Payment.find(query)
            .populate('userId', 'name email')
            .populate('planId', 'planName')
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 2);

        const PaymentHistory = mongoose.model('PaymentHistory');
        const rawHistories = await PaymentHistory.find({})
            .populate('accountId', 'name email')
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 2);

        const rawList = [];

        rawPayments.forEach(p => {
            rawList.push({
                _id: p._id?.toString(),
                userId: p.userId || { name: 'User', email: 'N/A' },
                planId: p.planId || 'advocate_pro',
                invoiceNumber: p.invoiceNumber || `INV-${p._id?.toString().slice(-6)}`,
                amount: p.amount || 0,
                gst: p.gst || (p.amount || 0) * 0.18,
                gateway: p.gateway || 'Razorpay',
                transactionId: p.transactionId || `txn_${p._id?.toString()}`,
                status: p.status === 'paid' ? 'success' : (p.status || 'success'),
                createdAt: p.createdAt || new Date(),
                rawSource: 'Payment'
            });
        });

        rawHistories.forEach(ph => {
            const txnId = ph.transactionId || ph.razorpayPaymentId || ph.orderId || ph._id?.toString();
            const normStatus = ph.status === 'paid' ? 'success' : (ph.status || 'success');
            rawList.push({
                _id: ph._id?.toString(),
                userId: ph.accountId || { name: 'User', email: 'N/A' },
                planId: ph.planId || 'advocate_pro',
                invoiceNumber: ph.invoice || `INV-${ph._id?.toString().slice(-6)}`,
                amount: ph.amount || 0,
                gst: (ph.amount || 0) * 0.18,
                gateway: ph.gateway || ph.paymentMethod || 'Razorpay',
                transactionId: txnId,
                status: normStatus,
                createdAt: ph.createdAt || ph.paidAt || new Date(),
                rawSource: 'PaymentHistory'
            });
        });

        rawList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const seenKeys = new Set();
        const deduplicatedList = [];

        for (const item of rawList) {
            const keysToRegister = [];

            if (item._id) keysToRegister.push(`id_${item._id}`);
            if (item.transactionId && item.transactionId !== 'N/A') {
                keysToRegister.push(`txn_${item.transactionId}`);
            }
            if (item.invoiceNumber && item.invoiceNumber !== 'N/A') {
                keysToRegister.push(`inv_${item.invoiceNumber}`);
            }

            const userEmail = typeof item.userId === 'object' ? item.userId?.email : item.userId;
            const timeWindow = item.createdAt ? Math.floor(new Date(item.createdAt).getTime() / 30000) : 0;
            if (userEmail && item.amount) {
                keysToRegister.push(`composite_${userEmail}_${item.amount}_${timeWindow}`);
            }

            const isDuplicate = keysToRegister.some(k => seenKeys.has(k));
            if (!isDuplicate) {
                keysToRegister.forEach(k => seenKeys.add(k));

                if (!status || status === 'all' || item.status === status) {
                    deduplicatedList.push(item);
                }
            }
        }

        const paginatedList = deduplicatedList.slice(skip, skip + Number(limit));

        const totalRevenue = deduplicatedList.reduce((acc, p) => (/^razorpay$/i.test(String(p.gateway || '')) && (p.status === 'success' || p.status === 'paid')) ? acc + (p.amount || 0) : acc, 0);
        const successCount = deduplicatedList.filter(p => p.status === 'success' || p.status === 'paid').length;
        const pendingCount = deduplicatedList.filter(p => p.status === 'pending').length;
        const refundedCount = deduplicatedList.filter(p => p.status === 'refunded').length;
        const failedCount = deduplicatedList.filter(p => p.status === 'failed').length;

        res.status(200).json({
            success: true,
            list: paginatedList,
            payments: paginatedList,
            total: deduplicatedList.length,
            page: Number(page),
            limit: Number(limit),
            metrics: {
                totalRevenue,
                successCount,
                pendingCount,
                refundedCount,
                failedCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 12. Refund Action
export const refundPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findByIdAndUpdate(id, { $set: { status: 'refunded' } }, { new: true });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

        broadcastAdminRefresh('billing', payment);
        res.status(200).json({ success: true, message: 'Payment marked as refunded successfully.', payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Mark Paid Action
export const markPaidPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findByIdAndUpdate(id, { $set: { status: 'success' } }, { new: true });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

        broadcastAdminRefresh('billing', payment);
        res.status(200).json({ success: true, message: 'Payment marked as paid successfully.', payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 14. Export Billing CSV
export const exportBillingCsv = async (req, res) => {
    try {
        const list = await Payment.find({})
            .populate('userId', 'name email')
            .populate('planId', 'planName')
            .sort({ createdAt: -1 });

        let csv = 'Invoice Number,User,Email,Plan,Amount,GST,Gateway,Transaction ID,Status,Date\n';
        list.forEach(p => {
            csv += `"${p.invoiceNumber || ''}","${p.userId?.name || 'User'}","${p.userId?.email || 'N/A'}","${p.planId?.planName || 'Free'}",${p.amount || 0},${p.gst || 0},"${p.gateway || ''}","${p.transactionId || ''}","${p.status || ''}","${p.createdAt.toISOString()}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=billing_export.csv');
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

import JurisdictionLog from '../models/JurisdictionLog.js';
import { jurisdictionManager } from '../services/jurisdictionManager.js';
import { askOpenAI } from '../services/openai.service.js';

// 15. Apply Jurisdiction Override
export const applyJurisdictionOverride = async (req, res) => {
    try {
        const { userId, country, countryCode, overrideType } = req.body;

        if (!userId || !country || !countryCode || !overrideType) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const oldCountry = user.country || 'India';

        if (overrideType === 'Permanent') {
            user.country = country;
            user.countryCode = countryCode;
            user.jurisdiction = country;
            await user.save();
        } else if (overrideType === 'Temporary') {
            jurisdictionManager.setTemporaryOverride(userId, country);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid override type' });
        }

        // Log the administrative action in the database
        await JurisdictionLog.create({
            adminId: req.user.id,
            adminEmail: req.user.email,
            userId: user._id,
            userEmail: user.email,
            oldCountry,
            newCountry: country,
            overrideType
        });

        const successMessage = overrideType === 'Permanent' 
            ? 'Legal jurisdiction updated successfully.' 
            : 'Temporary jurisdiction override activated.';

        res.status(200).json({ success: true, message: successMessage });
    } catch (error) {
        console.error('[AdminOverride] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 16. Reset Jurisdiction Override
export const resetJurisdictionOverride = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'UserId is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const oldCountry = jurisdictionManager.getTemporaryOverride(userId) || user.country || 'India';

        // Revert to original
        jurisdictionManager.removeTemporaryOverride(userId);

        // Log the reset action
        await JurisdictionLog.create({
            adminId: req.user.id,
            adminEmail: req.user.email,
            userId: user._id,
            userEmail: user.email,
            oldCountry,
            newCountry: user.country || 'India',
            overrideType: 'Temporary'
        });

        res.status(200).json({ success: true, message: 'Returns user to original saved jurisdiction.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 17. Run AI Testing panel message
export const testJurisdictionAI = async (req, res) => {
    try {
        const { userId, prompt } = req.body;
        if (!userId || !prompt) {
            return res.status(400).json({ success: false, message: 'Missing parameters' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const systemInstruction = `You are a professional legal AI. Analyze the question and answer under the active jurisdiction's laws. You MUST strictly use the active jurisdiction.`;

        const answer = await askOpenAI(prompt, null, {
            systemInstruction,
            userId: user._id.toString(),
            userName: user.name
        });

        res.status(200).json({ success: true, answer });
    } catch (error) {
        console.error('[AdminOverrideTest] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 18. CRASH LOGGING & MANAGEMENT CONTROLLERS
export const reportCrashLog = async (req, res) => {
    try {
        const { errorName, message, stack, source, platform, appVersion, route, severity, metadata } = req.body;
        const userId = req.user ? (req.user.id || req.user._id) : null;
        const userEmail = req.user ? req.user.email : (req.body.userEmail || '');

        const crash = await CrashLog.create({
            errorName: errorName || 'Error',
            message: message || 'Unknown error occurred',
            stack: stack || '',
            source: source || 'frontend',
            platform: platform || 'Unknown',
            appVersion: appVersion || '1.0.0',
            userId,
            userEmail,
            route: route || '',
            severity: severity || 'HIGH',
            status: 'UNRESOLVED',
            metadata: metadata || {}
        });

        broadcastAdminRefresh('crash:new', crash);

        res.status(201).json({ success: true, crash });
    } catch (error) {
        console.error('[reportCrashLog] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCrashLogs = async (req, res) => {
    try {
        const { source, platform, status, severity, search } = req.query;
        const query = {};

        if (source && source !== 'all') query.source = source;
        if (platform && platform !== 'all') query.platform = platform;
        if (status && status !== 'all') query.status = status;
        if (severity && severity !== 'all') query.severity = severity;
        if (search) {
            query.$or = [
                { message: { $regex: search, $options: 'i' } },
                { errorName: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { route: { $regex: search, $options: 'i' } }
            ];
        }

        const crashes = await CrashLog.find(query)
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const stats = {
            total: await CrashLog.countDocuments(),
            unresolved: await CrashLog.countDocuments({ status: 'UNRESOLVED' }),
            frontend: await CrashLog.countDocuments({ source: 'frontend' }),
            backend: await CrashLog.countDocuments({ source: 'backend' }),
            critical: await CrashLog.countDocuments({ severity: 'CRITICAL' })
        };

        res.status(200).json({ success: true, crashes, stats });
    } catch (error) {
        console.error('[getCrashLogs] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCrashStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const crash = await CrashLog.findByIdAndUpdate(id, { status }, { new: true });
        if (!crash) {
            return res.status(404).json({ success: false, message: 'Crash record not found' });
        }

        broadcastAdminRefresh('crash:update', crash);
        res.status(200).json({ success: true, crash });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const clearCrashLogs = async (req, res) => {
    try {
        const result = await CrashLog.deleteMany({ status: 'RESOLVED' });
        broadcastAdminRefresh('crash:clear', {});
        res.status(200).json({ success: true, message: `Cleared ${result.deletedCount} resolved crash logs` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


