import * as FeatureAccessManager from '../services/featureAccessManager.js';

/**
 * Express middleware to verify feature access before request execution.
 * Attaches req.commitUsage() hook to charge usage ONLY upon successful completion.
 */
export const verifyFeatureAccess = (featureKey) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id || req.user._id;

            // Attach no-op commitUsage by default
            req.commitUsage = async () => {};

            // SUPER_ADMIN: Unlimited access — skip all feature limit checks
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // General chat or non-quota endpoints
            if (featureKey === 'chat' || featureKey === 'legal_my_case') {
                return next();
            }

            const workspace = req.query.workspace || req.body?.workspace || req.headers['x-workspace-type'] || req.headers['x-workspace-id'] || req.headers['x-active-workspace-id'] || 'advocate';
            const access = await FeatureAccessManager.checkAccess(userId, featureKey, workspace);
            if (!access.allowed) {
                const formattedFeature = featureKey.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
                return res.status(403).json({
                    success: false,
                    code: "LIMIT_EXCEEDED",
                    title: "Usage Limit Reached",
                    feature: featureKey,
                    message: `You have used all ${access.limit} ${formattedFeature} generations included in your ${access.plan} Plan. Upgrade your subscription to continue.`
                });
            }

            // Attach commit function to req so controller can charge counter ONLY after successful response
            req.commitUsage = async () => {
                try {
                    await FeatureAccessManager.incrementUsage(userId, featureKey);
                } catch (err) {
                    console.error('[commitUsage Error]', err);
                }
            };

            next();
        } catch (err) {
            console.error('[verifyFeatureAccess Error]', err);
            res.status(500).json({ success: false, code: "SERVER_ERROR", message: 'Failed to verify subscription access' });
        }
    };
};

/**
 * Express middleware to verify file storage limits before upload
 */
export const verifyStorageAccess = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const incomingBytes = req.headers['content-length'] ? Number(req.headers['content-length']) : 0;
        const workspace = req.query.workspace || req.body?.workspace || req.headers['x-workspace-type'] || req.headers['x-workspace-id'] || req.headers['x-active-workspace-id'] || 'advocate';

        const check = await FeatureAccessManager.checkStorageAccess(userId, incomingBytes, workspace);
        if (!check.allowed) {
            return res.status(403).json({
                success: false,
                code: check.code || "STORAGE_FULL",
                title: check.title || "Storage Full",
                message: check.message,
                storage: check.storage
            });
        }
        next();
    } catch (err) {
        console.error('[verifyStorageAccess Error]', err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: 'Failed to verify storage access' });
    }
};

/**
 * Express middleware to verify matter/case creation limit before project insertion
 */
export const verifyMatterCreationAccess = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const workspace = req.query.workspace || req.body?.workspace || req.headers['x-workspace-type'] || req.headers['x-workspace-id'] || req.headers['x-active-workspace-id'] || 'advocate';

        const check = await FeatureAccessManager.checkCaseCreationAccess(userId, workspace);
        if (!check.allowed) {
            return res.status(403).json({
                success: false,
                code: check.code || "MATTER_LIMIT_EXCEEDED",
                title: check.title || "Matter Limit Reached",
                message: check.message,
                used: check.used,
                limit: check.limit
            });
        }
        next();
    } catch (err) {
        console.error('[verifyMatterCreationAccess Error]', err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: 'Failed to verify matter creation limit' });
    }
};

/**
 * Direct check helper for non-express or direct service calls
 */
export const checkFeatureSubscription = async (user, activeTool) => {
    // SUPER_ADMIN: Unlimited access — skip all subscription checks
    if (user.role === 'SUPER_ADMIN') {
        return { success: true };
    }

    if (activeTool === 'chat' || activeTool === 'legal_my_case') {
        return { success: true };
    }

    try {
        const access = await FeatureAccessManager.checkAccess(user._id, activeTool);
        if (!access.allowed) {
            return {
                success: false,
                code: "LIMIT_EXCEEDED",
                title: "Usage Limit Reached",
                feature: activeTool,
                message: `You have used all ${access.limit} ${activeTool.replace(/_/g, ' ')} generations included in your ${access.plan} Plan. Upgrade your subscription to continue.`
            };
        }

        return { success: true, commitUsage: async () => await FeatureAccessManager.incrementUsage(user._id, activeTool) };
    } catch (err) {
        console.error('[checkFeatureSubscription Error]', err);
        return { success: false, code: "VERIFICATION_FAILED", message: "Failed to check subscription limits." };
    }
};
