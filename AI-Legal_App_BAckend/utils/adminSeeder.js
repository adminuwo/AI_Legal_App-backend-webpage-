import Plan from '../models/Plan.js';
import AdminSettings from '../models/AdminSettings.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import FeatureRequest from '../models/FeatureRequest.js';
import BugReport from '../models/BugReport.js';
import mongoose from 'mongoose';

export const seedAdminData = async () => {
    try {
        // 1. Seed plans if empty
        const planCount = await Plan.countDocuments();
        if (planCount === 0) {
            console.log('[Seeder] Seeding default plans...');
            const defaultPlans = [
                {
                    planId: 'starter_plan',
                    planName: 'Starter',
                    priceMonthly: 19,
                    priceYearly: 199,
                    priceYearlyPerMonth: 16,
                    credits: 100,
                    creditsYearly: 1200,
                    features: ['Basic Legal Chat', 'Contract Analysis (Up to 5MB)', '5 Case Workspaces', 'Standard OCR processing'],
                    badge: 'Starter',
                    isPopular: false,
                    isActive: true
                },
                {
                    planId: 'pro_plan',
                    planName: 'Professional',
                    priceMonthly: 49,
                    priceYearly: 499,
                    priceYearlyPerMonth: 41,
                    credits: 300,
                    creditsYearly: 3600,
                    features: ['Unlimited Legal Chat', 'Advanced Contract Analysis (No limit)', 'Unlimited Workspaces', 'High-priority OCR', 'Court Prep Assistant'],
                    badge: 'Professional',
                    isPopular: true,
                    isActive: true
                },
                {
                    planId: 'enterprise_plan',
                    planName: 'Enterprise',
                    priceMonthly: 149,
                    priceYearly: 1499,
                    priceYearlyPerMonth: 124,
                    credits: 1000,
                    creditsYearly: 12000,
                    features: ['All Professional features', 'Custom model training', 'Dedicated support advocate', 'Custom API access', 'Unlimited storage'],
                    badge: 'Enterprise',
                    isPopular: false,
                    isActive: true
                },
                {
                    planId: 'custom_plan',
                    planName: 'Custom',
                    priceMonthly: 0,
                    priceYearly: 0,
                    priceYearlyPerMonth: 0,
                    credits: 0,
                    creditsYearly: 0,
                    features: ['Tailored credit limits', 'Custom API integrations', 'White-labeled mobile apps', 'SLA agreements'],
                    badge: 'Custom',
                    isPopular: false,
                    isActive: true
                }
            ];
            await Plan.insertMany(defaultPlans);
            console.log('[Seeder] Seeding default plans complete.');
        }

        // 2. Seed AdminSettings if empty
        const settingsCount = await AdminSettings.countDocuments();
        if (settingsCount === 0) {
            console.log('[Seeder] Seeding default admin settings...');
            await AdminSettings.create({
                maintenanceMode: false,
                sessionTimeout: 30,
                platformName: 'AI Legal™ Pro',
                supportEmail: 'support@aisa24.com',
                smtp: {
                    host: 'smtp.mailtrap.io',
                    port: 2525,
                    user: 'admin_test',
                    pass: 'admin_pass'
                },
                apiKeys: {
                    openai: 'sk-proj-test1234567890',
                    razorpayId: 'rzp_test_123456',
                    razorpaySecret: 'secret_123456'
                },
                aiModel: 'gpt-4-turbo',
                defaultCredits: 50,
                fileUploadLimitMb: 25,
                storageLimitGb: 5
            });
            console.log('[Seeder] Seeding default admin settings complete.');
        }

        // 3. Seed sample payments if empty
        const paymentCount = await Payment.countDocuments();
        if (paymentCount === 0) {
            console.log('[Seeder] Seeding sample payments for analytics...');
            const defaultPlanObj = await Plan.findOne({ planId: 'pro_plan' });
            const userObj = await User.findOne({ email: 'admin@uwo24.com' }) || await User.findOne({});
            
            if (defaultPlanObj && userObj) {
                const samplePayments = [
                    {
                        userId: userObj._id,
                        planId: defaultPlanObj._id,
                        invoiceNumber: 'INV-2026-001',
                        amount: 49,
                        gst: 8.82,
                        gateway: 'Razorpay',
                        transactionId: 'pay_TXN123456789',
                        status: 'success',
                        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                    },
                    {
                        userId: userObj._id,
                        planId: defaultPlanObj._id,
                        invoiceNumber: 'INV-2026-002',
                        amount: 49,
                        gst: 8.82,
                        gateway: 'Razorpay',
                        transactionId: 'pay_TXN123456790',
                        status: 'success',
                        createdAt: new Date()
                    }
                ];
                await Payment.insertMany(samplePayments);
                console.log('[Seeder] Seeding sample payments complete.');
            }
        }

        // 4. Seed FeatureRequests if empty
        const featureCount = await FeatureRequest.countDocuments();
        if (featureCount === 0) {
            console.log('[Seeder] Seeding default feature requests into DB...');
            const adminUser = await User.findOne({}) || { _id: new mongoose.Types.ObjectId(), email: 'aditi@uwo24.com' };
            await FeatureRequest.insertMany([
                {
                    title: 'Supreme Court AI Case Outcome Predictor',
                    description: 'Enable multi-bench historical analytics for landmark Constitutional bench judgements.',
                    requestedBy: adminUser._id,
                    email: adminUser.email || 'anmol.advocate@gmail.com',
                    userPlan: 'Advocate Pro',
                    priority: 'Critical',
                    category: 'Court AI Assistant',
                    status: 'Planned',
                    developerAssigned: 'Vikram AI Dev',
                    reply: 'Scheduled for v3.2 release cycle.'
                },
                {
                    title: 'Bulk PDF Vernacular OCR (Hindi, Marathi, Tamil)',
                    description: 'Support batch processing of scanned court orders in 12 regional languages.',
                    requestedBy: adminUser._id,
                    email: 'aditi@uwo24.com',
                    userPlan: 'Enterprise Pro',
                    priority: 'Important',
                    category: 'Document Intelligence',
                    status: 'In Progress',
                    developerAssigned: 'OCR Engineering Team'
                },
                {
                    title: 'Custom Law Firm Letterhead Watermark Engine',
                    description: 'Allow advocates to embed custom PNG logos on generated Legal Notices.',
                    requestedBy: adminUser._id,
                    email: 'rajesh.law@outlook.com',
                    userPlan: 'Firm Pro',
                    priority: 'Nice to Have',
                    category: 'Drafting Engine',
                    status: 'Completed',
                    reply: 'Feature live in production!'
                }
            ]);
        }

        // 5. Seed BugReports if empty
        const bugCount = await BugReport.countDocuments();
        if (bugCount === 0) {
            console.log('[Seeder] Seeding default bug reports into DB...');
            const adminUser = await User.findOne({}) || { _id: new mongoose.Types.ObjectId(), email: 'aditi@uwo24.com' };
            await BugReport.insertMany([
                {
                    title: 'High Court Case Precedent Search Timeout',
                    description: 'Queries over 500 pages of judgment text experience HTTP 504 gateway timeouts.',
                    reporter: adminUser._id,
                    email: 'anmol.advocate@gmail.com',
                    device: 'Samsung S24 Ultra',
                    platform: 'Android',
                    osVersion: 'Android 14',
                    severity: 'Critical',
                    status: 'Assigned',
                    developerAssigned: 'Cloud Infra Team',
                    internalNotes: 'Increasing timeout window to 45s on API Gateway.'
                },
                {
                    title: 'PDF OCR Alignment in Vernacular Hindi Drafts',
                    description: 'Hindi font glyphs occasionally misalign during PDF generation.',
                    reporter: adminUser._id,
                    email: 'priya.mehta@juris.in',
                    device: 'MacBook Pro M3',
                    platform: 'Web',
                    osVersion: 'macOS 15',
                    severity: 'Major',
                    status: 'Open',
                    developerAssigned: 'Frontend Lead'
                }
            ]);
        }
    } catch (error) {
        console.error('[Seeder] Error during data seeding:', error);
    }
};
