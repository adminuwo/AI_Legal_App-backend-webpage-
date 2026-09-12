import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Knowledge from '../models/Knowledge.model.js';
dotenv.config();

async function checkUris() {
    await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI);
    const docs = await Knowledge.find({}).lean();
    for (const d of docs) {
        console.log(`Doc filename: "${d.filename}" | gcsUri: "${d.gcsUri}"`);
    }
    await mongoose.disconnect();
}
checkUris();
