import Subscription from '../models/Subscription.js';
import SubscriptionItem from '../models/SubscriptionItem.js';
import UsageLedger from '../models/UsageLedger.js';
import User from '../models/User.js';
import Project from '../models/Project.js'; // Cases model

// Master Entitlement Configuration for all Workspaces & Tiers
export const PLAN_ENTITLEMENT_MAP = {
  // Advocate Workspace Plans
  advocate: {
    FREE: {
      activeCases: 3,
      storage: 1024, // 1 GB
      aiChatLimit: 50,
      draftMakerLimit: 2,
      precedentLimit: 2,
      evidenceLimit: 2,
      contractLimit: 2,
      strategyLimit: 2,
      predictorLimit: 2,
      mockCourtLimit: 1,
      clientConnectLimit: 1,
      aiCaseAnalysisLimit: 2,
      knowledgeHubLimit: 3,
    },
    BASIC: {
      activeCases: 50,
      storage: 5120, // 5 GB
      aiChatLimit: 300,
      draftMakerLimit: 5,
      precedentLimit: 5,
      evidenceLimit: 5,
      contractLimit: 5,
      strategyLimit: 5,
      predictorLimit: 5,
      mockCourtLimit: 2,
      clientConnectLimit: 2,
      aiCaseAnalysisLimit: 5,
    },
    PROFESSIONAL: {
      activeCases: 100,
      storage: 20480, // 20 GB
      aiChatLimit: 1000,
      draftMakerLimit: 15,
      precedentLimit: 15,
      evidenceLimit: 15,
      contractLimit: 15,
      strategyLimit: 15,
      predictorLimit: 15,
      mockCourtLimit: 5,
      clientConnectLimit: 5,
      aiCaseAnalysisLimit: 15,
    },
    PREMIUM: {
      activeCases: 250,
      storage: 102400, // 100 GB
      aiChatLimit: -1, // Unlimited
      draftMakerLimit: -1, // Unlimited (Fair Usage Policy: 500/mo)
      precedentLimit: -1,
      evidenceLimit: -1,
      contractLimit: -1,
      strategyLimit: -1,
      predictorLimit: -1,
      mockCourtLimit: 15,
      clientConnectLimit: 20,
      aiCaseAnalysisLimit: -1,
    },
  },

  // Student Workspace Plans
  student: {
    FREE: {
      activeCases: 3,
      storage: 500, // 500 MB
      aiChatLimit: 50,
      draftMakerLimit: 1,
      precedentLimit: 1,
      evidenceLimit: 1,
      contractLimit: 1,
      strategyLimit: 0,
      predictorLimit: 0,
      mockCourtLimit: 0,
      clientConnectLimit: 0,
      aiCaseAnalysisLimit: 1,
      quizLimit: 2,
      notesMakerLimit: 0,
    },
    BASIC: {
      activeCases: 25,
      storage: 5120, // 5 GB
      aiChatLimit: 300,
      draftMakerLimit: 5,
      precedentLimit: 5,
      evidenceLimit: 5,
      contractLimit: 5,
      strategyLimit: 5,
      predictorLimit: 5,
      mockCourtLimit: 2,
      clientConnectLimit: 0,
      aiCaseAnalysisLimit: 5,
      quizLimit: -1, // Unlimited
      notesMakerLimit: 5,
    },
    PROFESSIONAL: {
      activeCases: 50,
      storage: 20480, // 20 GB
      aiChatLimit: 1000,
      draftMakerLimit: 15,
      precedentLimit: 15,
      evidenceLimit: 15,
      contractLimit: 15,
      strategyLimit: 15,
      predictorLimit: 15,
      mockCourtLimit: 5,
      clientConnectLimit: 0,
      aiCaseAnalysisLimit: 15,
      quizLimit: -1, // Unlimited
      notesMakerLimit: 15,
    },
    PREMIUM: {
      activeCases: 100,
      storage: 51200, // 50 GB
      aiChatLimit: -1,
      draftMakerLimit: -1,
      precedentLimit: -1,
      evidenceLimit: -1,
      contractLimit: -1,
      strategyLimit: -1,
      predictorLimit: -1,
      mockCourtLimit: 15,
      clientConnectLimit: 0,
      aiCaseAnalysisLimit: -1,
      quizLimit: -1, // Unlimited
      notesMakerLimit: -1, // Unlimited
    },
  },

  // Law Firm Workspace Plans
  lawfirm: {
    FREE: {
      teamMembers: 1,
      activeCases: 3,
      storage: 500, // 500 MB
      aiChatLimit: 50,
      draftMakerLimit: 1,
      precedentLimit: 1,
      evidenceLimit: 0,
      contractLimit: 1,
      strategyLimit: 0,
      predictorLimit: 0,
      mockCourtLimit: 0,
      clientConnectLimit: 0,
      aiCaseAnalysisLimit: 1,
    },
    BASIC: {
      teamMembers: 10,
      activeCases: 100,
      storage: 25600, // 25 GB Shared Storage
      aiChatLimit: 1500,
      draftMakerLimit: 30,
      precedentLimit: 30,
      evidenceLimit: 30,
      contractLimit: 30,
      strategyLimit: 30,
      predictorLimit: 30,
      mockCourtLimit: 10,
      clientConnectLimit: 10,
      aiCaseAnalysisLimit: 30,
    },
    PROFESSIONAL: {
      teamMembers: 25,
      activeCases: 250,
      storage: 102400, // 100 GB Shared Storage
      aiChatLimit: 3500,
      draftMakerLimit: 100,
      precedentLimit: 100,
      evidenceLimit: 100,
      contractLimit: 100,
      strategyLimit: 100,
      predictorLimit: 100,
      mockCourtLimit: 25,
      clientConnectLimit: 25,
      aiCaseAnalysisLimit: 100,
    },
    PREMIUM: {
      teamMembers: 50,
      activeCases: 500,
      storage: 512000, // 500 GB Shared Storage
      aiChatLimit: -1,
      draftMakerLimit: -1,
      precedentLimit: -1,
      evidenceLimit: -1,
      contractLimit: -1,
      strategyLimit: -1,
      predictorLimit: -1,
      mockCourtLimit: 50,
      clientConnectLimit: 50,
      aiCaseAnalysisLimit: -1,
    },
  },
};

