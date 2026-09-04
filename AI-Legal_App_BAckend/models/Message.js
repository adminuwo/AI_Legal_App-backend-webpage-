import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file', 'pdf', 'docx', 'doc', 'txt', 'evidence', 'voice_note', 'system', 'ai_response'],
        default: 'text'
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    attachments: [{
        name: String,
        url: String,
        fileType: String,
        mimeType: String,
        size: String,
        bytes: Number,
        storageKey: String,
        exhibitId: String
    }],
    voiceNote: {
        url: String,
        duration: Number,
        waveform: [Number]
    },
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    forwardedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    pinned: {
        type: Boolean,
        default: false
    },
    isAiGenerated: {
        type: Boolean,
        default: false
    },
    smartActions: {
        convertedType: { type: String, enum: ['task', 'hearing', 'note', 'reminder', 'none'], default: 'none' },
        convertedId: { type: String, default: '' },
        convertedTitle: { type: String, default: '' }
    }
}, {
    timestamps: true
});

export default mongoose.model('Message', MessageSchema);
