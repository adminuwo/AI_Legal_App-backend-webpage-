import mongoose from 'mongoose';

/**
 * IntentJob Model
 * Tracks async pipeline jobs for long-running tasks (video gen, deep search, etc.)
 * Enables polling via GET /api/intent/job/:jobId
 */
const intentJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'failed', 'partial'],
        default: 'queued',
        index: true
    },
    intent: { type: String, required: true },
    tools: [{ type: String }],
    pipeline: { type: mongoose.Schema.Types.Mixed },
    originalMessage: { type: String },
    attachments: [{ type: mongoose.Schema.Types.Mixed }],
    config: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Progress tracking
    progress: {
        completed: [{ type: String }],   // Tool names completed
        running: [{ type: String }],     // Tool names currently running
        pending: [{ type: String }]      // Tool names not yet started
    },

    // Results
    result: { type: mongoose.Schema.Types.Mixed },
    finalOutput: { type: mongoose.Schema.Types.Mixed },
    stageOutputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    trace: [{ type: mongoose.Schema.Types.Mixed }],

    // Metrics
    creditsUsed: { type: Number, default: 0 },
    estimatedCredits: { type: Number, default: 0 },
    traceId: { type: String },
    error: { type: String },
    totalDurationMs: { type: Number },

    // Timestamps
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h TTL
    }
}, { timestamps: false });

// Auto-expire jobs after 24 hours (TTL index)
intentJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('IntentJob', intentJobSchema);
