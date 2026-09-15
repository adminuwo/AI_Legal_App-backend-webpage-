import mongoose from 'mongoose';

const appInstallSchema = new mongoose.Schema({
    installId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    platform: {
        type: String,
        enum: ['android', 'ios', 'web', 'unknown'],
        default: 'android',
        index: true
    },
    country: {
        type: String,
        default: 'India',
        index: true
    },
    countryCode: {
        type: String,
        default: 'IN',
        index: true
    },
    state: {
        type: String,
        default: '',
        index: true
    },
    city: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        enum: ['google-play', 'app-store', 'organic', 'referral', 'direct', 'unknown'],
        default: 'organic'
    },
    installedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    firstInstall: {
        type: Boolean,
        default: true
    },
    appVersion: {
        type: String,
        default: '1.0.11'
    },
    deviceType: {
        type: String,
        default: 'phone'
    },
    deviceOSVersion: {
        type: String,
        default: ''
    },
    ipHash: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['installed', 'uninstalled', 'active'],
        default: 'installed',
        index: true
    },
    uninstalledAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Compound indexes for rapid aggregation in Admin Analytics
appInstallSchema.index({ installedAt: -1, platform: 1 });
appInstallSchema.index({ country: 1, installedAt: -1 });
appInstallSchema.index({ country: 1, state: 1, installedAt: -1 });
appInstallSchema.index({ status: 1, installedAt: -1 });

export default mongoose.model('AppInstall', appInstallSchema);
