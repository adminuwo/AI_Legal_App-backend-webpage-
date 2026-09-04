import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
        default: 'AISA User'
    },
    email: {
        type: String,
        required: true,
    },
    issueType: {
        type: String,
        required: true,
        default: 'Technical Support'
    },
    message: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: false
    },
    priority: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: false
    },
    device: {
        type: String,
        required: false
    },
    appVersion: {
        type: String,
        required: false
    },
    steps: {
        type: String,
        required: false
    },
    whyNeeded: {
        type: String,
        required: false
    },
    whoBenefit: {
        type: String,
        required: false
    },
    attachments: {
        type: [mongoose.Schema.Types.Mixed],
        required: false,
        default: []
    },
    diagnosticLogs: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'open', 'in_progress', 'closed', 'Approved', 'Rejected', 'Planned', 'Completed', 'Review'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('SupportTicket', supportTicketSchema);
