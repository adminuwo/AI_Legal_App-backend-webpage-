import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useUserStore } from '@/store/user';
import { BillingService } from '@/services/billing.service';
import { googlePlayIapService } from '@/services/googlePlayIap.service';
import { useSubscriptionStore } from '@/store/subscription';
import { AppConfig } from '@/config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// ============================================================================
// CONFIGURATION TYPES & SCHEMAS (SCALABLE & MODULAR)
// ============================================================================

export type WorkspaceId = 'advocate' | 'student' | 'lawfirm' | 'combo';

export interface WorkspaceConfig {
  id: WorkspaceId;
  label: string;
  icon: string;
  badge?: string;
  description: string;
}

export interface FeatureCategoryGroup {
  category: string;
  icon: string;
  items: { label: string; value: string; icon?: string }[];
}

export interface PlanConfig {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  badge: string;
  tag?: string;
  isPopular?: boolean;
  priceMonthly: number;
  priceYearly: number;
  subtitle: string;
  buttonText: string;
  storage: string;
  runningCases: string;
  completedCases: string;
  isSharedQuota?: boolean;
  includedWorkspaces?: string[];
  savingsBadge?: string;
  featureGroups: FeatureCategoryGroup[];
}

// ============================================================================
// WORKSPACE DEFINITIONS
// ============================================================================

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'advocate',
    label: 'Advocate',
    icon: 'briefcase-outline',
    description: 'Designed for individual advocates and legal practitioners',
  },
  {
    id: 'student',
    label: 'Student',
    icon: 'school-outline',
    description: 'Tailored for law students, interns, and academic researchers',
  },
  {
    id: 'lawfirm',
    label: 'Law Firm',
    icon: 'business-outline',
    badge: 'TEAM',
    description: 'Full ecosystem for law firms & multi-lawyer practices',
  },
  {
    id: 'combo',
    label: 'Combo',
    icon: 'star-outline',
    badge: 'SAVE 30%',
    description: 'Bundled access across multiple workspaces with max savings',
  },
];

// ============================================================================
// MASTER PLANS CONFIGURATION OBJECT (PRICING STRUCTURE V1.0 COMPLIANT)
// ============================================================================

