import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    complaintId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    userName: {
        type: String,
        default: 'Anonymous User'
    },
    userEmail: {
        type: String,
        default: 'Not provided'
    },
    workspace: {
        type: String,
        default: 'Default Workspace'
    },
    subscriptionPlan: {
        type: String,
        default: 'Free Plan'
    },
    aiTool: {
        type: String,
        default: 'AI Copilot'
    },
    conversationId: {
        type: String,
        default: ''
    },
    messageId: {
        type: String,
        required: true,
        index: true
    },
    originalPrompt: {
        type: String,
        default: ''
    },
    aiResponse: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Incorrect Legal Information',
            'Incomplete Answer',
            'Irrelevant Response',
            'Wrong Language',
            'Hallucinated Information',
            'Poor Formatting',
            'Offensive / Inappropriate Content',
            'AI Did Not Understand My Question',
            'Technical Issue',
            'Other'
        ]
    },
    comment: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'English'
    },
    appVersion: {
        type: String,
        default: '1.0.0'
    },
    osVersion: {
        type: String,
        default: 'Mobile OS'
    },
    deviceInfo: {
        type: String,
        default: 'Mobile Device'
    },
    status: {
        type: String,
        enum: ['Open', 'In Review', 'Resolved', 'Closed'],
        default: 'Open',
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
