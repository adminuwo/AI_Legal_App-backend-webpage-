import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export const COUNTRY_ACCOUNTS = [
  {
    name: 'Aarav Sharma (Nepal)',
    fullName: 'Aarav Sharma',
    email: 'nepal@ailegal.app',
    passwordRaw: 'Nepal@2026',
    country: 'Nepal',
    countryCode: 'NP',
    dialCode: '+977',
    state: 'Bagmati',
    jurisdiction: 'Bagmati, Nepal',
    language: 'Nepali',
    currency: 'NPR',
    flag: '🇳🇵',
    phone: '9841234567',
    legalJurisdiction: {
      country: 'Nepal',
      countryCode: 'NP',
      state: 'Bagmati',
      jurisdictionType: 'province',
      source: 'user_selected',
      savedAt: new Date()
    },
    personalizations: {
      general: {
        language: 'Nepali',
        region: 'Nepal',
        country: 'Nepal',
        countryCode: 'NP',
        state: 'Bagmati',
        jurisdiction: 'Bagmati, Nepal',
        theme: 'Light',
        responseSpeed: 'Balanced',
        screenReader: false,
        highContrast: false,
        permissionsOnboardingCompleted: true
      },
      advocateProfile: {
        fullName: 'Aarav Sharma',
        barNumber: 'NP-BAR-2024-8841',
        stateBarCouncil: 'Nepal Bar Council (Kathmandu)',
        enrollmentYear: '2020',
        practiceExperience: '4 Years',
        primaryCourt: 'Supreme Court of Nepal / Patan High Court',
        officeName: 'Himalayan Juris Associates',
        officeAddress: 'Ramshah Path, Kathmandu, Nepal',
        city: 'Kathmandu',
        state: 'Bagmati',
        country: 'Nepal',
        practiceAreas: ['Civil Law', 'Criminal Law', 'Commercial Law']
      }
    }
  },
  {
    name: 'John Miller (USA)',
    fullName: 'John Miller',
    email: 'usa@ailegal.app',
    passwordRaw: 'America@2026',
    country: 'United States',
    countryCode: 'US',
    dialCode: '+1',
    state: 'California',
    jurisdiction: 'California, United States',
    language: 'English',
    currency: 'USD',
    flag: '🇺🇸',
    phone: '4155552671',
    legalJurisdiction: {
      country: 'United States',
      countryCode: 'US',
      state: 'California',
      jurisdictionType: 'state',
      source: 'user_selected',
      savedAt: new Date()
    },
    personalizations: {
      general: {
        language: 'English',
        region: 'United States',
        country: 'United States',
        countryCode: 'US',
        state: 'California',
        jurisdiction: 'California, United States',
        theme: 'Light',
        responseSpeed: 'Balanced',
        screenReader: false,
        highContrast: false,
        permissionsOnboardingCompleted: true
      },
      advocateProfile: {
        fullName: 'John Miller',
        barNumber: 'CA-BAR-392810',
        stateBarCouncil: 'State Bar of California',
        enrollmentYear: '2018',
        practiceExperience: '6 Years',
        primaryCourt: 'United States District Court, Northern District of California',
        officeName: 'Pacific Coast Legal Partners',
        officeAddress: '555 California St, San Francisco, CA 94104',
        city: 'San Francisco',
        state: 'California',
        country: 'United States',
        practiceAreas: ['Corporate Law', 'IPR', 'Arbitration']
      }
    }
  },
  {
    name: 'Aditi Sharma (India)',
    fullName: 'Aditi Sharma',
    email: 'india@ailegal.app',
    passwordRaw: 'India@2026',
    country: 'India',
    countryCode: 'IN',
    dialCode: '+91',
    state: 'Delhi (NCT)',
    jurisdiction: 'Delhi (NCT), India',
    language: 'Hindi',
    currency: 'INR',
    flag: '🇮🇳',
    phone: '9810234567',
    legalJurisdiction: {
      country: 'India',
      countryCode: 'IN',
      state: 'Delhi (NCT)',
      jurisdictionType: 'union_territory',
      source: 'user_selected',
      savedAt: new Date()
    },
    personalizations: {
      general: {
        language: 'Hindi',
        region: 'India',
        country: 'India',
        countryCode: 'IN',
        state: 'Delhi (NCT)',
        jurisdiction: 'Delhi (NCT), India',
        theme: 'Light',
        responseSpeed: 'Balanced',
        screenReader: false,
        highContrast: false,
        permissionsOnboardingCompleted: true
      },
      advocateProfile: {
        fullName: 'Aditi Sharma',
        barNumber: 'D/4819/2019',
        stateBarCouncil: 'Bar Council of Delhi',
        enrollmentYear: '2019',
        practiceExperience: '5 Years',
        primaryCourt: 'Supreme Court of India / High Court of Delhi',
        officeName: 'Sharma & Chambers Law Offices',
        officeAddress: 'Chamber No. 412, Supreme Court Compound, New Delhi',
        city: 'New Delhi',
        state: 'Delhi (NCT)',
        country: 'India',
        practiceAreas: ['Constitutional Law', 'Criminal Law', 'Civil Law']
      }
    }
  },
  {
    name: 'Oliver Smith (UK)',
    fullName: 'Oliver Smith',
    email: 'uk@ailegal.app',
    passwordRaw: 'UkLegal@2026',
    country: 'United Kingdom',
    countryCode: 'GB',
    dialCode: '+44',
    state: 'England & Wales',
    jurisdiction: 'England & Wales, United Kingdom',
    language: 'English',
    currency: 'GBP',
    flag: '🇬🇧',
    phone: '2079460192',
    legalJurisdiction: {
      country: 'United Kingdom',
      countryCode: 'GB',
      state: 'England & Wales',
      jurisdictionType: 'national',
      source: 'user_selected',
      savedAt: new Date()
    },
    personalizations: {
      general: {
        language: 'English',
        region: 'United Kingdom',
        country: 'United Kingdom',
        countryCode: 'GB',
        state: 'England & Wales',
        jurisdiction: 'England & Wales, United Kingdom',
        theme: 'Light',
        responseSpeed: 'Balanced',
        screenReader: false,
        highContrast: false,
        permissionsOnboardingCompleted: true
      },
      advocateProfile: {
        fullName: 'Oliver Smith',
        barNumber: 'SRA-ID-629104',
        stateBarCouncil: 'Solicitors Regulation Authority (SRA) / Bar Standards Board',
        enrollmentYear: '2017',
        practiceExperience: '7 Years',
        primaryCourt: 'Royal Courts of Justice / High Court of Justice (Chancery Division)',
        officeName: 'Westminster Legal Chambers',
        officeAddress: '10 Fleet Street, London, EC4Y 1AU',
        city: 'London',
        state: 'England & Wales',
        country: 'United Kingdom',
        practiceAreas: ['Commercial Law', 'Arbitration', 'Civil Law']
      }
    }
  },
  {
    name: 'Zayed Al Mansoori (UAE)',
    fullName: 'Zayed Al Mansoori',
    email: 'uae@ailegal.app',
    passwordRaw: 'UaeLegal@2026',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    dialCode: '+971',
    state: 'Dubai',
    jurisdiction: 'Dubai, United Arab Emirates',
    language: 'English',
    currency: 'AED',
    flag: '🇦🇪',
    phone: '501234567',
    legalJurisdiction: {
      country: 'United Arab Emirates',
      countryCode: 'AE',
      state: 'Dubai',
      jurisdictionType: 'emirate',
      source: 'user_selected',
      savedAt: new Date()
    },
    personalizations: {
      general: {
        language: 'English',
        region: 'United Arab Emirates',
        country: 'United Arab Emirates',
        countryCode: 'AE',
        state: 'Dubai',
        jurisdiction: 'Dubai, United Arab Emirates',
        theme: 'Light',
        responseSpeed: 'Balanced',
        screenReader: false,
        highContrast: false,
        permissionsOnboardingCompleted: true
      },
      advocateProfile: {
        fullName: 'Zayed Al Mansoori',
        barNumber: 'MOJ-UAE-48192',
        stateBarCouncil: 'UAE Ministry of Justice / Dubai Legal Affairs Department',
        enrollmentYear: '2016',
        practiceExperience: '8 Years',
        primaryCourt: 'Dubai Courts (Court of Cassation) / DIFC Courts',
        officeName: 'Al Mansoori & Associates Advocates',
        officeAddress: 'Level 14, Burj Daman, DIFC, Dubai, UAE',
        city: 'Dubai',
        state: 'Dubai',
        country: 'United Arab Emirates',
        practiceAreas: ['Commercial Law', 'Arbitration', 'Property Law']
      }
    }
  }
];

