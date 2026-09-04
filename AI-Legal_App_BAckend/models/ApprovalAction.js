import mongoose from 'mongoose';

const ApprovalActionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'GeneratedPost', required: true, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialAgentWorkspace', required: true, index: true },
  actionType: { 
    type: String, 
    enum: ['send_for_review', 'approve', 'reject', 'request_variation', 'schedule', 'comment'], 
    required: true 
  },
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionNote: { type: String },
  previousStatus: { type: String },
  newStatus: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ApprovalAction || mongoose.model('ApprovalAction', ApprovalActionSchema);
