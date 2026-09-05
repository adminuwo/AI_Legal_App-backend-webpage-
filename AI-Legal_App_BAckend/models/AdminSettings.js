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
    },
    appUpdate: {
        android: {
            minimumSupportedVersion: { type: String, default: '1.0.0' },
            updatePolicy: { type: String, enum: ['optional', 'mandatory'], default: 'optional' },
            title: { type: String, default: 'AI LEGAL™ Update Available' },
            message: { type: String, default: 'A new version of AI LEGAL™ is available with improvements and bug fixes.' },
            storeUrl: { type: String, default: 'https://play.google.com/store/apps/details?id=com.uwo.ailegal' },
            enabled: { type: Boolean, default: true }
        },
        ios: {
            minimumSupportedVersion: { type: String, default: '1.0.0' },
            updatePolicy: { type: String, enum: ['optional', 'mandatory'], default: 'optional' },
            title: { type: String, default: 'AI LEGAL™ Update Available' },
            message: { type: String, default: 'A new version of AI LEGAL™ is available with improvements and bug fixes.' },
            storeUrl: { type: String, default: 'https://apps.apple.com/app/ai-legal/id123456789' },
            enabled: { type: Boolean, default: true }
        }
    }
}, { timestamps: true });

export default mongoose.model('AdminSettings', AdminSettingsSchema);
