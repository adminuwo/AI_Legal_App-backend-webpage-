import mongoose from 'mongoose';
import PlanUsage from '../models/PlanUsage.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Plan from '../models/Plan.js';

// Mappings of feature limits per subscription plan (Default Fallback Matrix)
export const PLAN_LIMITS = {
    FREE: {
        cases: 3,
        draft_maker: 2,
        court_prep: 2,
        legal_precedent: 2,
        evidence_analysis: 2,
        contract_review: 2,
        strategy_engine: 2,
        case_predictor: 2,
        mock_courtroom: 1,
        client_connect: 1,
        notes_maker: 2,
        quiz_practice: 5
    },
    PRO: {
        cases: 50,
        draft_maker: 5,
        court_prep: 5,
        legal_precedent: 5,
        evidence_analysis: 5,
        contract_review: 5,
        strategy_engine: 5,
        case_predictor: 5,
        mock_courtroom: 2,
        client_connect: 2,
        notes_maker: 5,
        quiz_practice: Infinity
    },
    PREMIUM: {
        cases: 100,
        draft_maker: 15,
        court_prep: 15,
        legal_precedent: 15,
        evidence_analysis: 15,
        contract_review: 15,
        strategy_engine: 15,
        case_predictor: 15,
        mock_courtroom: 5,
        client_connect: 5,
        notes_maker: 15,
        quiz_practice: Infinity
    },
    ENTERPRISE: {
        cases: 250,
        draft_maker: Infinity,
        court_prep: Infinity,
        legal_precedent: Infinity,
        evidence_analysis: Infinity,
        contract_review: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        mock_courtroom: Infinity,
        client_connect: Infinity,
        notes_maker: Infinity,
        quiz_practice: Infinity
    },
    SUPER_ADMIN: {
        cases: Infinity,
        draft_maker: Infinity,
        court_prep: Infinity,
        legal_precedent: Infinity,
        evidence_analysis: Infinity,
        contract_review: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        mock_courtroom: Infinity,
        client_connect: Infinity,
        notes_maker: Infinity,
        quiz_practice: Infinity
    }
};

// Dynamic cache for DB Plan limits
let DYNAMIC_PLAN_CACHE = null;
let LAST_CACHE_TIME = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

/**
 * Loads dynamic plan limits from MongoDB database collection with automatic fallbacks
 */
export const getDynamicPlanLimits = async () => {
    const now = Date.now();
    if (DYNAMIC_PLAN_CACHE && (now - LAST_CACHE_TIME < CACHE_TTL_MS)) {
        return DYNAMIC_PLAN_CACHE;
    }

    try {
        const dbPlans = await Plan.find({ isActive: true });
        if (dbPlans && dbPlans.length > 0) {
            const mergedLimits = { ...PLAN_LIMITS };
            dbPlans.forEach(p => {
                const planKey = (p.planId || p.planName || '').toUpperCase();
                if (planKey && p.limits) {
                    const parsedLimits = p.limits instanceof Map ? Object.fromEntries(p.limits) : p.limits;
                    mergedLimits[planKey] = {
                        ...(mergedLimits[planKey] || PLAN_LIMITS.FREE),
                        ...parsedLimits
                    };
                }
            });
            DYNAMIC_PLAN_CACHE = mergedLimits;
            LAST_CACHE_TIME = now;
            return mergedLimits;
        }
    } catch (e) {
        console.warn('[getDynamicPlanLimits] Using default plan limits matrix:', e.message);
    }
    return PLAN_LIMITS;
};

/**
 * Resolves user subscription plan, handling expiries and mapping database plan names
 */
