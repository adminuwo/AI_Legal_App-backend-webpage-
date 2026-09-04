// CommonJS-compatible one-shot plan features fix
const mongoose = require('mongoose');
require('dotenv').config();

const planSchema = new mongoose.Schema({
    planId: String,
    planName: String,
    priceMonthly: Number,
    priceYearly: Number,
    credits: Number,
    features: [String],
    badge: String,
    isPopular: Boolean,
    isActive: Boolean
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

async function run() {
    const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('Connected');

    await Plan.findOneAndUpdate({ planId: 'free' }, {
        $set: { features: ['Gemini 2.5 Flash Chat', 'Document Analysis (Basic)', 'Standard Priority GPU'] }
    });
    console.log('Free Tier updated');

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
