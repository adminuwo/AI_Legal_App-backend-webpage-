import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import PaymentHistory from '../models/PaymentHistory.js';
import { EntitlementService } from '../services/entitlementService.js';
import jwt from 'jsonwebtoken';

/**
 * Product ID Mapping Matrix
 * Maps Google Play Subscription Product IDs to App Workspace & Tier
 */
const PLAY_PRODUCT_MAP = {
  // Advocate Workspace
  advocate_basic: { workspace: 'advocate', tier: 'BASIC', planId: 'advocate_basic' },
  advocate_pro: { workspace: 'advocate', tier: 'PROFESSIONAL', planId: 'advocate_pro' },
  advocate_premium: { workspace: 'advocate', tier: 'PREMIUM', planId: 'advocate_premium' },

  // Student Workspace
  student_basic: { workspace: 'student', tier: 'BASIC', planId: 'student_basic' },
  student_pro: { workspace: 'student', tier: 'PROFESSIONAL', planId: 'student_pro' },
  student_premium: { workspace: 'student', tier: 'PREMIUM', planId: 'student_premium' },

  // Law Firm Workspace
  firm_basic: { workspace: 'lawfirm', tier: 'BASIC', planId: 'firm_basic' },
  firm_pro: { workspace: 'lawfirm', tier: 'PROFESSIONAL', planId: 'firm_pro' },
  firm_premium: { workspace: 'lawfirm', tier: 'PREMIUM', planId: 'firm_premium' },

  // Combo Bundles
  combo_student_advocate: { workspace: 'combo', tier: 'BASIC', planId: 'combo_student_advocate' },
  combo_advocate_firm: { workspace: 'combo', tier: 'PROFESSIONAL', planId: 'combo_advocate_firm' },
  combo_all_access: { workspace: 'combo', tier: 'PREMIUM', planId: 'combo_all_access' },
};

/**
 * POST /api/subscription/google-play/verify
 * Validates Google Play In-App Subscription purchase tokens (Sandbox & Production)
 * Grants workspace entitlements & updates user profile in database.
 */
