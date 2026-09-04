import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan.js';
import CreditPackage from '../models/CreditPackage.js';

dotenv.config();

const UPDATED_PLANS = [
    {
        planId: 'free',
        planName: 'Free Tier',
        priceMonthly: 0,
        priceYearly: 0,
        credits: 500,
        badge: '',
        isPopular: false,
        features: [
            'AISA 2.5 Flash Chat',
            'Document Analysis (Basic)',
            'Standard Priority GPU'
        ]
    },
    {
        planId: 'starter',
        planName: 'Starter Plan',
        priceMonthly: 499,
        priceYearly: 419,
        credits: 2940,       // 50% margin (₹499 / ₹0.17 = ~2940 credits)
        badge: '',
        isPopular: false,
        features: [
            'AISA 2.5 Chat (Priority)',
            'AISA Image HD Access',
            'AISA Video Fast (1080p)',
            'AISA Deep Search Grounding',
            'Advanced Document Suite'
        ]
    },
    {
        planId: 'founder',
        planName: 'Founder Plan',
        priceMonthly: 699,
        priceYearly: 589,
        credits: 4112,       // 50% margin (₹699 / ₹0.17 = ~4112 credits)
        badge: 'Early Adopter',
        isPopular: true,
        features: [
            'Founder Exclusive Badge (Badge Only)',
            'AISA Image Ultra Access',
            'AISA Video Fast (4K UHD)',
            'Priority GPU Allocation',
            'AISA Search Grounding',
            'Up to 1M Context Window'
        ]
    },
    {
        planId: 'pro',
        planName: 'Pro Plan',
        priceMonthly: 999,
        priceYearly: 839,
        credits: 5876,       // 50% margin (₹999 / ₹0.17 = ~5876 credits)
        badge: 'Creator Choice',
        isPopular: false,
        features: [
            'AISA Video Pro (Cinematic)',
            'All Visuals at 4K Resolution',
            'Expert Code Execution Suite',
            'Private Knowledge Bases',
            'AISA Image Ultra Pro'
        ]
    },
    {
        planId: 'business',
        planName: 'Business Plan',
        priceMonthly: 2499,
        priceYearly: 2099,
        credits: 14700,      // 50% margin (₹2499 / ₹0.17 = ~14700 credits)
        badge: 'Enterprise Ready',
        isPopular: false,
        features: [
            'AISA Video Expert (Pro+)',
            'Team Collaboration Workspace',
            'Dedicated Account Manager',
            'Commercial Usage Rights',
            'Bulk Document Analysis Pro'
        ]
    }
];

const UPDATED_PACKAGES = [
    {
        packageId: 'EXTRA_500',
        packageName: 'Starter Credit Pack',
        price: 89,
        credits: 500,        // ~₹0.17/credit
        isActive: true
    },
    {
        packageId: 'EXTRA_1200',
        packageName: 'Plus Credit Pack',
        price: 199,
        credits: 1200,       // ~₹0.165/credit (Bulk discount)
        isActive: true
    },
    {
        packageId: 'EXTRA_2000',
        packageName: 'Ultimate Credit Pack',
        price: 339,
        credits: 2000,       // ~₹0.169/credit (Bulk price)
        isActive: true
    }
];

async function updateDb() {
    try {
        await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Update Plans
        let planUpdates = 0;
        for (const planData of UPDATED_PLANS) {
            await Plan.updateOne(
                { planId: planData.planId },
                { $set: { ...planData, isActive: true } },
                { upsert: true }
            );
            console.log(`🔄 Plan: ${planData.planName} → ${planData.credits} credits`);
            planUpdates++;
        }

        // 2. Update Packages
        await CreditPackage.deleteMany({}); // Clear existing to ensure only 3 options remain
        console.log('🗑️  Cleared old credit packages');

        let packageUpdates = 0;
        for (const pkgData of UPDATED_PACKAGES) {
            await CreditPackage.updateOne(
                { packageId: pkgData.packageId },
                { $set: pkgData },
                { upsert: true }
            );
            console.log(`📦 Package: ${pkgData.packageName} → ${pkgData.credits} credits`);
            packageUpdates++;
        }

        console.log(`\n✅ Done! ${planUpdates} plans and ${packageUpdates} packages updated.`);
        console.log('\n📊 All credit allocations now reflect a 50% profit margin based on ₹0.17/credit retail value.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

updateDb();
