import mongoose from 'mongoose';

const workspaceMembershipSchema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { 
        type: String, 
        enum: ['Managing Partner', 'Senior Advocate', 'Partner', 'Associate Advocate', 'Junior Advocate', 'Legal Consultant', 'Research Associate', 'Paralegal', 'Evidence Clerk', 'Court Clerk', 'Legal Intern', 'Admin Staff', 'Accounts', 'Advocate / Owner'],
        default: 'Junior Advocate'
    },
    department: { type: String, default: 'General Practice' },
    permission: { type: String, enum: ['View Only', 'Standard Member', 'Case Editor', 'Manager', 'Administrator'], default: 'Standard Member' },
    status: { type: String, enum: ['Active', 'Suspended', 'Removed'], default: 'Active' },
    modules: [{ type: String }],
    joinedDate: { type: Date, default: Date.now }
}, { timestamps: true });

workspaceMembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export default mongoose.model('WorkspaceMembership', workspaceMembershipSchema);
