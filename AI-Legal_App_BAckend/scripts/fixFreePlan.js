import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan.js';

dotenv.config();

async function fixFreePlan() {
    await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected');

    await Plan.findOneAndUpdate(
        { planId: 'free' },
        {
            $set: {
                features: [
                    'Gemini 2.5 Flash Chat',
                    'Document Analysis (Basic)',
                    'Standard Priority GPU'
                ]
            }
        }
    );
    console.log('✅ Free tier features cleaned up (chat-only features, no ❌ noise)');
    await mongoose.disconnect();
}

fixFreePlan().catch(e => { console.error(e); process.exit(1); });
