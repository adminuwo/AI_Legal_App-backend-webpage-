import mongoose from 'mongoose';

const casePredictionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    caseName: {
        type: String,
        required: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    uploadedDocuments: [{
        name: String,
        url: String
    }],
    ocrResults: {
        type: String,
        default: ''
    },
    manualFacts: {
        type: mongoose.Schema.Types.Mixed
    },
    generatedPrediction: {
        type: String,
        required: true
    },
    riskAnalysis: {
        type: String,
        default: ''
    },
    winProbability: {
        type: String,
        default: '50%'
    },
    aiSummary: {
        type: String,
        default: ''
    },
    version: {
        type: Number,
        default: 1
    },
    versionGroupId: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

const CasePrediction = mongoose.model('CasePrediction', casePredictionSchema);
export default CasePrediction;
