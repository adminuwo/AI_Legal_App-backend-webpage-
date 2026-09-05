import mongoose from 'mongoose';

const enterpriseAddonRequestSchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enterprise',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featureName: {
    type: String,
    required: true,
    enum: ['Contract Analyzer', 'Evidence Analyst', 'Case Predictor', 'Strategy Engine', 'Advanced Research', 'Custom LLM Vault']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  notes: { type: String, default: '' },
  reviewedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('EnterpriseAddonRequest', enterpriseAddonRequestSchema);
