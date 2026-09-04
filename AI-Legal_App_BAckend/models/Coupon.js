import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    applicablePlans: {
      type: [String],
      default: ['ALL'], // Array of plan IDs (e.g. ['advocate_pro', 'student_basic']) or ['ALL']
    },
    billingCycles: {
      type: [String],
      default: ['ALL'], // Array containing 'monthly', 'yearly', or ['ALL']
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    minimumPurchase: {
      type: Number,
      default: 0,
    },
    maximumDiscount: {
      type: Number,
      default: null, // null means unlimited for percentage coupons
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to compute dynamic status
couponSchema.methods.getComputedStatus = function () {
  if (this.isDeleted || this.status === 'inactive') {
    return 'INACTIVE';
  }
  const now = new Date();
  if (this.startDate && new Date(this.startDate) > now) {
    return 'SCHEDULED';
  }
  if (this.expiryDate && new Date(this.expiryDate) < now) {
    return 'EXPIRED';
  }
  if (this.usageLimit !== null && this.usageLimit !== undefined && this.usedCount >= this.usageLimit) {
    return 'EXHAUSTED';
  }
  return 'ACTIVE';
};

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
