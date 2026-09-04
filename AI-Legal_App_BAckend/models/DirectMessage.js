import mongoose from 'mongoose';

const DirectMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isAi: {
        type: Boolean,
        default: false
    },
    aiChatPartners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }]
}, {
    timestamps: true
});

export default mongoose.model('DirectMessage', DirectMessageSchema);
