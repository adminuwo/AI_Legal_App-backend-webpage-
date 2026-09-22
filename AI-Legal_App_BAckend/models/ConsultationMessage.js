import mongoose from 'mongoose';

const consultationMessageSchema = new mongoose.Schema({
    consultationRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConsultationRequest',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    senderRole: {
        type: String,
        enum: ['general_user', 'advocate'],
        required: true
    },
    senderName: {
        type: String,
        default: 'User'
    },
    senderAvatar: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    attachments: [{
        name: String,
        uri: String,
        size: Number,
        mimeType: String
    }],
    isRead: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

export default mongoose.model('ConsultationMessage', consultationMessageSchema);
