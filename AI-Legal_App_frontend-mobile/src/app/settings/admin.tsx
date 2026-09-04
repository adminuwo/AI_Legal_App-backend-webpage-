import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  Platform,
  TouchableOpacity,
  BackHandler,
  Linking,
  Switch,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/api/client';
import io from 'socket.io-client';
import { COUNTRIES, Country } from '@/constants';
import { AppConfig } from '@/config';

const { height } = Dimensions.get('window');

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'analytics-outline' },
  { id: 'users', label: 'Users', icon: 'people-outline' },
  { id: 'billing', label: 'Billing', icon: 'card-outline' },
  { id: 'plans', label: 'Plans', icon: 'pricetags-outline' },
  { id: 'coupons', label: 'Coupons', icon: 'ticket-outline' },
  { id: 'features', label: 'Requests', icon: 'bulb-outline' },
  { id: 'bugs', label: 'Bugs', icon: 'bug-outline' },
  { id: 'crashes', label: 'Crash Reports', icon: 'warning-outline' },
  { id: 'reports', label: 'Response Reports', icon: 'chatbubble-ellipses-outline' },
  { id: 'jurisdiction', label: 'Jurisdiction', icon: 'globe-outline' },
  { id: 'appUpdates', label: 'App Updates', icon: 'cloud-download-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function AdminPortalScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const profile = useUserStore((s) => s.profile);
  const setCredentials = useAuthStore((s) => s.setCredentials);

  const emailLower = (profile?.email || '').toLowerCase().trim();
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'SUPER_ADMIN' || emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com';

  const [activeTab, setActiveTab] = useState('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Live Database States
  const [stats, setStats] = useState<any>({
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

  const [usersList, setUsersList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [couponFeatureEnabled, setCouponFeatureEnabled] = useState<boolean>(true);
  const [couponStats, setCouponStats] = useState<any>({
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalCouponUses: 0,
    totalDiscountGiven: 0,
    totalRevenueGenerated: 0,
  });
  const [featuresList, setFeaturesList] = useState<any[]>([]);
  const [bugsList, setBugsList] = useState<any[]>([]);
  const [complaintsList, setComplaintsList] = useState<any[]>([]);
  const [crashesList, setCrashesList] = useState<any[]>([]);
  const [crashStats, setCrashStats] = useState<any>({ total: 0, unresolved: 0, frontend: 0, backend: 0, critical: 0 });
  const [adminSettings, setAdminSettings] = useState<any>({
    maintenanceMode: false,
    sessionTimeout: 30,
    platformName: 'AI Legal Pro',
    logoUrl: '',
    supportEmail: 'support@aisa24.com',
    smtp: { host: 'smtp.mailtrap.io', port: 2525, user: '', pass: '' },
    apiKeys: { openai: '', razorpayId: '', razorpaySecret: '' },
    aiModel: 'gpt-4-turbo',
    defaultCredits: 50,
    fileUploadLimitMb: 25,
    storageLimitGb: 5
  });

  // Filtering states
  const [userFilter, setUserFilter] = useState<'all' | 'free' | 'premium' | 'suspended'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'success' | 'failed' | 'refunded'>('all');
  const [featureFilterState, setFeatureFilterState] = useState<'all' | 'Pending' | 'Under Review' | 'Planned' | 'In Progress' | 'Completed' | 'Rejected'>('all');
  const [bugSeverityFilter, setBugSeverityFilter] = useState<'all' | 'Minor' | 'Major' | 'Critical'>('all');
  const [bugStatusFilter, setBugStatusFilter] = useState<'all' | 'Open' | 'Assigned' | 'Fixing' | 'Testing' | 'Fixed' | 'Closed'>('all');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<'all' | 'Open' | 'In Review' | 'Resolved' | 'Closed'>('all');
  const [crashSourceFilter, setCrashSourceFilter] = useState<'all' | 'frontend' | 'backend'>('all');
  const [crashPlatformFilter, setCrashPlatformFilter] = useState<'all' | 'iOS' | 'Android' | 'NodeServer'>('all');
  const [crashStatusFilter, setCrashStatusFilter] = useState<'all' | 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED'>('all');
  const [crashFeatureFilter, setCrashFeatureFilter] = useState<string>('all');
  const [selectedCrash, setSelectedCrash] = useState<any>(null);

  // Modals & Forms State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [selectedCouponDetails, setSelectedCouponDetails] = useState<any>(null);
  const [selectedCouponUsageHistory, setSelectedCouponUsageHistory] = useState<any[]>([]);
  const [selectedCouponStats, setSelectedCouponStats] = useState<any>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form states for Plan CRUD
  const [planForm, setPlanForm] = useState({
    planId: '',
    planName: '',
    priceMonthly: '0',
    priceYearly: '0',
    credits: '100',
    features: '',
    badge: '',
    isPopular: false,
    isActive: true
  });

  // Form states for Coupon CRUD
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '50',
    applicablePlans: ['ALL'],
    billingCycles: ['ALL'],
    startDate: '',
    expiryDate: '',
    usageLimit: '',
    perUserLimit: '1',
    minimumPurchase: '',
    maximumDiscount: '',
    status: 'active',
  });

  // Form states for User Adjustments
  const [creditAdjustment, setCreditAdjustment] = useState({ amount: '', actionType: 'add' });
  const [planUpgradeForm, setPlanUpgradeForm] = useState({ planId: '', billingCycle: 'monthly' });
  const [passwordResetVal, setPasswordResetVal] = useState('');

  // Form state for Admin Password Change
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // Jurisdiction Overrides Tab states
  const [jSearchQuery, setJSearchQuery] = useState('');
  const [jSelectedUser, setJSelectedUser] = useState<any>(null);
  const [jTargetCountry, setJTargetCountry] = useState<Country>({ name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' });
  const [jCountrySearch, setJCountrySearch] = useState('');
  const [jCountryDropdownOpen, setJCountryDropdownOpen] = useState(false);
  const [jOverrideType, setJOverrideType] = useState<'Permanent' | 'Temporary'>('Temporary');
  const [jSaving, setJSaving] = useState(false);
  const [jTestQuery, setJTestQuery] = useState('');
  const [jRunningTest, setJRunningTest] = useState(false);
  const [jTestResult, setJTestResult] = useState('');

  // App Release & Version Management States
  const [releasesList, setReleasesList] = useState<any[]>([]);
  const [releasesSummary, setReleasesSummary] = useState<any>({
    android: { latestVersion: '1.0.1', minimumSupportedVersion: '1.0.0', updatePolicy: 'optional', storeUrl: '', title: '', message: '', enabled: true },
    ios: { latestVersion: '1.0.1', minimumSupportedVersion: '1.0.0', updatePolicy: 'optional', storeUrl: '', title: '', message: '', enabled: true },
    totalReleases: 0,
    lastReleaseDate: null,
  });
  const [releasedVersionsList, setReleasedVersionsList] = useState<{ android: string[]; ios: string[] }>({
    android: ['1.0.0', '1.0.1'],
    ios: ['1.0.0', '1.0.1'],
  });
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const [editingRelease, setEditingRelease] = useState<any>(null);
  const [releaseForm, setReleaseForm] = useState({
    platform: 'both',
    version: '1.2.0',
    buildNumber: '15',
    releaseType: 'Feature',
    releaseNotes: '',
    storeUrl: '',
    status: 'Released',
  });

  const handleOpenReleaseCreator = () => {
    setReleaseForm({
      platform: 'both',
      version: '1.2.0',
      buildNumber: '15',
      releaseType: 'Feature',
      releaseNotes: 'New features, stability improvements and bug fixes.',
      storeUrl: '',
      status: 'Released',
    });
    setEditingRelease(null);
    setIsCreatingRelease(true);
  };

  const handleSaveRelease = async () => {
    const targetVersion = (releaseForm.version || '1.2.0').trim();
    const targetBuild = parseInt(releaseForm.buildNumber || '15', 10) || 15;

    if (!targetVersion) {
      showToast('error', 'Required Fields Missing', 'Version number is required.');
      return;
    }

    try {
      if (editingRelease) {
        await apiClient.put(`/app-update/admin/releases/${editingRelease._id}`, {
          platform: releaseForm.platform,
          version: targetVersion,
          buildNumber: targetBuild,
          releaseType: releaseForm.releaseType,
          releaseNotes: releaseForm.releaseNotes,
          storeUrl: releaseForm.storeUrl,
          status: releaseForm.status,
        });
        showToast('success', 'Release Updated', `Release ${targetVersion} updated successfully.`);
      } else {
        await apiClient.post('/app-update/admin/releases', {
          platform: releaseForm.platform,
          version: targetVersion,
          buildNumber: targetBuild,
          releaseType: releaseForm.releaseType,
          releaseNotes: releaseForm.releaseNotes,
          storeUrl: releaseForm.storeUrl,
          status: releaseForm.status,
        });
        showToast('success', 'Release Published 🎉', `Release v${targetVersion} published successfully!`);
      }
      setIsCreatingRelease(false);
      setEditingRelease(null);
      await loadData(true);
    } catch (err: any) {
      console.error('[AdminRelease] Save release error:', err);
      showToast('error', 'Save Failed', err.response?.data?.message || err.message || 'Could not save release record.');
    }
  };

  const handleDeleteRelease = async (id: string, version: string) => {
    Alert.alert('Delete Release Record', `Are you sure you want to delete release ${version}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/app-update/admin/releases/${id}`);
            showToast('success', 'Release Deleted', `Release ${version} deleted.`);
            loadData();
          } catch (err: any) {
            showToast('error', 'Delete Failed', 'Could not delete release record.');
          }
        },
      },
    ]);
  };

  const handleUpdateAppUpdateSettings = async (settingsPayload: any) => {
    try {
      await apiClient.put('/app-update/admin/settings', settingsPayload);
      showToast('success', 'Settings Saved', 'App Update Management settings updated.');
      loadData();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.message || 'Could not save settings.');
    }
  };

  // Android back button fallback
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/settings');
      }
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Socket.IO Real-Time Connection
  useEffect(() => {
    if (!isAuthorized) return;

    const socketUrl = AppConfig.apiUrl ? AppConfig.apiUrl.replace('/api', '') : '';
    const token = useAuthStore.getState().token || '';
    const socket = io(socketUrl, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to Admin Real-time Channel');
    });

    socket.on('admin:refresh', () => {
      loadData();
    });

    socket.on('user:registered', (data) => {
      showToast('info', 'New User Joined', `${data.name} just registered!`);
      loadData();
    });

    socket.on('feature:submitted', (data) => {
      showToast('success', 'New Feature Request', `"${data.title}" submitted.`);
      loadData();
    });

    socket.on('bug:submitted', (data) => {
      showToast('error', 'New Bug Report', `"${data.title}" submitted.`);
      loadData();
    });

    socket.on('case:created', () => {
      loadData();
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadData();

    // Fallback background polling (15s) while Socket.io delivers instant real-time events
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthorized]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [statsRes, usersRes, billingRes, plansRes, couponsRes, featuresRes, bugsRes, settingsRes, complaintsRes, crashesRes, releasesRes] = await Promise.all([
        apiClient.get('/admin/stats').catch(() => ({ data: { success: false } })),
        apiClient.get('/admin/users?limit=200').catch(() => ({ data: { list: [] } })),
        apiClient.get('/admin/billing?limit=200').catch(() => ({ data: { list: [] } })),
        apiClient.get('/admin/plans').catch(() => ({ data: { plans: [] } })),
        apiClient.get('/admin/coupons').catch(() => ({ data: { coupons: [], stats: null } })),
        apiClient.get('/admin/feature-requests?limit=200').catch(() => ({ data: { list: [] } })),
        apiClient.get('/admin/bug-reports?limit=200').catch(() => ({ data: { list: [] } })),
        apiClient.get('/admin/settings').catch(() => ({ data: { settings: null } })),
        apiClient.get('/complaints?limit=200').catch(() => ({ data: { data: [] } })),
        apiClient.get('/admin/crashes?limit=200').catch(() => ({ data: { crashes: [], stats: null } })),
        apiClient.get('/app-update/admin/releases').catch(() => ({ data: { releases: [], summary: null, releasedVersions: null } })),
      ]);

      if (releasesRes.data?.releases) {
        setReleasesList(releasesRes.data.releases);
      }
      if (releasesRes.data?.summary) {
        setReleasesSummary(releasesRes.data.summary);
      }
      if (releasesRes.data?.releasedVersions) {
        setReleasedVersionsList(releasesRes.data.releasedVersions);
      }

      if (statsRes.data?.success && statsRes.data.stats) {
        const s = statsRes.data.stats;
        const uList = Array.isArray(usersRes.data?.list) ? usersRes.data.list : [];
        
        // Derive live accurate counts from backend DB response
        const totalU = s.totalUsers !== undefined ? s.totalUsers : (uList.length || 0);
        const premU = s.premiumUsers !== undefined ? s.premiumUsers : uList.filter((u: any) => u.subscription?.plan && u.subscription.plan !== 'FREE').length;
        const freeU = s.freeUsers !== undefined ? s.freeUsers : Math.max(0, totalU - premU);

        setStats({
          ...s,
          totalUsers: totalU,
          premiumUsers: premU,
          freeUsers: freeU,
          onlineUsers: s.onlineUsers ?? 0,
          activeUsers: s.activeUsers ?? totalU,
          revenueToday: s.revenueToday ?? 0,
          revenueMonth: s.revenueMonth ?? 0,
          revenueLifetime: s.revenueLifetime ?? 0,
          totalCreditsUsed: s.totalCreditsUsed ?? 0,
          totalCases: s.totalCases ?? 0,
          contractsAnalyzed: s.contractsAnalyzed ?? 0,
          strategyReports: s.strategyReports ?? 0,
          casePredictorReports: s.casePredictorReports ?? 0,
          chatUsage: s.chatUsage ?? 0,
          storageUsed: s.storageUsed ?? 0,
        });
      }
      if (Array.isArray(usersRes.data?.list)) {
        setUsersList(usersRes.data.list);
      }
      if (Array.isArray(billingRes.data?.list)) {
        setPaymentsList(billingRes.data.list);
      }
      if (Array.isArray(plansRes.data?.plans)) {
        setPlansList(plansRes.data.plans);
      }
      if (Array.isArray(couponsRes.data?.coupons)) {
        setCouponsList(couponsRes.data.coupons);
      }
      if (typeof couponsRes.data?.couponFeatureEnabled === 'boolean') {
        setCouponFeatureEnabled(couponsRes.data.couponFeatureEnabled);
      }
      if (couponsRes.data?.stats) {
        setCouponStats(couponsRes.data.stats);
      }
      if (Array.isArray(featuresRes.data?.list)) {
        setFeaturesList(featuresRes.data.list);
      }
      if (Array.isArray(bugsRes.data?.list)) {
        setBugsList(bugsRes.data.list);
      }
      if (Array.isArray(complaintsRes.data?.data)) {
        setComplaintsList(complaintsRes.data.data);
      }
      if (Array.isArray(crashesRes.data?.crashes)) {
        setCrashesList(crashesRes.data.crashes);
        if (crashesRes.data.stats) setCrashStats(crashesRes.data.stats);
      }
      if (settingsRes.data?.settings) {
        setAdminSettings(settingsRes.data.settings);
      }
    } catch (err) {
      console.warn('Failed to refresh live console logs:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // --- USER CONTROLS ---
  const handleDeleteUser = async (user?: any) => {
    const hasUser = user && typeof user === 'object' && '_id' in user;
    const targetUser = hasUser ? user : selectedUser;
    if (!targetUser || isDeleting) return;

    const PRIMARY_ADMIN_EMAIL = 'admin@ailegal.com';
    const isSuperAdmin = profile?.role === 'admin' || profile?.email === PRIMARY_ADMIN_EMAIL || profile?.email === 'admin@uwo24.com';
    if (!isSuperAdmin) {
      showToast('error', 'Access Denied', 'Only Super Admins can delete users.');
      return;
    }

    Alert.alert(
      'Delete User?',
      'Are you sure you want to permanently delete this user?\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete User',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(targetUser._id);
            try {
              await apiClient.delete(`/admin/users/${targetUser._id}`);
              
              // Remove the user from the list immediately
              setUsersList((prev) => prev.filter((u) => u._id !== targetUser._id));
              
              // Refresh user statistics instantly
              setStats((prev: any) => ({
                ...prev,
                totalUsers: Math.max(0, (prev?.totalUsers || 0) - 1),
                activeUsers: Math.max(0, (prev?.activeUsers || 0) - 1),
              }));
              
              showToast('success', 'User Deleted Successfully', 'The user account and associated data have been permanently removed.');
              
              if (selectedUser && selectedUser._id === targetUser._id) {
                setSelectedUser(null);
              }
              
              // Background update
              loadData();
            } catch (err) {
              console.error('[CLIENT DELETE USER ERROR]', err);
              showToast('error', 'Unable to delete user.', 'Please try again.');
            } finally {
              setIsDeleting(null);
            }
          }
        }
      ]
    );
  };

  const handleAdjustCredits = async () => {
    if (!selectedUser || !creditAdjustment.amount) return;
    try {
      const res = await apiClient.post(`/admin/users/${selectedUser._id}/adjust-credits`, {
        amount: parseFloat(creditAdjustment.amount),
        actionType: creditAdjustment.actionType
      });
      showToast('success', 'Credits Adjusted', `Credits set to ${res.data.credits}`);
      setSelectedUser({ ...selectedUser, credits: res.data.credits });
      setCreditAdjustment({ amount: '', actionType: 'add' });
      loadData();
    } catch (err) {
      showToast('error', 'Adjustment Failed', 'Could not adjust user credits.');
    }
  };

  const handleChangePlan = async () => {
    if (!selectedUser || !planUpgradeForm.planId) {
      Alert.alert('Select Plan', 'Please select a subscription plan to assign.');
      return;
    }

    const selectedPlanId = planUpgradeForm.planId;
    const cycle = planUpgradeForm.billingCycle || 'monthly';

    Alert.alert(
      'Confirm Plan Assignment',
      `Are you sure you want to assign the selected plan (${selectedPlanId} - ${cycle}) to ${selectedUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign Plan',
          style: 'default',
          onPress: async () => {
            try {
              const res = await apiClient.post(`/admin/users/${selectedUser._id}/change-plan`, {
                planId: selectedPlanId,
                type: cycle
              });
              const msg = res.data?.message || 'User subscription plan updated successfully.';
              
              // Success Alert Popup
              Alert.alert('🎉 Plan Assigned', msg, [{ text: 'OK' }]);
              showToast('success', 'Plan Assigned', msg);

              if (res.data?.user) {
                setSelectedUser(res.data.user);
              } else {
                const updatedUser = await apiClient.get(`/admin/users/${selectedUser._id}`);
                setSelectedUser(updatedUser.data.user);
              }
              loadData();
            } catch (err: any) {
              const errMsg = err.response?.data?.message || 'Could not change user subscription plan.';
              Alert.alert('Assignment Failed', errMsg);
              showToast('error', 'Assignment Failed', errMsg);
            }
          }
        }
      ]
    );
  };

  const handleExpireSubscription = async () => {
    if (!selectedUser) return;
    Alert.alert('Expire Plan', 'Are you sure you want to force expire this user subscription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Expire',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/admin/users/${selectedUser._id}/change-plan`, { expire: true });
            showToast('success', 'Plan Expired', 'User subscription forced to expire.');
            const updatedUser = await apiClient.get(`/admin/users/${selectedUser._id}`);
            setSelectedUser(updatedUser.data.user);
            loadData();
          } catch (err) {
            showToast('error', 'Failed', 'Could not expire plan.');
          }
        }
      }
    ]);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !passwordResetVal) return;
    try {
      await apiClient.post(`/admin/users/${selectedUser._id}/reset-password`, { password: passwordResetVal });
      showToast('success', 'Password Reset', 'Password changed successfully.');
      setPasswordResetVal('');
    } catch (err) {
      showToast('error', 'Reset Failed', 'Could not reset password.');
    }
  };

  const handleLoginAsUser = async () => {
    if (!selectedUser) return;
    try {
      const res = await apiClient.post(`/admin/users/${selectedUser._id}/login-as`);
      if (res.data.success && res.data.token) {
        setCredentials(res.data.token, '');
        showToast('success', 'Masquerading', `Logged in as ${res.data.user.name}`);
        setSelectedUser(null);
        router.replace('/(tabs)/dashboard');
      }
    } catch (err) {
      showToast('error', 'Masquerade Failed', 'Could not authenticate as target user.');
    }
  };


  // --- BILLING CONTROLS ---
  const handleMarkPaid = async (paymentId: string) => {
    try {
      await apiClient.post(`/admin/billing/${paymentId}/mark-paid`);
      showToast('success', 'Invoice Settled', 'Payment marked as success.');
      loadData();
    } catch (err) {
      showToast('error', 'Action Failed', 'Could not mark paid.');
    }
  };

  const handleRefund = async (paymentId: string) => {
    Alert.alert('Issue Refund', 'Mark this transaction as refunded?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Refund',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/admin/billing/${paymentId}/refund`);
            showToast('success', 'Refund Processed', 'Payment marked as refunded.');
            loadData();
          } catch (err) {
            showToast('error', 'Refund Failed', 'Could not process refund.');
          }
        }
      }
    ]);
  };

  const handleExportCSV = async () => {
    try {
      const baseUrl = (apiClient.defaults.baseURL || AppConfig.apiUrl || '').replace(/\/$/, '');
      const url = baseUrl.endsWith('/api') ? `${baseUrl}/admin/billing/export-csv` : `${baseUrl}/api/admin/billing/export-csv`;
      await Linking.openURL(url);
      showToast('success', 'Export Initiated', 'CSV download path loaded.');
    } catch (err) {
      showToast('error', 'Export Failed', 'Could not download CSV export.');
    }
  };

  // --- PLAN CONTROLS ---
  const handleSavePlan = async () => {
    try {
      const payload = {
        planId: planForm.planId,
        planName: planForm.planName,
        priceMonthly: parseFloat(planForm.priceMonthly) || 0,
        priceYearly: parseFloat(planForm.priceYearly) || 0,
        credits: parseInt(planForm.credits) || 0,
        features: planForm.features.split('\n').filter(f => f.trim() !== ''),
        badge: planForm.badge,
        isPopular: planForm.isPopular,
        isActive: planForm.isActive
      };

      if (editingPlan) {
        const targetId = editingPlan._id || editingPlan.planId || planForm.planId;
        await apiClient.put(`/admin/plans/${targetId}`, payload);
        showToast('success', 'Plan Updated', 'Subscription plan changes saved.');
      } else {
        await apiClient.post('/admin/plans', payload);
        showToast('success', 'Plan Created', 'New plan added to database.');
      }
      setEditingPlan(null);
      setIsCreatingPlan(false);
      loadData();
    } catch (err) {
      showToast('error', 'Save Failed', 'Could not save subscription plan details.');
    }
  };

  const handleOpenPlanCreator = () => {
    setPlanForm({
      planId: `plan_${Date.now()}`,
      planName: '',
      priceMonthly: '19',
      priceYearly: '199',
      credits: '100',
      features: 'Feature 1\nFeature 2',
      badge: '',
      isPopular: false,
      isActive: true
    });
    setEditingPlan(null);
    setIsCreatingPlan(true);
  };

  const handleOpenPlanEdit = (plan: any) => {
    setPlanForm({
      planId: plan.planId || '',
      planName: plan.planName || '',
      priceMonthly: String(plan.priceMonthly || '0'),
      priceYearly: String(plan.priceYearly || '0'),
      credits: String(plan.credits || '0'),
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      badge: plan.badge || '',
      isPopular: plan.isPopular || false,
      isActive: plan.isActive !== false
    });
    setEditingPlan(plan);
    setIsCreatingPlan(true);
  };

  const handleDeletePlan = async (planId: string) => {
    Alert.alert('Delete Plan', 'Are you sure you want to permanently delete this plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/plans/${planId}`);
            showToast('success', 'Deleted', 'Plan removed from database.');
            loadData();
          } catch (err) {
            showToast('error', 'Failed', 'Could not delete plan.');
          }
        }
      }
    ]);
  };

  // --- COUPON CONTROLS ---
  const handleOpenCouponCreator = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: '50',
      applicablePlans: ['ALL'],
      billingCycles: ['ALL'],
      startDate: todayStr,
      expiryDate: nextMonth,
      usageLimit: '',
      perUserLimit: '1',
      minimumPurchase: '',
      maximumDiscount: '',
      status: 'active',
    });
    setEditingCoupon(null);
    setIsCreatingCoupon(true);
  };

  const handleOpenCouponEdit = (c: any) => {
    setCouponForm({
      code: c.code || '',
      discountType: c.discountType || 'percentage',
      discountValue: String(c.discountValue || ''),
      applicablePlans: Array.isArray(c.applicablePlans) && c.applicablePlans.length > 0 ? c.applicablePlans : ['ALL'],
      billingCycles: Array.isArray(c.billingCycles) && c.billingCycles.length > 0 ? c.billingCycles : ['ALL'],
      startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
      expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: c.usageLimit !== null && c.usageLimit !== undefined ? String(c.usageLimit) : '',
      perUserLimit: String(c.perUserLimit || 1),
      minimumPurchase: c.minimumPurchase ? String(c.minimumPurchase) : '',
      maximumDiscount: c.maximumDiscount ? String(c.maximumDiscount) : '',
      status: c.status || 'active',
    });
    setEditingCoupon(c);
    setIsCreatingCoupon(true);
  };

  const handleSaveCoupon = async () => {
    if (!couponForm.code || !couponForm.discountValue || !couponForm.expiryDate) {
      showToast('error', 'Required Fields Missing', 'Code, discount value, and expiry date are required.');
      return;
    }

    try {
      const payload = {
        code: couponForm.code,
        discountType: couponForm.discountType,
        discountValue: parseFloat(couponForm.discountValue) || 0,
        applicablePlans: couponForm.applicablePlans,
        billingCycles: couponForm.billingCycles,
        startDate: couponForm.startDate || new Date().toISOString(),
        expiryDate: couponForm.expiryDate,
        usageLimit: couponForm.usageLimit !== '' ? parseInt(couponForm.usageLimit) : null,
        perUserLimit: parseInt(couponForm.perUserLimit) || 1,
        minimumPurchase: parseFloat(couponForm.minimumPurchase) || 0,
        maximumDiscount: couponForm.maximumDiscount !== '' ? parseFloat(couponForm.maximumDiscount) : null,
        status: couponForm.status,
      };

      if (editingCoupon) {
        await apiClient.put(`/admin/coupons/${editingCoupon._id}`, payload);
        showToast('success', 'Coupon Updated 🎉', `Coupon ${couponForm.code.toUpperCase()} updated successfully.`);
      } else {
        await apiClient.post('/admin/coupons', payload);
        showToast('success', 'Coupon Created 🎉', `Coupon ${couponForm.code.toUpperCase()} created successfully.`);
      }
      setIsCreatingCoupon(false);
      setEditingCoupon(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not save coupon.';
      showToast('error', 'Save Failed', msg);
    }
  };

  const handleToggleCouponFeature = async () => {
    const nextState = !couponFeatureEnabled;
    setCouponFeatureEnabled(nextState);
    try {
      const res = await apiClient.patch('/admin/coupons/toggle-feature', { enabled: nextState });
      showToast('success', 'Feature Status Updated', res.data?.message || `Coupon feature is now ${nextState ? 'ACTIVE' : 'INACTIVE'}`);
      loadData(true);
    } catch (err: any) {
      setCouponFeatureEnabled(!nextState);
      showToast('error', 'Update Failed', 'Could not update coupon feature status.');
    }
  };

  const handleToggleCouponStatus = async (id: string) => {
    try {
      const res = await apiClient.patch(`/admin/coupons/${id}/status`);
      showToast('success', 'Status Updated', res.data?.message || 'Coupon status toggled.');
      loadData();
    } catch (err: any) {
      showToast('error', 'Action Failed', 'Could not update coupon status.');
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    Alert.alert('Delete Coupon', `Are you sure you want to delete coupon ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/coupons/${id}`);
            showToast('success', 'Coupon Deleted', `Coupon ${code} has been deleted.`);
            loadData();
          } catch (err: any) {
            showToast('error', 'Delete Failed', 'Could not delete coupon.');
          }
        },
      },
    ]);
  };

  const handleViewCouponDetails = async (id: string) => {
    try {
      const res = await apiClient.get(`/admin/coupons/${id}`);
      if (res.data?.success) {
        setSelectedCouponDetails(res.data.coupon);
        setSelectedCouponStats(res.data.stats);
        setSelectedCouponUsageHistory(res.data.usageHistory || []);
      }
    } catch (err: any) {
      showToast('error', 'Fetch Failed', 'Could not load coupon details.');
    }
  };

  const handleCopyCouponCode = (code: string) => {
    const cleanCode = String(code || '').trim().toUpperCase();
    Clipboard.setString(cleanCode);
    setCopiedCouponCode(cleanCode);
    showToast('success', 'Coupon code copied! ✓', `${cleanCode} copied to clipboard.`);
    setTimeout(() => {
      setCopiedCouponCode(null);
    }, 2000);
  };

  // --- BUG / FEATURE CONTROLS ---
  const handleUpdateFeatureStatus = async (status: string) => {
    if (!selectedFeature) return;
    try {
      await apiClient.put(`/admin/feature-requests/${selectedFeature._id}`, { status });
      showToast('success', 'Status Saved', `Status updated to ${status}`);
      setSelectedFeature({ ...selectedFeature, status });
      loadData();
    } catch (err) {
      showToast('error', 'Failed', 'Could not update status.');
    }
  };

  const handleFeatureReply = async (reply: string) => {
    if (!selectedFeature) return;
    try {
      await apiClient.put(`/admin/feature-requests/${selectedFeature._id}`, { reply });
      showToast('success', 'Reply Added', 'Admin developer reply saved.');
      setSelectedFeature({ ...selectedFeature, reply });
      loadData();
    } catch (err) {
      showToast('error', 'Failed', 'Could not save reply.');
    }
  };

  const handleAssignFeatureDev = async (developerAssigned: string) => {
    if (!selectedFeature) return;
    try {
      await apiClient.put(`/admin/feature-requests/${selectedFeature._id}`, { developerAssigned });
      showToast('success', 'Developer Assigned', `Assigned to ${developerAssigned}`);
      setSelectedFeature({ ...selectedFeature, developerAssigned });
      loadData();
    } catch (err) {
      showToast('error', 'Failed', 'Could not assign developer.');
    }
  };

  const handleDeleteFeature = async (id: string) => {
    Alert.alert('Delete Feature Request', 'Delete this request permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/feature-requests/${id}`);
            showToast('success', 'Deleted', 'Feature request deleted.');
            setSelectedFeature(null);
            loadData();
          } catch (err) {
            showToast('error', 'Failed', 'Could not delete.');
          }
        }
      }
    ]);
  };

  const handleUpdateBugStatus = async (status: string) => {
    if (!selectedBug) return;
    try {
      await apiClient.put(`/admin/bug-reports/${selectedBug._id}`, { status });
      showToast('success', 'Status Saved', `Status set to ${status}`);
      setSelectedBug({ ...selectedBug, status });
      loadData();
    } catch (err) {
      showToast('error', 'Failed', 'Could not update bug status.');
    }
  };

  const handleUpdateBugSeverity = async (severity: string) => {
    if (!selectedBug) return;
    try {
      await apiClient.put(`/admin/bug-reports/${selectedBug._id}`, { severity });
      showToast('success', 'Severity Updated', `Severity set to ${severity}`);
      setSelectedBug({ ...selectedBug, severity });
      loadData();
    } catch (err) {
      showToast('error', 'Failed', 'Could not update severity.');
    }
  };

  const handleBugDeveloperNotes = async (internalNotes: string) => {
    if (!selectedBug) return;
    try {
      await apiClient.put(`/admin/bug-reports/${selectedBug._id}`, { internalNotes });
      showToast('success', 'Notes Saved', 'Internal developer notes updated.');
      setSelectedBug({ ...selectedBug, internalNotes });
      loadData();
    } catch (err) {
      showToast('error', 'Failed', 'Could not save notes.');
    }
  };

  const handleDeleteBug = async (id: string) => {
    Alert.alert('Delete Bug Report', 'Delete this report permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/bug-reports/${id}`);
            showToast('success', 'Deleted', 'Bug report deleted.');
            setSelectedBug(null);
            loadData();
          } catch (err) {
            showToast('error', 'Failed', 'Could not delete bug.');
          }
        }
      }
    ]);
  };

  // --- SETTINGS CONTROLS ---
  const handleUpdateAdminSettings = async (updates: any) => {
    try {
      const payload = { ...adminSettings, ...updates };
      const res = await apiClient.put('/admin/settings', payload);
      setAdminSettings(res.data.settings);
      showToast('success', 'Settings Saved', 'Platform configurations updated.');
    } catch (err) {
      showToast('error', 'Save Failed', 'Could not save configurations.');
    }
  };

  const handleUpdateAdminPassword = async () => {
    if (!adminPasswordInput || adminPasswordInput.length < 6) {
      showToast('error', 'Error', 'Password must be at least 6 characters.');
      return;
    }
    if (adminPasswordInput !== adminPasswordConfirm) {
      showToast('error', 'Error', 'Passwords do not match.');
      return;
    }
    try {
      await apiClient.post(`/admin/users/${profile?._id}/reset-password`, { password: adminPasswordInput });
      showToast('success', 'Password Updated', 'Admin password updated successfully.');
      setAdminPasswordInput('');
      setAdminPasswordConfirm('');
    } catch (err) {
      showToast('error', 'Failed', 'Could not update admin password.');
    }
  };

  const handleApplyOverride = async () => {
    if (!jSelectedUser) return;
    setJSaving(true);
    try {
      const response = await apiClient.post('/admin/jurisdiction-override', {
        userId: jSelectedUser._id,
        country: jTargetCountry.name,
        countryCode: jTargetCountry.code,
        overrideType: jOverrideType,
      });

      if (response.data.success) {
        showToast('success', 'Jurisdiction Applied', response.data.message);
        loadData();
        setJSelectedUser({
          ...jSelectedUser,
          country: jTargetCountry.name,
          jurisdiction: jTargetCountry.name,
        });
      } else {
        showToast('error', 'Update Failed', response.data.message || 'Error occurred');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Error occurred';
      showToast('error', 'Update Failed', errMsg);
    } finally {
      setJSaving(false);
    }
  };

  const handleResetOverride = async () => {
    if (!jSelectedUser) return;
    try {
      const response = await apiClient.post('/admin/jurisdiction-override/reset', {
        userId: jSelectedUser._id,
      });

      if (response.data.success) {
        showToast('success', 'Override Reset', 'Returns user to original saved jurisdiction.');
        loadData();
        // Reset locally to India/original saved
        setJSelectedUser({
          ...jSelectedUser,
          country: jSelectedUser.country || 'India',
          jurisdiction: jSelectedUser.country || 'India',
        });
        setJTestResult('');
      }
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    }
  };

  const handleRunAITest = async () => {
    if (!jSelectedUser || !jTestQuery.trim()) {
      showToast('error', 'Input Required', 'Please enter a test query.');
      return;
    }
    setJRunningTest(true);
    setJTestResult('');
    try {
      const response = await apiClient.post('/admin/jurisdiction-override/test', {
        userId: jSelectedUser._id,
        prompt: jTestQuery,
      });

      if (response.data.success) {
        setJTestResult(response.data.answer);
      } else {
        showToast('error', 'Test Failed', response.data.message || 'Execution error');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Execution error';
      showToast('error', 'Test Failed', errMsg);
    } finally {
      setJRunningTest(false);
    }
  };

  // --- FILTERED LISTS ---
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const uName = String(u.name || u.displayName || 'Advocate User').toLowerCase();
      const uEmail = String(u.email || '').toLowerCase();
      const sQuery = globalSearch.toLowerCase().trim();
      const matchSearch = !sQuery || uName.includes(sQuery) || uEmail.includes(sQuery);
      if (!matchSearch) return false;
      if (userFilter === 'free') return String(u.currentPlan || '').toLowerCase() === 'free' || String(u.currentPlan || '').toLowerCase().includes('basic');
      if (userFilter === 'premium') return String(u.currentPlan || '').toLowerCase() !== 'free';
      if (userFilter === 'suspended') return u.isBlocked === true;
      return true;
    });
  }, [usersList, globalSearch, userFilter]);

  const uniquePaymentsList = useMemo(() => {
    const seen = new Set();
    const result: any[] = [];
    for (const p of paymentsList) {
      const key = p.transactionId || p.invoiceNumber || p._id;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      result.push(p);
    }
    return result;
  }, [paymentsList]);

  const filteredPayments = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    return uniquePaymentsList.filter(p => {
      const matchSearch = !q || 
        p.userId?.name?.toLowerCase().includes(q) || 
        p.userId?.email?.toLowerCase().includes(q) || 
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.transactionId?.toLowerCase().includes(q) ||
        p.gateway?.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (billingFilter !== 'all') {
        const normStatus = p.status === 'paid' ? 'success' : p.status;
        return normStatus === billingFilter;
      }
      return true;
    });
  }, [uniquePaymentsList, globalSearch, billingFilter]);

  const liveBillingStats = useMemo(() => {
    const rev = uniquePaymentsList.reduce((acc, p) => (p.status === 'success' || p.status === 'paid') ? acc + (Number(p.amount) || 0) : acc, 0);
    const succ = uniquePaymentsList.filter(p => p.status === 'success' || p.status === 'paid').length;
    const pend = uniquePaymentsList.filter(p => p.status === 'pending').length;
    const ref = uniquePaymentsList.filter(p => p.status === 'refunded').length;
    return {
      totalRevenue: rev,
      successCount: succ,
      pendingCount: pend,
      refundedCount: ref,
      totalCount: uniquePaymentsList.length
    };
  }, [uniquePaymentsList]);

  const filteredFeatures = useMemo(() => {
    return featuresList.filter(f => {
      const matchSearch = f.title?.toLowerCase().includes(globalSearch.toLowerCase()) || f.description?.toLowerCase().includes(globalSearch.toLowerCase()) || f.email?.toLowerCase().includes(globalSearch.toLowerCase());
      if (!matchSearch) return false;
      if (featureFilterState !== 'all') return f.status === featureFilterState;
      return true;
    });
  }, [featuresList, globalSearch, featureFilterState]);

  const filteredBugs = useMemo(() => {
    return bugsList.filter(b => {
      const matchSearch = b.title?.toLowerCase().includes(globalSearch.toLowerCase()) || b.description?.toLowerCase().includes(globalSearch.toLowerCase()) || b.email?.toLowerCase().includes(globalSearch.toLowerCase());
      if (!matchSearch) return false;
      if (bugSeverityFilter !== 'all' && b.severity !== bugSeverityFilter) return false;
      if (bugStatusFilter !== 'all' && b.status !== bugStatusFilter) return false;
      return true;
    });
  }, [bugsList, globalSearch, bugSeverityFilter, bugStatusFilter]);

  const handleUpdateComplaintStatus = async (id: string, status: string) => {
    try {
      const res = await apiClient.patch(`/complaints/${id}/status`, { status });
      if (res.data?.success) {
        showToast('success', 'Status Saved', `Complaint status set to ${status}`);
        if (selectedComplaint && (selectedComplaint._id === id || selectedComplaint.complaintId === id)) {
          setSelectedComplaint({ ...selectedComplaint, status });
        }
        loadData(true);
      }
    } catch (err: any) {
      showToast('error', 'Failed', 'Could not update complaint status.');
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaintsList.filter(c => {
      const sQuery = globalSearch.toLowerCase().trim();
      const matchSearch = !sQuery || 
        (c.complaintId && String(c.complaintId).toLowerCase().includes(sQuery)) ||
        (c.userName && String(c.userName).toLowerCase().includes(sQuery)) ||
        (c.userEmail && String(c.userEmail).toLowerCase().includes(sQuery)) ||
        (c.category && String(c.category).toLowerCase().includes(sQuery)) ||
        (c.comment && String(c.comment).toLowerCase().includes(sQuery)) ||
        (c.originalPrompt && String(c.originalPrompt).toLowerCase().includes(sQuery));
      if (!matchSearch) return false;
      if (complaintStatusFilter !== 'all' && c.status !== complaintStatusFilter) return false;
      return true;
    });
  }, [complaintsList, globalSearch, complaintStatusFilter]);

  const getFriendlyFeatureName = (crash: any) => {
    const route = String(crash?.route || '').toLowerCase();
    const msg = String(crash?.message || '').toLowerCase();
    const err = String(crash?.errorName || '').toLowerCase();
    const text = `${route} ${msg} ${err}`;

    if (text.includes('draft') || text.includes('draft_maker') || text.includes('draft-maker')) return '🛠️ Draft Maker';
    if (text.includes('precedent') || text.includes('legal_precedent') || text.includes('legal-precedents')) return '📚 Legal Precedents';
    if (text.includes('predictor') || text.includes('case_predictor') || text.includes('case-predictor')) return '🔮 Case Predictor';
    if (text.includes('contract') || text.includes('contract_analyzer') || text.includes('contract-analyzer')) return '📄 Contract Analyzer';
    if (text.includes('argument') || text.includes('argument_builder') || text.includes('argument-builder')) return '🎯 Argument Builder';
    if (text.includes('evidence') || text.includes('evidence_analyst') || text.includes('evidence-analyst')) return '🔍 Evidence Analyst';
    if (text.includes('strategy') || text.includes('strategy_engine') || text.includes('strategy-engine')) return '💡 Strategy Engine';
    if (text.includes('courtroom') || text.includes('mock_courtroom') || text.includes('mock-courtroom')) return '🏛️ Mock Courtroom';
    if (text.includes('research') || text.includes('research_assistant') || text.includes('research-assistant')) return '🔎 Research Assistant';
    if (text.includes('knowledge') || text.includes('knowledge_hub') || text.includes('knowledge-hub')) return '📖 Knowledge Hub';
    if (text.includes('client-communication') || text.includes('communication')) return '💬 Client Communication';
    if (text.includes('client-connect') || text.includes('connect')) return '👥 Client Connect';
    if (text.includes('meeting') || text.includes('meeting_assistant') || text.includes('meeting-assistant')) return '📅 Meeting Assistant';
    if (text.includes('quiz') || text.includes('quiz_practice') || text.includes('quiz-practice')) return '📝 Quiz Practice';
    if (text.includes('notes') || text.includes('notes_maker') || text.includes('notes-maker')) return '📓 Notes Maker';
    if (text.includes('assignment') || text.includes('case_assignment') || text.includes('case-assignment')) return '📋 Case Assignment';
    if (text.includes('chat') || text.includes('conversation')) return '💬 AI Legal Chat';
    if (text.includes('case') || text.includes('matter')) return '⚖️ Case Management';
    if (text.includes('subscript') || text.includes('plan') || text.includes('billing')) return '💳 Subscription & Billing';
    if (text.includes('auth') || text.includes('login') || text.includes('register')) return '🔐 Login & Sign Up';
    if (text.includes('workspace')) return '🏢 Workspace Management';
    return '⚡ App Feature';
  };

  const filteredCrashes = useMemo(() => {
    return crashesList.filter((c) => {
      if (crashSourceFilter !== 'all' && c.source !== crashSourceFilter) return false;
      if (crashPlatformFilter !== 'all' && c.platform !== crashPlatformFilter) return false;
      if (crashStatusFilter !== 'all' && c.status !== crashStatusFilter) return false;
      if (crashFeatureFilter !== 'all') {
        const featName = getFriendlyFeatureName(c);
        if (!featName.toLowerCase().includes(crashFeatureFilter.toLowerCase())) return false;
      }
      if (globalSearch) {
        const q = globalSearch.toLowerCase().trim();
        const matchMsg = (c.message || '').toLowerCase().includes(q);
        const matchErr = (c.errorName || '').toLowerCase().includes(q);
        const matchEmail = (c.userEmail || '').toLowerCase().includes(q);
        const matchRoute = (c.route || '').toLowerCase().includes(q);
        const matchFeat = getFriendlyFeatureName(c).toLowerCase().includes(q);
        if (!matchMsg && !matchErr && !matchEmail && !matchRoute && !matchFeat) return false;
      }
      return true;
    });
  }, [crashesList, crashSourceFilter, crashPlatformFilter, crashStatusFilter, crashFeatureFilter, globalSearch]);

  const handleUpdateCrashStatus = async (id: string, status: string) => {
    try {
      const res = await apiClient.patch(`/admin/crashes/${id}/status`, { status });
      if (res.data?.success) {
        showToast('success', 'Crash Updated', `Status updated to ${status}`);
        if (selectedCrash && selectedCrash._id === id) {
          setSelectedCrash({ ...selectedCrash, status });
        }
        loadData(true);
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Failed to update crash status');
    }
  };

  const handleClearResolvedCrashes = async () => {
    Alert.alert(
      'Clear Resolved Crashes',
      'Are you sure you want to delete all resolved crash records from the system?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Resolved',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete('/admin/crashes/clear');
              if (res.data?.success) {
                showToast('success', 'Crashes Cleared', res.data.message || 'Cleared resolved crash logs');
                loadData();
              }
            } catch (err: any) {
              showToast('error', 'Action Failed', err.message || 'Failed to clear crashes');
            }
          }
        }
      ]
    );
  };

  const handleGenerateTestCrash = async () => {
    try {
      await apiClient.post('/admin/crashes', {
        errorName: 'DraftMakerTimeoutError',
        message: 'Draft Maker Tool failed to generate legal document response',
        stack: `Error: Draft Maker Timeout\n    at DraftMakerScreen (src/app/tools/draft-maker.tsx:88:14)\n    at ${new Date().toISOString()}`,
        source: 'frontend',
        platform: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web',
        userEmail: 'user@ailegal.com',
        route: 'Draft Maker Tool (/tools/draft-maker)',
        severity: 'HIGH'
      });
      showToast('success', 'Test Crash Logged', 'A new Draft Maker test crash log was generated!');
      loadData(true);
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to create test crash');
    }
  };

  const c = (light: string, dark: string) => (isDark ? dark : light);

  const dynamicBg = c('#F8FAFC', '#0B0E14');
  const dynamicHeaderBg = c('#FFFFFF', '#11161D');
  const dynamicCardBg = c('#FFFFFF', '#161B22');
  const dynamicSubCardBg = c('#F8FAFC', '#0D1117');
  const dynamicBorder = c('#E2E8F0', '#21262D');
  const dynamicTextPrimary = c('#1E293B', '#F0F6FC');
  const dynamicTextSecondary = c('#64748B', '#8B949E');
  const dynamicBtnBg = c('#FFFFFF', '#21262D');
  const dynamicBtnText = c('#475569', '#C9D1D9');

  if (!isAuthorized) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.unauthorizedWrapper}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={[styles.unauthorizedTitleText, { color: theme.textPrimary }]}>Access Denied</Text>
          <Text style={[styles.unauthorizedSubtitle, { color: theme.textSecondary }]}>
            Only authorized administrator roles are allowed to access the AI Legal System Console.
          </Text>
          <TouchableOpacity style={[styles.backHomeBtn, { backgroundColor: theme.primary }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}>
            <Text style={styles.backHomeBtnText}>Return to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicBg }]} edges={['top']}>
      
      {/* AppBar Header */}
      <View style={[styles.header, { borderBottomColor: dynamicBorder, backgroundColor: dynamicHeaderBg }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={dynamicTextPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: dynamicTextPrimary }]}>AI LEGAL ADMIN CONSOLE</Text>
          <Text style={[styles.headerSubtitle, { color: dynamicTextSecondary }]}>Enterprise SaaS Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => loadData()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs Bar */}
      <View style={[styles.tabsBar, { borderBottomColor: dynamicBorder, backgroundColor: dynamicHeaderBg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.tabBtn,
                  { backgroundColor: dynamicCardBg, borderColor: dynamicBorder },
                  isActive && [styles.tabBtnActive, { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(200, 163, 77, 0.18)' : theme.primaryLight }],
                ]}
                onPress={() => {
                  setActiveTab(tab.id);
                  setGlobalSearch('');
                }}
              >
                <Ionicons name={tab.icon as any} size={15} color={isActive ? theme.primary : dynamicTextSecondary} />
                <Text style={[styles.tabText, { color: dynamicTextSecondary }, isActive && { color: theme.primary, fontWeight: '800' }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 10, fontSize: 13, color: dynamicTextSecondary }}>Fetching live database logs...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <View style={{ gap: 16 }}>
              {/* Analytics summary grid */}
              <View style={styles.gridRow}>
                <View style={[styles.analyticsCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.cardTitleText, { color: dynamicTextSecondary }]}>TOTAL REGISTERED USERS</Text>
                  <Text style={[styles.statsBigNumber, { color: dynamicTextPrimary }]}>{stats.totalUsers || 0}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 9.5, color: '#10B981', fontWeight: '700' }}>● {stats.onlineUsers || 0} Online</Text>
                    <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>• {stats.activeUsers || 0} Active (30d)</Text>
                  </View>
                </View>

                <View style={[styles.analyticsCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.cardTitleText, { color: dynamicTextSecondary }]}>PLAN COMPOSITION</Text>
                  <Text style={[styles.statsBigNumber, { color: dynamicTextPrimary }]}>{stats.premiumUsers || 0} Pro</Text>
                  <Text style={[styles.timelineLabel, { color: dynamicTextSecondary }]}>{stats.freeUsers || 0} Free Advocates</Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={[styles.analyticsCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.cardTitleText, { color: dynamicTextSecondary }]}>MONTHLY REVENUE</Text>
                  <Text style={[styles.statsBigNumber, { color: '#10B981' }]}>₹{(stats.revenueMonth || 0).toLocaleString('en-IN')}</Text>
                  <Text style={[styles.timelineLabel, { color: dynamicTextSecondary }]}>Today: ₹{(stats.revenueToday || 0).toLocaleString('en-IN')} • Lifetime: ₹{(stats.revenueLifetime || 0).toLocaleString('en-IN')}</Text>
                </View>

                <View style={[styles.analyticsCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.cardTitleText, { color: dynamicTextSecondary }]}>AI RESOURCE SPENT</Text>
                  <Text style={[styles.statsBigNumber, { color: dynamicTextPrimary }]}>{(stats.totalCreditsUsed || 0).toLocaleString()}</Text>
                  <Text style={[styles.timelineLabel, { color: dynamicTextSecondary }]}>Total AI Transaction units consumed</Text>
                </View>
              </View>

              {/* Visual Daily Active User representation */}
              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>Daily Activity Graph (7 days)</Text>
                <Text style={[styles.categoryDesc, { color: dynamicTextSecondary }]}>Aggregated logins and API queries across active user rooms.</Text>
                <View style={styles.graphContainer}>
                  {(Array.isArray(stats.dailyActivity) && stats.dailyActivity.length > 0
                    ? stats.dailyActivity
                    : [
                        { label: 'Wed', val: 5 },
                        { label: 'Thu', val: 24 },
                        { label: 'Fri', val: 73 },
                        { label: 'Sat', val: 61 },
                        { label: 'Sun', val: 113 },
                        { label: 'Mon', val: 37 },
                        { label: 'Tue', val: 11 },
                      ]
                  ).map((day: any, idx: number) => {
                    const maxVal = Math.max(1, ...(stats.dailyActivity || []).map((d: any) => d.val || 0));
                    const barHeight = Math.max(8, Math.min(60, ((day.val || 0) / maxVal) * 55));
                    return (
                      <View key={idx} style={styles.graphColumnWrapper}>
                        <View style={[styles.graphBar, { height: barHeight, backgroundColor: theme.primary }]} />
                        <Text style={{ fontSize: 8, color: dynamicTextSecondary, marginTop: 4 }}>{day.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Tool specific usage aggregates */}
              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>AI Feature Core Usage Analytics</Text>
                <Text style={[styles.categoryDesc, { color: dynamicTextSecondary }]}>Real database metrics from generated intelligence records.</Text>
                
                <View style={styles.usageListGrid}>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>Cases Managed</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.totalCases ?? 0} cases</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>Contracts Analyzed</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.contractsAnalyzed ?? 0} analysis</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>Strategy Engine Reports</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.strategyReports ?? 0} reports</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>Case Predictor Models</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.casePredictorReports ?? 0} predictions</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>Drafts Generated</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.draftsGenerated ?? 0} drafts</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>AI Chats Initiated</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.chatUsage ?? 0} chats</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>API Transactions</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.apiUsage ?? 0} logs</Text>
                  </View>
                  <View style={styles.usageGridItem}>
                    <Text style={[styles.usageGridLabel, { color: dynamicTextSecondary }]}>Storage Consumption</Text>
                    <Text style={[styles.usageGridVal, { color: dynamicTextPrimary }]}>{stats.storageUsed ?? 0} MB</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <View style={{ gap: 14 }}>
              {/* Search & Filters */}
              <View style={[styles.searchBarContainer, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Ionicons name="search" size={18} color={dynamicTextSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInputInputField, { color: dynamicTextPrimary }]}
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                  placeholder="Search by name or email..."
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View style={styles.filtersRow}>
                {['all', 'free', 'premium', 'suspended'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, userFilter === f && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                    onPress={() => setUserFilter(f as any)}
                  >
                    <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, userFilter === f && { color: theme.primary, fontWeight: '700' }]}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredUsers.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="people-outline" size={32} color={dynamicTextSecondary} />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary }]}>No Registered Users Match</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {filteredUsers.map((u) => (
                    <View key={u._id} style={[styles.userListItemCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                      <View style={styles.userListItemHeader}>
                        <View style={[styles.avatarCircle, { backgroundColor: dynamicBtnBg }]}>
                          <Text style={[styles.avatarCircleText, { color: dynamicBtnText }]}>{u.name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.userListNameText, { color: dynamicTextPrimary }]}>{u.name || 'Advocate Client'}</Text>
                          <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 1 }}>{u.email}</Text>
                        </View>
                        <View style={[styles.userListPlanBadge, { backgroundColor: u.isBlocked ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : (isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7') }]}>
                          <Text style={[styles.userListPlanText, { color: u.isBlocked ? '#EF4444' : '#10B981' }]}>{u.isBlocked ? 'Suspended' : 'Active'}</Text>
                        </View>
                      </View>

                      <View style={[styles.userListItemDetailsRow, { borderBottomColor: dynamicBorder }]}>
                        <Text style={[styles.metaRowLabel, { color: dynamicTextSecondary }]}>Role: <Text style={{ fontWeight: '700', color: dynamicTextPrimary, textTransform: 'capitalize' }}>{u.role || 'Advocate'}</Text></Text>
                        <Text style={[styles.metaRowLabel, { color: dynamicTextSecondary }]}>Plan: <Text style={{ fontWeight: '800', color: theme.primary }}>{u.currentPlan}</Text></Text>
                        <Text style={[styles.metaRowLabel, { color: dynamicTextSecondary }]}>Cases: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{u.totalCases || 0}</Text></Text>
                      </View>

                      <View style={styles.userCardActionRow}>
                        <TouchableOpacity style={[styles.userRowBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, flex: 1 }]} onPress={() => setSelectedUser(u)}>
                          <Text style={[styles.userRowBtnText, { color: dynamicBtnText }]}>View Profile</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 3: BILLING */}
          {activeTab === 'billing' && (
            <View style={{ gap: 16 }}>
              {/* Dynamic Live KPI Metrics Bar */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={[styles.kpiMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140 }]}>
                  <Text style={[styles.kpiMiniLabel, { color: dynamicTextSecondary }]}>Total Revenue</Text>
                  <Text style={[styles.kpiMiniValue, { color: '#10B981' }]}>
                    ₹{liveBillingStats.totalRevenue.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, marginTop: 2 }}>Gross Collected</Text>
                </View>

                <View style={[styles.kpiMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140 }]}>
                  <Text style={[styles.kpiMiniLabel, { color: dynamicTextSecondary }]}>Paid Invoices</Text>
                  <Text style={[styles.kpiMiniValue, { color: theme.primary }]}>
                    {liveBillingStats.successCount}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, marginTop: 2 }}>Successful Transactions</Text>
                </View>

                <View style={[styles.kpiMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140 }]}>
                  <Text style={[styles.kpiMiniLabel, { color: dynamicTextSecondary }]}>Pending</Text>
                  <Text style={[styles.kpiMiniValue, { color: '#F59E0B' }]}>
                    {liveBillingStats.pendingCount}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, marginTop: 2 }}>Awaiting Payment</Text>
                </View>

                <View style={[styles.kpiMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140 }]}>
                  <Text style={[styles.kpiMiniLabel, { color: dynamicTextSecondary }]}>Refunded</Text>
                  <Text style={[styles.kpiMiniValue, { color: '#EF4444' }]}>
                    {liveBillingStats.refundedCount}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, marginTop: 2 }}>Reversed Payments</Text>
                </View>
              </View>

              {/* Real-time Indicator & Search */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: dynamicTextSecondary }}>
                    Live Socket Stream • {filteredPayments.length} of {liveBillingStats.totalCount} Invoices
                  </Text>
                </View>
                <TouchableOpacity style={[styles.exportReportBtnInline, { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.15)' : '#EFF6FF', borderColor: theme.primary }]} onPress={handleExportCSV}>
                  <Ionicons name="cloud-download-outline" size={14} color={theme.primary} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary, marginLeft: 4 }}>CSV Export</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchBarContainer, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Ionicons name="search" size={18} color={dynamicTextSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInputInputField, { color: dynamicTextPrimary }]}
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                  placeholder="Search invoice number, user name, email, or TXN ID..."
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View style={styles.filtersRow}>
                {['all', 'success', 'pending', 'refunded', 'failed'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, billingFilter === f && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                    onPress={() => setBillingFilter(f as any)}
                  >
                    <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, billingFilter === f && { color: theme.primary, fontWeight: '700' }]}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.categoryHeading, { color: dynamicTextPrimary, marginBottom: 12 }]}>Transactions & Invoices</Text>

                {filteredPayments.length === 0 ? (
                  <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Ionicons name="card-outline" size={32} color={dynamicTextSecondary} />
                    <Text style={[styles.emptyStateText, { color: dynamicTextSecondary }]}>No Payments Found</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {filteredPayments.map((p) => {
                      const isSuccess = p.status === 'success' || p.status === 'paid';
                      const isRefunded = p.status === 'refunded';
                      const isPending = p.status === 'pending';
                      const statusColor = isSuccess ? '#10B981' : isRefunded ? '#F59E0B' : isPending ? '#3B82F6' : '#EF4444';

                      return (
                        <View key={p._id || p.transactionId} style={[styles.paymentItemRow, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: dynamicTextPrimary }}>
                                {p.userId?.name || 'Aisa Customer'}
                              </Text>
                              <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 2 }}>
                                {p.userId?.email || 'N/A'} • Invoice: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{p.invoiceNumber || p._id}</Text>
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: statusColor }}>
                              ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center' }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '700', color: dynamicTextSecondary }}>
                                Gateway: {p.gateway || 'Razorpay'}
                              </Text>
                            </View>
                            {p.planId && (
                              <View style={{ backgroundColor: isDark ? 'rgba(200, 163, 77, 0.15)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#B45309' }}>
                                  Plan: {typeof p.planId === 'object' ? (p.planId.planName || p.planId._id) : p.planId}
                                </Text>
                              </View>
                            )}
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>
                              GST (18%): ₹{p.gst ? Number(p.gst).toFixed(2) : ((p.amount || 0) * 0.18).toFixed(2)}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 0.5, borderTopColor: dynamicBorder, paddingTop: 8 }}>
                            <Text style={{ fontSize: 9, color: dynamicTextSecondary, flex: 1, marginRight: 8 }} numberOfLines={1}>
                              TXN: {p.transactionId || 'N/A'} • {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today'}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {isPending && (
                                <TouchableOpacity style={styles.smallPaidBtn} onPress={() => handleMarkPaid(p._id)}>
                                  <Text style={styles.smallBtnText}>Mark Paid</Text>
                                </TouchableOpacity>
                              )}
                              {isSuccess && (
                                <TouchableOpacity style={styles.smallRefundBtn} onPress={() => handleRefund(p._id)}>
                                  <Text style={[styles.smallBtnText, { color: '#EF4444' }]}>Refund</Text>
                                </TouchableOpacity>
                              )}
                              <View style={{ backgroundColor: `${statusColor}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: `${statusColor}40` }}>
                                <Text style={{ fontSize: 9.5, color: statusColor, fontWeight: '900', letterSpacing: 0.5 }}>
                                  {(p.status || 'SUCCESS').toUpperCase()}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB: PLANS DASHBOARD */}
          {activeTab === 'plans' && (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>Subscription Plans & Pricing</Text>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                    Manage Student, Advocate, Law Firm & Combo plans, edit prices (₹), credits, and feature lists.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.exportReportBtnInline, { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                  onPress={handleOpenPlanCreator}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', marginLeft: 2 }}>+ Create Plan</Text>
                </TouchableOpacity>
              </View>

              {plansList.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="pricetags-outline" size={32} color={dynamicTextSecondary} />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary, marginTop: 6 }]}>No Subscription Plans Loaded</Text>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  {plansList.map((plan) => {
                    const isPopular = plan.isPopular;
                    const isActive = plan.isActive !== false;
                    return (
                      <View
                        key={plan._id || plan.planId}
                        style={[
                          styles.categoryCard,
                          { backgroundColor: dynamicCardBg, borderColor: isPopular ? '#C8A34D' : dynamicBorder },
                          isPopular && { borderWidth: 1.5 },
                        ]}
                      >
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: dynamicTextPrimary }}>
                                {plan.planName}
                              </Text>
                              {plan.badge ? (
                                <View style={{ backgroundColor: '#C8A34D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>{plan.badge}</Text>
                                </View>
                              ) : null}
                              {isPopular && (
                                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>POPULAR</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 2 }}>
                              ID: {plan.planId} • {isActive ? '🟢 Active' : '🔴 Disabled'}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={{ backgroundColor: '#C8A34D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              onPress={() => handleOpenPlanEdit(plan)}
                            >
                              <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: '#EF4444', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }}
                              onPress={() => handleDeletePlan(plan._id)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Pricing Grid */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, backgroundColor: dynamicSubCardBg, padding: 8, borderRadius: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>MONTHLY</Text>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 1 }}>₹{plan.priceMonthly}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>YEARLY</Text>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#3B82F6', marginTop: 1 }}>₹{plan.priceYearly}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>AI CREDITS</Text>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#C8A34D', marginTop: 1 }}>{plan.credits || 0}</Text>
                          </View>
                        </View>

                        {/* Features List */}
                        <View style={{ marginTop: 10 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: dynamicTextSecondary, textTransform: 'uppercase', marginBottom: 4 }}>Features Included:</Text>
                          {Array.isArray(plan.features) && plan.features.length > 0 ? (
                            <View style={{ gap: 4 }}>
                              {plan.features.map((feat: string, idx: number) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                  <Text style={{ fontSize: 11.5, color: dynamicTextPrimary, flex: 1 }}>{feat}</Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={{ fontSize: 11, color: dynamicTextSecondary, fontStyle: 'italic' }}>No features listed for this plan.</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB: COUPONS MANAGEMENT */}
          {activeTab === 'coupons' && (
            <View style={{ gap: 16 }}>
              {/* GLOBAL COUPON FEATURE TOGGLE BANNER */}
              <View
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: dynamicCardBg,
                    borderColor: couponFeatureEnabled ? '#10B981' : '#EF4444',
                    borderLeftWidth: 4,
                    padding: 14,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Ionicons name="ticket-outline" size={18} color={couponFeatureEnabled ? '#10B981' : '#EF4444'} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: dynamicTextPrimary }}>
                      Coupon Feature Status:
                    </Text>
                    <View
                      style={{
                        backgroundColor: couponFeatureEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: couponFeatureEnabled ? '#10B981' : '#EF4444' }}>
                        {couponFeatureEnabled ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 4, lineHeight: 15 }}>
                    {couponFeatureEnabled
                      ? 'Active: "Have a coupon code?" card is currently displayed on the mobile payment screen.'
                      : 'Inactive: "Have a coupon code?" card is completely hidden on the mobile payment screen (only Upgrade button is visible).'}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleToggleCouponFeature}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: couponFeatureEnabled ? '#10B981' : (isDark ? '#27272A' : '#E5E7EB'),
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    gap: 6,
                  }}
                >
                  <Ionicons name={couponFeatureEnabled ? "checkmark-circle" : "close-circle"} size={16} color={couponFeatureEnabled ? "#FFFFFF" : dynamicTextSecondary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '900', color: couponFeatureEnabled ? "#FFFFFF" : dynamicTextPrimary }}>
                    {couponFeatureEnabled ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Header & Create Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>Coupons & Discount System</Text>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                    Manage promotional codes, plan eligibility, usage limits, and redemption statistics.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.exportReportBtnInline, { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                  onPress={handleOpenCouponCreator}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', marginLeft: 2 }}>+ Create Coupon</Text>
                </TouchableOpacity>
              </View>

              {/* Metric Summary Cards Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140, padding: 12 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: dynamicTextSecondary, textTransform: 'uppercase' }}>Total Coupons</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: dynamicTextPrimary, marginTop: 4 }}>{couponStats.totalCoupons || couponsList.length || 0}</Text>
                </View>
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140, padding: 12 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: dynamicTextSecondary, textTransform: 'uppercase' }}>Active Coupons</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981', marginTop: 4 }}>{couponStats.activeCoupons || 0}</Text>
                </View>
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140, padding: 12 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: dynamicTextSecondary, textTransform: 'uppercase' }}>Expired Coupons</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B', marginTop: 4 }}>{couponStats.expiredCoupons || 0}</Text>
                </View>
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140, padding: 12 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: dynamicTextSecondary, textTransform: 'uppercase' }}>Total Coupon Uses</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#3B82F6', marginTop: 4 }}>{couponStats.totalCouponUses || 0}</Text>
                </View>
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 140, padding: 12 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: dynamicTextSecondary, textTransform: 'uppercase' }}>Total Discount Given</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#C8A34D', marginTop: 4 }}>₹{(couponStats.totalDiscountGiven || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Coupons List */}
              {couponsList.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="ticket-outline" size={36} color={dynamicTextSecondary} />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary, marginTop: 6 }]}>No Coupons Created Yet</Text>
                  <TouchableOpacity style={[styles.adjustSubmitBtn, { backgroundColor: '#C8A34D', marginTop: 12, paddingHorizontal: 16 }]} onPress={handleOpenCouponCreator}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Create First Coupon</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {couponsList.map((c) => {
                    const status = c.computedStatus || (c.status === 'inactive' ? 'INACTIVE' : 'ACTIVE');
                    const statusBg =
                      status === 'ACTIVE'
                        ? isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7'
                        : status === 'SCHEDULED'
                        ? isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE'
                        : status === 'EXPIRED'
                        ? isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7'
                        : status === 'EXHAUSTED'
                        ? isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'
                        : isDark ? 'rgba(156, 163, 175, 0.2)' : '#F3F4F6';

                    const statusColor =
                      status === 'ACTIVE'
                        ? '#10B981'
                        : status === 'SCHEDULED'
                        ? '#3B82F6'
                        : status === 'EXPIRED'
                        ? '#F59E0B'
                        : status === 'EXHAUSTED'
                        ? '#EF4444'
                        : '#6B7280';

                    const discountLabel = c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`;

                    return (
                      <View key={c._id} style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                        {/* Header Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <View style={{ backgroundColor: 'rgba(200, 163, 77, 0.15)', borderWidth: 1, borderColor: '#C8A34D', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#C8A34D', letterSpacing: 1 }}>{c.code}</Text>
                              </View>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: copiedCouponCode === c.code ? '#10B981' : (isDark ? 'rgba(200, 163, 77, 0.2)' : '#FEF3C7'),
                                  borderWidth: 1,
                                  borderColor: copiedCouponCode === c.code ? '#10B981' : '#C8A34D',
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onPress={() => handleCopyCouponCode(c.code)}
                              >
                                <Ionicons name={copiedCouponCode === c.code ? "checkmark-circle" : "copy-outline"} size={13} color={copiedCouponCode === c.code ? '#FFFFFF' : '#C8A34D'} />
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: copiedCouponCode === c.code ? '#FFFFFF' : '#C8A34D' }}>
                                  {copiedCouponCode === c.code ? 'Copied ✓' : 'Copy'}
                                </Text>
                              </TouchableOpacity>
                              <View style={{ backgroundColor: isDark ? '#27272A' : '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextPrimary }}>{discountLabel}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 6 }}>
                              Applicable: {Array.isArray(c.applicablePlans) && c.applicablePlans.includes('ALL') ? 'All Plans' : c.applicablePlans.join(', ')}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '900', color: statusColor }}>{status}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Details Grid */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, backgroundColor: dynamicSubCardBg, padding: 10, borderRadius: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>VALIDITY</Text>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: dynamicTextPrimary, marginTop: 2 }}>
                              {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Now'} – {new Date(c.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>USAGE</Text>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D', marginTop: 2 }}>
                              {c.usedCount || 0} / {c.usageLimit !== null && c.usageLimit !== undefined ? c.usageLimit : '∞'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>PER USER</Text>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: dynamicTextPrimary, marginTop: 2 }}>{c.perUserLimit || 1} use</Text>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12, borderTopWidth: 0.5, borderTopColor: dynamicBorder, paddingTop: 8 }}>
                          <TouchableOpacity
                            style={[styles.smallPlanEditBtn, { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(200, 163, 77, 0.1)' : '#EFF6FF' }]}
                            onPress={() => handleViewCouponDetails(c._id)}
                          >
                            <Ionicons name="stats-chart-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.primary }}>Stats</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallPlanEditBtn, { borderColor: '#C8A34D', backgroundColor: isDark ? 'rgba(200, 163, 77, 0.15)' : '#FEF3C7' }]}
                            onPress={() => handleOpenCouponEdit(c)}
                          >
                            <Ionicons name="create-outline" size={13} color="#C8A34D" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#C8A34D' }}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallPlanEditBtn, { borderColor: c.status === 'active' ? '#F59E0B' : '#10B981', backgroundColor: c.status === 'active' ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB') : (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') }]}
                            onPress={() => handleToggleCouponStatus(c._id)}
                          >
                            <Ionicons name={c.status === 'active' ? 'pause-outline' : 'play-outline'} size={13} color={c.status === 'active' ? '#F59E0B' : '#10B981'} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: c.status === 'active' ? '#F59E0B' : '#10B981' }}>
                              {c.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallPlanEditBtn, { borderColor: '#EF4444', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}
                            onPress={() => handleDeleteCoupon(c._id, c.code)}
                          >
                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 4: FEATURE REQUESTS */}
          {activeTab === 'features' && (
            <View style={{ gap: 14 }}>
              <View style={[styles.searchBarContainer, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Ionicons name="search" size={18} color={dynamicTextSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInputInputField, { color: dynamicTextPrimary }]}
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                  placeholder="Search feature requests..."
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View style={styles.filtersRow}>
                {['all', 'Pending', 'Under Review', 'Planned', 'In Progress', 'Completed'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, featureFilterState === f && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                    onPress={() => setFeatureFilterState(f as any)}
                  >
                    <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, featureFilterState === f && { color: theme.primary, fontWeight: '700' }]}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredFeatures.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="bulb-outline" size={32} color={dynamicTextSecondary} />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary }]}>No Feature Requests Found</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {filteredFeatures.map((fr) => (
                    <View key={fr._id} style={[styles.bugReportCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                      <View style={styles.bugCardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.bugRefText, { color: dynamicTextPrimary }]}>{fr.category}</Text>
                          <View style={[styles.severityBadge, { backgroundColor: fr.priority === 'Critical' ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : (isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE') }]}>
                            <Text style={[styles.severityBadgeText, { color: fr.priority === 'Critical' ? '#EF4444' : '#3B82F6' }]}>{fr.priority}</Text>
                          </View>
                        </View>
                        <View style={[styles.bugStatusBadge, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : '#FEF3C7' }]}>
                          <Text style={[styles.bugStatusText, { color: isDark ? '#FBBF24' : '#B45309' }]}>{fr.status}</Text>
                        </View>
                      </View>

                      <Text style={[styles.bugTitleText, { color: dynamicTextPrimary }]}>{fr.title}</Text>
                      <Text style={[styles.bugDescriptionText, { color: dynamicBtnText }]}>{fr.description}</Text>

                      <View style={styles.metaRowDetails}>
                        <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>User: {fr.email} ({fr.userPlan})</Text>
                        <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>Assigned Dev: {fr.developerAssigned || 'None'}</Text>
                      </View>

                      {fr.reply ? (
                        <View style={[styles.devReplyContainer, { backgroundColor: dynamicSubCardBg }]}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: theme.primary }}>Dev Reply:</Text>
                          <Text style={{ fontSize: 10.5, color: dynamicBtnText, marginTop: 2 }}>{fr.reply}</Text>
                        </View>
                      ) : null}

                      <View style={styles.bugActionBtnRow}>
                        <TouchableOpacity style={[styles.bugActionBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder }]} onPress={() => setSelectedFeature(fr)}>
                          <Text style={[styles.bugActionBtnText, { color: dynamicBtnText }]}>Manage Request</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bugActionBtn, { borderColor: '#EF4444', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]} onPress={() => handleDeleteFeature(fr._id)}>
                          <Text style={[styles.bugActionBtnText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 5: BUG REPORTS */}
          {activeTab === 'bugs' && (
            <View style={{ gap: 14 }}>
              <View style={[styles.searchBarContainer, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Ionicons name="search" size={18} color={dynamicTextSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInputInputField, { color: dynamicTextPrimary }]}
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                  placeholder="Search bug reports..."
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, alignSelf: 'center', fontWeight: '800', color: dynamicTextSecondary }}>Severity:</Text>
                  {['all', 'Minor', 'Major', 'Critical'].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, bugSeverityFilter === s && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setBugSeverityFilter(s as any)}
                    >
                      <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, bugSeverityFilter === s && { color: theme.primary, fontWeight: '700' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {filteredBugs.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="bug-outline" size={32} color={dynamicTextSecondary} />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary }]}>No Bug Reports Logged</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {filteredBugs.map((bug) => (
                    <View key={bug._id} style={[styles.bugReportCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                      <View style={styles.bugCardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.bugRefText, { color: dynamicTextPrimary }]}>{bug.platform} App</Text>
                          <View style={[styles.severityBadge, { backgroundColor: bug.severity === 'Critical' ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : (isDark ? 'rgba(251, 191, 36, 0.2)' : '#FEF3C7') }]}>
                            <Text style={[styles.severityBadgeText, { color: bug.severity === 'Critical' ? '#EF4444' : '#FBBF24' }]}>{bug.severity}</Text>
                          </View>
                        </View>
                        <View style={[styles.bugStatusBadge, { backgroundColor: isDark ? '#21262D' : '#E2E8F0' }]}>
                          <Text style={[styles.bugStatusText, { color: dynamicTextSecondary }]}>{bug.status}</Text>
                        </View>
                      </View>

                      <Text style={[styles.bugTitleText, { color: dynamicTextPrimary }]}>{bug.title}</Text>
                      <Text style={[styles.bugDescriptionText, { color: dynamicBtnText }]}>{bug.description}</Text>

                      <View style={styles.metaRowDetails}>
                        <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>Device: {bug.device} • OS: {bug.osVersion}</Text>
                        <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>Reported By: {bug.email}</Text>
                        {bug.developerAssigned ? (
                          <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>Assignee: {bug.developerAssigned}</Text>
                        ) : null}
                      </View>

                      {bug.internalNotes ? (
                        <View style={[styles.devReplyContainer, { backgroundColor: dynamicSubCardBg }]}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444' }}>Internal Notes:</Text>
                          <Text style={{ fontSize: 10.5, color: dynamicBtnText, marginTop: 2 }}>{bug.internalNotes}</Text>
                        </View>
                      ) : null}

                      <View style={styles.bugActionBtnRow}>
                        <TouchableOpacity style={[styles.bugActionBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder }]} onPress={() => setSelectedBug(bug)}>
                          <Text style={[styles.bugActionBtnText, { color: dynamicBtnText }]}>Manage Bug</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bugActionBtn, { borderColor: '#EF4444', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]} onPress={() => handleDeleteBug(bug._id)}>
                          <Text style={[styles.bugActionBtnText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 8: CRASH REPORTS */}
          {activeTab === 'crashes' && (
            <View style={{ gap: 14 }}>
              {/* Summary Cards */}
              <View style={styles.statsGridRow}>
                <View style={[styles.statMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="warning-outline" size={20} color="#EF4444" />
                  <Text style={[styles.statValueText, { color: dynamicTextPrimary }]}>{crashStats.total || crashesList.length}</Text>
                  <Text style={[styles.statLabelText, { color: dynamicTextSecondary }]}>Total Crashes</Text>
                </View>
                <View style={[styles.statMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.statValueText, { color: '#F59E0B' }]}>{crashStats.unresolved || crashesList.filter(c => c.status === 'UNRESOLVED').length}</Text>
                  <Text style={[styles.statLabelText, { color: dynamicTextSecondary }]}>Unresolved</Text>
                </View>
                <View style={[styles.statMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.statValueText, { color: dynamicTextPrimary }]}>{crashStats.frontend || crashesList.filter(c => c.source === 'frontend').length}</Text>
                  <Text style={[styles.statLabelText, { color: dynamicTextSecondary }]}>Frontend (App)</Text>
                </View>
                <View style={[styles.statMiniCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="server-outline" size={20} color="#10B981" />
                  <Text style={[styles.statValueText, { color: dynamicTextPrimary }]}>{crashStats.backend || crashesList.filter(c => c.source === 'backend').length}</Text>
                  <Text style={[styles.statLabelText, { color: dynamicTextSecondary }]}>Backend (Server)</Text>
                </View>
              </View>

              {/* Search & Actions Bar */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={[styles.searchBarContainer, { flex: 1, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="search" size={18} color={dynamicTextSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInputInputField, { color: dynamicTextPrimary }]}
                    value={globalSearch}
                    onChangeText={setGlobalSearch}
                    placeholder="Search crash error, stack, route or user..."
                    placeholderTextColor={dynamicTextSecondary}
                  />
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}
                  onPress={handleClearResolvedCrashes}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Clear Resolved</Text>
                </TouchableOpacity>
              </View>

              {/* Filters */}
              <View style={{ gap: 8 }}>
                {/* 1. Feature / Tool Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, alignSelf: 'center', fontWeight: '800', color: dynamicTextSecondary, marginRight: 4 }}>Feature / Tool:</Text>
                  {[
                    { id: 'all', label: 'All Tools' },
                    { id: 'Draft Maker', label: '🛠️ Draft Maker' },
                    { id: 'Legal Precedents', label: '📚 Legal Precedents' },
                    { id: 'Case Predictor', label: '🔮 Case Predictor' },
                    { id: 'Contract Analyzer', label: '📄 Contract Analyzer' },
                    { id: 'Argument Builder', label: '🎯 Argument Builder' },
                    { id: 'Evidence Analyst', label: '🔍 Evidence Analyst' },
                    { id: 'Strategy Engine', label: '💡 Strategy Engine' },
                    { id: 'Mock Courtroom', label: '🏛️ Mock Courtroom' },
                    { id: 'Research Assistant', label: '🔎 Research Assistant' },
                    { id: 'Knowledge Hub', label: '📖 Knowledge Hub' },
                    { id: 'Client Communication', label: '💬 Client Comm' },
                    { id: 'Client Connect', label: '👥 Client Connect' },
                    { id: 'Meeting Assistant', label: '📅 Meeting Assistant' },
                    { id: 'Quiz Practice', label: '📝 Quiz Practice' },
                    { id: 'Notes Maker', label: '📓 Notes Maker' },
                    { id: 'Case Assignment', label: '📋 Case Assignment' },
                    { id: 'AI Legal Chat', label: '💬 AI Legal Chat' },
                    { id: 'Case Management', label: '⚖️ Case Management' },
                    { id: 'Subscription', label: '💳 Subscription' },
                    { id: 'Login', label: '🔐 Login & Sign Up' },
                    { id: 'Workspace', label: '🏢 Workspace' }
                  ].map((ft) => (
                    <TouchableOpacity
                      key={ft.id}
                      style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, crashFeatureFilter === ft.id && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setCrashFeatureFilter(ft.id)}
                    >
                      <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, crashFeatureFilter === ft.id && { color: theme.primary, fontWeight: '700' }]}>{ft.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 2. System Location Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, alignSelf: 'center', fontWeight: '800', color: dynamicTextSecondary, marginRight: 4 }}>Location:</Text>
                  {[
                    { id: 'all', label: 'All Locations' },
                    { id: 'frontend', label: '📱 Mobile App' },
                    { id: 'backend', label: '⚙️ Server System' },
                  ].map((src) => (
                    <TouchableOpacity
                      key={src.id}
                      style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, crashSourceFilter === src.id && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setCrashSourceFilter(src.id as any)}
                    >
                      <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, crashSourceFilter === src.id && { color: theme.primary, fontWeight: '700' }]}>{src.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 3. Resolution Status Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, alignSelf: 'center', fontWeight: '800', color: dynamicTextSecondary, marginRight: 4 }}>Status:</Text>
                  {[
                    { id: 'all', label: 'All Status' },
                    { id: 'UNRESOLVED', label: '🔴 New Error' },
                    { id: 'INVESTIGATING', label: '🟡 Under Check' },
                    { id: 'RESOLVED', label: '🟢 Fixed / Solved' },
                  ].map((st) => (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.filterPill, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }, crashStatusFilter === st.id && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setCrashStatusFilter(st.id as any)}
                    >
                      <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, crashStatusFilter === st.id && { color: theme.primary, fontWeight: '700' }]}>{st.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Crashes List */}
              {filteredCrashes.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="checkmark-circle-outline" size={36} color="#10B981" />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary }]}>No Error Reports Logged</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {filteredCrashes.map((crash) => {
                    const featureTag = getFriendlyFeatureName(crash);
                    const sourceTag = crash.source === 'frontend' ? `📱 App (${crash.platform || 'Mobile'})` : '⚙️ Backend Server';
                    const statusTag = crash.status === 'RESOLVED' ? '🟢 Fixed' : crash.status === 'INVESTIGATING' ? '🟡 Under Check' : '🔴 New Error';

                    return (
                      <View key={crash._id} style={[styles.bugReportCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                        <View style={styles.bugCardHeaderRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={[styles.severityBadge, { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.25)' : '#FEF3C7', borderWidth: 1, borderColor: '#C8A34D' }]}>
                              <Text style={[styles.severityBadgeText, { color: '#C8A34D', fontWeight: '900' }]}>{featureTag}</Text>
                            </View>
                            <View style={[styles.severityBadge, { backgroundColor: crash.source === 'backend' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE') }]}>
                              <Text style={[styles.severityBadgeText, { color: crash.source === 'backend' ? '#10B981' : '#3B82F6' }]}>{sourceTag}</Text>
                            </View>
                          </View>
                          <View style={[styles.bugStatusBadge, { backgroundColor: crash.status === 'RESOLVED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : crash.status === 'INVESTIGATING' ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') }]}>
                            <Text style={[styles.bugStatusText, { color: crash.status === 'RESOLVED' ? '#10B981' : crash.status === 'INVESTIGATING' ? '#F59E0B' : '#EF4444' }]}>{statusTag}</Text>
                          </View>
                        </View>

                        <Text style={[styles.bugTitleText, { color: '#EF4444', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 }]}>
                          {crash.errorName}: {crash.message}
                        </Text>

                        <View style={styles.metaRowDetails}>
                          <Text style={{ fontSize: 10.5, color: dynamicTextPrimary, fontWeight: '700' }}>Feature / Route: {crash.route || 'App Feature'}</Text>
                          <Text style={{ fontSize: 10, color: dynamicTextSecondary }}>User Email: {crash.userEmail || 'Guest User'}</Text>
                          <Text style={{ fontSize: 10, color: dynamicTextSecondary }}>Report Time: {new Date(crash.createdAt).toLocaleString()}</Text>
                        </View>

                      {crash.stack ? (
                        <View style={[styles.devReplyContainer, { backgroundColor: isDark ? '#0D1117' : '#F1F5F9', maxHeight: 80, overflow: 'hidden' }]}>
                          <Text style={{ fontSize: 9.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: isDark ? '#E6EDF3' : '#334155' }} numberOfLines={3}>
                            {crash.stack}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.bugActionBtnRow}>
                        <TouchableOpacity style={[styles.bugActionBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder }]} onPress={() => setSelectedCrash(crash)}>
                          <Text style={[styles.bugActionBtnText, { color: dynamicBtnText }]}>View Details & Stack</Text>
                        </TouchableOpacity>
                        {crash.status !== 'RESOLVED' && (
                          <TouchableOpacity style={[styles.bugActionBtn, { borderColor: '#10B981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]} onPress={() => handleUpdateCrashStatus(crash._id, 'RESOLVED')}>
                            <Text style={[styles.bugActionBtnText, { color: '#10B981' }]}>Mark Resolved</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
                </View>
              )}
            </View>
          )}

          {/* TAB 6: RESPONSE REPORTS (AI COMPLAINTS) */}
          {activeTab === 'reports' && (
            <View style={{ gap: 14 }}>
              <View style={[styles.searchBarContainer, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Ionicons name="search" size={18} color={dynamicTextSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInputInputField, { color: dynamicTextPrimary }]}
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                  placeholder="Search complaint ID, category, prompt, or user..."
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View style={styles.filtersRow}>
                {['all', 'Open', 'In Review', 'Resolved', 'Closed'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterPill,
                      { backgroundColor: dynamicCardBg, borderColor: dynamicBorder },
                      complaintStatusFilter === st && { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : theme.primaryLight, borderColor: theme.primary }
                    ]}
                    onPress={() => setComplaintStatusFilter(st as any)}
                  >
                    <Text style={[styles.filterPillText, { color: dynamicTextSecondary }, complaintStatusFilter === st && { color: theme.primary, fontWeight: '700' }]}>
                      {st.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredComplaints.length === 0 ? (
                <View style={[styles.emptyStateContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color={dynamicTextSecondary} />
                  <Text style={[styles.emptyStateText, { color: dynamicTextSecondary }]}>No AI Response Reports Logged</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {filteredComplaints.map((c) => (
                    <View key={c._id || c.complaintId} style={[styles.bugReportCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                      <View style={styles.bugCardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.bugRefText, { color: '#D4AF37', fontWeight: '800' }]}>{c.complaintId || 'CMP-REPT'}</Text>
                          <View style={[styles.severityBadge, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : '#FEF3C7' }]}>
                            <Text style={[styles.severityBadgeText, { color: '#92400e', fontWeight: '700' }]}>{c.category}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            const nextStatusMap: Record<string, string> = {
                              'Open': 'In Review',
                              'In Review': 'Resolved',
                              'Resolved': 'Closed',
                              'Closed': 'Open'
                            };
                            handleUpdateComplaintStatus(c._id || c.complaintId, nextStatusMap[c.status] || 'Open');
                          }}
                          style={[
                            styles.bugStatusBadge,
                            {
                              backgroundColor: c.status === 'Open' ? '#FEE2E2' : c.status === 'In Review' ? '#FEF3C7' : c.status === 'Resolved' ? '#D1FAE5' : '#E5E7EB'
                            }
                          ]}
                        >
                          <Text style={[
                            styles.bugStatusText,
                            {
                              color: c.status === 'Open' ? '#EF4444' : c.status === 'In Review' ? '#B45309' : c.status === 'Resolved' ? '#047857' : '#374151'
                            }
                          ]}>
                            {c.status || 'Open'} ⚙️
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginVertical: 4 }}>
                        <Text style={{ fontSize: 12, color: dynamicTextPrimary, fontWeight: '700' }}>
                          👤 {c.userName || 'User'} ({c.userEmail || 'N/A'})
                        </Text>
                        <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 2 }}>
                          Plan: {c.subscriptionPlan || 'Free'} • Workspace: {c.workspace || 'Default'} • Tool: {c.aiTool || 'AI Copilot'}
                        </Text>
                      </View>

                      {c.comment ? (
                        <View style={[styles.devReplyContainer, { backgroundColor: dynamicSubCardBg, borderColor: '#FDE68A', borderWidth: 1 }]}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#92400e' }}>💬 Optional User Comment:</Text>
                          <Text style={{ fontSize: 11.5, color: dynamicTextPrimary, marginTop: 2 }}>{c.comment}</Text>
                        </View>
                      ) : null}

                      <View style={{ marginTop: 6, gap: 2 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: dynamicTextSecondary }}>❓ Original User Prompt:</Text>
                        <Text style={{ fontSize: 11.5, color: dynamicTextPrimary, backgroundColor: dynamicSubCardBg, padding: 8, borderRadius: 6 }} numberOfLines={3}>
                          {c.originalPrompt || 'N/A'}
                        </Text>
                      </View>

                      <View style={{ marginTop: 6, gap: 2 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: dynamicTextSecondary }}>🤖 AI Response:</Text>
                        <Text style={{ fontSize: 11, color: dynamicTextSecondary, backgroundColor: dynamicSubCardBg, padding: 8, borderRadius: 6 }} numberOfLines={4}>
                          {c.aiResponse || 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.metaRowDetails}>
                        <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>
                          Device: {c.deviceInfo || 'Mobile'} • OS: {c.osVersion || 'Mobile OS'}
                        </Text>
                        <Text style={{ fontSize: 9.5, color: dynamicTextSecondary }}>
                          Timestamp: {c.timestamp ? new Date(c.timestamp).toLocaleString() : 'Just now'}
                        </Text>
                      </View>

                      <View style={styles.bugActionBtnRow}>
                        <TouchableOpacity
                          style={[styles.bugActionBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder }]}
                          onPress={() => setSelectedComplaint(c)}
                        >
                          <Text style={[styles.bugActionBtnText, { color: dynamicBtnText }]}>View Complete Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.bugActionBtn, { borderColor: '#10B981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}
                          onPress={() => handleUpdateComplaintStatus(c._id || c.complaintId, 'Resolved')}
                        >
                          <Text style={[styles.bugActionBtnText, { color: '#10B981' }]}>Mark Resolved</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 7: GLOBAL JURISDICTION TESTING */}
          {activeTab === 'jurisdiction' && (
            <View style={{ gap: 16 }}>
              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>🌍 Legal Jurisdiction Testing Panel</Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 4 }}>
                  This dashboard is restricted to developers and admins. Override user jurisdictions temporarily or permanently for QA test verification.
                </Text>

                {/* 1. SEARCH USER */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>1. Search User</Text>
                  <View style={[styles.formInput, { flexDirection: 'row', alignItems: 'center', backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, paddingHorizontal: 10, height: 42 }]}>
                    <Ionicons name="search" size={16} color={dynamicTextSecondary} style={{ marginRight: 6 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 13, color: dynamicTextPrimary, padding: 0 }}
                      placeholder="Search by Name, Email, Phone, or User ID..."
                      placeholderTextColor={dynamicTextSecondary}
                      value={jSearchQuery}
                      onChangeText={(val) => {
                        setJSearchQuery(val);
                        if (jSelectedUser) setJSelectedUser(null);
                      }}
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect={false}
                    />
                    {jSearchQuery.length > 0 && (
                      <Pressable onPress={() => { setJSearchQuery(''); setJSelectedUser(null); }}>
                        <Ionicons name="close-circle" size={16} color={dynamicTextSecondary} />
                      </Pressable>
                    )}
                  </View>

                  {/* Search Results Dropdown List */}
                  {jSearchQuery.length > 0 && !jSelectedUser && (
                    <View style={{ maxHeight: 150, borderWidth: 1, borderColor: dynamicBorder, borderRadius: 8, backgroundColor: dynamicCardBg, marginTop: 4, overflow: 'hidden' }}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {usersList.filter(u =>
                          u.name?.toLowerCase().includes(jSearchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(jSearchQuery.toLowerCase()) ||
                          u.phone?.toLowerCase().includes(jSearchQuery.toLowerCase()) ||
                          u._id?.toLowerCase().includes(jSearchQuery.toLowerCase())
                        ).slice(0, 5).map((u) => (
                          <TouchableOpacity
                            key={u._id}
                            style={{ padding: 10, borderBottomWidth: 0.5, borderBottomColor: dynamicBorder, flexDirection: 'column' }}
                            onPress={() => {
                              setJSelectedUser(u);
                              setJSearchQuery(`${u.name} (${u.email})`);
                              const uCountry = COUNTRIES.find(c => c.name === u.country || c.code === u.countryCode) || { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' };
                              setJTargetCountry(uCountry);
                            }}
                          >
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: dynamicTextPrimary }}>{u.name}</Text>
                            <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 2 }}>{u.email} • ID: {u._id}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 2. CURRENT PROFILE DISPLAY */}
                {jSelectedUser && (
                  <View style={{ marginTop: 16, backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Advocate Active Profile</Text>
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 12, color: dynamicTextSecondary }}>Name: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{jSelectedUser.name}</Text></Text>
                      <Text style={{ fontSize: 12, color: dynamicTextSecondary }}>Email: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{jSelectedUser.email}</Text></Text>
                      <Text style={{ fontSize: 12, color: dynamicTextSecondary }}>Current Country: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{jSelectedUser.country || 'India'}</Text></Text>
                      <Text style={{ fontSize: 12, color: dynamicTextSecondary }}>Current Jurisdiction: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{jSelectedUser.jurisdiction || 'India'}</Text></Text>
                    </View>
                  </View>
                )}

                {/* 3. CHOOSE TARGET JURISDICTION & OVERRIDE MODE */}
                {jSelectedUser && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>2. Change Legal Jurisdiction</Text>
                    
                    <TouchableOpacity
                      style={[styles.formInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 42, backgroundColor: dynamicSubCardBg, borderWidth: 1, borderColor: dynamicBorder }]}
                      onPress={() => setJCountryDropdownOpen(!jCountryDropdownOpen)}
                    >
                      <Text style={{ fontSize: 13, color: dynamicTextPrimary }}>{jTargetCountry.flag}  {jTargetCountry.name} ({jTargetCountry.code})</Text>
                      <Ionicons name={jCountryDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color={dynamicTextSecondary} />
                    </TouchableOpacity>

                    {/* Country List Search & Dropdown */}
                    {jCountryDropdownOpen && (
                      <View style={{ maxHeight: 200, borderWidth: 1, borderColor: dynamicBorder, borderRadius: 8, backgroundColor: dynamicCardBg, marginTop: 4, overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: dynamicBorder, paddingHorizontal: 10, height: 38 }}>
                          <Ionicons name="search" size={14} color={dynamicTextSecondary} style={{ marginRight: 6 }} />
                          <TextInput
                            style={{ flex: 1, fontSize: 12, color: dynamicTextPrimary, padding: 0 }}
                            placeholder="Search country name or code..."
                            placeholderTextColor={dynamicTextSecondary}
                            value={jCountrySearch}
                            onChangeText={setJCountrySearch}
                            autoCapitalize="none"
                            autoComplete="off"
                            autoCorrect={false}
                          />
                        </View>
                        <ScrollView keyboardShouldPersistTaps="handled">
                          {COUNTRIES.filter(c =>
                            c.name.toLowerCase().includes(jCountrySearch.toLowerCase()) ||
                            c.code.toLowerCase().includes(jCountrySearch.toLowerCase())
                          ).map((c) => (
                            <TouchableOpacity
                              key={c.code}
                              style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: dynamicBorder, flexDirection: 'row', alignItems: 'center' }}
                              onPress={() => {
                                setJTargetCountry(c);
                                setJCountryDropdownOpen(false);
                                setJCountrySearch('');
                              }}
                            >
                              <Text style={{ fontSize: 16, marginRight: 8 }}>{c.flag}</Text>
                              <Text style={{ fontSize: 12.5, color: dynamicTextPrimary, flex: 1 }}>{c.name}</Text>
                              <Text style={{ fontSize: 11, color: dynamicTextSecondary }}>{c.code}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Override mode selections */}
                    <Text style={[styles.inputFormLabel, { marginTop: 14, color: dynamicTextPrimary }]}>3. Override Mode</Text>
                    <View style={{ gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                        onPress={() => setJOverrideType('Temporary')}
                      >
                        <View style={{ height: 16, width: 16, borderRadius: 8, borderWidth: 1.5, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                          {jOverrideType === 'Temporary' && <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: theme.primary }} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: dynamicTextPrimary }}>Temporary Testing Override</Text>
                          <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 1 }}>Only active in-memory for testing. Database user details remain unchanged.</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                        onPress={() => setJOverrideType('Permanent')}
                      >
                        <View style={{ height: 16, width: 16, borderRadius: 8, borderWidth: 1.5, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                          {jOverrideType === 'Permanent' && <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: theme.primary }} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: dynamicTextPrimary }}>Permanently Update User Country</Text>
                          <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 1 }}>Saves country straight to database.</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Apply Button */}
                    <TouchableOpacity
                      style={[styles.testEmailSubmitBtn, { backgroundColor: theme.primary, marginTop: 16, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }]}
                      onPress={handleApplyOverride}
                      disabled={jSaving}
                    >
                      {jSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Apply Jurisdiction</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 4. AI TEST PANEL */}
              {jSelectedUser && (
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>🧪 Active AI Testing Sandbox</Text>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 4 }}>
                    Write prompts directly to test the dynamic country prompt injection layer.
                  </Text>

                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Test Prompt</Text>
                    <TextInput
                      style={[styles.formInput, { height: 70, textAlignVertical: 'top', paddingTop: 8, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      multiline
                      value={jTestQuery}
                      onChangeText={setJTestQuery}
                      placeholder="e.g. Can my landlord evict me?"
                      placeholderTextColor={dynamicTextSecondary}
                    />

                    {/* Quick suggestion tags */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 8 }}>
                      {['Landlord Eviction Rules', 'Rights after arrest', 'Child custody guidelines', 'Contract Review rules'].map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={{ backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
                          onPress={() => setJTestQuery(t)}
                        >
                          <Text style={{ fontSize: 10, color: dynamicBtnText, fontWeight: '600' }}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <TouchableOpacity
                        style={[styles.testEmailSubmitBtn, { backgroundColor: isDark ? '#21262D' : '#1E293B', flex: 1, height: 40, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={handleRunAITest}
                        disabled={jRunningTest}
                      >
                        {jRunningTest ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>Run AI Test</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.testEmailSubmitBtn, { backgroundColor: '#DC2626', flex: 0.6, height: 40, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={handleResetOverride}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>Reset</Text>
                      </TouchableOpacity>
                    </View>

                    {/* AI Answer Display */}
                    {jTestResult.length > 0 && (
                      <View style={{ marginTop: 14, backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: dynamicTextSecondary, textTransform: 'uppercase', marginBottom: 6 }}>AI Testing Response</Text>
                        <Text style={{ fontSize: 12.5, color: dynamicTextPrimary, lineHeight: 18 }}>{jTestResult}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB 6: SETTINGS CONFIG */}
          {activeTab === 'settings' && (
            <View style={{ gap: 16 }}>
              {/* 2. General Settings */}
              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>⚙️ General Settings</Text>
                
                <View style={{ gap: 10, marginTop: 12 }}>
                  <View>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Platform Name</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={adminSettings.platformName}
                      onChangeText={(val) => setAdminSettings({ ...adminSettings, platformName: val })}
                      onBlur={() => handleUpdateAdminSettings({ platformName: adminSettings.platformName })}
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Support Email</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={adminSettings.supportEmail}
                      onChangeText={(val) => setAdminSettings({ ...adminSettings, supportEmail: val })}
                      onBlur={() => handleUpdateAdminSettings({ supportEmail: adminSettings.supportEmail })}
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Default User Credits</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={String(adminSettings.defaultCredits || '50')}
                      onChangeText={(val) => setAdminSettings({ ...adminSettings, defaultCredits: parseInt(val) || 0 })}
                      onBlur={() => handleUpdateAdminSettings({ defaultCredits: adminSettings.defaultCredits })}
                      keyboardType="numeric"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  <View>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>File Upload Limit (MB)</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={String(adminSettings.fileUploadLimitMb || '25')}
                      onChangeText={(val) => setAdminSettings({ ...adminSettings, fileUploadLimitMb: parseInt(val) || 0 })}
                      onBlur={() => handleUpdateAdminSettings({ fileUploadLimitMb: adminSettings.fileUploadLimitMb })}
                      keyboardType="numeric"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* 3. Security Settings */}
              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>🔒 Security Settings</Text>
                
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: dynamicTextPrimary }}>Maintenance Mode</Text>
                    <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 2 }}>Locks the application access down for updates.</Text>
                  </View>
                  <Switch
                    value={adminSettings.maintenanceMode}
                    onValueChange={(val) => handleUpdateAdminSettings({ maintenanceMode: val })}
                    trackColor={{ false: '#CBD5E1', true: theme.primary }}
                  />
                </View>

                <View style={{ gap: 10, borderTopWidth: 0.5, borderTopColor: dynamicBorder, paddingTop: 12 }}>
                  <View>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Session Timeout (Minutes)</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={String(adminSettings.sessionTimeout || '30')}
                      onChangeText={(val) => setAdminSettings({ ...adminSettings, sessionTimeout: parseInt(val) || 0 })}
                      onBlur={() => handleUpdateAdminSettings({ sessionTimeout: adminSettings.sessionTimeout })}
                      keyboardType="numeric"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  {/* Change Admin Password */}
                  <View style={{ borderTopWidth: 0.5, borderTopColor: dynamicBorder, paddingTop: 12, marginTop: 4 }}>
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Change Admin Password</Text>
                    <TextInput
                      style={[styles.formInput, { marginBottom: 8, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={adminPasswordInput}
                      onChangeText={setAdminPasswordInput}
                      placeholder="Enter new admin password..."
                      placeholderTextColor={dynamicTextSecondary}
                      secureTextEntry
                    />
                    <TextInput
                      style={[styles.formInput, { marginBottom: 10, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={adminPasswordConfirm}
                      onChangeText={setAdminPasswordConfirm}
                      placeholder="Confirm new password..."
                      placeholderTextColor={dynamicTextSecondary}
                      secureTextEntry
                    />
                    <TouchableOpacity 
                      style={[styles.testEmailSubmitBtn, { backgroundColor: theme.primary }]}
                      onPress={handleUpdateAdminPassword}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Update Password</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB: APP UPDATES MANAGEMENT (DEDICATED TOP TAB) */}
          {activeTab === 'appUpdates' && (
            <View style={{ gap: 16 }}>
              <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: '#C8A34D', borderWidth: 1.5 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.categoryHeading, { color: dynamicTextPrimary }]}>📲 App Update Management</Text>
                    <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                      Central release controller for Android (Google Play) and iOS (Apple App Store).
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#C8A34D', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                    onPress={handleOpenReleaseCreator}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800', marginLeft: 4 }}>+ ADD RELEASE</Text>
                  </TouchableOpacity>
                </View>

                {/* 15. ADMIN DASHBOARD SUMMARY OVERVIEW */}
                <View style={{ backgroundColor: isDark ? 'rgba(200, 163, 77, 0.1)' : 'rgba(200, 163, 77, 0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#C8A34D', marginBottom: 14 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#C8A34D', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    📊 RELEASE SYSTEM DASHBOARD OVERVIEW
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {/* Android Card */}
                    <View style={{ flex: 1, minWidth: 140, backgroundColor: dynamicCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>🤖 ANDROID</Text>
                      <Text style={{ fontSize: 11, color: dynamicTextPrimary, marginTop: 4 }}>
                        Latest: <Text style={{ fontWeight: '800', color: '#C8A34D' }}>{releasesSummary?.android?.latestVersion || '1.0.1'}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: dynamicTextPrimary, marginTop: 2 }}>
                        Minimum: <Text style={{ fontWeight: '800' }}>{releasesSummary?.android?.minimumSupportedVersion || '1.0.0'}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                        Policy: <Text style={{ fontWeight: '700', color: releasesSummary?.android?.updatePolicy === 'mandatory' ? '#EF4444' : '#10B981' }}>{releasesSummary?.android?.updatePolicy === 'mandatory' ? 'Mandatory' : 'Optional'}</Text>
                      </Text>
                    </View>

                    {/* iOS Card */}
                    <View style={{ flex: 1, minWidth: 140, backgroundColor: dynamicCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>🍎 IOS</Text>
                      <Text style={{ fontSize: 11, color: dynamicTextPrimary, marginTop: 4 }}>
                        Latest: <Text style={{ fontWeight: '800', color: '#C8A34D' }}>{releasesSummary?.ios?.latestVersion || '1.0.1'}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: dynamicTextPrimary, marginTop: 2 }}>
                        Minimum: <Text style={{ fontWeight: '800' }}>{releasesSummary?.ios?.minimumSupportedVersion || '1.0.0'}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                        Policy: <Text style={{ fontWeight: '700', color: releasesSummary?.ios?.updatePolicy === 'mandatory' ? '#EF4444' : '#10B981' }}>{releasesSummary?.ios?.updatePolicy === 'mandatory' ? 'Mandatory' : 'Optional'}</Text>
                      </Text>
                    </View>

                    {/* Stats Card */}
                    <View style={{ flex: 1, minWidth: 140, backgroundColor: dynamicCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextPrimary }}>🚀 TOTAL RELEASES</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#C8A34D', marginTop: 2 }}>{releasesSummary?.totalReleases || 0}</Text>
                      <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, marginTop: 2 }}>
                        Last: {releasesSummary?.lastReleaseDate ? new Date(releasesSummary.lastReleaseDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ANDROID RELEASE CONTROLS */}
                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: dynamicBorder, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D', marginBottom: 8 }}>🤖 Android Minimum Version & Policy Controls</Text>
                  
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Auto Calculated Latest</Text>
                        <View style={[styles.formInput, { backgroundColor: isDark ? '#111111' : '#F5F5F5', borderColor: dynamicBorder, justifyContent: 'center' }]}>
                          <Text style={{ fontWeight: '800', color: '#C8A34D', fontSize: 12 }}>{releasesSummary?.android?.latestVersion || '1.0.1'} (Auto)</Text>
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Minimum Supported Version</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42 }}>
                          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                            {(releasedVersionsList.android?.length ? releasedVersionsList.android : ['1.0.0']).map((ver) => {
                              const isSelected = (releasesSummary?.android?.minimumSupportedVersion || '1.0.0') === ver;
                              return (
                                <TouchableOpacity
                                  key={`an-min-${ver}`}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    backgroundColor: isSelected ? '#C8A34D' : (isDark ? '#111111' : '#E5E5E5'),
                                  }}
                                  onPress={() => {
                                    const nextSummary = {
                                      ...releasesSummary,
                                      android: { ...releasesSummary.android, minimumSupportedVersion: ver }
                                    };
                                    setReleasesSummary(nextSummary);
                                    handleUpdateAppUpdateSettings({ android: { minimumSupportedVersion: ver } });
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? '#FFFFFF' : dynamicTextPrimary }}>{ver}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Update Policy</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center', backgroundColor: releasesSummary?.android?.updatePolicy === 'optional' ? '#C8A34D' : (isDark ? '#111111' : '#E5E5E5') }}
                            onPress={() => {
                              const nextSummary = { ...releasesSummary, android: { ...releasesSummary.android, updatePolicy: 'optional' } };
                              setReleasesSummary(nextSummary);
                              handleUpdateAppUpdateSettings({ android: { updatePolicy: 'optional' } });
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: releasesSummary?.android?.updatePolicy === 'optional' ? '#FFFFFF' : dynamicTextPrimary }}>Optional Update</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center', backgroundColor: releasesSummary?.android?.updatePolicy === 'mandatory' ? '#EF4444' : (isDark ? '#111111' : '#E5E5E5') }}
                            onPress={() => {
                              const nextSummary = { ...releasesSummary, android: { ...releasesSummary.android, updatePolicy: 'mandatory' } };
                              setReleasesSummary(nextSummary);
                              handleUpdateAppUpdateSettings({ android: { updatePolicy: 'mandatory' } });
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: releasesSummary?.android?.updatePolicy === 'mandatory' ? '#FFFFFF' : dynamicTextPrimary }}>Mandatory Update</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View>
                      <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Google Play Store URL</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                        value={releasesSummary?.android?.storeUrl || ''}
                        onChangeText={(val) => setReleasesSummary({ ...releasesSummary, android: { ...releasesSummary.android, storeUrl: val } })}
                        onBlur={() => handleUpdateAppUpdateSettings({ android: { storeUrl: releasesSummary?.android?.storeUrl } })}
                        placeholder="https://play.google.com/store/apps/details?id=com.uwo.ailegal"
                        placeholderTextColor={dynamicTextSecondary}
                      />
                    </View>

                    <View>
                      <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Update Title & Message</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary, marginBottom: 6 }]}
                        value={releasesSummary?.android?.title || ''}
                        onChangeText={(val) => setReleasesSummary({ ...releasesSummary, android: { ...releasesSummary.android, title: val } })}
                        onBlur={() => handleUpdateAppUpdateSettings({ android: { title: releasesSummary?.android?.title } })}
                        placeholder="AI LEGAL™ Update Available"
                        placeholderTextColor={dynamicTextSecondary}
                      />
                      <TextInput
                        style={[styles.formInput, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                        value={releasesSummary?.android?.message || ''}
                        onChangeText={(val) => setReleasesSummary({ ...releasesSummary, android: { ...releasesSummary.android, message: val } })}
                        onBlur={() => handleUpdateAppUpdateSettings({ android: { message: releasesSummary?.android?.message } })}
                        placeholder="A new version of AI LEGAL™ is available with improvements and bug fixes."
                        placeholderTextColor={dynamicTextSecondary}
                      />
                    </View>
                  </View>
                </View>

                {/* IOS RELEASE CONTROLS */}
                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: dynamicBorder, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D', marginBottom: 8 }}>🍎 iOS Minimum Version & Policy Controls</Text>
                  
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Auto Calculated Latest</Text>
                        <View style={[styles.formInput, { backgroundColor: isDark ? '#111111' : '#F5F5F5', borderColor: dynamicBorder, justifyContent: 'center' }]}>
                          <Text style={{ fontWeight: '800', color: '#C8A34D', fontSize: 12 }}>{releasesSummary?.ios?.latestVersion || '1.0.1'} (Auto)</Text>
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Minimum Supported Version</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42 }}>
                          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                            {(releasedVersionsList.ios?.length ? releasedVersionsList.ios : ['1.0.0']).map((ver) => {
                              const isSelected = (releasesSummary?.ios?.minimumSupportedVersion || '1.0.0') === ver;
                              return (
                                <TouchableOpacity
                                  key={`ios-min-${ver}`}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    backgroundColor: isSelected ? '#C8A34D' : (isDark ? '#111111' : '#E5E5E5'),
                                  }}
                                  onPress={() => {
                                    const nextSummary = {
                                      ...releasesSummary,
                                      ios: { ...releasesSummary.ios, minimumSupportedVersion: ver }
                                    };
                                    setReleasesSummary(nextSummary);
                                    handleUpdateAppUpdateSettings({ ios: { minimumSupportedVersion: ver } });
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? '#FFFFFF' : dynamicTextPrimary }}>{ver}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Update Policy</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center', backgroundColor: releasesSummary?.ios?.updatePolicy === 'optional' ? '#C8A34D' : (isDark ? '#111111' : '#E5E5E5') }}
                            onPress={() => {
                              const nextSummary = { ...releasesSummary, ios: { ...releasesSummary.ios, updatePolicy: 'optional' } };
                              setReleasesSummary(nextSummary);
                              handleUpdateAppUpdateSettings({ ios: { updatePolicy: 'optional' } });
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: releasesSummary?.ios?.updatePolicy === 'optional' ? '#FFFFFF' : dynamicTextPrimary }}>Optional Update</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center', backgroundColor: releasesSummary?.ios?.updatePolicy === 'mandatory' ? '#EF4444' : (isDark ? '#111111' : '#E5E5E5') }}
                            onPress={() => {
                              const nextSummary = { ...releasesSummary, ios: { ...releasesSummary.ios, updatePolicy: 'mandatory' } };
                              setReleasesSummary(nextSummary);
                              handleUpdateAppUpdateSettings({ ios: { updatePolicy: 'mandatory' } });
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: releasesSummary?.ios?.updatePolicy === 'mandatory' ? '#FFFFFF' : dynamicTextPrimary }}>Mandatory Update</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View>
                      <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Apple App Store URL</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                        value={releasesSummary?.ios?.storeUrl || ''}
                        onChangeText={(val) => setReleasesSummary({ ...releasesSummary, ios: { ...releasesSummary.ios, storeUrl: val } })}
                        onBlur={() => handleUpdateAppUpdateSettings({ ios: { storeUrl: releasesSummary?.ios?.storeUrl } })}
                        placeholder="https://apps.apple.com/app/ai-legal/id123456789"
                        placeholderTextColor={dynamicTextSecondary}
                      />
                    </View>

                    <View>
                      <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Update Title & Message</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary, marginBottom: 6 }]}
                        value={releasesSummary?.ios?.title || ''}
                        onChangeText={(val) => setReleasesSummary({ ...releasesSummary, ios: { ...releasesSummary.ios, title: val } })}
                        onBlur={() => handleUpdateAppUpdateSettings({ ios: { title: releasesSummary?.ios?.title } })}
                        placeholder="AI LEGAL™ Update Available"
                        placeholderTextColor={dynamicTextSecondary}
                      />
                      <TextInput
                        style={[styles.formInput, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                        value={releasesSummary?.ios?.message || ''}
                        onChangeText={(val) => setReleasesSummary({ ...releasesSummary, ios: { ...releasesSummary.ios, message: val } })}
                        onBlur={() => handleUpdateAppUpdateSettings({ ios: { message: releasesSummary?.ios?.message } })}
                        placeholder="A new version of AI LEGAL™ is available with improvements and bug fixes."
                        placeholderTextColor={dynamicTextSecondary}
                      />
                    </View>
                  </View>
                </View>

                {/* 6. RELEASE HISTORY TABLE / LIST */}
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: dynamicTextPrimary, marginBottom: 8 }}>📋 COMPLETE RELEASE HISTORY</Text>
                  
                  {releasesList.length === 0 ? (
                    <View style={[styles.emptyStateContainer, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, padding: 16 }]}>
                      <Ionicons name="git-branch-outline" size={28} color={dynamicTextSecondary} />
                      <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 4 }}>No releases created yet. Tap "+ ADD RELEASE" to publish a release.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {releasesList.map((rel) => {
                        const isLatest = rel.platform === 'android'
                          ? rel.version === releasesSummary?.android?.latestVersion
                          : rel.version === releasesSummary?.ios?.latestVersion;
                        const isMin = rel.platform === 'android'
                          ? rel.version === releasesSummary?.android?.minimumSupportedVersion
                          : rel.version === releasesSummary?.ios?.minimumSupportedVersion;

                        return (
                          <View key={rel._id} style={{ backgroundColor: dynamicSubCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: isLatest ? '#C8A34D' : dynamicBorder }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 12.5, fontWeight: '900', color: dynamicTextPrimary }}>v{rel.version}</Text>
                                <View style={{ backgroundColor: isDark ? 'rgba(200, 163, 77, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 8.5, color: '#C8A34D', fontWeight: '800', textTransform: 'uppercase' }}>{rel.platform}</Text>
                                </View>
                                {isLatest && (
                                  <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 8.5, color: '#FFFFFF', fontWeight: '800' }}>LATEST</Text>
                                  </View>
                                )}
                                {isMin && (
                                  <View style={{ backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 8.5, color: '#FFFFFF', fontWeight: '800' }}>MIN SUPPORTED</Text>
                                  </View>
                                )}
                              </View>

                              <Text style={{ fontSize: 10, color: dynamicTextSecondary }}>
                                Build {rel.buildNumber} • {new Date(rel.releasedAt || rel.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </Text>
                            </View>

                            {rel.releaseNotes ? (
                              <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 4 }} numberOfLines={2}>
                                {rel.releaseNotes}
                              </Text>
                            ) : null}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: dynamicBorder }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '700', color: rel.status === 'Released' ? '#10B981' : '#F59E0B' }}>
                                Status: {rel.status} ({rel.releaseType || 'Feature'})
                              </Text>

                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                  onPress={() => {
                                    setEditingRelease(rel);
                                    setReleaseForm({
                                      platform: rel.platform,
                                      version: rel.version,
                                      buildNumber: String(rel.buildNumber || 1),
                                      releaseType: rel.releaseType || 'Feature',
                                      releaseNotes: rel.releaseNotes || '',
                                      storeUrl: rel.storeUrl || '',
                                      status: rel.status || 'Released',
                                    });
                                    setIsCreatingRelease(true);
                                  }}
                                >
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#C8A34D' }}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => handleDeleteRelease(rel._id, rel.version)}>
                                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#EF4444' }}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.testEmailSubmitBtn, { backgroundColor: '#C8A34D', marginTop: 14, height: 42, justifyContent: 'center', alignItems: 'center' }]}
                  onPress={() => handleUpdateAppUpdateSettings({ android: releasesSummary.android, ios: releasesSummary.ios })}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>Save All App Update Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* 9. ADD / EDIT RELEASE RECORD MODAL */}
      <Modal visible={isCreatingRelease} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setIsCreatingRelease(false)} />
          <View style={[styles.modalContent, { maxHeight: height * 0.85, backgroundColor: dynamicCardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: dynamicBorder }]}>
              <Text style={[styles.modalTitle, { color: dynamicTextPrimary }]}>
                {editingRelease ? 'Edit Release Record' : '+ Add New Release Record'}
              </Text>
              <Pressable onPress={() => setIsCreatingRelease(false)}>
                <Ionicons name="close" size={24} color={dynamicTextSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Platform</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['both', 'android', 'ios'].map((plt) => (
                    <TouchableOpacity
                      key={plt}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: releaseForm.platform === plt ? '#C8A34D' : (isDark ? '#111111' : '#E5E5E5') }}
                      onPress={() => setReleaseForm({ ...releaseForm, platform: plt })}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: releaseForm.platform === plt ? '#FFFFFF' : dynamicTextPrimary, textTransform: 'capitalize' }}>
                        {plt === 'both' ? 'Android & iOS' : plt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Version Number</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                    value={releaseForm.version}
                    onChangeText={(val) => setReleaseForm({ ...releaseForm, version: val })}
                    placeholder="1.2.0"
                    placeholderTextColor={dynamicTextSecondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Build Number</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                    value={releaseForm.buildNumber}
                    keyboardType="numeric"
                    onChangeText={(val) => setReleaseForm({ ...releaseForm, buildNumber: val })}
                    placeholder="15"
                    placeholderTextColor={dynamicTextSecondary}
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Release Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['Feature', 'Bug Fix', 'Initial', 'Security', 'Critical'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: releaseForm.releaseType === type ? '#C8A34D' : (isDark ? '#111111' : '#E5E5E5') }}
                        onPress={() => setReleaseForm({ ...releaseForm, releaseType: type })}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: releaseForm.releaseType === type ? '#FFFFFF' : dynamicTextPrimary }}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Release Status</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['Released', 'Draft'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: releaseForm.status === st ? (st === 'Released' ? '#10B981' : '#F59E0B') : (isDark ? '#111111' : '#E5E5E5') }}
                      onPress={() => setReleaseForm({ ...releaseForm, status: st })}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: releaseForm.status === st ? '#FFFFFF' : dynamicTextPrimary }}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 4 }}>
                  When set to "Released", the system will automatically recognize the highest semantic version as the Latest Version.
                </Text>
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Release Notes</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary, height: 70, textAlignVertical: 'top' }]}
                  value={releaseForm.releaseNotes}
                  multiline
                  onChangeText={(val) => setReleaseForm({ ...releaseForm, releaseNotes: val })}
                  placeholder="New features, stability improvements and bug fixes..."
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.testEmailSubmitBtn, { backgroundColor: '#C8A34D', marginTop: 8, height: 44, justifyContent: 'center', alignItems: 'center' }]}
                onPress={handleSaveRelease}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  {editingRelease ? 'Save Release Changes' : 'Publish Release Record'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 1. USER DOSSIER DETAIL MODAL */}
      <Modal visible={selectedUser !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setSelectedUser(null)} />
          <View style={[styles.modalContent, { maxHeight: height * 0.85, backgroundColor: dynamicCardBg }]}>
            {selectedUser && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: dynamicBorder }]}>
                  <Text style={[styles.modalTitle, { color: dynamicTextPrimary }]}>{selectedUser.name}</Text>
                  <Pressable onPress={() => setSelectedUser(null)}>
                    <Ionicons name="close" size={24} color={dynamicTextSecondary} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  <View style={[styles.userDetailCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.userDetailTitleText, { color: dynamicTextPrimary, borderBottomColor: dynamicBorder }]}>User Profile Details</Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Full Name: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.name}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Email: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.email}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Phone Number: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.phone || 'N/A'}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Legal Jurisdiction: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.jurisdiction || 'N/A'}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Plan: <Text style={{ fontWeight: '800', color: theme.primary }}>{selectedUser.currentPlan}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Account Status: <Text style={{ fontWeight: '700', color: selectedUser.isBlocked ? '#EF4444' : '#10B981' }}>{selectedUser.isBlocked ? 'Suspended' : 'Active'}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Credits: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.credits}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Cases Created: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.totalCases || 0}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Account Created Date: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Last Login: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'N/A'}</Text></Text>
                    <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>User ID: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser._id}</Text></Text>
                    {selectedUser.usageStatus && (
                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: dynamicBorder }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, marginBottom: 6 }}>📊 ACTIVE USAGE STATS</Text>
                        <Text style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>Cases Folders: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{selectedUser.usageStatus.cases?.used || 0} / {selectedUser.usageStatus.cases?.limit === -1 ? 'Unlimited' : selectedUser.usageStatus.cases?.limit}</Text></Text>
                        {Object.entries(selectedUser.usageStatus.features || {}).map(([feat, usage]: [string, any]) => (
                          <Text key={feat} style={[styles.userDetailRowText, { color: dynamicTextSecondary }]}>
                            {feat.replace(/_/g, ' ').toUpperCase()}: <Text style={{ fontWeight: '700', color: dynamicTextPrimary }}>{usage.used} / {usage.limit === Infinity || usage.limit === -1 ? 'Unlimited' : usage.limit}</Text>
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Dedicated Subscription Management Section */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary, fontSize: 13, fontWeight: '800' }]}>
                      💳 Subscription Management
                    </Text>
                    <Text style={{ fontSize: 10.5, color: dynamicTextSecondary, marginTop: 2, marginBottom: 10 }}>
                      Assign or update subscription plan directly. Active plan is the single source of truth for features, limits, and storage.
                    </Text>

                    {/* Dynamic Plan Selector */}
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary, marginBottom: 6 }]}>Select Subscription Plan</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                      {(plansList && plansList.length > 0 ? plansList : [
                        { _id: 'advocate_basic', planName: 'AI Legal™ Advocate Basic', badge: 'ADVOCATE BASIC' },
                        { _id: 'advocate_pro', planName: 'AI Legal™ Advocate Pro', badge: 'ADVOCATE PRO' },
                        { _id: 'advocate_premium', planName: 'AI Legal™ Advocate Premium', badge: 'ADVOCATE PREMIUM' },
                        { _id: 'student_basic', planName: 'AI Legal™ Student Basic', badge: 'STUDENT BASIC' },
                        { _id: 'student_pro', planName: 'AI Legal™ Student Pro', badge: 'STUDENT PRO' },
                        { _id: 'student_premium', planName: 'AI Legal™ Student Premium', badge: 'STUDENT PREMIUM' },
                        { _id: 'firm_basic', planName: 'AI Legal™ Firm Basic', badge: 'FIRM BASIC' },
                        { _id: 'firm_pro', planName: 'AI Legal™ Firm Pro', badge: 'FIRM PRO' },
                        { _id: 'firm_premium', planName: 'AI Legal™ Firm Premium', badge: 'FIRM PREMIUM' },
                        { _id: 'combo_student_advocate', planName: 'Student + Advocate Combo', badge: 'STUDENT + ADVOCATE' },
                        { _id: 'combo_advocate_firm', planName: 'Advocate + Law Firm Combo', badge: 'ADVOCATE + FIRM' },
                        { _id: 'combo_all_access', planName: 'All Access Ecosystem Pass', badge: 'ALL ACCESS' },
                      ]).map((plan) => {
                        const isSelected = planUpgradeForm.planId === plan._id || planUpgradeForm.planId === plan.planName;
                        return (
                          <TouchableOpacity
                            key={plan._id || plan.planName}
                            style={[
                              styles.planOptionBtn,
                              { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
                              isSelected && { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(200, 163, 77, 0.25)' : theme.primaryLight }
                            ]}
                            onPress={() => setPlanUpgradeForm({ ...planUpgradeForm, planId: plan._id || plan.planName })}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? theme.primary : dynamicTextPrimary }}>
                              {plan.planName}
                            </Text>
                            {plan.badge ? (
                              <Text style={{ fontSize: 9, color: dynamicTextSecondary, marginTop: 1 }}>{plan.badge}</Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Plan Duration Selector: Monthly vs Yearly */}
                    <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary, marginTop: 10, marginBottom: 6 }]}>Plan Duration</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[
                          styles.billingCycleBtn,
                          { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
                          planUpgradeForm.billingCycle === 'monthly' && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => setPlanUpgradeForm({ ...planUpgradeForm, billingCycle: 'monthly' })}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: planUpgradeForm.billingCycle === 'monthly' ? '#000000' : dynamicTextPrimary }}>
                          Monthly
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.billingCycleBtn,
                          { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
                          planUpgradeForm.billingCycle === 'yearly' && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => setPlanUpgradeForm({ ...planUpgradeForm, billingCycle: 'yearly' })}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: planUpgradeForm.billingCycle === 'yearly' ? '#000000' : dynamicTextPrimary }}>
                          Yearly
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Assign & Expire Plan Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                      <TouchableOpacity style={[styles.adjustSubmitBtn, { backgroundColor: theme.primary, flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 }]} onPress={handleChangePlan}>
                        <Text style={{ color: '#000000', fontWeight: '900', fontSize: 12 }}>Assign Plan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.adjustSubmitBtn, { backgroundColor: '#DC2626', flex: 0.8, paddingVertical: 12, alignItems: 'center', borderRadius: 8 }]} onPress={handleExpireSubscription}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Expire Plan</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. PLAN CREATOR/EDITOR MODAL */}
      <Modal visible={isCreatingPlan} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setIsCreatingPlan(false)} />
          <View style={[styles.modalContent, { maxHeight: height * 0.85, backgroundColor: dynamicCardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: dynamicBorder }]}>
              <Text style={[styles.modalTitle, { color: dynamicTextPrimary }]}>{editingPlan ? 'Edit Plan Settings' : 'Create Plan'}</Text>
              <Pressable onPress={() => setIsCreatingPlan(false)}>
                <Ionicons name="close" size={24} color={dynamicTextSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Plan ID Identifier</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  value={planForm.planId}
                  onChangeText={(val) => setPlanForm({ ...planForm, planId: val })}
                  editable={editingPlan === null}
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Plan Display Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  value={planForm.planName}
                  onChangeText={(val) => setPlanForm({ ...planForm, planName: val })}
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Price Monthly (₹)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  value={planForm.priceMonthly}
                  onChangeText={(val) => setPlanForm({ ...planForm, priceMonthly: val })}
                  keyboardType="numeric"
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Price Yearly (₹)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  value={planForm.priceYearly}
                  onChangeText={(val) => setPlanForm({ ...planForm, priceYearly: val })}
                  keyboardType="numeric"
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>AI Credits</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  value={planForm.credits}
                  onChangeText={(val) => setPlanForm({ ...planForm, credits: val })}
                  keyboardType="numeric"
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Badge Label</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  value={planForm.badge}
                  onChangeText={(val) => setPlanForm({ ...planForm, badge: val })}
                  placeholder="e.g. Most Popular"
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View>
                <Text style={[styles.inputFormLabel, { color: dynamicTextPrimary }]}>Features list (Line separated)</Text>
                <TextInput
                  style={[styles.formInput, { height: 80, textAlignVertical: 'top', backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                  multiline
                  value={planForm.features}
                  onChangeText={(val) => setPlanForm({ ...planForm, features: val })}
                  placeholderTextColor={dynamicTextSecondary}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: dynamicTextPrimary }}>Set as Popular</Text>
                <Switch
                  value={planForm.isPopular}
                  onValueChange={(val) => setPlanForm({ ...planForm, isPopular: val })}
                />
              </View>

              <TouchableOpacity style={[styles.testEmailSubmitBtn, { backgroundColor: '#10B981', marginTop: 10 }]} onPress={handleSavePlan}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Save Plan Parameters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. FEATURE DETAIL MODAL */}
      <Modal visible={selectedFeature !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setSelectedFeature(null)} />
          <View style={[styles.modalContent, { maxHeight: height * 0.85, backgroundColor: dynamicCardBg }]}>
            {selectedFeature && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: dynamicBorder }]}>
                  <Text style={[styles.modalTitle, { color: dynamicTextPrimary }]}>Manage Feature Request</Text>
                  <Pressable onPress={() => setSelectedFeature(null)}>
                    <Ionicons name="close" size={24} color={dynamicTextSecondary} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  <View style={[styles.userDetailCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: dynamicTextPrimary }}>{selectedFeature.title}</Text>
                    <Text style={{ fontSize: 11.5, color: dynamicTextSecondary, marginTop: 6 }}>{selectedFeature.description}</Text>
                  </View>

                  {/* Change Status */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Update Status</Text>
                    <View style={styles.pickerWrapper}>
                      {['Pending', 'Under Review', 'Planned', 'In Progress', 'Completed', 'Rejected'].map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[styles.smallPillBtn, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }, selectedFeature.status === st && { backgroundColor: theme.primary }]}
                          onPress={() => handleUpdateFeatureStatus(st)}
                        >
                          <Text style={[styles.smallPillBtnText, { color: dynamicTextSecondary }, selectedFeature.status === st && { color: '#FFFFFF' }]}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Assign Developer */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Assign Developer</Text>
                    <View style={styles.pickerWrapper}>
                      {['John Doe', 'Aditi Verma', 'Nikhil Gupta', 'Sarah Connor'].map((dev) => (
                        <TouchableOpacity
                          key={dev}
                          style={[styles.smallPillBtn, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }, selectedFeature.developerAssigned === dev && { backgroundColor: theme.primary }]}
                          onPress={() => handleAssignFeatureDev(dev)}
                        >
                          <Text style={[styles.smallPillBtnText, { color: dynamicTextSecondary }, selectedFeature.developerAssigned === dev && { color: '#FFFFFF' }]}>{dev}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Admin Developer Reply */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Admin Reply to User</Text>
                    <TextInput
                      style={[styles.formInput, { height: 60, textAlignVertical: 'top', marginTop: 6, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      multiline
                      defaultValue={selectedFeature.reply}
                      onSubmitEditing={(e) => handleFeatureReply(e.nativeEvent.text)}
                      placeholder="Add response to reflect inside client app..."
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. BUG DETAIL MODAL */}
      <Modal visible={selectedBug !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setSelectedBug(null)} />
          <View style={[styles.modalContent, { maxHeight: height * 0.85, backgroundColor: dynamicCardBg }]}>
            {selectedBug && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: dynamicBorder }]}>
                  <Text style={[styles.modalTitle, { color: dynamicTextPrimary }]}>Manage Bug Report</Text>
                  <Pressable onPress={() => setSelectedBug(null)}>
                    <Ionicons name="close" size={24} color={dynamicTextSecondary} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  <View style={[styles.userDetailCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: dynamicTextPrimary }}>{selectedBug.title}</Text>
                    <Text style={{ fontSize: 11.5, color: dynamicBtnText, marginTop: 6 }}>{selectedBug.description}</Text>
                    <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 8 }}>Device Info: {selectedBug.device} • {selectedBug.platform} App v{selectedBug.appVersion} (OS: {selectedBug.osVersion})</Text>
                  </View>

                  {/* Update Status */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Update Lifecycle Status</Text>
                    <View style={styles.pickerWrapper}>
                      {['Open', 'Assigned', 'Fixing', 'Testing', 'Fixed', 'Closed'].map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[styles.smallPillBtn, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }, selectedBug.status === st && { backgroundColor: theme.primary }]}
                          onPress={() => handleUpdateBugStatus(st)}
                        >
                          <Text style={[styles.smallPillBtnText, { color: dynamicTextSecondary }, selectedBug.status === st && { color: '#FFFFFF' }]}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Change Severity */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Update Severity</Text>
                    <View style={styles.pickerWrapper}>
                      {['Minor', 'Major', 'Critical'].map((sv) => (
                        <TouchableOpacity
                          key={sv}
                          style={[styles.smallPillBtn, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }, selectedBug.severity === sv && { backgroundColor: theme.primary }]}
                          onPress={() => handleUpdateBugSeverity(sv)}
                        >
                          <Text style={[styles.smallPillBtnText, { color: dynamicTextSecondary }, selectedBug.severity === sv && { color: '#FFFFFF' }]}>{sv}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Internal Developer Notes */}
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Internal Developer Notes (Private)</Text>
                    <TextInput
                      style={[styles.formInput, { height: 60, textAlignVertical: 'top', marginTop: 6, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      multiline
                      defaultValue={selectedBug.internalNotes}
                      onSubmitEditing={(e) => handleBugDeveloperNotes(e.nativeEvent.text)}
                      placeholder="Add logs analysis, developer comments..."
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Selected Complaint Detail Modal */}
      <Modal
        visible={!!selectedComplaint}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedComplaint(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalDismissBg} onPress={() => setSelectedComplaint(null)} />
          <View style={[styles.modalContent, { backgroundColor: dynamicCardBg, maxHeight: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: dynamicTextPrimary }}>
                  Complaint Details ({selectedComplaint?.complaintId})
                </Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                  Submitted: {selectedComplaint?.timestamp ? new Date(selectedComplaint.timestamp).toLocaleString() : 'N/A'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedComplaint(null)}>
                <Ionicons name="close-circle" size={24} color={dynamicTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ marginVertical: 6 }}>
              <View style={{ gap: 12 }}>
                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#D4AF37' }}>Category:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: dynamicTextPrimary, marginTop: 2 }}>{selectedComplaint?.category}</Text>
                </View>

                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextSecondary }}>User Details:</Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary, marginTop: 2 }}>Name: {selectedComplaint?.userName}</Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Email: {selectedComplaint?.userEmail}</Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Workspace: {selectedComplaint?.workspace}</Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Plan: {selectedComplaint?.subscriptionPlan}</Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>AI Tool: {selectedComplaint?.aiTool}</Text>
                </View>

                {selectedComplaint?.comment ? (
                  <View style={{ backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e' }}>💬 Optional User Comment:</Text>
                    <Text style={{ fontSize: 12.5, color: '#92400e', marginTop: 4 }}>{selectedComplaint?.comment}</Text>
                  </View>
                ) : null}

                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextSecondary }}>❓ Original User Prompt:</Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary, marginTop: 4 }}>{selectedComplaint?.originalPrompt || 'No prompt recorded'}</Text>
                </View>

                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextSecondary }}>🤖 AI Response:</Text>
                  <Text style={{ fontSize: 11.5, color: dynamicTextSecondary, marginTop: 4 }}>{selectedComplaint?.aiResponse || 'No response recorded'}</Text>
                </View>

                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: dynamicTextSecondary }}>Device Metadata:</Text>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>Device: {selectedComplaint?.deviceInfo}</Text>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary }}>OS: {selectedComplaint?.osVersion}</Text>
                  <Text style={{ fontSize: 11, color: dynamicTextSecondary }}>App Version: {selectedComplaint?.appVersion}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.adjustSubmitBtn, { backgroundColor: '#10B981', flex: 1 }]}
                onPress={() => {
                  handleUpdateComplaintStatus(selectedComplaint?._id || selectedComplaint?.complaintId, 'Resolved');
                  setSelectedComplaint(null);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Mark Resolved</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustSubmitBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, flex: 1 }]}
                onPress={() => setSelectedComplaint(null)}
              >
                <Text style={{ color: dynamicBtnText, fontWeight: '800', fontSize: 12 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CREATE / EDIT COUPON MODAL */}
      <Modal visible={isCreatingCoupon} transparent animationType="slide" onRequestClose={() => setIsCreatingCoupon(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setIsCreatingCoupon(false)} />
          <View style={[styles.modalContent, { backgroundColor: dynamicCardBg, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: dynamicTextPrimary }}>
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
              </Text>
              <TouchableOpacity onPress={() => setIsCreatingCoupon(false)}>
                <Ionicons name="close-circle" size={24} color={dynamicTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ marginVertical: 4 }}>
              <View style={{ gap: 12 }}>
                {/* Code */}
                <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Coupon Code *</Text>
                  <TextInput
                    style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary, fontWeight: '800', letterSpacing: 1 }]}
                    value={couponForm.code}
                    onChangeText={(val) => setCouponForm({ ...couponForm, code: val.toUpperCase().trim() })}
                    placeholder="e.g. LEGAL50"
                    placeholderTextColor={dynamicTextSecondary}
                    autoCapitalize="characters"
                  />
                  <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 2 }}>Auto-normalized to uppercase, trimmed, and unique.</Text>
                </View>

                {/* Discount Type & Value */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Discount Type *</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <TouchableOpacity
                        style={[styles.smallPillBtn, couponForm.discountType === 'percentage' && { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                        onPress={() => setCouponForm({ ...couponForm, discountType: 'percentage' })}
                      >
                        <Text style={[styles.smallPillBtnText, couponForm.discountType === 'percentage' && { color: '#FFFFFF', fontWeight: '800' }]}>Percentage (%)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallPillBtn, couponForm.discountType === 'fixed' && { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                        onPress={() => setCouponForm({ ...couponForm, discountType: 'fixed' })}
                      >
                        <Text style={[styles.smallPillBtnText, couponForm.discountType === 'fixed' && { color: '#FFFFFF', fontWeight: '800' }]}>Fixed (₹)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Discount Value *</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary, fontWeight: '800' }]}
                      keyboardType="numeric"
                      value={couponForm.discountValue}
                      onChangeText={(val) => setCouponForm({ ...couponForm, discountValue: val })}
                      placeholder={couponForm.discountType === 'percentage' ? '50' : '200'}
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </View>

                {/* Applicable Plans */}
                <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Applicable Plans</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {['ALL', 'advocate_basic', 'advocate_pro', 'advocate_premium', 'student_basic', 'student_pro', 'student_premium', 'firm_basic', 'firm_pro', 'firm_premium'].map((p) => {
                      const isSelected = couponForm.applicablePlans.includes(p);
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.smallPillBtn, isSelected && { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                          onPress={() => {
                            if (p === 'ALL') {
                              setCouponForm({ ...couponForm, applicablePlans: ['ALL'] });
                            } else {
                              let nextPlans = couponForm.applicablePlans.filter((x) => x !== 'ALL');
                              if (isSelected) {
                                nextPlans = nextPlans.filter((x) => x !== p);
                                if (nextPlans.length === 0) nextPlans = ['ALL'];
                              } else {
                                nextPlans.push(p);
                              }
                              setCouponForm({ ...couponForm, applicablePlans: nextPlans });
                            }
                          }}
                        >
                          <Text style={[styles.smallPillBtnText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>{p}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Billing Cycle */}
                <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Applicable Billing Cycles</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    {['ALL', 'monthly', 'yearly'].map((c) => {
                      const isSelected = couponForm.billingCycles.includes(c);
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[styles.smallPillBtn, isSelected && { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }]}
                          onPress={() => {
                            if (c === 'ALL') {
                              setCouponForm({ ...couponForm, billingCycles: ['ALL'] });
                            } else {
                              let next = couponForm.billingCycles.filter((x) => x !== 'ALL');
                              if (isSelected) {
                                next = next.filter((x) => x !== c);
                                if (next.length === 0) next = ['ALL'];
                              } else {
                                next.push(c);
                              }
                              setCouponForm({ ...couponForm, billingCycles: next });
                            }
                          }}
                        >
                          <Text style={[styles.smallPillBtnText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>{c.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Validity Dates */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Start Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={couponForm.startDate}
                      onChangeText={(val) => setCouponForm({ ...couponForm, startDate: val })}
                      placeholder="2026-08-01"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Expiry Date * (YYYY-MM-DD)</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      value={couponForm.expiryDate}
                      onChangeText={(val) => setCouponForm({ ...couponForm, expiryDate: val })}
                      placeholder="2026-08-31"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </View>

                {/* Limits & Min Purchase */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Total Usage Limit</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      keyboardType="numeric"
                      value={couponForm.usageLimit}
                      onChangeText={(val) => setCouponForm({ ...couponForm, usageLimit: val })}
                      placeholder="Leave blank for ∞"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Per User Limit</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      keyboardType="numeric"
                      value={couponForm.perUserLimit}
                      onChangeText={(val) => setCouponForm({ ...couponForm, perUserLimit: val })}
                      placeholder="1"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Min Purchase (₹)</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      keyboardType="numeric"
                      value={couponForm.minimumPurchase}
                      onChangeText={(val) => setCouponForm({ ...couponForm, minimumPurchase: val })}
                      placeholder="0 (Optional)"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>

                  <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, flex: 1 }]}>
                    <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Max Discount (₹)</Text>
                    <TextInput
                      style={[styles.formInput, { marginTop: 4, backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, color: dynamicTextPrimary }]}
                      keyboardType="numeric"
                      value={couponForm.maximumDiscount}
                      onChangeText={(val) => setCouponForm({ ...couponForm, maximumDiscount: val })}
                      placeholder="Optional"
                      placeholderTextColor={dynamicTextSecondary}
                    />
                  </View>
                </View>

                {/* Status Switch */}
                <View style={[styles.switchRow, { backgroundColor: dynamicSubCardBg, borderRadius: 8, paddingHorizontal: 12 }]}>
                  <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Status Active</Text>
                  <Switch
                    value={couponForm.status === 'active'}
                    onValueChange={(val) => setCouponForm({ ...couponForm, status: val ? 'active' : 'inactive' })}
                    trackColor={{ false: '#71717A', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.adjustSubmitBtn, { backgroundColor: '#C8A34D', flex: 1 }]}
                onPress={handleSaveCoupon}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Save Coupon 🎉</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustSubmitBtn, { backgroundColor: dynamicBtnBg, borderColor: dynamicBorder, flex: 1 }]}
                onPress={() => setIsCreatingCoupon(false)}
              >
                <Text style={{ color: dynamicBtnText, fontWeight: '800', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* COUPON DETAILS & USAGE HISTORY MODAL */}
      <Modal visible={selectedCouponDetails !== null} transparent animationType="slide" onRequestClose={() => setSelectedCouponDetails(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setSelectedCouponDetails(null)} />
          <View style={[styles.modalContent, { backgroundColor: dynamicCardBg, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: dynamicTextPrimary }}>
                  Coupon Details: {selectedCouponDetails?.code}
                </Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>
                  Created: {selectedCouponDetails?.createdAt ? new Date(selectedCouponDetails.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCouponDetails(null)}>
                <Ionicons name="close-circle" size={24} color={dynamicTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ marginVertical: 4 }}>
              <View style={{ gap: 12 }}>
                {/* Stats row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={[styles.categoryCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 120, padding: 10 }]}>
                    <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>TOTAL USES</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: dynamicTextPrimary, marginTop: 2 }}>{selectedCouponStats?.totalUses || 0}</Text>
                  </View>
                  <View style={[styles.categoryCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 120, padding: 10 }]}>
                    <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>DISCOUNT GIVEN</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#10B981', marginTop: 2 }}>₹{selectedCouponStats?.totalDiscountGiven || 0}</Text>
                  </View>
                  <View style={[styles.categoryCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 120, padding: 10 }]}>
                    <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>REVENUE GENERATED</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#C8A34D', marginTop: 2 }}>₹{selectedCouponStats?.totalRevenueGenerated || 0}</Text>
                  </View>
                  <View style={[styles.categoryCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder, flex: 1, minWidth: 120, padding: 10 }]}>
                    <Text style={{ fontSize: 9.5, color: dynamicTextSecondary, fontWeight: '700' }}>AVG ORDER VALUE</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#3B82F6', marginTop: 2 }}>₹{selectedCouponStats?.averageOrderValue || 0}</Text>
                  </View>
                </View>

                {/* Overview */}
                <View style={{ backgroundColor: dynamicSubCardBg, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder, gap: 4 }}>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Discount: <Text style={{ fontWeight: '800', color: '#C8A34D' }}>{selectedCouponDetails?.discountType === 'percentage' ? `${selectedCouponDetails?.discountValue}% OFF` : `₹${selectedCouponDetails?.discountValue} OFF`}</Text></Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Applicable Plans: <Text style={{ fontWeight: '700' }}>{Array.isArray(selectedCouponDetails?.applicablePlans) ? selectedCouponDetails?.applicablePlans.join(', ') : 'ALL'}</Text></Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Per User Limit: <Text style={{ fontWeight: '700' }}>{selectedCouponDetails?.perUserLimit || 1} use</Text></Text>
                  <Text style={{ fontSize: 12, color: dynamicTextPrimary }}>Validity: <Text style={{ fontWeight: '700' }}>{selectedCouponDetails?.startDate ? new Date(selectedCouponDetails.startDate).toLocaleDateString() : 'Now'} – {selectedCouponDetails?.expiryDate ? new Date(selectedCouponDetails.expiryDate).toLocaleDateString() : 'N/A'}</Text></Text>
                </View>

                {/* Usage History List */}
                <View style={[styles.categoryCard, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder }]}>
                  <Text style={[styles.categoryHeading, { color: dynamicTextPrimary, marginBottom: 8 }]}>Redemption Audit History</Text>
                  {selectedCouponUsageHistory.length === 0 ? (
                    <Text style={{ fontSize: 11.5, color: dynamicTextSecondary, fontStyle: 'italic', paddingVertical: 10 }}>No user redemptions recorded yet.</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {selectedCouponUsageHistory.map((u, idx) => (
                        <View key={u._id || idx} style={{ backgroundColor: dynamicSubCardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: dynamicBorder }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: dynamicTextPrimary }}>{u.userId?.fullName || u.userEmail || 'Subscriber'}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>Paid ₹{u.finalAmount}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 2 }}>
                            {u.userEmail} • Plan: {u.planId} ({u.billingCycle})
                          </Text>
                          <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 1 }}>
                            Original: ₹{u.originalAmount} | Saved: ₹{u.discountAmount} | Date: {new Date(u.usedAt || u.createdAt).toLocaleString()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.adjustSubmitBtn, { backgroundColor: '#C8A34D', marginTop: 10 }]}
              onPress={() => setSelectedCouponDetails(null)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== CRASH DETAILS MODAL ==================== */}
      <Modal visible={!!selectedCrash} transparent animationType="slide" onRequestClose={() => setSelectedCrash(null)}>
        <View style={styles.modalOverlayBg}>
          <View style={[styles.modalCardContainer, { backgroundColor: dynamicCardBg, borderColor: dynamicBorder, maxHeight: height * 0.85 }]}>
            <View style={styles.modalCardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalCardHeaderTitle, { color: '#EF4444' }]}>
                  {selectedCrash?.errorName || 'Crash Report'}
                </Text>
                <Text style={{ fontSize: 10, color: dynamicTextSecondary, marginTop: 2 }}>
                  ID: {selectedCrash?._id} • {selectedCrash?.platform} ({selectedCrash?.source})
                </Text>
              </View>
              <Pressable onPress={() => setSelectedCrash(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color={dynamicTextSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ marginTop: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Error Message</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444', marginTop: 4 }}>
                  {selectedCrash?.message}
                </Text>
              </View>

              <View style={[styles.settingsSubSectionCard, { backgroundColor: dynamicSubCardBg, borderColor: dynamicBorder }]}>
                <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Metadata & User Context</Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 4 }}>User Email: <Text style={{ color: dynamicTextPrimary, fontWeight: '700' }}>{selectedCrash?.userEmail || 'Anonymous / Guest'}</Text></Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>Target Route: <Text style={{ color: dynamicTextPrimary, fontWeight: '700' }}>{selectedCrash?.route || 'N/A'}</Text></Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>Severity: <Text style={{ color: selectedCrash?.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B', fontWeight: '800' }}>{selectedCrash?.severity}</Text></Text>
                <Text style={{ fontSize: 11, color: dynamicTextSecondary, marginTop: 2 }}>Timestamp: <Text style={{ color: dynamicTextPrimary }}>{selectedCrash?.createdAt ? new Date(selectedCrash.createdAt).toLocaleString() : 'N/A'}</Text></Text>
              </View>

              {selectedCrash?.stack ? (
                <View style={[styles.settingsSubSectionCard, { backgroundColor: isDark ? '#0D1117' : '#F8FAFC', borderColor: dynamicBorder }]}>
                  <Text style={[styles.smallCardTitle, { color: dynamicTextPrimary }]}>Full Error Stack Trace</Text>
                  <ScrollView horizontal style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: isDark ? '#E6EDF3' : '#334155' }}>
                      {selectedCrash.stack}
                    </Text>
                  </ScrollView>
                </View>
              ) : null}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {selectedCrash?.status !== 'RESOLVED' && (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#10B981', height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => handleUpdateCrashStatus(selectedCrash._id, 'RESOLVED')}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Mark as Resolved</Text>
                </TouchableOpacity>
              )}
              {selectedCrash?.status !== 'INVESTIGATING' && (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#F59E0B', height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => handleUpdateCrashStatus(selectedCrash._id, 'INVESTIGATING')}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Mark Investigating</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ backgroundColor: dynamicSubCardBg, borderWidth: 1, borderColor: dynamicBorder, paddingHorizontal: 16, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setSelectedCrash(null)}
              >
                <Text style={{ color: dynamicTextPrimary, fontWeight: '700', fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  refreshBtn: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  tabsBar: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    backgroundColor: '#FFFFFF',
  },
  tabBtnActive: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  cardTitleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statsBigNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    marginVertical: 4,
  },
  timelineLabel: {
    fontSize: 9,
    color: '#94A3B8',
  },
  categoryCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  categoryHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  categoryDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  usageListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  usageGridItem: {
    width: '50%',
    marginBottom: 10,
  },
  usageGridLabel: {
    fontSize: 9.5,
    color: '#64748B',
  },
  usageGridVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    gap: 6,
  },
  emptyStateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: '#FFFFFF',
  },
  searchInputInputField: {
    flex: 1,
    fontSize: 13,
  },
  userListItemCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  userListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  userListNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  userListPlanBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  userListPlanText: {
    fontSize: 9,
    fontWeight: '800',
  },
  userListItemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  metaRowLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  userCardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  userRowBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  userRowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  paymentItemRow: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  exportReportBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
  },
  smallPaidBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  smallRefundBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  smallBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  planAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planConsoleCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  planCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  planCardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  smallPlanEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bugReportCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  bugCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bugRefText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  bugStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  bugStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  bugTitleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
  },
  bugDescriptionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginVertical: 8,
  },
  metaRowDetails: {
    gap: 2,
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginBottom: 8,
  },
  bugActionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  bugActionBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  bugActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  inputFormLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  smallPillBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
  },
  smallPillBtnText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
  },
  testEmailSubmitBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissBg: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  userDetailCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    gap: 5,
    backgroundColor: '#F8FAFC',
  },
  userDetailTitleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
    marginBottom: 4,
  },
  userDetailRowText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  settingsSubSectionCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  smallCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  adjustBtnAction: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustSubmitBtn: {
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  planOptionBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  billingCycleBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loginAsUserBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  deleteUserBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },
  unauthorizedWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  unauthorizedSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  backHomeBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  filterPillText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  devReplyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#C8A34D',
    marginBottom: 8,
  },
  graphContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 70,
    marginTop: 14,
    paddingHorizontal: 10,
  },
  graphColumnWrapper: {
    alignItems: 'center',
  },
  graphBar: {
    width: 24,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  unauthorizedTitleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  subSectionTitleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statMiniCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  statValueText: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  statLabelText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  modalOverlayBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  modalCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  modalCardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  kpiMiniCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  kpiMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiMiniValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
});
