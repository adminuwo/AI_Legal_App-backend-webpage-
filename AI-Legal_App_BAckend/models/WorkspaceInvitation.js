import mongoose from 'mongoose';

const workspaceInvitationSchema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    mobile: { type: String },
    fullName: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String, default: 'Civil Litigation' },
    permission: { type: String, default: 'Standard Member' },
    modules: [{ type: String }],
    deliveryMethods: [{ type: String }], // e.g. ['Email Invitation', 'WhatsApp Invitation']
    personalMessage: { type: String },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
    token: { type: String, required: true, unique: true },
    barCouncilNo: { type: String },
    stateBarCouncil: { type: String }
}, { timestamps: true });

export default mongoose.model('WorkspaceInvitation', workspaceInvitationSchema);
