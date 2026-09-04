import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function clearAllActivities() {
    const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai_legal_db';
    await mongoose.connect(uri);
    console.log('[CLEAR ACTIVITIES] Connected to MongoDB.');

    const WorkspaceActivity = mongoose.model('WorkspaceActivity', new mongoose.Schema({}, { strict: false }));
    const result = await WorkspaceActivity.deleteMany({});
    console.log(`[CLEAR ACTIVITIES] Successfully deleted all activity logs! Deleted count: ${result.deletedCount}`);

    await mongoose.disconnect();
}

clearAllActivities().catch(console.error);
