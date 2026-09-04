import { EntitlementService } from '../services/entitlementService.js';

/**
 * Middleware to enforce feature gating on AI tool endpoints
 */
export const enforceEntitlement = (toolName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Authentication token required.' });
      }

      const workspace = req.headers['x-workspace-type'] || req.query.workspace || req.body.workspace || 'advocate';
      const access = await EntitlementService.checkFeatureAccess(userId, workspace, toolName);

      if (!access.allowed) {
        return res.status(403).json({
          success: false,
          code: access.reason || 'LIMIT_REACHED',
          message: access.message || `Limit reached for ${toolName}. Upgrade to Professional to continue.`,
          tool: toolName,
          workspace,
          upgradeRequired: true,
          limit: access.limit,
          usage: access.usage,
        });
      }

      // Record tool usage upon successful entitlement verification
      await EntitlementService.recordToolUsage(userId, workspace, toolName);
      next();
    } catch (err) {
      console.error(`[enforceEntitlement] Error checking ${toolName}:`, err.message);
      next(); // Continue on error to prevent total system failure if db hiccup
    }
  };
};

/**
 * Middleware to enforce active cases limit before case creation
 */
export const enforceCaseLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const workspace = req.headers['x-workspace-type'] || req.body.workspaceType || req.body.workspace || 'advocate';
    const access = await EntitlementService.checkCaseCreationAccess(userId, workspace);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: 'CASE_LIMIT_REACHED',
        message: access.message,
        upgradeRequired: true,
        activeCount: access.activeCount,
        limit: access.limit,
      });
    }

    next();
  } catch (err) {
    console.error('[enforceCaseLimit] Error:', err.message);
    next();
  }
};

/**
 * Middleware to enforce storage limit before file uploads
 */
export const enforceStorageLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const workspace = req.headers['x-workspace-type'] || req.body.workspace || 'advocate';
    const fileSizeBytes = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;
    const access = await EntitlementService.checkStorageAccess(userId, workspace, fileSizeBytes);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: 'STORAGE_FULL',
        message: access.message,
        upgradeRequired: true,
        usedMB: access.usedMB,
        limitMB: access.limitMB,
      });
    }

    next();
  } catch (err) {
    console.error('[enforceStorageLimit] Error:', err.message);
    next();
  }
};
