import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export const SEED_VERIFIED_ADVOCATES = [
    {
        name: 'Adv. Rajeshwar Sen',
        fullName: 'Adv. Rajeshwar Sen',
        email: 'adv.rajeshwar@ailegal.app',
        passwordRaw: 'Advocate@2026',
        country: 'India',
        countryCode: 'IN',
        state: 'Delhi',
        phone: '+91 98101 23456',
        avatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&auto=format&fit=crop&q=80',
        advocateVerification: {
            verificationStatus: 'verified',
            listingConsent: 'accepted',
            verifiedAt: new Date(),
            consultationFee: 2000,
            consultationTypes: ['chat', 'audio', 'video', 'in_person'],
            availability: 'Available Today',
            languages: ['English', 'Hindi', 'Bengali'],
            bio: 'Senior Litigation Advocate with over 16 years of courtroom practice in Supreme Court and Delhi High Court specializing in Constitutional, Criminal, and Commercial disputes.',
            primaryCourts: ['Supreme Court of India', 'Delhi High Court'],
            practiceAreas: ['Criminal Law', 'Commercial Law', 'Constitutional Law', 'Cyber Law'],
            experienceYears: '16+ Years',
            barCouncil: 'Bar Council of Delhi (D/1420/2008)',
            rating: 4.95,
            totalConsultations: 128
        },
        personalizations: {
            advocateProfile: {
                fullName: 'Adv. Rajeshwar Sen',
                barNumber: 'D/1420/2008',
                stateBarCouncil: 'Bar Council of Delhi',
                enrollmentYear: '2008',
                practiceExperience: '16+ Years',
                primaryCourt: 'Supreme Court of India',
                practiceAreas: ['Criminal Law', 'Commercial Law', 'Constitutional Law', 'Cyber Law'],
                languagesKnown: 'English, Hindi, Bengali',
                bio: 'Senior Litigation Advocate with over 16 years of courtroom practice in Supreme Court and Delhi High Court.'
            }
        }
    },
    {
        name: 'Adv. Priya Deshmukh',
        fullName: 'Adv. Priya Deshmukh',
        email: 'adv.priya@ailegal.app',
        passwordRaw: 'Advocate@2026',
        country: 'India',
        countryCode: 'IN',
        state: 'Maharashtra',
        phone: '+91 98202 34567',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        advocateVerification: {
            verificationStatus: 'verified',
            listingConsent: 'accepted',
            verifiedAt: new Date(),
            consultationFee: 1500,
            consultationTypes: ['chat', 'audio', 'video'],
            availability: 'Available Today',
            languages: ['English', 'Hindi', 'Marathi'],
            bio: 'Advocate specializing in Family Law, Matrimonial Mediation, Child Custody, and Domestic Property Disputes with 11 years of experience at Bombay High Court.',
            primaryCourts: ['Bombay High Court', 'Mumbai Family Court'],
            practiceAreas: ['Family Law', 'Property Law', 'Consumer Law', 'Mediation'],
            experienceYears: '11+ Years',
            barCouncil: 'Bar Council of Maharashtra & Goa (MAH/894/2013)',
            rating: 4.9,
            totalConsultations: 94
        },
        personalizations: {
            advocateProfile: {
                fullName: 'Adv. Priya Deshmukh',
                barNumber: 'MAH/894/2013',
                stateBarCouncil: 'Bar Council of Maharashtra & Goa',
                enrollmentYear: '2013',
                practiceExperience: '11+ Years',
                primaryCourt: 'Bombay High Court',
                practiceAreas: ['Family Law', 'Property Law', 'Consumer Law', 'Mediation'],
                languagesKnown: 'English, Hindi, Marathi',
                bio: 'Specialist in Family Law, Matrimonial Mediation, and Property Settlements.'
            }
        }
    },
    {
        name: 'Adv. Vikramaditya Reddy',
        fullName: 'Adv. Vikramaditya Reddy',
        email: 'adv.vikram@ailegal.app',
        passwordRaw: 'Advocate@2026',
        country: 'India',
        countryCode: 'IN',
        state: 'Karnataka',
        phone: '+91 98450 45678',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        advocateVerification: {
            verificationStatus: 'verified',
            listingConsent: 'accepted',
            verifiedAt: new Date(),
            consultationFee: 1800,
            consultationTypes: ['chat', 'video', 'in_person'],
            availability: 'Available Tomorrow',
            languages: ['English', 'Hindi', 'Kannada', 'Telugu'],
            bio: 'Specialist in Corporate Governance, Contract Advisory, Intellectual Property (IPR), and Technology Law with 9 years of active chamber practice.',
            primaryCourts: ['Karnataka High Court', 'NCLT Bengaluru'],
            practiceAreas: ['Contract Law', 'Cyber Law', 'Commercial Law', 'Employment Law'],
            experienceYears: '9+ Years',
            barCouncil: 'Bar Council of Karnataka (KAR/612/2015)',
            rating: 4.88,
            totalConsultations: 76
        },
        personalizations: {
            advocateProfile: {
                fullName: 'Adv. Vikramaditya Reddy',
                barNumber: 'KAR/612/2015',
                stateBarCouncil: 'Bar Council of Karnataka',
                enrollmentYear: '2015',
                practiceExperience: '9+ Years',
                primaryCourt: 'Karnataka High Court',
                practiceAreas: ['Contract Law', 'Cyber Law', 'Commercial Law', 'Employment Law'],
                languagesKnown: 'English, Hindi, Kannada, Telugu',
                bio: 'Advising businesses, startups, and individuals on contract risk and digital compliance.'
            }
        }
    },
    {
        name: 'Adv. Ananya Roy',
        fullName: 'Adv. Ananya Roy',
        email: 'adv.ananya@ailegal.app',
        passwordRaw: 'Advocate@2026',
        country: 'India',
        countryCode: 'IN',
        state: 'Delhi',
        phone: '+91 98110 56789',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
        advocateVerification: {
            verificationStatus: 'verified',
            listingConsent: 'accepted',
            verifiedAt: new Date(),
            consultationFee: 1200,
            consultationTypes: ['chat', 'audio', 'video'],
            availability: 'Available Today',
            languages: ['English', 'Hindi'],
            bio: 'Consumer Protection, Employment disputes, and Tenancy/Rent Law practitioner before Delhi District Courts and State Consumer Commission.',
            primaryCourts: ['Delhi High Court', 'Delhi District Courts'],
            practiceAreas: ['Consumer Law', 'Employment Law', 'Property Law', 'Civil Law'],
            experienceYears: '7+ Years',
            barCouncil: 'Bar Council of Delhi (D/2104/2017)',
            rating: 4.92,
            totalConsultations: 110
        },
        personalizations: {
            advocateProfile: {
                fullName: 'Adv. Ananya Roy',
                barNumber: 'D/2104/2017',
                stateBarCouncil: 'Bar Council of Delhi',
                enrollmentYear: '2017',
                practiceExperience: '7+ Years',
                primaryCourt: 'Delhi District Courts',
                practiceAreas: ['Consumer Law', 'Employment Law', 'Property Law', 'Civil Law'],
                languagesKnown: 'English, Hindi',
                bio: 'Passionate advocate helping individuals assert their consumer, tenancy, and workplace rights.'
            }
        }
    }
];

