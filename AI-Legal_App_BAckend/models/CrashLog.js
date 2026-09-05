import mongoose from 'mongoose';

const crashLogSchema = new mongoose.Schema(
    {
        errorName: {
            type: String,
            required: true,
            default: 'Error',
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        stack: {
            type: String,
            default: '',
        },
        source: {
            type: String,
            enum: ['frontend', 'backend'],
            default: 'backend',
        },
        platform: {
            type: String,
            enum: ['iOS', 'Android', 'NodeServer', 'Web', 'Unknown'],
            default: 'Unknown',
        },
        appVersion: {
            type: String,
            default: '1.0.0',
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        userEmail: {
            type: String,
            default: '',
        },
        route: {
            type: String,
            default: '',
        },
        severity: {
            type: String,
            enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
            default: 'HIGH',
        },
        status: {
            type: String,
            enum: ['UNRESOLVED', 'INVESTIGATING', 'RESOLVED'],
            default: 'UNRESOLVED',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

crashLogSchema.index({ status: 1, createdAt: -1 });
crashLogSchema.index({ source: 1, platform: 1 });
crashLogSchema.index({ severity: 1 });

const CrashLog = mongoose.models.CrashLog || mongoose.model('CrashLog', crashLogSchema);

export default CrashLog;