const FAIR_USAGE_POLICY_LIMIT = 500; // Ceiling per tool per month for 'Unlimited' plans

export class EntitlementService {
  /**
   * Helper to map tool names to SubscriptionItem fields
   */
  static getToolLimitField(toolName) {
    const t = (toolName || '').toLowerCase();
    if (t.includes('chat') || t.includes('tutor') || t.includes('assistant') || t.includes('copilot')) return 'aiChatLimit';
    if (t.includes('draft')) return 'draftMakerLimit';
    if (t.includes('precedent') || t.includes('research')) return 'precedentLimit';
    if (t.includes('evidence')) return 'evidenceLimit';
    if (t.includes('contract')) return 'contractLimit';
    if (t.includes('strategy')) return 'strategyLimit';
    if (t.includes('predict')) return 'predictorLimit';
    if (t.includes('court') || t.includes('mock')) return 'mockCourtLimit';
    if (t.includes('client')) return 'clientConnectLimit';
    return 'aiCaseAnalysisLimit';
  }

  /**
   * Fetch active subscription & entitlements for a given account and workspace
   */
  static async getEntitlements(userId, targetWorkspace = 'advocate') {
    const ws = (targetWorkspace || 'advocate').toLowerCase().replace('law_firm', 'lawfirm');
    const user = await User.findById(userId);

    // Active subscription for THIS workspace or COMBO workspace
    const activeSub = await Subscription.findOne({
      accountId: userId,
      status: { $in: ['active', 'Active'] },
      expiryDate: { $gt: new Date() },
      $or: [
        { workspace: ws },
        { workspace: 'combo' },
        { workspace: 'all' },
        { tier: { $regex: /combo/i } }
      ]
    }).sort({ createdAt: -1 });

    let activeTier = 'FREE';
    if (activeSub) {
      activeTier = activeSub.tier || 'FREE';
    } else if (user && user.subscription && (user.subscription.status || '').toLowerCase() === 'active') {
      const userWs = (user.subscription.workspace || '').toLowerCase().replace('law_firm', 'lawfirm');
      const userPlan = (user.subscription.plan || '').toLowerCase();
      if (userWs === ws || userWs === 'combo' || userWs === 'all' || userPlan.includes('combo')) {
        activeTier = user.subscription.plan || 'FREE';
      }
    }

    let normTier = (activeTier || 'FREE').toUpperCase();
    if (normTier.includes('ENTERPRISE') || normTier.includes('FIRM') || normTier.includes('COMBO')) {
      normTier = 'PREMIUM'; // High tier for Firm/Combo
    } else if (normTier.includes('PREMIUM') || normTier.includes('PROFESSIONAL') || normTier.includes('ADVOCATE_PRO') || normTier.includes('STUDENT_PRO')) {
      normTier = 'PROFESSIONAL';
    } else if (normTier.includes('BASIC') || normTier.includes('PRO') || normTier.includes('ADVOCATE_BASIC') || normTier.includes('STUDENT_BASIC')) {
      normTier = 'BASIC';
    } else {
      normTier = 'FREE';
    }

    // Fetch matching SubscriptionItem for target workspace
    let subItem = null;
    if (activeSub) {
      subItem = await SubscriptionItem.findOne({
        subscriptionId: activeSub._id,
        workspace: ws,
      });
    }

    // Fallback to default limits if no custom item exists
    const defaultLimits = PLAN_ENTITLEMENT_MAP[ws]?.[normTier] || PLAN_ENTITLEMENT_MAP[ws]?.FREE || PLAN_ENTITLEMENT_MAP.advocate.FREE;
    const limits = subItem
      ? {
          activeCases: subItem.activeCases,
          storage: subItem.storage,
          draftMakerLimit: subItem.draftMakerLimit,
          precedentLimit: subItem.precedentLimit,
          evidenceLimit: subItem.evidenceLimit,
          contractLimit: subItem.contractLimit,
          strategyLimit: subItem.strategyLimit,
          predictorLimit: subItem.predictorLimit,
          mockCourtLimit: subItem.mockCourtLimit,
          clientConnectLimit: subItem.clientConnectLimit,
          aiCaseAnalysisLimit: subItem.aiCaseAnalysisLimit,
        }
      : defaultLimits;

    // Fetch tool usage ledger for this account & workspace
    const ledgerEntries = await UsageLedger.find({ accountId: userId, workspace: ws });
    const usageMap = {};
    ledgerEntries.forEach((entry) => {
      usageMap[entry.tool] = entry.usage;
    });

    // Count Active Running Cases (excluding completed cases)
    const activeCasesCount = await Project.countDocuments({
      userId,
      workspaceType: ws,
      status: { $nin: ['completed', 'archived_done', 'CLOSED'] },
    });

    return {
      userId,
      workspace: ws,
      tier: activeTier,
      isSubscribed: activeSub ? true : false,
      subscription: activeSub,
      limits,
      usage: usageMap,
      cases: {
        activeCount: activeCasesCount,
        limit: limits.activeCases,
        remaining: Math.max(0, limits.activeCases - activeCasesCount),
      },
      storage: {
        limitMB: limits.storage,
        usedMB: user?.storageUsed?.[ws] || 0,
        remainingMB: Math.max(0, limits.storage - (user?.storageUsed?.[ws] || 0)),
      },
    };
  }

