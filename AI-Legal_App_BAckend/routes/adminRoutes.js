import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import User from '../models/User.js';
import AdvocateInvitation from '../models/AdvocateInvitation.js';
import multer from 'multer';

import {
    createPlan,
    updatePlan,
    deletePlan,
    getAllPlansAdmin,
    parseLegalDoc
} from '../controllers/adminController.js';

import {
    getAdminStats,
    getAllUsers,
    getUserDetails,
    updateUser,
    toggleSuspendUser,
    deleteUser,
    adjustUserCredits,
    changeUserPlan,
    loginAsUser,
    resetUserPassword,
    getAllBilling,
    refundPayment,
    markPaidPayment,
    exportBillingCsv,
    applyJurisdictionOverride,
    resetJurisdictionOverride,
    testJurisdictionAI,
    handleJurisdictionSandboxTest,
    reportCrashLog,
    getCrashLogs,
    updateCrashStatus,
    clearCrashLogs,
    getInstitutionalAddonRequests,
    updateInstitutionalAddonRequestStatus,
    updateUserRole,
    getFeatureAdoptionAnalytics
} from '../controllers/adminPortalController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Core Dashboard Stats
router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/analytics/feature-adoption', verifyToken, isAdmin, getFeatureAdoptionAnalytics);

// User CRUD Management
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users/:id', verifyToken, isAdmin, getUserDetails);
router.put('/users/:id', verifyToken, isAdmin, updateUser);
router.put('/users/:id/role', verifyToken, isAdmin, updateUserRole);
router.post('/users/:id/change-plan', verifyToken, isAdmin, changeUserPlan);
router.put('/users/:id/subscription', verifyToken, isAdmin, changeUserPlan);
router.post('/users/:id/subscription', verifyToken, isAdmin, changeUserPlan);
router.post('/users/:id/adjust-credits', verifyToken, isAdmin, adjustUserCredits);
router.post('/users/:id/credits', verifyToken, isAdmin, adjustUserCredits);
router.put('/users/:id/credits', verifyToken, isAdmin, adjustUserCredits);
router.post('/users/:id/toggle-suspend', verifyToken, isAdmin, toggleSuspendUser);
router.put('/users/:id/suspend', verifyToken, isAdmin, toggleSuspendUser);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);
router.post('/users/:id/login-as', verifyToken, isAdmin, loginAsUser);
router.post('/users/:id/reset-password', verifyToken, isAdmin, resetUserPassword);

// Billing & Payments Control
router.get('/billing', verifyToken, isAdmin, getAllBilling);
router.get('/billing/export-csv', verifyToken, isAdmin, exportBillingCsv);
router.post('/billing/:id/refund', verifyToken, isAdmin, refundPayment);
router.post('/billing/:id/mark-paid', verifyToken, isAdmin, markPaidPayment);

// Jurisdiction Override & Sandbox Testing Management
router.post('/jurisdiction-override', verifyToken, isAdmin, applyJurisdictionOverride);
router.post('/jurisdiction-override/reset', verifyToken, isAdmin, resetJurisdictionOverride);
router.post('/jurisdiction-override/test', verifyToken, isAdmin, testJurisdictionAI);
router.post('/jurisdiction-sandbox-test', verifyToken, isAdmin, handleJurisdictionSandboxTest);

import {
    adminGetAllCoupons,
    adminCreateCoupon,
    adminGetCouponDetails,
    adminUpdateCoupon,
    adminToggleCouponStatus,
    adminDeleteCoupon,
    adminToggleCouponFeature
} from '../controllers/couponController.js';

// Plan Management CRUD
router.get('/plans', verifyToken, isAdmin, getAllPlansAdmin);
router.post('/plans', verifyToken, isAdmin, createPlan);
router.put('/plans/:planId', verifyToken, isAdmin, updatePlan);
router.delete('/plans/:planId', verifyToken, isAdmin, deletePlan);

// Coupon Management CRUD
router.get('/coupons', verifyToken, isAdmin, adminGetAllCoupons);
router.patch('/coupons/toggle-feature', verifyToken, isAdmin, adminToggleCouponFeature);
router.post('/coupons', verifyToken, isAdmin, adminCreateCoupon);
router.get('/coupons/:id', verifyToken, isAdmin, adminGetCouponDetails);
router.put('/coupons/:id', verifyToken, isAdmin, adminUpdateCoupon);
router.patch('/coupons/:id/status', verifyToken, isAdmin, adminToggleCouponStatus);
router.delete('/coupons/:id', verifyToken, isAdmin, adminDeleteCoupon);

// Document Intelligence / Parsing Utilities
router.post('/parse-legal-doc', verifyToken, isAdmin, upload.single('file'), parseLegalDoc);

