import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import AdminSettings from '../models/AdminSettings.js';

// Fallback pricing map if database plan object doesn't contain prices
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
 * Helper function to calculate actual plan price server-side
 */
export async function getPlanPrice(planId, billingCycle = 'monthly') {
  try {
    const dbPlan = await Plan.findOne({
      $or: [
        { planId: planId },
        { id: planId },
        { tier: planId },
        { planName: { $regex: new RegExp((planId || '').replace(/_/g, ' '), 'i') } },
      ],
    }).lean();

    if (dbPlan) {
      if (billingCycle === 'yearly') {
        return dbPlan.priceYearly !== undefined
          ? dbPlan.priceYearly
          : dbPlan.yearly || PLAN_PRICES[planId]?.yearly || 4990;
      } else {
        return dbPlan.priceMonthly !== undefined
          ? dbPlan.priceMonthly
          : dbPlan.monthly || dbPlan.price || PLAN_PRICES[planId]?.monthly || 499;
      }
    }
  } catch (e) {
    console.warn('[getPlanPrice] DB lookup fallback:', e.message);
  }

  const pricing = PLAN_PRICES[planId] || { monthly: 499, yearly: 4990 };
  return billingCycle === 'yearly' ? pricing.yearly : pricing.monthly;
}

/**
 * Server-side core coupon evaluation logic
 */
export async function evaluateCouponInternal({ couponCode, userId, planId, billingCycle = 'monthly', overrideAmount }) {
  if (!couponCode || typeof couponCode !== 'string') {
    return { valid: false, message: 'Coupon code is required.' };
  }

  const normalizedCode = couponCode.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: normalizedCode, isDeleted: false });

  if (!coupon) {
    return { valid: false, message: 'Invalid coupon code.' };
  }

  if (coupon.status !== 'active') {
    return { valid: false, message: 'This coupon is currently unavailable.' };
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { valid: false, message: 'This coupon is not active yet.' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
    return { valid: false, message: 'This coupon has expired.' };
  }

  // Check total usage limit
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit.' };
  }

  // Check per-user limit if userId is available
  if (userId && coupon.perUserLimit) {
    const userUsageCount = await CouponUsage.countDocuments({
      userId,
      couponId: coupon._id,
      status: 'paid',
    });

    if (userUsageCount >= coupon.perUserLimit) {
      return { valid: false, message: 'You have already used this coupon.' };
    }
  }

  // Check plan eligibility
  if (coupon.applicablePlans && coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes('ALL')) {
    const isPlanApplicable = coupon.applicablePlans.some(
      (p) => p.toLowerCase() === (planId || '').toLowerCase()
    );
    if (!isPlanApplicable) {
      return { valid: false, message: 'This coupon is not applicable to this plan.' };
    }
  }

  // Check billing cycle eligibility
  if (coupon.billingCycles && coupon.billingCycles.length > 0 && !coupon.billingCycles.includes('ALL')) {
    const isCycleApplicable = coupon.billingCycles.some(
      (c) => c.toLowerCase() === (billingCycle || '').toLowerCase()
    );
    if (!isCycleApplicable) {
      return { valid: false, message: 'This coupon is not applicable to the selected billing cycle.' };
    }
  }

  // Determine original amount
  const originalAmount = overrideAmount !== undefined && overrideAmount !== null
    ? overrideAmount
    : await getPlanPrice(planId, billingCycle);

  // Check minimum purchase amount requirement
  if (coupon.minimumPurchase && originalAmount < coupon.minimumPurchase) {
    return {
      valid: false,
      message: `Minimum purchase amount of ₹${coupon.minimumPurchase} is required for this coupon.`,
    };
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (originalAmount * coupon.discountValue) / 100;
    if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue;
  }

  // Cap discount at original amount
  discountAmount = Math.min(discountAmount, originalAmount);
  discountAmount = Math.round(discountAmount * 100) / 100; // Round to 2 decimal places

  const finalAmount = Math.max(0, Math.round((originalAmount - discountAmount) * 100) / 100);

  return {
    valid: true,
    couponId: coupon._id,
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    originalAmount,
    discountAmount,
    finalAmount,
    message: 'Coupon applied successfully 🎉',
  };
}