export const resolveActiveUserPlan = async (user) => {
    if (!user) return 'FREE';

    // SUPER_ADMIN: Permanent unlimited access — bypass all subscription logic
    if (user.role === 'SUPER_ADMIN') {
        return 'SUPER_ADMIN';
    }

    let plan = 'FREE';
    let status = 'inactive';
    let expiryDate = null;

    if (user.subscription && user.subscription.plan) {
        plan = user.subscription.plan;
        status = user.subscription.status;
        expiryDate = user.subscription.expiryDate;
    }

    // Try finding subscription object in Subscription collection
    try {
        const Subscription = mongoose.model('Subscription');
        const activeSub = await Subscription.findOne({
            $or: [{ userId: user._id }, { accountId: user._id }],
            status: 'active'
        }).populate('planId');
        if (activeSub) {
            status = 'active';
            expiryDate = activeSub.expiryDate || activeSub.renewalDate;
            const pName = activeSub.tier || activeSub.planId?.planId || activeSub.planId?.planName || 'FREE';
            plan = pName;
        }
    } catch (e) {
        // Ignored if model not loaded
    }

    // Check expiry
    if (status === 'active' && expiryDate && new Date(expiryDate) < new Date()) {
        if (user.subscription && user.subscription.status === 'active') {
            user.subscription.plan = 'FREE';
            user.subscription.status = 'expired';
            await user.save().catch(() => {});
        }
        return 'FREE';
    }

    if (status !== 'active') {
        return 'FREE';
    }

    const planStr = (plan || '').toUpperCase();
    if (planStr === 'ENTERPRISE' || planStr.includes('ENTERPRISE') || planStr.includes('FIRM') || planStr.includes('COMBO')) {
        return 'ENTERPRISE';
    }
    if (planStr === 'PREMIUM' || planStr.includes('PREMIUM')) {
        return 'PREMIUM';
    }
    if (planStr === 'PRO' || planStr === 'PROFESSIONAL' || planStr.includes('PRO')) {
        return 'PRO';
    }
    if (planStr === 'BASIC' || planStr.includes('BASIC')) {
        return 'BASIC';
    }
    return 'FREE';
};

/**
 * Normalizes features key names
 */
const normalizeFeatureKey = (feature) => {
    let key = (feature || '').replace(/-/g, '_');
    if (key === 'argument_builder') key = 'court_prep';
    if (key === 'legal_precedents') key = 'legal_precedent';
    if (key === 'contract_analyzer') key = 'contract_review';
    if (key === 'evidence_analyst') key = 'evidence_analysis';
    return key;
};

/**
 * Checks usage, processes automatic cycle resets, and returns permission stats
 */
export const checkAccess = async (userId, feature) => {
    const user = await User.findById(userId);
    if (!user) {
        return { allowed: false, usedCount: 0, remainingCount: 0, plan: 'FREE', limit: 0 };
    }

    // SUPER_ADMIN: Immediately grant unlimited access
    if (user.role === 'SUPER_ADMIN') {
        return { allowed: true, usedCount: 0, remainingCount: Infinity, plan: 'SUPER_ADMIN', limit: Infinity };
    }

    const normalizedFeature = normalizeFeatureKey(feature);
    const plan = await resolveActiveUserPlan(user);
    const allPlanLimits = await getDynamicPlanLimits();
    const limits = allPlanLimits[plan] || allPlanLimits.FREE;

    // Check cases count limit separately
    if (normalizedFeature === 'cases') {
        const usedCount = await Project.countDocuments({ userId });
        const limit = limits.cases;
        const remainingCount = limit === Infinity ? Infinity : Math.max(0, limit - usedCount);
        return {
            allowed: limit === Infinity || usedCount < limit,
            usedCount,
            remainingCount,
            plan,
            limit
        };
    }

    const limit = limits[normalizedFeature] !== undefined ? limits[normalizedFeature] : 0;
    if (limit === Infinity) {
        // Get used count but don't limit
        const usage = await PlanUsage.findOne({ userId, feature: normalizedFeature });
        return {
            allowed: true,
            usedCount: usage ? usage.usedCount : 0,
            remainingCount: Infinity,
            plan,
            limit
        };
    }

    // Load active subscription to check billing cycle reset
    let subscription = null;
    try {
        const Subscription = mongoose.model('Subscription');
        subscription = await Subscription.findOne({ userId, subscriptionStatus: 'active' });
    } catch (e) {}

    // Check and process reset if cycle restarted
    let usage = await PlanUsage.findOne({ userId, feature: normalizedFeature });
    let resetRequired = false;
    let newResetDate = null;
    
    if (subscription && subscription.renewalDate) {
        newResetDate = subscription.renewalDate;
        if (!usage || !usage.resetDate || usage.resetDate.getTime() !== newResetDate.getTime()) {
            resetRequired = true;
        }
    }
    
    if (!usage) {
        usage = new PlanUsage({
            userId,
            feature: normalizedFeature,
            usedCount: 0,
            plan,
            resetDate: newResetDate
        });
        await usage.save().catch(() => {});
    } else {
        if (usage.plan !== plan) {
            usage.plan = plan;
            await usage.save().catch(() => {});
        }
        if (resetRequired && plan !== 'FREE') {
            usage.usedCount = 0;
            usage.plan = plan;
            usage.resetDate = newResetDate;
            await usage.save().catch(() => {});
        }
    }

    const remainingCount = Math.max(0, limit - usage.usedCount);
    return {
        allowed: remainingCount > 0,
        usedCount: usage.usedCount,
        remainingCount,
        plan,
        limit
    };
};