// Crash Logs Management
router.post('/crashes', reportCrashLog);
router.get('/crashes', verifyToken, isAdmin, getCrashLogs);
router.patch('/crashes/:id/status', verifyToken, isAdmin, updateCrashStatus);
router.delete('/crashes/clear', verifyToken, isAdmin, clearCrashLogs);

// User Lifecycle & Email Audit Reporting
import { getLifecycleReportData, generateLifecycleExcelBuffer } from '../services/userLifecycleService.js';

router.get('/lifecycle', verifyToken, isAdmin, async (req, res) => {
    try {
        const { dateRange = 'all' } = req.query;
        const data = await getLifecycleReportData(dateRange);
        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        console.error('[ADMIN LIFECYCLE ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/lifecycle/export', verifyToken, isAdmin, async (req, res) => {
    try {
        const { dateRange = 'all' } = req.query;
        const buffer = await generateLifecycleExcelBuffer(dateRange);
        const filename = `ai_legal_user_lifecycle_report_${new Date().toISOString().slice(0, 10)}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(buffer);
    } catch (err) {
        console.error('[ADMIN LIFECYCLE EXPORT ERROR]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Convee-Education Linked Organizations Management
import {
    getLinkedOrganizations,
    toggleOrgSubscription,
    seedSampleConveeOrgs
} from '../controllers/linkedOrgController.js';

router.get('/linked-organizations', verifyToken, isAdmin, getLinkedOrganizations);
router.post('/linked-organizations/:orgSlug/toggle-subscription', verifyToken, isAdmin, toggleOrgSubscription);
router.post('/linked-organizations/seed-sample', verifyToken, isAdmin, seedSampleConveeOrgs);

// Institutional Add-on Feature Requests (Law Universities & Enterprises)
router.get('/addon-requests', verifyToken, isAdmin, getInstitutionalAddonRequests);
router.patch('/addon-requests/:id/status', verifyToken, isAdmin, updateInstitutionalAddonRequestStatus);
router.post('/addon-requests/:id/status', verifyToken, isAdmin, updateInstitutionalAddonRequestStatus);

// =========================================================================
// ADVOCATE VERIFICATION MANAGEMENT (ADMIN PORTAL)
// =========================================================================

// @desc    Get all advocate verification applications
// @route   GET /api/admin/advocate-verifications
// @access  Admin
router.get('/advocate-verifications', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let userResults = [];
        let inviteResults = [];

        const normalizedStatus = (status || 'all').toLowerCase();

        if (normalizedStatus === 'invited') {
            inviteResults = await AdvocateInvitation.find({ status: 'invited' }).sort({ createdAt: -1 }).lean();
        } else if (normalizedStatus === 'all') {
            userResults = await User.find({
                email: { $not: /@ailegal\.app$/i },
                'advocateVerification.verificationStatus': { $in: ['pending', 'verified', 'rejected', 'suspended'] }
            })
            .select('name fullName email phone avatar state country role advocateVerification personalizations.advocateProfile createdAt')
            .sort({ 'advocateVerification.verificationSubmittedAt': -1, createdAt: -1 })
            .lean();

            inviteResults = await AdvocateInvitation.find({ status: { $in: ['invited', 'expired'] } }).sort({ createdAt: -1 }).lean();
        } else {
            userResults = await User.find({
                email: { $not: /@ailegal\.app$/i },
                'advocateVerification.verificationStatus': normalizedStatus
            })
            .select('name fullName email phone avatar state country role advocateVerification personalizations.advocateProfile createdAt')
            .sort({ 'advocateVerification.verificationSubmittedAt': -1, createdAt: -1 })
            .lean();
        }

        const mappedUsers = userResults.map(a => {
            const advProf = a.personalizations?.advocateProfile || {};
            const advVer = a.advocateVerification || {};
            return {
                id: a._id,
                _id: a._id,
                name: advVer.fullName || a.fullName || a.name || advProf.fullName || 'Advocate',
                email: a.email,
                phone: a.phone || advProf.phoneNumber || '',
                avatar: a.avatar || '/User.jpeg',
                state: a.state || advProf.state || '',
                city: advProf.city || '',
                barCouncil: advVer.barCouncil || advProf.stateBarCouncil || '',
                barEnrollmentNumber: advVer.barEnrollmentNumber || advProf.barNumber || '',
                enrollmentYear: advVer.enrollmentYear || advProf.enrollmentYear || '',
                practiceAreas: (advVer.practiceAreas && advVer.practiceAreas.length > 0) ? advVer.practiceAreas : (advProf.practiceAreas || []),
                courts: (advVer.primaryCourts && advVer.primaryCourts.length > 0) ? advVer.primaryCourts : (advProf.primaryCourt ? [advProf.primaryCourt] : []),
                experienceYears: advVer.experienceYears || advProf.practiceExperience || '',
                languages: (advVer.languages && advVer.languages.length > 0) ? advVer.languages : (advProf.languagesKnown ? advProf.languagesKnown.split(',').map(s => s.trim()) : ['English', 'Hindi']),
                bio: advVer.bio || advProf.bio || '',
                consultationFee: advVer.consultationFee || 1500,
                consultationTypes: (advVer.consultationTypes && advVer.consultationTypes.length > 0) ? advVer.consultationTypes : ['chat', 'audio', 'video'],
                availability: advVer.availability || 'Available Today',
                verificationDocument: advVer.verificationDocument || null,
                verificationStatus: advVer.verificationStatus || 'not_registered',
                listingConsent: advVer.listingConsent || 'none',
                listingConsentAt: advVer.listingConsentAt,
                verificationSubmittedAt: advVer.verificationSubmittedAt || a.createdAt,
                verifiedAt: advVer.verifiedAt,
                rejectionReason: advVer.rejectionReason || '',
                isInvitation: false,
                invitationStatus: 'Accepted'
            };
        });

        const mappedInvites = inviteResults.map(inv => ({
            id: inv._id,
            _id: inv._id,
            name: inv.invitedName || 'Invited Counsel',
            email: inv.invitedEmail,
            phone: '',
            avatar: '/User.jpeg',
            state: '',
            city: '',
            barCouncil: 'Pending Registration',
            barEnrollmentNumber: 'Pending Registration',
            enrollmentYear: '',
            practiceAreas: [],
            courts: [],
            experienceYears: 'To be completed',
            languages: ['English', 'Hindi'],
            bio: 'Invited to AI Legal Verified Advocate Network. Awaiting profile completion and consent acceptance.',
            consultationFee: 1500,
            consultationTypes: ['chat', 'audio', 'video'],
            availability: 'Pending Invite',
            verificationDocument: null,
            verificationStatus: inv.status === 'expired' ? 'expired' : 'invited',
            listingConsent: 'none',
            isInvitation: true,
            invitationStatus: inv.status === 'expired' ? 'Expired' : 'Invited',
            invitationId: inv._id,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt
        }));

        const combinedAdvocates = [...mappedInvites, ...mappedUsers];

        res.json({
            success: true,
            total: combinedAdvocates.length,
            advocates: combinedAdvocates
        });
    } catch (err) {
        console.error('[ADMIN ADVOCATE VERIFICATION ERROR]', err);
        res.status(500).json({ success: false, message: 'Failed to fetch advocate verifications.' });
    }
});

// @desc    Approve or reject advocate verification application
// @route   PATCH /api/admin/advocate-verifications/:id/status
// @access  Admin
router.patch('/advocate-verifications/:id/status', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status, reason } = req.body;
        const validStatuses = ['verified', 'rejected', 'suspended', 'pending'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Advocate user not found.' });
        }

        if (!user.advocateVerification) {
            user.advocateVerification = {};
        }

        user.advocateVerification.verificationStatus = status;
        if (status === 'verified') {
            user.advocateVerification.verifiedAt = new Date();
            user.advocateVerification.verifiedBy = req.user.id;
            user.advocateVerification.rejectionReason = '';
            user.advocateVerification.profileStatus = 'active';
        } else if (status === 'rejected') {
            user.advocateVerification.rejectionReason = reason || 'Verification documents could not be validated.';
        }

        await user.save();

        // Dispatch in-app notification to advocate
        try {
            const { createNotification } = await import('../services/notificationService.js');
            if (status === 'verified') {
                await createNotification(user._id, {
                    title: 'Congratulations! Verification Approved',
                    message: 'Your profile has been verified as a Verified Advocate and is now visible to clients.',
                    category: 'Alerts',
                    priority: 'High'
                });
            } else if (status === 'rejected') {
                await createNotification(user._id, {
                    title: 'Verification Needs Attention',
                    message: reason || 'Your verification request could not be approved. Please review your details and re-submit.',
                    category: 'Alerts',
                    priority: 'High'
                });
            }
        } catch (nErr) {
            console.warn('[ADMIN NOTIFICATION] Failed to dispatch verification status notification:', nErr.message);
        }

        res.json({
            success: true,
            message: `Advocate verification status updated to ${status}.`,
            verificationStatus: user.advocateVerification.verificationStatus,
            rejectionReason: user.advocateVerification.rejectionReason
        });
    } catch (err) {
        console.error('[ADMIN ADVOCATE VERIFICATION STATUS ERROR]', err);
        res.status(500).json({ success: false, message: 'Failed to update verification status.' });
    }
});

export default router;