  /**
   * Check feature gating before executing AI tool
   */
  static async checkFeatureAccess(userId, workspace = 'advocate', toolName) {
    const ws = workspace.toLowerCase();
    const entitlements = await this.getEntitlements(userId, ws);
    const limitField = this.getToolLimitField(toolName);
    const rawLimit = entitlements.limits[limitField] ?? 5;
    const currentUsage = entitlements.usage[toolName] || 0;

    // Unlimited Plan Handling (Fair Usage Policy)
    if (rawLimit === -1) {
      if (currentUsage >= FAIR_USAGE_POLICY_LIMIT) {
        return {
          allowed: false,
          remaining: 0,
          limit: FAIR_USAGE_POLICY_LIMIT,
          usage: currentUsage,
          reason: 'FAIR_USAGE_POLICY_EXCEEDED',
          message: 'Fair usage policy limit reached for this billing cycle.',
        };
      }
      return {
        allowed: true,
        remaining: FAIR_USAGE_POLICY_LIMIT - currentUsage,
        limit: 'Unlimited (Fair Usage Policy)',
        usage: currentUsage,
      };
    }

    if (currentUsage >= rawLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: rawLimit,
        usage: currentUsage,
        reason: 'LIMIT_REACHED',
        message: `Limit reached for ${toolName} (${currentUsage}/${rawLimit}). Please upgrade your plan.`,
      };
    }

