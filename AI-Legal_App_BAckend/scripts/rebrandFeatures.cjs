// Rebrand all plan feature texts from Gemini/Imagen/Veo → AISA branding
const mongoose = require('mongoose');
require('dotenv').config();

const planSchema = new mongoose.Schema({
    planId: String, planName: String, priceMonthly: Number, priceYearly: Number,
    credits: Number, features: [String], badge: String, isPopular: Boolean, isActive: Boolean
}, { timestamps: true });
const Plan = mongoose.model('Plan', planSchema);

const REBRANDED = {
    free: {
        features: [
            'AISA Chat (Basic)',
            'AISA Doc Analysis (Basic)',
            'Standard Priority GPU'
        ]
    },
    starter: {
        features: [
            'AISA Chat (Priority)',
            'AISA Image HD Access',
            'AISA Video Fast (1080p)',
            'AISA Deep Search',
            'Advanced Document Suite'
        ]
    },
    founder: {
        features: [
            'Founder Exclusive Badge',
            'AISA Image Ultra Access',
            'AISA Video Fast (4K UHD)',
            'AISA Edit Image',
            'Priority GPU Allocation',
            'Up to 1M Context Window'
        ]
    },
    pro: {
        features: [
            'AISA Video Pro (Cinematic)',
            'All Visuals at 4K Resolution',
            'Expert Code Execution Suite',
            'Private Knowledge Bases',
            'AISA Image Ultra (Photorealism)'
        ]
    },
    business: {
        features: [
            'Long-form AISA Video (70s+)',
            'Team Collaboration Workspace',
            'Dedicated Account Manager',
            'Commercial Usage Rights',
            'AISA Doc Analysis Pro'
        ]
    }
};

async function run() {
    await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI);
    console.log('✅ Connected');

    for (const [planId, data] of Object.entries(REBRANDED)) {
        await Plan.findOneAndUpdate({ planId }, { $set: { features: data.features } });
        console.log(`🔄 Updated: ${planId}`);
    }

    console.log('✅ All plans rebranded to AISA!');
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
