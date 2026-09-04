import mongoose from 'mongoose';

const BehaviorVectorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    messageLengthAvg: { type: Number, default: 0 },
    topTopics: [String],
    activeHours: [Number], // 0-23
    questionFrequency: { type: Number, default: 0 }, // Curiosity level
    vocabularyComplexity: { type: Number, default: 0 },
    interactionCount: { type: Number, default: 0 },
    lastAnalyzedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// We use one record per user and update it periodically
export default mongoose.model('BehaviorVector', BehaviorVectorSchema);
