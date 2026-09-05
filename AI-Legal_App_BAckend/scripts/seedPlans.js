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
            'Legal Precedents (2 searches/month)',
            'Contract Analyzer (2 reviews/month)',
            'Evidence Analyst (2 analyses/month)',
            'Strategy Engine (2 strategies/month)',
            'Case Predictor (2 predictions/month)',
            'Mock Courtroom (1 session/month)',
            'Client Connect (1 listing)',
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
            'Legal Precedents (5 searches/month)',
            'Contract Analyzer (5 reviews/month)',
            'Evidence Analyst (5 analyses/month)',
            'Strategy Engine (5 strategies/month)',
            'Case Predictor (5 predictions/month)',
            'Mock Courtroom (2 sessions/month)',
            'Client Connect (2 listings)'
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
            'Legal Precedents & Research Assistant (15 searches/month)',
            'Contract Analyzer (15 reviews/month)',
            'Evidence Analyst (15 analyses/month)',
            'Strategy Engine (15 strategies/month)',
            'Case Predictor (15 predictions/month)',
            'Mock Courtroom (5 sessions/month)',
            'Client Connect (5 listings)'
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
            'Legal Precedents & Research Assistant (Unlimited)',
            'Contract Analyzer (Unlimited)',
            'Evidence Analyst (Unlimited)',
            'Strategy Engine (Unlimited)',
            'Case Predictor (Unlimited)',
            'Mock Courtroom (15 sessions/month)',
            'Client Connect (20 listings)'
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
            'Quiz & Practice (2 sets/mo)',
            'Draft Maker (1 draft/mo)',
            'Legal Precedents (1 search/mo)',
            'Contract Analyzer (1 review/mo)',
            'Evidence Analyst (1 analysis/mo)'
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
            'Quiz & Practice (Unlimited Quizzes)',
            'Draft Maker (5 drafts/month)',
            'Legal Precedents (5 searches/month)',
            'Contract Analyzer (5 reviews/month)',
            'Evidence Analyst (5 analyses/month)',
            'Strategy Engine (5 strategies/month)',
            'Case Predictor (5 predictions/month)',
            'Mock Courtroom (2 sessions/month)',
            'Notes Maker (5 notes/mo)'
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
            'Quiz & Practice (Unlimited Quizzes)',
            'Draft Maker (15 drafts/month)',
            'Legal Precedents & Research Assistant (15 searches/month)',
            'Contract Analyzer (15 reviews/month)',
            'Evidence Analyst (15 analyses/month)',
            'Strategy Engine (15 strategies/month)',
            'Case Predictor (15 predictions/month)',
            'Mock Courtroom (5 sessions/month)',
            'Notes Maker (15 notes/mo)'
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
            'Quiz & Practice (Unlimited Quizzes)',
            'Draft Maker (Unlimited)',
            'Legal Precedents & Research Assistant (Unlimited)',
            'Contract Analyzer (Unlimited)',
            'Evidence Analyst (Unlimited)',
            'Strategy Engine (Unlimited)',
            'Case Predictor (Unlimited)',
            'Mock Courtroom (15 sessions/month)',
            'Notes Maker (Unlimited)'
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
            'Contract Analyzer (1 review/mo)',
            'Legal Precedents (1 search/mo)'
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
            'Legal Precedents (30 searches/month)',
            'Contract Analyzer (30 reviews/month)',
            'Evidence Analyst (30 analyses/month)',
            'Strategy Engine (30 strategies/month)',
            'Case Predictor (30 predictions/month)',
            'Mock Courtroom (10 sessions/month)',
            'Client Connect (10 listings)',
            'Case Assignment & Member Task Workflow'
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
            'Legal Precedents & Research Assistant (100 searches/month)',
            'Contract Analyzer (100 reviews/month)',
            'Evidence Analyst (100 analyses/month)',
            'Strategy Engine (100 strategies/month)',
            'Case Predictor (100 predictions/month)',
            'Mock Courtroom (25 sessions/month)',
            'Client Connect (25 listings)',
            'Case Assignment & Member Task Workflow'
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
            'Legal Precedents & Research Assistant (Unlimited)',
            'Contract Analyzer (Unlimited)',
            'Evidence Analyst (Unlimited)',
            'Strategy Engine (Unlimited)',
            'Case Predictor (Unlimited)',
            'Mock Courtroom (50 sessions/month)',
            'Client Connect (50 listings)',
            'Case Assignment & Member Task Workflow'
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
            'Quiz & Practice (Unlimited Quizzes)',
            'Draft Maker & Contract Analyzer (20/month)',
            'Legal Precedents (20/month)',
            'Mock Courtroom (5 sessions/month)',
            'Client Connect (5 listings)'
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
            'Draft Maker & Contract Analyzer (30/month)',
            'Legal Precedents (30/month)',
            'Mock Courtroom (10 sessions/month)',
            'Client Connect (10 listings)',
            'Case Assignment Workflow'
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
            'Quiz & Practice (Unlimited Quizzes)',
            'Draft Maker & Contract Analyzer (Unlimited)',
            'Legal Precedents & Research Assistant (Unlimited)',
            'Mock Courtroom (15 sessions/month)',
            'Client Connect (20 listings)',
            'Case Assignment Workflow'
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