const MASTER_PLANS: Record<WorkspaceId, PlanConfig[]> = {
  // --------------------------------------------------------------------------
  // 1. ADVOCATE WORKSPACE PLANS
  // --------------------------------------------------------------------------
  advocate: [
    {
      id: 'advocate_free',
      workspaceId: 'advocate',
      name: 'Advocate FREE Tier',
      badge: 'FREE TIER',
      priceMonthly: 0,
      priceYearly: 0,
      subtitle: 'Designed for independent advocates, trial lawyers, and legal consultants.',
      buttonText: 'Current Plan',
      storage: '1 GB Cloud Storage',
      runningCases: 'Up to 3 Active Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'cloud-outline',
          items: [
            { label: 'Active Cases Limit', value: 'Up to 3 Active Cases' },
            { label: 'Cloud Storage', value: '1 GB' },
          ],
        },
        {
          category: 'AI Legal™ Tools Included',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '100 chats/month' },
            { label: 'Draft Maker', value: '2 drafts/month' },
            { label: 'Legal Precedents', value: '2 searches/month' },
            { label: 'Contract Analyzer', value: '2 reviews/month' },
            { label: 'Evidence Analyst', value: '2 analyses/month' },
            { label: 'Strategy Engine', value: '2 strategies/month' },
            { label: 'Case Predictor', value: '2 predictions/month' },
          ],
        },
        {
          category: 'Courtroom & Suite',
          icon: 'people-outline',
          items: [
            { label: 'Mock Courtroom', value: '1 session/month' },
            { label: 'Client Connect', value: '1 listing' },
            { label: 'Knowledge Hub', value: '3 files' },
          ],
        },
      ],
    },
    {
      id: 'advocate_basic',
      workspaceId: 'advocate',
      name: 'Advocate BASIC Plan',
      badge: 'BASIC',
      priceMonthly: 499,
      priceYearly: 4990,
      subtitle: 'Designed for independent advocates & legal consultants.',
      buttonText: 'Upgrade to Basic',
      storage: '5 GB Cloud Storage',
      runningCases: 'Up to 50 Active Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'cloud-outline',
          items: [
            { label: 'Active Cases Limit', value: 'Up to 50 Active Cases' },
            { label: 'Cloud Storage', value: '5 GB' },
          ],
        },
        {
          category: 'AI Legal™ Tools Included',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '300 chats/month' },
            { label: 'Draft Maker', value: '5 drafts/month' },
            { label: 'Legal Precedents', value: '5 searches/month' },
            { label: 'Contract Analyzer', value: '5 reviews/month' },
            { label: 'Evidence Analyst', value: '5 analyses/month' },
            { label: 'Strategy Engine', value: '5 strategies/month' },
            { label: 'Case Predictor', value: '5 predictions/month' },
          ],
        },
        {
          category: 'Courtroom & Client Suite',
          icon: 'people-outline',
          items: [
            { label: 'Mock Courtroom', value: '2 sessions/month' },
            { label: 'Client Connect', value: '2 listings' },
          ],
        },
      ],
    },
    {
      id: 'advocate_pro',
      workspaceId: 'advocate',
      name: 'Advocate PRO Plan',
      badge: 'PRO',
      tag: 'MOST POPULAR',
      isPopular: true,
      priceMonthly: 999,
      priceYearly: 9990,
      subtitle: 'Designed for active advocates and trial lawyers.',
      buttonText: 'Upgrade to Pro',
      storage: '20 GB Cloud Storage',
      runningCases: 'Up to 100 Active Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'cloud-outline',
          items: [
            { label: 'Active Cases Limit', value: 'Up to 100 Active Cases' },
            { label: 'Cloud Storage', value: '20 GB' },
          ],
        },
        {
          category: 'AI Legal™ Tools Included',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '1,000 chats/month' },
            { label: 'Draft Maker', value: '15 drafts/month' },
            { label: 'Legal Precedents & Research Assistant', value: '15 searches/month' },
            { label: 'Contract Analyzer', value: '15 reviews/month' },
            { label: 'Evidence Analyst', value: '15 analyses/month' },
            { label: 'Strategy Engine', value: '15 strategies/month' },
            { label: 'Case Predictor', value: '15 predictions/month' },
          ],
        },
        {
          category: 'Courtroom & Client Suite',
          icon: 'flash-outline',
          items: [
            { label: 'Mock Courtroom', value: '5 sessions/month' },
            { label: 'Client Connect', value: '5 listings' },
            { label: 'Processing Speed', value: 'Priority AI Processing' },
          ],
        },
      ],
    },
    {
      id: 'advocate_premium',
      workspaceId: 'advocate',
      name: 'Advocate PREMIUM Plan',
      badge: 'PREMIUM',
      tag: 'UNLIMITED POWER',
      priceMonthly: 2399,
      priceYearly: 23990,
      subtitle: 'Complete AI Legal™ ecosystem for power users and senior advocates.',
      buttonText: 'Upgrade to Premium',
      storage: '100 GB Cloud Storage',
      runningCases: 'Up to 250 Active Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'cloud-outline',
          items: [
            { label: 'Active Cases Limit', value: 'Up to 250 Active Cases' },
            { label: 'Cloud Storage', value: '100 GB' },
          ],
        },
        {
          category: 'AI Legal™ Tools (Unlimited Access)',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: 'Unlimited Chats' },
            { label: 'Draft Maker', value: 'Unlimited (500 FUP)' },
            { label: 'Legal Precedents & Research Assistant', value: 'Unlimited' },
            { label: 'Contract Analyzer', value: 'Unlimited' },
            { label: 'Evidence Analyst', value: 'Unlimited' },
            { label: 'Strategy Engine', value: 'Unlimited' },
            { label: 'Case Predictor', value: 'Unlimited' },
          ],
        },
        {
          category: 'Courtroom & VIP Features',
          icon: 'shield-checkmark-outline',
          items: [
            { label: 'Mock Courtroom', value: '15 sessions/month' },
            { label: 'Client Connect', value: '20 listings' },
            { label: 'Support Level', value: '24/7 VIP Support' },
          ],
        },
      ],
    },
  ],

  // --------------------------------------------------------------------------
  // 2. STUDENT WORKSPACE PLANS
  // --------------------------------------------------------------------------
  student: [
    {
      id: 'student_free',
      workspaceId: 'student',
      name: 'Student FREE Tier',
      badge: 'FREE TIER',
      priceMonthly: 0,
      priceYearly: 0,
      subtitle: 'Designed for law students, bar exam candidates, and legal scholars.',
      buttonText: 'Current Plan',
      storage: '500 MB Cloud Storage',
      runningCases: 'Up to 3 Practice Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'book-outline',
          items: [
            { label: 'Practice Cases Limit', value: 'Up to 3 Practice Cases' },
            { label: 'Cloud Storage', value: '500 MB' },
          ],
        },
        {
          category: 'Academic AI Tools Included',
          icon: 'school-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '100 chats/month' },
            { label: 'Quiz & Practice', value: '2 sets/month' },
            { label: 'Draft Maker', value: '1 draft/month' },
            { label: 'Legal Precedents', value: '1 search/month' },
            { label: 'Contract Analyzer', value: '1 review/month' },
            { label: 'Evidence Analyst', value: '1 analysis/month' },
          ],
        },
      ],
    },
    {
      id: 'student_basic',
      workspaceId: 'student',
      name: 'Student BASIC Plan',
      badge: 'STUDENT BASIC',
      priceMonthly: 499,
      priceYearly: 4990,
      subtitle: 'Essential AI legal companion for law students & bar exam prep.',
      buttonText: 'Upgrade to Student Basic',
      storage: '5 GB Cloud Storage',
      runningCases: 'Up to 25 Practice Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'book-outline',
          items: [
            { label: 'Practice Cases Limit', value: 'Up to 25 Practice Cases' },
            { label: 'Cloud Storage', value: '5 GB' },
          ],
        },
        {
          category: 'Academic AI Tools Included',
          icon: 'school-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '300 chats/month' },
            { label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
            { label: 'Draft Maker', value: '5 drafts/month' },
            { label: 'Legal Precedents', value: '5 searches/month' },
            { label: 'Contract Analyzer', value: '5 reviews/month' },
            { label: 'Evidence Analyst', value: '5 analyses/month' },
            { label: 'Strategy Engine', value: '5 strategies/month' },
            { label: 'Case Predictor', value: '5 predictions/month' },
            { label: 'Mock Courtroom', value: '2 sessions/month' },
            { label: 'Notes Maker', value: '5 notes/month' },
          ],
        },
      ],
    },
    {
      id: 'student_pro',
      workspaceId: 'student',
      name: 'Student PRO Plan',
      badge: 'STUDENT PRO',
      tag: 'MOST POPULAR',
      isPopular: true,
      priceMonthly: 999,
      priceYearly: 9990,
      subtitle: 'Accelerate legal studies, research and moot court preparation.',
      buttonText: 'Upgrade to Student Pro',
      storage: '20 GB Cloud Storage',
      runningCases: 'Up to 50 Practice Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'book-outline',
          items: [
            { label: 'Practice Cases Limit', value: 'Up to 50 Practice Cases' },
            { label: 'Cloud Storage', value: '20 GB' },
          ],
        },
        {
          category: 'Academic AI Tools Included',
          icon: 'school-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '1,000 chats/month' },
            { label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
            { label: 'Draft Maker', value: '15 drafts/month' },
            { label: 'Legal Precedents & Research Assistant', value: '15 searches/month' },
            { label: 'Contract Analyzer', value: '15 reviews/month' },
            { label: 'Evidence Analyst', value: '15 analyses/month' },
            { label: 'Strategy Engine', value: '15 strategies/month' },
            { label: 'Case Predictor', value: '15 predictions/month' },
            { label: 'Mock Courtroom', value: '5 sessions/month' },
            { label: 'Notes Maker', value: '15 notes/month' },
          ],
        },
      ],
    },
    {
      id: 'student_premium',
      workspaceId: 'student',
      name: 'Student PREMIUM Plan',
      badge: 'STUDENT PREMIUM',
      priceMonthly: 2399,
      priceYearly: 23990,
      subtitle: 'Comprehensive AI suite for law scholars, LLM candidates & top interns.',
      buttonText: 'Upgrade to Student Premium',
      storage: '50 GB Cloud Storage',
      runningCases: 'Up to 100 Practice Cases',
      completedCases: 'Unlimited Archive',
      featureGroups: [
        {
          category: 'Quota & Capacity',
          icon: 'book-outline',
          items: [
            { label: 'Practice Cases Limit', value: 'Up to 100 Practice Cases' },
            { label: 'Cloud Storage', value: '50 GB' },
          ],
        },
        {
          category: 'Academic AI Tools Included',
          icon: 'school-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: 'Unlimited Chats' },
            { label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
            { label: 'Draft Maker', value: 'Unlimited' },
            { label: 'Legal Precedents & Research Assistant', value: 'Unlimited' },
            { label: 'Contract Analyzer', value: 'Unlimited' },
            { label: 'Evidence Analyst', value: 'Unlimited' },
            { label: 'Strategy Engine', value: 'Unlimited' },
            { label: 'Case Predictor', value: 'Unlimited' },
            { label: 'Mock Courtroom', value: '15 sessions/month' },
            { label: 'Notes Maker', value: 'Unlimited' },
          ],
        },
      ],
    },
  ],

  // --------------------------------------------------------------------------
  // 3. LAW FIRM WORKSPACE PLANS
  // --------------------------------------------------------------------------
  lawfirm: [
    {
      id: 'firm_free',
      workspaceId: 'lawfirm',
      name: 'Law Firm FREE Tier',
      badge: 'FREE TIER',
      priceMonthly: 0,
      priceYearly: 0,
      subtitle: 'Designed for law firms, corporate legal teams, and multi-advocate organizations.',
      buttonText: 'Current Plan',
      storage: '500 MB Shared Storage',
      runningCases: 'Up to 3 Active Cases',
      completedCases: 'Unlimited Archive',
      isSharedQuota: true,
      featureGroups: [
        {
          category: 'Team & Quota Capacity',
          icon: 'business-outline',
          items: [
            { label: 'Team Members Limit', value: '1 Advocate Member' },
            { label: 'Firm Active Cases Limit', value: 'Up to 3 Active Cases' },
            { label: 'Shared Firm Storage', value: '500 MB Shared' },
          ],
        },
        {
          category: 'Included AI Tools & Workflows',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '100 team chats/month' },
            { label: 'Multi-user Team Workspace', value: 'Included' },
            { label: 'Draft Maker', value: '1 draft/month' },
            { label: 'Contract Analyzer', value: '1 review/month' },
            { label: 'Legal Precedents', value: '1 search/month' },
          ],
        },
      ],
    },
    {
      id: 'firm_basic',
      workspaceId: 'lawfirm',
      name: 'Law Firm BASIC Plan',
      badge: 'FIRM BASIC',
      priceMonthly: 1499,
      priceYearly: 14990,
      subtitle: 'Designed for law firms, corporate legal teams, and associate practices.',
      buttonText: 'Upgrade to Firm Basic',
      storage: '25 GB Shared Storage',
      runningCases: 'Up to 100 Active Cases',
      completedCases: 'Unlimited Archive',
      isSharedQuota: true,
      featureGroups: [
        {
          category: 'Team & Quota Capacity',
          icon: 'business-outline',
          items: [
            { label: 'Team Members Limit', value: 'Up to 10 Team Members / Advocates' },
            { label: 'Firm Active Cases Limit', value: 'Up to 100 Active Cases' },
            { label: 'Shared Firm Storage', value: '25 GB Shared' },
          ],
        },
        {
          category: 'Included AI Tools & Workflows',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '1,500 team chats/month' },
            { label: 'Multi-user Team Workspace', value: 'Member Management' },
            { label: 'Draft Maker', value: '30 drafts/month' },
            { label: 'Legal Precedents', value: '30 searches/month' },
            { label: 'Contract Analyzer', value: '30 reviews/month' },
            { label: 'Evidence Analyst', value: '30 analyses/month' },
            { label: 'Strategy Engine', value: '30 strategies/month' },
            { label: 'Case Predictor', value: '30 predictions/month' },
            { label: 'Mock Courtroom', value: '10 sessions/month' },
            { label: 'Client Connect', value: '10 listings' },
            { label: 'Case Assignment & Member Task Workflow', value: 'Included' },
          ],
        },
      ],
    },
    {
      id: 'firm_pro',
      workspaceId: 'lawfirm',
      name: 'Law Firm PRO Plan',
      badge: 'FIRM PRO',
      tag: 'MOST POPULAR FOR FIRMS',
      isPopular: true,
      priceMonthly: 2999,
      priceYearly: 29990,
      subtitle: 'High-capacity legal automation for expanding law firms.',
      buttonText: 'Upgrade to Firm Pro',
      storage: '100 GB Shared Storage',
      runningCases: 'Up to 250 Active Cases',
      completedCases: 'Unlimited Archive',
      isSharedQuota: true,
      featureGroups: [
        {
          category: 'Team & Quota Capacity',
          icon: 'business-outline',
          items: [
            { label: 'Team Members Limit', value: 'Up to 25 Team Members / Advocates' },
            { label: 'Firm Active Cases Limit', value: 'Up to 250 Active Cases' },
            { label: 'Shared Firm Storage', value: '100 GB Shared' },
          ],
        },
        {
          category: 'Included AI Tools & Workflows',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '3,500 team chats/month' },
            { label: 'Multi-user Team Workspace', value: 'Member Management' },
            { label: 'Draft Maker', value: '100 drafts/month' },
            { label: 'Legal Precedents & Research Assistant', value: '100 searches/month' },
            { label: 'Contract Analyzer', value: '100 reviews/month' },
            { label: 'Evidence Analyst', value: '100 analyses/month' },
            { label: 'Strategy Engine', value: '100 strategies/month' },
            { label: 'Case Predictor', value: '100 predictions/month' },
            { label: 'Mock Courtroom', value: '25 sessions/month' },
            { label: 'Client Connect', value: '25 listings' },
            { label: 'Case Assignment & Member Task Workflow', value: 'Included' },
          ],
        },
      ],
    },
    {
      id: 'firm_premium',
      workspaceId: 'lawfirm',
      name: 'Law Firm PREMIUM Plan',
      badge: 'FIRM PREMIUM',
      tag: 'ENTERPRISE ECOSYSTEM',
      priceMonthly: 4999,
      priceYearly: 49990,
      subtitle: 'Enterprise-grade legal intelligence for full-scale law organizations.',
      buttonText: 'Upgrade to Firm Premium',
      storage: '500 GB Shared Storage',
      runningCases: 'Up to 500 Active Cases',
      completedCases: 'Unlimited Archive',
      isSharedQuota: true,
      featureGroups: [
        {
          category: 'Team & Quota Capacity',
          icon: 'business-outline',
          items: [
            { label: 'Team Members Limit', value: 'Up to 50 Team Members / Advocates' },
            { label: 'Firm Active Cases Limit', value: 'Up to 500 Active Cases' },
            { label: 'Shared Firm Storage', value: '500 GB Shared' },
          ],
        },
        {
          category: 'Included AI Tools & Workflows',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: 'Unlimited Team Chats' },
            { label: 'Multi-user Team Workspace', value: 'Member Management' },
            { label: 'Draft Maker', value: 'Unlimited' },
            { label: 'Legal Precedents & Research Assistant', value: 'Unlimited' },
            { label: 'Contract Analyzer', value: 'Unlimited' },
            { label: 'Evidence Analyst', value: 'Unlimited' },
            { label: 'Strategy Engine', value: 'Unlimited' },
            { label: 'Case Predictor', value: 'Unlimited' },
            { label: 'Mock Courtroom', value: '50 sessions/month' },
            { label: 'Client Connect', value: '50 listings' },
            { label: 'Case Assignment & Member Task Workflow', value: 'Included' },
          ],
        },
      ],
    },
  ],

  // --------------------------------------------------------------------------
  // 4. COMBO WORKSPACE PLANS
  // --------------------------------------------------------------------------
  combo: [
    {
      id: 'combo_student_advocate',
      workspaceId: 'combo',
      name: 'Student + Advocate Combo',
      badge: 'STUDENT + ADVOCATE',
      savingsBadge: 'SAVE 20%',
      priceMonthly: 1199,
      priceYearly: 11990,
      subtitle: 'Combined access for practicing advocates pursuing higher legal studies.',
      buttonText: 'Upgrade to Student + Advocate',
      storage: '25 GB Shared Storage',
      runningCases: 'Up to 50 Cases',
      completedCases: 'Unlimited Archive',
      includedWorkspaces: ['Student Workspace', 'Advocate Workspace'],
      featureGroups: [
        {
          category: 'Included Workspaces & Capacity',
          icon: 'layers-outline',
          items: [
            { label: 'Workspaces Unlocked', value: 'Dual Access (Student + Advocate)' },
            { label: 'Active Cases Limit', value: 'Up to 50 Cases' },
            { label: 'Shared Storage', value: '25 GB' },
          ],
        },
        {
          category: 'Included AI Tools & Feature Limits',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '500 chats/month' },
            { label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
            { label: 'Draft Maker & Contract Analyzer', value: '20/month' },
            { label: 'Legal Precedents', value: '20/month' },
            { label: 'Mock Courtroom', value: '5 sessions/month' },
            { label: 'Client Connect', value: '5 listings' },
          ],
        },
      ],
    },
    {
      id: 'combo_advocate_firm',
      workspaceId: 'combo',
      name: 'Advocate + Law Firm Combo',
      badge: 'ADVOCATE + FIRM',
      tag: 'MOST POPULAR BUNDLE',
      isPopular: true,
      savingsBadge: 'SAVE 25%',
      priceMonthly: 1499,
      priceYearly: 14990,
      subtitle: 'Ideal for senior partners running both a private practice and a firm.',
      buttonText: 'Upgrade to Advocate + Firm',
      storage: '50 GB Shared Storage',
      runningCases: 'Up to 100 Cases',
      completedCases: 'Unlimited Archive',
      includedWorkspaces: ['Advocate Workspace', 'Law Firm Workspace'],
      featureGroups: [
        {
          category: 'Included Workspaces & Capacity',
          icon: 'layers-outline',
          items: [
            { label: 'Workspaces Unlocked', value: 'Dual Access (Advocate + Law Firm)' },
            { label: 'Team Members Limit', value: 'Up to 10 Team Members' },
            { label: 'Active Cases Limit', value: 'Up to 100 Cases' },
            { label: 'Shared Storage', value: '50 GB Shared' },
          ],
        },
        {
          category: 'Included AI Tools & Feature Limits',
          icon: 'sparkles-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: '1,500 team chats/month' },
            { label: 'Draft Maker & Contract Analyzer', value: '30/month' },
            { label: 'Legal Precedents', value: '30/month' },
            { label: 'Mock Courtroom', value: '10 sessions/month' },
            { label: 'Client Connect', value: '10 listings' },
            { label: 'Case Assignment Workflow', value: 'Included' },
          ],
        },
      ],
    },
    {
      id: 'combo_all_access',
      workspaceId: 'combo',
      name: 'Combo All-Access Pass',
      badge: 'ALL ACCESS',
      tag: 'ULTIMATE BUNDLE',
      savingsBadge: 'SAVE UP TO 30%',
      priceMonthly: 2399,
      priceYearly: 23990,
      subtitle: 'Full Access to ALL 3 Workspaces (Student, Advocate & Law Firm).',
      buttonText: 'Upgrade to All Access',
      storage: '100 GB Shared Storage',
      runningCases: 'Up to 250 Cases',
      completedCases: 'Unlimited Archive',
      includedWorkspaces: ['Student', 'Advocate', 'Law Firm'],
      featureGroups: [
        {
          category: 'Included Workspaces & Capacity',
          icon: 'star-outline',
          items: [
            { label: 'Workspaces Unlocked', value: 'Full Access (Student + Advocate + Law Firm)' },
            { label: 'Team Members Limit', value: 'Up to 20 Team Members' },
            { label: 'Active Cases Limit', value: 'Up to 250 Cases' },
            { label: 'Shared Storage', value: '100 GB' },
          ],
        },
        {
          category: 'Included AI Tools & Feature Limits',
          icon: 'trophy-outline',
          items: [
            { label: 'AI Legal Chat & Assistants', value: 'Unlimited Chats' },
            { label: 'Quiz & Practice', value: 'Unlimited Quizzes' },
            { label: 'Draft Maker & Contract Analyzer', value: 'Unlimited' },
            { label: 'Legal Precedents & Research Assistant', value: 'Unlimited' },
            { label: 'Mock Courtroom', value: '15 sessions/month' },
            { label: 'Client Connect', value: '20 listings' },
            { label: 'Case Assignment Workflow', value: 'Included' },
          ],
        },
      ],
    },
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const mainScrollViewRef = useRef<ScrollView>(null);
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const { t } = useTranslation();

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  // Live Backend Subscription State
  const [liveSubscription, setLiveSubscription] = useState<any>(null);

  // Active States
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('advocate');

  // Active user plan key - workspace-scoped (prioritize live subscription for active workspace)
  const profileSubWorkspace = ((profile?.subscription as any)?.workspace || '').toLowerCase().replace('law_firm', 'lawfirm');
  const activeWsNormalized = (activeWorkspace || 'advocate').toLowerCase().replace('law_firm', 'lawfirm');
  const isProfileSubMatchingWs =
    profileSubWorkspace === activeWsNormalized ||
    profileSubWorkspace === 'combo' ||
    profileSubWorkspace === 'all' ||
    (profile?.subscription?.plan || '').toLowerCase().includes('combo');

  const rawPlan =
    (liveSubscription?.tier && liveSubscription.tier !== 'FREE' ? liveSubscription.tier : null) ||
    (isProfileSubMatchingWs && profile?.subscription?.plan && profile.subscription.plan !== 'FREE' ? profile.subscription.plan : null) ||
    liveSubscription?.tier ||
    (isProfileSubMatchingWs ? profile?.subscription?.plan : null) ||
    'FREE';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, { monthly: number; yearly: number }>>({});

  // Accordion State for Plan Comparison Table
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Checkout Modal & Real Razorpay Order State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<any>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>(process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'options' | 'qr'>('options');

  // Loading overlay states & Modal visibility
  const [redirectingWeb, setRedirectingWeb] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSuccessVisible, setCancelSuccessVisible] = useState(false);
  const [paymentSuccessVisible, setPaymentSuccessVisible] = useState(false);
  const [verifyingDeepLink, setVerifyingDeepLink] = useState(false);
  const [paymentFailedVisible, setPaymentFailedVisible] = useState(false);

  // User Coupon Code States
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponCode: string;
    discountType: string;
    discountValue: number;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);
  const [couponFeatureEnabled, setCouponFeatureEnabled] = useState<boolean>(true);

  // Handler for applying user coupon code
  const handleApplyCoupon = async (codeToUse?: string) => {
    const targetCode = (typeof codeToUse === 'string' ? codeToUse : couponInput || '').trim().toUpperCase();
    if (!targetCode) {
      setCouponError('❌ Please enter a coupon code.');
      setCouponSuccessMsg(null);
      return;
    }

    const currentWorkspacePlans = (MASTER_PLANS[activeWorkspace] || MASTER_PLANS.advocate).filter(
      (p) => p.priceMonthly > 0 || p.priceYearly > 0
    );
    const targetPlan = selectedPlan || currentWorkspacePlans[0];
    if (!targetPlan) {
      setCouponError('❌ Please select a plan first.');
      return;
    }

    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccessMsg(null);

    const planPriceObj = livePrices[targetPlan.id] || livePrices[targetPlan.badge?.toLowerCase()] || null;
    const basePrice = planPriceObj 
      ? (billingCycle === 'yearly' ? planPriceObj.yearly : planPriceObj.monthly)
      : (billingCycle === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly);

    try {
      const res = await BillingService.validateCoupon({
        couponCode: targetCode,
        planId: targetPlan.id,
        billingCycle,
        originalAmount: basePrice,
      });

      if (res && res.valid) {
        setAppliedCoupon({
          couponCode: res.couponCode,
          discountType: res.discountType,
          discountValue: res.discountValue,
          originalAmount: res.originalAmount,
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
        });
        setCouponSuccessMsg(`Coupon Applied ✓ Saved ₹${res.discountAmount}`);
        showToast('success', 'Coupon Applied 🎉', `You saved ₹${res.discountAmount}`);
      } else {
        const errorMsg = res?.message ? (res.message.startsWith('❌') ? res.message : `❌ ${res.message}`) : '❌ Invalid coupon code.';
        setCouponError(errorMsg);
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Error validating coupon code.';
      setCouponError(errMsg.startsWith('❌') ? errMsg : `❌ ${errMsg}`);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setCouponSuccessMsg(null);
    showToast('info', 'Coupon Removed', 'Restored original plan price.');
  };

  // Revalidate coupon whenever plan, billing cycle, or workspace changes
  useEffect(() => {
    if (!appliedCoupon) return;

    const currentWorkspacePlans = (MASTER_PLANS[activeWorkspace] || MASTER_PLANS.advocate).filter(
      (p) => p.priceMonthly > 0 || p.priceYearly > 0
    );
    const targetPlan = selectedPlan || currentWorkspacePlans[0];
    if (!targetPlan) return;

    const planPriceObj = livePrices[targetPlan.id] || livePrices[targetPlan.badge?.toLowerCase()] || null;
    const basePrice = planPriceObj 
      ? (billingCycle === 'yearly' ? planPriceObj.yearly : planPriceObj.monthly)
      : (billingCycle === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly);

    BillingService.validateCoupon({
      couponCode: appliedCoupon.couponCode,
      planId: targetPlan.id,
      billingCycle,
      originalAmount: basePrice,
    }).then((res: any) => {
      if (res && res.valid) {
        setAppliedCoupon({
          couponCode: res.couponCode,
          discountType: res.discountType,
          discountValue: res.discountValue,
          originalAmount: res.originalAmount,
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
        });
      } else {
        const msg = res?.message || 'This coupon is not applicable to the selected plan.';
        const formattedMsg = msg.startsWith('❌') ? msg : `❌ ${msg}`;
        setAppliedCoupon(null);
        setCouponError(formattedMsg);
        showToast('error', 'Coupon Removed', formattedMsg.replace('❌ ', ''));
      }
    }).catch(() => {
      setAppliedCoupon(null);
      setCouponError('❌ This coupon is not applicable to the selected plan.');
    });
  }, [billingCycle, activeWorkspace, selectedPlan?.id]);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));

  // Helper to sync live subscription and user profile from backend
  const syncLiveSubscription = async (targetWorkspace?: WorkspaceId) => {
    const ws = targetWorkspace || activeWorkspace;
    try {
      // Fetch dynamic plan prices from backend
      BillingService.getPlansConfig().then((plansRes: any) => {
        const pData = (plansRes as any)?.data ?? plansRes;
        if (pData && pData.prices) {
          setLivePrices(pData.prices);
        }
        if (pData && typeof pData.couponFeatureEnabled === 'boolean') {
          setCouponFeatureEnabled(pData.couponFeatureEnabled);
        }
      }).catch(() => {});

      const res = await BillingService.getCurrentSubscription(ws);
      if (res && (res as any).success) {
        const data = (res as any);
        if (data.subscription) {
          setLiveSubscription(data.subscription);
          if (profile && setProfile) {
            setProfile({
              ...profile,
              subscription: {
                ...(profile.subscription || {}),
                plan: data.subscription.tier || 'FREE',
                status: data.subscription.status || 'active',
                amount: data.subscription.amount || 0,
                autoRenew: typeof data.subscription.autoRenew === 'boolean' ? data.subscription.autoRenew : false,
                expiryDate: data.subscription.expiryDate || (profile.subscription as any)?.expiryDate,
              }
            });
          }
        }
        if (data.user && setProfile) {
          setProfile({
            ...data.user,
            subscription: {
              ...(data.user.subscription || profile?.subscription || {}),
              autoRenew: data.subscription?.autoRenew ?? data.user.subscription?.autoRenew ?? false,
            }
          });
        }
        useSubscriptionStore.getState().fetchSubscriptionStatus();
        return data;
      }
    } catch (e) {
      console.warn('[Billing] Sync live sub error:', e);
    }
    return null;
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    syncLiveSubscription();
  }, [activeWorkspace]);

  // Deep Link Handling & AppState Synchronization
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      console.log('[DeepLink] Received URL:', url);

      if (url.includes('subscription/success')) {
        setVerifyingDeepLink(true);
        showToast('info', 'Verifying Subscription...', 'Fetching latest entitlements from backend.');
        await syncLiveSubscription();
        setVerifyingDeepLink(false);
        setPaymentSuccessVisible(true);
      } else if (url.includes('subscription/failed')) {
        setPaymentFailedVisible(true);
      } else if (url.includes('subscription/cancelled')) {
        showToast('info', 'Payment Cancelled', 'Your subscription remained unchanged.');
      }
    };

    // Listen for incoming deep links
    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check initial deep link on app launch
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    });

    // Listen for AppState changes (Sync backend whenever app comes to foreground)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[AppState] App returned to active. Syncing subscription status...');
        syncLiveSubscription();
      }
    });

    return () => {
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [activeWorkspace]);

  // Initialize Google Play IAP & Listeners on Android
  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      googlePlayIapService.initialize();
      googlePlayIapService.setupPurchaseListeners(
        async (result: any) => {
          setLoading(false);
          setShowConfirmModal(false);
          setCheckoutVisible(false);
          const userData = result?.user || result?.data?.user;
          if (userData && setProfile) {
            setProfile(userData);
          }
          await syncLiveSubscription();
          showToast('success', 'Subscription Activated!', `${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} In-App Purchase verified successfully.`);
          setPaymentSuccessVisible(true);
        },
        (error: any) => {
          setLoading(false);
          setShowConfirmModal(false);
          setCheckoutVisible(false);
          if (error?.code !== 'E_USER_CANCELLED') {
            showToast('error', 'Purchase Failed', error?.message || 'In-App purchase could not be completed.');
          }
        }
      );
    }
    return () => {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        googlePlayIapService.removePurchaseListeners();
      }
    };
  }, [activeWorkspace]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const handleWorkspaceChange = (wsId: WorkspaceId) => {
    if (wsId !== activeWorkspace) {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setActiveWorkspace(wsId);
      syncLiveSubscription(wsId);
    }
  };

  const toggleComparison = () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsComparisonOpen(!isComparisonOpen);
  };

  const confirmActivatePlan = async (plan: PlanConfig) => {
    setSelectedPlan(plan);
    setShowConfirmModal(false);
    setLoading(true);

    const couponToPass = appliedCoupon?.couponCode || '';
    const targetBadge = plan.badge || 'PRO';
    const planIdToSend = plan.id || 'advocate_pro';

    // 1. Apple In-App Purchase Flow (StoreKit Sheet)
    if (Platform.OS === 'ios') {
      try {
        console.log('🍎 [confirmActivatePlan] Initiating Apple StoreKit Purchase for:', planIdToSend);
        await googlePlayIapService.purchaseSubscription(
          planIdToSend,
          billingCycle,
          activeWorkspace
        );
        // StoreKit sheet is presented. Successful purchase verification is handled by setupPurchaseListeners.
      } catch (err: any) {
        setLoading(false);
        const isCancelled = err?.code === 'E_USER_CANCELLED' || err?.message?.includes('cancelled') || err?.message?.includes('canceled');
        if (!isCancelled) {
          const errorMsg = err?.message || err?.debugMessage || (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.warn('[confirmActivatePlan Apple IAP Warning]', errorMsg);
          Alert.alert(
            'App Store Purchase',
            `${errorMsg}`,
            [{ text: 'OK' }]
          );
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Toggle to enable/disable native Google Play IAP
    const ENABLE_GOOGLE_PLAY_IAP = false;

    // 2. Android Google Play Billing Flow
    if (ENABLE_GOOGLE_PLAY_IAP && Platform.OS === 'android') {
      try {
        const success = await googlePlayIapService.purchaseSubscription(
          planIdToSend,
          billingCycle,
          activeWorkspace
        );
        if (success) {
          await syncLiveSubscription();
          setLoading(false);
          setPaymentSuccessVisible(true);
          return;
        }
      } catch (err: any) {
        console.warn('[confirmActivatePlan Play IAP Warning]', err?.message || err);
        setLoading(false);
        // Fallback to Secure Web Checkout (Razorpay) if Play Billing is unavailable or fails
        showToast('info', 'Secure Web Billing', 'Opening Razorpay Web Checkout Portal...');
        setTimeout(() => {
          openWebCheckoutPortal(plan, couponToPass);
        }, 300);
        return;
      }
    }

    // 2. Try In-App Razorpay Order Creation first
    try {
      const orderRes = await BillingService.createSubscriptionOrder(plan.id, billingCycle, couponToPass);
      const data = (orderRes as any)?.data ?? orderRes;
      if (data && data.order) {
        setRazorpayOrder(data.order);
        if (data.key) setRazorpayKey(data.key);
        setCheckoutVisible(true);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('[confirmActivatePlan Order Creation Fallback]', err?.message || err);
    }

    // 3. Direct Web Checkout Flow (Razorpay Web Portal)
    setLoading(false);
    openWebCheckoutPortal(plan, couponToPass);
  };

  // Direct Confirmation Flow on Upgrade
  const handleSelectPlan = (plan: PlanConfig) => {
    const isCurrent = isCurrentPlanCard(plan);

    if (isCurrent) {
      showToast('info', 'Current Active Plan', `You are already subscribed to ${plan.name}.`);
      return;
    }

    if (Platform.OS === 'ios') {
      console.log('🍎 [handleSelectPlan] iOS detected - triggering confirmActivatePlan directly for:', plan.id);
      confirmActivatePlan(plan);
      return;
    }

    setSelectedPlan(plan);
    setShowConfirmModal(true);
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'success') {
        setCheckoutVisible(false);
        setLoading(true);

        const targetBadge = selectedPlan?.badge || 'PRO';
        const planIdToSend = selectedPlan?.id || 'advocate_pro';

        try {
          const res = await BillingService.verifySubscriptionPayment({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            planId: planIdToSend,
            billingCycle,
          });

          const respData = (res as any)?.data ?? res;
          if (respData?.user && setProfile) {
            setProfile(respData.user);
            await syncLiveSubscription().catch(() => {});
            setPaymentSuccessVisible(true);
          } else {
            setPaymentFailedVisible(true);
          }
        } catch (err: any) {
          console.warn('[handleWebViewMessage Verification Failed]', err?.message || err);
          setPaymentFailedVisible(true);
        }
      } else if (data.status === 'cancelled' || data.status === 'failed') {
        setCheckoutVisible(false);
        setPaymentFailedVisible(true);
      }
    } catch (e) {
      console.warn('[handleWebViewMessage Parse Error]', e);
      setCheckoutVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // Optional Web Checkout Portal Redirection
  const openWebCheckoutPortal = async (planToUse?: PlanConfig, couponCodeToUse?: string) => {
    const targetPlan = planToUse || selectedPlan;
    if (!targetPlan) return;
    setCheckoutVisible(false);
    setRedirectingWeb(true);

    const couponToPass = couponCodeToUse || appliedCoupon?.couponCode || '';

    try {
      const res = await BillingService.generateCheckoutToken(activeWorkspace, targetPlan.id, billingCycle, couponToPass);
      const data = (res as any)?.data ?? res;
      const localApiBase = AppConfig.apiUrl ? AppConfig.apiUrl.replace('/api', '') : '';
      const checkoutUrl = data?.checkoutUrl || `${localApiBase}/api/subscription/web-checkout?workspace=${activeWorkspace}&plan=${targetPlan.id}&cycle=${billingCycle}${couponToPass ? `&coupon=${encodeURIComponent(couponToPass)}` : ''}&source=mobile&platform=android`;

      showToast('info', 'Secure Web Checkout', 'Opening secure Web Billing Portal...');

      try {
        const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'ailegal://subscription/success');
        if (result.type === 'success') {
          showToast('info', 'Verifying Subscription...', 'Fetching latest entitlements from backend.');
          await syncLiveSubscription();
          setPaymentSuccessVisible(true);
        }
      } catch {
        try {
          await WebBrowser.openBrowserAsync(checkoutUrl);
        } catch {
          await Linking.openURL(checkoutUrl);
        }
      }
    } catch (err: any) {
      console.error('[openWebCheckoutPortal Error]', err);
      const localApiBase = AppConfig.apiUrl ? AppConfig.apiUrl.replace('/api', '') : '';
      const fallbackUrl = `${localApiBase}/api/subscription/web-checkout?workspace=${activeWorkspace}&plan=${targetPlan.id}&cycle=${billingCycle}${couponToPass ? `&coupon=${encodeURIComponent(couponToPass)}` : ''}&source=mobile`;
      await Linking.openURL(fallbackUrl);
    } finally {
      setRedirectingWeb(false);
    }
  };

  const simulatePaymentSuccess = async () => {
    if (!selectedPlan) return;
    setCheckoutVisible(false);
    setPaymentMethod('options');
    setLoading(true);

    const targetBadge = selectedPlan.badge || 'PRO';
    const normalizedPlanId = selectedPlan.id;

    try {
      const orderId = createdOrder?.id || `order_mock_${Date.now()}`;
      const res = await BillingService.verifySubscriptionPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'mock_signature',
        planId: normalizedPlanId,
        billingCycle,
      });

      const data = (res as any)?.data ?? res;
      if (data?.user) {
        setProfile(data.user);
        setPaymentSuccessVisible(true);
      } else {
        const updatedSub = {
          plan: targetBadge as any,
          status: 'active' as const,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly,
          gateway: 'Razorpay',
          invoice: `INV-${Date.now().toString().slice(-8)}`,
          autoRenew: true,
        };
        if (profile) {
          setProfile({ ...profile, subscription: updatedSub });
        }
        setPaymentSuccessVisible(true);
      }
    } catch (err: any) {
      console.warn('[simulatePaymentSuccess Fallback Mode]', err?.message || err);
      const updatedSub = {
        plan: targetBadge as any,
        status: 'active' as const,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: selectedPlan ? (billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly) : 499,
        gateway: 'Razorpay',
        invoice: `INV-${Date.now().toString().slice(-8)}`,
        autoRenew: true,
      };
      if (profile) {
        setProfile({ ...profile, subscription: updatedSub });
      }
      setPaymentSuccessVisible(true);
    } finally {
      await syncLiveSubscription().catch(() => {});
      setLoading(false);
    }
  };

  const simulatePaymentCancel = () => {
    setCheckoutVisible(false);
    setPaymentMethod('options');
    setPaymentFailedVisible(true);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const storeRes = await googlePlayIapService.restorePurchases();
        const userData = storeRes?.user || storeRes?.data?.user;
        if (userData && setProfile) {
          setProfile(userData);
          await syncLiveSubscription();
          showToast('success', 'Purchases Restored', storeRes?.message || `${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} subscription was restored.`);
          setLoading(false);
          return;
        }
      }

      const res = await BillingService.restoreSubscription();
      if (res.success && (res.data || (res as any).user)) {
        const u = res.data?.user || (res as any).user;
        if (u && setProfile) setProfile(u);
        await syncLiveSubscription();
        showToast('success', 'Subscription Restored', res.message || 'Your premium plan is now active.');
      } else {
        showToast('info', 'No Active Subscription', res.message || 'Could not find any active premium records.');
      }
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not restore purchase.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Auto-Renewal',
      'Are you sure you want to cancel subscription auto-renewal? You will keep full access to your plan until the end of your current billing cycle.',
      [
        { text: 'Keep Auto-Renewal', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: () => executeCancelSubscription(),
        },
      ]
    );
  };

  const executeCancelSubscription = async () => {
    setLoading(true);
    try {
      const res = await BillingService.cancelSubscription();
      if (profile && setProfile) {
        setProfile({
          ...profile,
          subscription: profile.subscription
            ? {
                ...profile.subscription,
                autoRenew: false,
              }
            : undefined,
        });
      }
      showToast('success', 'Auto-Renewal Cancelled', res?.message || 'Auto-renewal has been cancelled successfully.');
      await syncLiveSubscription();
    } catch (err: any) {
      if (profile && setProfile) {
        setProfile({
          ...profile,
          subscription: profile.subscription
            ? {
                ...profile.subscription,
                autoRenew: false,
              }
            : undefined,
        });
      }
      showToast('success', 'Auto-Renewal Cancelled', 'Auto-renewal status updated.');
      await syncLiveSubscription();
    } finally {
      setLoading(false);
    }
  };

  const scrollToPlans = () => {
    if (mainScrollViewRef.current) {
      mainScrollViewRef.current.scrollTo({ y: 480, animated: true });
    }
  };

  const handleEnableAutoRenew = async () => {
    setLoading(true);
    try {
      const res = await BillingService.enableAutoRenew();
      if (profile && setProfile) {
        setProfile({
          ...profile,
          subscription: profile.subscription
            ? {
                ...profile.subscription,
                autoRenew: true,
              }
            : {
                plan: rawPlan,
                workspace: activeWorkspace,
                autoRenew: true,
              },
        });
      }
      showToast('success', 'Auto-Pay Enabled 🎉', res?.message || 'Auto-renewal has been enabled successfully.');
      await syncLiveSubscription();
    } catch (err: any) {
      showToast('error', 'Auto-Pay Error', err.response?.data?.message || err.message || 'Failed to enable auto-renewal.');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlanCard = (plan: PlanConfig) => {
    if (!rawPlan || rawPlan === 'FREE') return false;

    // Card can ONLY be "Current Plan" if it belongs to the active workspace
    const isMatchingWorkspace =
      plan.workspaceId === activeWorkspace ||
      (plan.workspaceId === 'combo' && activeWorkspace === 'combo');

    if (!isMatchingWorkspace) {
      return false;
    }

    const upRaw = rawPlan.toUpperCase();
    const upPlanId = plan.id.toUpperCase();
    const upBadge = (plan.badge || '').toUpperCase();

    if (upRaw === upPlanId) return true;

    if (upRaw.includes('PREMIUM') || upRaw.includes('ENTERPRISE')) {
      return upBadge.includes('PREMIUM') || upPlanId.includes('PREMIUM');
    }
    if (upRaw.includes('PRO') || upRaw.includes('PROFESSIONAL')) {
      return upBadge.includes('PRO') || upPlanId.includes('PRO');
    }
    if (upRaw.includes('BASIC') || upRaw.includes('STARTER')) {
      return upBadge.includes('BASIC') || upPlanId.includes('BASIC');
    }
    return false;
  };

  const formatPlanName = (pName: string) => {
    if (!pName || pName === 'FREE') return 'AI Legal™ Free';
    const up = pName.toUpperCase();
    if (up.includes('PREMIUM') || up.includes('ENTERPRISE')) return 'AI Legal™ Premium';
    if (up.includes('PRO') || up.includes('PROFESSIONAL')) return 'AI Legal™ Professional';
    if (up.includes('BASIC') || up.includes('STARTER')) return 'AI Legal™ Basic';
    return pName;
  };

  const formatBadgeText = (pName: string) => {
    if (!pName || pName === 'FREE') return 'FREE TIER';
    const up = pName.toUpperCase();
    if (up.includes('PREMIUM') || up.includes('ENTERPRISE')) return 'PREMIUM';
    if (up.includes('PRO') || up.includes('PROFESSIONAL')) return 'PROFESSIONAL';
    if (up.includes('BASIC') || up.includes('STARTER')) return 'BASIC';
    return pName;
  };

  const activePlanName = formatPlanName(rawPlan);
  const activeBadgeText = formatBadgeText(rawPlan);

  const getPlanAmount = () => {
    if (profile?.subscription?.amount) return `₹${profile.subscription.amount}`;
    if (rawPlan.includes('BASIC') || rawPlan.includes('STARTER')) return '₹499';
    if (rawPlan.includes('PRO') || rawPlan.includes('PROFESSIONAL')) return '₹999';
    if (rawPlan.includes('PREMIUM') || rawPlan.includes('ENTERPRISE')) return '₹2399';
    return '₹0';
  };

  const getActiveWorkspaceName = () => {
    const ws = WORKSPACES.find((w) => w.id === activeWorkspace);
    return ws ? ws.label : 'Advocate';
  };

  // Color Tokens - Dynamic Light & Dark Theme Support
  const goldAccent = '#C8A34D';
  const containerBg = isDark ? '#0A0A0C' : theme.background || '#F5F5F5';
  const headerBg = isDark ? '#111114' : theme.surface || '#FFFFFF';
  const headerBorder = isDark ? '#1F1F24' : theme.border || '#E5E5E5';
  const headerTitleColor = isDark ? '#FFFFFF' : theme.textPrimary || '#111111';

  // Current Plan Card Colors
  const currentPlanCardBg = isDark ? '#141417' : theme.card || '#FFFFFF';
  const currentPlanTitleColor = isDark ? '#FFFFFF' : theme.textPrimary || '#111111';
  const gridLabelColor = isDark ? '#8E8E93' : '#6B7280';
  const gridValueColor = isDark ? '#FFFFFF' : theme.textPrimary || '#111111';
  const actionPillBg = isDark ? '#1C1C20' : '#F3F4F6';
  const actionPillBorder = isDark ? 'rgba(200, 163, 77, 0.3)' : 'rgba(200, 163, 77, 0.4)';
  const actionPillTextColor = isDark ? '#FFFFFF' : '#111111';

  // Toggle & Chip Colors
  const toggleBg = isDark ? '#18181B' : '#E5E7EB';
  const toggleBorder = isDark ? '#27272A' : '#D1D5DB';
  const chipBgInactive = isDark ? '#18181B' : '#FFFFFF';
  const chipBorderInactive = isDark ? '#27272A' : '#E5E7EB';
  const chipTextInactive = isDark ? '#A1A1AA' : '#4B5563';

  // Plan Card Colors
  const cardBg = isDark ? '#141417' : theme.card || '#FFFFFF';
  const cardBorder = isDark ? '#27272A' : '#E5E7EB';
  const planNameColor = isDark ? '#FFFFFF' : theme.textPrimary || '#111111';
  const planSubtitleColor = isDark ? '#A1A1AA' : '#4B5563';
  const priceAmountColor = isDark ? '#FFFFFF' : theme.textPrimary || '#111111';
  const pricePeriodColor = isDark ? '#8E8E93' : '#6B7280';
  const featureGroupTitleColor = goldAccent;
  const featureItemTextColor = isDark ? '#E4E4E7' : '#1F2937';
  const activePlanBtnBg = isDark ? '#27272A' : '#E5E7EB';
  const activePlanBtnText = isDark ? '#A1A1AA' : '#6B7280';
  const dividerColor = isDark ? '#27272A' : '#E5E7EB';

  // Modal & Comparison Table Colors
  const modalContainerBg = isDark ? '#18181B' : '#FFFFFF';
  const modalBorderColor = isDark ? '#27272A' : '#E5E7EB';
  const tableHeaderBg = isDark ? '#1C1C20' : '#F3F4F6';
  const tableRowEvenBg = isDark ? '#141417' : '#FFFFFF';
  const tableRowOddBg = isDark ? '#18181B' : '#F9FAFB';

  const currentWorkspacePlans = (MASTER_PLANS[activeWorkspace] || MASTER_PLANS.advocate).filter(
    (p) => p.priceMonthly > 0 || p.priceYearly > 0
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: headerBorder, backgroundColor: headerBg }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={goldAccent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: headerTitleColor }]}>AI Legal Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView ref={mainScrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* ==================== 1. TOP SECTION: CURRENT PLAN CARD ==================== */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={[
              styles.currentPlanCard,
              {
                backgroundColor: currentPlanCardBg,
                borderColor: goldAccent,
                shadowColor: goldAccent,
              },
            ]}
          >
            <View style={styles.currentPlanHeaderRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.currentPlanSublabel}>CURRENT PLAN</Text>
                <Text style={[styles.currentPlanName, { color: currentPlanTitleColor }]} numberOfLines={1}>{activePlanName}</Text>
              </View>
              <View style={styles.statusBadgeContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText} numberOfLines={1}>{activeBadgeText}</Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />

            {(() => {
              const isFreePlan = !rawPlan || rawPlan.toUpperCase() === 'FREE';
              const isAutoRenewActive = typeof liveSubscription?.autoRenew === 'boolean'
                ? liveSubscription.autoRenew
                : profile?.subscription?.autoRenew === true;

              return (
                <>
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridItemLabel, { color: gridLabelColor }]}>Workspace</Text>
                      <Text style={[styles.gridItemValue, { color: goldAccent }]}>{getActiveWorkspaceName()}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridItemLabel, { color: gridLabelColor }]}>Billing Amount</Text>
                      <Text style={[styles.gridItemValue, { color: gridValueColor }]}>{getPlanAmount()}/month</Text>
                    </View>
                  </View>

                  <View style={[styles.detailsGrid, { marginTop: 12 }]}>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridItemLabel, { color: gridLabelColor }]}>Renewal Status</Text>
                      <Text style={[styles.gridItemValue, { color: isAutoRenewActive ? '#10B981' : '#F59E0B' }]}>
                        {isAutoRenewActive ? 'Auto Renew Active' : 'Manual Renewal / OFF'}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridItemLabel, { color: gridLabelColor }]}>Expiry Date</Text>
                      <Text style={[styles.gridItemValue, { color: gridValueColor }]}>
                        {profile?.subscription?.expiryDate
                          ? new Date(profile.subscription.expiryDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailsGrid, { marginTop: 12 }]}>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridItemLabel, { color: gridLabelColor }]}>Payment Gateway</Text>
                      <Text style={[styles.gridItemValue, { color: gridValueColor }]}>{profile?.subscription?.gateway || 'Razorpay'}</Text>
                    </View>
                    <View style={[styles.gridItem, { flex: 1.2 }]}>
                      <Text style={[styles.gridItemLabel, { color: gridLabelColor }]}>Invoice Number</Text>
                      <Text style={[styles.gridItemValue, { color: gridValueColor }]} numberOfLines={1}>
                        {profile?.subscription?.invoice || 'INV-OFFICIAL-FREE'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />
                </>
              );
            })()}

            {/* SUBSCRIPTION ACTION BUTTONS */}
            {(() => {
              const isFreePlan = !rawPlan || rawPlan.toUpperCase() === 'FREE';
              const isAutoRenewActive = typeof liveSubscription?.autoRenew === 'boolean'
                ? liveSubscription.autoRenew
                : profile?.subscription?.autoRenew === true;

              const handleAutoPayPress = () => {
                if (isFreePlan) {
                  Alert.alert('Auto-Pay Inactive', 'Auto-Pay is not required for Free Tier. Select a plan below to upgrade.', [
                    { text: 'Explore Plans', onPress: scrollToPlans },
                    { text: 'OK', style: 'cancel' }
                  ]);
                } else if (isAutoRenewActive) {
                  Alert.alert(
                    'Auto-Pay Active 🟢',
                    'Auto-Pay is currently ON for your subscription. Would you like to turn off auto-renewal?',
                    [
                      { text: 'Keep Auto-Pay ON', style: 'cancel' },
                      {
                        text: 'Turn OFF Auto-Pay',
                        style: 'destructive',
                        onPress: () => executeCancelSubscription(),
                      },
                    ]
                  );
                } else {
                  Alert.alert(
                    'Enable Auto-Pay 💳',
                    'Would you like to turn ON auto-renewal for your subscription?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Enable Auto-Pay',
                        onPress: () => handleEnableAutoRenew(),
                      },
                    ]
                  );
                }
              };

              const handleCancelPress = () => {
                if (isFreePlan) {
                  Alert.alert('Free Tier', 'You are currently on the Free Tier. There is no active paid subscription to cancel.');
                } else if (!isAutoRenewActive) {
                  Alert.alert(
                    'Auto-Renewal OFF 🟡',
                    'Auto-renewal is already turned OFF for your account. You will maintain access until your expiry date.',
                    [
                      { text: 'Re-Enable Auto-Pay', onPress: handleEnableAutoRenew },
                      { text: 'OK', style: 'cancel' }
                    ]
                  );
                } else {
                  handleCancelSubscription();
                }
              };

              const openStoreSubscriptions = () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {
                    showToast('info', 'App Store Settings', 'Open Settings > Apple ID > Subscriptions to manage your subscription.');
                  });
                } else {
                  Linking.openURL('https://play.google.com/store/account/subscriptions').catch(() => {
                    showToast('info', 'Google Play Store', 'Open Play Store > Profile > Payments & Subscriptions to manage.');
                  });
                }
              };

              return (
                <View style={{ gap: 10 }}>
                  <View style={styles.actionRowContainer}>
                    {/* 1. AUTO PAY BUTTON */}
                    <Pressable
                      style={[
                        styles.actionPillButton,
                        {
                          backgroundColor: isAutoRenewActive
                            ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5')
                            : actionPillBg,
                          borderColor: isAutoRenewActive ? '#10B981' : goldAccent,
                        },
                      ]}
                      onPress={handleAutoPayPress}
                    >
                      <Ionicons
                        name={isAutoRenewActive ? "checkmark-circle-outline" : "card-outline"}
                        size={16}
                        color={isAutoRenewActive ? "#10B981" : goldAccent}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.actionPillText,
                          { color: isAutoRenewActive ? "#10B981" : actionPillTextColor, fontWeight: '700' },
                        ]}
                      >
                        {isAutoRenewActive ? "Auto Pay: ON" : "Turn ON Auto Pay"}
                      </Text>
                    </Pressable>

                    {/* 2. CANCEL BUTTON */}
                    <Pressable
                      style={[
                        styles.actionPillButton,
                        {
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                          borderColor: '#EF4444',
                          opacity: (!isAutoRenewActive && !isFreePlan) ? 0.6 : 1
                        },
                      ]}
                      onPress={handleCancelPress}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={[styles.actionPillText, { color: '#EF4444', fontWeight: '700' }]}>
                        {isAutoRenewActive ? "Cancel Auto-Pay" : "Cancelled"}
                      </Text>
                    </Pressable>
                  </View>

                  {/* 3. STORE SUBSCRIPTION MANAGEMENT LINK */}
                  {!isFreePlan && (
                    <Pressable
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(200, 163, 77, 0.08)' : 'rgba(200, 163, 77, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(200, 163, 77, 0.3)',
                      }}
                      onPress={openStoreSubscriptions}
                    >
                      <Ionicons
                        name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
                        size={15}
                        color={goldAccent}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: goldAccent }}>
                        Manage Subscriptions in {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })()}
          </View>
        </View>

        {/* ==================== 2. WORKSPACE SELECTOR (STICKY CHIPS) ==================== */}
        <View style={[styles.stickySelectorWrapper, { backgroundColor: containerBg }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workspaceChipsScroll}
          >
            {WORKSPACES.map((ws) => {
              const isActive = activeWorkspace === ws.id;
              return (
                <Pressable
                  key={ws.id}
                  style={[
                    styles.workspaceChip,
                    isActive
                      ? { backgroundColor: goldAccent, borderColor: goldAccent }
                      : { backgroundColor: chipBgInactive, borderColor: chipBorderInactive },
                  ]}
                  onPress={() => handleWorkspaceChange(ws.id)}
                >
                  <Ionicons
                    name={ws.icon as any}
                    size={18}
                    color={isActive ? '#000000' : goldAccent}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.workspaceChipText, isActive ? { color: '#000000', fontWeight: '800' } : { color: chipTextInactive }]}>
                    {ws.label}
                  </Text>
                  {ws.badge ? (
                    <View style={[styles.chipBadge, isActive ? { backgroundColor: '#000000' } : { backgroundColor: '#10B981' }]}>
                      <Text style={[styles.chipBadgeText, isActive ? { color: goldAccent } : { color: '#FFFFFF' }]}>
                        {ws.badge}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.workspaceDescriptionText}>
            {WORKSPACES.find((w) => w.id === activeWorkspace)?.description}
          </Text>
        </View>

        {/* ==================== 3. MONTHLY / YEARLY TOGGLE ==================== */}
        <View style={styles.toggleWrapper}>
          <View style={[styles.cycleContainer, { backgroundColor: toggleBg, borderColor: toggleBorder }]}>
            <Pressable
              style={[styles.cycleButton, billingCycle === 'monthly' && styles.cycleButtonActive]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[styles.cycleText, billingCycle === 'yearly' ? { color: chipTextInactive } : styles.cycleTextActive]}>
                Monthly
              </Text>
            </Pressable>
            <Pressable
              style={[styles.cycleButton, billingCycle === 'yearly' && styles.cycleButtonActive]}
              onPress={() => setBillingCycle('yearly')}
            >
              <View style={styles.yearlyLabelRow}>
                <Text style={[styles.cycleText, billingCycle === 'yearly' ? styles.cycleTextActive : { color: chipTextInactive }]}>
                  Yearly
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>SAVE 15%</Text>
                </View>
              </View>
            </Pressable>
          </View>
          <Text style={styles.saveDiscountSubtext}>Save 15% yearly.</Text>
        </View>

        {/* ==================== 4. DYNAMIC PRICING CARDS LIST ==================== */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {currentWorkspacePlans.map((plan) => {
            const isCurrent = isCurrentPlanCard(plan);

            const planPriceObj = livePrices[plan.id] || livePrices[plan.badge?.toLowerCase()] || null;
            const displayPrice = planPriceObj 
              ? (billingCycle === 'yearly' ? planPriceObj.yearly : planPriceObj.monthly)
              : (billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly);

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                  plan.isPopular && [styles.popularPlanCard, { borderColor: goldAccent }],
                ]}
              >
                {/* TAG BANNERS */}
                {plan.tag ? (
                  <View style={[styles.cardTagBanner, plan.isPopular ? { backgroundColor: goldAccent } : { backgroundColor: isDark ? '#27272A' : '#E5E7EB' }]}>
                    <Text style={[styles.cardTagText, plan.isPopular ? { color: '#000000' } : { color: isDark ? '#A1A1AA' : '#4B5563' }]}>
                      {plan.tag}
                    </Text>
                  </View>
                ) : null}

                {/* SAVINGS BADGE FOR COMBOS */}
                {plan.savingsBadge ? (
                  <View style={styles.comboSavingsPill}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.comboSavingsText}>{plan.savingsBadge}</Text>
                  </View>
                ) : null}

                <View style={[styles.planHeader, plan.tag ? { marginTop: 12 } : null]}>
                  <Text style={[styles.planNameText, { color: planNameColor }]}>{plan.name}</Text>
                  <Text style={[styles.planSubtitleText, { color: planSubtitleColor }]}>{plan.subtitle}</Text>
                </View>

                {/* PRICE ROW */}
                <View style={styles.priceSection}>
                  <Text style={styles.priceCurrencySymbol}>₹</Text>
                  <Text style={[styles.priceAmountText, { color: priceAmountColor }]}>{displayPrice}</Text>
                  <Text style={[styles.pricePeriodText, { color: pricePeriodColor }]}>
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </Text>
                </View>

                {/* INCLUDED WORKSPACES (FOR COMBOS) */}
                {plan.includedWorkspaces && plan.includedWorkspaces.length > 0 ? (
                  <View style={styles.includedWorkspacesContainer}>
                    <Text style={styles.includedWorkspacesTitle}>INCLUDED WORKSPACES:</Text>
                    <View style={styles.workspacesChipsRow}>
                      {plan.includedWorkspaces.map((wsItem, idx) => (
                        <View key={idx} style={styles.workspacePill}>
                          <Ionicons name="checkmark-circle" size={13} color={goldAccent} style={{ marginRight: 4 }} />
                          <Text style={styles.workspacePillText}>{wsItem}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* LAW FIRM SHARED QUOTA NOTICE */}
                {plan.isSharedQuota ? (
                  <View style={styles.sharedQuotaBanner}>
                    <Ionicons name="people" size={14} color={goldAccent} style={{ marginRight: 6 }} />
                    <Text style={styles.sharedQuotaText}>Shared Across Entire Firm</Text>
                  </View>
                ) : null}

                <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />

                {/* STRUCTURED FEATURE GROUPS (NO WALL OF TEXT) */}
                <View style={styles.featuresContainer}>
                  {plan.featureGroups.map((group, gIdx) => (
                    <View key={gIdx} style={styles.featureGroupBlock}>
                      <View style={styles.groupHeaderRow}>
                        <Ionicons name={group.icon as any} size={16} color={goldAccent} style={{ marginRight: 6 }} />
                        <Text style={[styles.groupTitleText, { color: featureGroupTitleColor }]}>{group.category}</Text>
                      </View>

                      {group.items.map((item, iIdx) => (
                        <View key={iIdx} style={styles.featureItemRow}>
                          <Ionicons name="checkmark-circle" size={16} color={goldAccent} style={{ marginRight: 8, marginTop: 1 }} />
                          <Text style={[styles.featureItemLabel, { color: featureItemTextColor }]}>
                            {item.label}: <Text style={{ fontWeight: '800', color: planNameColor }}>{item.value}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>

                {/* ACTION BUTTON */}
                <Pressable
                  style={({ pressed }) => [
                    styles.subscribeButton,
                    isCurrent ? { backgroundColor: activePlanBtnBg } : { backgroundColor: goldAccent },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => !isCurrent && handleSelectPlan(plan)}
                  disabled={isCurrent || loading}
                >
                  {loading && selectedPlan?.id === plan.id ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={[styles.subscribeButtonText, { color: isCurrent ? activePlanBtnText : '#000000' }]}>
                      {isCurrent ? 'Current Plan' : plan.buttonText}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </Animated.View>

        {/* ==================== 5. PLAN COMPARISON EXPANDABLE TABLE ==================== */}
        <View style={[styles.comparisonSection, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Pressable style={styles.comparisonHeaderToggle} onPress={toggleComparison}>
            <View style={styles.comparisonTitleRow}>
              <Ionicons name="analytics-outline" size={20} color={goldAccent} style={{ marginRight: 8 }} />
              <Text style={[styles.comparisonTitleText, { color: planNameColor }]}>Compare Plans & Feature Matrix</Text>
            </View>
            <Ionicons name={isComparisonOpen ? 'chevron-up' : 'chevron-down'} size={20} color={goldAccent} />
          </Pressable>

          {isComparisonOpen ? (
            <View style={styles.comparisonTableBody}>
              <View style={[styles.tableHeaderRow, { backgroundColor: tableHeaderBg }]}>
                <Text style={[styles.tableHeaderCell, { flex: 1.4, color: planNameColor }]}>Feature</Text>
                <Text style={[styles.tableHeaderCell, { color: goldAccent }]}>Basic</Text>
                <Text style={[styles.tableHeaderCell, { color: goldAccent }]}>Pro</Text>
                <Text style={[styles.tableHeaderCell, { color: goldAccent }]}>Premium</Text>
              </View>

              {[
                { name: 'Running Cases', b: '50', p: '100', pr: '250' },
                { name: 'Completed Cases', b: 'Unlimited', p: 'Unlimited', pr: 'Unlimited' },
                { name: 'Secure Storage', b: '5 GB', p: '20 GB', pr: '100 GB' },
                { name: 'Draft Maker', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Court Prep', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Legal Precedent', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Evidence Analysis', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Contract Analyzer', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Case Predictor', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Strategy Engine', b: '5 Uses', p: '15 Uses', pr: 'Unlimited (Fair Usage Policy)' },
                { name: 'Mock Courtroom', b: '2 Sess/mo', p: '5 Sess/mo', pr: '15 Sess/mo' },
                { name: 'Client Connect', b: '2 Uses/mo', p: '5 Uses/mo', pr: '20 Uses/mo' },
                { name: 'Support', b: 'Standard', p: 'Priority', pr: 'VIP 24/7' },
              ].map((row, rIdx) => (
                <View
                  key={rIdx}
                  style={[
                    styles.tableDataRow,
                    { backgroundColor: rIdx % 2 === 0 ? tableRowEvenBg : tableRowOddBg, borderBottomColor: dividerColor },
                  ]}
                >
                  <Text style={[styles.tableCellName, { flex: 1.4, color: featureItemTextColor }]}>{row.name}</Text>
                  <Text style={[styles.tableCellVal, { color: planSubtitleColor }]}>{row.b}</Text>
                  <Text style={[styles.tableCellVal, { color: planNameColor, fontWeight: '700' }]}>{row.p}</Text>
                  <Text style={[styles.tableCellVal, { color: goldAccent, fontWeight: '800' }]}>{row.pr}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* ==================== 6. TERMS OF USE & PRIVACY POLICY FOOTER (iOS ONLY) ==================== */}
        {Platform.OS === 'ios' && (
          <View style={styles.legalNoticeFooter}>
            <Text style={[styles.legalNoticeText, { color: planSubtitleColor }]}>
              By subscribing, you agree to our{' '}
              <Text
                style={[styles.legalNoticeLink, { color: goldAccent }]}
                onPress={async () => {
                  try {
                    await WebBrowser.openBrowserAsync('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
                  } catch {
                    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
                  }
                }}
              >
                Terms of Use (EULA)
              </Text>
              {' '}and{' '}
              <Text
                style={[styles.legalNoticeLink, { color: goldAccent }]}
                onPress={() => router.push('/privacy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
            <Text style={[styles.legalNoticeSubText, { color: isDark ? '#6B7280' : '#94A3B8' }]}>
              Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current billing cycle. You can manage or cancel your subscription anytime in your App Store Account Settings.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ==================== REDIRECTING TO WEB CHECKOUT OVERLAY ==================== */}
      <Modal visible={redirectingWeb} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor }]}>
            <ActivityIndicator size="large" color="#C8A34D" style={{ marginBottom: 16 }} />
            <Text style={[styles.feedbackSubtitle, { color: headerTitleColor }]}>Redirecting to Secure Checkout...</Text>
            <Text style={[styles.feedbackDesc, { color: planSubtitleColor }]}>
              Opening the AI Legal Web Billing Portal to complete your purchase securely.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ==================== VERIFYING DEEP LINK OVERLAY ==================== */}
      <Modal visible={verifyingDeepLink} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor }]}>
            <ActivityIndicator size="large" color="#C8A34D" style={{ marginBottom: 16 }} />
            <Text style={[styles.feedbackSubtitle, { color: headerTitleColor }]}>Verifying Subscription...</Text>
            <Text style={[styles.feedbackDesc, { color: planSubtitleColor }]}>
              Connecting to backend entitlement engine to activate your plan.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ==================== REAL IN-APP RAZORPAY CHECKOUT MODAL ==================== */}
      <Modal visible={checkoutVisible} transparent animationType="slide" onRequestClose={() => setCheckoutVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.checkoutContainer, { backgroundColor: modalContainerBg, borderColor: modalBorderColor, height: '88%' }]}>
            <View style={[styles.checkoutHeader, { borderBottomColor: dividerColor, paddingVertical: 14, paddingHorizontal: 20 }]}>
              <View style={styles.merchantInfo}>
                <Text style={[styles.merchantName, { color: headerTitleColor, fontSize: 16, fontWeight: '800' }]}>
                  Razorpay Secure Checkout
                </Text>
                <Text style={[styles.merchantDesc, { color: goldAccent, fontSize: 12, fontWeight: '600' }]}>
                  Plan: {selectedPlan?.name} (₹{billingCycle === 'yearly' ? selectedPlan?.priceYearly : selectedPlan?.priceMonthly})
                </Text>
              </View>
              <Pressable onPress={() => setCheckoutVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={headerTitleColor} />
              </Pressable>
            </View>

            <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0C' : '#FFFFFF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }}>
              {razorpayOrder ? (
                <WebView
                  originWhitelist={['https://*.razorpay.com', 'https://checkout.razorpay.com', 'https://*.api.razorpay.com', 'https://api.razorpay.com']}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  mixedContentMode="never"
                  onMessage={handleWebViewMessage}
                  onShouldStartLoadWithRequest={(request) => {
                    if (
                      request.url.startsWith('upi://') ||
                      request.url.startsWith('phonepe://') ||
                      request.url.startsWith('gpay://') ||
                      request.url.startsWith('paytm://')
                    ) {
                      Linking.openURL(request.url).catch(() => {});
                      return false;
                    }
                    return true;
                  }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  source={{
                    baseUrl: 'https://checkout.razorpay.com',
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <style>
                          html, body { width: 100%; height: 100%; margin: 0; padding: 0; background-color: ${isDark ? '#0A0A0C' : '#FFFFFF'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; color: ${isDark ? '#FFF' : '#111'}; overflow: hidden; }
                          .loader { border: 4px solid ${isDark ? '#1F1F24' : '#E5E7EB'}; border-top: 4px solid #C8A34D; border-radius: 50%; width: 44px; height: 44px; animation: spin 1s linear infinite; margin-bottom: 16px; }
                          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                          .text { color: #C8A34D; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; text-align: center; }
                          .subtext { color: ${isDark ? '#9CA3AF' : '#6B7280'}; font-size: 12px; margin-top: 6px; }
                        </style>
                        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                      </head>
                      <body>
                        <div class="loader"></div>
                        <div class="text">Opening Razorpay Gateway...</div>
                        <div class="subtext">Please complete payment inside this window</div>

                        <script>
                          setTimeout(function() {
                            var options = {
                              "key": "${razorpayKey}",
                              "amount": "${razorpayOrder.amount}",
                              "currency": "${razorpayOrder.currency || 'INR'}",
                              "name": "AI LEGAL™",
                              "description": "${selectedPlan?.name || 'Subscription Plan'}",
                              "order_id": "${razorpayOrder.id}",
                              "prefill": {
                                "name": "${profile?.fullName || ''}",
                                "email": "${profile?.email || ''}",
                                "contact": "${profile?.phone || profile?.phoneNumber || ''}"
                              },
                              "theme": {
                                "color": "#C8A34D"
                              },
                              "handler": function (response) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                  status: 'success',
                                  razorpay_payment_id: response.razorpay_payment_id,
                                  razorpay_order_id: response.razorpay_order_id,
                                  razorpay_signature: response.razorpay_signature
                                }));
                              },
                              "modal": {
                                "ondismiss": function() {
                                  console.log('Razorpay modal window dismissed or redirected');
                                },
                                "backdropclose": false,
                                "escape": true
                              }
                            };
                            var rzp1 = new Razorpay(options);
                            rzp1.on('payment.failed', function (response){
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                status: 'failed',
                                error: response.error
                              }));
                            });
                            rzp1.open();
                          }, 300);
                        </script>
                      </body>
                      </html>
                    `
                  }}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#C8A34D" />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== PAYMENT SUCCESS MODAL ==================== */}
      <Modal visible={paymentSuccessVisible} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor }]}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            </View>
            <Text style={styles.feedbackTitle}>🎉</Text>
            <Text style={[styles.feedbackSubtitle, { color: headerTitleColor }]}>Welcome to AI Legal Pro</Text>
            <Text style={[styles.feedbackDesc, { color: planSubtitleColor }]}>
              {selectedPlan?.name} Activated Successfully
            </Text>
            <Pressable
              style={styles.feedbackButton}
              onPress={() => {
                setPaymentSuccessVisible(false);
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
            >
              <Text style={styles.feedbackButtonText}>Go to Profile</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ==================== PAYMENT FAILED MODAL ==================== */}
      <Modal visible={paymentFailedVisible} transparent animationType="fade">
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor }]}>
            <View style={styles.failedIconWrapper}>
              <Ionicons name="close-circle" size={60} color="#EF4444" />
            </View>
            <Text style={[styles.feedbackSubtitle, { color: headerTitleColor }]}>Payment Cancelled</Text>
            <Text style={[styles.feedbackDesc, { color: planSubtitleColor }]}>Your subscription update was not completed.</Text>
            <Pressable style={styles.feedbackButton} onPress={() => setPaymentFailedVisible(false)}>
              <Text style={styles.feedbackButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ==================== CONFIRM SUBSCRIPTION MODAL ==================== */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor, padding: 20, width: '100%', maxWidth: 360, position: 'relative' }]}>
            {/* Top Right Close Button */}
            <Pressable
              onPress={() => setShowConfirmModal(false)}
              style={{ position: 'absolute', top: 12, right: 12, padding: 6, zIndex: 10 }}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>

            {/* Sparkles Icon Header */}
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(200, 163, 77, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(200, 163, 77, 0.3)' }}>
              <Ionicons name="sparkles" size={28} color="#C8A34D" />
            </View>

            <Text style={[styles.feedbackSubtitle, { color: headerTitleColor, textAlign: 'center', fontSize: 19, fontWeight: '800' }]}>
              Confirm Subscription
            </Text>

            <Text style={[styles.feedbackDesc, { color: planSubtitleColor, textAlign: 'center', marginTop: 2, marginBottom: 14, fontSize: 12.5 }]}>
              Please review your selected plan details before confirming.
            </Text>

            {/* Selected Plan Info Card */}
            {selectedPlan && (
              <View style={{ width: '100%', backgroundColor: isDark ? '#141417' : '#F9FAFB', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: isDark ? '#27272A' : '#E5E7EB', marginBottom: 16 }}>
                {/* Plan Name & Badge Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: planNameColor, flexShrink: 1 }}>
                    {selectedPlan.name}
                  </Text>
                  <View style={{ backgroundColor: 'rgba(200, 163, 77, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: goldAccent }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: goldAccent, letterSpacing: 0.5 }}>
                      {selectedPlan.badge}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: dividerColor, marginVertical: 8 }} />

                {/* Workspace Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }}>
                  <Text style={{ fontSize: 12.5, color: gridLabelColor, fontWeight: '500', flex: 1 }}>Target Workspace</Text>
                  <Text style={{ fontSize: 12.5, color: planNameColor, fontWeight: '700', textTransform: 'capitalize', flexShrink: 1, textAlign: 'right' }}>
                    {getActiveWorkspaceName()}
                  </Text>
                </View>

                {/* Price Details Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }}>
                  <Text style={{ fontSize: 12.5, color: gridLabelColor, fontWeight: '500', flex: 1 }}>Plan Price</Text>
                  <Text style={{ fontSize: 14, color: appliedCoupon ? pricePeriodColor : goldAccent, textDecorationLine: appliedCoupon ? 'line-through' : 'none', fontWeight: '800', flexShrink: 1, textAlign: 'right' }}>
                    {(() => {
                      const planPriceObj = livePrices[selectedPlan.id] || livePrices[selectedPlan.badge?.toLowerCase()] || null;
                      const modalPrice = planPriceObj 
                        ? (billingCycle === 'yearly' ? planPriceObj.yearly : planPriceObj.monthly)
                        : (billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly);
                      return `₹${modalPrice}`;
                    })()}
                  </Text>
                </View>

                {/* Coupon Input Section */}
                {couponFeatureEnabled && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: dividerColor }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: planNameColor, marginBottom: 6 }}>
                    Have a coupon code?
                  </Text>

                  {appliedCoupon ? (
                    <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: '#10B981', borderRadius: 10, padding: 10, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="pricetag-outline" size={16} color="#10B981" />
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#10B981', letterSpacing: 0.5 }}>{appliedCoupon.couponCode}</Text>
                        </View>
                        <Pressable onPress={handleRemoveCoupon} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>Remove</Text>
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 11.5, color: '#10B981', fontWeight: '700' }}>
                        Discount: -₹{appliedCoupon.discountAmount} ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : 'Fixed Discount'})
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={{
                          flex: 1,
                          height: 40,
                          backgroundColor: isDark ? '#1C1C20' : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: couponError ? '#EF4444' : dividerColor,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          fontSize: 13,
                          fontWeight: '700',
                          color: planNameColor,
                          letterSpacing: 0.5,
                        }}
                        value={couponInput}
                        onChangeText={(val) => {
                          setCouponInput(val.toUpperCase());
                          setCouponError(null);
                        }}
                        placeholder="ENTER CODE (e.g. LEGAL50)"
                        placeholderTextColor={pricePeriodColor}
                        autoCapitalize="characters"
                      />
                      <Pressable
                        style={{
                          backgroundColor: goldAccent,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: couponLoading ? 0.7 : 1,
                        }}
                        onPress={() => handleApplyCoupon()}
                        disabled={couponLoading}
                      >
                        {couponLoading ? (
                          <ActivityIndicator size="small" color="#000000" />
                        ) : (
                          <Text style={{ color: '#000000', fontSize: 12.5, fontWeight: '800' }}>Apply</Text>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {couponError ? (
                    <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: '600' }}>{couponError}</Text>
                  ) : null}

                  {couponSuccessMsg && !appliedCoupon ? (
                    <Text style={{ fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: '600' }}>{couponSuccessMsg}</Text>
                  ) : null}
                </View>
                )}

                {/* Final Payable Amount Row */}
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: dividerColor, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: planNameColor }}>You Pay</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, color: goldAccent, fontWeight: '900' }}>
                      ₹{appliedCoupon ? appliedCoupon.finalAmount : (() => {
                        const planPriceObj = livePrices[selectedPlan.id] || livePrices[selectedPlan.badge?.toLowerCase()] || null;
                        return planPriceObj 
                          ? (billingCycle === 'yearly' ? planPriceObj.yearly : planPriceObj.monthly)
                          : (billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly);
                      })()}
                      <Text style={{ fontSize: 11, color: pricePeriodColor, fontWeight: '400' }}>
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </Text>
                    </Text>
                    {appliedCoupon ? (
                      <Text style={{ fontSize: 10.5, color: '#10B981', fontWeight: '800', marginTop: 1 }}>
                        🎉 You Save ₹{appliedCoupon.discountAmount}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons Row */}
            <View style={{ width: '100%', flexDirection: 'row', gap: 10 }}>
              <Pressable
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: actionPillBg,
                  borderWidth: 1,
                  borderColor: chipBorderInactive,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={{ color: headerTitleColor, fontSize: 13.5, fontWeight: '700' }}>Cancel</Text>
              </Pressable>

              <Pressable
                style={{
                  flex: 1.3,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  backgroundColor: goldAccent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: goldAccent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
                onPress={() => {
                  setShowConfirmModal(false);
                  if (selectedPlan) {
                    confirmActivatePlan(selectedPlan);
                  }
                }}
              >
                <Text style={{ color: '#000000', fontSize: 13.5, fontWeight: '800', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                  Confirm & Activate
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== CANCEL AUTO-RENEWAL MODAL ==================== */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor, padding: 24, position: 'relative' }]}>
            {/* Top Right Close (Cross) Icon */}
            <Pressable
              onPress={() => setShowCancelModal(false)}
              style={{ position: 'absolute', top: 14, right: 14, padding: 6, zIndex: 10 }}
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>

            <Text style={[styles.feedbackSubtitle, { color: headerTitleColor, textAlign: 'center', marginTop: 12, fontSize: 19, fontWeight: '700' }]}>
              Cancel Auto-Renewal
            </Text>

            <Text style={[styles.feedbackDesc, { color: planSubtitleColor, textAlign: 'center', marginVertical: 16, fontSize: 14, lineHeight: 20 }]}>
              Are you sure you want to cancel automatic renewal for your subscription? You will retain access until the end of your billing cycle.
            </Text>

            <View style={{ width: '100%', gap: 10, marginTop: 4 }}>
              <Pressable
                style={[styles.feedbackButton, { backgroundColor: '#EF4444' }]}
                onPress={executeCancelSubscription}
              >
                <Text style={[styles.feedbackButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  CANCEL AUTO-RENEWAL
                </Text>
              </Pressable>

              <Pressable
                style={[styles.feedbackButton, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={[styles.feedbackButtonText, { color: isDark ? '#E5E7EB' : '#374151', fontWeight: '600' }]}>
                  KEEP SUBSCRIPTION
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== CANCEL AUTO-RENEWAL SUCCESS POPUP ==================== */}
      <Modal visible={cancelSuccessVisible} transparent animationType="fade" onRequestClose={() => setCancelSuccessVisible(false)}>
        <View style={styles.feedbackOverlay}>
          <View style={[styles.feedbackCard, { backgroundColor: modalContainerBg, borderColor: modalBorderColor, padding: 24 }]}>
            <View style={[styles.feedbackIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444' }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#EF4444" />
            </View>

            <Text style={[styles.feedbackTitle, { color: headerTitleColor, marginTop: 12 }]}>Auto-Renewal Cancelled</Text>
            <Text style={[styles.feedbackDesc, { color: planSubtitleColor, textAlign: 'center', marginVertical: 14, fontSize: 13.5, lineHeight: 20 }]}>
              Your automatic subscription renewal has been successfully cancelled. Renewal Status is now updated to Manual Renewal. Your current plan features remain 100% active until your billing expiry date.
            </Text>

            <Pressable
              style={[styles.feedbackButton, { backgroundColor: goldAccent, width: '100%', height: 48, borderRadius: 14 }]}
              onPress={() => setCancelSuccessVisible(false)}
            >
              <Text style={[styles.feedbackButtonText, { color: '#111111', fontWeight: '700', fontSize: 15 }]}>OK, Understood</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ==================== LEGAL NOTICE FOOTER ====================
  legalNoticeFooter: {
    marginTop: 28,
    marginBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  legalNoticeText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalNoticeLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalNoticeSubText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },

  // ==================== CURRENT PLAN CARD ====================
  currentPlanCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  currentPlanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPlanSublabel: {
    color: '#C8A34D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 22,
    fontWeight: '800',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.3)',
    maxWidth: '45%',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
    flexShrink: 0,
  },
  statusBadgeText: {
    color: '#C8A34D',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
  },
  gridItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  gridItemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionPillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ==================== WORKSPACE CHIPS ====================
  stickySelectorWrapper: {
    paddingVertical: 10,
    marginBottom: 16,
  },
  workspaceChipsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  workspaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  workspaceChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  chipBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  workspaceDescriptionText: {
    color: '#C8A34D',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.2,
  },

  // ==================== TOGGLE ====================
  toggleWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cycleContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    width: '100%',
  },
  cycleButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleButtonActive: {
    backgroundColor: '#C8A34D',
  },
  cycleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  cycleTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  yearlyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  saveDiscountSubtext: {
    color: '#C8A34D',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // ==================== PRICING CARDS ====================
  planCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  popularPlanCard: {
    borderWidth: 2,
    shadowColor: '#C8A34D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTagBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  comboSavingsPill: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  comboSavingsText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginTop: 4,
  },
  planNameText: {
    fontSize: 21,
    fontWeight: '800',
  },
  planSubtitleText: {
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 17,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 14,
  },
  priceCurrencySymbol: {
    color: '#C8A34D',
    fontSize: 22,
    fontWeight: '800',
    marginRight: 2,
  },
  priceAmountText: {
    fontSize: 32,
    fontWeight: '900',
  },
  pricePeriodText: {
    fontSize: 13.5,
    fontWeight: '600',
    marginLeft: 6,
  },

  // COMBOS & LAW FIRM BANNERS
  includedWorkspacesContainer: {
    backgroundColor: 'rgba(200, 163, 77, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.2)',
  },
  includedWorkspacesTitle: {
    color: '#C8A34D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  workspacesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  workspacePillText: {
    color: '#C8A34D',
    fontSize: 11,
    fontWeight: '700',
  },
  sharedQuotaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
  },
  sharedQuotaText: {
    color: '#C8A34D',
    fontSize: 11.5,
    fontWeight: '800',
  },

  // STRUCTURED FEATURE GROUPS
  featuresContainer: {
    marginBottom: 20,
    gap: 14,
  },
  featureGroupBlock: {},
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupTitleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  featureItemLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },

  subscribeButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ==================== COMPARISON TABLE ====================
  comparisonSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  comparisonHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonTitleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  comparisonTableBody: {
    marginTop: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableCellName: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  tableCellVal: {
    flex: 1,
    fontSize: 10.5,
    textAlign: 'center',
  },

  // ==================== MODALS ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  checkoutContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '85%',
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '800',
  },
  merchantDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  checkoutBody: {
    marginVertical: 16,
  },
  amountBox: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    color: '#C8A34D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  amountText: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  qrCodeMatrix: {
    width: 160,
    height: 160,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrCorner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 4,
    borderColor: '#111827',
    borderRadius: 4,
  },
  qrBoxInner: {
    width: 120,
    height: 120,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBoxText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4B5563',
    marginTop: 4,
  },
  qrInstructions: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  qrTimer: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 8,
  },
  qrPayBtn: {
    backgroundColor: '#C8A34D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  qrPayBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  checkoutFooter: {
    marginTop: 8,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackCard: {
    width: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  failedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  feedbackIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 32,
    marginBottom: 4,
  },
  feedbackSubtitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  feedbackDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  feedbackButton: {
    height: 48,
    alignSelf: 'stretch',
    backgroundColor: '#C8A34D',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  topupBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  topupBadgeBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 0.5,
  },
});
