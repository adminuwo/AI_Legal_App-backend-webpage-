import mongoose from 'mongoose';
import Plan from '../models/Plan.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const plans = [
    {
        planId: 'free',
        planName: 'Free Tier',
        priceMonthly: 0,
        priceYearly: 0,
        credits: 500,
        features: [
            'Gemini 2.5 Flash Chat',
            'Imagen 3.0 (1080p)',
            'Document Analysis (Basic)',
            'Standard Priority GPU'
        ],
        badge: '',
        isPopular: false
    },
    {
        planId: 'starter',
        planName: 'Starter',
        priceMonthly: 499,
        priceYearly: 4990,
        credits: 5800,
        features: [
            'Gemini 2.5 Chat (Priority)',
            'Imagen 3.0 Access',
            'Veo 3.1 Fast (1080p)',
            'Deep Search Grounding',
            'Advanced Document Suite'
        ],
        badge: '',
        isPopular: false
    },
    {
        planId: 'founder',
        planName: 'Founder',
        priceMonthly: 699,
        priceYearly: 6990,
        credits: 8500,
        features: [
            'Founder Exclusive Badge (Badge Only)',
            'Imagen 4.0 Ultra Access',
            'Veo 3.1 Fast (4K UHD)',
            'Priority GPU Allocation',
            'Google Search Grounding',
            'Up to 1M Context Window'
        ],
        badge: 'Early Adopter',
        isPopular: true
    },
    {
        planId: 'pro',
        planName: 'Pro',
        priceMonthly: 999,
        priceYearly: 9990,
        credits: 12000,
        features: [
            'Veo 3.1 Full Mode (Cinematic)',
            'All Visuals at 4K Resolution',
            'Expert Code Execution Suite',
            'Private Knowledge Bases',
            'Imagen 4.0 Ultra (Photorealism)'
        ],
        badge: 'Creator Choice',
        isPopular: false
    },
    {
        planId: 'business',
        planName: 'Business',
        priceMonthly: 2499,
        priceYearly: 24990,
        credits: 32000,
        features: [
            'Long-form Video (70s+)',
            'Team Collaboration Workspace',
            'Dedicated Account Manager',
            'Commercial Usage Rights',
            'Bulk Document Analysis Pro'
        ],
        badge: 'Enterprise Ready',
        isPopular: false
    }
];

const seedPlans = async () => {
    try {
        await connectDB();
        
        // Remove existing plans
        await Plan.deleteMany({});
        console.log('Cleared existing plans.');

        // Insert new plans
        await Plan.insertMany(plans);
        console.log('Seeded 5 AISA Subscription Plans successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedPlans();
