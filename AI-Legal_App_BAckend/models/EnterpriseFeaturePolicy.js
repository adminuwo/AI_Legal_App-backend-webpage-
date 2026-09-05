import mongoose from 'mongoose';

const enterpriseFeaturePolicySchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enterprise',
    required: true
  },
  scopeType: {
    type: String,
    enum: ['Institution', 'Course', 'Batch', 'Semester', 'Student'],
    default: 'Institution'
  },
  scopeId: {
    type: String,
    default: 'GLOBAL' // Course name, Batch name, Semester number, or User ID
  },
  features: {
    aiLegalAssistant: { type: Boolean, default: true },
    aiTutor: { type: Boolean, default: true },
    quizPractice: { type: Boolean, default: true },
    aiNotes: { type: Boolean, default: true },
    draftMaker: { type: Boolean, default: true },
    legalResearch: { type: Boolean, default: true },
    mockCourtroom: { type: Boolean, default: true },
    contractAnalyzer: { type: Boolean, default: true },
    evidenceAnalyst: { type: Boolean, default: true },
    casePredictor: { type: Boolean, default: true },
    strategyEngine: { type: Boolean, default: true }
  },
  quotas: {
    monthlyChatLimit: { type: Number, default: 1000 },
    monthlyDraftLimit: { type: Number, default: 50 },
    monthlyResearchLimit: { type: Number, default: 100 }
  }
}, { timestamps: true });

export default mongoose.model('EnterpriseFeaturePolicy', enterpriseFeaturePolicySchema);
