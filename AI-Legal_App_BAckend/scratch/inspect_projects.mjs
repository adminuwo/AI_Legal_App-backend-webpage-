import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_legal';

async function checkCasesInDB() {
    try {
        await mongoose.connect(MONGO_URI);
        const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));

        const cases = await Project.find({
            name: { $regex: /RAJESH/i }
        }).lean();

        console.log('\n=== ALL CASES WITH "RAJESH" IN DB ===\n');
        cases.forEach(c => {
            console.log({
                _id: c._id.toString(),
                name: c.name,
                userId: c.userId,
                role: c.role,
                workspaceType: c.workspaceType,
                workspaceId: c.workspaceId,
                createdAt: c.createdAt
            });
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkCasesInDB();
