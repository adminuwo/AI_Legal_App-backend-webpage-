import mongoose from 'mongoose';
import 'dotenv/config';
import BlogPost from '../models/BlogPost.js';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoUri = process.env.MONGO_URI || "mongodb+srv://singhaditya93340_db_user:9334057864adi@ai-legal-app.hptv0l8.mongodb.net/?retryWrites=true&w=majority&appName=AI-Legal-App";

const CORE_BLOGS = [
  {
    slug: 'about-ai-legal-platform',
    title: 'About AI Legal™: India\'s Premier AI Legal Intelligence & Research Platform',
    subtitle: 'An introduction to AI Legal™ — built specifically for Indian legal practitioners, advocates, law students, and law firms. Grounded in 3.8+ Crore Indian court judgments with seamless mobile apps for iOS and Android.',
    summary: 'An introduction to AI Legal™ — built specifically for Indian legal practitioners, advocates, law students, and law firms. Grounded in 3.8+ Crore Indian court judgments with seamless mobile apps for iOS and Android.',
    keywords: ['About AI Legal', 'Zero Hallucination', 'Supreme Court', 'High Court', 'Mobile App'],
    tags: ['About AI Legal', 'Zero Hallucination', 'Supreme Court', 'High Court', 'Mobile App'],
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    category: 'About AI Legal',
    author: 'AI LEGAL™ Editorial Board',
    authorRole: 'Legal Intelligence & Research Division',
    readTime: '6 min read',
    hasMobileDownload: true,
    isFeatured: true,
    status: 'Published',
    source: 'inhouse'
  },
  {
    slug: 'user-roles-in-ai-legal-advocate-student-firm',
    title: 'User Roles in AI Legal™: Tailored Workspaces for Advocates, Law Students, and Law Firms',
    subtitle: 'How AI Legal™ customizes its tools, research depth, and drafting engines across three dedicated user profiles: Independent Advocates, Law Students, and Multi-Partner Law Firms.',
    summary: 'How AI Legal™ customizes its tools, research depth, and drafting engines across three dedicated user profiles: Independent Advocates, Law Students, and Multi-Partner Law Firms.',
    keywords: ['User Roles', 'Advocate Suite', 'Law Students', 'Law Firms', 'Chamber Management'],
    tags: ['User Roles', 'Advocate Suite', 'Law Students', 'Law Firms', 'Chamber Management'],
    image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&q=80',
    category: 'Chamber Roles',
    author: 'Legal Practice & Chamber Advisory Group',
    authorRole: 'Litigation Practice Specialists',
    readTime: '7 min read',
    hasMobileDownload: false,
    isFeatured: true,
    status: 'Published',
    source: 'inhouse'
  },
  {
    slug: 'comprehensive-guide-ai-legal-features',
    title: 'Comprehensive Feature Guide: Exploring the AI Legal™ Intelligence Suite',
    subtitle: 'Explore the full capability matrix of AI Legal™ — from Semantic Case Search across 3.8 Cr+ precedents to Courtroom Argument Builder, Contract Risk Auditor, and BNS Correlator.',
    summary: 'Explore the full capability matrix of AI Legal™ — from Semantic Case Search across 3.8 Cr+ precedents to Courtroom Argument Builder, Contract Risk Auditor, and BNS Correlator.',
    keywords: ['Features', 'Semantic Search', 'Evidence Analyst', 'Argument Builder', 'BNSS Conversion'],
    tags: ['Features', 'Semantic Search', 'Evidence Analyst', 'Argument Builder', 'BNSS Conversion'],
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    category: 'Features & Tools',
    author: 'AI LEGAL™ Engineering & Legal-Tech Team',
    authorRole: 'Product & AI Systems Architecture',
    readTime: '8 min read',
    hasMobileDownload: false,
    isFeatured: true,
    status: 'Published',
    source: 'inhouse'
  }
];

async function seed() {
  try {
    await mongoose.connect(mongoUri, { dbName: process.env.DB_NAME || 'AISA' });
    console.log('Connected to MongoDB.');

    for (const blog of CORE_BLOGS) {
      await BlogPost.findOneAndUpdate(
        { slug: blog.slug },
        { $set: blog },
        { upsert: true, new: true }
      );
      console.log(`Updated core blog with image, subtitle, and keywords: ${blog.slug}`);
    }

    const total = await BlogPost.countDocuments();
    console.log(`Total blogs in database: ${total}`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
