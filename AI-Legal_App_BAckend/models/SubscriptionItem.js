import mongoose from 'mongoose';

const subscriptionItemSchema = new mongoose.Schema({
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { 
        type: String, 
        enum: ['advocate', 'student', 'lawfirm', 'combo'], 
        required: true 
    },
    tier: { 
        type: String, 
        enum: ['FREE', 'BASIC', 'PROFESSIONAL', 'PREMIUM'], 
        required: true 
    },
    activeCases: { type: Number, default: 50 },
    storage: { type: Number, default: 5120 }, // in MB (5 GB default)
    draftMakerLimit: { type: Number, default: 5 }, // -1 for unlimited
    precedentLimit: { type: Number, default: 5 },
    evidenceLimit: { type: Number, default: 5 },
    contractLimit: { type: Number, default: 5 },
    strategyLimit: { type: Number, default: 5 },
    predictorLimit: { type: Number, default: 5 },
    mockCourtLimit: { type: Number, default: 2 },
    clientConnectLimit: { type: Number, default: 2 },
    aiCaseAnalysisLimit: { type: Number, default: 5 }
}, { timestamps: true });

export default mongoose.model('SubscriptionItem', subscriptionItemSchema);
