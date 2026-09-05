import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import CreditLog from '../models/CreditLog.js';
import FeatureCredit from '../models/FeatureCredit.js';

let featureCostCache = {};

export const refreshFeatureCostCache = async () => {
    try {
        const features = await FeatureCredit.find({});
        const newCache = {};
        features.forEach(f => {
            newCache[f.featureKey] = f.cost;
        });

        // Retain Video Multipliers manually since they are matrix-based
        newCache['video_multipliers'] = {
            "veo-3.1-fast-generate-001": { "4k": newCache['video_veo_fast_4k'] || 585, "default": newCache['video_veo_fast_def'] || 250 },
            "veo-3.1-generate-001": { "4k": newCache['video_veo_pro_4k'] || 666, "default": newCache['video_veo_pro_def'] || 333 }
        };

        if (Object.keys(newCache).length > 2) {
            featureCostCache = newCache;
        }
    } catch (e) {
        console.error("Failed to load Feature Credits into cache");
    }
};

// Start cache asynchronously
refreshFeatureCostCache();

export const getToolCost = (toolName, body = {}) => {
    // Merge hardcoded defaults with DB costs to ensure new features work
    const defaults = {
        chat: 2, 
        web_search: 20, // Reduced from 60 (GCP search grounding cost ~₹0.45 -> ~7x profit)
        deep_search: 50, // Reduced from 85 (GCP Gemini Pro cost ~₹1.50 -> ~5x profit)
        agent_chat: 25, 
        realtime_chat: 25, // Reduced from 60 (GCP Speech + Gemini cost ~₹0.80 -> ~5x profit)
        knowledge_base: 3, 
        generate_image: 74,
        generate_image_hd: 110, 
        generate_image_ultra: 145,
        ai_ads_agent: 241,
        edit_image: 74,
        gemini_flash: 19,
        activate_strategy: 30, // Reduced from 60
        brand_setup: 0,
        generate_content: 5,
        regenerate_content: 2,
        video_multipliers: { "veo-3.1-fast-generate-001": { "4k": 585, "default": 250 }, "veo-3.1-generate-001": { "4k": 666, "default": 333 } },
        code_writer: 3, 
        convert_audio: 45, // Reduced from 90
        document_convert: 3, 
        legal_toolkit: 0, 
        ai_cashflow: 5
    };

    const featureCosts = { ...defaults, ...featureCostCache };

    if (toolName === 'chat') {
        return featureCosts.chat;
    }

    const normalizedTool = typeof toolName === 'string' ? toolName.toLowerCase() : toolName;
    if (normalizedTool === 'deep_search' || normalizedTool === 'web_search' || normalizedTool === 'code_writer') {
        return featureCosts[normalizedTool] || defaults[normalizedTool] || 0;
    }
    if (normalizedTool === 'convert_document' || normalizedTool === 'document_convert') {
        return featureCosts.document_convert || defaults.document_convert || 0;
    }

    if (toolName === 'generate_video') {
        const duration = body?.duration || 5;
        const modelId = body?.modelId || 'veo-3.1-fast-generate-001';
        const resolution = body?.resolution || '1080p';
        const videoMults = featureCosts.video_multipliers || defaults.video_multipliers;
        const modelMult = videoMults[modelId] || videoMults['veo-3.1-fast-generate-001'] || { "4k": 585, "default": 250 };
        const multiplier = resolution === '4k' ? (modelMult['4k'] || 585) : (modelMult['default'] || 250);
        return multiplier * duration;
    }

    if (normalizedTool === 'ai_ads_agent') {
        const baseCost = featureCosts.ai_ads_agent !== undefined ? featureCosts.ai_ads_agent : (defaults.ai_ads_agent || 241);
        if (body?.postFormat === 'carousel') {
            // Charge exactly for the number of slides selected (2, 3, or 4)
            const slideCount = Math.min(Math.max(parseInt(body?.carouselCount) || 3, 2), 4);
            return baseCost * slideCount;
        }
        return baseCost;
    }

    return featureCosts[toolName] !== undefined ? featureCosts[toolName] : (defaults[toolName] || 0);
};

const getToolLabel = (toolName) => {
    switch ((toolName || '').toLowerCase()) {
        case 'chat': return 'AI LEGAL™ Chat (Text)';
        case 'agent_chat': return 'AI LEGAL™ Agent Chat';
        case 'realtime_chat': return 'AI LEGAL™ Realtime Chat';
        case 'knowledge_base': return 'AI LEGAL™ Knowledge Base';
        case 'web_search': return 'AI LEGAL™ Web Search';
        case 'deep_search': return 'AI LEGAL™ Deep Search';
        case 'generate_image_hd': return 'AI LEGAL™ Image HD';
        case 'generate_image_ultra': return 'AI LEGAL™ Image Ultra';
        case 'generate_image': return 'AI LEGAL™ Image';
        case 'edit_image': return 'AI LEGAL™ Edit Image';
        case 'generate_video': return 'AI LEGAL™ Video Generation';
        case 'code_writer': return 'AI LEGAL™ Code Writer';
        case 'convert_document': return 'AI LEGAL™ Document Analysis';
        case 'legal_toolkit': return 'AI LEGAL™ Legal Intelligence';
        case 'ai_cashflow': return 'AI LEGAL™ CashFlow Explorer';
        case 'ai_ads_agent': return 'AI Ads Agent (Visual Post)';
        case 'gemini_flash': return 'AI Ads Agent (Website Scrapping)';
        case 'activate_strategy': return 'AI Ads Agent (30-Day Strategy)';
        case 'generate_content': return 'AI Ads Agent (Content Generation)';
        case 'regenerate_content': return 'AI Ads Agent (Content Refresh)';
        default: return 'AI LEGAL™ Service';
    }
};

