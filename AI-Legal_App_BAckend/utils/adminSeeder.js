import Plan from '../models/Plan.js';
import AdminSettings from '../models/AdminSettings.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const seedAdminData = async () => {
    try {
        // 0. Seed or self-heal dedicated Web Admin user (admin@uwo24.com / Admin@24)
        const adminEmail = 'admin@uwo24.com';
        const hashedPassword = await bcrypt.hash('Admin@24', 10);
        let adminUser = await User.findOne({ email: adminEmail }).select('+password');

        if (!adminUser) {
            console.log('[Seeder] Creating dedicated Web Admin user: admin@uwo24.com...');
            await User.create({
                name: 'AI Legal Admin',
                fullName: 'AI Legal Administrator',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                subscription: { plan: 'ENTERPRISE', status: 'active', autoRenew: true },
                credits: 99999,
                isVerified: true
            });
            console.log('[Seeder] admin@uwo24.com created successfully with role admin.');
        } else {
            const isMatch = adminUser.password ? await bcrypt.compare('Admin@24', adminUser.password) : false;
            if (!isMatch || adminUser.role !== 'admin' || !adminUser.isVerified || adminUser.subscription?.plan !== 'ENTERPRISE') {
                adminUser.password = hashedPassword;
                adminUser.role = 'admin';
                adminUser.subscription = adminUser.subscription || {};
                adminUser.subscription.plan = 'ENTERPRISE';
                adminUser.subscription.status = 'active';
                adminUser.credits = 99999;
                adminUser.isVerified = true;
                adminUser.failedAttempts = 0;
                adminUser.failedLoginAttempts = 0;
                adminUser.lockoutUntil = null;
                await adminUser.save();
                console.log('[Seeder] admin@uwo24.com synced with password Admin@24 and role admin.');
            }
        }

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
                    host: process.env.SMTP_HOST || '',
                    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
                    user: process.env.SMTP_USER || '',
                    pass: process.env.SMTP_PASS || ''
                },
                apiKeys: {
                    openai: process.env.OPENAI_API_KEY || '',
                    razorpayId: process.env.RAZORPAY_KEY_ID || '',
                    razorpaySecret: process.env.RAZORPAY_KEY_SECRET || ''
                },
                aiModel: 'gpt-4-turbo',
                defaultCredits: 50,
                fileUploadLimitMb: 25,
                storageLimitGb: 5
            });
            console.log('[Seeder] Seeding default admin settings complete.');
        }

        // 3. Seed some mock payments if empty
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
                        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
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
                        createdAt: new Date() // today
                    }
                ];
                await Payment.insertMany(samplePayments);
                console.log('[Seeder] Seeding sample payments complete.');
            }
        }
    } catch (error) {
        console.error('[Seeder] Error during data seeding:', error);
    }
};