    return {
      allowed: true,
      remaining: rawLimit - currentUsage,
      limit: rawLimit,
      usage: currentUsage,
    };
  }

  /**
   * Record tool usage in UsageLedger
   */
  static async recordToolUsage(userId, workspace = 'advocate', toolName) {
    const ws = workspace.toLowerCase();
    const ledger = await UsageLedger.findOneAndUpdate(
      { accountId: userId, workspace: ws, tool: toolName },
      { $inc: { usage: 1 }, $set: { lastReset: new Date() } },
      { upsert: true, new: true }
    );
    return ledger;
  }

  /**
   * Check Active Running Cases Limit before creating a case
   */
  static async checkCaseCreationAccess(userId, workspace = 'advocate') {
    const ws = workspace.toLowerCase();
    const entitlements = await this.getEntitlements(userId, ws);
    const activeCount = entitlements.cases.activeCount;
    const limit = entitlements.cases.limit;

    if (activeCount >= limit) {
      return {
        allowed: false,
        activeCount,
        limit,
        message: `Active cases limit reached (${activeCount}/${limit}). Completed cases do not count. Please upgrade your plan to create more cases.`,
      };
    }

    return { allowed: true, activeCount, limit };
  }

  /**
   * Check Storage Capacity before file upload
   */
  static async checkStorageAccess(userId, workspace = 'advocate', fileSizeBytes = 0) {
    const ws = workspace.toLowerCase();
    const entitlements = await this.getEntitlements(userId, ws);
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const projectedUsed = entitlements.storage.usedMB + fileSizeMB;

    if (projectedUsed > entitlements.storage.limitMB) {
      return {
        allowed: false,
        usedMB: entitlements.storage.usedMB,
        limitMB: entitlements.storage.limitMB,
        message: `Storage capacity full (${entitlements.storage.usedMB.toFixed(1)} MB / ${entitlements.storage.limitMB} MB). Please upgrade your plan for additional storage.`,
      };
    }

    return { allowed: true, usedMB: entitlements.storage.usedMB, limitMB: entitlements.storage.limitMB };
  }

  /**
   * Create Subscription & SubscriptionItem(s) when payment is verified
   */
  static async createSubscriptionRecords({ accountId, planId, billingCycle, amount, paymentId, orderId, invoiceId }) {
    // Determine target workspace and tier from planId string
    let ws = 'advocate';
    let tier = 'BASIC';
    let billingType = 'individual';

    if (planId.includes('student')) {
      ws = 'student';
    } else if (planId.includes('firm')) {
      ws = 'lawfirm';
      billingType = 'firm';
    } else if (planId.includes('combo')) {
      ws = 'combo';
      billingType = 'bundle';
    }

    if (planId.includes('pro')) {
      tier = 'PROFESSIONAL';
    } else if (planId.includes('premium') || planId.includes('enterprise')) {
      tier = 'PREMIUM';
    } else {
      tier = 'BASIC';
    }

    // Expiry Calculation
    const startDate = new Date();
    const expiryDate = new Date();
    if (billingCycle === 'yearly') {
      expiryDate.setMonth(expiryDate.getMonth() + 12);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    // Deactivate previous active subscriptions
    await Subscription.updateMany({ accountId, status: 'active' }, { status: 'cancelled' });

    // Create Subscription Document
    const subscription = await Subscription.create({
      accountId,
      workspace: ws,
      tier,
      billingType,
      billingCycle,
      amount,
      status: 'active',
      paymentId,
      orderId,
      invoiceId,
      startDate,
      expiryDate,
      autoRenew: true,
    });

    // Create SubscriptionItem Document(s)
    if (ws === 'combo') {
      // COMBO PLANS: Create isolated items per workspace!
      if (planId.includes('student_advocate')) {
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'student',
          tier: 'BASIC',
          ...PLAN_ENTITLEMENT_MAP.student.BASIC,
        });
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'advocate',
          tier: 'BASIC',
          ...PLAN_ENTITLEMENT_MAP.advocate.BASIC,
        });
      } else if (planId.includes('advocate_firm')) {
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'advocate',
          tier: 'PROFESSIONAL',
          ...PLAN_ENTITLEMENT_MAP.advocate.PROFESSIONAL,
        });
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'lawfirm',
          tier: 'BASIC',
          ...PLAN_ENTITLEMENT_MAP.lawfirm.BASIC,
        });
      } else {
        // ALL ACCESS COMBO
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'student',
          tier: 'PREMIUM',
          ...PLAN_ENTITLEMENT_MAP.student.PREMIUM,
        });
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'advocate',
          tier: 'PREMIUM',
          ...PLAN_ENTITLEMENT_MAP.advocate.PREMIUM,
        });
        await SubscriptionItem.create({
          subscriptionId: subscription._id,
          accountId,
          workspace: 'lawfirm',
          tier: 'PREMIUM',
          ...PLAN_ENTITLEMENT_MAP.lawfirm.PREMIUM,
        });
      }
    } else {
      // SINGLE WORKSPACE PLAN
      const limits = PLAN_ENTITLEMENT_MAP[ws]?.[tier] || PLAN_ENTITLEMENT_MAP.advocate.BASIC;
      await SubscriptionItem.create({
        subscriptionId: subscription._id,
        accountId,
        workspace: ws,
        tier,
        ...limits,
      });
    }

    // Reset Usage Ledgers for newly activated subscription
    await UsageLedger.deleteMany({ accountId });

    return subscription;
  }
}
