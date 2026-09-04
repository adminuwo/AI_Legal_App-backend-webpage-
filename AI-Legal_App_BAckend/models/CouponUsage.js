import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: '',
    },
    planId: {
      type: String,
      required: true,
    },
    billingCycle: {
      type: String,
      default: 'monthly',
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
      default: '',
      index: true,
    },
    orderId: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: ['paid', 'failed'],
      default: 'paid',
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for per-user limit checks
couponUsageSchema.index({ userId: 1, couponId: 1 });
// Compound index for order idempotency
couponUsageSchema.index({ orderId: 1, couponId: 1 });

const CouponUsage = mongoose.models.CouponUsage || mongoose.model('CouponUsage', couponUsageSchema);

export default CouponUsage;