/**
 * Increments usage for a specific feature and syncs active plan & remaining count in MongoDB
 */
export const incrementUsage = async (userId, feature) => {
    const normalizedFeature = normalizeFeatureKey(feature);
    if (normalizedFeature === 'cases') return { usedCount: 0, remainingCount: 0, limit: 0, plan: 'FREE' };

    const user = await User.findById(userId);
    const plan = user ? await resolveActiveUserPlan(user) : 'FREE';

    const allPlanLimits = await getDynamicPlanLimits();
    const limits = allPlanLimits[plan] || PLAN_LIMITS.FREE;
    const limit = limits[normalizedFeature] !== undefined ? limits[normalizedFeature] : 0;

    const existingUsage = await PlanUsage.findOne({ userId, feature: normalizedFeature });
    const newUsedCount = (existingUsage ? existingUsage.usedCount : 0) + 1;
    const remainingCount = limit === Infinity ? -1 : Math.max(0, limit - newUsedCount);

    const updated = await PlanUsage.findOneAndUpdate(
        { userId, feature: normalizedFeature },
        { 
            $inc: { usedCount: 1 }, 
            $set: { 
                plan, 
                remainingCount,
                lastUsed: new Date() 
            } 
        },
        { upsert: true, new: true }
    );

    return {
        feature: normalizedFeature,
        usedCount: updated.usedCount,
        remainingCount,
        limit,
        plan
    };
};

/**
 * Automatically seeds master subscription plans into MongoDB `plans` collection
 */
export const seedDatabasePlans = async () => {
    try {
        const masterPlans = [
            {
                planId: 'FREE',
                planName: 'AI Legal™ Free',
                priceMonthly: 0,
                priceYearly: 0,
                credits: 500,
                badge: 'FREE TIER',
                storageGB: 1,
                limits: PLAN_LIMITS.FREE
            },
            {
                planId: 'BASIC',
                planName: 'AI Legal™ Basic',
                priceMonthly: 499,
                priceYearly: 4990,
                credits: 1000,
                badge: 'BASIC',
                storageGB: 5,
                limits: PLAN_LIMITS.PRO
            },
            {
                planId: 'PRO',
                planName: 'AI Legal™ Professional',
                priceMonthly: 999,
                priceYearly: 9990,
                credits: 3000,
                badge: 'PROFESSIONAL',
                isPopular: true,
                storageGB: 20,
                limits: PLAN_LIMITS.PRO
            },
            {
                planId: 'PREMIUM',
                planName: 'AI Legal™ Premium',
                priceMonthly: 1999,
                priceYearly: 19990,
                credits: 8000,
                badge: 'PREMIUM',
                storageGB: 100,
                limits: PLAN_LIMITS.PREMIUM
            },
            {
                planId: 'ENTERPRISE',
                planName: 'Firm Premium / Enterprise',
                priceMonthly: 4999,
                priceYearly: 49990,
                credits: 25000,
                badge: 'ENTERPRISE',
                storageGB: 500,
                limits: PLAN_LIMITS.ENTERPRISE
            }
        ];

        for (const planData of masterPlans) {
            await Plan.findOneAndUpdate(
                { planId: planData.planId },
                { $set: planData },
                { upsert: true, new: true }
            );
        }
        console.log('[PlanSeeder] Dynamic MongoDB Plans seeded successfully into "plans" collection.');
    } catch (err) {
        console.error('[PlanSeeder] Failed to seed plans into MongoDB:', err.message);
    }
};

