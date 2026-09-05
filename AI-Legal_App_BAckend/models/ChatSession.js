import mongoose from 'mongoose';


const messageSchema = new mongoose.Schema({
  id: String,
  role: {
    type: String,
    enum: ['user', 'model', 'assistant'],
    required: true
  },
  content: { type: String, required: true },
  timestamp: {
    type: mongoose.Schema.Types.Mixed,
    default: Date.now,
    set: (v) => {
      if (typeof v === 'string') return new Date(v).getTime() || Date.now();
      if (v instanceof Date) return v.getTime();
      return v;
    }
  },
  attachments: [{
    type: { type: String }, // Flexible type
    url: String,
    name: String
  }],
  imageUrl: String,
  videoUrl: String,
  conversion: {
    file: String, // base64
    blobUrl: String, // temporary url
    fileName: String,
    mimeType: String,
    fileSize: String,
    rawSize: Number,
    charCount: Number
  },
  isProcessing: Boolean,
  isRealTime: { type: Boolean, default: false },
  sources: [{
    title: String,
    url: String,
    description: String
  }],
  agentName: String,
  agentCategory: String,
  suggestions: [String]
});

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  guestId: {
    type: String,
    index: true,
    required: false
  },
  title: { type: String, default: 'New Chat' },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
    required: false
  },
  messages: [messageSchema],
  lastModified: { type: Number, default: Date.now },
  detectedMode: { type: String, default: 'NORMAL_CHAT' },
  activeTool: { type: String, required: false }, // Stores specific legal tool (e.g. legal_draft_maker)
  workspaceId: { type: String, default: 'personal_practice', index: true },
  workspaceType: { type: String, default: 'personal', index: true },
  assistantType: { type: String, default: 'assistant', index: true },
  conversationType: { type: String, enum: ['global', 'case', 'tool', 'student_tutor'], default: 'global', index: true },
  preferredLanguage: { type: String, default: null },
  isShared: { type: Boolean, default: false },
  shareId: { type: String, unique: true, sparse: true, index: true }
}, { timestamps: true });

chatSessionSchema.index({ userId: 1, lastModified: -1 });
chatSessionSchema.index({ userId: 1, conversationType: 1, lastModified: -1 });
chatSessionSchema.index({ userId: 1, conversationType: 1, projectId: 1, lastModified: -1 });
chatSessionSchema.index({ userId: 1, workspaceId: 1, lastModified: -1 });
chatSessionSchema.index({ guestId: 1, lastModified: -1 });
chatSessionSchema.index({ projectId: 1, lastModified: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession
