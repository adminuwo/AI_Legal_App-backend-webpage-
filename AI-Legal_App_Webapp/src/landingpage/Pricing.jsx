import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Shield, Sparkles, ArrowRight, HelpCircle,
  Scale, GraduationCap, Building2, Layers, ChevronDown, Plus, Lock, CreditCard, RefreshCw, Smartphone
} from 'lucide-react';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter from '../Components/PublicFooter';
import { getUserData } from '../userStore/userData';

export default function Pricing() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = getUserData();
  const isAuthenticated = Boolean((token && token !== 'undefined') || (user?.token && user.token !== 'undefined'));

  // Workspace Selection: 'advocate' | 'student' | 'lawfirm' | 'combo'
  const [selectedSegment, setSelectedSegment] = useState('advocate');

  // Billing Cycle: 'monthly' or 'yearly'
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [expandedFaq, setExpandedFaq] = useState(0);

  // Exact AI Legal Plans matching ailegal.aisa24.com/legal-pricing/index.html
  const plansBySegment = {
    advocate: {
      title: 'Choose Your AI Legal Plan for Advocates',
      subtitle: 'Unlock the full power of AI-driven legal tools. Transparent pricing, no hidden fees.',
      plans: [
        {
          id: 'advocate_basic',
          name: 'Advocate BASIC Plan',
          tier: 'BASIC',
          badge: '★ BASIC',
          buttonText: 'Upgrade to Basic',
          monthly: 499,
          yearly: 4990,
          popular: false,
          desc: 'Designed for independent advocates & legal consultants.',
          features: [
            {
              category: 'Quota & Capacity',
              items: [
                { icon: '📁', label: 'Active Cases Limit', value: 'Up to 50 Active Cases' },
                { icon: '💾', label: 'Cloud Storage', value: '5 GB' }
              ]
            },
            {
              category: 'AI Legal™ Tools Included',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '300 chats/month' },
                { icon: '📝', label: 'Draft Maker', value: '5 drafts/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '5 searches/month' },
                { icon: '📜', label: 'Contract Analyzer', value: '5 reviews/month' },
                { icon: '🔬', label: 'Evidence Analyst', value: '5 analyses/month' },
                { icon: '🎯', label: 'Strategy Engine', value: '5 strategies/month' },
                { icon: '📊', label: 'Case Predictor', value: '5 predictions/month' }
              ]
            },
            {
              category: 'Courtroom & Client Suite',
              items: [
                { icon: '⚔️', label: 'AI Mock Courtroom', value: '2 sessions/month' },
                { icon: '🤝', label: 'AI Client Connect', value: '2 listings' }
              ]
            }
          ]
        },
        {
          id: 'advocate_pro',
          name: 'Advocate PRO Plan',
          tier: 'PRO',
          badge: '⭐ PRO',
          tag: 'MOST POPULAR',
          buttonText: 'Upgrade to Pro',
          monthly: 999,
          yearly: 9990,
          popular: true,
          desc: 'Designed for active advocates and trial lawyers.',
          features: [
            {
              category: 'Quota & Capacity',
              items: [
                { icon: '📁', label: 'Active Cases Limit', value: 'Up to 100 Active Cases' },
                { icon: '💾', label: 'Cloud Storage', value: '20 GB' }
              ]
            },
            {
              category: 'AI Legal™ Tools Included',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '1,000 chats/month' },
                { icon: '📝', label: 'Draft Maker', value: '15 drafts/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '15 searches/month' },
                { icon: '📜', label: 'Contract Analyzer', value: '15 reviews/month' },
                { icon: '🔬', label: 'Evidence Analyst', value: '15 analyses/month' },
                { icon: '🎯', label: 'Strategy Engine', value: '15 strategies/month' },
                { icon: '📊', label: 'Case Predictor', value: '15 predictions/month' }
              ]
            },
            {
              category: 'Courtroom & Client Suite',
              items: [
                { icon: '⚔️', label: 'AI Mock Courtroom', value: '5 sessions/month' },
                { icon: '🤝', label: 'AI Client Connect', value: '5 listings' },
                { icon: '⚡', label: 'Processing Speed', value: 'Priority AI Processing' }
              ]
            }
          ]
        },
        {
          id: 'advocate_premium',
          name: 'Advocate PREMIUM Plan',
          tier: 'PREMIUM',
          badge: '👑 PREMIUM',
          tag: 'UNLIMITED POWER',
          buttonText: 'Upgrade to Premium',
          monthly: 2399,
          yearly: 23990,
          popular: false,
          desc: 'Complete AI Legal™ ecosystem for power users and senior advocates.',
          fupNotice: '*Fair Usage Policy applies (max 500 uses/month per tool)',
          features: [
            {
              category: 'Quota & Capacity',
              items: [
                { icon: '📁', label: 'Active Cases Limit', value: 'Up to 250 Active Cases' },
                { icon: '💾', label: 'Cloud Storage', value: '100 GB' }
              ]
            },
            {
              category: 'AI Legal™ Tools (Unlimited Access)',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: 'Unlimited Chats' },
                { icon: '📝', label: 'Draft Maker', value: 'Unlimited (500 FUP)' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: 'Unlimited' },
                { icon: '📜', label: 'Contract Analyzer', value: 'Unlimited' },
                { icon: '🔬', label: 'Evidence Analyst', value: 'Unlimited' },
                { icon: '🎯', label: 'Strategy Engine', value: 'Unlimited' },
                { icon: '📊', label: 'Case Predictor', value: 'Unlimited' }
              ]
            },
            {
              category: 'Courtroom & VIP Features',
              items: [
                { icon: '⚔️', label: 'AI Mock Courtroom', value: '15 sessions/month' },
                { icon: '🤝', label: 'AI Client Connect', value: '20 listings' },
                { icon: '👑', label: 'Support Level', value: '24/7 VIP Support' }
              ]
            }
          ]
        }
      ],
      colHeaders: ['Advocate BASIC', 'Advocate PRO', 'Advocate PREMIUM'],
      comparisonRows: [
        { feature: 'Active Cases Limit', col1: 'Up to 50 Cases', col2: 'Up to 100 Cases', col3: 'Up to 250 Cases' },
        { feature: 'Cloud Storage', col1: '5 GB', col2: '20 GB', col3: '100 GB' },
        { feature: 'AI Legal Chat & Assistants', col1: '300 chats/mo', col2: '1,000 chats/mo', col3: 'Unlimited Chats' },
        { feature: 'Draft Maker', col1: '5 drafts/mo', col2: '15 drafts/mo', col3: 'Unlimited (500 FUP)' },
        { feature: 'Legal Precedents & Research', col1: '5 searches/mo', col2: '15 searches/mo', col3: 'Unlimited' },
        { feature: 'Contract Analyzer', col1: '5 reviews/mo', col2: '15 reviews/mo', col3: 'Unlimited' },
        { feature: 'Evidence Analyst', col1: '5 analyses/mo', col2: '15 analyses/mo', col3: 'Unlimited' },
        { feature: 'Strategy Engine & Predictor', col1: '5 / month', col2: '15 / month', col3: 'Unlimited' },
        { feature: 'AI Mock Courtroom', col1: '2 sessions/mo', col2: '5 sessions/mo', col3: '15 sessions/mo' },
        { feature: 'AI Client Connect Listings', col1: '2 listings', col2: '5 listings', col3: '20 listings' },
        { feature: 'Priority AI & Support', col1: 'Standard', col2: 'Priority Processing', col3: '24/7 VIP Support' }
      ]
    },

    student: {
      title: 'Choose Your AI Legal Plan for Students',
      subtitle: 'Unlock the full power of AI-driven legal tools. Transparent pricing, no hidden fees.',
      plans: [
        {
          id: 'student_basic',
          name: 'Student BASIC Plan',
          tier: 'BASIC',
          badge: '🎓 STUDENT BASIC',
          buttonText: 'Upgrade to Student Basic',
          monthly: 499,
          yearly: 4990,
          popular: false,
          desc: 'Essential AI legal companion for law students & bar exam prep.',
          features: [
            {
              category: 'Quota & Capacity',
              items: [
                { icon: '📁', label: 'Practice Cases Limit', value: 'Up to 25 Practice Cases' },
                { icon: '💾', label: 'Cloud Storage', value: '5 GB' }
              ]
            },
            {
              category: 'Academic AI Tools Included',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '300 chats/month' },
                { icon: '🧠', label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
                { icon: '📝', label: 'Draft Maker', value: '5 drafts/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '5 searches/month' },
                { icon: '📜', label: 'Contract Analyzer', value: '5 reviews/month' },
                { icon: '🔬', label: 'Evidence Analyst', value: '5 analyses/month' },
                { icon: '🎯', label: 'Strategy Engine', value: '5 strategies/month' },
                { icon: '📊', label: 'Case Predictor', value: '5 predictions/month' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '2 sessions/month' },
                { icon: '📝', label: 'Notes Maker', value: '5 notes/month' }
              ]
            }
          ]
        },
        {
          id: 'student_pro',
          name: 'Student PRO Plan',
          tier: 'PRO',
          badge: '⭐ STUDENT PRO',
          tag: 'MOST POPULAR',
          buttonText: 'Upgrade to Student Pro',
          monthly: 999,
          yearly: 9990,
          popular: true,
          desc: 'Accelerate legal studies, research and moot court preparation.',
          features: [
            {
              category: 'Quota & Capacity',
              items: [
                { icon: '📁', label: 'Practice Cases Limit', value: 'Up to 50 Practice Cases' },
                { icon: '💾', label: 'Cloud Storage', value: '20 GB' }
              ]
            },
            {
              category: 'Academic AI Tools Included',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '1,000 chats/month' },
                { icon: '🧠', label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
                { icon: '📝', label: 'Draft Maker', value: '15 drafts/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '15 searches/month' },
                { icon: '📜', label: 'Contract Analyzer', value: '15 reviews/month' },
                { icon: '🔬', label: 'Evidence Analyst', value: '15 analyses/month' },
                { icon: '🎯', label: 'Strategy Engine', value: '15 strategies/month' },
                { icon: '📊', label: 'Case Predictor', value: '15 predictions/month' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '5 sessions/month' },
                { icon: '📝', label: 'Notes Maker', value: '15 notes/month' }
              ]
            }
          ]
        },
        {
          id: 'student_premium',
          name: 'Student PREMIUM Plan',
          tier: 'PREMIUM',
          badge: '🎓 STUDENT PREMIUM',
          tag: 'STUDENT ECOSYSTEM',
          buttonText: 'Upgrade to Student Premium',
          monthly: 2399,
          yearly: 23990,
          popular: false,
          desc: 'Comprehensive AI suite for law scholars, LLM candidates & top interns.',
          fupNotice: '*Fair Usage Policy applies (max 500 uses/month per tool)',
          features: [
            {
              category: 'Quota & Capacity',
              items: [
                { icon: '📁', label: 'Practice Cases Limit', value: 'Up to 100 Practice Cases' },
                { icon: '💾', label: 'Cloud Storage', value: '50 GB' }
              ]
            },
            {
              category: 'Academic AI Tools Included',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: 'Unlimited Chats' },
                { icon: '🧠', label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
                { icon: '📝', label: 'Draft Maker', value: 'Unlimited' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: 'Unlimited' },
                { icon: '📜', label: 'Contract Analyzer', value: 'Unlimited' },
                { icon: '🔬', label: 'Evidence Analyst', value: 'Unlimited' },
                { icon: '🎯', label: 'Strategy Engine', value: 'Unlimited' },
                { icon: '📊', label: 'Case Predictor', value: 'Unlimited' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '15 sessions/month' },
                { icon: '📝', label: 'Notes Maker', value: 'Unlimited' }
              ]
            }
          ]
        }
      ],
      colHeaders: ['Student BASIC', 'Student PRO', 'Student PREMIUM'],
      comparisonRows: [
        { feature: 'Practice Cases Limit', col1: 'Up to 25 Cases', col2: 'Up to 50 Cases', col3: 'Up to 100 Cases' },
        { feature: 'Cloud Storage', col1: '5 GB', col2: '20 GB', col3: '50 GB' },
        { feature: 'AI Legal Chat & Assistants', col1: '300 chats/mo', col2: '1,000 chats/mo', col3: 'Unlimited Chats' },
        { feature: 'Quiz & Practice', col1: 'Unlimited Quizzes', col2: 'Unlimited Quizzes', col3: 'Unlimited Quizzes' },
        { feature: 'Draft Maker', col1: '5 drafts/mo', col2: '15 drafts/mo', col3: 'Unlimited' },
        { feature: 'Legal Precedents & Research', col1: '5 searches/mo', col2: '15 searches/mo', col3: 'Unlimited' },
        { feature: 'Contract & Evidence Analysis', col1: '5 / month', col2: '15 / month', col3: 'Unlimited' },
        { feature: 'Mock Courtroom', col1: '2 sessions/mo', col2: '5 sessions/mo', col3: '15 sessions/mo' },
        { feature: 'Notes Maker', col1: '5 notes/mo', col2: '15 notes/mo', col3: 'Unlimited' }
      ]
    },

    lawfirm: {
      title: 'Choose Your AI Legal Plan for Law Firms',
      subtitle: 'Unlock the full power of AI-driven legal tools. Transparent pricing, no hidden fees.',
      plans: [
        {
          id: 'firm_basic',
          name: 'Law Firm BASIC Plan',
          tier: 'BASIC',
          badge: '🏛️ FIRM BASIC',
          buttonText: 'Upgrade to Firm Basic',
          monthly: 1499,
          yearly: 14990,
          popular: false,
          desc: 'Designed for law firms, corporate legal teams, and associate practices.',
          features: [
            {
              category: 'Team & Quota Capacity',
              items: [
                { icon: '👥', label: 'Team Members Limit', value: 'Up to 10 Team Members / Advocates' },
                { icon: '📁', label: 'Firm Active Cases Limit', value: 'Up to 100 Active Cases' },
                { icon: '💾', label: 'Shared Firm Storage', value: '25 GB Shared' }
              ]
            },
            {
              category: 'Included AI Tools & Workflows',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '1,500 team chats/month' },
                { icon: '🏛️', label: 'Multi-user Team Workspace', value: 'Member Management' },
                { icon: '📝', label: 'Draft Maker', value: '30 drafts/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '30 searches/month' },
                { icon: '📜', label: 'Contract Analyzer', value: '30 reviews/month' },
                { icon: '🔬', label: 'Evidence Analyst', value: '30 analyses/month' },
                { icon: '🎯', label: 'Strategy Engine', value: '30 strategies/month' },
                { icon: '📊', label: 'Case Predictor', value: '30 predictions/month' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '10 sessions/month' },
                { icon: '🤝', label: 'Client Connect', value: '10 listings' },
                { icon: '📋', label: 'Case Assignment Workflow', value: 'Included' }
              ]
            }
          ]
        },
        {
          id: 'firm_pro',
          name: 'Law Firm PRO Plan',
          tier: 'PRO',
          badge: '⭐ FIRM PRO',
          tag: 'MOST POPULAR FOR FIRMS',
          buttonText: 'Upgrade to Firm Pro',
          monthly: 2999,
          yearly: 29990,
          popular: true,
          desc: 'High-capacity legal automation for expanding law firms.',
          features: [
            {
              category: 'Team & Quota Capacity',
              items: [
                { icon: '👥', label: 'Team Members Limit', value: 'Up to 25 Team Members / Advocates' },
                { icon: '📁', label: 'Firm Active Cases Limit', value: 'Up to 250 Active Cases' },
                { icon: '💾', label: 'Shared Firm Storage', value: '100 GB Shared' }
              ]
            },
            {
              category: 'Included AI Tools & Workflows',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '3,500 team chats/month' },
                { icon: '🏛️', label: 'Multi-user Team Workspace', value: 'Member Management' },
                { icon: '📝', label: 'Draft Maker', value: '100 drafts/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '100 searches/month' },
                { icon: '📜', label: 'Contract Analyzer', value: '100 reviews/month' },
                { icon: '🔬', label: 'Evidence Analyst', value: '100 analyses/month' },
                { icon: '🎯', label: 'Strategy Engine', value: '100 strategies/month' },
                { icon: '📊', label: 'Case Predictor', value: '100 predictions/month' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '25 sessions/month' },
                { icon: '🤝', label: 'Client Connect', value: '25 listings' },
                { icon: '📋', label: 'Case Assignment Workflow', value: 'Included' }
              ]
            }
          ]
        },
        {
          id: 'firm_premium',
          name: 'Law Firm PREMIUM Plan',
          tier: 'PREMIUM',
          badge: '🏛️ FIRM PREMIUM',
          tag: 'ENTERPRISE ECOSYSTEM',
          buttonText: 'Upgrade to Firm Premium',
          monthly: 4999,
          yearly: 49990,
          popular: false,
          desc: 'Enterprise-grade legal intelligence for full-scale law organizations.',
          features: [
            {
              category: 'Team & Quota Capacity',
              items: [
                { icon: '👥', label: 'Team Members Limit', value: 'Up to 50 Team Members / Advocates' },
                { icon: '📁', label: 'Firm Active Cases Limit', value: 'Up to 500 Active Cases' },
                { icon: '💾', label: 'Shared Firm Storage', value: '500 GB Shared' }
              ]
            },
            {
              category: 'Included AI Tools & Workflows',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: 'Unlimited Team Chats' },
                { icon: '🏛️', label: 'Multi-user Team Workspace', value: 'Member Management' },
                { icon: '📝', label: 'Draft Maker', value: 'Unlimited' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: 'Unlimited' },
                { icon: '📜', label: 'Contract Analyzer', value: 'Unlimited' },
                { icon: '🔬', label: 'Evidence Analyst', value: 'Unlimited' },
                { icon: '🎯', label: 'Strategy Engine', value: 'Unlimited' },
                { icon: '📊', label: 'Case Predictor', value: 'Unlimited' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '50 sessions/month' },
                { icon: '🤝', label: 'Client Connect', value: '50 listings' },
                { icon: '📋', label: 'Case Assignment Workflow', value: 'Included' }
              ]
            }
          ]
        }
      ],
      colHeaders: ['Firm BASIC', 'Firm PRO', 'Firm PREMIUM'],
      comparisonRows: [
        { feature: 'Team Members Limit', col1: 'Up to 10 Members', col2: 'Up to 25 Members', col3: 'Up to 50 Members' },
        { feature: 'Firm Active Cases Limit', col1: 'Up to 100 Cases', col2: 'Up to 250 Cases', col3: 'Up to 500 Cases' },
        { feature: 'Shared Firm Storage', col1: '25 GB Shared', col2: '100 GB Shared', col3: '500 GB Shared' },
        { feature: 'AI Legal Chat & Assistants', col1: '1,500 team chats/mo', col2: '3,500 team chats/mo', col3: 'Unlimited Team Chats' },
        { feature: 'Draft Maker', col1: '30 drafts/mo', col2: '100 drafts/mo', col3: 'Unlimited' },
        { feature: 'Legal Precedents & Research', col1: '30 searches/mo', col2: '100 searches/mo', col3: 'Unlimited' },
        { feature: 'Contract & Evidence Analysis', col1: '30 / month', col2: '100 / month', col3: 'Unlimited' },
        { feature: 'Mock Courtroom', col1: '10 sessions/mo', col2: '25 sessions/mo', col3: '50 sessions/mo' },
        { feature: 'Client Connect Listings', col1: '10 listings', col2: '25 listings', col3: '50 listings' },
        { feature: 'Member Management & Workflow', col1: 'Included', col2: 'Included', col3: 'Included' }
      ]
    },

    combo: {
      title: 'Choose Your AI Legal Combo Bundle',
      subtitle: 'Unlock the full power of AI-driven legal tools. Transparent pricing, no hidden fees.',
      plans: [
        {
          id: 'combo_student_advocate',
          name: 'Student + Advocate Combo',
          tier: 'COMBO',
          badge: '✨ STUDENT + ADVOCATE',
          savingsBadge: 'SAVE 20%',
          buttonText: 'Upgrade to Student + Advocate',
          monthly: 1199,
          yearly: 11990,
          popular: false,
          includes: ['🎓 Student Workspace', '⚖️ Advocate Workspace'],
          desc: 'Combined access for practicing advocates currently pursuing higher legal studies.',
          features: [
            {
              category: 'Included Workspaces & Capacity',
              items: [
                { icon: '🔓', label: 'Workspaces Unlocked', value: 'Dual Access (Student + Advocate)' },
                { icon: '📁', label: 'Active Cases Capacity', value: 'Up to 50 Cases' },
                { icon: '💾', label: 'Shared Storage', value: '25 GB' }
              ]
            },
            {
              category: 'Included AI Tools & Feature Limits',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '500 chats/month' },
                { icon: '🧠', label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
                { icon: '📝', label: 'Draft Maker & Contract Analyzer', value: '20/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '20/month' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '5 sessions/month' },
                { icon: '🤝', label: 'Client Connect', value: '5 listings' }
              ]
            }
          ]
        },
        {
          id: 'combo_advocate_firm',
          name: 'Advocate + Law Firm Combo',
          tier: 'COMBO',
          badge: '⭐ ADVOCATE + FIRM',
          tag: 'MOST POPULAR BUNDLE',
          savingsBadge: 'SAVE 25%',
          buttonText: 'Upgrade to Advocate + Firm',
          monthly: 1499,
          yearly: 14990,
          popular: true,
          includes: ['⚖️ Advocate Workspace', '🏛️ Law Firm Workspace'],
          desc: 'Ideal for senior partners running both a private practice and a firm.',
          features: [
            {
              category: 'Included Workspaces & Capacity',
              items: [
                { icon: '🔓', label: 'Workspaces Unlocked', value: 'Dual Access (Advocate + Law Firm)' },
                { icon: '👥', label: 'Team Members Allowed', value: 'Up to 10 Team Members' },
                { icon: '📁', label: 'Active Cases Capacity', value: 'Up to 100 Cases' },
                { icon: '💾', label: 'Shared Storage', value: '50 GB Shared' }
              ]
            },
            {
              category: 'Included AI Tools & Feature Limits',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: '1,500 team chats/month' },
                { icon: '📝', label: 'Draft Maker & Contract Analyzer', value: '30/month' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: '30/month' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '10 sessions/month' },
                { icon: '🤝', label: 'Client Connect', value: '10 listings' },
                { icon: '📋', label: 'Case Assignment Workflow', value: 'Included' }
              ]
            }
          ]
        },
        {
          id: 'combo_all_access',
          name: 'Combo All-Access Pass',
          tier: 'COMBO',
          badge: '🌟 ALL ACCESS',
          tag: 'ULTIMATE BUNDLE',
          savingsBadge: 'SAVE UP TO 30%',
          buttonText: 'Upgrade to All Access',
          monthly: 2399,
          yearly: 23990,
          popular: false,
          includes: ['🎓 Student', '⚖️ Advocate', '🏛️ Law Firm'],
          desc: 'Full Access to ALL 3 Workspaces (Student, Advocate & Law Firm).',
          features: [
            {
              category: 'Included Workspaces & Capacity',
              items: [
                { icon: '🔓', label: 'Workspaces Unlocked', value: 'Full Access (Student + Advocate + Law Firm)' },
                { icon: '👥', label: 'Team Members Allowed', value: 'Up to 20 Team Members' },
                { icon: '📁', label: 'Active Cases Capacity', value: 'Up to 250 Cases' },
                { icon: '💾', label: 'Shared Storage', value: '100 GB Shared' }
              ]
            },
            {
              category: 'Included AI Tools & Feature Limits',
              items: [
                { icon: '💬', label: 'AI Legal Chat & Assistants', value: 'Unlimited Chats' },
                { icon: '🧠', label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
                { icon: '📝', label: 'Draft Maker & Contract Analyzer', value: 'Unlimited' },
                { icon: '⚖️', label: 'Legal Precedents & Research', value: 'Unlimited' },
                { icon: '⚔️', label: 'Mock Courtroom', value: '15 sessions/month' },
                { icon: '🤝', label: 'Client Connect', value: '20 listings' },
                { icon: '📋', label: 'Case Assignment Workflow', value: 'Included' }
              ]
            }
          ]
        }
      ],
      colHeaders: ['Student + Advocate', 'Advocate + Firm', 'All-Access Pass'],
      comparisonRows: [
        { feature: 'Workspaces Unlocked', col1: 'Dual (Student + Advocate)', col2: 'Dual (Advocate + Law Firm)', col3: 'Full Access (All 3)' },
        { feature: 'Team Members Allowed', col1: 'Solo Access', col2: 'Up to 10 Team Members', col3: 'Up to 20 Team Members' },
        { feature: 'Active Cases Capacity', col1: 'Up to 50 Cases', col2: 'Up to 100 Cases', col3: 'Up to 250 Cases' },
        { feature: 'Shared Storage', col1: '25 GB', col2: '50 GB Shared', col3: '100 GB Shared' },
        { feature: 'AI Legal Chat & Assistants', col1: '500 chats/mo', col2: '1,500 team chats/mo', col3: 'Unlimited Chats' },
        { feature: 'Quiz & Practice', col1: 'Unlimited Quizzes', col2: '—', col3: 'Unlimited Quizzes' },
        { feature: 'Draft Maker & Contract Analyzer', col1: '20 / month', col2: '30 / month', col3: 'Unlimited' },
        { feature: 'Legal Precedents & Research', col1: '20 / month', col2: '30 / month', col3: 'Unlimited' },
        { feature: 'AI Mock Courtroom', col1: '5 sessions/mo', col2: '10 sessions/mo', col3: '15 sessions/mo' },
        { feature: 'AI Client Connect Listings', col1: '5 listings', col2: '10 listings', col3: '20 listings' },
        { feature: 'Case Assignment Workflow', col1: '—', col2: 'Included', col3: 'Included' }
      ]
    }
  };

  const currentSegmentData = plansBySegment[selectedSegment] || plansBySegment.advocate;
  const currentPlans = currentSegmentData.plans;

  const faqs = [
    {
      q: 'How do monthly quotas work for AI Legal Chat, Draft Maker, and Precedent Research?',
      a: 'Each subscription plan (Basic, Pro, Premium) provides dedicated monthly allowances for AI Legal tools—including AI chats, petition and notice drafting, precedent search, and contract reviews. Quotas automatically replenish every month on your billing date. On Premium plans, tools provide Unlimited access subject to our Fair Usage Policy (up to 500 uses/month per tool).'
    },
    {
      q: 'What is the difference between Advocate, Student, Law Firm, and Combo plans?',
      a: 'Advocate Plans (from ₹499/mo) are tailored for independent trial advocates and litigation counsel. Student Plans (from ₹499/mo) include academic companions like Unlimited Quizzes and Notes Maker for bar exam preparation. Law Firm Plans (from ₹1,499/mo) provide multi-user team seats (10 to 50 members), shared case dockets, and associate workflow assignment. Combo Bundles (from ₹1,199/mo) unlock dual or all 3 workspaces at up to 30% savings.'
    },
    {
      q: 'How does the 17% Annual Billing discount work?',
      a: 'When you select Annual Billing, you pay upfront for 12 months at a discounted annual rate, saving 17% compared to monthly renewals. For example, Advocate PRO is ₹999/month (₹11,988/yr on monthly billing) vs only ₹9,990/year on annual billing, saving you ₹1,998 every year.'
    },
    {
      q: 'What do Active Cases Limit and Cloud Storage mean?',
      a: 'Active Cases represent the maximum number of ongoing litigation matters or case dockets you can actively manage in your workspace at one time (e.g., 50 on Basic, 100 on Pro, 250 on Premium, up to 500 on Law Firm). Disposed cases can be archived without counting towards your active quota. Cloud Storage (5 GB up to 500 GB) securely holds client briefs, case files, petitions, and evidence.'
    },
    {
      q: 'How does team seat licensing work for Law Firms?',
      a: 'Law Firm plans include collaborative multi-counsel access: Firm Basic supports up to 10 advocates/associates, Firm Pro supports up to 25, and Firm Premium supports up to 50. Managing partners can add team members, assign case matters, manage permissions, and share firm precedents under a unified billing account.'
    },
    {
      q: 'What payment methods are supported, and do I receive a GST invoice?',
      a: 'Payments are processed securely via Razorpay with 256-bit SSL encryption. We accept UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, Mastercard, RuPay), and Net Banking. A detailed GST tax invoice is automatically generated for every transaction for your chamber accounting.'
    },
    {
      q: 'Can I upgrade, downgrade, or cancel my subscription anytime?',
      a: 'Yes, absolutely. You can upgrade to a higher tier at any time with instant quota activation. You can also cancel your recurring renewal anytime with one click from your subscription settings without any cancellation fee or lock-in commitment.'
    },
    {
      q: 'What happens if I exhaust my plan quota before the month ends?',
      a: 'You will receive a timely notification inside your workspace when approaching your quota limit. You can easily upgrade to Pro or Premium with one click to immediately unlock higher limits and continue drafting and researching without interruption.'
    }
  ];

  const handlePlanCta = (plan) => {
    // Forward to legal-pricing portal with selected plan, workspace & billing cycle
    const targetUrl = `/legal-pricing/index.html?workspace=${selectedSegment}&plan=${plan.id}&cycle=${billingCycle}`;
    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] dark:bg-[#070A12] text-[#111827] dark:text-slate-100 font-sans selection:bg-[#C8A34D]/25 selection:text-[#111111]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#C8A34D] to-[#B38628] flex items-center justify-center shadow-md shadow-[#C8A34D]/30 p-1">
              <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#111827] dark:text-white flex items-center">
                AI Legal<span className="text-[10px] text-[#B38628] dark:text-[#C8A34D] font-extrabold ml-0.5">™</span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button onClick={() => navigate('/')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={() => navigate('/features')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Features
            </button>
            <button onClick={() => navigate('/blog')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Blog
            </button>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#C8A34D]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300">
              Pricing
            </span>
            <button onClick={() => navigate('/case-search')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Case Search
            </button>
            <button onClick={() => navigate('/about')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              About
            </button>
            <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/case-search')}
              className="px-4 py-2 rounded-full text-xs font-bold border border-[#C8A34D]/40 bg-amber-50/50 text-[#B38628] hover:bg-amber-100/60 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Post Judgement</span>
            </button>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#C8A34D]/30"
              >
                Dashboard →
              </button>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#C8A34D]/30"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section (Compact) */}
      <section className="pt-6 sm:pt-8 pb-3 sm:pb-4 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#B38628] dark:text-[#E5C16C] text-[11px] font-bold tracking-wide">
            <Sparkles size={12} /> AI-Powered Legal Platform
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] dark:text-white tracking-tight">
            Choose Your <span className="bg-gradient-to-r from-[#C8A34D] to-[#B38628] bg-clip-text text-transparent">AI Legal</span> Plan
          </h1>
          
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-normal">
            Unlock the full power of AI-driven legal tools. Transparent pricing, no hidden fees.
          </p>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-2.5 flex items-center justify-center flex-wrap gap-2">
            <div className="inline-flex p-0.5 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-full shadow-2xs">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[#111827] text-white shadow-xs dark:bg-white dark:text-[#111827]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-[#111827] text-white shadow-xs dark:bg-white dark:text-[#111827]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Yearly
              </button>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-extrabold">
              🎁 Save 17% Yearly
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          WORKSPACE SELECTOR (Compact)
      ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 pb-5">
        <div className="text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
          Select Workspace
        </div>
        <div className="flex items-center justify-center flex-wrap gap-2">
          {/* Advocate */}
          <button
            onClick={() => setSelectedSegment('advocate')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              selectedSegment === 'advocate'
                ? 'bg-gradient-to-r from-[#C8A34D] to-[#B38628] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#C8A34D] hover:text-[#B38628]'
            }`}
          >
            <span>⚖️ Advocate</span>
          </button>

          {/* Student */}
          <button
            onClick={() => setSelectedSegment('student')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              selectedSegment === 'student'
                ? 'bg-gradient-to-r from-[#C8A34D] to-[#B38628] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#C8A34D] hover:text-[#B38628]'
            }`}
          >
            <span>🎓 Student</span>
          </button>

          {/* Law Firm */}
          <button
            onClick={() => setSelectedSegment('lawfirm')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              selectedSegment === 'lawfirm'
                ? 'bg-gradient-to-r from-[#C8A34D] to-[#B38628] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#C8A34D] hover:text-[#B38628]'
            }`}
          >
            <span>🏛️ Law Firm</span>
            <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded tracking-wider ${
              selectedSegment === 'lawfirm' ? 'bg-white/30 text-white' : 'bg-[#C8A34D]/15 text-[#B38628]'
            }`}>
              TEAM
            </span>
          </button>

          {/* Combo */}
          <button
            onClick={() => setSelectedSegment('combo')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              selectedSegment === 'combo'
                ? 'bg-gradient-to-r from-[#C8A34D] to-[#B38628] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#C8A34D] hover:text-[#B38628]'
            }`}
          >
            <span>✨ Combo</span>
            <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded tracking-wider ${
              selectedSegment === 'combo' ? 'bg-white/30 text-white' : 'bg-[#C8A34D]/15 text-[#B38628]'
            }`}>
              SAVE MORE
            </span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          PRICING CARDS GRID (Exact 3 Plans Matching AI Legal Live Portal)
      ========================================================================= */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 items-stretch">
          {currentPlans.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
            const monthlyEquiv = billingCycle === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly;
            const yearlySaving = billingCycle === 'yearly' ? (plan.monthly * 12 - plan.yearly) : 0;
            const tagText = plan.tag || (plan.popular ? 'MOST POPULAR' : '');

            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-[#0B1120] rounded-2xl p-7 flex flex-col justify-between relative transition-all duration-200 ${
                  plan.popular
                    ? 'border-2 border-[#C8A34D] shadow-xl shadow-[#C8A34D]/15 ring-1 ring-[#C8A34D]/40'
                    : 'border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#C8A34D]/60 hover:shadow-md'
                }`}
              >
                {/* Popular Ribbon */}
                {tagText && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-xl rounded-t-sm bg-gradient-to-r from-[#C8A34D] to-[#B38628] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                    ⭐ {tagText}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Top Badge & Savings Tag */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-[#C8A34D]/10 text-[#B38628] dark:text-[#E5C16C]">
                      {plan.badge}
                    </span>
                    {plan.savingsBadge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        {plan.savingsBadge}
                      </span>
                    )}
                  </div>

                  {/* Plan Name & Desc */}
                  <div>
                    <h3 className="text-xl font-extrabold text-[#111827] dark:text-white tracking-tight">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed min-h-[34px]">
                      {plan.desc}
                    </p>
                  </div>

                  {/* Combo Workspaces Tag Pills */}
                  {plan.includes && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {plan.includes.map((inc, i) => (
                        <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          {inc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price Block */}
                  <div className="pt-2 pb-1">
                    <div className="flex items-baseline gap-1">
                      <sup className="text-lg font-bold text-slate-700 dark:text-slate-300">₹</sup>
                      <span className="text-4xl font-black text-[#111827] dark:text-white tracking-tight">
                        {price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        {billingCycle === 'yearly' ? 'per year' : 'per month'}
                      </span>
                    </div>

                    {billingCycle === 'yearly' && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        (₹{monthlyEquiv}/mo equivalent)
                      </div>
                    )}

                    {yearlySaving > 0 && (
                      <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                        💰 Save ₹{yearlySaving.toLocaleString('en-IN')} per year
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Feature Groups */}
                  <div className="space-y-4 pt-1">
                    {plan.features.map((grp, gIdx) => (
                      <div key={gIdx} className="space-y-2">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {grp.category}
                        </div>
                        <div className="space-y-1.5">
                          {grp.items.map((item, iIdx) => (
                            <div key={iIdx} className="flex items-start gap-2 text-xs leading-snug">
                              <span className="text-sm shrink-0 leading-none mt-0.5">{item.icon}</span>
                              <div className="text-slate-600 dark:text-slate-300">
                                <span className="font-normal">{item.label}: </span>
                                <span className="font-bold text-[#111827] dark:text-white">{item.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FUP Notice */}
                  {plan.fupNotice && (
                    <p className="text-[10.5px] text-slate-400 dark:text-slate-500 pt-1">
                      {plan.fupNotice}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust Badges Footer Bar (Exact AI Legal live style) */}
      <section className="border-t border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-[#B38628]" />
            <span>256-bit SSL Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-[#B38628]" />
            <span>Secured by Razorpay</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="text-[#B38628]" />
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone size={15} className="text-[#B38628]" />
            <span>Works on Android & iOS</span>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="py-14 bg-white/60 dark:bg-[#070A12] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Feature Comparison Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Detailed breakdown of statutory and operational capabilities for {selectedSegment.toUpperCase()}.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 sm:p-5 font-black text-slate-900 dark:text-white">Capability</th>
                    <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-center">{currentSegmentData.colHeaders[0]}</th>
                    <th className="p-4 sm:p-5 font-black text-[#B38628] dark:text-[#E5C16C] text-center">{currentSegmentData.colHeaders[1]}</th>
                    <th className="p-4 sm:p-5 font-bold text-slate-600 dark:text-slate-300 text-center">{currentSegmentData.colHeaders[2]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {currentSegmentData.comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/20 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">
                        {row.feature}
                      </td>
                      <td className="p-4 sm:p-5 text-center">
                        {typeof row.col1 === 'boolean' ? (
                          row.col1 ? <Check size={16} className="text-emerald-500 mx-auto" /> : <X size={16} className="text-slate-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{row.col1}</span>
                        )}
                      </td>
                      <td className="p-4 sm:p-5 text-center font-bold text-[#B38628] dark:text-[#E5C16C]">
                        {typeof row.col2 === 'boolean' ? (
                          row.col2 ? <Check size={16} className="text-[#B38628] dark:text-[#E5C16C] mx-auto" /> : <X size={16} className="text-slate-400 mx-auto" />
                        ) : (
                          <span>{row.col2}</span>
                        )}
                      </td>
                      <td className="p-4 sm:p-5 text-center font-semibold">
                        {typeof row.col3 === 'boolean' ? (
                          row.col3 ? <Check size={16} className="text-emerald-500 mx-auto" /> : <X size={16} className="text-slate-400 mx-auto" />
                        ) : (
                          <span className="text-slate-700 dark:text-slate-200 font-medium">{row.col3}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Clear, transparent answers about AI Legal™ subscription plans, tool quotas, annual discounts, and team billing.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0B1120]"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? -1 : idx)}
                className="w-full p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-[#B38628] transition-transform duration-200 ${
                    expandedFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reusable Public Footer Matching Reference */}
      <PublicFooter />
    </div>
  );
}