const premiumTools = [
    'generate_video'
];

export const checkPremiumAccess = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return false;
    if (user.founderStatus) return true;

    const sub = await Subscription.findOne({
        userId,
        subscriptionStatus: 'active'
    }).populate('planId');

    if (sub && sub.planId && (sub.planId.priceMonthly > 0 || sub.planId.priceYearly > 0)) {
        return true;
    }
    return false;
};

export const subscriptionService = {
    checkCredits: async (userId, toolsRequested = [], metadata = {}) => {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        const hasPremiumTool = toolsRequested.some(tool => premiumTools.includes(tool));
        if (hasPremiumTool) {
            const hasAccess = await checkPremiumAccess(userId);
            if (!hasAccess) {
                throw new Error("PREMIUM_RESTRICTED");
            }
        }

        const isAdmin = user.role === 'admin' || (user.email && user.email.toLowerCase() === 'admin@uwo24.com');
        if (isAdmin) return true;

        const totalCost = toolsRequested.reduce((acc, tool) => acc + getToolCost(tool, metadata), 0);
        if ((user.credits || 0) < totalCost) {
            throw new Error("Insufficient credits");
        }
        return true;
    },

    deductCredits: async (userId, toolsUsed = [], sessionId, metadata = {}) => {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        const isAdmin = user.role === 'admin' || (user.email && user.email.toLowerCase() === 'admin@uwo24.com');
        if (isAdmin) return true;

        const totalCost = toolsUsed.reduce((acc, tool) => acc + getToolCost(tool, metadata), 0);

        if ((user.credits || 0) < totalCost) {
            throw new Error("Insufficient credits");
        }

        if (totalCost > 0) {
            user.credits -= totalCost;
            await user.save();
        }

        // 📝 Log to Database - Find the most descriptive tool for the label
        try {
            // Pick a magic tool over 'chat' if multiple exist
            const nonChatTools = toolsUsed.filter(t => t !== 'chat');
            const primaryTool = nonChatTools.length > 0 ? nonChatTools[0] : toolsUsed[0];
            const otherToolsCount = toolsUsed.length > 1 ? toolsUsed.length - 1 : 0;

            await CreditLog.create({
                userId: user._id,
                action: primaryTool,
                description: getToolLabel(primaryTool) + (otherToolsCount > 0 ? ` (+${otherToolsCount} more)` : ''),
                credits: -totalCost,
                balanceAfter: user.credits
            });
        } catch (logErr) {
            console.error('CreditLog save failed in subscriptionService:', logErr.message);
        }

        return true;
    },

    deductCreditsFromMeta: async (creditMeta) => {
        if (!creditMeta || !creditMeta.userId || !creditMeta.cost || creditMeta.cost <= 0) {
            return true;
        }

        const user = await User.findById(creditMeta.userId);
        if (!user) throw new Error("User not found during credit deduction");

        user.credits -= creditMeta.cost;
        await user.save();

        // 📝 Log to Database
        try {
            console.log(`[CreditSystem] Deducting ${creditMeta.cost} for ${creditMeta.action} from user ${user._id}`);
            await CreditLog.create({
                userId: user._id,
                action: creditMeta.action || 'feature_usage',
                description: creditMeta.description || 'AISA Magic Feature',
                credits: -creditMeta.cost,
                balanceAfter: user.credits
            });
            console.log(`[CreditSystem] Log created successfully. New balance: ${user.credits}`);
        } catch (logErr) {
            console.error('CreditLog save failed in deductCreditsFromMeta:', logErr.message);
        }

        // 📝 Record Stock Tab Unlock
        if (creditMeta.tabName && creditMeta.symbol) {
            try {
                const UnlockedStockTab = (await import('../models/UnlockedStockTab.js')).default;
                await UnlockedStockTab.findOneAndUpdate(
                    {
                        userId: creditMeta.userId,
                        symbol: creditMeta.symbol.toUpperCase().trim(),
                        tab: creditMeta.tabName
                    },
                    { createdAt: new Date() },
                    { upsert: true, new: true }
                );
                console.log(`[CreditSystem] Marked tab '${creditMeta.tabName}' as unlocked for stock ${creditMeta.symbol} (User: ${creditMeta.userId})`);
            } catch (err) {
                console.error(`[CreditSystem] Failed to save unlocked stock tab:`, err.message);
            }
        }

        return true;
    },

    checkLimit: async () => ({ usage: 0, usageKey: 'mock' }),
    incrementUsage: () => { }
};

