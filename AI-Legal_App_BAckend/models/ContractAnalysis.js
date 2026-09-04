import mongoose from 'mongoose';

const contractAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    contractName: {
        type: String,
        required: true
    },
    originalFileUrl: {
        type: String,
        required: true
    },
    originalFileMime: {
        type: String
    },
    originalFileSize: {
        type: Number
    },
    originalFilePages: {
        type: Number
    },
    ocrText: {
        type: String,
        default: ''
    },
    aiAnalysisResult: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    riskScore: {
        type: Number,
        default: 0
    },
    riskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    missingClauses: {
        type: [String],
        default: []
    },
    suggestedClauses: {
        type: [String],
        default: []
    },
    keyObligations: {
        type: [String],
        default: []
    },
    partiesDetected: {
        type: [String],
        default: []
    },
    datesDetected: {
        type: [String],
        default: []
    },
    monetaryValues: {
        type: [String],
        default: []
    },
    governingLaw: {
        type: String,
        default: ''
    },
    aiSummary: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
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

const ContractAnalysis = mongoose.model('ContractAnalysis', contractAnalysisSchema);
export default ContractAnalysis;
