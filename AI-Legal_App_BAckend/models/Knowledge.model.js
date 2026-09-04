import mongoose from 'mongoose';

const KnowledgeSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    cloudinaryUrl: {
        type: String
    },
    cloudinaryId: {
        type: String // Public ID
    },
    gcsUri: {
        type: String
    },
    mimetype: {
        type: String
    },
    size: {
        type: Number // In bytes
    },
    category: {
        type: String,
        enum: ['LEGAL', 'GENERAL', 'FINANCE', 'PRODUCT_GUIDE'],
        default: 'GENERAL'
    },
    sourceUrl: {
        type: String
    },
    contentHash: {
        type: String
    },
    knowledgeSourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KnowledgeSource'
    },
    totalChunks: {
        type: Number,
        default: 0
    },
    workspaceId: {
        type: String,
        default: null,
        index: true
    },
    workspaceType: {
        type: String,
        default: 'public',
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
        index: true
    },
    visibility: {
        type: String,
        enum: ['PUBLIC', 'WORKSPACE_PRIVATE'],
        default: 'PUBLIC',
        index: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Indexing', 'Active', 'Error'],
        default: 'Pending'
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('AIBaseKnowledge', KnowledgeSchema);
