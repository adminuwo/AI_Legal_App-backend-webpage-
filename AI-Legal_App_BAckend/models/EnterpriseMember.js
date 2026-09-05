import mongoose from 'mongoose';

const enterpriseMemberSchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enterprise',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Enterprise Owner', 'Enterprise Admin', 'Faculty / Coordinator', 'Student'],
    required: true
  },
  enrollmentId: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  course: {
    type: String,
    default: ''
  },
  batch: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  semester: {
    type: String,
    default: ''
  },
  assignedSubjects: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Active', 'Pending Invitation', 'Suspended', 'Archived'],
    default: 'Active'
  },
  invitationCode: {
    type: String,
    default: ''
  },
  usageStats: {
    totalChats: { type: Number, default: 0 },
    totalDrafts: { type: Number, default: 0 },
    totalResearches: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  }
}, { timestamps: true });

enterpriseMemberSchema.index({ enterpriseId: 1, userId: 1 }, { unique: true });

export default mongoose.model('EnterpriseMember', enterpriseMemberSchema);
