import mongoose from 'mongoose';

const gaAnalyticsSyncSchema = new mongoose.Schema({
    propertyId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: String, // 'YYYY-MM-DD'
        required: true,
        index: true
    },
    platform: {
        type: String, // 'android', 'ios', 'all'
        enum: ['android', 'ios', 'web', 'all', 'unknown'],
        default: 'android',
        index: true
    },
    metricName: {
        type: String, // 'app_remove', 'first_open', etc.
        default: 'app_remove',
        index: true
    },
    count: {
        type: Number,
        default: 0
    },
    syncedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

gaAnalyticsSyncSchema.index({ propertyId: 1, date: 1, platform: 1, metricName: 1 }, { unique: true });

export default mongoose.model('GaAnalyticsSync', gaAnalyticsSyncSchema);
