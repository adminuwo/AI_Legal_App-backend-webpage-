import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: String,
        default: 'Advocate'
    },
    version: {
        type: Number,
        default: 1
    },
    modelUsed: {
        type: String,
        default: 'Vertex AI (Gemini 2.5 Pro)'
    },
    analysisJson: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    summary: {
        type: String,
        default: ''
    },
    recommendations: [String],
    status: {
        type: String,
        enum: ['Completed', 'Pending', 'Failed'],
        default: 'Completed'
    },
    promptVersion: {
        type: String,
        default: ''
    },
    contextSnapshot: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    confidence: {
        type: String,
        enum: ['High', 'Low'],
        default: 'Low'
    },
    sourcesUsed: {
        type: [String],
        default: []
    },
    missingFields: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const Analysis = mongoose.model('Analysis', analysisSchema);
export default Analysis;
