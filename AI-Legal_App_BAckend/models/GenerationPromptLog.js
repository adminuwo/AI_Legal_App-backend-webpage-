import mongoose from 'mongoose';

const GenerationPromptLogSchema = new mongoose.Schema({
  workspaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SocialAgentWorkspace', 
    required: true,
    index: true 
  },
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'GenerationJob',
    index: true 
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedPost'
  },
  promptType: { 
    type: String, 
    enum: ['context_distillation', 'copy_generation', 'slide_brief', 'video_brief', 'hashtag_generation', 'regeneration_rewrite'],
    required: true
  },
  provider: { 
    type: String, 
    enum: ['vertex-ai', 'openai'],
    required: true 
  },
  model: { 
    type: String,
    required: true 
  },
  promptInput: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  promptOutput: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  tokensUsed: {
    input: { type: Number },
    output: { type: Number }
  }
}, { timestamps: true });

export default mongoose.model('GenerationPromptLog', GenerationPromptLogSchema);