export const verifyGooglePlaySubscription = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const {
      purchaseToken,
      productId,
      packageName = 'com.ailegal.mobile',
      orderId,
      workspace = 'advocate',
      billingCycle = 'monthly',
    } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required. User ID missing.' });
    }

    if (!purchaseToken || !productId) {
      return res.status(400).json({ success: false, message: 'Missing required purchaseToken or productId.' });
    }

    const isSandboxToken =
      purchaseToken.startsWith('sandbox_') ||
      purchaseToken.includes('test') ||
      orderId?.startsWith('GPA.0000-0000-0000-00000') ||
      orderId?.startsWith('GPA.SANDBOX');

    if (process.env.NODE_ENV === 'production' && isSandboxToken) {
      return res.status(400).json({ success: false, message: 'Sandbox purchase tokens are not permitted in production' });
    }

    if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY) {
      return res.status(503).json({ success: false, message: 'Google Play verification service is unconfigured' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('\n============================================================');
      console.log('💳 [GOOGLE PLAY IAP SUBSCRIPTION VERIFICATION VERIFIED]');
      console.log(`📦 Product ID    : ${productId}`);
      console.log(`👤 User ID       : ${userId}`);
      console.log(`🎟️ PurchaseToken : ${purchaseToken ? purchaseToken.substring(0, 8) + '...' : ''}`);
      console.log(`🏷️ Order ID      : ${orderId || 'GPA.SANDBOX-AUTOGEN'}`);
      console.log(`🏢 Target Workspace: ${workspace}`);
      console.log(`🔄 Billing Cycle : ${billingCycle}`);
      console.log(`🧪 Environment   : ${isSandboxToken ? 'GOOGLE PLAY SANDBOX / TEST MODE' : 'PRODUCTION'}`);
      console.log('============================================================\n');
    }

    let verificationDetails = {
      verified: true,
      sandbox: isSandboxToken,
      gateway: 'GooglePlay',
    };

    // Server-to-Server Google Play Developer API verification (if key is present)
    if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY && !isSandboxToken) {
      try {
        const { google } = await import('googleapis');
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY),
          scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        const androidPublisher = google.androidpublisher({ version: 'v3', auth });
        const playRes = await androidPublisher.purchases.subscriptions.get({
          packageName,
          subscriptionId: productId,
          token: purchaseToken,
        });

        if (playRes.data) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[GooglePlayIAP] Live Play Console response status:', playRes.data.paymentState);
          }
          verificationDetails.playResponse = { paymentState: playRes.data.paymentState };
        }
      } catch (googleApiErr) {
        console.warn('[GooglePlayIAP] Google Play API verification failed:', googleApiErr.message);
        if (process.env.NODE_ENV === 'production') {
          return res.status(400).json({ success: false, message: 'Google Play subscription verification failed.' });
        }
      }
    }

    const mappedConfig = PLAY_PRODUCT_MAP[productId] || {
      workspace: workspace || 'advocate',
      tier: 'PROFESSIONAL',
      planId: productId,
    };

    const targetPlanId = mappedConfig.planId;
    const effectiveOrderId = orderId || `GPA.SANDBOX-${Date.now()}`;
    const invoiceId = `INV-GP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate plan amount (defaults for recording payment log)
    const pricingMap = {
      advocate_basic: 499, advocate_pro: 999, advocate_premium: 2399,
      student_basic: 499, student_pro: 999, student_premium: 2399,
      firm_basic: 1499, firm_pro: 2999, firm_premium: 4999,
      combo_student_advocate: 1199, combo_advocate_firm: 1499, combo_all_access: 2399,
    };

    const monthlyAmount = pricingMap[targetPlanId] || 999;
    const amount = billingCycle === 'yearly' ? monthlyAmount * 10 : monthlyAmount;

    // Log Payment History
    await PaymentHistory.create({
      accountId: userId,
      razorpayPaymentId: purchaseToken.slice(0, 40),
      razorpayOrderId: effectiveOrderId,
      invoice: invoiceId,
      gateway: 'GooglePlay',
      amount,
      currency: 'INR',
      status: 'paid',
      paidAt: new Date(),
    });

    // Create Subscription & Items via Entitlement Service
    const subscription = await EntitlementService.createSubscriptionRecords({
      accountId: userId,
      planId: targetPlanId,
      billingCycle,
      amount,
      paymentId: purchaseToken,
      orderId: effectiveOrderId,
      invoiceId,
    });

    // Update User Profile
    const user = await User.findById(userId);
    let newToken = null;

    if (user) {
      const tierStr = (subscription.tier || '').toUpperCase();
      const planMap = {
        BASIC: 'BASIC', STARTER: 'STARTER',
        PRO: 'PRO', PROFESSIONAL: 'PROFESSIONAL',
        PREMIUM: 'PREMIUM', ENTERPRISE: 'ENTERPRISE',
        FREE: 'FREE',
      };
      const tierKey = Object.keys(planMap).find(k => tierStr.includes(k)) || 'FREE';
      const normalizedPlan = planMap[tierKey] || 'FREE';

      user.currentTier = subscription.tier;
      user.currentWorkspace = subscription.workspace;
      user.subscription = {
        plan: normalizedPlan,
        status: 'active',
        paymentId: purchaseToken,
        orderId: effectiveOrderId,
        expiryDate: subscription.expiryDate,
        purchaseDate: subscription.startDate,
        amount: subscription.amount,
        currency: 'INR',
        gateway: 'GooglePlay',
        invoice: invoiceId,
        autoRenew: true,
      };

      await user.save();

      // Refresh JWT token
      const tokenSecret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'secret';
      newToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
          currentWorkspace: subscription.workspace,
          currentTier: subscription.tier,
          subscriptionStatus: 'active',
        },
        tokenSecret,
        { expiresIn: '30d' }
      );
    }

    const entitlements = await EntitlementService.getEntitlements(userId, subscription.workspace);

    console.log(`[GooglePlayIAP] Successfully activated ${subscription.tier} for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Google Play subscription verified & entitlements unlocked!',
      token: newToken,
      user,
      subscription,
      entitlements,
      verification: verificationDetails,
    });
  } catch (err) {
    console.error('[GooglePlayIAP] Error verifying subscription:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error processing Google Play purchase.' });
  }
};

/**
 * POST /api/subscription/google-play/restore
 * Restores past active Google Play purchases for user
 */
export const restoreGooglePlayPurchases = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { purchases = [] } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!purchases || purchases.length === 0) {
      // Check existing active database subscriptions
      const activeSub = await Subscription.findOne({
        accountId: userId,
        status: 'active',
        expiryDate: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (activeSub) {
        const user = await User.findById(userId);
        return res.status(200).json({
          success: true,
          message: 'Active subscription restored from account records.',
          user,
          subscription: activeSub,
        });
      }

      return res.status(404).json({ success: false, message: 'No active Google Play purchases found to restore.' });
    }

    // Process highest value purchase in the list
    const latestPurchase = purchases[purchases.length - 1];
    const { purchaseToken, productId } = latestPurchase;

    req.body = {
      purchaseToken,
      productId,
      workspace: 'advocate',
      billingCycle: 'monthly',
    };

    return await verifyGooglePlaySubscription(req, res);
  } catch (err) {
    console.error('[GooglePlayIAP] Restore error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