export async function seedCountryAccounts() {
  try {
    console.log('Connecting to MongoDB database...');
    await connectDB();

    console.log('Fetching active premium plan for initial subscription assignment...');
    const premiumPlan = await Plan.findOne({
      $or: [
        { planName: /Premium/i },
        { planName: /Pro/i }
      ]
    });

    const planId = premiumPlan ? premiumPlan._id : null;
    const planName = premiumPlan ? premiumPlan.planName : 'Advocate Pro Plan';
    console.log(`Using plan: ${planName} (${planId || 'default'})`);

    for (const acc of COUNTRY_ACCOUNTS) {
      console.log(`\nProcessing account: ${acc.flag} ${acc.name} (${acc.email})...`);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(acc.passwordRaw, salt);

      const updateData = {
        name: acc.name,
        fullName: acc.fullName,
        email: acc.email.toLowerCase().trim(),
        password: hashedPassword,
        country: acc.country,
        countryCode: acc.countryCode,
        dialCode: acc.dialCode,
        phone: acc.phone,
        state: acc.state,
        jurisdiction: acc.jurisdiction,
        legalJurisdiction: acc.legalJurisdiction,
        personalizations: acc.personalizations,
        isVerified: true,
        role: 'user',
        plan: planName,
        credits: 100000,
        accountStatus: 'active',
        failedAttempts: 0,
        lockoutUntil: null,
        notificationsInbox: [
          {
            id: `welcome_${Date.now()}`,
            title: `Welcome to AI LEGAL™ (${acc.country})!`,
            desc: `Your legal workspace is strictly configured for ${acc.jurisdiction}. Statutory provisions and case intelligence are locked to ${acc.country}.`,
            type: 'promo',
            time: new Date(),
            isRead: false
          }
        ]
      };

      const user = await User.findOneAndUpdate(
        { email: acc.email.toLowerCase().trim() },
        { $set: updateData },
        { upsert: true, new: true, runValidators: false }
      );

      console.log(`✅ User saved: ${user._id} | Country: ${user.country} (${user.countryCode}) | State: ${user.state}`);

      // Setup/Update Active Subscription with credits
      if (planId) {
        await Subscription.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              userId: user._id,
              planId: planId,
              subscriptionStatus: 'active',
              status: 'active',
              startDate: new Date(),
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year active
              creditsRemaining: 100000,
              billingCycle: 'yearly',
              tier: 'pro'
            }
          },
          { upsert: true, new: true }
        );
        console.log(`✅ Subscription created/updated with 100,000 credits.`);
      }
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 5 COUNTRY ACCOUNTS SEEDED SUCCESSFULLY IN DB!');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run directly if invoked from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedCountryAccounts().then(() => {
    process.exit(0);
  });
}
