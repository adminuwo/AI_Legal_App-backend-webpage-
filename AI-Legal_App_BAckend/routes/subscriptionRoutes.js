import express from 'express';
import { 
    getSubscriptionDetails, 
    purchasePlan, 
    purchaseCredits, 
    createOrder, 
    getCreditLogs, 
    deductCredits,
    verifySubscriptionPayment,
    restorePurchase
} from '../controllers/subscriptionController.js';
import {
    getCurrentSubscription,
    getPlansConfig,
    createSubscriptionOrder,
    generateCheckoutToken,
    renderWebCheckoutPage,
    verifySubscriptionPayment as verifySubscriptionPaymentV1,
    getEntitlementsApi,
    getUsageApi,
    resetUsageApi,
    recordUsageApi,
    getPaymentHistory,
    adminGetSubscribers,
    cancelSubscriptionApi,
    enableSubscriptionAutoRenewApi,
    verifyApplePurchase,
    verifyGooglePlayPurchase
} from '../controllers/subscriptionV1Controller.js';
import { verifyToken, optionalVerifyToken, isAdmin } from '../middleware/authorization.js'; 

import {
    verifyGooglePlaySubscription,
    restoreGooglePlayPurchases,
} from '../controllers/googlePlayIapController.js';

const router = express.Router();

import { validateCouponApi } from '../controllers/couponController.js';

// --- Subscription Structure V1.0 & Web Checkout Redirect Endpoints ---
router.get('/web-checkout', renderWebCheckoutPage);
router.get('/web-checkout-portal', renderWebCheckoutPage);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/plans', getPlansConfig);
router.post('/validate-coupon', optionalVerifyToken, validateCouponApi);
router.post('/generate-checkout-token', verifyToken, generateCheckoutToken);
router.post('/create-order', verifyToken, createSubscriptionOrder);
router.post('/verify-payment', verifyToken, verifySubscriptionPaymentV1);
router.post('/cancel', verifyToken, cancelSubscriptionApi);
router.post('/enable-autorenew', verifyToken, enableSubscriptionAutoRenewApi);
router.get('/entitlements', verifyToken, getEntitlementsApi);
router.get('/usage', verifyToken, getUsageApi);
router.post('/record-usage', verifyToken, recordUsageApi);
router.post('/reset-usage', verifyToken, resetUsageApi);
router.get('/payments/history', verifyToken, getPaymentHistory);
router.get('/admin/subscribers', verifyToken, isAdmin, adminGetSubscribers);

// --- Apple In-App Purchase (StoreKit) Endpoints ---
router.post('/apple/verify', verifyToken, verifyApplePurchase);

// --- Google Play Billing (IAP) Endpoints ---
router.post('/google-play/verify', verifyToken, verifyGooglePlaySubscription);
router.post('/google-play/restore', verifyToken, restoreGooglePlayPurchases);

// --- Legacy Backwards Compatibility Routes ---
router.get('/', verifyToken, getSubscriptionDetails);
router.get('/status', verifyToken, getSubscriptionDetails);
router.get('/credit-history', verifyToken, getCreditLogs);
router.get('/user-credits', verifyToken, getSubscriptionDetails);
router.post('/purchase', verifyToken, purchasePlan);
router.post('/buy-credits', verifyToken, purchaseCredits);
router.post('/deduct-credits', verifyToken, deductCredits);
router.post('/restore', verifyToken, restorePurchase);

export default router;
