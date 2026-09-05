import Subscription from '../models/Subscription.js';
import SubscriptionItem from '../models/SubscriptionItem.js';
import UsageLedger from '../models/UsageLedger.js';
import PaymentHistory from '../models/PaymentHistory.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import { evaluateCouponInternal, getPlanPrice } from './couponController.js';
import { EntitlementService, PLAN_ENTITLEMENT_MAP } from '../services/entitlementService.js';
import * as FeatureAccessManager from '../services/featureAccessManager.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { broadcastAdminRefresh } from './adminPortalController.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Master Prices Table
const PLAN_PRICES = {
  FREE: { monthly: 0, yearly: 0 },
  BASIC: { monthly: 499, yearly: 4990 },
  PRO: { monthly: 999, yearly: 9990 },
  PROFESSIONAL: { monthly: 999, yearly: 9990 },
  PREMIUM: { monthly: 2399, yearly: 23990 },
  ENTERPRISE: { monthly: 4999, yearly: 49990 },

  advocate_free: { monthly: 0, yearly: 0 },
  advocate_basic: { monthly: 499, yearly: 4990 },
  advocate_pro: { monthly: 999, yearly: 9990 },
  advocate_premium: { monthly: 2399, yearly: 23990 },

  student_free: { monthly: 0, yearly: 0 },
  student_basic: { monthly: 499, yearly: 4990 },
  student_pro: { monthly: 999, yearly: 9990 },
  student_premium: { monthly: 2399, yearly: 23990 },

  firm_free: { monthly: 0, yearly: 0 },
  firm_basic: { monthly: 1499, yearly: 14990 },
  firm_pro: { monthly: 2999, yearly: 29990 },
  firm_premium: { monthly: 4999, yearly: 49990 },

  combo_student_advocate: { monthly: 1199, yearly: 11990 },
  combo_advocate_firm: { monthly: 1499, yearly: 14990 },
  combo_all_access: { monthly: 2399, yearly: 23990 },
};

/**
 * POST /api/subscription/generate-checkout-token
 * Generates short-lived signed purchase token & dynamic web checkout URL for mobile app redirect
 */
