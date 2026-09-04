import mongoose from 'mongoose';

const precedentSchema = new mongoose.Schema({
    case_name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    court: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    citation: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    tags: [{
        type: String,
        trim: true,
        index: true
    }],
    facts: String,
    issue: String,
    decision: String,
    reasoning: String,
    ratio_decidendi: String,
    summary: String,
    lastExtracted: {
        type: Date,
        default: Date.now
    },
    ai_analysis: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    }
}, { 
    timestamps: true 
});

// Full text search index
precedentSchema.index({ case_name: 'text', text: 'text', citation: 'text', tags: 'text' });

const Precedent = mongoose.model('Precedent', precedentSchema);
export default Precedent;
