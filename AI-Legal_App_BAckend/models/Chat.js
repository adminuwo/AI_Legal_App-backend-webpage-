import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    chatName: {
        type: String,
        trim: true,
        required: true
    },
    isGroupChat: {
        type: Boolean,
        default: false
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        index: true
    },
    workspaceId: {
        type: String,
        default: 'personal_practice',
        index: true
    },
    isCaseChat: {
        type: Boolean,
        default: false
    },
    pinnedMessages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }]
}, {
    timestamps: true
});

export default mongoose.model('Chat', ChatSchema);