/**
 * POST /api/subscription/validate-coupon
 * Public user-facing coupon validation API
 */
export const validateCouponApi = async (req, res) => {
  try {
    const adminSettings = await AdminSettings.findOne({});
    if (adminSettings && adminSettings.couponFeatureEnabled === false) {
      return res.status(200).json({ valid: false, message: 'Coupon feature is currently disabled by administrator.' });
    }

    const userId = req.user?.id || req.user?._id;
    const { couponCode, planId, billingCycle = 'monthly', originalAmount } = req.body;

    if (!couponCode) {
      return res.status(400).json({ valid: false, message: 'Coupon code is required.' });
    }

    const evaluation = await evaluateCouponInternal({
      couponCode,
      userId,
      planId,
      billingCycle,
      overrideAmount: originalAmount,
    });

    if (!evaluation.valid) {
      return res.status(200).json(evaluation);
    }

    return res.status(200).json(evaluation);
  } catch (err) {
    console.error('[validateCouponApi] Error:', err.message);
    return res.status(500).json({ valid: false, message: err.message || 'Error validating coupon.' });
  }
};

/**
 * GET /api/admin/coupons
 * List all coupons with calculated statuses & aggregate summary metrics
 */
export const adminGetAllCoupons = async (req, res) => {
  try {
    const adminSettings = await AdminSettings.findOne({});
    const couponFeatureEnabled = adminSettings?.couponFeatureEnabled ?? true;
    const coupons = await Coupon.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();

    const formattedCoupons = coupons.map((c) => {
      const couponDoc = new Coupon(c);
      const computedStatus = couponDoc.getComputedStatus();
      return {
        ...c,
        computedStatus,
      };
    });

    // Aggregate summary metrics
    const totalCoupons = formattedCoupons.length;
    const activeCoupons = formattedCoupons.filter((c) => c.computedStatus === 'ACTIVE').length;
    const expiredCoupons = formattedCoupons.filter((c) => c.computedStatus === 'EXPIRED').length;

    const usages = await CouponUsage.find({ status: 'paid' }).lean();
    const totalCouponUses = usages.length;
    const totalDiscountGiven = usages.reduce((acc, u) => acc + (u.discountAmount || 0), 0);
    const totalRevenueGenerated = usages.reduce((acc, u) => acc + (u.finalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      couponFeatureEnabled,
      stats: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        totalCouponUses,
        totalDiscountGiven,
        totalRevenueGenerated,
      },
      coupons: formattedCoupons,
    });
  } catch (err) {
    console.error('[adminGetAllCoupons] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/admin/coupons/toggle-feature
 * Toggle global coupon feature status (Active / Inactive)
 */
export const adminToggleCouponFeature = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne({});
    if (!settings) {
      settings = await AdminSettings.create({});
    }

    const newStatus = typeof req.body?.enabled === 'boolean'
      ? req.body.enabled
      : !settings.couponFeatureEnabled;

    settings.couponFeatureEnabled = newStatus;
    await settings.save();

    return res.status(200).json({
      success: true,
      couponFeatureEnabled: settings.couponFeatureEnabled,
      message: `Coupon feature is now ${settings.couponFeatureEnabled ? 'ACTIVE' : 'INACTIVE'}`,
    });
  } catch (err) {
    console.error('[adminToggleCouponFeature] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/coupons
 * Create a new coupon code
 */
export const adminCreateCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      applicablePlans,
      billingCycles,
      startDate,
      expiryDate,
      usageLimit,
      perUserLimit,
      minimumPurchase,
      maximumDiscount,
      status,
    } = req.body;

    if (!code || !discountValue || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Code, discount value, and expiry date are required.' });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await Coupon.findOne({ code: normalizedCode, isDeleted: false });
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon code '${normalizedCode}' already exists.` });
    }

    const newCoupon = await Coupon.create({
      code: normalizedCode,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      applicablePlans: Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : ['ALL'],
      billingCycles: Array.isArray(billingCycles) && billingCycles.length > 0 ? billingCycles : ['ALL'],
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit !== undefined && usageLimit !== '' && usageLimit !== null ? Number(usageLimit) : null,
      perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
      minimumPurchase: minimumPurchase ? Number(minimumPurchase) : 0,
      maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
      status: status || 'active',
      createdBy: req.user?.id || req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully 🎉',
      coupon: newCoupon,
    });
  } catch (err) {
    console.error('[adminCreateCoupon] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/coupons/:id
 * Get single coupon detail, metrics & redemption usage history
 */
export const adminGetCouponDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id).lean();

    if (!coupon || coupon.isDeleted) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    const couponDoc = new Coupon(coupon);
    const computedStatus = couponDoc.getComputedStatus();

    // Fetch usage history
    const usageHistory = await CouponUsage.find({ couponId: id })
      .populate('userId', 'fullName email phone')
      .sort({ usedAt: -1 })
      .lean();

    const totalUses = usageHistory.length;
    const totalDiscountGiven = usageHistory.reduce((acc, u) => acc + (u.discountAmount || 0), 0);
    const totalRevenueGenerated = usageHistory.reduce((acc, u) => acc + (u.finalAmount || 0), 0);
    const averageOrderValue = totalUses > 0 ? Math.round((totalRevenueGenerated / totalUses) * 100) / 100 : 0;

    return res.status(200).json({
      success: true,
      coupon: {
        ...coupon,
        computedStatus,
      },
      stats: {
        totalUses,
        totalDiscountGiven,
        totalRevenueGenerated,
        averageOrderValue,
      },
      usageHistory,
    });
  } catch (err) {
    console.error('[adminGetCouponDetails] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/coupons/:id
 * Update coupon configuration
 */
export const adminUpdateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon || coupon.isDeleted) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    const {
      code,
      discountType,
      discountValue,
      applicablePlans,
      billingCycles,
      startDate,
      expiryDate,
      usageLimit,
      perUserLimit,
      minimumPurchase,
      maximumDiscount,
      status,
    } = req.body;

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== coupon.code) {
        const existing = await Coupon.findOne({ code: normalizedCode, _id: { $ne: id }, isDeleted: false });
        if (existing) {
          return res.status(400).json({ success: false, message: `Coupon code '${normalizedCode}' is already in use.` });
        }
        coupon.code = normalizedCode;
      }
    }

    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (applicablePlans !== undefined) coupon.applicablePlans = Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : ['ALL'];
    if (billingCycles !== undefined) coupon.billingCycles = Array.isArray(billingCycles) && billingCycles.length > 0 ? billingCycles : ['ALL'];
    if (startDate !== undefined) coupon.startDate = new Date(startDate);
    if (expiryDate !== undefined) coupon.expiryDate = new Date(expiryDate);
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit !== '' && usageLimit !== null ? Number(usageLimit) : null;
    if (perUserLimit !== undefined) coupon.perUserLimit = Number(perUserLimit);
    if (minimumPurchase !== undefined) coupon.minimumPurchase = Number(minimumPurchase);
    if (maximumDiscount !== undefined) coupon.maximumDiscount = maximumDiscount !== '' && maximumDiscount !== null ? Number(maximumDiscount) : null;
    if (status !== undefined) coupon.status = status;

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully 🎉',
      coupon,
    });
  } catch (err) {
    console.error('[adminUpdateCoupon] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/admin/coupons/:id/status
 * Toggle active / inactive status of a coupon
 */
export const adminToggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon || coupon.isDeleted) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon status changed to ${coupon.status.toUpperCase()}`,
      coupon,
    });
  } catch (err) {
    console.error('[adminToggleCouponStatus] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/coupons/:id
 * Soft delete a coupon
 */
export const adminDeleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon || coupon.isDeleted) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    coupon.isDeleted = true;
    coupon.status = 'inactive';
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (err) {
    console.error('[adminDeleteCoupon] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
