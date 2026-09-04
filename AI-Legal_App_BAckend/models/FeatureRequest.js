import mongoose from 'mongoose';

const FeatureRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    userPlan: {
        type: String,
        default: 'Free'
    },
    priority: {
        type: String,
        enum: ['Nice to Have', 'Important', 'Critical'],
        default: 'Nice to Have'
    },
    category: {
        type: String,
        default: 'General'
    },
    attachments: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Planned', 'In Progress', 'Completed', 'Rejected'],
        default: 'Pending',
        index: true
    },
    developerAssigned: {
        type: String,
        default: ''
    },
    reply: {
        type: String,
        default: ''
    },
    isArchived: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

export default mongoose.model('FeatureRequest', FeatureRequestSchema);
