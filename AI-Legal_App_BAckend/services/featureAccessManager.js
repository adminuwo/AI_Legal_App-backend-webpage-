import mongoose from 'mongoose';
import PlanUsage from '../models/PlanUsage.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Plan from '../models/Plan.js';

// Mappings of feature limits per subscription plan (Default Fallback Matrix)
export const PLAN_LIMITS = {
    // Advocate Plans
    ADVOCATE_FREE: {
        cases: 3,
        ai_chat: 100,
        draft_maker: 2,
        court_prep: 2,
        legal_precedent: 2,
        evidence_analysis: 2,
        contract_review: 2,
        strategy_engine: 2,
        case_predictor: 2,
        mock_courtroom: 1,
        client_connect: 1,
        knowledge_hub: 3
    },
    ADVOCATE_BASIC: {
        cases: 50,
        ai_chat: 300,
        draft_maker: 5,
        court_prep: 5,
        legal_precedent: 5,
        evidence_analysis: 5,
        contract_review: 5,
        strategy_engine: 5,
        case_predictor: 5,
        mock_courtroom: 2,
        client_connect: 2
    },
    ADVOCATE_PRO: {
        cases: 100,
        ai_chat: 1000,
        draft_maker: 15,
        court_prep: 15,
        legal_precedent: 15,
        evidence_analysis: 15,
        contract_review: 15,
        strategy_engine: 15,
        case_predictor: 15,
        mock_courtroom: 5,
        client_connect: 5
    },
    ADVOCATE_PREMIUM: {
        cases: 250,
        ai_chat: Infinity,
        draft_maker: Infinity,
        court_prep: Infinity,
        legal_precedent: Infinity,
        evidence_analysis: Infinity,
        contract_review: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        mock_courtroom: 15,
        client_connect: 20
    },

    // Student Plans
    STUDENT_FREE: {
        cases: 3,
        ai_chat: 100,
        quiz_practice: 2,
        draft_maker: 1,
        legal_precedent: 1,
        contract_review: 1,
        evidence_analysis: 1
    },
    STUDENT_BASIC: {
        cases: 25,
        quiz_practice: Infinity,
        draft_maker: 5,
        legal_precedent: 5,
        contract_review: 5,
        evidence_analysis: 5,
        strategy_engine: 5,
        case_predictor: 5,
        mock_courtroom: 2,
        notes_maker: 5
    },
    STUDENT_PRO: {
        cases: 50,
        quiz_practice: Infinity,
        draft_maker: 15,
        legal_precedent: 15,
        contract_review: 15,
        evidence_analysis: 15,
        strategy_engine: 15,
        case_predictor: 15,
        mock_courtroom: 5,
        notes_maker: 15
    },
    STUDENT_PREMIUM: {
        cases: 100,
        quiz_practice: Infinity,
        draft_maker: Infinity,
        legal_precedent: Infinity,
        contract_review: Infinity,
        evidence_analysis: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        mock_courtroom: 15,
        notes_maker: Infinity
    },

    // Law Firm Plans
    FIRM_FREE: {
        team_members: 1,
        cases: 3,
        ai_chat: 100,
        draft_maker: 1,
        contract_review: 1,
        legal_precedent: 1
    },
    FIRM_BASIC: {
        team_members: 10,
        cases: 100,
        draft_maker: 30,
        legal_precedent: 30,
        contract_review: 30,
        evidence_analysis: 30,
        strategy_engine: 30,
        case_predictor: 30,
        mock_courtroom: 10,
        client_connect: 10
    },
    FIRM_PRO: {
        team_members: 25,
        cases: 250,
        draft_maker: 100,
        legal_precedent: 100,
        contract_review: 100,
        evidence_analysis: 100,
        strategy_engine: 100,
        case_predictor: 100,
        mock_courtroom: 25,
        client_connect: 25
    },
    FIRM_PREMIUM: {
        team_members: 50,
        cases: 500,
        draft_maker: Infinity,
        legal_precedent: Infinity,
        contract_review: Infinity,
        evidence_analysis: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        mock_courtroom: 50,
        client_connect: 50
    },

    // Combo Plans
    COMBO_STUDENT_ADVOCATE: {
        cases: 50,
        quiz_practice: Infinity,
        draft_maker: 20,
        contract_review: 20,
        legal_precedent: 20,
        mock_courtroom: 5,
        client_connect: 5
    },
    COMBO_ADVOCATE_FIRM: {
        team_members: 10,
        cases: 100,
        draft_maker: 30,
        contract_review: 30,
        legal_precedent: 30,
        mock_courtroom: 10,
        client_connect: 10
    },
    COMBO_ALL_ACCESS: {
        team_members: 20,
        cases: 250,
        quiz_practice: Infinity,
        draft_maker: Infinity,
        contract_review: Infinity,
        legal_precedent: Infinity,
        mock_courtroom: 15,
        client_connect: 20
    },

    // Fallback Generic Tier Keys
    FREE: {
        cases: 3,
        ai_chat: 100,
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
        quiz_practice: 2
    },
    BASIC: {
        cases: 50,
        ai_chat: 300,
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
    PRO: {
        cases: 100,
        ai_chat: 1000,
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
    PREMIUM: {
        cases: 250,
        ai_chat: Infinity,
        draft_maker: Infinity,
        court_prep: Infinity,
        legal_precedent: Infinity,
        evidence_analysis: Infinity,
        contract_review: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        case_predictor: Infinity,
        mock_courtroom: 15,
        client_connect: 20,
        notes_maker: Infinity,
        quiz_practice: Infinity
    },
    ENTERPRISE: {
        cases: 500,
        draft_maker: Infinity,
        court_prep: Infinity,
        legal_precedent: Infinity,
        evidence_analysis: Infinity,
        contract_review: Infinity,
        strategy_engine: Infinity,
        case_predictor: Infinity,
        mock_courtroom: 50,
        client_connect: 50,
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

export const normalizeWorkspace = (ws) => {
    const lower = (ws || '').toLowerCase().trim();
    if (!lower || lower === 'personal_practice' || lower === 'personal' || lower === 'individual' || lower === 'advocate') {
        return 'advocate';
    }
    if (lower === 'law_firm' || lower === 'lawfirm' || lower === 'firm') {
        return 'lawfirm';
    }
    if (lower === 'student') {
        return 'student';
    }
    return lower;
};

/**
 * Resolves user subscription plan, handling expiries and mapping database plan names
 */
export const resolveActiveUserPlan = async (user, targetWorkspace) => {
    if (!user) return 'FREE';

    // SUPER_ADMIN: Permanent unlimited access — bypass all subscription logic strictly for aditi@uwo24.com and aditilakhera0@gmail.com
    const emailLower = (user.email || '').toLowerCase().trim();
    if (user.role === 'SUPER_ADMIN' && (emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com')) {
        return 'SUPER_ADMIN';
    }

    const normTargetWs = normalizeWorkspace(targetWorkspace);

    let plan = 'FREE';
    let status = 'inactive';
    let expiryDate = null;
    let subWorkspace = null;

    // 1. Check embedded user.subscription (match workspace or combo)
    if (user.subscription && user.subscription.plan && (user.subscription.status || '').toLowerCase() === 'active') {
        const userSubWs = normalizeWorkspace(user.subscription.workspace);
        const isComboSub = userSubWs === 'combo' || userSubWs === 'all' || (user.subscription.plan || '').toLowerCase().includes('combo');
        
        if (!normTargetWs || isComboSub || userSubWs === normTargetWs || !userSubWs) {
            plan = user.subscription.plan;
            status = 'active';
            expiryDate = user.subscription.expiryDate;
            subWorkspace = user.subscription.workspace;
        }
    }

    // 2. Try finding active subscription in Subscription collection for targetWorkspace or combo
    try {
        const Subscription = mongoose.model('Subscription');
        const allowedWorkspaces = normTargetWs === 'advocate'
            ? ['advocate', 'personal_practice', 'personal', 'combo', 'all']
            : normTargetWs === 'lawfirm'
            ? ['lawfirm', 'law_firm', 'firm', 'combo', 'all']
            : [normTargetWs, 'combo', 'all'];
        
        const activeSub = await Subscription.findOne({
            $or: [
                { userId: user._id, workspace: { $in: allowedWorkspaces } },
                { accountId: user._id, workspace: { $in: allowedWorkspaces } },
                { userId: user._id, tier: { $regex: /combo/i } },
                { accountId: user._id, tier: { $regex: /combo/i } }
            ],
            status: { $in: ['active', 'Active'] },
            tier: { $ne: 'FREE' }
        }).sort({ createdAt: -1 }).populate('planId');

        if (activeSub) {
            const subWsLower = normalizeWorkspace(activeSub.workspace);
            const isComboSub = subWsLower === 'combo' || subWsLower === 'all' || (activeSub.tier || '').toLowerCase().includes('combo');
            
            if (!normTargetWs || isComboSub || subWsLower === normTargetWs || !subWsLower) {
                status = 'active';
                expiryDate = activeSub.expiryDate || activeSub.renewalDate;
                const pName = activeSub.tier || activeSub.planId?.planId || activeSub.planId?.planName || plan;
                if (pName) plan = pName;
                if (activeSub.workspace) subWorkspace = activeSub.workspace;
            }
        }
    } catch (e) {
        // Ignored if model not loaded
    }

    const normStatus = (status || '').toLowerCase();

    // Check expiry
    if (normStatus === 'active' && expiryDate && new Date(expiryDate) < new Date()) {
        if (user.subscription && (user.subscription.status || '').toLowerCase() === 'active') {
            user.subscription.plan = 'FREE';
            user.subscription.status = 'expired';
            await user.save().catch(() => {});
        }
        return 'FREE';
    }

    if (normStatus !== 'active') {
        return 'FREE';
    }

    // Enforce Plan Workspace Isolation
    const subPlanLower = (plan || '').toLowerCase();
    let designatedWs = normalizeWorkspace(subWorkspace);

    // Specific Combo Plan type checks
    const isStudentAdvCombo = subPlanLower.includes('student_advocate') || subPlanLower.includes('student_adv');
    const isAdvFirmCombo = subPlanLower.includes('advocate_firm') || subPlanLower.includes('adv_firm') || subPlanLower.includes('adv_law');
    const isAllAccessPass = subPlanLower.includes('all_access') || subPlanLower.includes('eco_pass') || subPlanLower.includes('all_in_one');

    // Infer designated workspace from plan ID if missing
    if (!designatedWs || designatedWs === 'advocate') {
        if (isAllAccessPass) designatedWs = 'all';
        else if (isStudentAdvCombo) designatedWs = 'student_adv_combo';
        else if (isAdvFirmCombo) designatedWs = 'adv_firm_combo';
        else if (subPlanLower.startsWith('advocate_') || subPlanLower.startsWith('adv_')) designatedWs = 'advocate';
        else if (subPlanLower.startsWith('student_')) designatedWs = 'student';
        else if (subPlanLower.startsWith('firm_') || subPlanLower.startsWith('lawfirm_')) designatedWs = 'lawfirm';
        else if (subPlanLower.startsWith('combo_')) designatedWs = 'all';
    }

    if (normTargetWs) {
        if (isAllAccessPass || designatedWs === 'all') {
            // All Access Eco Pass: Valid across ALL workspaces
        } else if (isStudentAdvCombo || designatedWs === 'student_adv_combo') {
            // Student + Advocate Combo: Valid ONLY in student and advocate workspaces
            if (normTargetWs !== 'student' && normTargetWs !== 'advocate') {
                return 'FREE';
            }
        } else if (isAdvFirmCombo || designatedWs === 'adv_firm_combo') {
            // Advocate + Law Firm Combo: Valid ONLY in advocate and lawfirm workspaces
            if (normTargetWs !== 'advocate' && normTargetWs !== 'lawfirm') {
                return 'FREE';
            }
        } else if (designatedWs && designatedWs !== normTargetWs) {
            // Single Workspace Mismatch! e.g., advocate_basic bought for advocate workspace cannot be used in student workspace
            return 'FREE';
        }
    }

    const planStr = (plan || '').toUpperCase();

    if (PLAN_LIMITS[planStr]) {
        return planStr;
    }

    // Exact plan mappings per workspace tier
    if (planStr === 'ENTERPRISE' || planStr.includes('ENTERPRISE') || planStr.includes('FIRM') || planStr.includes('COMBO')) {
        return 'ENTERPRISE';
    }
    if (planStr.includes('ADVOCATE_PRO') || planStr.includes('PREMIUM') || planStr.includes('STUDENT_PRO')) {
        return 'PREMIUM';
    }
    if (planStr.includes('ADVOCATE_BASIC') || planStr.includes('STUDENT_BASIC') || planStr.includes('PRO') || planStr.includes('PROFESSIONAL') || planStr.includes('BASIC')) {
        return 'PRO';
    }
    return planStr || 'FREE';
};

export const normalizeFeatureKey = (feature) => {
    let key = (feature || '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/-/g, '_')
        .trim();

    if (['notes', 'notesmaker', 'notes_maker', 'ai_notes', 'student_notes', 'student_note', 'legal_notes', 'study_notes'].includes(key)) {
        return 'notes_maker';
    }
    if (['draft', 'drafts', 'drafting', 'draft_maker', 'legal_draft_maker', 'legal_notice_generator', 'legal_fir_generator', 'legal_affidavit_generator', 'draft_generator'].includes(key)) {
        return 'draft_maker';
    }
    if (['court_prep', 'argument_builder', 'legal_argument_builder', 'court_preparation', 'prep'].includes(key)) {
        return 'court_prep';
    }
    if (['legal_precedent', 'legal_precedents', 'precedents', 'case_law', 'legal_case_law_research', 'legal_research_assistant', 'research_assistant', 'case_research', 'knowledge_hub', 'knowledgehub', 'legal_knowledge_hub', 'knowledge_base'].includes(key)) {
        return 'legal_precedent';
    }
    if (['evidence_analysis', 'evidence_analyst', 'evidence_checker', 'legal_evidence_checker', 'evidence'].includes(key)) {
        return 'evidence_analysis';
    }
    if (['contract_review', 'contract_analyzer', 'legal_contract_analyzer', 'contract_analysis', 'contracts'].includes(key)) {
        return 'contract_review';
    }
    if (['strategy_engine', 'legal_strategy_engine', 'case_strategy', 'strategy'].includes(key)) {
        return 'strategy_engine';
    }
    if (['case_predictor', 'legal_case_predictor', 'prediction', 'predictor'].includes(key)) {
        return 'case_predictor';
    }
    if (['mock_courtroom', 'mockcourtroom', 'mockcourtroomtrials', 'courtroom'].includes(key)) {
        return 'mock_courtroom';
    }
    if (['client_connect', 'clientconnect', 'client_communication'].includes(key)) {
        return 'client_connect';
    }
    if (['quiz_practice', 'quiz', 'quiz_mode'].includes(key)) {
        return 'quiz_practice';
    }
    if (['cases', 'case', 'project', 'projects'].includes(key)) {
        return 'cases';
    }
    // Fallback all chat/case assistant/unknown tools to 'ai_chat'
    return 'ai_chat';
};

/**
 * Checks usage, processes automatic cycle resets, and returns permission stats
 */
export const checkAccess = async (userId, feature, targetWorkspace) => {
    const user = await User.findById(userId);
    if (!user) {
        return { allowed: false, usedCount: 0, remainingCount: 0, plan: 'FREE', limit: 0 };
    }

    // SUPER_ADMIN: Immediately grant unlimited access
    if (user.role === 'SUPER_ADMIN') {
        return { allowed: true, usedCount: 0, remainingCount: Infinity, plan: 'SUPER_ADMIN', limit: Infinity };
    }

    const normalizedFeature = normalizeFeatureKey(feature);
    const plan = await resolveActiveUserPlan(user, targetWorkspace);
    const allPlanLimits = await getDynamicPlanLimits();
    const limits = allPlanLimits[plan] || allPlanLimits.FREE;

    // Check cases count limit separately
    if (normalizedFeature === 'cases') {
        const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const usedCount = await Project.countDocuments({ $or: [{ userId }, { userId: userObjId }] });
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

    const limit = limits[normalizedFeature] !== undefined 
        ? limits[normalizedFeature] 
        : (limits['ai_chat'] !== undefined ? limits['ai_chat'] : 100);
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
            usage.usedCount = 0; // Reset usage counter on plan upgrade/change
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
 * Resets all feature usage records for a specific user upon plan purchase or upgrade
 */
export const resetUserPlanUsage = async (userId) => {
    try {
        await PlanUsage.deleteMany({ userId });
        console.log(`[PlanUsage] Reset usage records for user ${userId}`);
    } catch (err) {
        console.error('[PlanUsage] Error resetting usage:', err.message);
    }
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
    const limit = limits[normalizedFeature] !== undefined ? limits[normalizedFeature] : (limits['ai_chat'] !== undefined ? limits['ai_chat'] : 100);

    // Consolidate legacy unnormalized records if normalizedFeature is ai_chat
    if (normalizedFeature === 'ai_chat') {
        try {
            const legacyRecords = await PlanUsage.find({ 
                userId, 
                feature: { $in: ['legal_my_case', 'my_case', 'caseAssistant', 'case_assistant', 'general', 'normal_chat'] } 
            });
            if (legacyRecords.length > 0) {
                let legacySum = 0;
                legacyRecords.forEach(r => { legacySum += (r.usedCount || 0); });
                await PlanUsage.deleteMany({ _id: { $in: legacyRecords.map(r => r._id) } });
                await PlanUsage.findOneAndUpdate(
                    { userId, feature: 'ai_chat' },
                    { $inc: { usedCount: legacySum } },
                    { upsert: true }
                );
            }
        } catch (legErr) {
            console.warn('[Legacy PlanUsage Consolidation Warning]', legErr.message);
        }
    }

    const existingUsage = await PlanUsage.findOne({ userId, feature: normalizedFeature });
    const currentUsed = existingUsage ? existingUsage.usedCount : 0;
    
    // Check limit enforcement (unless SUPER_ADMIN or limit === Infinity)
    if (user && user.role !== 'SUPER_ADMIN' && limit !== Infinity && currentUsed >= limit) {
        const remainingCount = 0;
        return {
            feature: normalizedFeature,
            usedCount: currentUsed,
            remainingCount,
            limit,
            plan,
            exceeded: true
        };
    }

    const newUsedCount = currentUsed + 1;
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

    // Socket.IO Real-Time Cross-Platform Broadcast to User's Channel
    try {
        const { getIO } = await import('../utils/socket.js');
        const io = getIO();
        if (io) {
            io.to(userId.toString()).emit('feature_usage_updated', {
                userId: userId.toString(),
                featureKey: normalizedFeature,
                feature: normalizedFeature,
                usedCount: updated.usedCount,
                limit,
                remainingCount,
                remaining: remainingCount,
                plan,
                timestamp: Date.now()
            });
            console.log(`📡 [Socket] Emitted feature_usage_updated to user ${userId} -> ${normalizedFeature}: ${updated.usedCount}/${limit} (${remainingCount} left)`);
        }
    } catch (sockErr) {
        console.warn('⚠️ [Socket Broadcast Warning]', sockErr.message);
    }

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
            // Advocate Plans
            {
                planId: 'advocate_free',
                planName: 'Advocate Free Tier',
                priceMonthly: 0,
                priceYearly: 0,
                credits: 500,
                badge: 'FREE TIER',
                storageGB: 1,
                limits: PLAN_LIMITS.ADVOCATE_FREE
            },
            {
                planId: 'advocate_basic',
                planName: 'Advocate Basic Plan',
                priceMonthly: 499,
                priceYearly: 4990,
                credits: 2940,
                badge: 'BASIC',
                storageGB: 5,
                limits: PLAN_LIMITS.ADVOCATE_BASIC
            },
            {
                planId: 'advocate_pro',
                planName: 'Advocate Pro Plan',
                priceMonthly: 999,
                priceYearly: 9990,
                credits: 5876,
                badge: 'PRO',
                isPopular: true,
                storageGB: 20,
                limits: PLAN_LIMITS.ADVOCATE_PRO
            },
            {
                planId: 'advocate_premium',
                planName: 'Advocate Premium Plan',
                priceMonthly: 2399,
                priceYearly: 23990,
                credits: 14700,
                badge: 'PREMIUM',
                storageGB: 100,
                limits: PLAN_LIMITS.ADVOCATE_PREMIUM
            },

            // Student Plans
            {
                planId: 'student_free',
                planName: 'Student Free Tier',
                priceMonthly: 0,
                priceYearly: 0,
                credits: 500,
                badge: 'FREE TIER',
                storageGB: 0.5,
                limits: PLAN_LIMITS.STUDENT_FREE
            },
            {
                planId: 'student_basic',
                planName: 'Student Basic Plan',
                priceMonthly: 499,
                priceYearly: 4990,
                credits: 2940,
                badge: 'BASIC',
                storageGB: 5,
                limits: PLAN_LIMITS.STUDENT_BASIC
            },
            {
                planId: 'student_pro',
                planName: 'Student Pro Plan',
                priceMonthly: 999,
                priceYearly: 9990,
                credits: 5876,
                badge: 'PRO',
                isPopular: true,
                storageGB: 20,
                limits: PLAN_LIMITS.STUDENT_PRO
            },
            {
                planId: 'student_premium',
                planName: 'Student Premium Plan',
                priceMonthly: 2399,
                priceYearly: 23990,
                credits: 14700,
                badge: 'PREMIUM',
                storageGB: 50,
                limits: PLAN_LIMITS.STUDENT_PREMIUM
            },

            // Law Firm Plans
            {
                planId: 'firm_free',
                planName: 'Law Firm Free Tier',
                priceMonthly: 0,
                priceYearly: 0,
                credits: 500,
                badge: 'FREE TIER',
                storageGB: 0.5,
                limits: PLAN_LIMITS.FIRM_FREE
            },
            {
                planId: 'firm_basic',
                planName: 'Law Firm Basic Plan',
                priceMonthly: 1499,
                priceYearly: 14990,
                credits: 8800,
                badge: 'FIRM BASIC',
                storageGB: 25,
                limits: PLAN_LIMITS.FIRM_BASIC
            },
            {
                planId: 'firm_pro',
                planName: 'Law Firm Pro Plan',
                priceMonthly: 2999,
                priceYearly: 29990,
                credits: 17600,
                badge: 'FIRM PRO',
                isPopular: true,
                storageGB: 100,
                limits: PLAN_LIMITS.FIRM_PRO
            },
            {
                planId: 'firm_premium',
                planName: 'Law Firm Premium Plan',
                priceMonthly: 4999,
                priceYearly: 49990,
                credits: 30000,
                badge: 'FIRM PREMIUM',
                storageGB: 500,
                limits: PLAN_LIMITS.FIRM_PREMIUM
            },

            // Special Combo Access Plans
            {
                planId: 'combo_student_advocate',
                planName: 'Student + Advocate Combo',
                priceMonthly: 1199,
                priceYearly: 11990,
                credits: 7050,
                badge: 'COMBO',
                storageGB: 25,
                limits: PLAN_LIMITS.COMBO_STUDENT_ADVOCATE
            },
            {
                planId: 'combo_advocate_firm',
                planName: 'Advocate + Law Firm Combo',
                priceMonthly: 1499,
                priceYearly: 14990,
                credits: 8800,
                badge: 'COMBO',
                isPopular: true,
                storageGB: 50,
                limits: PLAN_LIMITS.COMBO_ADVOCATE_FIRM
            },
            {
                planId: 'combo_all_access',
                planName: 'Combo All-Access Pass',
                priceMonthly: 2399,
                priceYearly: 23990,
                credits: 14700,
                badge: 'ALL ACCESS',
                storageGB: 100,
                limits: PLAN_LIMITS.COMBO_ALL_ACCESS
            },

            // Master Generic Fallbacks
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
                credits: 2940,
                badge: 'BASIC',
                storageGB: 5,
                limits: PLAN_LIMITS.BASIC
            },
            {
                planId: 'PRO',
                planName: 'AI Legal™ Professional',
                priceMonthly: 999,
                priceYearly: 9990,
                credits: 5876,
                badge: 'PROFESSIONAL',
                isPopular: true,
                storageGB: 20,
                limits: PLAN_LIMITS.PRO
            },
            {
                planId: 'PREMIUM',
                planName: 'AI Legal™ Premium',
                priceMonthly: 2399,
                priceYearly: 23990,
                credits: 14700,
                badge: 'PREMIUM',
                storageGB: 100,
                limits: PLAN_LIMITS.PREMIUM
            },
            {
                planId: 'ENTERPRISE',
                planName: 'Firm Premium / Enterprise',
                priceMonthly: 4999,
                priceYearly: 49990,
                credits: 30000,
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
    ADVOCATE_FREE: 1,
    ADVOCATE_BASIC: 5,
    ADVOCATE_PRO: 20,
    ADVOCATE_PREMIUM: 100,
    STUDENT_FREE: 0.5,
    STUDENT_BASIC: 5,
    STUDENT_PRO: 20,
    STUDENT_PREMIUM: 50,
    FIRM_FREE: 0.5,
    FIRM_BASIC: 25,
    FIRM_PRO: 100,
    FIRM_PREMIUM: 500,
    COMBO_STUDENT_ADVOCATE: 25,
    COMBO_ADVOCATE_FIRM: 50,
    COMBO_ALL_ACCESS: 100,
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
export const getUserStorageUsage = async (userId, targetWorkspace) => {
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
        const plan = user ? await resolveActiveUserPlan(user, targetWorkspace) : 'FREE';
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
export const checkStorageAccess = async (userId, incomingFileSizeBytes = 0, targetWorkspace) => {
    const user = await User.findById(userId);
    if (!user) {
        return { allowed: false, code: 'UNAUTHORIZED', message: 'User not found.' };
    }
    if (user.role === 'SUPER_ADMIN') {
        return { allowed: true, usedGB: 0, limitGB: Infinity, remainingGB: Infinity };
    }

    const storageStats = await getUserStorageUsage(userId, targetWorkspace);
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
export const checkCaseCreationAccess = async (userId, targetWorkspace) => {
    const user = await User.findById(userId);
    if (!user) {
        return { allowed: false, code: 'UNAUTHORIZED', message: 'User not found.' };
    }
    if (user.role === 'SUPER_ADMIN') {
        return { allowed: true, used: 0, limit: Infinity };
    }

    const plan = await resolveActiveUserPlan(user, targetWorkspace);
    const allPlanLimits = await getDynamicPlanLimits();
    const limits = allPlanLimits[plan] || allPlanLimits.FREE;
    const limit = limits.cases;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const usedCount = await Project.countDocuments({ $or: [{ userId }, { userId: userObjId }] });

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
export const getUsageStatus = async (userId, targetWorkspace) => {
    const user = await User.findById(userId);
    if (!user) {
        return { plan: 'FREE', badge: 'FREE', cases: { used: 0, limit: 3, remaining: 3 }, features: {} };
    }

    // Auto-heal/verify role strictly for aditi@uwo24.com and aditilakhera0@gmail.com
    const emailLower = (user.email || '').toLowerCase().trim();
    if (emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com') {
        if (user.role !== 'SUPER_ADMIN') {
            user.role = 'SUPER_ADMIN';
            await user.save();
            console.log(`[Self-Healing] Upgraded ${user.email} to SUPER_ADMIN in getUsageStatus`);
        }
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'admin') {
        user.role = 'user';
        await user.save();
        console.log(`[Self-Healing] Reset non-aditi account ${user.email} to user role`);
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

    const plan = await resolveActiveUserPlan(user, targetWorkspace);
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
        const normKey = normalizeFeatureKey(r.feature);
        usageMap[normKey] = (usageMap[normKey] || 0) + (r.usedCount || 0);
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
