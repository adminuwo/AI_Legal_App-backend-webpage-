import mongoose from 'mongoose';

const enterpriseAnnouncementSchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enterprise',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetAudience: {
    type: String,
    enum: ['All Students', 'Specific Course', 'Specific Batch', 'Specific Semester', 'Selected Students', 'Faculty'],
    default: 'All Students'
  },
  targetScopeId: { type: String, default: '' },
  publishDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('EnterpriseAnnouncement', enterpriseAnnouncementSchema);