// Seed MongoDB plans on module initialization
seedDatabasePlans();

// Mappings of storage limits per subscription plan (in GB)
export const STORAGE_LIMITS = {
    FREE: 1,
    BASIC: 5,
    PRO: 20,
    PREMIUM: 100,
    ENTERPRISE: 500,
    SUPER_ADMIN: Infinity
};

/**
 * Calculates current storage used by user across all projects, documents & vault files (in Bytes and GB)
 */
export const getUserStorageUsage = async (userId) => {
    try {
        const projects = await Project.find({ userId }).select('documents files evidenceVault attachments storageUsedBytes');
        let totalBytes = 0;

        projects.forEach(p => {
            if (p.storageUsedBytes && typeof p.storageUsedBytes === 'number') {
                totalBytes += p.storageUsedBytes;
            } else {
                // Estimate size from documents array if present
                const docs = p.documents || [];
                docs.forEach(doc => {
                    if (doc.fileSize) totalBytes += Number(doc.fileSize);
                    else if (doc.content) totalBytes += Buffer.byteLength(doc.content, 'utf8');
                    else totalBytes += 500000; // 500 KB default estimate
                });

                const vault = p.evidenceVault || [];
                vault.forEach(item => {
                    if (item.fileSize) totalBytes += Number(item.fileSize);
                    else totalBytes += 1000000; // 1 MB estimate
                });
            }
        });

        const user = await User.findById(userId);
        const plan = user ? await resolveActiveUserPlan(user) : 'FREE';
        const limitGB = STORAGE_LIMITS[plan] !== undefined ? STORAGE_LIMITS[plan] : STORAGE_LIMITS.FREE;

        const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
        const usedGB = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        const remainingGB = limitGB === Infinity ? Infinity : Math.max(0, Number((limitGB - usedGB).toFixed(2)));
        const percentage = limitGB === Infinity || limitGB === 0 ? 0 : Math.min(100, Math.round((usedGB / limitGB) * 100));

        return {
            usedBytes: totalBytes,
            usedMB,
            usedGB,
            limitGB,
            remainingGB,
            percentage,
            plan
        };
    } catch (err) {
        console.error('[getUserStorageUsage Error]', err);
        return { usedBytes: 0, usedMB: 0, usedGB: 0, limitGB: 3, remainingGB: 3, percentage: 0, plan: 'FREE' };
    }
};

/**
 * Validates if user has enough storage left before uploading incoming file
 */
export const checkStorageAccess = async (userId, incomingFileSizeBytes = 0) => {
    const user = await User.findById(userId);
    if (!user) {
        return { allowed: false, code: 'UNAUTHORIZED', message: 'User not found.' };
    }
    if (user.role === 'SUPER_ADMIN') {
        return { allowed: true, usedGB: 0, limitGB: Infinity, remainingGB: Infinity };
    }

    const storageStats = await getUserStorageUsage(userId);
    const limitBytes = storageStats.limitGB === Infinity ? Infinity : storageStats.limitGB * 1024 * 1024 * 1024;
    const projectedTotalBytes = storageStats.usedBytes + incomingFileSizeBytes;

    if (limitBytes !== Infinity && projectedTotalBytes > limitBytes) {
        return {
            allowed: false,
            code: 'STORAGE_FULL',
            title: 'Storage Full',
            message: `Your plan includes ${storageStats.limitGB} GB storage. You have used ${storageStats.usedGB} GB. Please free up storage or upgrade your subscription to continue uploading files.`,
            storage: storageStats
        };
    }

    return {
        allowed: true,
        storage: storageStats
    };
};

/**
 * Validates if user can create a new Matter / Case folder
 */
export const checkCaseCreationAccess = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        return { allowed: false, code: 'UNAUTHORIZED', message: 'User not found.' };
    }
    if (user.role === 'SUPER_ADMIN') {
        return { allowed: true, used: 0, limit: Infinity };
    }

    const plan = await resolveActiveUserPlan(user);
    const allPlanLimits = await getDynamicPlanLimits();
    const limits = allPlanLimits[plan] || allPlanLimits.FREE;
    const limit = limits.cases;
    const usedCount = await Project.countDocuments({ userId });

    if (limit !== Infinity && usedCount >= limit) {
        return {
            allowed: false,
            code: 'MATTER_LIMIT_EXCEEDED',
            title: 'Matter Limit Reached',
            message: `You have created ${usedCount} of ${limit} active cases included in your ${plan} Plan. Upgrade your subscription to create more cases.`,
            used: usedCount,
            limit
        };
    }

    return {
        allowed: true,
        used: usedCount,
        limit
    };
};

