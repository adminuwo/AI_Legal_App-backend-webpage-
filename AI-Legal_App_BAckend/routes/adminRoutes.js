import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import User from '../models/User.js';
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
    reportCrashLog,
    getCrashLogs,
    updateCrashStatus,
    clearCrashLogs
} from '../controllers/adminPortalController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Core Dashboard Stats
router.get('/stats', verifyToken, isAdmin, getAdminStats);

// User CRUD Management
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users/:id', verifyToken, isAdmin, getUserDetails);
router.put('/users/:id', verifyToken, isAdmin, updateUser);
router.post('/users/:id/change-plan', verifyToken, isAdmin, changeUserPlan);
router.post('/users/:id/adjust-credits', verifyToken, isAdmin, adjustUserCredits);
router.post('/users/:id/toggle-suspend', verifyToken, isAdmin, toggleSuspendUser);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);
router.post('/users/:id/login-as', verifyToken, isAdmin, loginAsUser);
router.post('/users/:id/reset-password', verifyToken, isAdmin, resetUserPassword);

// Billing & Payments Control
router.get('/billing', verifyToken, isAdmin, getAllBilling);
router.get('/billing/export-csv', verifyToken, isAdmin, exportBillingCsv);
router.post('/billing/:id/refund', verifyToken, isAdmin, refundPayment);
router.post('/billing/:id/mark-paid', verifyToken, isAdmin, markPaidPayment);

// Jurisdiction Override Management
router.post('/jurisdiction-override', verifyToken, isAdmin, applyJurisdictionOverride);
router.post('/jurisdiction-override/reset', verifyToken, isAdmin, resetJurisdictionOverride);
router.post('/jurisdiction-override/test', verifyToken, isAdmin, testJurisdictionAI);

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

export default router;
