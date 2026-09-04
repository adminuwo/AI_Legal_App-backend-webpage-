import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['personal', 'law_firm', 'enterprise'], default: 'law_firm' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    badge: { type: String, default: 'Law Firm' },
    icon: { type: String, default: 'business-outline' },
    casesCount: { type: Number, default: 0 },
    membersCount: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('Workspace', workspaceSchema);
