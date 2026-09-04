import mongoose from 'mongoose';

const ScheduleItemSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'GeneratedPost', required: true, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialAgentWorkspace', required: true, index: true },
  platform: { 
    type: String, 
    enum: ['instagram', 'facebook', 'linkedin', 'twitter', 'youtube'], 
    required: true 
  },
  scheduledFor: { type: Date, required: true },
  timezone: { type: String, default: 'UTC' },
  publishStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'published', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.ScheduleItem || mongoose.model('ScheduleItem', ScheduleItemSchema);