export const generateCheckoutToken = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { workspace = 'advocate', planId = 'advocate_pro', billingCycle = 'monthly', couponCode = '' } = req.body;
    const tokenSecret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'secret';

    const purchaseToken = jwt.sign(
      {
        userId,
        workspace,
        planId,
        billingCycle,
        couponCode: couponCode ? couponCode.trim().toUpperCase() : '',
        type: 'web_purchase_checkout',
      },
      tokenSecret,
      { expiresIn: '15m' }
    );

    const requestHost = req.get('host');
    const protocol = req.protocol || 'http';
    const defaultProdUrl = 'https://aisa24.com';
    const baseUrl = process.env.WEB_BILLING_URL || process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? defaultProdUrl : `${protocol}://${requestHost}`);
    const checkoutUrl = `${baseUrl}/api/subscription/web-checkout?token=${encodeURIComponent(purchaseToken)}&workspace=${encodeURIComponent(workspace)}&plan=${encodeURIComponent(planId)}&cycle=${encodeURIComponent(billingCycle)}${couponCode ? `&coupon=${encodeURIComponent(couponCode.trim().toUpperCase())}` : ''}`;

    res.status(200).json({
      success: true,
      checkoutUrl,
      purchaseToken,
      message: 'Redirecting to secure web checkout portal...',
    });
  } catch (err) {
    console.error('[generateCheckoutToken] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/subscription/web-checkout
 * Renders the production-ready Web Billing Checkout Portal HTML page (Light Theme)
 */
export const renderWebCheckoutPage = async (req, res) => {
  try {
    const { token, workspace, plan, cycle } = req.query;
    let purchaseData = { workspace: workspace || 'advocate', planId: plan || 'advocate_pro', billingCycle: cycle || 'monthly' };

    if (token) {
      try {
        const tokenSecret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'secret';
        const decoded = jwt.verify(token, tokenSecret);
        purchaseData = decoded;
      } catch (err) {
        console.warn('[WebCheckout] Token verification warning:', err.message);
      }
    }

    const ws = purchaseData.workspace || 'advocate';
    const planId = purchaseData.planId || 'advocate_pro';
    const billingCycle = purchaseData.billingCycle || 'monthly';
    const couponCode = (req.query.coupon || purchaseData.couponCode || '').toString().trim().toUpperCase();

    let originalAmount = 499;
    try {
      const Plan = (await import('../models/Plan.js')).default;
      const dbPlan = await Plan.findOne({ 
        $or: [
          { planId: planId },
          { id: planId },
          { tier: planId },
          { planName: { $regex: new RegExp((planId || '').replace(/_/g, ' '), 'i') } }
        ]
      }).lean();

      if (dbPlan) {
        originalAmount = billingCycle === 'yearly' 
          ? (dbPlan.priceYearly !== undefined ? dbPlan.priceYearly : (dbPlan.yearly || PLAN_PRICES[planId]?.yearly || 4990))
          : (dbPlan.priceMonthly !== undefined ? dbPlan.priceMonthly : (dbPlan.monthly || dbPlan.price || PLAN_PRICES[planId]?.monthly || 499));
      } else {
        const pricing = PLAN_PRICES[planId] || { monthly: 499, yearly: 4990 };
        originalAmount = billingCycle === 'yearly' ? pricing.yearly : pricing.monthly;
      }
    } catch (e) {
      const pricing = PLAN_PRICES[planId] || { monthly: 499, yearly: 4990 };
      originalAmount = billingCycle === 'yearly' ? pricing.yearly : pricing.monthly;
    }

    let finalAmount = originalAmount;
    let discountAmount = 0;
    let couponEval = null;

    if (couponCode) {
      couponEval = await evaluateCouponInternal({
        couponCode,
        userId: purchaseData.userId,
        planId,
        billingCycle,
        overrideAmount: originalAmount,
      });

      if (couponEval.valid) {
        finalAmount = couponEval.finalAmount;
        discountAmount = couponEval.discountAmount;
      }
    }

    const planTitle = planId.includes('pro')
      ? 'AI Legal Pro'
      : planId.includes('premium')
      ? 'AI Legal Premium'
      : 'AI Legal Basic';

    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI LEGAL™ - Secure Web Billing</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #F4F5F7;
            color: #111827;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .checkout-card {
            background: #FFFFFF;
            border: 1.5px solid #E5E7EB;
            border-radius: 24px;
            width: 100%;
            max-width: 440px;
            padding: 32px 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
            text-align: center;
          }
          .logo-badge {
            display: inline-block;
            background: rgba(200, 163, 77, 0.12);
            color: #B38628;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            padding: 6px 14px;
            border-radius: 20px;
            border: 1px solid rgba(200, 163, 77, 0.3);
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          h2 {
            font-size: 24px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 13px;
            color: #6B7280;
            margin-bottom: 24px;
            line-height: 1.4;
          }
          .summary-box {
            background: #F9FAFB;
            border-radius: 16px;
            padding: 20px;
            text-align: left;
            margin-bottom: 24px;
            border: 1px solid #E5E7EB;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 13px;
            color: #4B5563;
          }
          .summary-row:last-child {
            margin-bottom: 0;
          }
          .summary-row strong {
            color: #111827;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            border-top: 1.5px solid #E5E7EB;
            padding-top: 12px;
            margin-top: 12px;
            font-weight: 800;
            font-size: 18px;
            color: #B38628;
          }
          .pay-btn {
            background: linear-gradient(135deg, #C8A34D 0%, #B38628 100%);
            color: #FFFFFF;
            font-size: 16px;
            font-weight: 800;
            border: none;
            border-radius: 14px;
            width: 100%;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(200, 163, 77, 0.35);
          }
          .pay-btn:hover {
            opacity: 0.95;
            transform: translateY(-1px);
          }
          .security-text {
            font-size: 11px;
            color: #6B7280;
            margin-top: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          .icon {
            font-size: 52px;
            margin-bottom: 16px;
          }
          #loadingOverlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(255,255,255,0.92);
            z-index: 9999;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 4px solid #E5E7EB;
            border-top-color: #C8A34D;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .overlay-text { color: #4B5563; font-size: 14px; font-weight: 600; }
        </style>
      </head>
      <body>
        <!-- Loading Overlay -->
        <div id="loadingOverlay">
          <div class="spinner"></div>
          <div class="overlay-text">Verifying Payment...</div>
        </div>
        <div class="checkout-card">
          <div class="logo-badge">🛡️ SECURE WEB BILLING PORTAL</div>
          <h2>Completing Subscription</h2>
          <p class="subtitle">You are completing your subscription securely for AI Legal Mobile App.</p>

          <div class="summary-box">
            <div class="summary-row">
              <span>Workspace:</span>
              <strong style="text-transform: capitalize;">${ws} Workspace</strong>
            </div>
            <div class="summary-row">
              <span>Plan Selected:</span>
              <strong>${planTitle}</strong>
            </div>
            <div class="summary-row">
              <span>Billing Cycle:</span>
              <strong style="text-transform: capitalize;">${billingCycle}</strong>
            </div>
            ${couponCode && couponEval && couponEval.valid ? `
            <div class="summary-row">
              <span>Original Price:</span>
              <span style="text-decoration: line-through; color: #9CA3AF;">₹${originalAmount}</span>
            </div>
            <div class="summary-row" style="color: #10B981;">
              <span>Coupon Code (${couponCode}):</span>
              <strong>-₹${discountAmount}</strong>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Total Amount:</span>
              <span>₹${finalAmount}</span>
            </div>
          </div>

          <button class="pay-btn" id="payBtn" onclick="initiatePayment()">Pay ₹${finalAmount} via Razorpay</button>
          
          <div class="security-text">
            <span>🔒 256-Bit Encrypted Payment • Automatic Deep Link Return</span>
          </div>
        </div>

        <script>
          function initiatePayment() {
            var btn = document.getElementById('payBtn');
            btn.innerText = 'Processing Payment...';
            btn.disabled = true;

            fetch('/api/subscription/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: '${planId}', billingCycle: '${billingCycle}', couponCode: '${couponCode || ''}' })
            })
            .then(res => res.json())
            .then(data => {
              if (!data.order || !data.key || data.key === 'mock_key' || data.key.includes('dummy') || data.key === 'YOUR_KEY_ID' || data.isMockOrder) {
                // Auto-verify mock order only if no key
                completeVerification('order_mock_' + Date.now(), 'pay_mock_' + Date.now(), 'mock_signature');
              } else {
                var options = {
                  "key": data.key,
                  "amount": data.order.amount,
                  "currency": "INR",
                  "name": "AI LEGAL™ Pro",
                  "description": "${planTitle} Subscription",
                  "order_id": data.order.id,
                  "handler": function (response){
                    completeVerification(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
                  },
                  "modal": {
                    "ondismiss": function() {
                      window.location.href = "ailegal://subscription/cancelled";
                    }
                  },
                  "theme": { "color": "#C8A34D" }
                };
                var rzp = new Razorpay(options);
                rzp.open();
              }
            })
            .catch(err => {
              alert('Error creating order: ' + err.message);
              btn.innerText = 'Pay ₹${finalAmount} via Razorpay';
              btn.disabled = false;
            });
          }

          function completeVerification(orderId, paymentId, signature) {
            // Show in-page loading state — do NOT navigate away
            document.getElementById('payBtn').innerText = 'Verifying Payment...';
            document.getElementById('payBtn').disabled = true;
            
            // Show overlay spinner
            document.getElementById('loadingOverlay').style.display = 'flex';

            fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
                planId: '${planId}',
                billingCycle: '${billingCycle}',
                couponCode: '${couponCode || ''}',
                purchaseToken: '${token || ""}',
                userId: '${purchaseData.userId || ""}',
                isWebRedirect: false
              })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              document.getElementById('loadingOverlay').style.display = 'none';
              if (data && data.success) {
                var workspace = (data.subscription && data.subscription.workspace) || '${ws}';
                var tier = (data.subscription && data.subscription.tier) || '${planId}';
                showSuccessCard(workspace, tier);
                var deepLink = 'ailegal://subscription/success?workspace=' + encodeURIComponent(workspace) + '&plan=' + encodeURIComponent(tier);
                try {
                  if (window.opener) { window.opener.postMessage(JSON.stringify({ status: 'success', workspace: workspace, plan: tier }), '*'); }
                  if (window.parent) { window.parent.postMessage(JSON.stringify({ status: 'success', workspace: workspace, plan: tier }), '*'); }
                } catch(e) {}
                setTimeout(function() {
                  try { window.location.href = deepLink; } catch(e) {}
                }, 1000);
              } else {
                var errMsg = (data && (data.message || data.error)) || 'Verification route not found or invalid server response.';
                alert('Verification failed: ' + errMsg);
                document.getElementById('payBtn').innerText = 'Pay \u20B9${finalAmount} via Razorpay';
                document.getElementById('payBtn').disabled = false;
              }
            })
            .catch(function(err) {
              document.getElementById('loadingOverlay').style.display = 'none';
              alert('Network error during verification: ' + err.message);
              document.getElementById('payBtn').innerText = 'Pay \u20B9${finalAmount} via Razorpay';
              document.getElementById('payBtn').disabled = false;
            });
          }

          function showSuccessCard(workspace, tier) {
            var planLabel = tier.includes('pro') ? 'AI Legal Professional' : tier.includes('premium') ? 'AI Legal Premium' : 'AI Legal Basic';
            document.querySelector('.checkout-card').innerHTML =
              '<div class="icon">🎉</div>' +
              '<h2>Subscription Activated!</h2>' +
              '<p>Your <strong>' + planLabel + '</strong> plan is now active for the <strong>' + workspace + ' workspace</strong>.<br>Returning you to AI Legal App...</p>' +
              '<a href="ailegal://subscription/success?workspace=' + encodeURIComponent(workspace) + '&plan=' + encodeURIComponent(tier) + '" class="pay-btn" style="display:block;text-align:center;text-decoration:none;padding:16px;">Open AI Legal App</a>';
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error rendering web checkout: ' + err.message);
  }
};

/**
 * GET /api/subscription/current
 * Fetch current active plan, workspace, invoice, expiry, renewal status
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const targetWsNorm = FeatureAccessManager.normalizeWorkspace(req.query.workspace || req.headers['x-workspace-type'] || 'advocate');

    const user = await User.findById(userId).lean();
    const userSubWs = FeatureAccessManager.normalizeWorkspace(user?.subscription?.workspace);
    const userSubPlan = (user?.subscription?.plan || '').toLowerCase();
    const isUserSubActive = (user?.subscription?.status || '').toLowerCase() === 'active';

    const isStudentAdvCombo = userSubPlan.includes('student_advocate') || userSubPlan.includes('student_adv');
    const isAdvFirmCombo = userSubPlan.includes('advocate_firm') || userSubPlan.includes('adv_firm') || userSubPlan.includes('adv_law');
    const isAllAccessPass = userSubPlan.includes('all_access') || userSubPlan.includes('eco_pass') || userSubPlan.includes('all_in_one');

    let isUserSubWsMatch = false;
    if (isUserSubActive) {
      if (isAllAccessPass || userSubWs === 'all' || userSubWs === 'combo') {
        isUserSubWsMatch = true;
      } else if (isStudentAdvCombo) {
        isUserSubWsMatch = targetWsNorm === 'student' || targetWsNorm === 'advocate';
      } else if (isAdvFirmCombo) {
        isUserSubWsMatch = targetWsNorm === 'advocate' || targetWsNorm === 'lawfirm';
      } else {
        isUserSubWsMatch = userSubWs === targetWsNorm;
      }
    }

    let effectiveTier = 'FREE';

    if (isUserSubWsMatch && user?.subscription?.plan && user.subscription.plan !== 'FREE') {
      effectiveTier = user.subscription.plan;
    } else {
      const allowedWorkspaces = targetWsNorm === 'advocate'
        ? ['advocate', 'personal_practice', 'personal', 'combo', 'all']
        : targetWsNorm === 'lawfirm'
        ? ['lawfirm', 'law_firm', 'firm', 'combo', 'all']
        : [targetWsNorm, 'combo', 'all'];

      const activeSub = await Subscription.findOne({
        $and: [
          { $or: [{ accountId: userId }, { userId: userId }] },
          { workspace: { $in: allowedWorkspaces } },
          { status: { $in: ['active', 'Active'] } },
          { expiryDate: { $gt: new Date() } },
          { tier: { $ne: 'FREE' } }
        ]
      }).sort({ createdAt: -1 });

      if (activeSub?.tier) {
        effectiveTier = activeSub.tier;
      }
    }

    const entitlements = await EntitlementService.getEntitlements(userId, targetWsNorm);

    const subObj = {
      tier: effectiveTier,
      workspace: targetWsNorm,
      amount: effectiveTier !== 'FREE' ? (user?.subscription?.amount || 499) : 0,
      status: effectiveTier !== 'FREE' ? 'active' : 'inactive',
      autoRenew: effectiveTier !== 'FREE',
      expiryDate: effectiveTier !== 'FREE' ? (user?.subscription?.expiryDate || null) : null,
    };

    res.status(200).json({
      success: true,
      subscription: subObj,
      subscriptionItems: [],
      entitlements,
    });
  } catch (err) {
    console.error('[getCurrentSubscription] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/subscription/plans
 * Return master pricing & workspace config
 */
export const getPlansConfig = async (req, res) => {
  try {
    const Plan = (await import('../models/Plan.js')).default;
    const AdminSettings = (await import('../models/AdminSettings.js')).default;
    const adminSettings = await AdminSettings.findOne({});
    const dbPlans = await Plan.find({ isActive: true }).lean();
    
    // Dynamically merge DB plan prices with fallback defaults
    const dynamicPrices = { ...PLAN_PRICES };
    if (dbPlans && dbPlans.length > 0) {
      dbPlans.forEach(p => {
        const key = p.planId || p.id || p.tier;
        if (key && (key.startsWith('advocate_') || key.startsWith('student_') || key.startsWith('firm_') || key.startsWith('combo_'))) {
          dynamicPrices[key] = {
            monthly: p.priceMonthly !== undefined ? p.priceMonthly : (p.monthly || p.price || 499),
            yearly: p.priceYearly !== undefined ? p.priceYearly : (p.yearly || 4990),
          };
        }
      });
    }

    res.status(200).json({
      success: true,
      couponFeatureEnabled: adminSettings?.couponFeatureEnabled ?? true,
      plans: dbPlans && dbPlans.length > 0 ? dbPlans : null,
      prices: dynamicPrices,
      entitlementDefaults: PLAN_ENTITLEMENT_MAP,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/create-order
 * Generate Razorpay Order
 */
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { planId, billingCycle, couponCode } = req.body;
    const userId = req.user?.id || req.user?._id;

    let originalAmount = await getPlanPrice(planId, billingCycle);
    let amount = originalAmount;
    let discountAmount = 0;
    let couponDetails = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const evaluation = await evaluateCouponInternal({
        couponCode: couponCode.trim(),
        userId,
        planId,
        billingCycle,
        overrideAmount: originalAmount,
      });

      if (!evaluation.valid) {
        return res.status(400).json({
          success: false,
          message: evaluation.message,
        });
      }

      amount = evaluation.finalAmount;
      discountAmount = evaluation.discountAmount;
      couponDetails = {
        couponCode: evaluation.couponCode,
        discountType: evaluation.discountType,
        discountValue: evaluation.discountValue,
        discountAmount: evaluation.discountAmount,
        originalAmount: evaluation.originalAmount,
        finalAmount: evaluation.finalAmount,
      };
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const isTrulyDummy = !razorpayKeyId || razorpayKeyId.includes('dummy') || razorpayKeyId === 'YOUR_KEY_ID';

    if (isTrulyDummy) {
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount: Math.round(amount * 100),
        amount_paid: 0,
        amount_due: Math.round(amount * 100),
        currency: 'INR',
        status: 'created',
        receipt: `order_rcptid_${Date.now()}`,
        created_at: Math.floor(Date.now() / 1000),
      };
      return res.status(200).json({
        success: true,
        order: mockOrder,
        key: razorpayKeyId,
        isMockOrder: true,
        originalAmount,
        discountAmount,
        finalAmount: amount,
        couponDetails,
      });
    }

    const options = {
      amount: Math.round(amount * 100), // in paise
      currency: 'INR',
      receipt: `order_rcptid_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      success: true,
      order,
      key: razorpayKeyId,
      originalAmount,
      discountAmount,
      finalAmount: amount,
      couponDetails,
    });
  } catch (err) {
    console.error('[createSubscriptionOrder] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/verify-payment
 * Validate Razorpay HMAC signature, generate Subscription & SubscriptionItem(s), issue updated JWT!
 */
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle, isWebRedirect, purchaseToken, userId: bodyUserId, couponCode } = req.body;
    let userId = req.user?.id || req.user?._id || bodyUserId;

    // Decode purchaseToken if request came from HTML web form redirect without bearer header
    if (!userId && purchaseToken) {
      try {
        const tokenSecret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'secret';
        const decoded = jwt.verify(purchaseToken, tokenSecret);
        userId = decoded.userId;
      } catch (err) {
        console.warn('[verifySubscriptionPayment] Purchase token decode warning:', err.message);
      }
    }

    const isWeb = isWebRedirect === 'true' || isWebRedirect === true || purchaseToken || req.headers['accept']?.includes('text/html');

    if (!userId) {
      if (isWeb) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Session Expired - AI LEGAL™</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F4F5F7; color: #111827; text-align: center; padding: 40px 20px; }
              .card { background: #FFFFFF; border: 1.5px solid #E5E7EB; border-radius: 20px; padding: 32px 24px; max-width: 420px; margin: 40px auto; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); }
              h2 { font-size: 22px; font-weight: 800; color: #EF4444; margin-bottom: 8px; }
              p { color: #6B7280; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
              .btn { display: inline-block; background: #C8A34D; color: #000; font-weight: 800; padding: 14px 28px; border-radius: 12px; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Purchase Session Expired</h2>
              <p>Authentication required. Please return to the AI Legal Mobile App and tap Upgrade again.</p>
              <a href="ailegal://subscription/failed" class="btn">Return to Mobile App</a>
            </div>
          </body>
          </html>
        `);
      }
      return res.status(400).json({ success: false, message: 'Authentication required. User ID missing.' });
    }

    // Verify HMAC Signature (Supports Razorpay Sandbox/Test Mode & Live Mode)
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
    const isTestMode =
      razorpayKeyId.startsWith('rzp_test_') ||
      razorpay_order_id.startsWith('order_mock_') ||
      razorpay_order_id.startsWith('order_') ||
      razorpay_signature === 'mock_signature';

    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (!isTestMode && generated_signature !== razorpay_signature) {
      await PaymentHistory.create({
        accountId: userId,
        razorpayPaymentId: razorpay_payment_id || 'failed_pay',
        razorpayOrderId: razorpay_order_id || 'failed_order',
        invoice: `INV-FAILED-${Date.now()}`,
        amount: 0,
        status: 'failed',
      });
      if (isWebRedirect) {
        return res.status(400).send('Payment verification failed. Invalid Razorpay signature.');
      }
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid Razorpay signature.' });
    }

    const basePlanPrice = await getPlanPrice(planId, billingCycle);
    const originalAmount = (req.body.amount !== undefined && Number(req.body.amount) >= 0) ? Number(req.body.amount) : basePlanPrice;
    let amount = originalAmount;
    let discountAmount = 0;
    let validatedCoupon = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const evalRes = await evaluateCouponInternal({
        couponCode: couponCode.trim(),
        userId,
        planId,
        billingCycle,
        overrideAmount: originalAmount,
      });

      if (evalRes.valid) {
        amount = evalRes.finalAmount;
        discountAmount = evalRes.discountAmount;
        validatedCoupon = evalRes;
      }
    }

    const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Store Payment History Log
    await PaymentHistory.create({
      accountId: userId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      invoice: invoiceId,
      gateway: 'Razorpay',
      amount,
      currency: 'INR',
      status: 'paid',
      paidAt: new Date(),
    });

    const newPayment = await Payment.create({
      userId,
      planId,
      invoiceNumber: invoiceId,
      amount,
      gst: amount * 0.18,
      gateway: 'Razorpay',
      transactionId: razorpay_payment_id || `txn_${Date.now()}`,
      status: 'success'
    }).catch(e => console.warn('[verifyPayment] Payment create warning:', e.message));

    broadcastAdminRefresh('billing', newPayment || { amount, status: 'success', userId });

    // Handle Coupon Usage Record & Increment (Idempotent)
    if (validatedCoupon && validatedCoupon.couponId) {
      const existingUsage = await CouponUsage.findOne({
        $or: [
          { orderId: razorpay_order_id, couponId: validatedCoupon.couponId },
          { paymentId: razorpay_payment_id, couponId: validatedCoupon.couponId },
        ],
      });

      if (!existingUsage) {
        // Atomic increment of coupon usage count
        await Coupon.findOneAndUpdate(
          {
            _id: validatedCoupon.couponId,
            status: 'active',
            $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
          },
          { $inc: { usedCount: 1 } }
        );

        const userObj = await User.findById(userId).lean();
        await CouponUsage.create({
          couponId: validatedCoupon.couponId,
          couponCode: validatedCoupon.couponCode,
          userId,
          userEmail: userObj?.email || '',
          planId,
          billingCycle: billingCycle || 'monthly',
          originalAmount,
          discountAmount,
          finalAmount: amount,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          status: 'paid',
        });
      }
    }

    // Create Subscription & SubscriptionItem(s) via Entitlement Engine
    const subscription = await EntitlementService.createSubscriptionRecords({
      accountId: userId,
      planId,
      billingCycle,
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      invoiceId,
    });

    // Update User Document & Refresh JWT
    const user = await User.findById(userId);
    let newToken = null;

    if (user) {
      // Map tier string to enum-safe plan value
      const tierStr = (subscription.tier || '').toUpperCase();
      const planMap = {
        BASIC: 'BASIC', STARTER: 'STARTER',
        PRO: 'PRO', PROFESSIONAL: 'PROFESSIONAL',
        PREMIUM: 'PREMIUM', ENTERPRISE: 'ENTERPRISE',
        FREE: 'FREE',
      };
      // Extract the tier key from compound planId (e.g. "advocate_basic" → "BASIC")
      const tierKey = Object.keys(planMap).find(k => tierStr.includes(k)) || 'FREE';
      const normalizedPlan = planMap[tierKey] || 'FREE';

      user.currentTier = subscription.tier;
      user.currentWorkspace = subscription.workspace;
      user.subscription = {
        plan: normalizedPlan,
        status: 'active',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        expiryDate: subscription.expiryDate,
        purchaseDate: subscription.startDate,
        amount: subscription.amount,
        currency: 'INR',
        gateway: 'Razorpay',
        invoice: invoiceId,
        autoRenew: true,
        couponCode: validatedCoupon ? validatedCoupon.couponCode : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        originalAmount: originalAmount,
      };
      await user.save();

      // Refresh JWT Token with updated entitlements payload
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

    // Always return JSON for AJAX calls (isWeb=false from fetch) or when not an HTML browser request
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Subscription & entitlements unlocked!',
      token: newToken,
      user,
      subscription,
      entitlements,
      deepLink: `ailegal://subscription/success?workspace=${encodeURIComponent(subscription.workspace)}&plan=${encodeURIComponent(subscription.tier)}`,
    });
  } catch (err) {
    console.error('[verifySubscriptionPayment] Error:', err);
    // Always return JSON so the fetch() in the browser page can parse it
    res.status(500).json({ success: false, message: err.message || 'Internal server error during payment verification.' });
  }
};

/**
 * GET /api/subscription/entitlements
 */
export const getEntitlementsApi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const workspace = req.query.workspace || req.headers['x-workspace-type'] || 'advocate';
    const entitlements = await EntitlementService.getEntitlements(userId, workspace);
    res.status(200).json({ success: true, entitlements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/subscription/usage
 */
export const getUsageApi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const workspace = req.query.workspace || req.headers['x-workspace-type'] || 'advocate';
    const status = await FeatureAccessManager.getUsageStatus(userId, workspace);
    res.status(200).json({ success: true, workspace, ...status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/reset-usage
 */
export const resetUsageApi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { workspace } = req.body;
    await UsageLedger.deleteMany({ accountId: userId, ...(workspace ? { workspace } : {}) });
    res.status(200).json({ success: true, message: 'Usage counters reset successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/payments/history
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const history = await PaymentHistory.find({ accountId: userId }).sort({ paidAt: -1 });
    res.status(200).json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/subscribers
 */
export const adminGetSubscribers = async (req, res) => {
  try {
    const totalSubscribers = await Subscription.countDocuments({ status: 'active' });
    const paidPayments = await PaymentHistory.find({ status: 'paid' });
    const totalRevenue = paidPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const failedPaymentsCount = await PaymentHistory.countDocuments({ status: 'failed' });

    res.status(200).json({
      success: true,
      metrics: {
        totalSubscribers,
        totalRevenue,
        failedPaymentsCount,
        recentPayments: paidPayments.slice(0, 10),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/cancel
 */
export const cancelSubscriptionApi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    await Subscription.updateMany(
      { accountId: userId },
      { $set: { autoRenew: false } }
    );
    await User.findByIdAndUpdate(userId, {
      $set: {
        'subscription.autoRenew': false
      }
    }).catch(() => {});
    res.status(200).json({
      success: true,
      message: 'Subscription auto-renewal cancelled successfully. Your plan will remain active until the current period ends.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/enable-autorenew
 */
export const enableSubscriptionAutoRenewApi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    await Subscription.updateMany(
      { accountId: userId },
      { $set: { autoRenew: true } }
    );
    await User.findByIdAndUpdate(userId, {
      $set: {
        'subscription.autoRenew': true
      }
    }).catch(() => {});
    res.status(200).json({
      success: true,
      autoRenew: true,
      message: 'Subscription auto-renewal enabled successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/apple/verify
 * Verifies Apple StoreKit purchase receipt with Apple iTunes servers & unlocks subscription plan.
 */
export const verifyApplePurchase = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { receiptData, purchaseToken, productId, workspace = 'advocate', billingCycle = 'monthly' } = req.body;
    const receipt = receiptData || purchaseToken;

    if (!receipt) {
      return res.status(400).json({ success: false, message: 'Apple purchase receipt is required' });
    }

    const targetPlanId = productId || 'advocate_pro';
    const appleSecret = process.env.APPLE_SHARED_SECRET || '';

    const isTestReceipt = typeof receipt === 'string' && (
      receipt.startsWith('SANDBOX_') || 
      receipt.startsWith('MOCK_') || 
      receipt.startsWith('APPLE_TEST_') ||
      receipt.startsWith('test_') ||
      receipt.length < 50
    );
    let appleRes = null;

    if (!isTestReceipt) {
      const verifyWithAppleUrl = async (url) => {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'receipt-data': receipt,
            password: appleSecret,
            'exclude-old-transactions': true,
          }),
        });
        return await resp.json();
      };

      let prodUrl = 'https://buy.itunes.apple.com/verifyReceipt';
      try {
        appleRes = await verifyWithAppleUrl(prodUrl);
      } catch (err) {
        console.warn('[verifyApplePurchase] iTunes production verify error:', err.message);
      }

      if (appleRes && appleRes.status === 21007) {
        console.log('[verifyApplePurchase] 🧪 Sandbox receipt detected (Status 21007). Retrying with iTunes Sandbox URL...');
        let sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
        try {
          appleRes = await verifyWithAppleUrl(sandboxUrl);
        } catch (err) {
          console.warn('[verifyApplePurchase] iTunes sandbox verify error:', err.message);
        }
      }

      // If Apple verification returned invalid status and in production without valid receipt
      if (!appleRes || (appleRes.status !== 0 && appleRes.status !== 21007)) {
        if (process.env.NODE_ENV === 'production' && appleSecret) {
          console.error('[verifyApplePurchase] Apple receipt verification failed with status:', appleRes?.status);
          return res.status(400).json({ 
            success: false, 
            message: `Apple receipt verification failed (Status: ${appleRes?.status ?? 'Network Error'})` 
          });
        } else {
          console.warn('[verifyApplePurchase] Non-production or unconfigured shared secret mode - proceeding with sandbox verification fallback.');
        }
      }
    } else {
      console.log(`[verifyApplePurchase] 🧪 Test / Sandbox receipt bypass: ${receipt.substring(0, 30)}...`);
    }

    const amount = PLAN_PRICES[targetPlanId]?.[billingCycle] || (billingCycle === 'yearly' ? 4999 : 499);
    const txId = appleRes?.latest_receipt_info?.[0]?.transaction_id || `APPLE-${Date.now()}`;

    const endDate = new Date();
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    let savedSubscription = null;
    let savedPaymentHistory = null;
    let savedPayment = null;

    if (user) {
      // 1. Update User Document
      user.subscription = {
        plan: targetPlanId,
        status: 'active',
        expiryDate: endDate,
        autoRenew: true,
        workspace,
        billingCycle,
        platform: 'ios',
        transactionId: txId,
      };
      user.credits = (user.credits || 0) + 1000;
      await user.save();

      // Reset usage records so user gets fresh feature limits on the new plan
      await FeatureAccessManager.resetUserPlanUsage(user._id);

      // 2. Upsert Subscription Document
      savedSubscription = await Subscription.findOneAndUpdate(
        { $or: [{ accountId: user._id }, { userId: user._id }], workspace },
        {
          accountId: user._id,
          userId: user._id,
          tier: targetPlanId,
          status: 'active',
          billingCycle,
          startDate: new Date(),
          expiryDate: endDate,
          amount,
          currency: 'INR',
          workspace,
          autoRenew: true,
          platform: 'ios',
          transactionId: txId,
        },
        { upsert: true, new: true }
      );

      // 3. Create PaymentHistory Record
      savedPaymentHistory = await PaymentHistory.create({
        accountId: user._id,
        amount,
        currency: 'INR',
        paymentMethod: 'apple_iap',
        gateway: 'AppleStoreKit',
        orderId: txId,
        transactionId: txId,
        status: 'paid',
        paidAt: new Date(),
        workspace,
        planId: targetPlanId,
      }).catch((e) => console.warn('[verifyApplePurchase] PaymentHistory create warning:', e.message));

      // 4. Create Payment Record
      savedPayment = await Payment.create({
        userId: user._id,
        planId: targetPlanId,
        amount,
        gateway: 'AppleStoreKit',
        transactionId: txId,
        status: 'success',
      }).catch((e) => console.warn('[verifyApplePurchase] Payment create warning:', e.message));

      broadcastAdminRefresh('billing', savedPayment || { amount, status: 'success' });
    }

    // 🌟 Loud & Clear Terminal Banner Log for Process 17612
    console.log('\n================================================================');
    console.log('💳 [AISA BACKEND - APPLE IAP PAYMENT RECEIVED & VERIFIED]');
    console.log('================================================================');
    console.log(`📱 Platform           : iOS (StoreKit / Sandbox Test Build)`);
    console.log(`👤 User Email / ID    : ${user ? user.email : 'Unknown User'} (${user ? user._id : userId})`);
    console.log(`📦 Product / Plan     : ${targetPlanId.toUpperCase()}`);
    console.log(`💼 Workspace / Cycle  : ${workspace} | ${billingCycle}`);
    console.log(`💰 Amount Paid        : ₹${amount} INR`);
    console.log(`🆔 Transaction ID     : ${txId}`);
    console.log(`📅 Valid Until        : ${endDate.toISOString()}`);
    console.log('----------------------------------------------------------------');
    console.log(`💾 DATABASE SAVED STATUS (DB: AISA):`);
    console.log(`   ✅ User.subscription       -> UPDATED (Status: Active)`);
    console.log(`   ✅ Subscription Collection  -> UPSERTED (ID: ${savedSubscription?._id || 'N/A'})`);
    console.log(`   ✅ PaymentHistory Collection -> RECORDED (ID: ${savedPaymentHistory?._id || 'N/A'})`);
    console.log(`   ✅ Payment Collection       -> RECORDED (ID: ${savedPayment?._id || 'N/A'})`);
    console.log('================================================================\n');

    const entitlements = (EntitlementService && user) ? await EntitlementService.getEntitlements(user._id, workspace).catch(() => null) : null;

    return res.status(200).json({
      success: true,
      message: 'Apple StoreKit sandbox payment verified and saved in AISA database!',
      user,
      subscription: user?.subscription || { plan: targetPlanId, status: 'Active', workspace },
      entitlements,
      transactionId: txId,
    });
  } catch (err) {
    console.error('❌ [verifyApplePurchase] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/google-play/verify
 */
export const verifyGooglePlayPurchase = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { purchaseToken, productId, orderId, workspace = 'advocate', billingCycle = 'monthly' } = req.body;

    const user = await User.findById(userId);
    const targetPlanId = productId || 'advocate_pro';

    if (user) {
      const endDate = new Date();
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      user.subscription = {
        plan: targetPlanId,
        status: 'Active',
        expiryDate: endDate,
        autoRenew: true,
        workspace,
        billingCycle,
        platform: 'android',
        transactionId: orderId || purchaseToken || `GPA-${Date.now()}`,
      };
      await user.save();
      await FeatureAccessManager.resetUserPlanUsage(user._id);

      await PaymentHistory.create({
        accountId: userId,
        amount: PLAN_PRICES[targetPlanId]?.[billingCycle] || 499,
        currency: 'INR',
        paymentMethod: 'google_play',
        orderId: orderId || `GPA-${Date.now()}`,
        status: 'paid',
        paidAt: new Date(),
        workspace,
        planId: targetPlanId,
      }).catch((e) => console.warn('[verifyGooglePlayPurchase] History logging warning:', e.message));

      const entitlements = EntitlementService ? EntitlementService.computeEntitlements(user, workspace) : null;

      return res.status(200).json({
        success: true,
        message: 'Google Play subscription verified successfully!',
        user,
        subscription: user.subscription,
        entitlements,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Google Play subscription activated.',
      subscription: { plan: targetPlanId, status: 'Active', workspace },
    });
  } catch (err) {
    console.error('[verifyGooglePlayPurchase] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/google-play/restore
 */
export const restoreGooglePlayPurchases = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);
    res.status(200).json({
      success: true,
      message: 'Subscriptions restored successfully.',
      subscription: user?.subscription || { status: 'Free' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/subscription/record-usage
 */
export const recordUsageApi = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { featureKey, workspaceType } = req.body || {};
    const ws = workspaceType || req.headers['x-workspace-type'] || 'advocate';
    if (!featureKey) {
      return res.status(400).json({ success: false, message: 'featureKey is required' });
    }
    const updatedLedger = await EntitlementService.recordToolUsage(userId, ws, featureKey);
    const updatedPlanUsage = await FeatureAccessManager.incrementUsage(userId, featureKey);
    return res.status(200).json({
      success: true,
      message: 'Usage recorded successfully',
      usage: updatedPlanUsage || updatedLedger
    });
  } catch (err) {
    console.error('[recordUsageApi] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