/**
 * Returns comprehensive usage details for a user
 */
export const getUsageStatus = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        return { plan: 'FREE', badge: 'FREE', cases: { used: 0, limit: 3, remaining: 3 }, features: {} };
    }

    // Auto-heal/verify role for aditi@uwo24.com
    if (user.email && user.email.toLowerCase().trim() === 'aditi@uwo24.com' && user.role !== 'SUPER_ADMIN') {
        user.role = 'SUPER_ADMIN';
        await user.save();
        console.log(`[Self-Healing] Upgraded ${user.email} to SUPER_ADMIN in getUsageStatus`);
    }

    const storageStats = await getUserStorageUsage(userId);

    // SUPER_ADMIN: Return unlimited status for all features
    if (user.role === 'SUPER_ADMIN') {
        const superAdminFeatures = {};
        Object.keys(PLAN_LIMITS.SUPER_ADMIN).forEach(key => {
            if (key !== 'cases') {
                superAdminFeatures[key] = { used: 0, limit: -1, remaining: -1 };
            }
        });
        return {
            success: true,
            plan: 'SUPER_ADMIN',
            badge: 'SUPER ADMIN',
            cases: { used: 0, limit: -1, remaining: -1 },
            storage: {
                usedBytes: 0,
                usedMB: 0,
                usedGB: 0,
                limitGB: -1,
                remainingGB: -1,
                percentage: 0
            },
            features: superAdminFeatures
        };
    }

    const plan = await resolveActiveUserPlan(user);
    const allPlanLimits = await getDynamicPlanLimits();
    const limits = allPlanLimits[plan] || allPlanLimits.FREE;

    // Cases usage
    const casesUsed = await Project.countDocuments({ userId });
    const casesLimit = limits.cases;
    const casesRemaining = casesLimit === Infinity ? Infinity : Math.max(0, casesLimit - casesUsed);

    // Populate active usage records
    const usageRecords = await PlanUsage.find({ userId });
    const usageMap = {};
    usageRecords.forEach(r => {
        usageMap[r.feature] = r.usedCount;
    });

    const features = {};
    Object.keys(limits).forEach(key => {
        if (key === 'cases') return;
        const limit = limits[key];
        const used = usageMap[key] || 0;
        const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
        features[key] = {
            used,
            limit,
            remaining
        };
    });

    // Plan badges text
    const planBadges = {
        FREE: 'Free',
        BASIC: 'Basic',
        PRO: 'Pro',
        PREMIUM: 'Premium',
        ENTERPRISE: 'Enterprise',
        SUPER_ADMIN: 'Super Admin'
    };

    const planDisplayNames = {
        FREE: 'AI Legal™ Free',
        BASIC: 'AI Legal™ Basic (₹499)',
        PRO: 'AI Legal™ Pro (₹999)',
        PREMIUM: 'AI Legal™ Premium (₹2399)',
        ENTERPRISE: 'AI Legal™ Enterprise',
        SUPER_ADMIN: 'SUPER ADMIN'
    };

    return {
        success: true,
        plan,
        badge: planBadges[plan] || 'Free',
        planDisplayName: planDisplayNames[plan] || 'AI Legal™ Free',
        cases: {
            used: casesUsed,
            limit: casesLimit === Infinity ? -1 : casesLimit,
            remaining: casesRemaining === Infinity ? -1 : casesRemaining
        },
        storage: {
            usedBytes: storageStats.usedBytes,
            usedMB: storageStats.usedMB,
            usedGB: storageStats.usedGB,
            limitGB: storageStats.limitGB === Infinity ? -1 : storageStats.limitGB,
            remainingGB: storageStats.remainingGB === Infinity ? -1 : storageStats.remainingGB,
            percentage: storageStats.percentage
        },
        features
    };
};
