import Razorpay from 'razorpay';
import crypto from 'crypto';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import CreditPackage from '../models/CreditPackage.js';
import User from '../models/User.js';
import CreditLog from '../models/CreditLog.js';

// Initialize Razorpay (same instance as subscriptionController)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * STEP 1 (Called by Frontend First):
 * Create a Razorpay order so we know the amount before Google Pay processes it.
 * Frontend will use this order ID + Google Pay token together.
 */
export const createGooglePayOrder = async (req, res) => {
    try {
        const { planId, packageId, billingCycle, currency = 'INR' } = req.body;

        let amount = 0;
        let itemName = '';

        if (planId) {
            const plan = await Plan.findById(planId);
            if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
            amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            itemName = plan.planName;
        } else if (packageId) {
            const creditPackage = await CreditPackage.findById(packageId);
            if (!creditPackage) return res.status(404).json({ success: false, message: "Package not found" });
            amount = creditPackage.price;
            itemName = creditPackage.packageName;
        } else {
            return res.status(400).json({ success: false, message: "planId or packageId is required" });
        }

        if (amount === 0) {
            return res.status(200).json({ success: true, isFree: true });
        }

        // Convert INR to USD if requested (rough conversion, update rate as needed)
        let finalAmount = amount;
        let finalCurrency = currency.toUpperCase();

        if (finalCurrency === 'USD') {
            // 1 USD ≈ 83.5 INR (update this rate periodically)
            finalAmount = Math.round((amount / 83.5) * 100) / 100;
        }

        // Razorpay amounts are in smallest currency unit (paise for INR, cents for USD)
        const amountInSmallestUnit = Math.round(finalAmount * 100);

        const order = await razorpay.orders.create({
            amount: amountInSmallestUnit,
            currency: finalCurrency === 'USD' ? 'USD' : 'INR',
            receipt: `gpay_${Date.now()}`,
            notes: {
                gateway: 'google_pay',
                itemName,
                planId: planId || '',
                packageId: packageId || ''
            }
        });

        console.log(`[GooglePay] Order created: ${order.id} for ₹${amount}`);

        const isTestMode = (process.env.GOOGLE_PAY_ENV || 'TEST') === 'TEST';

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: finalAmount,
            currency: finalCurrency,
            amountDisplay: finalCurrency === 'INR' ? `₹${amount}` : `$${finalAmount}`,
            itemName,
            // Send back Google Pay payment request config
            googlePayConfig: {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: [{
                    type: 'CARD',
                    parameters: {
                        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                        allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
                    },
                    tokenizationSpecification: {
                        type: 'PAYMENT_GATEWAY',
                        parameters: {
                            gateway: 'razorpay',
                            gatewayMerchantId: process.env.RAZORPAY_KEY_ID
                        }
                    }
                }],
                // In TEST mode → merchantId is not required and causes errors if invalid
                // In PRODUCTION → use your verified Google Pay Merchant ID
                merchantInfo: isTestMode
                    ? { merchantName: 'AI LEGAL™' }
                    : {
                        merchantId: process.env.GOOGLE_PAY_MERCHANT_ID,
                        merchantName: 'AI LEGAL™'
                    },
                transactionInfo: {
                    totalPriceStatus: 'FINAL',
                    totalPriceLabel: itemName,
                    totalPrice: finalAmount.toFixed(2),
                    currencyCode: finalCurrency === 'USD' ? 'USD' : 'INR',
                    countryCode: finalCurrency === 'USD' ? 'US' : 'IN'
                }
            }
        });
    } catch (error) {
        console.error('[GooglePay] createGooglePayOrder error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyGooglePayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId,
            packageId,
            billingCycle
        } = req.body;

        const userId = req.user.id || req.user._id;

        // --- ENVIRONMENT DETECTION ---
        const isTestMode = 
            !process.env.NODE_ENV || 
            ['development', 'localhost', 'staging', 'sandbox', 'uat', 'test'].includes(process.env.NODE_ENV.toLowerCase()) ||
            (process.env.GOOGLE_PAY_ENV || 'TEST').toUpperCase() !== 'PRODUCTION' ||
            req.hostname === 'localhost' ||
            req.hostname === '127.0.0.1' ||
            (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.startsWith('rzp_test'));

        if (isTestMode) {
            console.log(`[GooglePay] Test environment detected (Hostname: ${req.hostname}, NodeEnv: ${process.env.NODE_ENV}, GPayEnv: ${process.env.GOOGLE_PAY_ENV}). Bypassing plan/credit changes for user ${userId}.`);
            return res.status(200).json({
                success: true,
                isTest: true,
                message: "Test Payment Successful – No credits or subscription have been applied because the system is running in test mode."
            });
        }

        // --- STRICT PRODUCTION VERIFICATION ---
        if (!razorpay_payment_id || !razorpay_signature || !razorpay_order_id) {
            console.warn('[GooglePay] Missing signature parameters in production verification request.');
            return res.status(400).json({ success: false, message: "Payment verification failed — missing signature parameters." });
        }

        // 1. Verify Razorpay signature locally
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.warn('[GooglePay] Signature mismatch in production! Possible fraud attempt.');
            return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature." });
        }

        // 2. Fetch status directly from the payment provider (Razorpay)
        try {
            const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
            if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
                console.warn(`[GooglePay] Razorpay status is '${paymentDetails.status}', expected 'captured' or 'authorized'.`);
                return res.status(400).json({ success: false, message: `Payment is not successful (status: ${paymentDetails.status}).` });
            }
            if (paymentDetails.order_id !== razorpay_order_id) {
                console.warn(`[GooglePay] Order ID mismatch. Expected '${razorpay_order_id}', got '${paymentDetails.order_id}' from Razorpay.`);
                return res.status(400).json({ success: false, message: "Payment verification failed — order ID mismatch." });
            }
        } catch (fetchError) {
            console.error('[GooglePay] Failed to fetch payment from Razorpay:', fetchError);
            return res.status(500).json({ success: false, message: "Failed to verify payment status with payment gateway." });
        }

        console.log(`[GooglePay] Production payment verified: ${razorpay_payment_id} for user ${userId}`);

        // --- ACTIVATE PLAN OR ADD CREDITS (Only in verified Production) ---
        if (planId) {
            return await _activatePlan({ userId, planId, billingCycle, paymentId: razorpay_payment_id, res });
        } else if (packageId) {
            return await _addCredits({ userId, packageId, paymentId: razorpay_payment_id, res });
        } else {
            return res.status(400).json({ success: false, message: "planId or packageId is required" });
        }
    } catch (error) {
        console.error('[GooglePay] verifyGooglePayment error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Internal Helpers ──────────────────────────────────────────────────────────

async function _activatePlan({ userId, planId, billingCycle, paymentId, res }) {
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    const user = await User.findById(userId);

    if (plan.planName === 'Founder Plan') {
        const founderCount = await User.countDocuments({ founderStatus: true });
        if (founderCount >= 500 && !user.founderStatus) {
            return res.status(400).json({ success: false, message: "Founder plan limit reached." });
        }
        user.founderStatus = true;
    }

    // Cancel any existing active subscriptions
    await Subscription.updateMany({ userId, subscriptionStatus: 'active' }, { subscriptionStatus: 'cancelled' });

    // Calculate credits
    let finalCredits = billingCycle === 'yearly'
        ? (plan.creditsYearly || plan.credits * 12)
        : plan.credits;

    const isFirstPurchase = await Subscription.countDocuments({ userId }) === 0;
    if (isFirstPurchase && !plan.planName.toLowerCase().includes('founder')) {
        finalCredits += finalCredits * 0.5; // 50% bonus on first purchase
    }

    user.credits = Math.floor(finalCredits);

    // Calculate renewal date
    let renewalDate = new Date();
    if (plan.planName.toLowerCase().includes('founder')) {
        renewalDate.setFullYear(renewalDate.getFullYear() + 100);
    } else if (billingCycle === 'yearly') {
        renewalDate.setMonth(renewalDate.getMonth() + (plan.validityYearly || 12));
    } else {
        renewalDate.setMonth(renewalDate.getMonth() + (plan.validityMonthly || 1));
    }

    const newSubscription = await Subscription.create({
        userId,
        planId: plan._id,
        creditsRemaining: user.credits,
        billingCycle,
        subscriptionStart: new Date(),
        renewalDate,
        subscriptionStatus: 'active',
        paymentId: paymentId || 'gpay_payment',
        paymentMethod: 'google_pay'
    });

    await user.save();

    await CreditLog.create({
        userId,
        action: 'plan_credit',
        description: `Google Pay — ${plan.planName}`,
        credits: finalCredits,
        balanceAfter: user.credits
    });

    return res.status(200).json({
        success: true,
        subscription: newSubscription,
        credits: user.credits,
        message: `✅ Payment successful via Google Pay! ${plan.planName} activated.`
    });
}

async function _addCredits({ userId, packageId, paymentId, res }) {
    const creditPackage = await CreditPackage.findById(packageId);
    if (!creditPackage) return res.status(404).json({ success: false, message: "Package not found" });

    const user = await User.findById(userId);
    user.credits += creditPackage.credits;
    await user.save();

    await CreditLog.create({
        userId,
        action: 'purchase',
        description: `Google Pay — ${creditPackage.packageName}`,
        credits: creditPackage.credits,
        balanceAfter: user.credits
    });

    return res.status(200).json({
        success: true,
        credits: user.credits,
        message: `✅ ${creditPackage.credits} credits added via Google Pay!`
    });
}
