import User from '../models/User.js';
import { verifyToken } from './authorization.js';
import { checkPremiumAccess } from '../services/subscriptionService.js';
import Subscription from '../models/Subscription.js';
import CreditLog from '../models/CreditLog.js';

// Returns true if user has any paid/active subscription or founder status
export const isFreeTierUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return true;
    // SUPER_ADMIN: Never treat as free tier
    if (user.role === 'SUPER_ADMIN' || user.role === 'admin') return false;
    if (user.email && user.email.toLowerCase() === 'admin@uwo24.com') return false;
    if (user.founderStatus) return false;

    const sub = await Subscription.findOne({
        userId,
        subscriptionStatus: 'active'
    }).populate('planId');

    if (!sub || !sub.planId) return true;
    return sub.planId.priceMonthly === 0 && sub.planId.priceYearly === 0;
};

// Map URL → human-readable action label
const getActionLabel = (url, body) => {
    if (url.includes('/api/chat/realtime')) return { action: 'realtime_chat', description: 'AI LEGAL Realtime Chat' };
    if (url.includes('/api/aibase/knowledge')) return { action: 'knowledge_base', description: 'AI LEGAL Knowledge Base' };
    if (url.includes('/api/aibase/chat')) return { action: 'agent_chat', description: 'AI LEGAL Agent Chat' };
    if (url.includes('/api/chat')) {
        const mode = body?.mode || '';
        if (mode === 'web_search') return { action: 'web_search', description: 'AI LEGAL Web Search' };
        if (mode === 'DEEP_SEARCH') return { action: 'deep_search', description: 'AI LEGAL Deep Search' };
        if (mode === 'DOCUMENT_CONVERT') return { action: 'document_convert', description: 'AI LEGAL Document Magic' };
        return { action: 'chat', description: 'AI LEGAL Chat (Text)' };
    }
    if (url.includes('/api/voice')) return { action: 'convert_audio', description: 'AI LEGAL Audio Magic' };
    if (url.includes('/api/knowledge/upload') || url.includes('/api/knowledge/upload-url')) return { action: 'knowledge_base', description: 'AI LEGAL Knowledge Base' };
    if (url.includes('/api/legal-toolkit')) return { action: 'legal_toolkit', description: 'AI LEGAL AI Legal' };
    return { action: 'other', description: 'AI LEGAL Feature' };
};

// In-memory cache to prevent duplicate charges within a short window (e.g. 3 seconds)
const recentRequests = new Map();

export const creditMiddleware = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized access" });
    }

    const url = req.originalUrl || req.url;
    const basePath = url.split('?')[0];
    const actionLabel = getActionLabel(url, req.body);
    const action = actionLabel.action;
    const symbol = req.query?.symbol || req.body?.symbol || '';
    const userId = req.user.id || req.user._id;

    const dedupKey = `${userId}:${action}:${basePath}:${symbol}`;

    // Clean up cache periodically (very simple)
    if (recentRequests.size > 2000) recentRequests.clear();

    const lastRequestTime = recentRequests.get(dedupKey);
    const now = Date.now();

    if (lastRequestTime && (now - lastRequestTime < 3000)) {
        console.log(`[CreditSystem] Deduplication triggered for ${dedupKey}. Skipping double charge.`);
        req.creditMeta = null; // Signal to controllers to skip deduction
        return next();
    }

    // Update timestamp for this request
    recentRequests.set(dedupKey, now);

    let cost = 0;
    let isPremiumEndpoint = false;

    // Admins and Super Admins bypass all credit checks
    const userRec = await User.findById(req.user.id || req.user._id);
    const isAdmin = (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'admin' || (req.user.email && req.user.email.toLowerCase() === 'admin@uwo24.com'))) ||
        (userRec && (userRec.role === 'SUPER_ADMIN' || userRec.role === 'admin' || (userRec.email && userRec.email.toLowerCase() === 'admin@uwo24.com')));

    // SUPER_ADMIN: Skip all credit processing immediately
    if (isAdmin && (req.user?.role === 'SUPER_ADMIN' || userRec?.role === 'SUPER_ADMIN')) {
        req.creditMeta = null;
        return next();
    }

    let calculatedCost = 0;

    try {
        const { getToolCost } = await import('../services/subscriptionService.js');
        if (action === 'chat') {
            const mode = req.body?.mode || '';
            if (mode && mode !== 'NORMAL_CHAT') {
                calculatedCost = getToolCost(mode, req.body);
            } else {
                calculatedCost = getToolCost('chat', req.body);
            }
        } else {
            calculatedCost = getToolCost(action, req.body);
        }
    } catch (e) {
        calculatedCost = action === 'chat' ? 2 : 50;
    }

    cost = calculatedCost;

    // Define explicitly which actions are premium-only (Free tier cannot access them regardless of credits)
    const premiumActions = [];

    if (premiumActions.includes(action)) {
        isPremiumEndpoint = true;
    }

    // Pass through if cost is still 0 
    if (cost === 0) return next();

    try {
        if (isPremiumEndpoint && !isAdmin) {
            const hasAccess = await checkPremiumAccess(req.user.id || req.user._id);
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    code: "PREMIUM_ONLY",
                    error: "This feature is not available in the free plan. Please upgrade your plan to access premium magic tools.",
                    message: "This feature is not available in the free plan. Please upgrade your plan to access premium magic tools."
                });
            }
        }

        const user = userRec || await User.findById(req.user.id || req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (!isAdmin && user.credits < cost) {
            return res.status(403).json({
                error: "Insufficient credits",
                code: "OUT_OF_CREDITS",
                required: cost,
                available: user.credits
            });
        }

        // 🚀 ATTACH BALANCE INFO TO REQ
        // Deduction now happens in controllers ONLY on successful output
        req.creditMeta = {
            userId: user._id,
            cost: cost,
            action: actionLabel.action,
            description: actionLabel.description,
            symbol: symbol,
            tabName: null
        };

        next();
    } catch (error) {
        console.error("Credit deduction failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
