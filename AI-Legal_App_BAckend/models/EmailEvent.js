import mongoose from 'mongoose';

const EmailEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    accountCreatedAt: {
        type: Date,
        default: Date.now
    },
    currentPlan: {
        type: String,
        default: 'FREE'
    },
    eventType: {
        type: String,
        required: true,
        enum: ['WELCOME_EMAIL', 'FEATURE_LIMIT_EXHAUSTED', 'FREE_PLAN_FULLY_EXHAUSTED'],
        index: true
    },
    featureId: {
        type: String,
        default: null
    },
    featureName: {
        type: String,
        default: null
    },
    featureLimit: {
        type: Number,
        default: null
    },
    featureUsage: {
        type: Number,
        default: null
    },
    remainingLimit: {
        type: Number,
        default: null
    },
    exhaustedFeatures: [{
        featureId: { type: String },
        featureName: { type: String },
        used: { type: Number },
        limit: { type: Number }
    }],
    availableFeatures: [{
        featureId: { type: String },
        featureName: { type: String },
        remaining: { type: Number },
        limit: { type: Number }
    }],
    emailSubject: {
        type: String,
        default: ''
    },
    emailStatus: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED'],
        default: 'PENDING',
        index: true
    },
    sentAt: {
        type: Date,
        default: null
    },
    failureReason: {
        type: String,
        default: null
    },
    platform: {
        type: String,
        enum: ['web', 'android', 'ios', 'unknown'],
        default: 'unknown'
    },
    authenticationMethod: {
        type: String,
        enum: ['email', 'google', 'apple', 'local', 'other'],
        default: 'email'
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true
    },
    usagePeriodId: {
        type: String,
        default: 'initial_cycle'
    }
}, { timestamps: true });

// Compound indexes for analytics, reporting, and idempotent lookup
EmailEventSchema.index({ userId: 1, eventType: 1 });
EmailEventSchema.index({ createdAt: -1 });
EmailEventSchema.index({ emailStatus: 1, createdAt: -1 });
EmailEventSchema.index({ userId: 1, featureId: 1, eventType: 1 });

export default mongoose.models.EmailEvent || mongoose.model('EmailEvent', EmailEventSchema);
