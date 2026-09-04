import mongoose from 'mongoose';

const conversationMessageSchema = new mongoose.Schema({
  conversation_id: {
    type: String,
    required: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest users
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'model'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('ConversationMessage', conversationMessageSchema);
