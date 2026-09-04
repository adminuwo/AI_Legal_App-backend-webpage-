import mongoose from 'mongoose';

const clientCaseLinkSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ClientCaseLink', clientCaseLinkSchema);
