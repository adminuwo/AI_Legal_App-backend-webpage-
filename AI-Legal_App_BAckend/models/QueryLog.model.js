import mongoose from 'mongoose';

const QueryLogSchema = new mongoose.Schema({
    user_question: {
        type: String,
        required: true
    },
    rewritten_query: {
        type: String
    },
    retrieved_documents: [
        {
            document_title: String,
            source_type: String,
            chunk_id: String,
            snippet: String
        }
    ],
    userId: {
        type: String,
        default: 'admin'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('QueryLog', QueryLogSchema);
