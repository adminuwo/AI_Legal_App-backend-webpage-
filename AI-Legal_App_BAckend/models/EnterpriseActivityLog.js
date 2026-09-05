import mongoose from 'mongoose';

const enterpriseActivityLogSchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enterprise',
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: { type: String, required: true }, // e.g. "INVITED_STUDENTS", "UPDATED_FEATURE_ACCESS", "VERIFIED_DOMAIN"
  details: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model('EnterpriseActivityLog', enterpriseActivityLogSchema);
