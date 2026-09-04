import mongoose from 'mongoose';

const studentNoteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        originalInput: {
            type: String,
            default: '',
        },
        inputSource: {
            type: String,
            default: 'manual',
        },
        academicLevel: {
            type: String,
            default: 'BA LLB',
        },
        noteFormat: {
            type: String,
            default: 'Short Notes',
        },
        generatedNotes: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            default: 'English',
        },
    },
    { timestamps: true }
);

export default mongoose.model('StudentNote', studentNoteSchema);