async function seed() {
    try {
        await connectDB();
        console.log('[Seed] Connected to database.');

        for (const advData of SEED_VERIFIED_ADVOCATES) {
            let user = await User.findOne({ email: advData.email });
            if (!user) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(advData.passwordRaw, salt);
                user = new User({
                    name: advData.name,
                    fullName: advData.fullName,
                    email: advData.email,
                    password: hashedPassword,
                    country: advData.country,
                    countryCode: advData.countryCode,
                    state: advData.state,
                    phone: advData.phone,
                    avatar: advData.avatar,
                    isVerified: true,
                    role: 'user',
                    accountStatus: 'active',
                    advocateVerification: advData.advocateVerification,
                    personalizations: advData.personalizations
                });
                await user.save();
                console.log(`[Seed] Created verified advocate: ${advData.fullName}`);
            } else {
                user.advocateVerification = advData.advocateVerification;
                user.personalizations.advocateProfile = advData.personalizations.advocateProfile;
                if (!user.avatar || user.avatar === '/User.jpeg') {
                    user.avatar = advData.avatar;
                }
                await user.save();
                console.log(`[Seed] Updated verified advocate: ${advData.fullName}`);
            }
        }

        console.log('[Seed] Verified advocates seed completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('[Seed] Error seeding verified advocates:', err);
        process.exit(1);
    }
}

seed();
