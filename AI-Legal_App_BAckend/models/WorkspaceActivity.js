import mongoose from 'mongoose';

const workspaceActivitySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
      default: null,
    },
    caseName: {
      type: String,
      default: '',
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      default: 'Advocate',
    },
    actorAvatar: {
      type: String,
      default: '',
    },
    actorRole: {
      type: String,
      default: 'Advocate',
    },
    activityCategory: {
      type: String,
      required: true,
      enum: [
        'draft',
        'argument',
        'cross_exam',
        'copilot',
        'documents',
        'evidence',
        'hearings',
        'tasks',
        'team_chat',
        'team_management',
        'research',
        'reports',
        'client_communication',
        'case_management',
      ],
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      default: 'Completed',
      enum: ['Completed', 'Pending', 'Reviewed', 'Approved', 'Rejected', 'Updated'],
    },
    reviewStatus: {
      type: String,
      default: 'None',
      enum: ['Pending Review', 'Approved', 'Rejected', 'Changes Requested', 'None'],
      index: true,
    },
    reviewedBy: {
      type: String,
      default: '',
    },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      default: '',
    },
    generatedContent: {
      type: String,
      default: '',
    },
    linkedDocumentId: {
      type: String,
      default: '',
    },
    relatedEntityType: {
      type: String,
      default: '',
    },
    relatedEntityId: {
      type: String,
      default: '',
    },
    readBy: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    version: {
      type: String,
      default: '1.0',
    },
  },
  { timestamps: true }
);

workspaceActivitySchema.index({ workspaceId: 1, createdAt: -1 });
workspaceActivitySchema.index({ caseId: 1, createdAt: -1 });
workspaceActivitySchema.index({ workspaceId: 1, caseId: 1, createdAt: -1 });

const WorkspaceActivity = mongoose.model('WorkspaceActivity', workspaceActivitySchema);
export default WorkspaceActivity;
