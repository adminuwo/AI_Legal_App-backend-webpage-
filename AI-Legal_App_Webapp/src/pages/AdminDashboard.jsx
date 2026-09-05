import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Users, CreditCard, Package, Ticket, Lightbulb, Bug, AlertTriangle, 
  MessageSquare, Globe, Settings, Shield, ShieldAlert, Search, RefreshCw, Plus, PlusCircle, 
  Edit2, Edit3, Trash2, Lock, Unlock, CheckCircle2, XCircle, ExternalLink, Key, DollarSign, 
  TrendingUp, Activity, HardDrive, Terminal, Send, Eye, EyeOff, ChevronRight, X, 
  FileText, Check, RotateCw, Building2, UserCheck, Zap, ArrowLeft, Download, Tag, Wrench
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { userData } from '../userStore/userData';
import { isSuperAdmin } from '../utils/isSuperAdmin';
import DeleteConfirmModal from '../Components/DeleteConfirmModal';
import axios from 'axios';
import { API } from '../types.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'plans', label: 'Plans', icon: Package },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'addons', label: 'Add-on Requests', icon: PlusCircle },
  { id: 'features', label: 'Requests', icon: Lightbulb },
  { id: 'bugs', label: 'Bugs', icon: Bug },
  { id: 'crashes', label: 'Crash Reports', icon: AlertTriangle },
  { id: 'reports', label: 'Response Reports', icon: MessageSquare },
  { id: 'jurisdiction', label: 'Jurisdiction', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const recoilUserData = useRecoilValue(userData);
  const user = recoilUserData?.user || null;

  // Authorization Check
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    return (
      user.role === 'admin' ||
      user.role === 'SUPER_ADMIN' ||
      email === 'aditi@uwo24.com' ||
      email === 'aditilakhera0@gmail.com' ||
      email === 'admin@uwo24.com' ||
      isSuperAdmin(user)
    );
  }, [user]);

  // Tab State
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
    openBugs: 0
  });

  const [usersList, setUsersList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [couponFeatureEnabled, setCouponFeatureEnabled] = useState(true);
  const [couponStats, setCouponStats] = useState({ totalCoupons: 0, activeCoupons: 0, totalDiscountGiven: 0 });
  const [featuresList, setFeaturesList] = useState([]);
  const [bugsList, setBugsList] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [crashesList, setCrashesList] = useState([]);
  const [crashStats, setCrashStats] = useState({ total: 0, unresolved: 0 });

  // Enterprise Add-on Requests State & Sync
  const [addonRequestsList, setAddonRequestsList] = useState(() => {
    const saved = localStorage.getItem('adminAddonRequests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        _id: 'addon-req-101',
        addonId: 'evidence-analyst',
        addonName: 'Evidence Analyst & Forensic Scanner',
        category: 'Advocate Practitioner Suite',
        institutionName: 'Rani Durgavati Vishwavidyalaya (RDVV)',
        institutionEmail: 'admin@rdvv.ac.in',
        requestedBy: 'University Admin (RDVV)',
        notes: 'Requested for BA LLB Final Year moot court preparation & evidence examination.',
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const handleApproveAddonRequest = (req) => {
    const updatedList = addonRequestsList.map(item =>
      item._id === req._id ? { ...item, status: 'Approved' } : item
    );
    setAddonRequestsList(updatedList);
    localStorage.setItem('adminAddonRequests', JSON.stringify(updatedList));

    const approvedStr = localStorage.getItem('approvedAddonsList');
    let approvedList = approvedStr ? JSON.parse(approvedStr) : [];
    if (!approvedList.includes(req.addonId)) {
      approvedList.push(req.addonId);
    }
    localStorage.setItem('approvedAddonsList', JSON.stringify(approvedList));

    const featureMap = {
      'argument-builder': 'argumentBuilder',
      'evidence-analyst': 'evidenceAnalyst',
      'contract-analyzer': 'contractAnalyzer',
      'case-predictor': 'casePredictor',
      'strategy-engine': 'strategyEngine',
      'client-connect': 'clientConnect',
      'client-communication': 'teamCommunication'
    };
    const targetKey = featureMap[req.addonId] || req.addonId;

    const rulesStr = localStorage.getItem('enterpriseFeatureAccessRules');
    let currentRules = rulesStr ? JSON.parse(rulesStr) : {};
    currentRules[targetKey] = true;
    localStorage.setItem('enterpriseFeatureAccessRules', JSON.stringify(currentRules));

    toast.success(`✅ Add-on "${req.addonName}" APPROVED & LIVE enabled for ${req.institutionName} students across Web & Mobile app!`);
  };

  const handleRejectAddonRequest = (req) => {
    const updatedList = addonRequestsList.map(item =>
      item._id === req._id ? { ...item, status: 'Rejected' } : item
    );
    setAddonRequestsList(updatedList);
    localStorage.setItem('adminAddonRequests', JSON.stringify(updatedList));
    toast.error(`❌ Add-on request for "${req.addonName}" rejected.`);
  };
  const [adminSettings, setAdminSettings] = useState({
    maintenanceMode: false,
    sessionTimeout: 30,
    platformName: 'AI Legal Pro',
    supportEmail: 'support@uwo24.com',
    aiModel: 'gpt-4-turbo',
    defaultCredits: 50,
    fileUploadLimitMb: 25,
    storageLimitGb: 5,
    apiKeys: { openai: '••••••••••••1234', razorpayId: '••••••••••••5678' }
  });

  // Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [billingSearch, setBillingSearch] = useState('');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [bugSeverityFilter, setBugSeverityFilter] = useState('all');
  const [bugStatusFilter, setBugStatusFilter] = useState('all');
  const [crashSourceFilter, setCrashSourceFilter] = useState('all');

  // Modals & Actions States
  const [editUserModal, setEditUserModal] = useState(null);
  const [creditModalUser, setCreditModalUser] = useState(null);
  const [creditAdjustment, setCreditAdjustment] = useState({ amount: '50', actionType: 'add', reason: '' });
  const [subModalUser, setSubModalUser] = useState(null);
  const [subForm, setSubForm] = useState({ planId: 'advocate_pro', billingCycle: 'monthly' });
  const [selectedDossierUser, setSelectedDossierUser] = useState(null);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [passwordResetVal, setPasswordResetVal] = useState('');
  const [refundConfirmModal, setRefundConfirmModal] = useState({ isOpen: false, payment: null });
  const [markPaidConfirmModal, setMarkPaidConfirmModal] = useState({ isOpen: false, payment: null });

  // Plan CRUD Modal
  const [planModal, setPlanModal] = useState({ isOpen: false, isEdit: false, planData: null });
  const [planForm, setPlanForm] = useState({
    planId: '',
    planName: '',
    priceMonthly: '0',
    priceYearly: '0',
    credits: '100',
    badge: 'PRO',
    features: '',
    isPopular: false,
    isActive: true
  });
  const [planDeleteConfirmModal, setPlanDeleteConfirmModal] = useState({ isOpen: false, plan: null });

  // Coupon CRUD & Stats Modals
  const [copiedCouponCode, setCopiedCouponCode] = useState(null);
  const [couponModal, setCouponModal] = useState({ isOpen: false, isEdit: false, couponData: null });
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '10',
    applicablePlans: ['ALL'],
    billingCycles: ['ALL'],
    startDate: '',
    expiryDate: '',
    usageLimit: '',
    perUserLimit: '1',
    minimumPurchase: '',
    maximumDiscount: '',
    status: 'active'
  });
  const [couponDetailsModal, setCouponDetailsModal] = useState({ isOpen: false, coupon: null, stats: null, usageHistory: [] });
  const [couponDeleteConfirmModal, setCouponDeleteConfirmModal] = useState({ isOpen: false, coupon: null });

  // Feature Requests States & Modals
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureFilterState, setFeatureFilterState] = useState('all');
  const [featureModal, setFeatureModal] = useState({ isOpen: false, feature: null, status: 'Pending', developerAssigned: 'None', adminNote: '' });
  const [featureDeleteModal, setFeatureDeleteModal] = useState({ isOpen: false, feature: null });

  // Bug Details Modal
  const [bugModal, setBugModal] = useState({ isOpen: false, bug: null, status: 'Open', assignedTo: '' });

  // Crash Detail Modal
  const [selectedCrash, setSelectedCrash] = useState(null);

  // Response Report Detail Modal
  const [selectedReport, setSelectedReport] = useState(null);

  // Jurisdiction Sandbox States
  const [jSelectedUser, setJSelectedUser] = useState(null);
  const [jTargetCountry, setJTargetCountry] = useState('India');
  const [jTargetState, setJTargetState] = useState('Gujarat');
  const [jOverrideType, setJOverrideType] = useState('Temporary');
  const [jTestQuery, setJTestQuery] = useState('');
  const [jTestLoading, setJTestLoading] = useState(false);
  const [jTestResult, setJTestResult] = useState('');

  // Password Change Form
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // Delete Confirm Modal State
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: '', id: '', name: '' });

  // Fetch All Backend Data
  const loadData = async (isSilent = false) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const token = user?.token || localStorage.getItem('token');
      const tStamp = Date.now();
      const authHeader = { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        } 
      };
      const noCacheAuthHeader = authHeader;

      const [statsRes, usersRes, billingRes, plansRes, couponsRes, featuresRes, bugsRes, settingsRes, complaintsRes, crashesRes] = await Promise.all([
        axios.get(`${API}/admin/stats?_t=${tStamp}`, noCacheAuthHeader).catch((err) => ({ data: { success: false, code: err.response?.data?.code } })),
        axios.get(`${API}/admin/users?limit=200`, authHeader).catch(() => ({ data: { list: [] } })),
        axios.get(`${API}/admin/billing?limit=200`, authHeader).catch(() => ({ data: { list: [] } })),
        axios.get(`${API}/admin/plans`, authHeader).catch(() => ({ data: { plans: [] } })),
        axios.get(`${API}/admin/coupons`, authHeader).catch(() => ({ data: { coupons: [], stats: null } })),
        axios.get(`${API}/admin/feature-requests?limit=200`, authHeader).catch(() => ({ data: { list: [] } })),
        axios.get(`${API}/admin/bug-reports?limit=200`, authHeader).catch(() => ({ data: { list: [] } })),
        axios.get(`${API}/admin/settings`, authHeader).catch(() => ({ data: { settings: null } })),
        axios.get(`${API}/complaints?limit=200`, authHeader).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/admin/crashes?limit=200`, authHeader).catch(() => ({ data: { crashes: [], stats: null } }))
      ]);

      if (statsRes.data?.code === 'SESSION_REVOKED') {
        toast.error('Session expired or logged in from another device. Please log in again.');
        setStats(prev => ({ ...prev, revenueMonth: 0, revenueToday: 0, revenueLifetime: 0 }));
      } else if (statsRes.data?.success && statsRes.data.stats) {
        setStats(prev => ({ 
          ...prev, 
          ...statsRes.data.stats,
          revenueToday: Number(statsRes.data.stats.revenueToday || 0),
          revenueMonth: Number(statsRes.data.stats.revenueMonth || 0),
          revenueLifetime: Number(statsRes.data.stats.revenueLifetime || 0)
        }));
      } else {
        setStats(prev => ({ ...prev, revenueMonth: 0, revenueToday: 0, revenueLifetime: 0 }));
      }
      if (Array.isArray(usersRes.data?.list)) setUsersList(usersRes.data.list);
      if (Array.isArray(billingRes.data?.list)) setPaymentsList(billingRes.data.list);
      if (Array.isArray(plansRes.data?.plans)) setPlansList(plansRes.data.plans);
      if (Array.isArray(couponsRes.data?.coupons)) setCouponsList(couponsRes.data.coupons);
      if (typeof couponsRes.data?.couponFeatureEnabled === 'boolean') setCouponFeatureEnabled(couponsRes.data.couponFeatureEnabled);
      if (couponsRes.data?.stats) setCouponStats(couponsRes.data.stats);
      if (Array.isArray(featuresRes.data?.list)) setFeaturesList(featuresRes.data.list);
      if (Array.isArray(bugsRes.data?.list)) setBugsList(bugsRes.data.list);
      if (Array.isArray(complaintsRes.data?.data)) setComplaintsList(complaintsRes.data.data);
      if (Array.isArray(crashesRes.data?.crashes)) setCrashesList(crashesRes.data.crashes);
      if (crashesRes.data?.stats) setCrashStats(crashesRes.data.stats);
      if (settingsRes.data?.settings) setAdminSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
    } catch (err) {
      console.error('Failed to load Admin Dashboard data:', err);
      toast.error('Failed to refresh Admin Portal telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 20000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // --- Filtered Users List ---
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const q = userSearch.toLowerCase().trim();
      const nameMatch = (u.name || u.displayName || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const phoneMatch = (u.phone || '').includes(q);
      const jurisdictionMatch = (u.jurisdiction || u.country || '').toLowerCase().includes(q);
      const idMatch = (u._id || '').toLowerCase().includes(q);
      const searchMatch = !q || nameMatch || emailMatch || phoneMatch || jurisdictionMatch || idMatch;

      const plan = String(u.subscription?.plan || u.currentPlan || 'FREE').toUpperCase();
      const isBlocked = u.isBlocked === true || u.status === 'Suspended';
      let filterMatch = true;
      if (userFilter === 'free') filterMatch = plan === 'FREE' || plan.includes('BASIC');
      if (userFilter === 'premium') filterMatch = plan !== 'FREE' && !plan.includes('BASIC');
      if (userFilter === 'suspended') filterMatch = isBlocked;

      return searchMatch && filterMatch;
    });
  }, [usersList, userSearch, userFilter]);

  // --- Live Billing KPIs & Filtered Payments List ---
  const liveBillingStats = useMemo(() => {
    let totalRevenue = 0;
    let successCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let failedCount = 0;

    paymentsList.forEach(p => {
      const gw = String(p.gateway || '').toLowerCase();
      const isRazorpay = gw.includes('razorpay');
      const st = String(p.status || 'success').toLowerCase();
      const amt = Number(p.amount || 0);

      if (isRazorpay && (st === 'success' || st === 'paid')) {
        totalRevenue += amt;
        successCount += 1;
      } else if (st === 'pending') {
        pendingCount += 1;
      } else if (st === 'refunded' || st === 'reversed') {
        refundedCount += 1;
      } else if (st === 'failed' || st === 'rejected') {
        failedCount += 1;
      }
    });

    return {
      totalRevenue,
      successCount,
      pendingCount,
      refundedCount,
      failedCount,
      totalCount: paymentsList.length
    };
  }, [paymentsList]);

  const filteredPayments = useMemo(() => {
    return paymentsList.filter(p => {
      const q = billingSearch.toLowerCase().trim();
      const userName = (p.userName || p.userId?.name || '').toLowerCase();
      const userEmail = (p.userEmail || p.userId?.email || '').toLowerCase();
      const txnId = (p.transactionId || p._id || '').toLowerCase();
      const invoiceNo = (p.invoiceNumber || p._id || '').toLowerCase();

      const searchMatch = !q || userName.includes(q) || userEmail.includes(q) || txnId.includes(q) || invoiceNo.includes(q);

      const st = String(p.status || 'success').toLowerCase();
      let filterMatch = true;
      if (billingFilter === 'success') filterMatch = st === 'success' || st === 'paid';
      if (billingFilter === 'pending') filterMatch = st === 'pending';
      if (billingFilter === 'refunded') filterMatch = st === 'refunded' || st === 'reversed';
      if (billingFilter === 'failed') filterMatch = st === 'failed' || st === 'rejected';

      return searchMatch && filterMatch;
    });
  }, [paymentsList, billingSearch, billingFilter]);

  // --- Filtered Feature Requests List (Backend + Enterprise Custom Proposals) ---
  const filteredFeatures = useMemo(() => {
    let combined = [...featuresList];
    const savedCustom = localStorage.getItem('adminFeatureRequests');
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        parsed.forEach(cReq => {
          if (!combined.some(f => f._id === cReq._id)) {
            combined.unshift(cReq);
          }
        });
      } catch (e) {}
    }

    return combined.filter(f => {
      const q = featureSearch.toLowerCase().trim();
      const titleMatch = (f.title || '').toLowerCase().includes(q);
      const descMatch = (f.description || '').toLowerCase().includes(q);
      const categoryMatch = (f.category || '').toLowerCase().includes(q);
      const emailMatch = (f.email || f.userEmail || '').toLowerCase().includes(q);
      const priorityMatch = (f.priority || '').toLowerCase().includes(q);
      const statusMatch = (f.status || '').toLowerCase().includes(q);
      const devMatch = (f.developerAssigned || '').toLowerCase().includes(q);

      const searchMatch = !q || titleMatch || descMatch || categoryMatch || emailMatch || priorityMatch || statusMatch || devMatch;

      const currentStatus = String(f.status || 'Pending').toLowerCase();
      const targetFilter = String(featureFilterState).toLowerCase();

      const filterMatch = featureFilterState === 'all' || currentStatus === targetFilter;

      return searchMatch && filterMatch;
    });
  }, [featuresList, featureSearch, featureFilterState]);

  // --- Billing CSV Export & Financial Handlers ---
  const handleExportCSV = () => {
    if (!paymentsList || paymentsList.length === 0) {
      toast.error('No payment transactions to export.');
      return;
    }

    const headers = ['Transaction ID', 'Invoice Number', 'User Name', 'Email', 'Amount (INR)', 'GST (18%)', 'Gateway', 'Plan', 'Status', 'Date'];
    const rows = filteredPayments.map(p => {
      const amt = Number(p.amount || 0);
      const gst = p.gst ? Number(p.gst).toFixed(2) : (amt * 0.18).toFixed(2);
      const planName = typeof p.planId === 'object' ? (p.planId?.planName || p.planId?._id) : (p.planId || 'advocate_basic');
      return [
        `"${p.transactionId || p._id || ''}"`,
        `"${p.invoiceNumber || p._id || ''}"`,
        `"${p.userName || p.userId?.name || 'Advocate Customer'}"`,
        `"${p.userEmail || p.userId?.email || ''}"`,
        amt,
        gst,
        `"${p.gateway || 'Razorpay'}"`,
        `"${planName}"`,
        `"${(p.status || 'SUCCESS').toUpperCase()}"`,
        `"${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ai-legal-billing-transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Billing transactions exported to CSV.');
  };

  const handleRefundPayment = async (paymentId) => {
    if (!paymentId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/admin/billing/${paymentId}/refund`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(async () => {
        // Fallback endpoint
        await axios.put(`${API}/admin/billing/${paymentId}`, { status: 'refunded' }, { headers: { Authorization: `Bearer ${token}` } });
      });
      toast.success('Payment successfully refunded & reversed.');
      setRefundConfirmModal({ isOpen: false, payment: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to refund payment transaction.');
    }
  };

  const handleMarkPaymentPaid = async (paymentId) => {
    if (!paymentId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/admin/billing/${paymentId}/mark-paid`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(async () => {
        // Fallback endpoint
        await axios.put(`${API}/admin/billing/${paymentId}`, { status: 'success' }, { headers: { Authorization: `Bearer ${token}` } });
      });
      toast.success('Transaction marked as PAID.');
      setMarkPaidConfirmModal({ isOpen: false, payment: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to update payment status.');
    }
  };

  // --- PLAN CRUD ACTIONS ---
  const handleOpenPlanCreator = () => {
    setPlanForm({
      planId: '',
      planName: '',
      priceMonthly: '0',
      priceYearly: '0',
      credits: '100',
      badge: 'PRO',
      features: '',
      isPopular: false,
      isActive: true
    });
    setPlanModal({ isOpen: true, isEdit: false, planData: null });
  };

  const handleOpenPlanEdit = (plan) => {
    if (!plan) return;
    const featStr = Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || '');
    setPlanForm({
      planId: plan.planId || plan._id || '',
      planName: plan.planName || plan.name || '',
      priceMonthly: String(plan.priceMonthly ?? 0),
      priceYearly: String(plan.priceYearly ?? 0),
      credits: String(plan.credits ?? 100),
      badge: plan.badge || 'PRO',
      features: featStr,
      isPopular: !!plan.isPopular,
      isActive: plan.isActive !== false
    });
    setPlanModal({ isOpen: true, isEdit: true, planData: plan });
  };

  const handlePlanSaveSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!planForm.planName.trim()) {
      toast.error('Plan display name is required.');
      return;
    }

    try {
      const token = user?.token || localStorage.getItem('token');
      const featureList = planForm.features
        .split('\n')
        .map(f => f.replace(/^✓\s*/, '').trim())
        .filter(Boolean);

      const payload = {
        planId: planForm.planId || planForm.planName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        planName: planForm.planName.trim(),
        name: planForm.planName.trim(),
        priceMonthly: Number(planForm.priceMonthly) || 0,
        priceYearly: Number(planForm.priceYearly) || 0,
        credits: Number(planForm.credits) || 0,
        badge: planForm.badge ? planForm.badge.toUpperCase().trim() : 'PRO',
        features: featureList,
        isPopular: planForm.isPopular,
        isActive: planForm.isActive
      };

      if (planModal.isEdit && planModal.planData?._id) {
        await axios.put(`${API}/admin/plans/${planModal.planData._id}`, payload, { headers: { Authorization: `Bearer ${token}` } }).catch(async () => {
          // Fallback endpoint
          await axios.post(`${API}/admin/plans`, payload, { headers: { Authorization: `Bearer ${token}` } });
        });
        toast.success(`Plan "${payload.planName}" updated successfully.`);
      } else {
        await axios.post(`${API}/admin/plans`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`New plan "${payload.planName}" created successfully.`);
      }

      setPlanModal({ isOpen: false, isEdit: false, planData: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to save subscription plan parameters.');
    }
  };

  const handleDeletePlanSubmit = async (planId) => {
    if (!planId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.delete(`${API}/admin/plans/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Subscription plan deleted.');
      setPlanDeleteConfirmModal({ isOpen: false, plan: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to delete subscription plan.');
    }
  };

  // --- COUPON CRUD & TELEMETRY ACTIONS ---
  const handleToggleCouponFeature = async () => {
    try {
      const token = user?.token || localStorage.getItem('token');
      const nextState = !couponFeatureEnabled;
      await axios.patch(`${API}/admin/coupons/toggle-feature`, { enabled: nextState }, { headers: { Authorization: `Bearer ${token}` } });
      setCouponFeatureEnabled(nextState);
      toast.success(`Coupon discount feature is now ${nextState ? 'ACTIVE' : 'INACTIVE'}.`);
    } catch (err) {
      toast.error('Failed to toggle global coupon status.');
    }
  };

  const handleCopyCouponCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    toast.success(`Coupon "${code}" copied to clipboard.`);
    setTimeout(() => setCopiedCouponCode(null), 2000);
  };

  const handleOpenCouponCreator = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: '10',
      applicablePlans: ['ALL'],
      billingCycles: ['ALL'],
      startDate: today,
      expiryDate: nextMonth,
      usageLimit: '',
      perUserLimit: '1',
      minimumPurchase: '',
      maximumDiscount: '',
      status: 'active'
    });
    setCouponModal({ isOpen: true, isEdit: false, couponData: null });
  };

  const handleOpenCouponEdit = (coupon) => {
    if (!coupon) return;
    setCouponForm({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: String(coupon.discountValue ?? 10),
      applicablePlans: Array.isArray(coupon.applicablePlans) && coupon.applicablePlans.length > 0 ? coupon.applicablePlans : ['ALL'],
      billingCycles: Array.isArray(coupon.billingCycles) && coupon.billingCycles.length > 0 ? coupon.billingCycles : ['ALL'],
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit !== null && coupon.usageLimit !== undefined ? String(coupon.usageLimit) : '',
      perUserLimit: String(coupon.perUserLimit ?? 1),
      minimumPurchase: coupon.minimumPurchase ? String(coupon.minimumPurchase) : '',
      maximumDiscount: coupon.maximumDiscount ? String(coupon.maximumDiscount) : '',
      status: coupon.status || 'active'
    });
    setCouponModal({ isOpen: true, isEdit: true, couponData: coupon });
  };

  const handleSaveCouponSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!couponForm.code.trim()) {
      toast.error('Coupon code is required.');
      return;
    }
    if (!couponForm.expiryDate) {
      toast.error('Expiry date is required.');
      return;
    }

    try {
      const token = user?.token || localStorage.getItem('token');
      const payload = {
        code: couponForm.code.toUpperCase().trim(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue) || 0,
        applicablePlans: couponForm.applicablePlans,
        billingCycles: couponForm.billingCycles,
        startDate: couponForm.startDate || new Date().toISOString(),
        expiryDate: couponForm.expiryDate,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
        perUserLimit: Number(couponForm.perUserLimit) || 1,
        minimumPurchase: couponForm.minimumPurchase ? Number(couponForm.minimumPurchase) : 0,
        maximumDiscount: couponForm.maximumDiscount ? Number(couponForm.maximumDiscount) : null,
        status: couponForm.status
      };

      if (couponModal.isEdit && couponModal.couponData?._id) {
        await axios.put(`${API}/admin/coupons/${couponModal.couponData._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`Coupon "${payload.code}" updated successfully.`);
      } else {
        await axios.post(`${API}/admin/coupons`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`New coupon "${payload.code}" created successfully.`);
      }

      setCouponModal({ isOpen: false, isEdit: false, couponData: null });
      loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon code.');
    }
  };

  const handleToggleCouponStatus = async (couponId) => {
    if (!couponId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.patch(`${API}/admin/coupons/${couponId}/status`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(async () => {
        // Fallback status flip
        const target = couponsList.find(c => c._id === couponId);
        const nextStatus = target?.status === 'active' ? 'inactive' : 'active';
        await axios.put(`${API}/admin/coupons/${couponId}`, { status: nextStatus }, { headers: { Authorization: `Bearer ${token}` } });
      });
      toast.success('Coupon status updated.');
      loadData(true);
    } catch (err) {
      toast.error('Failed to update coupon status.');
    }
  };

  const handleViewCouponDetails = async (couponId) => {
    if (!couponId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await axios.get(`${API}/admin/coupons/${couponId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        setCouponDetailsModal({
          isOpen: true,
          coupon: res.data.coupon || res.data.data,
          stats: res.data.stats || res.data.analytics,
          usageHistory: res.data.usageHistory || res.data.redemptions || []
        });
      } else {
        const target = couponsList.find(c => c._id === couponId);
        setCouponDetailsModal({
          isOpen: true,
          coupon: target || null,
          stats: { totalUses: target?.usedCount || 0, totalDiscountGiven: 0, totalRevenueGenerated: 0, averageOrderValue: 0 },
          usageHistory: []
        });
      }
    } catch (err) {
      const target = couponsList.find(c => c._id === couponId);
      setCouponDetailsModal({
        isOpen: true,
        coupon: target || null,
        stats: { totalUses: target?.usedCount || 0, totalDiscountGiven: 0, totalRevenueGenerated: 0, averageOrderValue: 0 },
        usageHistory: []
      });
    }
  };

  const handleDeleteCouponSubmit = async (couponId) => {
    if (!couponId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.delete(`${API}/admin/coupons/${couponId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Coupon deleted.');
      setCouponDeleteConfirmModal({ isOpen: false, coupon: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to delete coupon code.');
    }
  };

  // --- USER ACTIONS ---
  const handleUserRoleSave = async (id, newRole) => {
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${id}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`User role updated to ${newRole}`);
      setEditUserModal(null);
      if (selectedDossierUser && selectedDossierUser._id === id) {
        setSelectedDossierUser({ ...selectedDossierUser, role: newRole });
      }
      loadData(true);
    } catch (err) {
      toast.error('Failed to update user role.');
    }
  };

  const handleAdjustCreditsSubmit = async (e) => {
    if (e) e.preventDefault();
    const targetUser = creditModalUser || selectedDossierUser;
    if (!targetUser) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await axios.post(`${API}/admin/users/${targetUser._id}/credits`, creditAdjustment, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`${creditAdjustment.actionType === 'add' ? 'Added' : 'Deducted'} ${creditAdjustment.amount} credits.`);
      setCreditModalUser(null);
      if (selectedDossierUser && selectedDossierUser._id === targetUser._id) {
        setSelectedDossierUser({ ...selectedDossierUser, credits: res.data?.credits ?? (targetUser.credits + parseInt(creditAdjustment.amount)) });
      }
      loadData(true);
    } catch (err) {
      toast.error('Failed to adjust user credits.');
    }
  };

  const handleSubscriptionSave = async (e) => {
    if (e) e.preventDefault();
    const targetUser = subModalUser || selectedDossierUser;
    if (!targetUser) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${targetUser._id}/subscription`, subForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Subscription plan updated successfully.');
      setSubModalUser(null);
      if (selectedDossierUser && selectedDossierUser._id === targetUser._id) {
        setSelectedDossierUser({ ...selectedDossierUser, currentPlan: subForm.planId, subscription: { plan: subForm.planId, billingCycle: subForm.billingCycle } });
      }
      loadData(true);
    } catch (err) {
      toast.error('Failed to update subscription.');
    }
  };

  const handleExpireUserSubscription = async (userId) => {
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/admin/users/${userId}/change-plan`, { expire: true }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User subscription plan expired.');
      if (selectedDossierUser && selectedDossierUser._id === userId) {
        setSelectedDossierUser({ ...selectedDossierUser, currentPlan: 'FREE', subscription: { plan: 'FREE' } });
      }
      loadData(true);
    } catch (err) {
      toast.error('Failed to expire subscription.');
    }
  };

  const handleToggleSuspend = async (id, currentStatus) => {
    const isCurrentlySuspended = currentStatus === 'Suspended' || currentStatus === true;
    const nextStatus = isCurrentlySuspended ? 'Active' : 'Suspended';
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.put(`${API}/admin/users/${id}/suspend`, { status: nextStatus }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`User account is now ${nextStatus}`);
      if (selectedDossierUser && selectedDossierUser._id === id) {
        setSelectedDossierUser({ ...selectedDossierUser, status: nextStatus, isBlocked: !isCurrentlySuspended });
      }
      loadData(true);
    } catch (err) {
      toast.error('Failed to change suspension status.');
    }
  };

  const handleResetUserPassword = async (e) => {
    if (e) e.preventDefault();
    if (!passwordResetUser || !passwordResetVal) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/admin/users/${passwordResetUser._id}/reset-password`, { password: passwordResetVal }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Password updated for ${passwordResetUser.name || passwordResetUser.email}`);
      setPasswordResetUser(null);
      setPasswordResetVal('');
    } catch (err) {
      toast.error('Failed to reset user password.');
    }
  };

  const handleLoginAsUser = async (targetUser) => {
    if (!targetUser) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await axios.post(`${API}/admin/users/${targetUser._id}/login-as`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success && res.data?.token) {
        localStorage.setItem('token', res.data.token);
        toast.success(`Authenticated as ${targetUser.name || targetUser.email}`);
        setSelectedDossierUser(null);
        navigate('/dashboard');
      } else {
        toast.error('Masquerade login failed.');
      }
    } catch (err) {
      toast.error('Failed to authenticate as target user.');
    }
  };

  // --- PLAN CRUD ACTIONS ---
  const handleSavePlan = async (e) => {
    if (e) e.preventDefault();
    try {
      const token = user?.token || localStorage.getItem('token');
      const payload = {
        planId: planForm.planId,
        name: planForm.name,
        priceMonthly: parseFloat(planForm.priceMonthly) || 0,
        priceYearly: parseFloat(planForm.priceYearly) || 0,
        credits: parseInt(planForm.credits) || 100,
        features: planForm.features.split(',').map(f => f.trim()),
        isPopular: planForm.isPopular,
        isActive: planForm.isActive
      };

      if (planModal.isEdit && planModal.planData?._id) {
        await axios.put(`${API}/admin/plans/${planModal.planData._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Subscription plan updated.');
      } else {
        await axios.post(`${API}/admin/plans`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('New subscription plan created.');
      }
      setPlanModal({ isOpen: false, isEdit: false, planData: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to save subscription plan.');
    }
  };

  // --- COUPON CRUD ACTIONS ---
  const handleSaveCoupon = async (e) => {
    if (e) e.preventDefault();
    try {
      const token = user?.token || localStorage.getItem('token');
      const payload = {
        code: couponForm.code.toUpperCase().trim(),
        discountType: couponForm.discountType,
        discountValue: parseFloat(couponForm.discountValue) || 0,
        expiryDate: couponForm.expiryDate,
        usageLimit: parseInt(couponForm.usageLimit) || 100,
        perUserLimit: parseInt(couponForm.perUserLimit) || 1,
        status: couponForm.status
      };

      if (couponModal.isEdit && couponModal.couponData?._id) {
        await axios.put(`${API}/admin/coupons/${couponModal.couponData._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Coupon updated.');
      } else {
        await axios.post(`${API}/admin/coupons`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('New coupon code created.');
      }
      setCouponModal({ isOpen: false, isEdit: false, couponData: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to save coupon.');
    }
  };

  const handleToggleGlobalCoupons = async () => {
    try {
      const token = user?.token || localStorage.getItem('token');
      const nextState = !couponFeatureEnabled;
      await axios.patch(`${API}/admin/coupons/toggle-feature`, { enabled: nextState }, { headers: { Authorization: `Bearer ${token}` } });
      setCouponFeatureEnabled(nextState);
      toast.success(`Coupon discount system is now ${nextState ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err) {
      toast.error('Failed to toggle coupon engine.');
    }
  };

  // --- FEATURE REQUEST ACTIONS ---
  const handleSaveFeatureStatus = async (e) => {
    if (e) e.preventDefault();
    if (!featureModal.feature) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.patch(`${API}/admin/feature-requests/${featureModal.feature._id}`, {
        status: featureModal.status,
        developerAssigned: featureModal.developerAssigned,
        adminNote: featureModal.adminNote,
        reply: featureModal.adminNote
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Feature request updated.');
      setFeatureModal({ isOpen: false, feature: null, status: 'Pending', developerAssigned: 'None', adminNote: '' });
      loadData(true);
    } catch (err) {
      toast.error('Failed to update feature request.');
    }
  };

  const handleDeleteFeatureSubmit = async (featureId) => {
    if (!featureId) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.delete(`${API}/admin/feature-requests/${featureId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Feature request deleted.');
      setFeatureDeleteModal({ isOpen: false, feature: null });
      loadData(true);
    } catch (err) {
      toast.error('Failed to delete feature request.');
    }
  };

  // --- BUG REPORT TRIAGE ---
  const handleSaveBugStatus = async () => {
    if (!bugModal.bug) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.patch(`${API}/admin/bug-reports/${bugModal.bug._id}`, {
        status: bugModal.status,
        assignedTo: bugModal.assignedTo
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Bug report updated.');
      setBugModal({ isOpen: false, bug: null, status: 'Open', assignedTo: '' });
      loadData(true);
    } catch (err) {
      toast.error('Failed to update bug report.');
    }
  };

  // --- CRASH STATUS ---
  const handleResolveCrash = async (id, status) => {
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.patch(`${API}/admin/crashes/${id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Crash alert status updated to ${status}.`);
      loadData(true);
    } catch (err) {
      toast.error('Failed to update crash status.');
    }
  };

  // --- JURISDICTION OVERRIDE & SANDBOX TEST ---
  const handleSaveJurisdictionOverride = async (e) => {
    if (e) e.preventDefault();
    if (!jSelectedUser) {
      toast.error('Select a target user first.');
      return;
    }
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/admin/users/${jSelectedUser._id}/jurisdiction-override`, {
        country: jTargetCountry,
        state: jTargetState,
        overrideType: jOverrideType
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Jurisdiction override set to ${jTargetCountry} (${jTargetState}) for ${jSelectedUser.name}.`);
    } catch (err) {
      toast.error('Failed to apply jurisdiction override.');
    }
  };

  const handleRunJurisdictionTest = async (e) => {
    if (e) e.preventDefault();
    if (!jTestQuery.trim()) return;

    setJTestLoading(true);
    setJTestResult('');
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await axios.post(`${API}/admin/jurisdiction-sandbox-test`, {
        query: jTestQuery,
        country: jTargetCountry,
        state: jTargetState
      }, { headers: { Authorization: `Bearer ${token}` } });
      setJTestResult(res.data?.response || res.data?.answer || 'Jurisdiction test executed successfully.');
    } catch (err) {
      setJTestResult('Test execution failed. Using default statutory fallbacks.');
    } finally {
      setJTestLoading(false);
    }
  };

  // --- GLOBAL SETTINGS SAVE ---
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.put(`${API}/admin/settings`, adminSettings, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Global platform settings updated successfully.');
      loadData(true);
    } catch (err) {
      toast.error('Failed to update global settings.');
    }
  };

  const handleChangeAdminPassword = async (e) => {
    if (e) e.preventDefault();
    if (!adminPasswordInput || adminPasswordInput !== adminPasswordConfirm) {
      toast.error('Passwords do not match.');
      return;
    }
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/admin/change-password`, { newPassword: adminPasswordInput }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Admin password updated successfully.');
      setAdminPasswordInput('');
      setAdminPasswordConfirm('');
    } catch (err) {
      toast.error('Failed to change admin password.');
    }
  };

  // --- GENERAL DELETE CONFIRM ---
  const handleDeleteConfirm = async () => {
    if (!deleteConfig.id) return;
    try {
      const token = user?.token || localStorage.getItem('token');
      let url = `${API}/admin/${deleteConfig.type}/${deleteConfig.id}`;
      if (deleteConfig.type === 'users') url = `${API}/admin/users/${deleteConfig.id}`;
      if (deleteConfig.type === 'plans') url = `${API}/admin/plans/${deleteConfig.id}`;
      if (deleteConfig.type === 'coupons') url = `${API}/admin/coupons/${deleteConfig.id}`;

      await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`${deleteConfig.name} deleted permanently.`);
      setDeleteConfig({ isOpen: false, type: '', id: '', name: '' });
      loadData(true);
    } catch (err) {
      toast.error('Failed to delete item.');
      setDeleteConfig({ isOpen: false, type: '', id: '', name: '' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Access Restricted</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-medium">
              You do not have administrative privileges to access the AI Legal™ System Console.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all cursor-pointer"
          >
            Back to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-zinc-700" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A34D]/10 flex items-center justify-center border border-[#C8A34D]/30">
              <Shield className="w-5 h-5 text-[#C8A34D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Admin Portal</h1>
                <span className="px-2 py-0.5 rounded bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[10px] font-black uppercase tracking-wider">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">System Telemetry, User Controls & Platform Management</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C8A34D] ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </header>

      {/* 11 Mobile Tabs Bar */}
      <nav className="bg-white dark:bg-[#1E293B] border-b border-slate-200/80 dark:border-zinc-800 px-6 py-2 overflow-x-auto custom-scrollbar flex items-center gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#C8A34D] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Fetching live Admin Console telemetry...</p>
          </div>
        ) : activeTab === 'overview' ? (
          /* TAB 1: OVERVIEW — EXACT MOBILE APP DESIGN & ARCHITECTURE PARITY */
          <div className="space-y-6">
            {/* ROW 1: TOP 4 TELEMETRY CARDS IN A SINGLE 4-COLUMN ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CARD 1: TOTAL REGISTERED USERS */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">TOTAL REGISTERED USERS</span>
                  <div className="p-2 rounded-lg bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/20">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {(stats.totalUsers || 0).toLocaleString()}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{stats.onlineUsers || 0} Online</span>
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span className="text-slate-500 dark:text-zinc-400">
                      {stats.activeUsers || 0} Active (30d)
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 2: PLAN COMPOSITION */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">PLAN COMPOSITION</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-50 dark:bg-zinc-900/80 rounded-xl border border-slate-100 dark:border-zinc-800 text-center">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">{(stats.premiumUsers || 0).toLocaleString()}</h4>
                    <p className="text-[9px] font-bold text-[#C8A34D]">Paid Users</p>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-zinc-900/80 rounded-xl border border-slate-100 dark:border-zinc-800 text-center">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">{(stats.freeUsers || 0).toLocaleString()}</h4>
                    <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400">Free Advocates</p>
                  </div>
                </div>
              </div>

              {/* CARD 3: MONTHLY REVENUE */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MONTHLY REVENUE</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    ₹{(stats.revenueMonth || liveBillingStats.totalRevenue || 0).toLocaleString('en-IN')}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 truncate">
                    <span>Today: <strong className="text-slate-900 dark:text-white font-black">₹{(stats.revenueToday || 0).toLocaleString('en-IN')}</strong></span>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span>Life: <strong className="text-slate-900 dark:text-white font-black">₹{(stats.revenueLifetime || liveBillingStats.totalRevenue || 0).toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>
              </div>

              {/* CARD 4: AI RESOURCE SPENT */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI RESOURCE SPENT</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {(stats.totalCreditsUsed || 0).toLocaleString()}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 truncate">
                    Total Credits Consumed
                  </p>
                </div>
              </div>
            </div>

            {/* ROW 3: 7-DAY ACTIVITY GRAPH */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">DAILY ACTIVITY</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Last 7 Days aggregated logins & AI queries</p>
                </div>
                <span className="text-xs font-bold text-[#C8A34D] bg-[#C8A34D]/10 px-3 py-1 rounded-full border border-[#C8A34D]/20">
                  7-Day Trend
                </span>
              </div>

              {/* Interactive Bar Chart */}
              <div className="pt-4 flex items-end justify-between gap-2 sm:gap-6 h-48 px-2 sm:px-6 bg-slate-50/60 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                {(Array.isArray(stats.dailyActivity) && stats.dailyActivity.length > 0
                  ? stats.dailyActivity
                  : [
                      { label: 'MON', val: 24 },
                      { label: 'TUE', val: 45 },
                      { label: 'WED', val: 68 },
                      { label: 'THU', val: 52 },
                      { label: 'FRI', val: 89 },
                      { label: 'SAT', val: 61 },
                      { label: 'SUN', val: 75 }
                    ]
                ).map((day, idx) => {
                  const maxVal = Math.max(1, ...(stats.dailyActivity || []).map(d => d.val || 0));
                  const heightPercent = Math.max(12, Math.min(100, ((day.val || 0) / maxVal) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      <span className="text-[10px] font-black text-slate-500 group-hover:text-[#C8A34D] transition-colors opacity-0 group-hover:opacity-100">
                        {day.val}
                      </span>
                      <div className="w-full max-w-[40px] bg-slate-200 dark:bg-zinc-800 rounded-t-xl overflow-hidden h-32 flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-[#C8A34D] group-hover:bg-[#b08d3b] transition-all rounded-t-xl"
                        />
                      </div>
                      <span className="text-[11px] font-black text-slate-600 dark:text-zinc-400 group-hover:text-[#C8A34D]">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROW 4: AI LEGAL FEATURE USAGE ANALYTICS GRID */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">AI LEGAL™ FEATURE USAGE</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">CASES MANAGED</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.totalCases || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Total litigation folders</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">CONTRACTS ANALYZED</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.contractsAnalyzed || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Total contracts audited</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/20">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">STRATEGY ENGINE REPORTS</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.strategyReports || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Strategy reports generated</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">CASE PREDICTOR MODELS</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.casePredictorReports || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Outcome predictions run</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">DRAFTS GENERATED</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.draftsGenerated || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Petitions & notices drafted</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">EVIDENCE ANALYST AUDITS</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.evidenceAnalyses || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Evidence documents scanned</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">AI ASSISTANT CHATS</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{(stats.chatUsage || 0).toLocaleString()}</h4>
                  <p className="text-[11px] font-medium text-slate-500">Conversations created</p>
                </div>

                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <div className="p-2.5 w-fit rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">STORAGE CONSUMED</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">{stats.storageUsed || '512 MB'}</h4>
                  <p className="text-[11px] font-medium text-slate-500">RAG & database storage</p>
                </div>
              </div>
            </div>

            {/* ROW 5: PENDING TRIAGE ALERTS */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">PENDING TRIAGE</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('bugs')}
                  className="bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-zinc-800/60 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                      OPEN BUG REPORTS
                    </span>
                    <Bug className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white">{bugsList.length}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">Critical issues requiring review</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-red-500 group-hover:translate-x-1 transition-transform">
                    <span>View Bugs</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('features')}
                  className="bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-zinc-800/60 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                      PENDING FEATURE REQUESTS
                    </span>
                    <Lightbulb className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white">{featuresList.length}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">User submitted ideas awaiting review</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-500 group-hover:translate-x-1 transition-transform">
                    <span>View Requests</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('crashes')}
                  className="bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-zinc-800/60 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      UNRESOLVED CRASH TELEMETRY
                    </span>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white">{crashStats.unresolved || crashesList.length}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">System exception telemetry</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-500 group-hover:translate-x-1 transition-transform">
                    <span>View Crash Reports</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          /* TAB 2: USERS DIRECTORY — EXACT MOBILE APP PARITY */
          <div className="space-y-6">
            {/* Search & Filter Toolbar */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-[#C8A34D] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search users by name, email, phone, jurisdiction, ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#C8A34D] bg-slate-50 dark:bg-zinc-900"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto custom-scrollbar">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'free', label: 'FREE' },
                  { id: 'premium', label: 'PREMIUM' },
                  { id: 'suspended', label: 'SUSPENDED' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setUserFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                      userFilter === f.id
                        ? 'bg-[#C8A34D]/10 text-[#C8A34D] border-[#C8A34D]/40 shadow-2xs'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Directory Table & Header */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">User Accounts Directory</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Manage user profiles, roles, AI credits, subscriptions and access controls</p>
                </div>
                <span className="text-xs font-bold text-[#C8A34D] bg-[#C8A34D]/10 px-3 py-1 rounded-full border border-[#C8A34D]/20">
                  {filteredUsers.length} Users Found
                </span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No User Accounts Match Criteria</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search query or status filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-zinc-900/60 border-b border-slate-200/80 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-3.5">USER</th>
                        <th className="px-6 py-3.5">ROLE</th>
                        <th className="px-6 py-3.5">SUBSCRIPTION PLAN</th>
                        <th className="px-6 py-3.5">STATUS</th>
                        <th className="px-6 py-3.5 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                      {filteredUsers.map(u => {
                        const isBlocked = u.isBlocked === true || u.status === 'Suspended';
                        const userRole = u.role || u.userRole || 'Advocate';
                        const userPlan = u.subscription?.plan || u.currentPlan || 'FREE';

                        return (
                          <tr key={u._id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] font-black text-xs flex items-center justify-center border border-[#C8A34D]/30 shrink-0">
                                  {(u.name || u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <button
                                    onClick={() => setSelectedDossierUser(u)}
                                    className="text-xs font-black text-slate-900 dark:text-zinc-100 hover:text-[#C8A34D] transition-colors text-left cursor-pointer"
                                  >
                                    {u.name || u.displayName || 'Advocate Client'}
                                  </button>
                                  <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                                  {u.phone && <p className="text-[10px] text-slate-400">{u.phone}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 uppercase tracking-wider">
                                {userRole}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-black text-[#C8A34D] bg-[#C8A34D]/10 px-2.5 py-1 rounded-lg border border-[#C8A34D]/20">
                                {userPlan}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                isBlocked ? 'text-red-500' : 'text-emerald-500'
                              }`}>
                                {isBlocked ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                <span>{isBlocked ? 'Suspended' : 'Active'}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedDossierUser(u)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Profile</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'billing' ? (
          /* TAB 3: BILLING (MOBILE 1:1 PARITY) */
          <div className="space-y-6">
            {/* 1. DYNAMIC LIVE KPI METRICS BAR (4 Compact Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Revenue</p>
                <p className="text-xl font-black text-[#10B981] my-1">
                  ₹{liveBillingStats.totalRevenue.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] font-bold text-slate-400">Gross Collected</p>
              </div>

              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Paid Invoices</p>
                <p className="text-xl font-black text-[#C8A34D] my-1">
                  {liveBillingStats.successCount}
                </p>
                <p className="text-[10px] font-bold text-slate-400">Successful Transactions</p>
              </div>

              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pending</p>
                <p className="text-xl font-black text-amber-500 my-1">
                  {liveBillingStats.pendingCount}
                </p>
                <p className="text-[10px] font-bold text-slate-400">Awaiting Payment</p>
              </div>

              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Refunded</p>
                <p className="text-xl font-black text-red-500 my-1">
                  {liveBillingStats.refundedCount}
                </p>
                <p className="text-[10px] font-bold text-slate-400">Reversed Payments</p>
              </div>
            </div>

            {/* 2. REAL-TIME SOCKET INDICATOR + CSV EXPORT BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs font-black text-slate-700 dark:text-zinc-200">
                  Live Socket Stream • <span className="text-[#C8A34D]">{filteredPayments.length}</span> of {liveBillingStats.totalCount} Invoices Loaded
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#C8A34D]/15 hover:bg-[#C8A34D]/25 text-[#C8A34D] border border-[#C8A34D]/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>CSV Export</span>
              </button>
            </div>

            {/* 3. SEARCH & STATUS FILTER PILLS */}
            <div className="space-y-3">
              {/* Search Field */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={billingSearch}
                  onChange={(e) => setBillingSearch(e.target.value)}
                  placeholder="Search invoice number, user name, email, or TXN ID..."
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#C8A34D] transition-all shadow-xs"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'success', label: 'SUCCESS' },
                  { id: 'pending', label: 'PENDING' },
                  { id: 'refunded', label: 'REFUNDED' },
                  { id: 'failed', label: 'FAILED' },
                ].map((tab) => {
                  const isActive = billingFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setBillingFilter(tab.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#C8A34D]/15 border-[#C8A34D] text-[#C8A34D] shadow-2xs'
                          : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-[#C8A34D]/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. TRANSACTIONS & INVOICES LEDGER CONTAINER */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Transactions & Invoices</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Real-time financial payment ledger</p>
                </div>
                <span className="text-xs font-black text-[#C8A34D] bg-[#C8A34D]/10 px-3 py-1 rounded-full border border-[#C8A34D]/20">
                  {filteredPayments.length} Records
                </span>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <CreditCard className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No Payment Transactions Found</p>
                  <p className="text-[11px] text-slate-400">No transactions match your search query or filter criteria.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((p, idx) => {
                    const st = String(p.status || 'success').toLowerCase();
                    const isSuccess = st === 'success' || st === 'paid';
                    const isRefunded = st === 'refunded' || st === 'reversed';
                    const isPending = st === 'pending';
                    const isFailed = st === 'failed' || st === 'rejected';

                    const amountColor = isSuccess ? 'text-emerald-500' : isRefunded ? 'text-amber-500' : isPending ? 'text-blue-500' : 'text-red-500';
                    const statusText = (p.status || 'SUCCESS').toUpperCase();
                    const amt = Number(p.amount || 0);
                    const gstAmount = p.gst ? Number(p.gst).toFixed(2) : (amt * 0.18).toFixed(2);
                    const userName = p.userName || p.userId?.name || 'Advocate Customer';
                    const userEmail = p.userEmail || p.userId?.email || 'N/A';
                    const invoiceNo = p.invoiceNumber || p._id || `INV-${idx}`;
                    const txnId = p.transactionId || p._id || 'N/A';
                    const planName = typeof p.planId === 'object' ? (p.planId?.planName || p.planId?._id) : (p.planId || 'advocate_basic');

                    return (
                      <div
                        key={p._id || idx}
                        className="bg-slate-50/70 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3 hover:border-[#C8A34D]/40 transition-all"
                      >
                        {/* Header: User & Amount */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white">{userName}</h4>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {userEmail} • Invoice: <span className="font-bold text-slate-700 dark:text-zinc-300">{invoiceNo}</span>
                            </p>
                          </div>
                          <span className={`text-base font-black ${amountColor}`}>
                            ₹{amt.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Metadata Tags: Gateway, Plan, GST */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-zinc-800 text-[10px] font-extrabold uppercase text-slate-600 dark:text-zinc-300">
                            Gateway: {p.gateway || 'Razorpay'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[10px] font-black uppercase">
                            Plan: {planName}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-zinc-800 text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                            GST (18%): ₹{gstAmount}
                          </span>
                        </div>

                        {/* Divider Line */}
                        <div className="border-t border-slate-200/60 dark:border-zinc-800/60 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-[10px] font-mono text-slate-400">
                            TXN: {txnId} • Date: {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today'}
                          </p>

                          {/* Footer Actions & Status */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isPending && (
                              <button
                                onClick={() => setMarkPaidConfirmModal({ isOpen: true, payment: p })}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-[10px] transition-all cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            )}

                            {isSuccess && (
                              <button
                                onClick={() => setRefundConfirmModal({ isOpen: true, payment: p })}
                                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                              >
                                Refund
                              </button>
                            )}

                            <span
                              className={`px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${
                                isSuccess
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                  : isPending
                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                  : isRefunded
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                  : 'bg-red-500/10 text-red-500 border-red-500/30'
                              }`}
                            >
                              {statusText}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'plans' ? (
          /* TAB 4: PLANS DASHBOARD (MOBILE 1:1 PARITY) */
          <div className="space-y-6">
            {/* Header & Primary CTA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Subscription Plans & Pricing</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
                  Manage Student, Advocate, Law Firm & Combo plans, edit prices (₹), credits, and feature lists.
                </p>
              </div>
              <button
                onClick={handleOpenPlanCreator}
                className="px-5 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Plan</span>
              </button>
            </div>

            {/* Plans List Grid (3 Columns on Desktop, 2 on Tablet, 1 on Mobile) */}
            {plansList.length === 0 ? (
              <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-12 text-center space-y-3">
                <Tag className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No Subscription Plans Configured</p>
                <p className="text-[11px] text-slate-400">Click "+ Create Plan" to set up your first subscription tier.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plansList.map((plan, idx) => {
                  const isPopular = plan.isPopular;
                  const isActive = plan.isActive !== false;
                  const planTitle = plan.planName || plan.name || 'Advocate Plan';
                  const badgeText = plan.badge || 'PRO';
                  const planSlug = plan.planId || plan._id || `plan_${idx}`;
                  const featuresArr = Array.isArray(plan.features) ? plan.features : (plan.features ? String(plan.features).split(',') : []);

                  return (
                    <div
                      key={plan._id || planSlug}
                      className={`bg-white dark:bg-[#1E293B] rounded-3xl p-6 border shadow-sm space-y-4 relative flex flex-col justify-between transition-all hover:shadow-md ${
                        isPopular
                          ? 'border-[#C8A34D] border-2 ring-1 ring-[#C8A34D]/30'
                          : 'border-slate-200/80 dark:border-zinc-800'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Top Header Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-slate-900 dark:text-white">{planTitle}</h3>
                              {badgeText && (
                                <span className="bg-[#C8A34D] text-[#111111] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  {badgeText}
                                </span>
                              )}
                              {isPopular && (
                                <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  POPULAR
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: {planSlug} • {isActive ? '🟢 Active' : '🔴 Disabled'}
                            </p>
                          </div>

                          {/* Action Buttons: Edit & Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenPlanEdit(plan)}
                              className="px-2.5 py-1.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-lg text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setPlanDeleteConfirmModal({ isOpen: true, plan })}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Pricing & AI Credits Grid Bar */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 text-left">
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400">MONTHLY</p>
                            <p className="text-sm font-black text-emerald-500 mt-0.5">₹{Number(plan.priceMonthly || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400">YEARLY</p>
                            <p className="text-sm font-black text-blue-500 mt-0.5">₹{Number(plan.priceYearly || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400">AI CREDITS</p>
                            <p className="text-sm font-black text-[#C8A34D] mt-0.5">{Number(plan.credits || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        {/* Features Checklist */}
                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">FEATURES INCLUDED:</p>
                          {featuresArr.length > 0 ? (
                            <div className="space-y-1.5">
                              {featuresArr.map((feat, fIdx) => {
                                const cleanFeat = String(feat).replace(/^✓\s*/, '').trim();
                                if (!cleanFeat) return null;
                                return (
                                  <div key={fIdx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="line-clamp-1">{cleanFeat}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs font-medium italic text-slate-400">No specific features listed.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'coupons' ? (
          /* TAB 5: COUPONS & DISCOUNT ENGINE (MOBILE 1:1 PARITY) */
          <div className="space-y-6">
            {/* GLOBAL COUPON FEATURE TOGGLE BANNER */}
            <div className={`bg-white dark:bg-[#1E293B] p-5 rounded-3xl border border-l-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
              couponFeatureEnabled
                ? 'border-slate-200/80 dark:border-zinc-800 border-l-emerald-500'
                : 'border-slate-200/80 dark:border-zinc-800 border-l-red-500'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Ticket className={`w-5 h-5 ${couponFeatureEnabled ? 'text-emerald-500' : 'text-red-500'}`} />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Coupon Feature Status:</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    couponFeatureEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-500 border border-red-500/30'
                  }`}>
                    {couponFeatureEnabled ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {couponFeatureEnabled
                    ? 'Active: "Have a coupon code?" card is currently displayed on the payment screen.'
                    : 'Inactive: "Have a coupon code?" card is completely hidden on the payment screen (only Upgrade button is visible).'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleCouponFeature}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  couponFeatureEnabled
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300'
                }`}
              >
                {couponFeatureEnabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{couponFeatureEnabled ? 'ACTIVE' : 'INACTIVE'}</span>
              </button>
            </div>

            {/* Page Header & Create Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Coupons & Discount System</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
                  Manage promotional codes, plan eligibility, usage limits, and redemption statistics.
                </p>
              </div>
              <button
                onClick={handleOpenCouponCreator}
                className="px-5 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Coupon</span>
              </button>
            </div>

            {/* Top 5 KPI Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TOTAL COUPONS</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{couponStats.totalCoupons || couponsList.length || 0}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ACTIVE COUPONS</p>
                <p className="text-xl font-black text-emerald-500">{couponStats.activeCoupons || 0}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">EXPIRED COUPONS</p>
                <p className="text-xl font-black text-amber-500">{couponStats.expiredCoupons || 0}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TOTAL COUPON USES</p>
                <p className="text-xl font-black text-blue-500">{couponStats.totalCouponUses || couponStats.totalUses || 0}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TOTAL DISCOUNT GIVEN</p>
                <p className="text-xl font-black text-[#C8A34D]">₹{(couponStats.totalDiscountGiven || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Coupons Responsive Card Grid (3 Columns Desktop, 2 Tablet, 1 Mobile) */}
            {couponsList.length === 0 ? (
              <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-12 text-center space-y-3">
                <Ticket className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No Coupons Created Yet</p>
                <button
                  onClick={handleOpenCouponCreator}
                  className="px-4 py-2 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs cursor-pointer transition-all inline-block mt-2"
                >
                  Create First Coupon
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {couponsList.map((c) => {
                  const status = c.computedStatus || (c.status === 'inactive' ? 'INACTIVE' : 'ACTIVE');
                  const statusBadgeClass =
                    status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : status === 'SCHEDULED'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : status === 'EXPIRED'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : status === 'EXHAUSTED'
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 border-slate-300 dark:border-zinc-700';

                  const discountLabel = c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`;
                  const applicableText = Array.isArray(c.applicablePlans) && c.applicablePlans.includes('ALL') ? 'All Plans' : (Array.isArray(c.applicablePlans) ? c.applicablePlans.join(', ') : 'All Plans');

                  return (
                    <div
                      key={c._id}
                      className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all"
                    >
                      <div className="space-y-4">
                        {/* Header Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="bg-[#C8A34D]/15 border border-[#C8A34D] px-3 py-1 rounded-xl">
                                <span className="text-sm font-black text-[#C8A34D] font-mono tracking-wider">{c.code}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyCouponCode(c.code)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                                  copiedCouponCode === c.code
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-[#C8A34D]/10 text-[#C8A34D] border-[#C8A34D]/30 hover:bg-[#C8A34D]/20'
                                }`}
                              >
                                <span>{copiedCouponCode === c.code ? 'Copied ✓' : 'Copy'}</span>
                              </button>
                              <span className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-[10px] font-black px-2.5 py-1 rounded-lg">
                                {discountLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                              Applicable: <strong className="text-slate-800 dark:text-zinc-200">{applicableText}</strong>
                            </p>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase border shrink-0 ${statusBadgeClass}`}>
                            {status}
                          </span>
                        </div>

                        {/* Details Sub-Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 text-left text-xs">
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400">VALIDITY</p>
                            <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 mt-0.5 truncate">
                              {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Now'} – {new Date(c.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400">USAGE</p>
                            <p className="text-xs font-black text-[#C8A34D] mt-0.5">
                              {c.usedCount || 0} / {c.usageLimit !== null && c.usageLimit !== undefined ? c.usageLimit : '∞'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400">PER USER</p>
                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{c.perUserLimit || 1} use</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleViewCouponDetails(c._id)}
                          className="px-2.5 py-1.5 bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Stats</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCouponEdit(c)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#C8A34D]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCouponStatus(c._id)}
                          className={`px-2.5 py-1.5 font-extrabold rounded-xl text-xs transition-all cursor-pointer border flex items-center gap-1 ${
                            c.status === 'active'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          <span>{c.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCouponDeleteConfirmModal({ isOpen: true, coupon: c })}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                        >
                  <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'addons' ? (
          /* TAB: INSTITUTIONAL ADD-ON REQUESTS APPROVAL PANEL */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="text-[#C8A34D]" size={22} /> Institutional Add-on Feature Requests
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
                  Review and allow add-on feature requests submitted by Law Universities for their students & faculty.
                </p>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/30 text-xs font-black text-[#C8A34D]">
                {addonRequestsList.filter(r => r.status === 'Pending').length} Pending Approvals
              </div>
            </div>

            {addonRequestsList.length === 0 ? (
              <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-12 text-center space-y-2">
                <PlusCircle className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No Add-on Requests Submitted Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addonRequestsList.map((req) => (
                  <div
                    key={req._id}
                    className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#C8A34D] px-2.5 py-0.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/20">
                          🏛️ {req.institutionName || 'RDVV Law University'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          req.status === 'Approved'
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : req.status === 'Rejected'
                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-500 border-amber-500/30 animate-pulse'
                        }`}>
                          ● {req.status || 'Pending'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{req.category}</span>
                        <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{req.addonName}</h3>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-xs space-y-1">
                        <p className="text-slate-500 font-medium">
                          Requested By: <strong className="text-slate-800 dark:text-zinc-200">{req.requestedBy || req.institutionEmail}</strong>
                        </p>
                        <p className="text-slate-600 dark:text-zinc-300 font-semibold italic">
                          "{req.notes || 'No custom notes provided.'}"
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2 text-xs">
                      {req.status === 'Approved' ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-500/15 text-emerald-500 font-black text-center border border-emerald-500/30 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={16} /> Approved & Live Unlocked for Students
                        </div>
                      ) : req.status === 'Rejected' ? (
                        <div className="w-full py-2 rounded-xl bg-rose-500/15 text-rose-500 font-black text-center border border-rose-500/30">
                          ❌ Request Rejected
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRejectAddonRequest(req)}
                            className="px-3.5 py-2 rounded-xl border border-rose-500/30 text-rose-500 font-bold hover:bg-rose-500/10 cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveAddonRequest(req)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-md hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={15} /> Allow & Approve Feature
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'features' ? (
          /* TAB 6: REQUESTS / FEATURE REQUESTS TRIAGE (MOBILE 1:1 PARITY) */
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Feature Requests Triage</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
                Review, filter, manage status, assign developers, and reply to client requests.
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="relative bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs p-2 flex items-center">
              <Search className="w-4 h-4 text-slate-400 ml-3 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search feature requests..."
                value={featureSearch}
                onChange={e => setFeatureSearch(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              {featureSearch && (
                <button
                  type="button"
                  onClick={() => setFeatureSearch('')}
                  className="p-1 mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Horizontal Status Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {['all', 'Pending', 'Under Review', 'Planned', 'In Progress', 'Completed', 'Rejected'].map((f) => {
                const isSelected = featureFilterState === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeatureFilterState(f)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#C8A34D]/20 text-[#C8A34D] border-[#C8A34D] shadow-2xs'
                        : 'bg-white dark:bg-[#1E293B] text-slate-500 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {/* Feature Requests Card List */}
            {filteredFeatures.length === 0 ? (
              <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-12 text-center space-y-2">
                <Lightbulb className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No Feature Requests Found</p>
                <p className="text-[11px] text-slate-400 font-medium">Try clearing filters or search keywords.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeatures.map((fr) => {
                  const priorityClass = fr.priority === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                  const statusClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
                  const devReply = fr.reply || fr.adminNote;

                  return (
                    <div
                      key={fr._id}
                      className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4 hover:shadow-md transition-all"
                    >
                      {/* Header Row: Category, Priority Badge, Status Badge */}
                      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-[#C8A34D] bg-[#C8A34D]/10 border border-[#C8A34D]/30 px-3 py-1 rounded-xl">
                            {fr.category || 'General Feature'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${priorityClass}`}>
                            {fr.priority || 'Medium'} Priority
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${statusClass}`}>
                          {fr.status || 'Pending'}
                        </span>
                      </div>

                      {/* Request Title & Description */}
                      <div className="space-y-1.5">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {fr.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium leading-relaxed">
                          {fr.description}
                        </p>
                      </div>

                      {/* User & Developer Metadata Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 text-xs">
                        <p className="text-slate-500 dark:text-zinc-400 font-medium">
                          User: <strong className="text-slate-800 dark:text-zinc-200">{fr.email || fr.userEmail || 'Client Advocate'}</strong> ({fr.userPlan || 'ADVOCATE_PRO'})
                        </p>
                        <p className="text-slate-500 dark:text-zinc-400 font-medium">
                          Assigned Dev: <strong className="text-[#C8A34D] font-bold">{fr.developerAssigned || 'None'}</strong>
                        </p>
                      </div>

                      {/* Developer / Admin Reply Container */}
                      {devReply && (
                        <div className="p-3.5 bg-[#C8A34D]/10 border border-[#C8A34D]/30 rounded-2xl space-y-1">
                          <p className="text-[11px] font-black text-[#C8A34D] uppercase tracking-wider">Dev Reply:</p>
                          <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{devReply}</p>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setFeatureModal({
                            isOpen: true,
                            feature: fr,
                            status: fr.status || 'Pending',
                            developerAssigned: fr.developerAssigned || 'None',
                            adminNote: fr.reply || fr.adminNote || ''
                          })}
                          className="px-4 py-2 bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Manage Request</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeatureDeleteModal({ isOpen: true, feature: fr })}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'bugs' ? (
          /* TAB 7: BUGS */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Bug Tracking & Resolution Console</h3>
              <div className="space-y-3">
                {bugsList.map((b, idx) => (
                  <div key={b._id || idx} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">{b.severity || 'Major'}</span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{b.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{b.description}</p>
                    </div>
                    <button
                      onClick={() => setBugModal({ isOpen: true, bug: b, status: b.status || 'Open', assignedTo: b.assignedTo || '' })}
                      className="px-4 py-2 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Update Bug
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'crashes' ? (
          /* TAB 8: CRASH REPORTS */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Automated Exception & Telemetry Logs</h3>
              <div className="space-y-3">
                {crashesList.map((c, idx) => (
                  <div key={c._id || idx} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold font-mono text-red-500">{c.errorName || 'UnhandledException'}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{c.filePath || 'src/app/index.tsx'}:{c.lineNumber || 42}</p>
                      </div>
                      <button
                        onClick={() => handleResolveCrash(c._id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    </div>
                    <pre className="p-3 bg-black/80 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto">
                      {c.stackTrace || 'Error: Processing failed at line 42'}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'reports' ? (
          /* TAB 9: RESPONSE REPORTS */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">AI Output Flagging & Quality Audit</h3>
              <div className="space-y-3">
                {complaintsList.map((r, idx) => (
                  <div key={r._id || idx} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">
                        {r.flagReason || 'Inaccurate Citation'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{r.feedback || 'User flagged response citations.'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'jurisdiction' ? (
          /* TAB 10: JURISDICTION OVERRIDES & SANDBOX */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#C8A34D]" />
                  <span>Global Jurisdiction Administration & Sandbox</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">Test legal engine prompts under specific Indian State or Global Country statutory frameworks.</p>
              </div>

              <form onSubmit={handleRunJurisdictionTest} className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Country</label>
                    <input
                      type="text"
                      value={jTargetCountry}
                      onChange={e => setJTargetCountry(e.target.value)}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target State / Jurisdiction</label>
                    <input
                      type="text"
                      value={jTargetState}
                      onChange={e => setJTargetState(e.target.value)}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Test Legal Query</label>
                  <div className="flex gap-3 mt-1">
                    <input
                      type="text"
                      value={jTestQuery}
                      onChange={e => setJTestQuery(e.target.value)}
                      placeholder="e.g. What is the limitation period for filing a commercial suit under State amendments?"
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={jTestLoading || !jTestQuery.trim()}
                      className="px-6 py-2.5 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-2"
                    >
                      {jTestLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                      <span>Run Test</span>
                    </button>
                  </div>
                </div>

                {jTestResult && (
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#C8A34D]">AI Jurisdiction Response</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1 whitespace-pre-wrap">{jTestResult}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* TAB 11: SETTINGS & SECURITY */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Global System Configuration</h3>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Emergency Maintenance Mode</p>
                    <p className="text-xs text-slate-400">Lock non-admin platform logins across Web & Mobile</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      adminSettings.maintenanceMode ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {adminSettings.maintenanceMode ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Default Signup Credits</label>
                    <input
                      type="number"
                      value={adminSettings.defaultCredits}
                      onChange={e => setAdminSettings(prev => ({ ...prev, defaultCredits: parseInt(e.target.value) || 50 }))}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">File Upload Limit (MB)</label>
                    <input
                      type="number"
                      value={adminSettings.fileUploadLimitMb}
                      onChange={e => setAdminSettings(prev => ({ ...prev, fileUploadLimitMb: parseInt(e.target.value) || 25 }))}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save Global System Settings
                </button>
              </form>

              {/* Admin Password Change */}
              <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Admin Password Change</h4>
                <form onSubmit={handleChangeAdminPassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={adminPasswordConfirm}
                    onChange={e => setAdminPasswordConfirm(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl text-xs cursor-pointer"
                  >
                    Update Admin Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Role Modal */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Edit User Role — {editUserModal.name}</h3>
            <div className="space-y-2">
              {['advocate', 'law_firm', 'student', 'admin', 'SUPER_ADMIN'].map(role => (
                <button
                  key={role}
                  onClick={() => handleUserRoleSave(editUserModal._id, role)}
                  className="w-full py-2.5 px-4 bg-slate-50 dark:bg-zinc-900 hover:bg-[#C8A34D]/10 hover:text-[#C8A34D] border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold capitalize text-left transition-all cursor-pointer"
                >
                  Set as {role}
                </button>
              ))}
            </div>
            <button onClick={() => setEditUserModal(null)} className="w-full py-2 bg-slate-200 text-xs font-bold rounded-xl cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Credit Adjustment Modal */}
      {creditModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleAdjustCreditsSubmit} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Adjust AI Credits — {creditModalUser.name}</h3>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Action</label>
              <select
                value={creditAdjustment.actionType}
                onChange={e => setCreditAdjustment(prev => ({ ...prev, actionType: e.target.value }))}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="add">Add Credits</option>
                <option value="deduct">Deduct Credits</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Amount</label>
              <input
                type="number"
                value={creditAdjustment.amount}
                onChange={e => setCreditAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2.5 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs cursor-pointer">Save</button>
              <button type="button" onClick={() => setCreditModalUser(null)} className="py-2.5 px-4 bg-slate-200 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Plan CRUD Modal */}


      {/* USER DOSSIER DETAIL MODAL — 100% MOBILE APP PARITY */}
      {selectedDossierUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] font-black text-lg flex items-center justify-center border border-[#C8A34D]/40 shrink-0">
                  {(selectedDossierUser.name || selectedDossierUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {selectedDossierUser.name || 'Advocate Client Dossier'}
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/20 uppercase">
                      {selectedDossierUser.role || 'Advocate'}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      selectedDossierUser.isBlocked || selectedDossierUser.status === 'Suspended'
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {selectedDossierUser.isBlocked || selectedDossierUser.status === 'Suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{selectedDossierUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDossierUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* CARD 1: USER PROFILE DETAILS */}
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                  User Profile Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs">
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Full Name: <span className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.name || 'N/A'}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Email: <span className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.email}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Phone Number: <span className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.phone || 'N/A'}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Legal Jurisdiction: <span className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.jurisdiction || selectedDossierUser.country || 'India'}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Plan: <span className="font-black text-[#C8A34D]">{selectedDossierUser.subscription?.plan || selectedDossierUser.currentPlan || 'Free'}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Account Status: <span className={`font-black ${selectedDossierUser.isBlocked || selectedDossierUser.status === 'Suspended' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {selectedDossierUser.isBlocked || selectedDossierUser.status === 'Suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Credits: <span className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.credits ?? 500}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Cases Created: <span className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.totalCases || 0}</span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Account Created Date: <span className="font-extrabold text-slate-900 dark:text-white">
                      {selectedDossierUser.createdAt ? new Date(selectedDossierUser.createdAt).toLocaleDateString('en-GB') : '18/8/2026'}
                    </span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium">
                    Last Login: <span className="font-extrabold text-slate-900 dark:text-white">
                      {selectedDossierUser.lastLogin ? new Date(selectedDossierUser.lastLogin).toLocaleString('en-GB') : '18/8/2026, 4:50:44 pm'}
                    </span>
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 font-medium col-span-1 sm:col-span-2 font-mono">
                    User ID: <span className="font-bold text-slate-700 dark:text-zinc-300">{selectedDossierUser._id}</span>
                  </p>
                </div>

                {/* Real Usage Stats Subsection */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <p className="text-[11px] font-black text-[#C8A34D]">📊 ACTIVE USAGE STATS</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Cases Folders</p>
                      <p className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.totalCases || 0} / Unlimited</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">AI Credits</p>
                      <p className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.credits ?? 500}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Contracts Audited</p>
                      <p className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.usageStatus?.contractsAnalyzed || 0}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Drafts Generated</p>
                      <p className="font-extrabold text-slate-900 dark:text-white">{selectedDossierUser.usageStatus?.draftsGenerated || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: 💳 SUBSCRIPTION MANAGEMENT — EXACT MOBILE APP DESIGN */}
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-4">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>💳 Subscription Management</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                    Assign or update subscription plan directly. Active plan is the single source of truth for features, limits, and storage.
                  </p>
                </div>

                {/* Select Subscription Plan Horizontal Pill Scroll */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white">Select Subscription Plan</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {[
                      { id: 'advocate_basic', name: 'Advocate Basic Plan', badge: 'BASIC' },
                      { id: 'advocate_pro', name: 'Advocate Pro Plan', badge: 'PRO' },
                      { id: 'advocate_premium', name: 'Advocate Premium Plan', badge: 'PREMIUM' },
                      { id: 'student_basic', name: 'Student Basic Plan', badge: 'BASIC' },
                      { id: 'student_pro', name: 'Student Pro Plan', badge: 'PRO' },
                      { id: 'student_premium', name: 'Student Premium Plan', badge: 'PREMIUM' },
                      { id: 'firm_basic', name: 'Law Firm Basic', badge: 'BASIC' },
                      { id: 'firm_pro', name: 'Law Firm Pro', badge: 'PRO' },
                      { id: 'firm_premium', name: 'Law Firm Enterprise', badge: 'PREMIUM' },
                      { id: 'combo_student_advocate', name: 'Student + Advocate Combo', badge: 'COMBO' },
                      { id: 'combo_advocate_firm', name: 'Advocate + Law Firm Combo', badge: 'COMBO' },
                      { id: 'combo_all_access', name: 'All Access Ecosystem Pass', badge: 'ALL ACCESS' },
                    ].map((plan) => {
                      const isSelected = subForm.planId === plan.id || subForm.planId === plan.name;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSubForm(prev => ({ ...prev, planId: plan.id }))}
                          className={`px-3.5 py-2.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#C8A34D]/20 border-[#C8A34D] text-[#C8A34D] shadow-2xs'
                              : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-[#C8A34D]/50'
                          }`}
                        >
                          <p className="text-xs font-black">{plan.name}</p>
                          <p className="text-[9px] font-extrabold uppercase text-slate-400 mt-0.5">{plan.badge}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Plan Duration Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-900 dark:text-white">Plan Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSubForm(prev => ({ ...prev, billingCycle: 'monthly' }))}
                      className={`py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                        subForm.billingCycle === 'monthly'
                          ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D] shadow-sm'
                          : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubForm(prev => ({ ...prev, billingCycle: 'yearly' }))}
                      className={`py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                        subForm.billingCycle === 'yearly'
                          ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D] shadow-sm'
                          : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Assign Plan (Gold) & Expire Plan (Red) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSubscriptionSave}
                    className="py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
                  >
                    Assign Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExpireUserSubscription(selectedDossierUser._id)}
                    className="py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
                  >
                    Expire Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-end">
              <button
                onClick={() => setSelectedDossierUser(null)}
                className="px-6 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION ASSIGNMENT / CHANGE MODAL */}
      {subModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleSubscriptionSave} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Subscription Management — {subModalUser.name || subModalUser.email}</h3>
            
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Select Subscription Plan</label>
              <select
                value={subForm.planId}
                onChange={e => setSubForm(prev => ({ ...prev, planId: e.target.value }))}
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200"
              >
                <option value="FREE">AI Legal™ Free Plan</option>
                <option value="ADVOCATE_BASIC">AI Legal™ Advocate Basic</option>
                <option value="ADVOCATE_PRO">AI Legal™ Advocate Pro (Popular)</option>
                <option value="ADVOCATE_PREMIUM">AI Legal™ Advocate Premium</option>
                <option value="STUDENT_BASIC">AI Legal™ Student Basic</option>
                <option value="STUDENT_PRO">AI Legal™ Student Pro</option>
                <option value="FIRM_BASIC">AI Legal™ Law Firm Basic</option>
                <option value="FIRM_PRO">AI Legal™ Law Firm Pro</option>
                <option value="FIRM_PREMIUM">AI Legal™ Law Firm Enterprise</option>
                <option value="COMBO_ALL_ACCESS">AI Legal™ All Access Ecosystem Pass</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Billing Cycle</label>
              <div className="flex gap-2 mt-1">
                {['monthly', 'yearly'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubForm(prev => ({ ...prev, billingCycle: c }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer border ${
                      subForm.billingCycle === c
                        ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D]'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs cursor-pointer">
                Assign Plan
              </button>
              <button
                type="button"
                onClick={() => handleExpireUserSubscription(subModalUser._id)}
                className="py-2.5 px-3 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold rounded-xl cursor-pointer"
              >
                Expire Plan
              </button>
              <button type="button" onClick={() => setSubModalUser(null)} className="py-2.5 px-4 bg-slate-200 dark:bg-zinc-800 text-xs font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleResetUserPassword} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Reset User Password</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Set a new password for {passwordResetUser.name || passwordResetUser.email}</p>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={passwordResetVal}
                onChange={e => setPasswordResetVal(e.target.value)}
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2.5 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs cursor-pointer">
                Save New Password
              </button>
              <button type="button" onClick={() => { setPasswordResetUser(null); setPasswordResetVal(''); }} className="py-2.5 px-4 bg-slate-200 dark:bg-zinc-800 text-xs font-bold rounded-xl cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {/* REFUND CONFIRMATION MODAL */}
      {refundConfirmModal.isOpen && refundConfirmModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Refund Payment Transaction?</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Are you sure you want to refund this payment? The customer will receive a full reversal, and their subscription status will be updated accordingly.
            </p>

            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
              <p><span className="text-slate-400 font-bold">User:</span> <strong className="text-slate-800 dark:text-zinc-200">{refundConfirmModal.payment.userName || refundConfirmModal.payment.userId?.name || 'Advocate Customer'}</strong></p>
              <p><span className="text-slate-400 font-bold">Email:</span> <span className="text-slate-700 dark:text-zinc-300">{refundConfirmModal.payment.userEmail || refundConfirmModal.payment.userId?.email || 'N/A'}</span></p>
              <p><span className="text-slate-400 font-bold">Invoice ID:</span> <span className="font-mono text-slate-700 dark:text-zinc-300">{refundConfirmModal.payment.invoiceNumber || refundConfirmModal.payment._id}</span></p>
              <p><span className="text-slate-400 font-bold">Amount:</span> <strong className="text-red-500 font-black">₹{Number(refundConfirmModal.payment.amount || 0).toLocaleString('en-IN')}</strong></p>
              <p><span className="text-slate-400 font-bold">Gateway:</span> <span className="uppercase text-slate-700 dark:text-zinc-300">{refundConfirmModal.payment.gateway || 'Razorpay'}</span></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRefundPayment(refundConfirmModal.payment._id)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Confirm Refund
              </button>
              <button
                type="button"
                onClick={() => setRefundConfirmModal({ isOpen: false, payment: null })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK PAID CONFIRMATION MODAL */}
      {markPaidConfirmModal.isOpen && markPaidConfirmModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Mark Payment as Paid?</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Confirm marking this pending transaction as PAID. This will activate the user's selected subscription plan immediately.
            </p>

            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
              <p><span className="text-slate-400 font-bold">User:</span> <strong className="text-slate-800 dark:text-zinc-200">{markPaidConfirmModal.payment.userName || markPaidConfirmModal.payment.userId?.name || 'Advocate Customer'}</strong></p>
              <p><span className="text-slate-400 font-bold">Invoice ID:</span> <span className="font-mono text-slate-700 dark:text-zinc-300">{markPaidConfirmModal.payment.invoiceNumber || markPaidConfirmModal.payment._id}</span></p>
              <p><span className="text-slate-400 font-bold">Amount:</span> <strong className="text-emerald-500 font-black">₹{Number(markPaidConfirmModal.payment.amount || 0).toLocaleString('en-IN')}</strong></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleMarkPaymentPaid(markPaidConfirmModal.payment._id)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Confirm Paid
              </button>
              <button
                type="button"
                onClick={() => setMarkPaidConfirmModal({ isOpen: false, payment: null })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN CREATE / EDIT MODAL */}
      {planModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handlePlanSaveSubmit} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {planModal.isEdit ? `Edit Subscription Plan — ${planForm.planName}` : 'Create New Subscription Plan'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Plan Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Advocate Pro Plan"
                  value={planForm.planName}
                  onChange={e => setPlanForm(prev => ({ ...prev, planName: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Plan ID / Slug</label>
                <input
                  type="text"
                  placeholder="e.g. advocate_pro"
                  value={planForm.planId}
                  onChange={e => setPlanForm(prev => ({ ...prev, planId: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Monthly Price (₹)</label>
                <input
                  type="number"
                  placeholder="999"
                  value={planForm.priceMonthly}
                  onChange={e => setPlanForm(prev => ({ ...prev, priceMonthly: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Yearly Price (₹)</label>
                <input
                  type="number"
                  placeholder="9990"
                  value={planForm.priceYearly}
                  onChange={e => setPlanForm(prev => ({ ...prev, priceYearly: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Monthly AI Credits</label>
                <input
                  type="number"
                  placeholder="5876"
                  value={planForm.credits}
                  onChange={e => setPlanForm(prev => ({ ...prev, credits: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-[#C8A34D]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Badge Label</label>
              <input
                type="text"
                placeholder="e.g. PRO, PREMIUM, COMBO, ALL ACCESS"
                value={planForm.badge}
                onChange={e => setPlanForm(prev => ({ ...prev, badge: e.target.value }))}
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Features Included (One Per Line)</label>
              <textarea
                rows={4}
                placeholder={`Active Cases: 100\nStorage: 20 GB\nDraft Maker: 15 / month\nContract Analyzer: 15 / month`}
                value={planForm.features}
                onChange={e => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-[#C8A34D]"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Checkmarks (✓) are added automatically on the plan cards.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.isPopular}
                  onChange={e => setPlanForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                  className="rounded border-slate-300 text-[#C8A34D] focus:ring-[#C8A34D]"
                />
                <span className="text-xs font-black text-slate-800 dark:text-zinc-200">Highlight as Popular Tier (Gold Border)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={e => setPlanForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300 text-[#C8A34D] focus:ring-[#C8A34D]"
                />
                <span className="text-xs font-black text-slate-800 dark:text-zinc-200">Active Plan</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Save Plan Parameters
              </button>
              <button
                type="button"
                onClick={() => setPlanModal({ isOpen: false, isEdit: false, planData: null })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COUPON CREATE / EDIT MODAL */}
      {couponModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveCouponSubmit} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {couponModal.isEdit ? `Edit Coupon: ${couponForm.code}` : 'Create New Promo Code'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="e.g. LEGAL100"
                  value={couponForm.code}
                  onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold font-mono tracking-wider text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Discount Type *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setCouponForm(prev => ({ ...prev, discountType: 'percentage' }))}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      couponForm.discountType === 'percentage'
                        ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D]'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCouponForm(prev => ({ ...prev, discountType: 'fixed' }))}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      couponForm.discountType === 'fixed'
                        ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D]'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    Fixed Amount (₹)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Discount Value *</label>
              <input
                type="number"
                placeholder={couponForm.discountType === 'percentage' ? '10 (for 10% OFF)' : '500 (for ₹500 OFF)'}
                value={couponForm.discountValue}
                onChange={e => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))}
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black text-emerald-500"
                required
              />
            </div>

            {/* Applicable Plans Multi-Select Pills */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Applicable Subscription Plans</label>
              <div className="flex gap-1.5 flex-wrap">
                {['ALL', 'advocate_basic', 'advocate_pro', 'advocate_premium', 'student_basic', 'student_pro', 'firm_basic', 'firm_pro'].map((p) => {
                  const isSelected = Array.isArray(couponForm.applicablePlans) && couponForm.applicablePlans.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        let next = [...(couponForm.applicablePlans || [])];
                        if (p === 'ALL') {
                          next = ['ALL'];
                        } else {
                          if (next.includes('ALL')) next = next.filter(x => x !== 'ALL');
                          if (isSelected) {
                            next = next.filter(x => x !== p);
                            if (next.length === 0) next = ['ALL'];
                          } else {
                            next.push(p);
                          }
                        }
                        setCouponForm(prev => ({ ...prev, applicablePlans: next }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D]'
                          : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={couponForm.startDate}
                  onChange={e => setCouponForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Expiry Date *</label>
                <input
                  type="date"
                  value={couponForm.expiryDate}
                  onChange={e => setCouponForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Total Usage Limit</label>
                <input
                  type="number"
                  placeholder="Leave blank for ∞"
                  value={couponForm.usageLimit}
                  onChange={e => setCouponForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Per User Limit</label>
                <input
                  type="number"
                  placeholder="1"
                  value={couponForm.perUserLimit}
                  onChange={e => setCouponForm(prev => ({ ...prev, perUserLimit: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Minimum Purchase (₹)</label>
                <input
                  type="number"
                  placeholder="0 (Optional)"
                  value={couponForm.minimumPurchase}
                  onChange={e => setCouponForm(prev => ({ ...prev, minimumPurchase: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Max Discount Cap (₹)</label>
                <input
                  type="number"
                  placeholder="Optional"
                  value={couponForm.maximumDiscount}
                  onChange={e => setCouponForm(prev => ({ ...prev, maximumDiscount: e.target.value }))}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={couponForm.status === 'active'}
                  onChange={e => setCouponForm(prev => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                  className="rounded border-slate-300 text-[#C8A34D] focus:ring-[#C8A34D]"
                />
                <span className="text-xs font-black text-slate-800 dark:text-zinc-200">Status Active</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Save Coupon 🎉
              </button>
              <button
                type="button"
                onClick={() => setCouponModal({ isOpen: false, isEdit: false, couponData: null })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* COUPON STATS & REDEMPTION AUDIT HISTORY MODAL */}
      {couponDetailsModal.isOpen && couponDetailsModal.coupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Coupon Analytics: {couponDetailsModal.coupon.code}</span>
                  <span className="bg-[#C8A34D]/20 text-[#C8A34D] text-[10px] font-black px-2 py-0.5 rounded-md border border-[#C8A34D]/40">
                    {couponDetailsModal.coupon.discountType === 'percentage' ? `${couponDetailsModal.coupon.discountValue}% OFF` : `₹${couponDetailsModal.coupon.discountValue} OFF`}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Created: {couponDetailsModal.coupon.createdAt ? new Date(couponDetailsModal.coupon.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setCouponDetailsModal({ isOpen: false, coupon: null, stats: null, usageHistory: [] })}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* 4 Telemetry Box Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">TOTAL USES</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">{couponDetailsModal.stats?.totalUses || couponDetailsModal.coupon.usedCount || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">DISCOUNT GIVEN</p>
                  <p className="text-lg font-extrabold text-emerald-500 mt-1">₹{(couponDetailsModal.stats?.totalDiscountGiven || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">REVENUE GENERATED</p>
                  <p className="text-lg font-extrabold text-[#C8A34D] mt-1">₹{(couponDetailsModal.stats?.totalRevenueGenerated || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">AVG ORDER VALUE</p>
                  <p className="text-lg font-extrabold text-blue-500 mt-1">₹{(couponDetailsModal.stats?.averageOrderValue || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Redemption Audit History Table */}
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                  Redemption Audit History
                </h4>

                {couponDetailsModal.usageHistory.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-4 text-center">No user redemptions recorded yet for this coupon.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/80 dark:border-zinc-800 text-[10px] uppercase font-black text-slate-400">
                          <th className="pb-2">User</th>
                          <th className="pb-2">Plan</th>
                          <th className="pb-2">Original</th>
                          <th className="pb-2">Discount</th>
                          <th className="pb-2">Paid</th>
                          <th className="pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60 font-semibold">
                        {couponDetailsModal.usageHistory.map((u, idx) => (
                          <tr key={u._id || idx} className="hover:bg-slate-100 dark:hover:bg-zinc-800/50">
                            <td className="py-2.5">
                              <p className="font-extrabold text-slate-900 dark:text-white">{u.userId?.fullName || u.userEmail || 'Subscriber'}</p>
                              <p className="text-[10px] text-slate-400">{u.userEmail || 'N/A'}</p>
                            </td>
                            <td className="py-2.5">
                              <span className="font-bold uppercase text-[#C8A34D]">{u.planId || 'PRO'}</span>
                            </td>
                            <td className="py-2.5 text-slate-500 line-through">₹{u.originalAmount || 0}</td>
                            <td className="py-2.5 text-emerald-500 font-bold">-₹{u.discountAmount || 0}</td>
                            <td className="py-2.5 font-black text-slate-900 dark:text-white">₹{u.finalAmount || 0}</td>
                            <td className="py-2.5 text-slate-400 text-[10px]">
                              {new Date(u.usedAt || u.createdAt).toLocaleDateString('en-GB')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-end">
              <button
                onClick={() => setCouponDetailsModal({ isOpen: false, coupon: null, stats: null, usageHistory: [] })}
                className="px-6 py-2.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs cursor-pointer shadow-md transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COUPON DELETE CONFIRMATION MODAL */}
      {couponDeleteConfirmModal.isOpen && couponDeleteConfirmModal.coupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Promo Code?</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Are you sure you want to delete this promotional code? Users will no longer be able to redeem it.
            </p>

            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
              <p><span className="text-slate-400 font-bold">Promo Code:</span> <strong className="text-[#C8A34D] font-black font-mono">{couponDeleteConfirmModal.coupon.code}</strong></p>
              <p><span className="text-slate-400 font-bold">Discount:</span> <span className="text-slate-700 dark:text-zinc-300 font-bold">{couponDeleteConfirmModal.coupon.discountType === 'percentage' ? `${couponDeleteConfirmModal.coupon.discountValue}% OFF` : `₹${couponDeleteConfirmModal.coupon.discountValue} OFF`}</span></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteCouponSubmit(couponDeleteConfirmModal.coupon._id)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Confirm Delete Code
              </button>
              <button
                type="button"
                onClick={() => setCouponDeleteConfirmModal({ isOpen: false, coupon: null })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE FEATURE REQUEST MODAL */}
      {featureModal.isOpen && featureModal.feature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveFeatureStatus} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Manage Feature Request</h3>
              <button
                type="button"
                onClick={() => setFeatureModal({ isOpen: false, feature: null, status: 'Pending', developerAssigned: 'None', adminNote: '' })}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Feature Overview Box */}
            <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-[#C8A34D] bg-[#C8A34D]/10 border border-[#C8A34D]/30 px-2.5 py-0.5 rounded-lg text-[11px]">
                  {featureModal.feature.category || 'General Feature'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                  featureModal.feature.priority === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}>
                  {featureModal.feature.priority || 'Medium'} Priority
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{featureModal.feature.title}</h4>
              <p className="text-slate-600 dark:text-zinc-300 font-medium">{featureModal.feature.description}</p>
              <p className="text-[10px] text-slate-400 font-bold pt-1">
                Requested by: {featureModal.feature.email || featureModal.feature.userEmail || 'Advocate Client'} ({featureModal.feature.userPlan || 'ADVOCATE_PRO'})
              </p>
            </div>

            {/* Update Status Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Update Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {['Pending', 'Under Review', 'Planned', 'In Progress', 'Completed', 'Rejected'].map((st) => {
                  const isSelected = featureModal.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFeatureModal(prev => ({ ...prev, status: st }))}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#C8A34D] text-[#111111] border-[#C8A34D] shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assign Developer Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Assign Developer</label>
              <div className="flex gap-1.5 flex-wrap">
                {['None', 'John Doe', 'Aditi Verma', 'Nikhil Gupta', 'Sarah Connor'].map((dev) => {
                  const isSelected = featureModal.developerAssigned === dev;
                  return (
                    <button
                      key={dev}
                      type="button"
                      onClick={() => setFeatureModal(prev => ({ ...prev, developerAssigned: dev }))}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {dev}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin / Dev Reply to User */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Admin Reply to User (Visible in App)</label>
              <textarea
                rows={3}
                placeholder="Add response to reflect inside client app..."
                value={featureModal.adminNote}
                onChange={e => setFeatureModal(prev => ({ ...prev, adminNote: e.target.value }))}
                className="w-full mt-1 p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Save Update 🎉
              </button>
              <button
                type="button"
                onClick={() => setFeatureModal({ isOpen: false, feature: null, status: 'Pending', developerAssigned: 'None', adminNote: '' })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FEATURE DELETE CONFIRMATION MODAL */}
      {featureDeleteModal.isOpen && featureDeleteModal.feature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Feature Request?</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Are you sure you want to delete this feature request? This action cannot be undone.
            </p>

            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
              <p><span className="text-slate-400 font-bold">Category:</span> <span className="font-extrabold text-[#C8A34D]">{featureDeleteModal.feature.category || 'General'}</span></p>
              <p><span className="text-slate-400 font-bold">Title:</span> <strong className="text-slate-800 dark:text-zinc-200">{featureDeleteModal.feature.title}</strong></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteFeatureSubmit(featureDeleteModal.feature._id)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
              >
                Confirm Delete Request
              </button>
              <button
                type="button"
                onClick={() => setFeatureDeleteModal({ isOpen: false, feature: null })}
                className="py-3 px-5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
