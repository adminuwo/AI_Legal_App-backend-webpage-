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
    // Advocate Workspace Plans
    {
        planId: 'advocate_free',
        planName: 'Advocate Free Tier',
        priceMonthly: 0,
        priceYearly: 0,
        credits: 500,
        storageGB: 1,
        features: [
            'AI Legal Chat',
            'Draft Maker (2 drafts/month)',
            'Court Prep Workspace (2 preps/month)',
            'Legal Precedent (2 searches/month)',
            'Evidence Analysis (2 analyses/month)',
            'Contract Review (2 reviews/month)',
            'Case Predictor (2 predictions/month)',
            'Strategy Engine (2 strategies/month)',
            'AI Mock Courtroom (1 session/month)',
            'AI Client Connect (1 listing)',
            'Knowledge Hub (3 files)'
        ],
        badge: 'FREE TIER',
        isPopular: false
    },
    {
        planId: 'advocate_basic',
        planName: 'Advocate Basic Plan',
        priceMonthly: 499,
        priceYearly: 4990,
        credits: 2940,
        storageGB: 5,
        features: [
            'AI Legal Chat',
            'Draft Maker (5 drafts/month)',
            'Court Prep Workspace (5 preps/month)',
            'Legal Precedent (5 searches/month)',
            'Evidence Analysis (5 analyses/month)',
            'Contract Review (5 reviews/month)',
            'Case Predictor (5 predictions/month)',
            'Strategy Engine (5 strategies/month)',
            'AI Mock Courtroom (2 sessions/month)',
            'AI Client Connect (2 listings)'
        ],
        badge: 'BASIC',
        isPopular: false
    },
    {
        planId: 'advocate_pro',
        planName: 'Advocate Pro Plan',
        priceMonthly: 999,
        priceYearly: 9990,
        credits: 5876,
        storageGB: 20,
        features: [
            'AI Legal Chat & Web Search',
            'Draft Maker (15 drafts/month)',
            'Court Prep Workspace (15 preps/month)',
            'Legal Precedent (15 searches/month)',
            'Evidence Analysis (15 analyses/month)',
            'Contract Review (15 reviews/month)',
            'Case Predictor (15 predictions/month)',
            'Strategy Engine (15 strategies/month)',
            'AI Mock Courtroom (5 sessions/month)',
            'AI Client Connect (5 listings)'
        ],
        badge: 'PRO',
        isPopular: true
    },
    {
        planId: 'advocate_premium',
        planName: 'Advocate Premium Plan',
        priceMonthly: 2399,
        priceYearly: 23990,
        credits: 14700,
        storageGB: 100,
        features: [
            'AI Legal Chat & Web Search',
            'Draft Maker (Unlimited / 500 FUP)',
            'Court Prep Workspace (Unlimited)',
            'Legal Precedent (Unlimited)',
            'Evidence Analysis (Unlimited)',
            'Contract Review (Unlimited)',
            'Case Predictor (Unlimited)',
            'Strategy Engine (Unlimited)',
            'AI Mock Courtroom (15 sessions/month)',
            'AI Client Connect (20 listings)'
        ],
        badge: 'PREMIUM',
        isPopular: false
    },

    // Student Workspace Plans
    {
        planId: 'student_free',
        planName: 'Student Free Tier',
        priceMonthly: 0,
        priceYearly: 0,
        credits: 500,
        storageGB: 0.5,
        features: [
            'AI Legal Chat',
            'Quiz & MCQ Practice (2 sets/mo)',
            'Draft Maker (1 draft/mo)',
            'Legal Precedent (1 search/mo)',
            'AI Mock Courtroom (1 session/month)',
            'AI Notes Maker (2 notes/mo)'
        ],
        badge: 'FREE TIER',
        isPopular: false
    },
    {
        planId: 'student_basic',
        planName: 'Student Basic Plan',
        priceMonthly: 499,
        priceYearly: 4990,
        credits: 2940,
        storageGB: 5,
        features: [
            'AI Legal Chat',
            'Quiz & MCQ Practice (Unlimited Quizzes)',
            'Draft Maker (5 drafts/month)',
            'Legal Precedent (5 searches/month)',
            'AI Mock Courtroom (2 sessions/month)',
            'AI Notes Maker (5 notes/mo)'
        ],
        badge: 'BASIC',
        isPopular: false
    },
    {
        planId: 'student_pro',
        planName: 'Student Pro Plan',
        priceMonthly: 999,
        priceYearly: 9990,
        credits: 5876,
        storageGB: 20,
        features: [
            'AI Legal Chat & Web Search',
            'Quiz & MCQ Practice (Unlimited Quizzes)',
            'Draft Maker (15 drafts/month)',
            'Legal Precedent (15 searches/month)',
            'AI Mock Courtroom (5 sessions/month)',
            'AI Notes Maker (15 notes/mo)'
        ],
        badge: 'PRO',
        isPopular: true
    },
    {
        planId: 'student_premium',
        planName: 'Student Premium Plan',
        priceMonthly: 2399,
        priceYearly: 23990,
        credits: 14700,
        storageGB: 50,
        features: [
            'AI Legal Chat & Web Search',
            'Quiz & MCQ Practice (Unlimited Quizzes)',
            'Draft Maker (Unlimited)',
            'Legal Precedent (Unlimited)',
            'AI Mock Courtroom (15 sessions/month)',
            'AI Notes Maker (Unlimited)'
        ],
        badge: 'PREMIUM',
        isPopular: false
    },

    // Law Firm Workspace Plans
    {
        planId: 'firm_free',
        planName: 'Law Firm Free Tier',
        priceMonthly: 0,
        priceYearly: 0,
        credits: 500,
        storageGB: 0.5,
        features: [
            'AI Legal Chat',
            'Multi-user Team Workspace (1 Member)',
            'Draft Maker (1 draft/mo)',
            'Court Prep Workspace (1 prep/mo)',
            'Legal Precedent (1 search/mo)',
            'Evidence Analysis (1 analysis/mo)',
            'Contract Review (1 review/mo)',
            'Case Predictor (1 prediction/mo)',
            'Strategy Engine (1 strategy/mo)',
            'AI Team Communication (Basic Access)',
            'Case Assignment & Task Workflow'
        ],
        badge: 'FREE TIER',
        isPopular: false
    },
    {
        planId: 'firm_basic',
        planName: 'Law Firm Basic Plan',
        priceMonthly: 1499,
        priceYearly: 14990,
        credits: 8800,
        storageGB: 25,
        features: [
            'AI Legal Chat',
            'Multi-user Team Workspace & Member Management (Up to 10 Members)',
            'Draft Maker (30 drafts/month)',
            'Court Prep Workspace (30 preps/month)',
            'Legal Precedent (30 searches/month)',
            'Evidence Analysis (30 analyses/month)',
            'Contract Review (30 reviews/month)',
            'Case Predictor (30 predictions/month)',
            'Strategy Engine (30 strategies/month)',
            'AI Team Communication (Included)',
            'Case Assignment & Task Workflow'
        ],
        badge: 'FIRM BASIC',
        isPopular: false
    },
    {
        planId: 'firm_pro',
        planName: 'Law Firm Pro Plan',
        priceMonthly: 2999,
        priceYearly: 29990,
        credits: 17600,
        storageGB: 100,
        features: [
            'AI Legal Chat & Web Search',
            'Multi-user Team Workspace & Member Management (Up to 25 Members)',
            'Draft Maker (100 drafts/month)',
            'Court Prep Workspace (100 preps/month)',
            'Legal Precedent (100 searches/month)',
            'Evidence Analysis (100 analyses/month)',
            'Contract Review (100 reviews/month)',
            'Case Predictor (100 predictions/month)',
            'Strategy Engine (100 strategies/month)',
            'AI Team Communication (Priority Firm Access)',
            'Case Assignment & Task Workflow'
        ],
        badge: 'FIRM PRO',
        isPopular: true
    },
    {
        planId: 'firm_premium',
        planName: 'Law Firm Premium Plan',
        priceMonthly: 4999,
        priceYearly: 49990,
        credits: 30000,
        storageGB: 500,
        features: [
            'AI Legal Chat & Web Search',
            'Multi-user Team Workspace & Member Management (Up to 50 Members)',
            'Draft Maker (Unlimited)',
            'Court Prep Workspace (Unlimited)',
            'Legal Precedent (Unlimited)',
            'Evidence Analysis (Unlimited)',
            'Contract Review (Unlimited)',
            'Case Predictor (Unlimited)',
            'Strategy Engine (Unlimited)',
            'AI Team Communication (Unlimited Firm Access)',
            'Case Assignment & Task Workflow'
        ],
        badge: 'FIRM PREMIUM',
        isPopular: false
    },

    // Special Combo Access Plans
    {
        planId: 'combo_student_advocate',
        planName: 'Student + Advocate Combo',
        priceMonthly: 1199,
        priceYearly: 11990,
        credits: 7050,
        storageGB: 25,
        features: [
            'Dual Access (Student + Advocate Workspaces)',
            'Quiz & MCQ Practice (Unlimited Quizzes)',
            'AI Notes Maker (20 notes/month)',
            'Draft Maker (20 drafts/month)',
            'Court Prep Workspace (20 preps/month)',
            'Legal Precedent (20 searches/month)',
            'Evidence Analysis (20 analyses/month)',
            'Contract Review (20 reviews/month)',
            'Case Predictor (20 predictions/month)',
            'Strategy Engine (20 strategies/month)',
            'AI Mock Courtroom (5 sessions/month)',
            'AI Client Connect (5 listings)'
        ],
        badge: 'COMBO',
        isPopular: false
    },
    {
        planId: 'combo_advocate_firm',
        planName: 'Advocate + Law Firm Combo',
        priceMonthly: 1499,
        priceYearly: 14990,
        credits: 8800,
        storageGB: 50,
        features: [
            'Dual Access (Advocate + Law Firm Workspaces)',
            'Up to 10 Team Members',
            'Draft Maker (30 drafts/month)',
            'Court Prep Workspace (30 preps/month)',
            'Legal Precedent (30 searches/month)',
            'Evidence Analysis (30 analyses/month)',
            'Contract Review (30 reviews/month)',
            'Case Predictor (30 predictions/month)',
            'Strategy Engine (30 strategies/month)',
            'AI Team Communication (Included)',
            'Case Assignment & Task Workflow (Included)',
            'AI Mock Courtroom (10 sessions/month)',
            'AI Client Connect (10 listings)'
        ],
        badge: 'COMBO',
        isPopular: true
    },
    {
        planId: 'combo_all_access',
        planName: 'Combo All-Access Pass',
        priceMonthly: 2399,
        priceYearly: 23990,
        credits: 14700,
        storageGB: 100,
        features: [
            'Full Access to ALL 3 Workspaces (Student, Advocate & Law Firm)',
            'Up to 20 Team Members',
            'Quiz & MCQ Practice (Unlimited Quizzes)',
            'AI Notes Maker (Unlimited)',
            'Draft Maker (Unlimited)',
            'Court Prep Workspace (Unlimited)',
            'Legal Precedent (Unlimited)',
            'Evidence Analysis (Unlimited)',
            'Contract Review (Unlimited)',
            'Case Predictor (Unlimited)',
            'Strategy Engine (Unlimited)',
            'AI Team Communication (Unlimited)',
            'Case Assignment & Task Workflow (Included)',
            'AI Mock Courtroom (15 sessions/month)',
            'AI Client Connect (20 listings)'
        ],
        badge: 'ALL ACCESS',
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
