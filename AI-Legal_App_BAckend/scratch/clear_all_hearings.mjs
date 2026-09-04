import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function clearAllHearings() {
    const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai_legal_db';
    await mongoose.connect(uri);
    console.log('[CLEAR HEARINGS] Connected to MongoDB.');

    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
    const result = await Project.updateMany({}, { $set: { hearings: [] } });
    console.log(`[CLEAR HEARINGS] Successfully cleared hearings across all projects! Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    await mongoose.disconnect();
}

clearAllHearings().catch(console.error);
