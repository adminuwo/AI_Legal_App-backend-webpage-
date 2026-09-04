import mongoose from 'mongoose';

const strategyVersionSchema = new mongoose.Schema({
    version: {
        type: Number,
        required: true
    },
    uploadedDocuments: [{
        name: String,
        size: String,
        type: { type: String },
        url: String
    }],
    ocrData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    manualFacts: {
        type: String,
        default: ''
    },
    caseType: {
        type: String,
        default: ''
    },
    courtLevel: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'English'
    },
    generatedStrategy: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    aiSummary: {
        type: String,
        default: ''
    },
    riskAnalysis: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const strategyHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true,
        default: null
    },
    caseName: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        default: ''
    },
    tags: [{
        type: String
    }],
    versions: [strategyVersionSchema],
    activeVersionIndex: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const StrategyHistory = mongoose.model('StrategyHistory', strategyHistorySchema);
export default StrategyHistory;
