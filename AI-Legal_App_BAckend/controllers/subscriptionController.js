import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import CreditPackage from '../models/CreditPackage.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import CreditLog from '../models/CreditLog.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

const seedPlansIfEmpty = async () => {
    try {
        const defaultPlans = [
            {
                planId: 'starter_plan',
                planName: 'AI Legal Starter',
                priceMonthly: 499,
                priceYearly: 4990,
                credits: 1000,
                features: [
                    'Unlimited Draft Maker',
                    'Unlimited Court Prep Workspace',
                    'Unlimited Legal Precedent Research',
                    'Unlimited Evidence Analysis',
                    'Unlimited Contract Review',
                    'Unlimited Case Predictor',
                    'Unlimited Strategy Engine',
                    'AI Mock Courtroom (2 Simulations)',
                    'AI Client Connect (2 Conversations)',
                    'Knowledge Hub (2 Sessions)'
                ],
                badge: 'STARTER',
                isPopular: false
            },
            {
                planId: 'professional_plan',
                planName: 'AI Legal Pro',
                priceMonthly: 999,
                priceYearly: 9990,
                credits: 2500,
                features: [
                    'Everything in Starter',
                    'Unlimited AI Mock Courtroom',
                    'AI Client Connect (2 Conversations)',
                    'Knowledge Hub (2 Sessions)'
                ],
                badge: 'PRO',
                isPopular: true
            },
            {
                planId: 'enterprise_plan',
                planName: 'AI Legal Enterprise',
                priceMonthly: 2399,
                priceYearly: 23990,
                credits: 6000,
                features: [
                    'Everything Unlimited',
                    'Priority Processing',
                    'Enterprise Premium Badge'
                ],
                badge: 'ENTERPRISE',
                isPopular: false
            }
        ];

        for (const p of defaultPlans) {
            await Plan.findOneAndUpdate(
                { planId: p.planId },
                { $set: p },
                { upsert: true, new: true }
            );
        }
    } catch (err) {
        console.error('[Subscription] Failed to seed default plans:', err.message);
    }
};

const findPlan = async (planId) => {
    if (!planId) return null;
    let query = { planId: planId };
    if (mongoose.isValidObjectId(planId)) {
        query = { $or: [{ planId: planId }, { _id: planId }] };
    }
    return await Plan.findOne(query);
};

