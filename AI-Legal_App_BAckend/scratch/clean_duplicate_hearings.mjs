import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config();

async function cleanDuplicateHearings() {
    const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai_legal_db';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
    const project = await Project.findById('6a61c6ef82b45c69bfb69066');

    if (project && Array.isArray(project.hearings)) {
        const seen = new Set();
        const uniqueHearings = [];
        for (const h of project.hearings) {
            const key = `${h.title || h.purpose}_${h.date}_${h.time}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueHearings.push(h);
            }
        }
        console.log(`Original count: ${project.hearings.length}, Unique count: ${uniqueHearings.length}`);
        project.hearings = uniqueHearings;
        project.markModified('hearings');
        await project.save();
        console.log('Deduplicated hearings saved successfully!');
    }

    await mongoose.disconnect();
}

cleanDuplicateHearings().catch(console.error);
