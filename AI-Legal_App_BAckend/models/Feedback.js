import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    sessionId: {
        type: String,
        required: false
    },
    messageId: {
        type: String,
        required: false
    },
    type: {
        type: String,
        enum: ['thumbs_up', 'thumbs_down', 'gatekeeper_positive', 'gatekeeper_negative'],
        required: true
    },
    platform: {
        type: String,
        enum: ['mobile_app', 'web_app', 'unknown'],
        default: 'unknown'
    },
    userEmail: {
        type: String,
        required: false
    },
    userName: {
        type: String,
        required: false
    },
    rating: {
        type: Number,
        required: false
    },
    categories: [{
        type: String
    }],
    details: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
