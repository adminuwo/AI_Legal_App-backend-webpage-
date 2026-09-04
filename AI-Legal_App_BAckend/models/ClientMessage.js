import mongoose from 'mongoose';

const clientMessageSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        default: 'AI'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ClientMessage', clientMessageSchema);
