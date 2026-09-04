import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan.js';

dotenv.config();

async function updateFreePlan() {
    await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Plan.findOneAndUpdate(
        { planId: 'free' },
        {
            $set: {
                credits: 500,
                features: [
                    'Gemini 2.5 Flash Chat',
                    'Document Analysis (Basic)',
                    'Standard Priority GPU',
                    '❌ No Image Generation',
                    '❌ No Video Generation'
                ]
            }
        },
        { new: true }
    );

    console.log('✅ Free Plan Updated:');
    console.log('  Name:', result.planName);
    console.log('  Credits:', result.credits);
    console.log('  Features:', result.features);

    await mongoose.disconnect();
    console.log('🔌 Disconnected');
}

updateFreePlan().catch(e => { console.error('❌', e.message); process.exit(1); });