export const getSubscriptionDetails = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await seedPlansIfEmpty();
        
        const subscription = await Subscription.findOne({ userId, subscriptionStatus: 'active' }).populate('planId');
        const user = await User.findById(userId);
        const plans = await Plan.find({ isActive: true });

        res.status(200).json({
            success: true,
            subscription,
            plans,
            user,
            credits: user?.credits || 0,
            founderStatus: user?.founderStatus || false
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCreditLogs = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const logs = await CreditLog.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            logs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createOrder = async (req, res) => {
    try {
        const { planId, packageId, billingCycle } = req.body;
        let amount = 0;

        // Ensure plans are seeded before lookup
        await seedPlansIfEmpty();

        if (planId) {
            const plan = await findPlan(planId);
            if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
            amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
        } else if (packageId) {
            const creditPackage = await CreditPackage.findById(packageId);
            if (!creditPackage) return res.status(404).json({ success: false, message: "Package not found" });
            amount = creditPackage.price;
        } else {
            return res.status(400).json({ success: false, message: "Invalid request" });
        }

        if (amount === 0) {
            return res.status(200).json({ success: true, isFree: true });
        }

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
        const isTestMode = !razorpayKeyId || razorpayKeyId.includes('dummy') || razorpayKeyId.startsWith('rzp_test_');

        // In test mode, return a mock Razorpay order without calling the API
        if (isTestMode) {
            const mockOrder = {
                id: `order_mock_${Date.now()}`,
                entity: 'order',
                amount: amount * 100,
                amount_paid: 0,
                amount_due: amount * 100,
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
            });
        }

        const options = {
            amount: amount * 100, // INR in paise
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order,
            key: razorpayKeyId
        });
    } catch (error) {
        console.error('[createOrder] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const purchasePlan = async (req, res) => {
    try {
        const { planId, billingCycle } = req.body;
        const userId = req.user.id || req.user._id;

        const plan = await findPlan(planId);
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

        const user = await User.findById(userId);

        if (plan.planName === 'Founder Plan') {
            const founderCount = await User.countDocuments({ founderStatus: true });
            if (founderCount >= 500 && !user.founderStatus) {
                return res.status(400).json({ success: false, message: "Founder plan limit reached." });
            }
            user.founderStatus = true;
        }

        await Subscription.updateMany({ userId, subscriptionStatus: 'active' }, { subscriptionStatus: 'cancelled' });

        // AWARD CREDITS: Use DB field if yearly, otherwise use monthly
        let finalCredits = (billingCycle === 'yearly')
            ? (plan.creditsYearly || plan.credits * 12)
            : plan.credits;

        const isFirstPurchase = await Subscription.countDocuments({ userId }) === 0;

        // Give extra credits for the very first purchase (excluding Founder)
        if (isFirstPurchase && !plan.planName.toLowerCase().includes('founder')) {
            finalCredits += finalCredits * 0.5;
        }

        user.credits = Math.floor(finalCredits);

        // VALIDITY: Calculate the Renewal/Expiry Date
        let renewalDate = new Date();
        if (plan.planName.toLowerCase().includes('founder')) {
            // Lifetime validity (100 years)
            renewalDate.setFullYear(renewalDate.getFullYear() + 100);
        } else if (billingCycle === 'yearly') {
            // Use validity from DB (default 12 months)
            const months = plan.validityYearly || 12;
            renewalDate.setMonth(renewalDate.getMonth() + months);
        } else {
            // Use validity from DB (default 1 month)
            const months = plan.validityMonthly || 1;
            renewalDate.setMonth(renewalDate.getMonth() + months);
        }

        const newSubscription = await Subscription.create({
            userId,
            planId: plan._id,
            creditsRemaining: user.credits,
            billingCycle,
            subscriptionStart: new Date(),
            renewalDate,
            subscriptionStatus: 'active',
            paymentId: "mock_payment_id_for_now"
        });

        await user.save();

        // 📝 Log Plan Credit
        await CreditLog.create({
            userId,
            action: 'plan_credit',
            description: `Subscription: ${plan.planName}`,
            credits: finalCredits,
            balanceAfter: user.credits
        });

        res.status(200).json({
            success: true,
            subscription: newSubscription,
            credits: user.credits,
            message: "Plan upgraded successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const purchaseCredits = async (req, res) => {
    try {
        const { packageId } = req.body;
        const userId = req.user.id || req.user._id;

        const creditPackage = await CreditPackage.findById(packageId);
        if (!creditPackage) return res.status(404).json({ success: false, message: "Package not found" });

        const user = await User.findById(userId);
        user.credits += creditPackage.credits;
        await user.save();

        // 📝 Log Credit Purchase
        await CreditLog.create({
            userId,
            action: 'purchase',
            description: `Purchased: ${creditPackage.packageName}`,
            credits: creditPackage.credits,
            balanceAfter: user.credits
        });

        res.status(200).json({
            success: true,
            credits: user.credits,
            message: "Credits purchased successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deductCredits = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { amount, description, tool, category } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.credits < amount) {
            return res.status(403).json({ 
                success: false, 
                code: 'OUT_OF_CREDITS',
                message: "Insufficient credits",
                available: user.credits
            });
        }

        // Atomically deduct credits
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { credits: -amount } },
            { new: true }
        );

        // 📝 Log Credit Deduction
        const log = await CreditLog.create({
            userId,
            action: tool || 'tool_usage',
            description: description || `Used tool: ${tool}`,
            credits: -amount,
            balanceAfter: updatedUser.credits,
            category: category || 'AI Legal'
        });

        res.status(200).json({
            success: true,
            credits: updatedUser.credits,
            log,
            message: "Credits deducted successfully."
        });
    } catch (error) {
        console.error("Deduct Credits Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifySubscriptionPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = req.body;
        const userId = req.user.id || req.user._id;

        // Verify Razorpay signature
        const secret = process.env.RAZORPAY_KEY_SECRET || '';
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (razorpay_signature !== 'mock_signature' && generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }

        // Ensure plans are seeded before lookup
        await seedPlansIfEmpty();

        const plan = await findPlan(planId);
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Update existing subscriptions to cancelled
        await Subscription.updateMany({ userId, subscriptionStatus: 'active' }, { subscriptionStatus: 'cancelled' });

        // Expiry Date
        let expiryDate = new Date();
        if (billingCycle === 'yearly') {
            expiryDate.setMonth(expiryDate.getMonth() + 12);
        } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        const planNameUpper = plan.planName.toUpperCase();
        let planKey = 'FREE';
        if (planNameUpper.includes('STARTER')) planKey = 'STARTER';
        else if (planNameUpper.includes('PROFESSIONAL') || planNameUpper.includes('PRO')) planKey = 'PROFESSIONAL';
        else if (planNameUpper.includes('ENTERPRISE')) planKey = 'ENTERPRISE';

        // Update subscription fields inside User document
        user.subscription = {
            plan: planKey,
            status: 'active',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            expiryDate,
            purchaseDate: new Date(),
            amount: billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly,
            currency: 'INR',
            gateway: 'Razorpay',
            invoice: `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            autoRenew: true
        };

        // Reset trial usages on new subscription purchase
        user.usage = {
            mockCourtroomTrials: 0,
            knowledgeHubTrials: 0,
            clientConnectTrials: 0,
            resetDate: new Date()
        };

        // Award credits for this plan
        let finalCredits = (billingCycle === 'yearly')
            ? (plan.creditsYearly || plan.credits * 12)
            : plan.credits;
        user.credits = (user.credits || 0) + Math.floor(finalCredits);

        // Create formal Subscription entry in the database
        const newSubscription = await Subscription.create({
            userId,
            planId: plan._id,
            creditsRemaining: user.credits,
            billingCycle,
            subscriptionStart: new Date(),
            renewalDate: expiryDate,
            subscriptionStatus: 'active',
            paymentId: razorpay_payment_id
        });

        await user.save();

        // 📝 Log Plan Credit
        await CreditLog.create({
            userId,
            action: 'plan_credit',
            description: `Subscription: ${plan.planName}`,
            credits: finalCredits,
            balanceAfter: user.credits
        });

        res.status(200).json({
            success: true,
            user,
            subscription: newSubscription,
            message: "Welcome to AI Legal Pro! Your purchase was successfully verified and plan activated."
        });
    } catch (error) {
        console.error('[VerifyPayment Error]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const restorePurchase = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const activeSub = await Subscription.findOne({ userId, subscriptionStatus: 'active' }).populate('planId');
        
        if (!activeSub) {
            return res.status(200).json({ success: false, message: "No active subscription found to restore." });
        }

        const user = await User.findById(userId);
        const planNameUpper = (activeSub.planId?.planName || '').toUpperCase();
        let planKey = 'FREE';
        if (planNameUpper.includes('STARTER')) planKey = 'STARTER';
        else if (planNameUpper.includes('PROFESSIONAL') || planNameUpper.includes('PRO')) planKey = 'PROFESSIONAL';
        else if (planNameUpper.includes('ENTERPRISE')) planKey = 'ENTERPRISE';

        user.subscription = {
            plan: planKey,
            status: 'active',
            paymentId: activeSub.paymentId || 'restored_payment',
            orderId: activeSub.orderId || 'restored_order',
            expiryDate: activeSub.renewalDate,
            purchaseDate: activeSub.subscriptionStart,
            amount: activeSub.billingCycle === 'yearly' ? activeSub.planId?.priceYearly : activeSub.planId?.priceMonthly,
            currency: 'INR',
            gateway: 'Razorpay',
            invoice: `INV-REST-${Date.now()}`,
            autoRenew: true
        };

        await user.save();
        res.status(200).json({ success: true, user, message: "Subscription restored successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

