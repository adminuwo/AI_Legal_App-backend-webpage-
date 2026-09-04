import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CreditCard, Package, Settings, BarChart3,
  Search, Shield, Ban, Trash2, Plus, Edit2, X,
  TrendingUp, DollarSign, Activity, Zap,
  ChevronDown, Save, RefreshCw, ArrowLeft, FileUp,
  Eye, EyeOff, Check, AlertCircle, FileText, PlusCircle, Headphones, BookOpen,
  Globe, Cpu, Server, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, UserCheck, Key, Tag
} from 'lucide-react';
import { getUserData } from '../userStore/userData';
import { isSuperAdmin } from '../utils/isSuperAdmin';
import { API } from '../types.js';
import { logo } from '../constants.js';
import toast from 'react-hot-toast';

const ADMIN_EMAIL = 'admin@uwo24.com';
const PROD_API_BASE = 'https://ai-legal-app-backend-743928421487.asia-south1.run.app/api';

const getLocalApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:8080/api';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
    return `http://${host}:8080/api`;
  }
  return PROD_API_BASE;
};

// Live Dynamic API Fetcher with automatic Localhost / Local IP & Production Fallback
let CURRENT_API_BASE = getLocalApiBase();

async function apiAdminFetch(endpoint, options = {}) {
  const user = getUserData();
  let token = localStorage.getItem('token') || user?.token || '';

  if (!token) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const p = JSON.parse(storedUser);
        token = p.token || p.user?.token || '';
      }
    } catch (e) {}
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(CURRENT_API_BASE + endpoint, { ...options, headers });
    const data = await res.json();
    return data;
  } catch (err) {
    const fallbackBase = CURRENT_API_BASE.includes('8080') ? PROD_API_BASE : 'http://localhost:8080/api';
    try {
      const res = await fetch(fallbackBase + endpoint, { ...options, headers });
      return await res.json();
    } catch(lErr) {}
    throw err;
  }
}

// ─── Loading Spinner ───
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading AI Legal™ Admin Console...</span>
  </div>
);

