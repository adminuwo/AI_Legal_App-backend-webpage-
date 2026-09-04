import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false,
        index: true
    },
    caseName: {
        type: String,
        default: ''
    },
    module: {
        type: String,
        enum: ['Cases', 'Hearings', 'Documents', 'Evidence', 'AI', 'Tasks', 'System'],
        default: 'Cases'
    },
    category: {
        type: String,
        enum: ['Cases', 'Alerts', 'System'],
        default: 'Cases',
        index: true
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low', 'Completed'],
        default: 'Medium'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'alert', 'promo', 'update'],
        default: 'info'
    },
    icon: {
        type: String,
        default: 'briefcase'
    },
    color: {
        type: String,
        default: '#3B82F6'
    },
    actionType: {
        type: String,
        default: 'OPEN_ROUTE'
    },
    actionId: {
        type: String,
        default: ''
    },
    route: {
        type: String,
        default: ''
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    deleted: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

// Compound indexes for fast filtering and pagination
notificationSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, deleted: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
