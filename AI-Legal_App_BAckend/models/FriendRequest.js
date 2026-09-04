import mongoose from 'mongoose';

const FriendRequestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Ensure a user cannot send duplicate requests to the same user
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export default mongoose.model('FriendRequest', FriendRequestSchema);
