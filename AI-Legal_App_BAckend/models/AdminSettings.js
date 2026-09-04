import mongoose from 'mongoose';

const AdminSettingsSchema = new mongoose.Schema({
    couponFeatureEnabled: {
        type: Boolean,
        default: true
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    sessionTimeout: {
        type: Number,
        default: 30 // in minutes
    },
    platformName: {
        type: String,
        default: 'AI Legal Pro'
    },
    logoUrl: {
        type: String,
        default: ''
    },
    supportEmail: {
        type: String,
        default: 'support@aisa24.com'
    },
    smtp: {
        host: { type: String, default: 'smtp.mailtrap.io' },
        port: { type: Number, default: 2525 },
        user: { type: String, default: '' },
        pass: { type: String, default: '' }
    },
    apiKeys: {
        openai: { type: String, default: '' },
        razorpayId: { type: String, default: '' },
        razorpaySecret: { type: String, default: '' }
    },
    aiModel: {
        type: String,
        default: 'gpt-4-turbo'
    },
    defaultCredits: {
        type: Number,
        default: 50
    },
    fileUploadLimitMb: {
        type: Number,
        default: 25
    },
    storageLimitGb: {
        type: Number,
        default: 5
    },
    backupControls: {
        autoBackup: { type: Boolean, default: true },
        frequency: { type: String, default: 'daily' }
    },
    securityPolicies: {
        passwordMinLength: { type: Number, default: 8 },
        mfaRequired: { type: Boolean, default: false }
    },
    notificationSettings: {
        emailRelays: { type: Boolean, default: true },
        smsAlerts: { type: Boolean, default: false }
    }
}, { timestamps: true });

export default mongoose.model('AdminSettings', AdminSettingsSchema);
