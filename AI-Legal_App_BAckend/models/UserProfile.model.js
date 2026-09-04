import mongoose from 'mongoose';

const UserProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Onboarding Answers (Day 1-2)
    onboarding: {
        currentWork: String,
        targetSkills: [String],
        goals: [String],
        lastAnswered: Date
    },
    // Psychological Traits (Day 5-6)
    psychology: {
        motivationStyle: {
            type: String,
            enum: ['Self-Driven', 'Social-Validation', 'Achievement-Oriented', 'Fear-Based', 'Undetermined'],
            default: 'Undetermined'
        },
        learningStyle: {
            type: String,
            enum: ['Visual', 'Practical', 'Theoretical', 'Concise', 'Detailed', 'Undetermined'],
            default: 'Undetermined'
        },
        productivityPattern: {
            type: String,
            enum: ['Deep-Worker', 'Quick-Responder', 'Multitasker', 'Night-Owl', 'Morning-Person', 'Undetermined'],
            default: 'Undetermined'
        }
    },
    // Derived Intelligence (Continuous)
    intelligence: {
        technicalLevel: { type: Number, default: 1 }, // 1 to 5
        complexityPreference: { type: String, enum: ['Simple', 'Balanced', 'Complex'], default: 'Balanced' },
        concisenessThreshold: { type: Number, default: 0.5 } // 0 (detailed) to 1 (brief)
    },
    trackingStartedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('UserProfile', UserProfileSchema);