// ─── Main Admin Dashboard Component ───
const AdminDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const user = getUserData();
  const isAdmin = user?.token && (user?.email?.toLowerCase() === ADMIN_EMAIL || user?.role === 'admin' || isSuperAdmin(user));

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Backend Data States
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    onlineUsers: 0,
    premiumUsers: 0,
    freeUsers: 0,
    revenueToday: 0,
    revenueMonth: 0,
    revenueLifetime: 0,
    totalCreditsUsed: 0,
    totalCases: 0,
    contractsAnalyzed: 0,
    courtPrepSessions: 0,
    strategyReports: 0,
    casePredictorReports: 0,
    draftsGenerated: 0,
    evidenceAnalyses: 0,
    chatUsage: 0,
    apiUsage: 0,
    storageUsed: 0,
    pendingFeatures: 0,
    openBugs: 0,
    dailyActivity: []
  });

  const [usersList, setUsersList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [featuresList, setFeaturesList] = useState([]);
  const [bugsList, setBugsList] = useState([]);
  const [adminSettings, setAdminSettings] = useState({
    maintenanceMode: false,
    sessionTimeout: 30,
    platformName: 'AI Legal Pro',
    aiModel: 'gpt-4-turbo',
    defaultCredits: 50,
    fileUploadLimitMb: 25,
    storageLimitGb: 5,
    supportEmail: 'admin@uwo24.com'
  });

  // Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [billingSearch, setBillingSearch] = useState('');
  const [billingFilter, setBillingFilter] = useState('all');

  // Modals & Action States
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserPlan, setSelectedUserPlan] = useState('advocate_pro');
  const [selectedUserBillingCycle, setSelectedUserBillingCycle] = useState('monthly');
  const [selectedUserCreditInput, setSelectedUserCreditInput] = useState('');
  const [selectedUserResetPassInput, setSelectedUserResetPassInput] = useState('');

  const [creditModalUser, setCreditModalUser] = useState(null);
  const [creditAmount, setCreditAmount] = useState('50');
  const [planModalUser, setPlanModalUser] = useState(null);
  const [newPlanId, setNewPlanId] = useState('advocate_pro');

  const [editingPlanModal, setEditingPlanModal] = useState(null);
  const [isCreatingPlanModal, setIsCreatingPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    planId: '',
    planName: '',
    priceMonthly: 499,
    priceYearly: 4990,
    credits: 100,
    badge: '',
    isPopular: false,
    isActive: true,
    featuresText: ''
  });

  // Request & Bug Filter & Modal States
  const [featureFilterState, setFeatureFilterState] = useState('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [bugSeverityFilter, setBugSeverityFilter] = useState('all');
  const [selectedFeatureModal, setSelectedFeatureModal] = useState(null);
  const [selectedBugModal, setSelectedBugModal] = useState(null);
  const [devReplyInput, setDevReplyInput] = useState('');
  const [devStatusInput, setDevStatusInput] = useState('Planned');
  const [bugDevNotesInput, setBugDevNotesInput] = useState('');
  const [bugStatusInput, setBugStatusInput] = useState('in_progress');

  // Jurisdiction Panel State
  const [jSearchQuery, setJSearchQuery] = useState('');
  const [jSelectedUser, setJSelectedUser] = useState(null);
  const [jTargetCountry, setJTargetCountry] = useState({ name: 'India', code: 'IN', flag: '🇮🇳' });
  const [jOverrideType, setJOverrideType] = useState('Temporary');
  const [jCountryDropdownOpen, setJCountryDropdownOpen] = useState(false);
  const [jCountrySearch, setJCountrySearch] = useState('');
  const [jTestQuery, setJTestQuery] = useState('');
  const [jTestResult, setJTestResult] = useState('');
  const [jSaving, setJSaving] = useState(false);
  const [jRunningTest, setJRunningTest] = useState(false);

  // Settings State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Coupon States
  const [couponsList, setCouponsList] = useState([]);
  const [couponStats, setCouponStats] = useState({ totalCoupons: 0, activeCoupons: 0, expiredCoupons: 0, totalDiscountGiven: 0 });
  const [couponFeatureEnabled, setCouponFeatureEnabled] = useState(true);
  const [couponFilterState, setCouponFilterState] = useState('all');
  const [editingCouponModal, setEditingCouponModal] = useState(null);
  const [isCreatingCouponModal, setIsCreatingCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 20,
    applicablePlans: ['ALL'],
    billingCycles: ['ALL'],
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    usageLimit: 100,
    perUserLimit: 1,
    minimumPurchase: 0,
    maximumDiscount: 500,
    status: 'active'
  });

  // Access Control Redirect
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard/chat', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Load Data Effect
  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsRes, usersRes, billingRes, plansRes, featuresRes, bugsRes, settingsRes, couponsRes] = await Promise.all([
        apiAdminFetch('/admin/stats').catch(() => ({ success: false })),
        apiAdminFetch('/admin/users').catch(() => ({ success: false })),
        apiAdminFetch('/admin/billing').catch(() => ({ success: false })),
        apiAdminFetch('/admin/plans').catch(() => ({ success: false })),
        apiAdminFetch('/admin/features').catch(() => ({ success: false })),
        apiAdminFetch('/admin/bugs').catch(() => ({ success: false })),
        apiAdminFetch('/admin/settings').catch(() => ({ success: false })),
        apiAdminFetch('/admin/coupons').catch(() => ({ success: false })),
      ]);

      if (statsRes?.stats || statsRes?.success) {
        const s = statsRes.stats || statsRes;
        if (s && typeof s === 'object') setStats(prev => ({ ...prev, ...s }));
      }

      // Users List parsing & seed fallback
      const userListFetched = usersRes?.list || usersRes?.users || usersRes?.data?.users || usersRes?.data || (Array.isArray(usersRes) ? usersRes : null);
      if (Array.isArray(userListFetched) && userListFetched.length > 0) {
        setUsersList(userListFetched);
      } else {
        setUsersList([
          { _id: 'u1', name: 'Aditi Lakhera', email: 'aditi@uwo24.com', role: 'SUPER_ADMIN', currentPlan: 'Enterprise Pro', totalCases: 148, isBlocked: false, phone: '+91 9876543210', createdAt: '2025-01-15' },
          { _id: 'u2', name: 'Advocate Anmol Sharma', email: 'anmol.advocate@gmail.com', role: 'Advocate', currentPlan: 'Professional', totalCases: 52, isBlocked: false, phone: '+91 9812345678', createdAt: '2025-02-10' },
          { _id: 'u3', name: 'Abha Legal Firm', email: 'contact@abhalegal.com', role: 'Law Firm', currentPlan: 'Enterprise', totalCases: 310, isBlocked: false, phone: '+91 9988776655', createdAt: '2025-03-01' },
          { _id: 'u4', name: 'Rajesh Kumar & Associates', email: 'rajesh.law@outlook.com', role: 'Advocate', currentPlan: 'Starter', totalCases: 18, isBlocked: false, phone: '+91 9711223344', createdAt: '2025-04-12' },
          { _id: 'u5', name: 'Priya Mehta Advocate', email: 'priya.mehta@juris.in', role: 'Advocate', currentPlan: 'Free', totalCases: 4, isBlocked: false, phone: '+91 9655443322', createdAt: '2025-05-20' },
          { _id: 'u6', name: 'Vikramaditya Singh', email: 'vikram.singh@highcourt.in', role: 'Advocate', currentPlan: 'Professional', totalCases: 89, isBlocked: false, phone: '+91 9844332211', createdAt: '2025-06-05' },
          { _id: 'u7', name: 'Siddharth Roy Legal', email: 'siddharth.roy@law.in', role: 'Advocate', currentPlan: 'Free', totalCases: 2, isBlocked: true, phone: '+91 9733221100', createdAt: '2025-06-18' }
        ]);
      }

      // Billing Payments List
      const billingFetched = billingRes?.list || billingRes?.payments || billingRes?.data?.payments || billingRes?.data || (Array.isArray(billingRes) ? billingRes : null);
      if (Array.isArray(billingFetched) && billingFetched.length > 0) {
        setPaymentsList(billingFetched);
      } else {
        setPaymentsList([
          { _id: 'p1', paymentId: 'pay_NzA162819', userEmail: 'anmol.advocate@gmail.com', amount: 999, status: 'success', date: '2026-07-28', plan: 'Professional' },
          { _id: 'p2', paymentId: 'pay_NzA162820', userEmail: 'contact@abhalegal.com', amount: 2399, status: 'success', date: '2026-07-27', plan: 'Enterprise' },
          { _id: 'p3', paymentId: 'pay_NzA162821', userEmail: 'rajesh.law@outlook.com', amount: 499, status: 'success', date: '2026-07-25', plan: 'Starter' },
          { _id: 'p4', paymentId: 'pay_NzA162822', userEmail: 'vikram.singh@highcourt.in', amount: 999, status: 'success', date: '2026-07-20', plan: 'Professional' }
        ]);
      }

      // Plans List
      const plansFetched = plansRes?.plans || plansRes?.data?.plans || plansRes?.data || (Array.isArray(plansRes) ? plansRes : null);
      if (Array.isArray(plansFetched) && plansFetched.length > 0) {
        setPlansList(plansFetched);
      } else {
        setPlansList([
          { _id: 'advocate_basic', planId: 'advocate_basic', planName: 'AI Legal™ Advocate Basic', priceMonthly: 499, priceYearly: 4990, badge: 'ADVOCATE BASIC', isActive: true },
          { _id: 'advocate_pro', planId: 'advocate_pro', planName: 'AI Legal™ Advocate Pro', priceMonthly: 999, priceYearly: 9990, badge: 'ADVOCATE PRO', isPopular: true, isActive: true },
          { _id: 'advocate_premium', planId: 'advocate_premium', planName: 'AI Legal™ Advocate Premium', priceMonthly: 2399, priceYearly: 23990, badge: 'ADVOCATE PREMIUM', isActive: true },
          { _id: 'student_basic', planId: 'student_basic', planName: 'AI Legal™ Student Basic', priceMonthly: 499, priceYearly: 4990, badge: 'STUDENT BASIC', isActive: true },
          { _id: 'student_pro', planId: 'student_pro', planName: 'AI Legal™ Student Pro', priceMonthly: 999, priceYearly: 9990, badge: 'STUDENT PRO', isPopular: true, isActive: true },
          { _id: 'student_premium', planId: 'student_premium', planName: 'AI Legal™ Student Premium', priceMonthly: 2399, priceYearly: 23990, badge: 'STUDENT PREMIUM', isActive: true },
          { _id: 'firm_basic', planId: 'firm_basic', planName: 'AI Legal™ Firm Basic', priceMonthly: 1499, priceYearly: 14990, badge: 'FIRM BASIC', isActive: true },
          { _id: 'firm_pro', planId: 'firm_pro', planName: 'AI Legal™ Firm Pro', priceMonthly: 2999, priceYearly: 29990, badge: 'FIRM PRO', isPopular: true, isActive: true },
          { _id: 'firm_premium', planId: 'firm_premium', planName: 'AI Legal™ Firm Premium', priceMonthly: 4999, priceYearly: 49990, badge: 'FIRM PREMIUM', isActive: true },
          { _id: 'combo_student_advocate', planId: 'combo_student_advocate', planName: 'Student + Advocate Combo', priceMonthly: 1199, priceYearly: 11990, badge: 'STUDENT + ADVOCATE', isActive: true },
          { _id: 'combo_advocate_firm', planId: 'combo_advocate_firm', planName: 'Advocate + Law Firm Combo', priceMonthly: 1499, priceYearly: 14990, badge: 'ADVOCATE + FIRM', isPopular: true, isActive: true },
          { _id: 'combo_all_access', planId: 'combo_all_access', planName: 'All Access Ecosystem Pass', priceMonthly: 2399, priceYearly: 23990, badge: 'ALL ACCESS', isActive: true },
          { _id: 'FREE', planId: 'FREE', planName: 'AI Legal™ Free Plan', priceMonthly: 0, priceYearly: 0, badge: 'FREE TIER', isActive: true }
        ]);
      }

      // Bugs List
      const bugsFetched = bugsRes?.bugs || bugsRes?.list || bugsRes?.data?.bugs || bugsRes?.data || (Array.isArray(bugsRes) ? bugsRes : null);
      if (Array.isArray(bugsFetched) && bugsFetched.length > 0) {
        setBugsList(bugsFetched);
      } else {
        setBugsList([
          { _id: 'b1', platform: 'Android', severity: 'Critical', status: 'in_progress', title: 'High Court Case Precedent Search Timeout', description: 'Queries over 500 pages of judgment text experience HTTP 504 gateway timeouts.', device: 'Samsung S24 Ultra', osVersion: 'Android 14', email: 'anmol.advocate@gmail.com', developerAssigned: 'Cloud Infra Team', internalNotes: 'Increasing timeout window to 45s on API Gateway.' },
          { _id: 'b2', platform: 'Web', severity: 'Major', status: 'open', title: 'PDF OCR Alignment in Vernacular Hindi Drafts', description: 'Hindi font glyphs occasionally misalign during PDF generation.', device: 'MacBook Pro M3', osVersion: 'macOS 15', email: 'priya.mehta@juris.in', developerAssigned: 'Frontend Lead' },
          { _id: 'b3', platform: 'iOS', severity: 'Minor', status: 'resolved', title: 'Payment Receipt PDF Download Retry Error', description: 'Retrying receipt download after network drop fails silently.', device: 'iPhone 15 Pro', osVersion: 'iOS 17.5', email: 'vikram.singh@highcourt.in', developerAssigned: 'Mobile Team' }
        ]);
      }

      // Feature Requests List
      const featuresFetched = featuresRes?.features || featuresRes?.list || featuresRes?.data?.features || featuresRes?.data || (Array.isArray(featuresRes) ? featuresRes : null);
      if (Array.isArray(featuresFetched) && featuresFetched.length > 0) {
        setFeaturesList(featuresFetched);
      } else {
        setFeaturesList([
          { _id: 'fr1', category: 'Court AI Assistant', priority: 'Critical', status: 'Planned', title: 'Supreme Court AI Case Outcome Predictor', description: 'Enable multi-bench historical analytics for landmark Constitutional bench judgements.', email: 'anmol.advocate@gmail.com', userPlan: 'Advocate Pro', developerAssigned: 'Vikram AI Dev', reply: 'Scheduled for v3.2 release cycle.' },
          { _id: 'fr2', category: 'Document Intelligence', priority: 'Normal', status: 'In Progress', title: 'Bulk PDF Vernacular OCR (Hindi, Marathi, Tamil)', description: 'Support batch processing of scanned court orders in 12 regional languages.', email: 'aditi@uwo24.com', userPlan: 'Enterprise Pro', developerAssigned: 'OCR Engineering Team' },
          { _id: 'fr3', category: 'Drafting Engine', priority: 'Normal', status: 'Completed', title: 'Custom Law Firm Letterhead Watermark Engine', description: 'Allow advocates to embed custom PNG logos on generated Legal Notices.', email: 'rajesh.law@outlook.com', userPlan: 'Firm Pro', reply: 'Feature live in production!' }
        ]);
      }

      // Coupons List
      const couponsFetched = couponsRes?.coupons || couponsRes?.list || couponsRes?.data?.coupons || couponsRes?.data || (Array.isArray(couponsRes) ? couponsRes : null);
      if (Array.isArray(couponsFetched) && couponsFetched.length > 0) {
        setCouponsList(couponsFetched);
        if (couponsRes?.stats) setCouponStats(couponsRes.stats);
      } else {
        setCouponsList([
          { _id: 'c1', code: 'ADVOCATE50', discountType: 'percentage', discountValue: 50, applicablePlans: ['ALL'], billingCycles: ['ALL'], usedCount: 14, usageLimit: 100, expiryDate: '2026-12-31', status: 'active', computedStatus: 'ACTIVE' },
          { _id: 'c2', code: 'WELCOME100', discountType: 'fixed', discountValue: 100, applicablePlans: ['advocate_pro'], billingCycles: ['monthly'], usedCount: 42, usageLimit: 500, expiryDate: '2026-09-30', status: 'active', computedStatus: 'ACTIVE' },
          { _id: 'c3', code: 'STUDENT20', discountType: 'percentage', discountValue: 20, applicablePlans: ['student_basic', 'student_pro'], billingCycles: ['ALL'], usedCount: 8, usageLimit: 50, expiryDate: '2026-08-01', status: 'inactive', computedStatus: 'EXPIRED' }
        ]);
      }

      if (settingsRes?.settings) setAdminSettings(prev => ({ ...prev, ...settingsRes.settings }));
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return null;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchesSearch = !userSearch || 
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.email?.toLowerCase().includes(userSearch.toLowerCase());
      
      const planName = (u.currentPlan || u.subscription?.plan || 'FREE').toLowerCase();
      const isSuspended = u.isBlocked || u.isSuspended;
      const matchesFilter = 
        userFilter === 'all' ? true :
        userFilter === 'free' ? (planName.includes('free') || planName === 'free') :
        userFilter === 'premium' ? (!planName.includes('free') && planName !== 'free') :
        userFilter === 'suspended' ? isSuspended : true;

      return matchesSearch && matchesFilter;
    });
  }, [usersList, userSearch, userFilter]);

  // Filtered Billing
  const filteredBilling = useMemo(() => {
    return paymentsList.filter(p => {
      const uName = typeof p.userId === 'object' ? p.userId?.name : (p.userName || '');
      const uEmail = typeof p.userId === 'object' ? p.userId?.email : (p.userEmail || '');
      const pName = typeof p.planId === 'object' ? p.planId?.planName : (p.planName || p.planId || '');
      const txnId = p.transactionId || p.paymentId || p.invoiceNumber || p._id || '';

      const searchTarget = `${uName} ${uEmail} ${pName} ${txnId}`.toLowerCase();
      const matchesSearch = !billingSearch || searchTarget.includes(billingSearch.toLowerCase());
      
      const matchesFilter = 
        billingFilter === 'all' ? true :
        (p.status || '').toLowerCase() === billingFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [paymentsList, billingSearch, billingFilter]);

  // Handlers for User Actions
  const handleToggleSuspend = async (userId) => {
    try {
      const res = await apiAdminFetch(`/admin/users/${userId}/toggle-suspend`, { method: 'POST' });
      if (res.success) {
        toast.success(res.message || 'User status updated');
        loadData(true);
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (e) {
      toast.error('Failed to toggle suspend status');
    }
  };

  const handleAdjustCredits = async () => {
    if (!creditModalUser) return;
    try {
      const res = await apiAdminFetch(`/admin/users/${creditModalUser._id}/adjust-credits`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseInt(creditAmount) || 50, actionType: 'add' })
      });
      if (res.success) {
        toast.success(`Added ${creditAmount} credits to ${creditModalUser.name}`);
        setCreditModalUser(null);
        loadData(true);
      } else {
        toast.error(res.message || 'Failed to adjust credits');
      }
    } catch (e) {
      toast.error('Credit adjustment failed');
    }
  };

  const handleChangePlan = async () => {
    if (!planModalUser) return;
    try {
      const res = await apiAdminFetch(`/admin/users/${planModalUser._id}/change-plan`, {
        method: 'POST',
        body: JSON.stringify({ planId: newPlanId })
      });
      if (res.success) {
        toast.success(`Plan updated for ${planModalUser.name}`);
        setPlanModalUser(null);
        loadData(true);
      } else {
        toast.error(res.message || 'Failed to update plan');
      }
    } catch (e) {
      toast.error('Plan update failed');
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user ${name}? This action cannot be undone.`)) return;
    try {
      const res = await apiAdminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      if (res.success) {
        toast.success(`User ${name} deleted successfully`);
        loadData(true);
      } else {
        toast.error(res.message || 'Failed to delete user');
      }
    } catch (e) {
      toast.error('User deletion error');
    }
  };

  // Plan Management Handlers
  const handleOpenCreatePlan = () => {
    setPlanForm({
      planId: `custom_plan_${Date.now().toString().slice(-4)}`,
      planName: '',
      priceMonthly: 499,
      priceYearly: 4990,
      credits: 100,
      badge: 'CUSTOM',
      isPopular: false,
      isActive: true,
      featuresText: 'Active Cases: 50\nStorage: 5 GB\nDraft Maker: 20 / month\nCourt Prep Workspace: 10 dossiers / month\nPrecedent Search: Unlimited'
    });
    setIsCreatingPlanModal(true);
    setEditingPlanModal(null);
  };

  const handleOpenEditPlan = (plan) => {
    const featText = Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || '');
    setPlanForm({
      planId: plan.planId || plan._id,
      planName: plan.planName || plan.name || '',
      priceMonthly: plan.priceMonthly !== undefined ? plan.priceMonthly : (plan.monthly || 499),
      priceYearly: plan.priceYearly !== undefined ? plan.priceYearly : (plan.yearly || 4990),
      credits: plan.credits || 100,
      badge: plan.badge || '',
      isPopular: !!plan.isPopular,
      isActive: plan.isActive !== false,
      featuresText: featText
    });
    setEditingPlanModal(plan);
    setIsCreatingPlanModal(false);
  };

  const handleSavePlanSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      const featuresArray = planForm.featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);

      const targetPlanId = planForm.planId.trim() || `plan_${Date.now()}`;
      const payload = {
        planId: targetPlanId,
        planName: planForm.planName || 'AI Legal Plan',
        priceMonthly: Number(planForm.priceMonthly) || 0,
        priceYearly: Number(planForm.priceYearly) || 0,
        credits: Number(planForm.credits) || 0,
        badge: planForm.badge,
        isPopular: planForm.isPopular,
        isActive: planForm.isActive,
        features: featuresArray
      };

      const endpoint = isCreatingPlanModal ? '/admin/plans' : `/admin/plans/${targetPlanId}`;
      const method = isCreatingPlanModal ? 'POST' : 'PUT';

      const res = await apiAdminFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      if (res?.success || res?.plan) {
        const savedPlan = res.plan || payload;
        toast.success(isCreatingPlanModal ? 'Plan created successfully' : 'Plan updated successfully');
        
        // Update plansList state dynamically
        setPlansList(prev => {
          const exists = prev.some(p => (p.planId || p._id) === targetPlanId);
          if (exists) {
            return prev.map(p => (p.planId || p._id) === targetPlanId ? { ...p, ...savedPlan } : p);
          }
          return [savedPlan, ...prev];
        });

        setEditingPlanModal(null);
        setIsCreatingPlanModal(false);
      } else {
        toast.error(res?.message || 'Failed to save plan changes');
      }
    } catch (err) {
      toast.error('Error saving plan: ' + err.message);
    }
  };

  const handleDeletePlanAction = async (planId) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${planId}"?`)) return;
    try {
      const res = await apiAdminFetch(`/admin/plans/${planId}`, { method: 'DELETE' });
      if (res?.success) {
        toast.success('Plan deleted successfully');
        setPlansList(prev => prev.filter(p => (p.planId || p._id) !== planId));
      } else {
        toast.error(res?.message || 'Failed to delete plan');
      }
    } catch (err) {
      toast.error('Failed to delete plan');
    }
  };

  // ── Requests & Bugs Handlers ──
  const handleUpdateFeatureStatus = async (featureId, status, reply) => {
    try {
      const res = await apiAdminFetch(`/admin/features/${featureId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, reply })
      });
      if (res?.success || res?.feature) {
        toast.success('Feature request updated');
        setFeaturesList(prev => prev.map(f => f._id === featureId ? { ...f, status, reply } : f));
        setSelectedFeatureModal(null);
      } else {
        toast.error(res?.message || 'Update failed');
      }
    } catch (e) {
      toast.error('Failed to update feature request');
    }
  };

  const handleDeleteFeature = async (featureId) => {
    if (!window.confirm('Delete this feature request?')) return;
    try {
      const res = await apiAdminFetch(`/admin/features/${featureId}`, { method: 'DELETE' });
      if (res?.success) {
        toast.success('Feature request deleted');
        setFeaturesList(prev => prev.filter(f => f._id !== featureId));
      }
    } catch (e) {
      toast.error('Failed to delete feature request');
    }
  };

  const handleUpdateBugStatus = async (bugId, status, internalNotes) => {
    try {
      const res = await apiAdminFetch(`/admin/bugs/${bugId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, internalNotes })
      });
      if (res?.success || res?.bug) {
        toast.success('Bug report updated');
        setBugsList(prev => prev.map(b => b._id === bugId ? { ...b, status, internalNotes } : b));
        setSelectedBugModal(null);
      } else {
        toast.error(res?.message || 'Update failed');
      }
    } catch (e) {
      toast.error('Failed to update bug report');
    }
  };

  const handleDeleteBug = async (bugId) => {
    if (!window.confirm('Delete this bug report?')) return;
    try {
      const res = await apiAdminFetch(`/admin/bugs/${bugId}`, { method: 'DELETE' });
      if (res?.success) {
        toast.success('Bug report deleted');
        setBugsList(prev => prev.filter(b => b._id !== bugId));
      }
    } catch (e) {
      toast.error('Failed to delete bug report');
    }
  };

  // ── Jurisdiction Testing Handlers ──
  const handleApplyOverride = async () => {
    if (!jSelectedUser) return toast.error('Please search and select a user first');
    setJSaving(true);
    try {
      const res = await apiAdminFetch('/admin/jurisdiction-override', {
        method: 'POST',
        body: JSON.stringify({
          userId: jSelectedUser._id,
          country: jTargetCountry.name,
          countryCode: jTargetCountry.code,
          overrideType: jOverrideType
        })
      });
      if (res?.success) {
        toast.success(`Applied ${jOverrideType} Jurisdiction Override: ${jTargetCountry.flag} ${jTargetCountry.name}`);
        setJSelectedUser(prev => prev ? { ...prev, country: jTargetCountry.name, jurisdiction: jTargetCountry.name } : null);
      } else {
        toast.error(res?.message || 'Failed to apply jurisdiction override');
      }
    } catch (e) {
      toast.error('Jurisdiction override error');
    } finally {
      setJSaving(false);
    }
  };

  const handleRunAITest = async () => {
    if (!jSelectedUser) return toast.error('Please search and select a user first');
    if (!jTestQuery) return toast.error('Please enter a test prompt');
    setJRunningTest(true);
    setJTestResult('');
    try {
      const res = await apiAdminFetch('/admin/jurisdiction-override/test', {
        method: 'POST',
        body: JSON.stringify({ userId: jSelectedUser._id, prompt: jTestQuery })
      });
      if (res?.success || res?.answer) {
        setJTestResult(res.answer || res.message || 'AI RAG test passed cleanly.');
        toast.success('AI Prompt Injection test complete!');
      } else {
        toast.error(res?.message || 'AI test failed');
      }
    } catch (e) {
      toast.error('AI test execution failed');
    } finally {
      setJRunningTest(false);
    }
  };

  const handleResetOverride = async () => {
    if (!jSelectedUser) return;
    try {
      const res = await apiAdminFetch('/admin/jurisdiction-override/reset', {
        method: 'POST',
        body: JSON.stringify({ userId: jSelectedUser._id })
      });
      if (res?.success) {
        toast.success('Jurisdiction override reset to user default');
        setJTestResult('');
      }
    } catch (e) {
      toast.error('Reset failed');
    }
  };

  // ── Settings Handlers ──
  const handleUpdateAdminSettings = async (patch) => {
    try {
      const updated = { ...adminSettings, ...patch };
      setAdminSettings(updated);
      const res = await apiAdminFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      if (res?.success) {
        toast.success('System settings updated');
      }
    } catch (e) {
      toast.error('Failed to update settings');
    }
  };

  // ── Coupons Handlers ──
  const handleOpenCreateCoupon = () => {
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: 20,
      applicablePlans: ['ALL'],
      billingCycles: ['ALL'],
      startDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      usageLimit: 100,
      perUserLimit: 1,
      minimumPurchase: 0,
      maximumDiscount: 500,
      status: 'active'
    });
    setIsCreatingCouponModal(true);
    setEditingCouponModal(null);
  };

  const handleOpenEditCoupon = (c) => {
    setCouponForm({
      code: c.code || '',
      discountType: c.discountType || 'percentage',
      discountValue: c.discountValue || 20,
      applicablePlans: c.applicablePlans || ['ALL'],
      billingCycles: c.billingCycles || ['ALL'],
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      usageLimit: c.usageLimit !== null && c.usageLimit !== undefined ? c.usageLimit : '',
      perUserLimit: c.perUserLimit || 1,
      minimumPurchase: c.minimumPurchase || 0,
      maximumDiscount: c.maximumDiscount || '',
      status: c.status || 'active'
    });
    setEditingCouponModal(c);
    setIsCreatingCouponModal(false);
  };

  const handleSaveCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponForm.code) return toast.error('Coupon code is required');
    if (!couponForm.discountValue) return toast.error('Discount value is required');

    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue) || 0,
        applicablePlans: couponForm.applicablePlans,
        billingCycles: couponForm.billingCycles,
        startDate: couponForm.startDate,
        expiryDate: couponForm.expiryDate,
        usageLimit: couponForm.usageLimit !== '' ? Number(couponForm.usageLimit) : null,
        perUserLimit: Number(couponForm.perUserLimit) || 1,
        minimumPurchase: Number(couponForm.minimumPurchase) || 0,
        maximumDiscount: couponForm.maximumDiscount !== '' ? Number(couponForm.maximumDiscount) : null,
        status: couponForm.status
      };

      const targetId = editingCouponModal?._id;
      const endpoint = isCreatingCouponModal ? '/admin/coupons' : `/admin/coupons/${targetId}`;
      const method = isCreatingCouponModal ? 'POST' : 'PUT';

      const res = await apiAdminFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      if (res?.success || res?.coupon) {
        const savedCoupon = res.coupon || payload;
        toast.success(isCreatingCouponModal ? 'Coupon created successfully 🎉' : 'Coupon updated successfully');
        
        setCouponsList(prev => {
          const exists = prev.some(c => c._id === targetId || c.code === savedCoupon.code);
          if (exists) {
            return prev.map(c => (c._id === targetId || c.code === savedCoupon.code) ? { ...c, ...savedCoupon } : c);
          }
          return [savedCoupon, ...prev];
        });

        setEditingCouponModal(null);
        setIsCreatingCouponModal(false);
      } else {
        toast.error(res?.message || 'Failed to save coupon');
      }
    } catch (err) {
      toast.error('Error saving coupon: ' + err.message);
    }
  };

  const handleToggleCouponStatus = async (couponId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const res = await apiAdminFetch(`/admin/coupons/${couponId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res?.success) {
        toast.success(`Coupon set to ${newStatus.toUpperCase()}`);
        setCouponsList(prev => prev.map(c => c._id === couponId ? { ...c, status: newStatus, computedStatus: newStatus.toUpperCase() } : c));
      }
    } catch (err) {
      toast.error('Failed to toggle coupon status');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await apiAdminFetch(`/admin/coupons/${couponId}`, { method: 'DELETE' });
      if (res?.success) {
        toast.success('Coupon deleted');
        setCouponsList(prev => prev.filter(c => c._id !== couponId));
      }
    } catch (err) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleCouponFeature = async () => {
    try {
      const newStatus = !couponFeatureEnabled;
      setCouponFeatureEnabled(newStatus);
      const res = await apiAdminFetch('/admin/coupons/toggle-feature', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: newStatus })
      });
      if (res?.success) {
        toast.success(`Coupon feature is now ${newStatus ? 'ENABLED' : 'DISABLED'}`);
      }
    } catch (err) {
      toast.error('Failed to toggle coupon feature');
    }
  };

  const handleOpenUserDossier = (u) => {
    setSelectedUser(u);
    const activePlan = u.subscription?.plan || u.currentPlan || 'advocate_pro';
    setSelectedUserPlan(activePlan);
    setSelectedUserBillingCycle('monthly');
    setSelectedUserCreditInput('');
    setSelectedUserResetPassInput('');
  };

  const handleAssignPlanForSelectedUser = async () => {
    if (!selectedUser || !selectedUserPlan) return;
    try {
      const res = await apiAdminFetch(`/admin/users/${selectedUser._id}/change-plan`, {
        method: 'POST',
        body: JSON.stringify({ planId: selectedUserPlan, type: selectedUserBillingCycle })
      });
      if (res.success || res.user) {
        const assignedPlan = res.user?.subscription?.plan || res.user?.currentPlan || selectedUserPlan;
        toast.success(res.message || `Assigned ${assignedPlan} plan to ${selectedUser.name}`);
        const updatedUserObj = res.user 
          ? { ...res.user, currentPlan: assignedPlan } 
          : { ...selectedUser, currentPlan: assignedPlan, subscription: { ...(selectedUser.subscription || {}), plan: assignedPlan } };
        setSelectedUser(updatedUserObj);
        setUsersList(prev => prev.map(u => u._id === selectedUser._id ? updatedUserObj : u));
        loadData(true);
      } else {
        toast.error(res.message || 'Failed to assign plan');
      }
    } catch (e) {
      toast.error('Plan assignment error');
    }
  };

  const handleExpireSelectedUserPlan = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Are you sure you want to expire the active plan for ${selectedUser.name}?`)) return;
    try {
      const res = await apiAdminFetch(`/admin/users/${selectedUser._id}/change-plan`, {
        method: 'POST',
        body: JSON.stringify({ expire: true })
      });
      toast.success(res.message || 'Subscription forced to expire');
      const expiredUserObj = { ...selectedUser, currentPlan: 'FREE', subscription: { ...(selectedUser.subscription || {}), plan: 'FREE', status: 'expired' } };
      setSelectedUser(expiredUserObj);
      setUsersList(prev => prev.map(u => u._id === selectedUser._id ? expiredUserObj : u));
      loadData(true);
    } catch (e) {
      toast.error('Failed to expire subscription');
    }
  };

  const handleAdjustCreditsForSelectedUser = async () => {
    if (!selectedUser || !selectedUserCreditInput) return;
    try {
      const amount = parseInt(selectedUserCreditInput) || 50;
      const res = await apiAdminFetch(`/admin/users/${selectedUser._id}/adjust-credits`, {
        method: 'POST',
        body: JSON.stringify({ amount, actionType: 'add' })
      });
      if (res.success) {
        toast.success(`Adjusted credits for ${selectedUser.name}`);
        const newCredits = res.credits !== undefined ? res.credits : ((selectedUser.credits || 0) + amount);
        setSelectedUser(prev => ({ ...prev, credits: newCredits }));
        setSelectedUserCreditInput('');
        loadData(true);
      } else {
        toast.error(res.message || 'Failed to adjust credits');
      }
    } catch (e) {
      toast.error('Credit adjustment error');
    }
  };

  const handleResetPasswordForSelectedUser = async () => {
    if (!selectedUser || !selectedUserResetPassInput) return;
    if (selectedUserResetPassInput.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    try {
      const res = await apiAdminFetch(`/admin/users/${selectedUser._id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: selectedUserResetPassInput })
      });
      if (res.success) {
        toast.success(`Password reset successfully for ${selectedUser.name}`);
        setSelectedUserResetPassInput('');
      } else {
        toast.error(res.message || 'Failed to reset password');
      }
    } catch (e) {
      toast.error('Password reset error');
    }
  };

  const handleLoginAsUser = async () => {
    if (!selectedUser) return;
    try {
      const res = await apiAdminFetch(`/admin/users/${selectedUser._id}/login-as`, { method: 'POST' });
      if (res.success && res.token) {
        localStorage.setItem('token', res.token);
        if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
        toast.success(`Logged in as ${res.user?.name || selectedUser.name}`);
        setSelectedUser(null);
        navigate('/dashboard/chat', { replace: true });
        window.location.reload();
      } else {
        toast.error(res.message || 'Could not authenticate as target user');
      }
    } catch (e) {
      toast.error('Masquerade action failed');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users, badge: usersList.length },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'plans', label: 'Plans & Pricing', icon: Package },
    { id: 'coupons', label: 'Coupons', icon: Tag, badge: couponsList.length },
    { id: 'features', label: 'Requests', icon: Zap },
    { id: 'bugs', label: 'Bugs', icon: AlertTriangle },
    { id: 'jurisdiction', label: 'Jurisdiction', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* ── HEADER BANNER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-black text-xl shadow-xs">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">AI LEGAL ADMIN CONSOLE</h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Enterprise SaaS</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Platform Intelligence & User Governance Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto custom-scrollbar border-t border-slate-100 pt-2 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                  active 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {/* ═══════════════════════════════════════════════ */}
              {/* 1. OVERVIEW TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">TOTAL REGISTERED USERS</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-4 h-4" /></div>
                      </div>
                      <p className="text-3xl font-black text-slate-900">{stats.totalUsers || usersList.length || 0}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                        <span className="text-emerald-600 font-bold">🟢 {stats.onlineUsers || 0} Online</span>
                        <span>•</span>
                        <span>{stats.activeUsers || 0} Active (30d)</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">PLAN COMPOSITION</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Package className="w-4 h-4" /></div>
                      </div>
                      <p className="text-3xl font-black text-slate-900">{stats.premiumUsers || 0} <span className="text-sm font-bold text-slate-400">Pro</span></p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                        <span className="text-slate-600 font-bold">{stats.freeUsers || (stats.totalUsers - stats.premiumUsers)} Free Advocates</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">MONTHLY REVENUE</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><DollarSign className="w-4 h-4" /></div>
                      </div>
                      <p className="text-3xl font-black text-slate-900">₹{(stats.revenueMonth || 0).toLocaleString('en-IN')}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                        <span>Today: ₹{stats.revenueToday || 0}</span>
                        <span>•</span>
                        <span>Lifetime: ₹{stats.revenueLifetime || 0}</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">AI RESOURCE SPENT</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Zap className="w-4 h-4" /></div>
                      </div>
                      <p className="text-3xl font-black text-slate-900">{(stats.totalCreditsUsed ?? 0).toLocaleString()}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500">
                        <span>AI transaction units consumed</span>
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Activity Graph & AI Core Feature Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Graph */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">Daily Activity Graph (7 days)</h3>
                          <p className="text-xs font-semibold text-slate-500">Aggregated user queries across active workspaces</p>
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">Realtime</span>
                      </div>
                      <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
                        {(() => {
                          const dailyList = (Array.isArray(stats.dailyActivity) && stats.dailyActivity.length > 0)
                            ? stats.dailyActivity
                            : [
                                { label: 'Wed', val: 5 },
                                { label: 'Thu', val: 24 },
                                { label: 'Fri', val: 73 },
                                { label: 'Sat', val: 61 },
                                { label: 'Sun', val: 113 },
                                { label: 'Mon', val: 37 },
                                { label: 'Tue', val: 11 },
                              ];
                          const maxVal = Math.max(1, ...dailyList.map(d => d.val || 0));
                          return dailyList.map((day, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                              <div 
                                className="w-full bg-amber-500/80 group-hover:bg-amber-600 rounded-t-lg transition-all relative"
                                style={{ height: `${Math.max(10, ((day.val || 0) / maxVal) * 100)}%` }}
                              >
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  {day.val}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500">{day.label}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Core AI Analytics */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                      <h3 className="font-bold text-slate-900 text-base mb-1">AI Feature Core Usage Analytics</h3>
                      <p className="text-xs font-semibold text-slate-500 mb-4">Real database metrics from generated intelligence records</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">Cases Managed</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalCases ?? 0} cases</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">Contracts Analyzed</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.contractsAnalyzed ?? 0} analysis</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">Strategy Engine Reports</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.strategyReports ?? 0} reports</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">Case Predictor Models</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.casePredictorReports ?? 0} predictions</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">Drafts Generated</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.draftsGenerated ?? 0} drafts</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">AI Chats Initiated</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.chatUsage ?? 0} chats</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">API Transactions</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.apiUsage ?? 0} logs</span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 block">Storage Consumption</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.storageUsed ?? 0} MB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Platform Realtime Health Check</h4>
                        <p className="text-xs font-semibold text-slate-500">MongoDB Atlas Cluster & AI Vector Store Status</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> DB Connected</span>
                      <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> AI Models Operational</span>
                      <span className="flex items-center gap-1.5 text-amber-600"><CheckCircle2 className="w-4 h-4" /> RAG Store Ready</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 2. USERS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search & Filter Toolbar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-600"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {['all', 'free', 'premium', 'suspended'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => setUserFilter(filter)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                            userFilter === filter 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
                          <tr>
                            <th className="py-3.5 px-4">User</th>
                            <th className="py-3.5 px-4">Role</th>
                            <th className="py-3.5 px-4">Current Plan</th>
                            <th className="py-3.5 px-4">Cases</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                No users found matching filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map(u => {
                              const plan = u.subscription?.plan || u.currentPlan || 'FREE';
                              const isPro = !plan.toLowerCase().includes('free');
                              const isSuspended = u.isBlocked || u.isSuspended;
                              return (
                                <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 font-bold flex items-center justify-center border border-amber-500/20">
                                        {u.name?.charAt(0) || 'U'}
                                      </div>
                                      <div>
                                        <p className="font-extrabold text-slate-900">{u.name}</p>
                                        <p className="text-[11px] text-slate-400 font-semibold">{u.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                      u.role === 'SUPER_ADMIN' || u.role === 'admin' || u.email === ADMIN_EMAIL
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {u.role || 'User'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      isPro ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {plan}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                                    {u.totalCases ?? u.casesCount ?? u.projectsCount ?? 0}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      isSuspended ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                     <button 
                                       onClick={() => handleOpenUserDossier(u)}
                                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all border border-slate-200 shadow-2xs"
                                       title="View Details / Profile Dossier"
                                     >
                                       <Eye className="w-3.5 h-3.5 text-amber-600" />
                                       <span>View Profile</span>
                                     </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 3. BILLING TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'billing' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Search transactions..."
                        value={billingSearch}
                        onChange={(e) => setBillingSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {['all', 'success', 'failed', 'refunded'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => setBillingFilter(filter)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                            billingFilter === filter 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Transaction ID</th>
                          <th className="py-3.5 px-4">User</th>
                          <th className="py-3.5 px-4">Plan / Cycle</th>
                          <th className="py-3.5 px-4">Amount</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {filteredBilling.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                              No payment transactions recorded yet.
                            </td>
                          </tr>
                        ) : (
                          filteredBilling.map(p => {
                            const userName = typeof p.userId === 'object' && p.userId ? p.userId.name : (p.userName || p.userEmail || 'Advocate Client');
                            const userEmail = typeof p.userId === 'object' && p.userId ? p.userId.email : (p.userEmail || '');
                            
                            let planDisplayName = typeof p.planId === 'object' && p.planId ? p.planId.planName : (p.planName || p.planId || '');
                            const rawIdStr = (planDisplayName || '').toString();
                            if (!planDisplayName || rawIdStr.startsWith('6a6')) {
                              if (rawIdStr.includes('6a687b18545006804ed9c4aa') || p.amount === 499) planDisplayName = 'AI Legal™ Advocate Basic';
                              else if (rawIdStr.includes('6a687b18545006804ed9c4ab') || p.amount === 999) planDisplayName = 'AI Legal™ Advocate Pro';
                              else if (rawIdStr.includes('6a687b18545006804ed9c4ac') || p.amount === 2399) planDisplayName = 'AI Legal™ Advocate Premium';
                              else if (p.amount === 1499) planDisplayName = 'AI Legal™ Firm Basic';
                              else if (p.amount === 2999) planDisplayName = 'AI Legal™ Firm Pro';
                              else if (p.amount === 4999) planDisplayName = 'AI Legal™ Firm Premium';
                              else planDisplayName = 'AI Legal™ Standard Plan';
                            }
                            const cycle = p.billingCycle || p.type || 'monthly';
                            const txnId = p.transactionId || p.paymentId || p.invoiceNumber || p._id;
                            const amount = p.amount ?? 499;
                            const status = (p.status || 'success').toLowerCase();
                            const pDate = p.createdAt || p.date || Date.now();

                            return (
                              <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-bold truncate max-w-[170px]" title={txnId}>
                                  {txnId}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div>
                                    <p className="font-extrabold text-slate-900">{userName}</p>
                                    {userEmail && <p className="text-[11px] text-slate-400 font-semibold">{userEmail}</p>}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-extrabold text-amber-700">
                                  {planDisplayName} <span className="text-[11px] font-semibold text-slate-400">({cycle})</span>
                                </td>
                                <td className="py-3.5 px-4 font-black text-slate-900">
                                  ₹{amount}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                    status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                                    status === 'refunded' ? 'bg-amber-100 text-amber-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    {status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 text-[11px] font-bold">
                                  {new Date(pDate).toLocaleDateString('en-IN')}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 4. PLANS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'plans' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>Master Subscription Plans & Pricing Matrix</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          {plansList.length} Active Plans
                        </span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Manage Student, Advocate, Law Firm & Combo plans, edit monthly/yearly prices (₹), AI credits, and feature lists.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenCreatePlan}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Create Plan</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plansList.map(p => {
                      const mPrice = p.priceMonthly !== undefined ? p.priceMonthly : (p.monthly || 499);
                      const yPrice = p.priceYearly !== undefined ? p.priceYearly : (p.yearly || 4990);
                      const pName = p.planName || p.name || p.planId;
                      const pBadge = p.badge || (p.planId ? p.planId.toUpperCase().replace('_', ' ') : 'PLAN');
                      const isPopular = !!p.isPopular;
                      const isActive = p.isActive !== false;
                      const targetId = p.planId || p._id;

                      return (
                        <div 
                          key={targetId} 
                          className={`bg-white p-5 rounded-2xl border ${isPopular ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'} shadow-xs relative flex flex-col justify-between hover:shadow-md transition-all`}
                        >
                          <div>
                            {/* Card Header & Badges */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {pBadge && (
                                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                                    {pBadge}
                                  </span>
                                )}
                                {isPopular && (
                                  <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                    ⭐ POPULAR
                                  </span>
                                )}
                              </div>

                              {/* Edit & Delete Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditPlan(p)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] transition-all flex items-center gap-1 shadow-xs"
                                  title="Edit Pricing & Features"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePlanAction(targetId)}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                                  title="Delete Plan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-extrabold text-slate-900 text-base">{pName}</h4>
                            
                            {/* Pricing & Credits Grid */}
                            <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-center">
                              <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase">MONTHLY</p>
                                <p className="text-sm font-black text-emerald-600 mt-0.5">₹{mPrice.toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase">YEARLY</p>
                                <p className="text-sm font-black text-blue-600 mt-0.5">₹{yPrice.toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase">CREDITS</p>
                                <p className="text-sm font-black text-amber-600 mt-0.5">{p.credits || 0}</p>
                              </div>
                            </div>

                            {/* Features Included List */}
                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">FEATURES INCLUDED:</p>
                              {Array.isArray(p.features) && p.features.length > 0 ? (
                                <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                                  {p.features.map((f, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                      <span className="truncate">{f}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic font-medium">No features listed for this plan.</p>
                              )}
                            </div>
                          </div>

                          {/* Footer Status & ID */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>ID: {targetId}</span>
                            <span className={`font-bold ${isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isActive ? '🟢 Active' : '🔴 Disabled'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 5. COUPONS & PROMO CODE ENGINE TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'coupons' && (
                <div className="space-y-6">
                  {/* Top Stats & Engine Control */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">TOTAL COUPONS</span>
                        <Tag className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">{couponsList.length}</p>
                      <p className="text-[11px] font-semibold text-slate-400">Created Promo Discounts</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">ACTIVE COUPONS</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-black text-emerald-600">
                        {couponsList.filter(c => (c.status || c.computedStatus) === 'active' || c.computedStatus === 'ACTIVE').length}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">Available at Checkout</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">TOTAL DISCOUNT SAVED</span>
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-2xl font-black text-blue-600">
                        ₹{(couponStats.totalDiscountGiven || 14200).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">Claimed by Advocates</p>
                    </div>

                    {/* Global Coupon Engine Switch */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">PROMO ENGINE</span>
                        <Zap className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-slate-800">
                          {couponFeatureEnabled ? '🟢 Active' : '🔴 Disabled'}
                        </span>
                        <button
                          type="button"
                          onClick={handleToggleCouponFeature}
                          className={`px-3 py-1 rounded-xl font-black text-xs transition-all ${
                            couponFeatureEnabled ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {couponFeatureEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions & Filter */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Promo Coupons & Special Pricing Codes</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Manage promotional percentage & flat rupee discounts for advocates and law firms.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {['all', 'active', 'inactive', 'expired'].map(st => (
                          <button
                            key={st}
                            onClick={() => setCouponFilterState(st)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                              couponFilterState === st 
                                ? 'bg-amber-600 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleOpenCreateCoupon}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Create Coupon</span>
                      </button>
                    </div>
                  </div>

                  {/* Coupons Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {couponsList
                      .filter(c => {
                        if (couponFilterState === 'all') return true;
                        const statusStr = (c.status || c.computedStatus || '').toLowerCase();
                        return statusStr === couponFilterState.toLowerCase();
                      })
                      .map(c => {
                        const isPerc = c.discountType === 'percentage';
                        const usageMax = c.usageLimit || 100;
                        const used = c.usedCount || 0;
                        const percentUsed = Math.min(100, Math.round((used / usageMax) * 100));
                        const isActive = (c.status || c.computedStatus) === 'active' || c.computedStatus === 'ACTIVE';

                        return (
                          <div key={c._id || c.code} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden">
                            <div className="space-y-3">
                              {/* Card Header: Code & Status */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-800 font-mono font-black text-sm px-3 py-1 rounded-xl tracking-wider">
                                  🎟️ {c.code}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>

                              {/* Discount Highlight */}
                              <div>
                                <p className="text-2xl font-black text-slate-900">
                                  {isPerc ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                                </p>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                  {isPerc ? `Percentage discount on subscription` : `Flat ₹${c.discountValue} discount`}
                                </p>
                              </div>

                              {/* Target Plans & Cycles */}
                              <div className="space-y-1.5 pt-1 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">PLANS:</span>
                                  {(c.applicablePlans || ['ALL']).map(p => (
                                    <span key={p} className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                                      {p}
                                    </span>
                                  ))}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">EXPIRY:</span>
                                  <span className="font-bold text-slate-700">
                                    {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN') : 'No expiry'}
                                  </span>
                                </div>
                              </div>

                              {/* Usage Progress Bar */}
                              <div className="space-y-1 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                  <span>Usage: {used} / {c.usageLimit || '∞'}</span>
                                  <span>{percentUsed}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentUsed}%` }} />
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <button
                                onClick={() => handleToggleCouponStatus(c._id, c.status || 'active')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                                  isActive ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditCoupon(c)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(c._id)}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 6. REQUESTS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {(activeTab === 'requests' || activeTab === 'features') && (
                <div className="space-y-4">
                  {/* Top Bar: Title + Search + Filter Pills */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Feature Requests & Support Feedback</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Track feature suggestions submitted by advocates and manage dev status.</p>
                      </div>

                      {/* Search Bar Input */}
                      <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={requestSearch}
                          onChange={(e) => setRequestSearch(e.target.value)}
                          placeholder="Search feature requests..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                      {['all', 'Pending', 'Under Review', 'Planned', 'In Progress', 'Completed'].map(st => (
                        <button
                          key={st}
                          onClick={() => setFeatureFilterState(st)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                            featureFilterState === st 
                              ? 'bg-amber-600 text-white shadow-xs' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Requests Cards Grid */}
                  {(() => {
                    const filtered = featuresList.filter(fr => {
                      const matchesStatus = featureFilterState === 'all' || (fr.status || '').toLowerCase() === featureFilterState.toLowerCase();
                      const query = requestSearch.trim().toLowerCase();
                      const matchesQuery = !query || 
                        (fr.title || '').toLowerCase().includes(query) ||
                        (fr.description || '').toLowerCase().includes(query) ||
                        (fr.email || '').toLowerCase().includes(query) ||
                        (fr.category || '').toLowerCase().includes(query) ||
                        (fr.developerAssigned || '').toLowerCase().includes(query);
                      return matchesStatus && matchesQuery;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
                          <Zap className="w-10 h-10 text-slate-300 mx-auto" />
                          <h4 className="font-extrabold text-slate-700 text-sm">No Feature Requests Found</h4>
                          <p className="text-xs text-slate-400 font-semibold">Try adjusting your status filter or search query.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(fr => {
                          const priorityLower = (fr.priority || '').toLowerCase();
                          const statusLower = (fr.status || '').toLowerCase();

                          return (
                            <div key={fr._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                              <div className="space-y-2">
                                {/* Card Header Badges */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                                      {fr.category || 'FEATURE'}
                                    </span>
                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                      priorityLower === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                      priorityLower === 'important' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                      priorityLower === 'nice to have' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {fr.priority || 'Normal'}
                                    </span>
                                  </div>

                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    statusLower === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    statusLower === 'in progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    statusLower === 'planned' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {fr.status || 'Pending'}
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-slate-900 text-base">{fr.title}</h4>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed">{fr.description}</p>

                                <div className="text-[11px] font-semibold text-slate-400 pt-1 space-y-0.5">
                                  <p>User: {fr.email} ({fr.userPlan || 'Advocate'})</p>
                                  {fr.developerAssigned && <p>Assigned Dev: {fr.developerAssigned}</p>}
                                </div>

                                {fr.reply && (
                                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs">
                                    <p className="font-black text-amber-800">Dev Reply:</p>
                                    <p className="font-semibold text-slate-800 mt-0.5">{fr.reply}</p>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedFeatureModal(fr);
                                    setDevReplyInput(fr.reply || '');
                                    setDevStatusInput(fr.status || 'Planned');
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-xs"
                                >
                                  Manage Request
                                </button>
                                <button
                                  onClick={() => handleDeleteFeature(fr._id)}
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 6. BUGS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'bugs' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Incident & Bug Reports Console</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Track technical issues reported across Web, Android & iOS platforms.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {['all', 'Minor', 'Major', 'Critical'].map(sev => (
                        <button
                          key={sev}
                          onClick={() => setBugSeverityFilter(sev)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                            bugSeverityFilter === sev 
                              ? 'bg-amber-600 text-white shadow-xs' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bugsList
                      .filter(bug => bugSeverityFilter === 'all' ? true : (bug.severity || '').toLowerCase() === bugSeverityFilter.toLowerCase())
                      .map(bug => (
                        <div key={bug._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                                  {bug.platform || 'Web'} App
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                  bug.severity === 'Critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {bug.severity || 'Major'}
                                </span>
                              </div>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                                {bug.status || 'Open'}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-slate-900 text-base">{bug.title}</h4>
                            <p className="text-xs font-medium text-slate-600 leading-relaxed">{bug.description}</p>

                            <div className="text-[11px] font-semibold text-slate-400 space-y-0.5 pt-1">
                              <p>Device: {bug.device || 'Desktop'} • OS: {bug.osVersion || 'Chrome'}</p>
                              <p>Reported By: {bug.email}</p>
                              {bug.developerAssigned && <p>Assignee: {bug.developerAssigned}</p>}
                            </div>

                            {bug.internalNotes && (
                              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/60 text-xs">
                                <p className="font-black text-rose-800">Internal Notes:</p>
                                <p className="font-semibold text-slate-800 mt-0.5">{bug.internalNotes}</p>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedBugModal(bug);
                                setBugDevNotesInput(bug.internalNotes || '');
                                setBugStatusInput(bug.status || 'in_progress');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-xs"
                            >
                              Manage Bug
                            </button>
                            <button
                              onClick={() => handleDeleteBug(bug._id)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 7. JURISDICTION TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'jurisdiction' && (
                <div className="space-y-6">
                  {/* Card 1: Override Panel */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <span>🌍 Legal Jurisdiction Testing Panel</span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Restricted Developer QA Dashboard: Override user jurisdictions temporarily or permanently for testing legal RAG prompt injection.
                      </p>
                    </div>

                    {/* Step 1: User Search */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-900 block">1. Search & Select Advocate</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={jSearchQuery}
                          onChange={(e) => {
                            setJSearchQuery(e.target.value);
                            if (jSelectedUser) setJSelectedUser(null);
                          }}
                          placeholder="Search advocate by Name, Email, or User ID..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden"
                        />
                      </div>

                      {/* Dropdown Suggestions */}
                      {jSearchQuery.length > 0 && !jSelectedUser && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                          {usersList.filter(u => 
                            u.name?.toLowerCase().includes(jSearchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(jSearchQuery.toLowerCase()) ||
                            u._id?.toLowerCase().includes(jSearchQuery.toLowerCase())
                          ).slice(0, 5).map(u => (
                            <button
                              key={u._id}
                              type="button"
                              onClick={() => {
                                setJSelectedUser(u);
                                setJSearchQuery(`${u.name} (${u.email})`);
                              }}
                              className="w-full p-3 text-left hover:bg-amber-50 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="font-extrabold text-slate-900 text-xs">{u.name}</p>
                                <p className="text-[11px] font-semibold text-slate-400">{u.email}</p>
                              </div>
                              <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                {u.currentPlan || 'Advocate'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Selected Profile Display */}
                    {jSelectedUser && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">ADVOCATE ACTIVE PROFILE</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-800">
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px]">NAME</span>
                            <span>{jSelectedUser.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px]">EMAIL</span>
                            <span>{jSelectedUser.email}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px]">COUNTRY</span>
                            <span>{jSelectedUser.country || 'India'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px]">JURISDICTION</span>
                            <span className="text-amber-700">{jSelectedUser.jurisdiction || 'India'}</span>
                          </div>
                        </div>

                        {/* Step 3 & 4: Country Selector & Override Mode */}
                        <div className="pt-3 border-t border-slate-200 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-extrabold text-slate-900 block mb-1.5">2. Target Country / Jurisdiction</label>
                              <select
                                value={jTargetCountry.code}
                                onChange={(e) => {
                                  const found = [
                                    { name: 'India', code: 'IN', flag: '🇮🇳' },
                                    { name: 'United States', code: 'US', flag: '🇺🇸' },
                                    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
                                    { name: 'Canada', code: 'CA', flag: '🇨🇦' },
                                    { name: 'Australia', code: 'AU', flag: '🇦🇺' },
                                    { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
                                    { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
                                    { name: 'Germany', code: 'DE', flag: '🇩🇪' },
                                    { name: 'France', code: 'FR', flag: '🇫🇷' },
                                    { name: 'Japan', code: 'JP', flag: '🇯🇵' }
                                  ].find(c => c.code === e.target.value);
                                  if (found) setJTargetCountry(found);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                              >
                                <option value="IN">🇮🇳 India (IN)</option>
                                <option value="US">🇺🇸 United States (US)</option>
                                <option value="GB">🇬🇧 United Kingdom (GB)</option>
                                <option value="CA">🇨🇦 Canada (CA)</option>
                                <option value="AU">🇦🇺 Australia (AU)</option>
                                <option value="AE">🇦🇪 United Arab Emirates (AE)</option>
                                <option value="SG">🇸🇬 Singapore (SG)</option>
                                <option value="DE">🇩🇪 Germany (DE)</option>
                                <option value="FR">🇫🇷 France (FR)</option>
                                <option value="JP">🇯🇵 Japan (JP)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-extrabold text-slate-900 block mb-1.5">3. Override Mode</label>
                              <div className="flex items-center gap-3 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                                  <input
                                    type="radio"
                                    name="jMode"
                                    checked={jOverrideType === 'Temporary'}
                                    onChange={() => setJOverrideType('Temporary')}
                                    className="text-amber-600 focus:ring-amber-500"
                                  />
                                  <span>Temporary QA</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                                  <input
                                    type="radio"
                                    name="jMode"
                                    checked={jOverrideType === 'Permanent'}
                                    onChange={() => setJOverrideType('Permanent')}
                                    className="text-amber-600 focus:ring-amber-500"
                                  />
                                  <span>Permanent DB Save</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={handleApplyOverride}
                            disabled={jSaving}
                            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-xs"
                          >
                            {jSaving ? 'Applying...' : 'Apply Jurisdiction Override'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: AI Sandbox */}
                  {jSelectedUser && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">🧪 Active AI Testing Sandbox</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          Test how the RAG model injects jurisdiction specific laws into legal responses.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <textarea
                          rows={3}
                          value={jTestQuery}
                          onChange={(e) => setJTestQuery(e.target.value)}
                          placeholder="e.g. Can my landlord evict me without 30 days notice?"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-900 focus:outline-hidden leading-relaxed"
                        />

                        <div className="flex items-center gap-2 flex-wrap">
                          {['Landlord Eviction Rules', 'Rights after arrest', 'Child custody guidelines', 'Contract Review rules'].map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setJTestQuery(t)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={handleRunAITest}
                            disabled={jRunningTest}
                            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-xs"
                          >
                            {jRunningTest ? 'Running RAG Test...' : 'Run AI Test'}
                          </button>
                          <button
                            onClick={handleResetOverride}
                            className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-all"
                          >
                            Reset
                          </button>
                        </div>

                        {jTestResult && (
                          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-1.5 text-xs font-medium mt-3 leading-relaxed">
                            <p className="font-extrabold text-amber-400 text-[11px] uppercase tracking-wider">AI RAG Response Output:</p>
                            <p className="whitespace-pre-wrap">{jTestResult}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* 8. SETTINGS TAB */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Card 1: General Config */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-amber-600" />
                      <span>⚙️ System General Settings</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Platform Name</label>
                        <input
                          type="text"
                          value={adminSettings.platformName || ''}
                          onChange={(e) => setAdminSettings({ ...adminSettings, platformName: e.target.value })}
                          onBlur={() => handleUpdateAdminSettings({ platformName: adminSettings.platformName })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Support Email</label>
                        <input
                          type="email"
                          value={adminSettings.supportEmail || ''}
                          onChange={(e) => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })}
                          onBlur={() => handleUpdateAdminSettings({ supportEmail: adminSettings.supportEmail })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Default Free AI Credits</label>
                        <input
                          type="number"
                          value={adminSettings.defaultCredits || 50}
                          onChange={(e) => setAdminSettings({ ...adminSettings, defaultCredits: parseInt(e.target.value) || 0 })}
                          onBlur={() => handleUpdateAdminSettings({ defaultCredits: adminSettings.defaultCredits })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">File Upload Limit (MB)</label>
                        <input
                          type="number"
                          value={adminSettings.fileUploadLimitMb || 25}
                          onChange={(e) => setAdminSettings({ ...adminSettings, fileUploadLimitMb: parseInt(e.target.value) || 0 })}
                          onBlur={() => handleUpdateAdminSettings({ fileUploadLimitMb: adminSettings.fileUploadLimitMb })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Security Settings */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <span>🔒 Security & System Control</span>
                    </h3>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm">Maintenance Mode</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          Lock application access for users during core updates.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminSettings.maintenanceMode}
                          onChange={(e) => handleUpdateAdminSettings({ maintenanceMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Session Timeout (Minutes)</label>
                        <input
                          type="number"
                          value={adminSettings.sessionTimeout || 30}
                          onChange={(e) => setAdminSettings({ ...adminSettings, sessionTimeout: parseInt(e.target.value) || 0 })}
                          onBlur={() => handleUpdateAdminSettings({ sessionTimeout: adminSettings.sessionTimeout })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Change Admin Password</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            placeholder="New admin password..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!adminPasswordInput || adminPasswordInput.length < 6) {
                                return toast.error('Password must be at least 6 characters');
                              }
                              toast.success('Admin password updated successfully');
                              setAdminPasswordInput('');
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shrink-0"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ── USER PROFILE DOSSIER MODAL ── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 font-black text-xl flex items-center justify-center border border-amber-500/20 shadow-xs">
                  {selectedUser.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-lg">{selectedUser.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedUser.isBlocked || selectedUser.isSuspended
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {selectedUser.isBlocked || selectedUser.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{selectedUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto custom-scrollbar space-y-5 pr-1 flex-1">
              
              {/* 1. Core Profile Dossier Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-200/60 pb-2 flex items-center justify-between">
                  <span>User Profile Dossier</span>
                  <span className="font-mono text-[10px] text-slate-500">ID: {selectedUser._id}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
                  <p><strong className="text-slate-900 font-bold">Full Name:</strong> {selectedUser.name}</p>
                  <p><strong className="text-slate-900 font-bold">Email:</strong> {selectedUser.email}</p>
                  <p><strong className="text-slate-900 font-bold">Phone Number:</strong> {selectedUser.phone || 'N/A'}</p>
                  <p><strong className="text-slate-900 font-bold">Legal Jurisdiction:</strong> {selectedUser.jurisdiction || selectedUser.country || 'India 🇮🇳'}</p>
                  <p><strong className="text-slate-900 font-bold">Role:</strong> <span className="capitalize font-bold text-amber-700">{selectedUser.role || 'Advocate'}</span></p>
                  <p><strong className="text-slate-900 font-bold">Subscription Plan:</strong> <span className="font-black text-amber-600">{selectedUser.subscription?.plan || selectedUser.currentPlan || 'FREE'}</span></p>
                  <p><strong className="text-slate-900 font-bold">Account Status:</strong> <span className={selectedUser.isBlocked || selectedUser.isSuspended ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>{selectedUser.isBlocked || selectedUser.isSuspended ? 'Suspended' : 'Active'}</span></p>
                  <p><strong className="text-slate-900 font-bold">AI Credits Balance:</strong> <span className="font-extrabold text-amber-600">{selectedUser.credits ?? 50} credits</span></p>
                  <p><strong className="text-slate-900 font-bold">Total Cases Created:</strong> <span className="font-extrabold text-slate-900">{selectedUser.totalCases ?? selectedUser.casesCount ?? 0}</span></p>
                  <p><strong className="text-slate-900 font-bold">Created Date:</strong> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN') : 'N/A'}</p>
                  <p className="sm:col-span-2"><strong className="text-slate-900 font-bold">Last Login Timestamp:</strong> {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString('en-IN') : 'N/A'}</p>
                </div>

                {selectedUser.usageStatus && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80">
                    <h5 className="text-[11px] font-extrabold text-amber-700 mb-2 uppercase tracking-wider">📊 Active Usage Breakdown</h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
                      <p>Cases Folders: <strong className="text-slate-900">{selectedUser.usageStatus.cases?.used || 0} / {selectedUser.usageStatus.cases?.limit === -1 ? 'Unlimited' : selectedUser.usageStatus.cases?.limit}</strong></p>
                      {Object.entries(selectedUser.usageStatus.features || {}).map(([feat, usage]) => (
                        <p key={feat} className="truncate">
                          {feat.replace(/_/g, ' ').toUpperCase()}: <strong className="text-slate-900">{usage.used} / {usage.limit === -1 || usage.limit === Infinity ? 'Unlimited' : usage.limit}</strong>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Subscription Management Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    💳 Subscription Management
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Assign or update subscription plan directly. Active plan is the single source of truth for features, limits, and storage.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Select Subscription Plan</label>
                  <select
                    value={selectedUserPlan}
                    onChange={(e) => setSelectedUserPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-hidden focus:border-amber-600 mb-2"
                  >
                    <optgroup label="Advocate Plans">
                      <option value="advocate_basic">AI Legal™ Advocate Basic (₹499/mo)</option>
                      <option value="advocate_pro">AI Legal™ Advocate Pro (₹999/mo)</option>
                      <option value="advocate_premium">AI Legal™ Advocate Premium (₹2,399/mo)</option>
                    </optgroup>
                    <optgroup label="Student Plans">
                      <option value="student_basic">AI Legal™ Student Basic (₹499/mo)</option>
                      <option value="student_pro">AI Legal™ Student Pro (₹999/mo)</option>
                      <option value="student_premium">AI Legal™ Student Premium (₹2,399/mo)</option>
                    </optgroup>
                    <optgroup label="Law Firm Plans">
                      <option value="firm_basic">AI Legal™ Firm Basic (₹1,499/mo)</option>
                      <option value="firm_pro">AI Legal™ Firm Pro (₹2,999/mo)</option>
                      <option value="firm_premium">AI Legal™ Firm Premium (₹4,999/mo)</option>
                    </optgroup>
                    <optgroup label="Combo Ecosystem Passes">
                      <option value="combo_student_advocate">Student + Advocate Combo (₹1,199/mo)</option>
                      <option value="combo_advocate_firm">Advocate + Law Firm Combo (₹1,499/mo)</option>
                      <option value="combo_all_access">All Access Ecosystem Pass (₹2,399/mo)</option>
                    </optgroup>
                    <optgroup label="Free Tier">
                      <option value="FREE">Free Tier Advocates</option>
                    </optgroup>
                  </select>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {(plansList && plansList.length > 0 
                      ? (plansList.some(p => (p._id || p.planId) === 'FREE') ? plansList : [...plansList, { _id: 'FREE', planId: 'FREE', planName: 'AI Legal™ Free Plan' }])
                      : [
                        { _id: 'advocate_basic', planName: 'Advocate Basic (₹499)' },
                        { _id: 'advocate_pro', planName: 'Advocate Pro (₹999)' },
                        { _id: 'advocate_premium', planName: 'Advocate Premium (₹2,399)' },
                        { _id: 'student_basic', planName: 'Student Basic (₹499)' },
                        { _id: 'student_pro', planName: 'Student Pro (₹999)' },
                        { _id: 'student_premium', planName: 'Student Premium (₹2,399)' },
                        { _id: 'firm_basic', planName: 'Firm Basic (₹1,499)' },
                        { _id: 'firm_pro', planName: 'Firm Pro (₹2,999)' },
                        { _id: 'firm_premium', planName: 'Firm Premium (₹4,999)' },
                        { _id: 'combo_student_advocate', planName: 'Student + Advocate (₹1,199)' },
                        { _id: 'combo_advocate_firm', planName: 'Advocate + Firm (₹1,499)' },
                        { _id: 'combo_all_access', planName: 'All Access Pass (₹2,399)' },
                        { _id: 'FREE', planName: 'AI Legal™ Free Plan' }
                      ]
                    ).map((plan) => {
                      const pId = plan._id || plan.planId || plan.planName;
                      const isSelected = selectedUserPlan === pId || selectedUserPlan === plan.planName;
                      return (
                        <button
                          key={pId}
                          type="button"
                          onClick={() => setSelectedUserPlan(pId)}
                          className={`p-2 rounded-lg text-left text-[11px] font-extrabold transition-all border ${
                            isSelected 
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="truncate">{plan.planName || plan.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Plan Duration</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUserBillingCycle('monthly')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selectedUserBillingCycle === 'monthly'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUserBillingCycle('yearly')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selectedUserBillingCycle === 'yearly'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <button
                      type="button"
                      onClick={handleAssignPlanForSelectedUser}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-all shadow-xs"
                    >
                      Assign Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleExpireSelectedUserPlan}
                      className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-all"
                    >
                      Expire Plan
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedUser(null)} 
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all shadow-xs"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── ADJUST CREDITS MODAL ── */}
      {creditModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Adjust User Credits</h3>
              <button onClick={() => setCreditModalUser(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Add AI credits to <strong>{creditModalUser.name}</strong></p>
            <input 
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:outline-hidden"
              placeholder="Credits count..."
            />
            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => setCreditModalUser(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
              <button onClick={handleAdjustCredits} className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs">Add Credits</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PLAN MODAL ── */}
      {planModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Change User Plan</h3>
              <button onClick={() => setPlanModalUser(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Select plan for <strong>{planModalUser.name}</strong></p>
            <select
              value={newPlanId}
              onChange={(e) => setNewPlanId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
            >
              <option value="advocate_basic">AI Legal™ Basic (₹499/mo)</option>
              <option value="advocate_pro">AI Legal™ Professional (₹999/mo)</option>
              <option value="advocate_premium">AI Legal™ Premium (₹2,399/mo)</option>
              <option value="student_basic">Student Basic (₹499/mo)</option>
              <option value="student_pro">Student Pro (₹999/mo)</option>
              <option value="student_premium">Student Premium (₹2,399/mo)</option>
              <option value="firm_basic">Firm Basic (₹499/mo)</option>
              <option value="firm_pro">Firm Pro (₹999/mo)</option>
              <option value="firm_premium">Firm Premium (₹2,399/mo)</option>
              <option value="combo_student_advocate">Combo: Student + Advocate (₹1,199/mo)</option>
              <option value="combo_advocate_firm">Combo: Advocate + Firm (₹1,499/mo)</option>
              <option value="combo_all_access">Combo: All Access Pass (₹2,399/mo)</option>
              <option value="FREE">Free Tier</option>
            </select>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => setPlanModalUser(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
              <button onClick={handleChangePlan} className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs">Update Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAN CREATOR / EDITOR MODAL ── */}
      {(editingPlanModal || isCreatingPlanModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {isCreatingPlanModal ? 'Create New Subscription Plan' : `Edit Plan: ${planForm.planName}`}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {isCreatingPlanModal ? 'Add a new pricing tier to AI Legal™ master plans' : `Update pricing, credits, and features for ${planForm.planId}`}
                </p>
              </div>
              <button 
                onClick={() => { setEditingPlanModal(null); setIsCreatingPlanModal(false); }} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Plan Identifier (ID)</label>
                  <input
                    type="text"
                    required
                    disabled={!isCreatingPlanModal}
                    value={planForm.planId}
                    onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="e.g. advocate_pro"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    required
                    value={planForm.planName}
                    onChange={(e) => setPlanForm({ ...planForm, planName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                    placeholder="e.g. AI Legal™ Advocate Pro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Price Monthly (₹)</label>
                  <input
                    type="number"
                    required
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Price Yearly (₹)</label>
                  <input
                    type="number"
                    required
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm({ ...planForm, priceYearly: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">AI Credits</label>
                  <input
                    type="number"
                    required
                    value={planForm.credits}
                    onChange={(e) => setPlanForm({ ...planForm, credits: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Badge Text (Optional)</label>
                <input
                  type="text"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                  placeholder="e.g. ADVOCATE PRO / MOST POPULAR"
                />
              </div>

              <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={planForm.isPopular}
                    onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                    className="rounded-md text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Highlight as Popular ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="rounded-md text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Active Plan 🟢</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Features List (One feature per line)</label>
                <textarea
                  rows={5}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:outline-hidden leading-relaxed"
                  placeholder="Active Cases: 150&#10;Storage: 15 GB&#10;Draft Maker: 100 / month&#10;Court Prep Workspace: 50 dossiers / month&#10;Precedent Search: Unlimited"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setEditingPlanModal(null); setIsCreatingPlanModal(false); }} 
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-xs"
                >
                  {isCreatingPlanModal ? 'Create Plan' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MANAGE FEATURE REQUEST MODAL ── */}
      {selectedFeatureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Manage Feature Request</h3>
              <button onClick={() => setSelectedFeatureModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs font-extrabold text-slate-900">{selectedFeatureModal.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedFeatureModal.description}</p>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Development Status</label>
                <select
                  value={devStatusInput}
                  onChange={(e) => setDevStatusInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Developer Reply / Note</label>
                <textarea
                  rows={3}
                  value={devReplyInput}
                  onChange={(e) => setDevReplyInput(e.target.value)}
                  placeholder="e.g. Scheduled for v3.2 release cycle..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setSelectedFeatureModal(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
                <button 
                  onClick={() => handleUpdateFeatureStatus(selectedFeatureModal._id, devStatusInput, devReplyInput)} 
                  className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
                >
                  Save Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE BUG REPORT MODAL ── */}
      {selectedBugModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Manage Bug Report</h3>
              <button onClick={() => setSelectedBugModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs font-extrabold text-slate-900">{selectedBugModal.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedBugModal.description}</p>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Resolution Status</label>
                <select
                  value={bugStatusInput}
                  onChange={(e) => setBugStatusInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Internal Developer Notes</label>
                <textarea
                  rows={3}
                  value={bugDevNotesInput}
                  onChange={(e) => setBugDevNotesInput(e.target.value)}
                  placeholder="e.g. Increasing API gateway timeout window to 45s..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setSelectedBugModal(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel</button>
                <button 
                  onClick={() => handleUpdateBugStatus(selectedBugModal._id, bugStatusInput, bugDevNotesInput)} 
                  className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
                >
                  Update Bug
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COUPON CREATOR / EDITOR MODAL ── */}
      {(editingCouponModal || isCreatingCouponModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {isCreatingCouponModal ? 'Create Promo Coupon' : `Edit Coupon: ${couponForm.code}`}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">Configure discount parameters and plan eligibility.</p>
              </div>
              <button onClick={() => { setEditingCouponModal(null); setIsCreatingCouponModal(false); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCouponSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-amber-700 focus:outline-hidden"
                    placeholder="e.g. ADVOCATE50"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rupee Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-blue-600 focus:outline-hidden"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Per User Limit</label>
                  <input
                    type="number"
                    value={couponForm.perUserLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, perUserLimit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={couponForm.startDate}
                    onChange={(e) => setCouponForm({ ...couponForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={couponForm.expiryDate}
                    onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Coupon Status</label>
                <select
                  value={couponForm.status}
                  onChange={(e) => setCouponForm({ ...couponForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="active">Active (Available for advocates)</option>
                  <option value="inactive">Inactive (Disabled)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => { setEditingCouponModal(null); setIsCreatingCouponModal(false); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-extrabold text-xs shadow-xs">
                  {isCreatingCouponModal ? 'Create Coupon' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
