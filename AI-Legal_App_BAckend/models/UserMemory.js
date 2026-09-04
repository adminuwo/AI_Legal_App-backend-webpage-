import mongoose from 'mongoose';

const UserMemorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    name: { type: String, default: '' },
    businessType: { type: String, default: '' },
    interests: [{ type: String }],
    goals: [{ type: String }],
    preferences: {
        language: { type: String, default: 'English' },
        tone: { type: String, default: 'Professional' },
        other: { type: Map, of: String, default: {} }
    },
    approvedStrategies: [{ type: String }],
    preferredDraftingStyle: { type: String, default: '' },
    clientPreferences: [{ type: String }],
    courtPreferences: [{ type: String }],
    favoriteTemplates: [{ type: String }],
    ignoredSuggestions: [{ type: String }],
    referencedLaws: [{ type: String }],
    lastSessionSummary: { type: String, default: '' },
    lastActiveFeature: { type: String, default: '' },
    isMemoryEnabled: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const UserMemory = mongoose.model('UserMemory', UserMemorySchema);

export default UserMemory;
