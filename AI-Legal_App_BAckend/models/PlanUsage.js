import mongoose from 'mongoose';

const PlanUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feature: { type: String, required: true }, // e.g. 'draft_maker', 'mock_courtroom'
  usedCount: { type: Number, default: 0 },
  remainingCount: { type: Number, default: 0 },
  plan: { type: String, default: 'FREE' },
  lastUsed: { type: Date, default: Date.now },
  resetDate: { type: Date }
}, { timestamps: true });

// Ensure fast lookup and uniqueness per user and feature
PlanUsageSchema.index({ userId: 1, feature: 1 }, { unique: true });

export default mongoose.models.PlanUsage || mongoose.model('PlanUsage', PlanUsageSchema);
