import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  TextInput as RNTextInput,
  TouchableOpacity,
  Vibration,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuthGuard } from '@/navigation/guards';
import { useUserStore } from '@/store/user';
import { useNotificationStore } from '@/store/notifications';
import { useRoleStore } from '@/store/role';
import { useFocusInterval } from '@/hooks';
import { useToastContext, useWorkspaceContext } from '@/providers';
import { apiClient } from '@/api/client';
import { useThemeContext } from '@/providers/theme-provider';
import { CaseService } from '@/services/case.service';
import { useTranslation, formatRelativeDate, formatTime } from '@/localization';
import { NotificationService } from '@/services/notification.service';
import { CaseWorkspace, NotificationInboxItem } from '@/types';
import { ProfileService } from '@/services/profile.service';
import { StorageService } from '@/services/storage.service';
import { Spacing, Radius, Shadows, Colors } from '@/theme';
import {
  Button,
  TextInput,
  DatePicker,
  Card,
  Badge,
  Avatar,
  ActionSheet,
  DeleteDialog,
  PageHeader,
} from '@/components/ui';

import { NewCaseIntelligenceModal } from '@/components/NewCaseIntelligenceModal';
import { StudentDashboardSection } from '@/components/StudentDashboardSection';
import { LawFirmDashboardSection } from '@/components/LawFirmDashboardSection';
import { ExperienceRoleSelector } from '@/components/ExperienceRoleSelector';
import { LawFirmOnboardingView } from '@/components/LawFirmOnboardingView';

// Responsive width calculations
const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const TRENDING_SEARCHES = [
  'IPC 420',
  'BNS',
  'Divorce',
  'GST',
  'Consumer Rights',
  'Labour Law',
  'Property',
  'RTI',
  'Motor Accident'
];

// Helper components for redesigned Dashboard Cards
interface DashboardCardProps {
  title: string;
  value: number;
  iconName: string;
  iconColor: string;
  iconBgColor: string;
  helperText: string;
  statusLabel: string;
  statusType: 'neutral' | 'primary' | 'purple' | 'urgent' | 'completed';
  onPress?: () => void;
  isDark: boolean;
  theme: any;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  iconName,
  iconColor,
  iconBgColor,
  helperText,
  statusLabel,
  statusType,
  onPress,
  isDark,
  theme,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;
  const styles = getStyles(theme);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Determine colors based on statusType
  let pillBg = 'transparent';
  let pillTextColor = isDark ? '#A1A1AA' : '#6B7280';

  if (statusType === 'completed' || statusLabel.toUpperCase() === 'LIVE') {
    pillTextColor = '#10B981'; // Green text only
  } else if (statusType === 'urgent' || statusLabel.toUpperCase() === 'TODAY') {
    pillTextColor = '#EF4444'; // Red text only
  } else if (statusLabel.toUpperCase() === 'PENDING' || statusLabel.toUpperCase() === 'UP TO DATE') {
    pillTextColor = '#EA580C'; // Orange text only
  } else if (statusType === 'primary' || statusType === 'purple') {
    pillTextColor = '#C8A34D'; // Gold text only
  }

  // Determine large number color (strictly Matte Black in light mode, Pure White in dark mode)
  let valueColor = isDark ? '#FFFFFF' : '#111111';

  const interpolatedShadowOpacity = shadowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.01, 0.04],
  });

  const cardBgColor = theme.card;
  const cardBorderColor = theme.border;
  const labelColor = theme.textSecondary;
  const helperTextColor = theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width: '48%', marginBottom: 16 }}
    >
      <Animated.View
        style={[
          styles.statCard,
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
            transform: [{ scale: scaleAnim }],
            shadowOpacity: interpolatedShadowOpacity,
          },
        ]}
      >
        {/* Top: Circle Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        {/* Middle: Title label + Large Value */}
        <View style={styles.cardContent}>
          <Text style={[styles.statLabel, { color: labelColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.statValue, { color: valueColor }]}>
            {value}
          </Text>
        </View>

        {/* Bottom: Status Pill & Helper Text */}
        <View style={styles.footerRow}>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <Text style={[styles.statusText, { color: pillTextColor }]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={[styles.helperText, { color: helperTextColor }]} numberOfLines={1} ellipsizeMode="tail">
            {helperText}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const SkeletonCard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const animatedOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedOpacity]);

  const { theme } = useThemeContext();
  const styles = getStyles(theme);
  const cardBgColor = theme.card;
  const cardBorderColor = theme.border;
  const skeletonBg = theme.surface;
  const skeletonSubBg = theme.divider;

  return (
    <Animated.View
      style={[
        styles.statCardSkeleton,
        {
          backgroundColor: cardBgColor,
          borderColor: cardBorderColor,
          opacity: animatedOpacity,
        },
      ]}
    >
      <View style={[styles.skeletonIcon, { backgroundColor: skeletonSubBg }]} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={[styles.skeletonTitle, { backgroundColor: skeletonSubBg }]} />
        <View style={[styles.skeletonValue, { backgroundColor: skeletonSubBg }]} />
      </View>
      <View style={[styles.skeletonFooter, { backgroundColor: skeletonBg }]}>
        <View style={[styles.skeletonPill, { backgroundColor: skeletonSubBg }]} />
        <View style={[styles.skeletonHelper, { backgroundColor: skeletonSubBg }]} />
      </View>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  useAuthGuard();
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { showToast } = useToastContext();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  
  const { selectedRole, setRole } = useRoleStore();
  const { syncWorkspaces, switchWorkspace, activeWorkspace, workspaces, refreshTeamMembers } = useWorkspaceContext();
  
  const profile = useUserStore((s) => s.profile);
  const userName = profile?.name || 'Counsel';

  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // State Management
  const [cases, setCases] = useState<CaseWorkspace[]>([]);
  const [notifications, setNotifications] = useState<NotificationInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<any | null>(null);

  // Animated values for quick action card press animations
  const newCaseScale = useRef(new Animated.Value(1)).current;
  const productGuideScale = useRef(new Animated.Value(1)).current;

  // AI Legal Knowledge Hub Card Animations
  const khOpacity = useRef(new Animated.Value(0)).current;
  const khTranslateY = useRef(new Animated.Value(15)).current;
  const khScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(khOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(khTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleOpenKnowledgeHub = () => {
    Vibration.vibrate(35);
    Animated.sequence([
      Animated.timing(khScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(khScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start(() => {
      router.push('/tools/knowledge-hub' as any);
    });
  };

  // Modal / Dropdown / Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseWorkspace | null>(null);
  const [selectedCaseForActions, setSelectedCaseForActions] = useState<CaseWorkspace | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [caseToDeleteId, setCaseToDeleteId] = useState<string | null>(null);


  const [currentTime, setCurrentTime] = useState(new Date());

  // Background clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Onboarding Product Guide Banner State & Animations
  const setProfile = useUserStore((s) => s.setProfile);
  const showOnboarding = profile?.personalizations?.general?.showProductGuideBanner !== false;
  const [isBannerVisible, setIsBannerVisible] = useState(showOnboarding);
  const onboardingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsBannerVisible(showOnboarding);
  }, [showOnboarding]);

  useEffect(() => {
    if (isBannerVisible) {
      onboardingAnim.setValue(0);
      Animated.timing(onboardingAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [isBannerVisible]);

  const bannerOpacity = onboardingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const bannerMaxHeight = onboardingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });

  const bannerMargin = onboardingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });

  const bannerTranslateY = onboardingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const handleCloseOnboarding = async (openGuide = false) => {
    Animated.timing(onboardingAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: false,
    }).start(async () => {
      setIsBannerVisible(false);
      if (!profile) return;
      try {
        const nextPersonalizations = {
          ...profile.personalizations,
          general: {
            ...profile.personalizations.general,
            showProductGuideBanner: false,
          },
        };

        const updatedProfile = {
          ...profile,
          personalizations: nextPersonalizations,
        };

        setProfile(updatedProfile);
        await StorageService.setItem('@user_personalizations', JSON.stringify(nextPersonalizations));
        await ProfileService.updateProfile({
          personalizations: nextPersonalizations,
        });
      } catch (err) {
        console.warn('[DASHBOARD] Failed to update onboarding status:', err);
      }

      if (openGuide) {
        router.push('/settings/guide');
      }
    });
  };

  // Fetch all dashboard data from backend APIs
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);

    try {
      setError(null);

      // Fetch cases (projects) from API
      try {
        const casesRes = await CaseService.listCases();
        const casesData = Array.isArray(casesRes) ? casesRes : (casesRes?.data || []);
        if (casesData && casesData.length > 0) {
          setCases(casesData as any);
        }
      } catch (caseErr) {
        console.warn('[DASHBOARD] Cases fetch note:', caseErr);
      }

      // Fetch AI notifications
      try {
        const notifsRes = await NotificationService.getNotifications();
        const notifsData = Array.isArray(notifsRes) ? notifsRes : (notifsRes?.data || []);
        if (notifsData && notifsData.length > 0) {
          setNotifications(notifsData as any);
        }
      } catch (notifErr) {
        console.warn('[DASHBOARD] Notifications fetch note:', notifErr);
      }

      // Fetch pending invitations
      try {
        const inviteRes = await apiClient.get('/workspaces/invitations/pending');
        if (inviteRes.data && inviteRes.data.success && inviteRes.data.invitations?.length > 0) {
          setPendingInvite(inviteRes.data.invitations[0]);
        } else {
          setPendingInvite(null);
        }
      } catch (inviteErr) {
        console.warn('Failed to fetch pending invitations:', inviteErr);
      }
    } catch (err: any) {
      console.warn('[DASHBOARD] Fetching note:', err);

      // Auto-heal/reconcile if access is denied
      const isAccessDenied = err.response?.status === 403 || 
                             (err.message && err.message.toLowerCase().includes('access denied'));
                             
      if (isAccessDenied && activeWorkspace?.id !== 'personal_practice') {
        console.log('[DASHBOARD] Access denied on active workspace. Auto-switching to personal workspace.');
        showToast('error', 'Access Denied', 'Switching back to personal workspace.');
        await switchWorkspace('personal_practice');
        await setRole('advocate');
        return;
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [showToast, activeWorkspace, switchWorkspace, setRole]);

  const handleAcceptInvite = async (inviteId: string, workspaceId: string) => {
    try {
      const res = await apiClient.post(`/workspaces/invitations/${inviteId}/accept`);
      if (res.data && res.data.success) {
        showToast('success', 'Invitation Accepted', 'You have successfully joined the firm workspace.');
        setPendingInvite(null);
        await syncWorkspaces();
        await switchWorkspace(workspaceId);
        await setRole('law_firm');
        if (refreshTeamMembers) await refreshTeamMembers(workspaceId);
      } else {
        showToast('error', 'Action Failed', res.data.error || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to accept invitation.');
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    try {
      const res = await apiClient.post(`/workspaces/invitations/${inviteId}/reject`);
      if (res.data && res.data.success) {
        showToast('success', 'Invitation Rejected', 'Invitation rejected.');
        setPendingInvite(null);
      } else {
        showToast('error', 'Action Failed', res.data.error || 'Failed to reject invitation.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to reject invitation.');
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'advocate':
        return 'Advocate ';
      case 'student':
        return 'Student ';
      case 'judge':
        return 'Judge ';
      case 'police':
        return 'Police Officer ';
      case 'corporate':
        return 'Corporate Counsel ';
      case 'law_firm':
      case 'enterprise':
      default:
        return '';
    }
  };

  // Sync workspaces list with backend on mount and role switch
  useEffect(() => {
    syncWorkspaces().catch((err) => console.warn('[DASHBOARD] Sync error:', err));
  }, [selectedRole]);

  // Run on mount, role switch & workspace switch
  useEffect(() => {
    setCases([]); // Clear memory immediately on workspace/role switch to prevent stale data
    fetchDashboardData();
  }, [selectedRole, activeWorkspace?.id]);

  // Safe periodic sync only while this screen is actively focused in foreground
  useFocusInterval(() => {
    fetchDashboardData(true);
  }, 30000);

  // Pull to refresh handler
  const handlePullToRefresh = () => {
    fetchDashboardData(false);
  };

  // Helper date checker for hearings
  const isHearingToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr.includes(todayStr) || new Date(dateStr).toDateString() === new Date().toDateString();
  };

  // --- Computed Stats (parities with web) ---
  const activeCasesList = useMemo(() => cases.filter((c) => c.status === 'Active' || !c.status), [cases]);
  const archivedCasesList = useMemo(() => cases.filter((c) => c.status === 'Archived'), [cases]);
  const completedCasesList = useMemo(() => cases.filter((c) => c.status === 'Closed'), [cases]);
  const highPriorityCasesList = useMemo(() => activeCasesList.filter((c) => c.priority === 'High' || c.priority === 'Urgent'), [activeCasesList]);

  const totalActiveCases = activeCasesList.length;

  // Compute stats lists
  const todaysHearingsList = useMemo(() => {
    const list: any[] = [];
    activeCasesList.forEach((c) => {
      if (c.hearings && c.hearings.length > 0) {
        c.hearings.forEach((h) => {
          if (isHearingToday(h.date)) {
            list.push({
              caseId: c._id,
              caseName: c.name,
              court: h.courtName || c.opponentName || 'District Court',
              judge: h.notes || 'Presiding Magistrate',
              time: h.time || '10:00 AM',
              title: h.status || 'Scheduled Hearing',
              priority: c.priority || 'Medium',
            });
          }
        });
      }
    });
    return list;
  }, [activeCasesList]);

  const totalTodaysHearingsCount = todaysHearingsList.length;

  const totalPendingDrafts = useMemo(() => {
    return activeCasesList.reduce((acc, c) => acc + (c.documents?.filter(d => d.type === 'Filing' || d.type === 'Other').length || 0), 0);
  }, [activeCasesList]);

  const totalPendingResearch = useMemo(() => {
    return activeCasesList.reduce((acc, c) => acc + (c.research?.length || 0), 0);
  }, [activeCasesList]);

  // Recent cases (sorted by last updated)
  const recentCasesList = useMemo(() => {
    return [...cases].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [cases]);

  // Continue working case (last updated active case)
  const continueWorkingCase = useMemo(() => {
    return [...activeCasesList].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];
  }, [activeCasesList]);

  // Upcoming deadlines
  const sortedDeadlines = useMemo(() => {
    const list: any[] = [];
    activeCasesList.forEach((c) => {
      if (c.hearings) {
        c.hearings.forEach((h) => {
          if (h.date) {
            const hDate = new Date(h.date);
            if (hDate.getTime() > Date.now() && !isHearingToday(h.date)) {
              list.push({
                caseName: c.name,
                title: `Hearing: ${h.notes || 'Scheduled Docket'}`,
                date: hDate,
                type: 'hearing',
              });
            }
          }
        });
      }
      if (c.facts) {
        c.facts.forEach((f) => {
          if (f.date) {
            const fDate = new Date(f.date);
            if (fDate.getTime() > Date.now()) {
              list.push({
                caseName: c.name,
                title: `Fact Event: ${f.event}`,
                date: fDate,
                type: 'milestone',
              });
            }
          }
        });
      }
    });
    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
  }, [activeCasesList]);

  // Case Analytics (Strength)
  const averageStrength = useMemo(() => {
    let sum = 0;
    let count = 0;
    activeCasesList.forEach((c) => {
      const strength = c.intelligence?.strengthScore;
      if (strength !== undefined) {
        sum += strength;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 75;
  }, [activeCasesList]);

  const categoryAnalytics = useMemo(() => {
    const map: Record<string, number> = {};
    activeCasesList.forEach((c) => {
      const cat = c.caseType || 'General Civil';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.keys(map)
      .map((key) => ({
        name: key,
        count: map[key],
        percentage: Math.round((map[key] / totalActiveCases) * 100) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [activeCasesList, totalActiveCases]);

  // AI Insights
  const aiInsightsList = useMemo(() => {
    const list: any[] = [];
    activeCasesList.forEach((c) => {
      if (c.documents && c.documents.length > 0 && c.documents.some((d) => d.tags?.includes('Vulnerable'))) {
        list.push({
          id: `ins-${c._id}-contract`,
          caseName: c.name,
          tip: 'A document uploaded has unlinked contracts with risk flags. Verify limiting dates.',
          type: 'warning',
        });
      }
      if (c.hearings && c.hearings.length > 0 && !c.hearings.some((h) => h.status === 'Completed')) {
        list.push({
          id: `ins-${c._id}-hearings`,
          caseName: c.name,
          tip: 'First hearing is scheduled. Compile case docket binder early to avoid administrative delays.',
          type: 'strategy',
        });
      }
    });

    if (list.length === 0) {
      list.push({
        id: 'ins-def-1',
        caseName: 'Global Recommendation',
        tip: 'AI Strategy recommends checking evidence mappings on commercial recovery filings early.',
        type: 'strategy',
      });
    }
    return list;
  }, [activeCasesList]);

  // Simulation AI activity logs
  const recentAiActivities = useMemo(() => {
    const list: any[] = [];
    recentCasesList.slice(0, 3).forEach((c, idx) => {
      const activities = [
        'AI analyzed contract vulnerabilities & calculated risk score',
        'AI compiled trial docket preparation binder',
        'AI researched matching Supreme Court precedents',
      ];
      list.push({
        caseName: c.name,
        activity: activities[idx % activities.length],
        time: c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      });
    });
    return list;
  }, [recentCasesList]);

  // --- Handlers ---
  const handleUpdateCase = async () => {

    if (!editingCase || !editingCase.name) {
      showToast('error', 'Error', 'Case Name is required.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await CaseService.updateCase(editingCase._id, {
        name: editingCase.name,
        clientName: editingCase.clientName,
        opponentName: editingCase.opponentName,
        caseType: editingCase.caseType,
        courtName: editingCase.courtName,
        summary: editingCase.summary,
        priority: editingCase.priority,
      });

      if (res.success) {
        showToast('success', 'Success', 'Case details updated.');
        setEditingCase(null);
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update case.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArchive = useCallback(async (c: CaseWorkspace) => {
    const newStatus = c.status === 'Archived' ? 'Active' : 'Archived';
    try {
      setIsLoading(true);
      const res = await CaseService.updateCase(c._id, { status: newStatus });
      if (res.success) {
        showToast('success', 'Updated', newStatus === 'Archived' ? 'Case folder archived.' : 'Case folder restored.');
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to change archive status.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchDashboardData, showToast]);

  const handleDeleteCase = async () => {
    if (!caseToDeleteId) return;

    try {
      setIsLoading(true);
      const res = await CaseService.deleteCase(caseToDeleteId);
      if (res.success) {
        showToast('success', 'Deleted', 'Case folder permanently deleted.');
        setCaseToDeleteId(null);
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to delete case.');
    } finally {
      setIsLoading(false);
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Format header date string
  const formatDateString = (date: Date) => {
    let locale = 'en-US';
    if (language === 'Hindi' || language === 'Bilingual') locale = 'hi-IN';
    else if (language === 'Gujarati') locale = 'gu-IN';
    else if (language === 'Marathi') locale = 'mr-IN';
    else if (language === 'Tamil') locale = 'ta-IN';

    try {
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const caseActionItems = useMemo(() => {
    if (!selectedCaseForActions) return [];
    const isArchived = selectedCaseForActions.status === 'Archived';

    return [
      {
        label: t('cases.openWorkspace'),
        icon: '⚖️',
        onPress: () => router.push(`/workspace/${selectedCaseForActions._id}` as any),
      },
      {
        label: t('cases.editDetails'),
        icon: '📝',
        onPress: () => setEditingCase({ ...selectedCaseForActions }),
      },
      {
        label: isArchived ? t('cases.restoreCase') : t('cases.archiveCase'),
        icon: '📁',
        onPress: () => handleToggleArchive(selectedCaseForActions),
      },
      {
        label: t('cases.deleteCase'),
        icon: '🗑️',
        isDestructive: true,
        onPress: () => setCaseToDeleteId(selectedCaseForActions._id),
      },
    ];
  }, [selectedCaseForActions, router, handleToggleArchive, t]);

  const firmWorkspaces = workspaces.filter((w: any) => w.type !== 'personal');
  const showLawFirmOnboarding = selectedRole === 'law_firm' && firmWorkspaces.length === 0;

  // Loading Screen
  // We allow the dashboard to render immediately so that we can show skeleton loader cards.
  /*
  if (isLoading && cases.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading litigation dashboard...</Text>
      </ThemedView>
    );
  }
  */

  return (
    <ThemedView style={styles.container}>
      {/* Refined Home Header with Safe Area and Hierarchical Greeting */}
      <View
        style={{
          paddingTop: insets.top > 0 ? insets.top + 24 : 36, // Proper top padding/safe area for breathing space
          paddingBottom: 20, // Comfortable padding below content
          paddingHorizontal: 20, // Clean breathing margin from screen edges
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        {/* ROW 1: Welcome & User Full Name (Left) + Notification Bell (Fixed Right) */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textSecondary, letterSpacing: 0.1 }}>
              {t('home.greeting')}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginTop: 2, letterSpacing: -0.3 }}
            >
              {`${getRoleTitle(selectedRole)}${userName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isSyncing && (
              <ActivityIndicator size="small" color={theme.primary} />
            )}

            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              style={({ pressed }) => [
                {
                  width: 44,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
                pressed && { backgroundColor: theme.pressed || '#F3F4F6' },
              ]}
              accessibilityLabel="Open Notifications"
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: theme.danger || '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: theme.card,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ROW 2: Active Workspace Selector Pill + Date Display */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <ExperienceRoleSelector />

          <Text style={{ fontSize: 11.5, color: theme.textMuted || '#9CA3AF', fontWeight: '500', letterSpacing: 0.1 }}>
            {formatDateString(currentTime)}
          </Text>
        </View>
      </View>
      {showLawFirmOnboarding ? (
        <LawFirmOnboardingView onRefreshInvite={() => fetchDashboardData(true)} />
      ) : (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing && !isLoading}
              onRefresh={handlePullToRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {error && (
            <View style={[styles.errorAlert, { backgroundColor: theme.surfaceVariant, borderColor: theme.danger }]}>
              <Text style={[styles.errorAlertText, { color: theme.danger }]}>⚠️ {error}</Text>
            </View>
          )}

          {/* DYNAMIC ROLE DASHBOARD SECTION */}
          {selectedRole === 'student' ? (
            <>
              <StudentDashboardSection theme={theme} isDark={isDark} />
              
              {/* AI Legal Knowledge Hub Card */}
              <Animated.View
                style={{
                  opacity: khOpacity,
                  transform: [
                    { translateY: khTranslateY },
                    { scale: khScale }
                  ],
                }}
              >
                <Pressable
                  onPress={handleOpenKnowledgeHub}
                  style={({ pressed }) => [
                    styles.khCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isDark ? '#333333' : '#E5E5E5',
                    },
                    pressed && { opacity: 0.98 },
                  ]}
                  accessibilityLabel="AI Legal Knowledge Hub"
                >
                  <View style={styles.khHeader}>
                    <View style={[styles.khIconWrapper, { backgroundColor: isDark ? '#222222' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5E5E5' }]}>
                      <Ionicons name="book-outline" size={20} color="#C8A34D" />
                    </View>
                    <View style={styles.khTitleContainer}>
                      <Text style={[styles.khTitle, { color: theme.textPrimary }]}>AI Legal Knowledge Hub</Text>
                      <Text style={[styles.khSubtitle, { color: theme.textSecondary }]}>
                        Search Indian laws, sections, judgments, legal procedures and get AI-powered legal answers.
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.khSearchContainer, { backgroundColor: isDark ? '#221E38' : '#F9F8FF', borderColor: isDark ? '#4C4869' : '#DCD5FA' }]}>
                    <Ionicons name="search-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
                    <RNTextInput
                      placeholder="Ask any legal question..."
                      placeholderTextColor={isDark ? '#8A8A9E' : '#9CA3AF'}
                      style={[styles.khSearchInput, { color: theme.textPrimary }]}
                      onChangeText={(text) => {
                        router.push({
                          pathname: '/tools/knowledge-hub' as any,
                          params: { q: text }
                        });
                      }}
                    />
                  </View>

                  <Text style={[styles.khTrendingTitle, { color: theme.textSecondary }]}>Trending Searches:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.khChipsContainer}
                  >
                    {TRENDING_SEARCHES.map((chip, idx) => (
                      <Pressable
                        key={idx}
                        style={[styles.khChip, { backgroundColor: isDark ? '#2D234D' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5DEFF' }]}
                        onPress={() => {
                          Vibration.vibrate(30);
                          router.push({
                            pathname: '/tools/knowledge-hub' as any,
                            params: { q: chip }
                          });
                        }}
                        android_ripple={{ color: 'rgba(124, 92, 255, 0.15)' }}
                      >
                        <Text style={[styles.khChipText, { color: '#C8A34D' }]}>{chip}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={styles.khFooter}>
                    <Text style={styles.khActionText}>Open Knowledge Hub</Text>
                    <Ionicons name="arrow-forward" size={14} color="#C8A34D" />
                  </View>
                </Pressable>
              </Animated.View>

              {/* Product Guide Card */}
              {isBannerVisible && (
                <Animated.View
                  style={{
                    opacity: bannerOpacity,
                    maxHeight: bannerMaxHeight,
                    marginBottom: bannerMargin,
                    transform: [{ translateY: bannerTranslateY }],
                    overflow: 'hidden',
                  }}
                >
                  <View style={[styles.onboardingCard, { backgroundColor: isDark ? '#231545' : '#F5F5F5', borderColor: isDark ? '#4C1D95' : '#DDD6FE' }]}>
                    <View style={styles.onboardingHeader}>
                      <View style={styles.onboardingTitleRow}>
                        <Ionicons name="sparkles" size={16} color={isDark ? '#A78BFA' : '#111111'} style={{ marginRight: 6 }} />
                        <Text style={[styles.onboardingTitle, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>New to AI LEGAL™?</Text>
                      </View>
                      <Pressable style={styles.onboardingDismiss} onPress={() => handleCloseOnboarding(false)} accessibilityRole="button" accessibilityLabel="Dismiss tips">
                        <Ionicons name="close" size={20} color={isDark ? '#A78BFA' : '#6B7280'} />
                      </Pressable>
                    </View>

                    <Text style={[styles.onboardingSubtitle, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Meet your AI Product Guide.</Text>

                    <View style={styles.onboardingBullets}>
                      <View style={styles.onboardingBulletRow}>
                        <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                        <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Learn every feature step-by-step.</Text>
                      </View>
                      <View style={styles.onboardingBulletRow}>
                        <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                        <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Ask questions in Hindi or English.</Text>
                      </View>
                      <View style={styles.onboardingBulletRow}>
                        <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                        <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Get instant help while using the app.</Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.onboardingBtn,
                        {
                          backgroundColor: pressed ? 'rgba(200, 163, 77, 0.85)' : '#C8A34D'
                        }
                      ]}
                      onPress={() => handleCloseOnboarding(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Open Product Guide"
                    >
                      <Text style={styles.onboardingBtnText}>Open Product Guide →</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </>
          ) : selectedRole === 'law_firm' ? (
            <>
              <LawFirmDashboardSection theme={theme} isDark={isDark} cases={cases} />

              {/* AI Legal Knowledge Hub Card */}
              <Animated.View
                style={{
                  opacity: khOpacity,
                  transform: [
                    { translateY: khTranslateY },
                    { scale: khScale }
                  ],
                }}
              >
                <Pressable
                  onPress={handleOpenKnowledgeHub}
                  style={({ pressed }) => [
                    styles.khCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isDark ? '#333333' : '#E5E5E5',
                    },
                    pressed && { opacity: 0.98 },
                  ]}
                  accessibilityLabel="AI Legal Knowledge Hub"
                >
                  <View style={styles.khHeader}>
                    <View style={[styles.khIconWrapper, { backgroundColor: isDark ? '#222222' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5E5E5' }]}>
                      <Ionicons name="book-outline" size={20} color="#C8A34D" />
                    </View>
                    <View style={styles.khTitleContainer}>
                      <Text style={[styles.khTitle, { color: theme.textPrimary }]}>AI Legal Knowledge Hub</Text>
                      <Text style={[styles.khSubtitle, { color: theme.textSecondary }]}>
                        Search Indian laws, sections, judgments, legal procedures and get AI-powered legal answers.
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.khSearchContainer, { backgroundColor: isDark ? '#221E38' : '#F9F8FF', borderColor: isDark ? '#4C4869' : '#DCD5FA' }]}>
                    <Ionicons name="search-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
                    <RNTextInput
                      placeholder="Ask any legal question..."
                      placeholderTextColor={isDark ? '#8A8A9E' : '#9CA3AF'}
                      style={[styles.khSearchInput, { color: theme.textPrimary }]}
                      onChangeText={(text) => {
                        router.push({
                          pathname: '/tools/knowledge-hub' as any,
                          params: { q: text }
                        });
                      }}
                    />
                  </View>

                  <Text style={[styles.khTrendingTitle, { color: theme.textSecondary }]}>Trending Searches:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.khChipsContainer}
                  >
                    {TRENDING_SEARCHES.map((chip, idx) => (
                      <Pressable
                        key={idx}
                        style={[styles.khChip, { backgroundColor: isDark ? '#2D234D' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5DEFF' }]}
                        onPress={() => {
                          Vibration.vibrate(30);
                          router.push({
                            pathname: '/tools/knowledge-hub' as any,
                            params: { q: chip }
                          });
                        }}
                        android_ripple={{ color: 'rgba(124, 92, 255, 0.15)' }}
                      >
                        <Text style={[styles.khChipText, { color: '#C8A34D' }]}>{chip}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={styles.khFooter}>
                    <Text style={styles.khActionText}>Open Knowledge Hub</Text>
                    <Ionicons name="arrow-forward" size={14} color="#C8A34D" />
                  </View>
                </Pressable>
              </Animated.View>

              {/* Product Guide Card */}
              {isBannerVisible && (
                <Animated.View
                  style={{
                    opacity: bannerOpacity,
                    maxHeight: bannerMaxHeight,
                    marginBottom: bannerMargin,
                    transform: [{ translateY: bannerTranslateY }],
                    overflow: 'hidden',
                  }}
                >
                  <View style={[styles.onboardingCard, { backgroundColor: isDark ? '#231545' : '#F5F5F5', borderColor: isDark ? '#4C1D95' : '#DDD6FE' }]}>
                    <View style={styles.onboardingHeader}>
                      <View style={styles.onboardingTitleRow}>
                        <Ionicons name="sparkles" size={16} color={isDark ? '#A78BFA' : '#111111'} style={{ marginRight: 6 }} />
                        <Text style={[styles.onboardingTitle, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>New to AI LEGAL™?</Text>
                      </View>
                      <Pressable style={styles.onboardingDismiss} onPress={() => handleCloseOnboarding(false)} accessibilityRole="button" accessibilityLabel="Dismiss tips">
                        <Ionicons name="close" size={20} color={isDark ? '#A78BFA' : '#6B7280'} />
                      </Pressable>
                    </View>

                    <Text style={[styles.onboardingSubtitle, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Meet your AI Product Guide.</Text>

                    <View style={styles.onboardingBullets}>
                      <View style={styles.onboardingBulletRow}>
                        <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                        <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Learn every feature step-by-step.</Text>
                      </View>
                      <View style={styles.onboardingBulletRow}>
                        <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                        <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Ask questions in Hindi or English.</Text>
                      </View>
                      <View style={styles.onboardingBulletRow}>
                        <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                        <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Get instant help while using the app.</Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.onboardingBtn,
                        {
                          backgroundColor: pressed ? 'rgba(200, 163, 77, 0.85)' : '#C8A34D'
                        }
                      ]}
                      onPress={() => handleCloseOnboarding(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Open Product Guide"
                    >
                      <Text style={styles.onboardingBtnText}>Open Product Guide →</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </>
          ) : (
            <>
              {/* Advocate Dashboard (100% UNCHANGED Flow) */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('home.todaysOverview')}</Text>
                <View style={styles.statsGrid}>
                  {isLoading ? (
                    <>
                      <SkeletonCard isDark={isDark} />
                      <SkeletonCard isDark={isDark} />
                      <SkeletonCard isDark={isDark} />
                      <SkeletonCard isDark={isDark} />
                    </>
                  ) : (
                    <>
                  <DashboardCard
                    title={t('home.activeCases')}
                    value={totalActiveCases}
                    iconName="briefcase-outline"
                    iconColor="#C8A34D"
                    iconBgColor={isDark ? '#222222' : '#F5F5F5'}
                    helperText={`${totalActiveCases} ${t('cases.active')}`}
                    statusLabel={totalActiveCases === 0 ? t('cases.emptyStatus') : t('cases.liveStatus')}
                    statusType={totalActiveCases === 0 ? 'neutral' : (totalActiveCases > 5 ? 'purple' : 'primary')}
                    onPress={() => router.push('/(tabs)/cases')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title={t('home.todaysHearings')}
                    value={totalTodaysHearingsCount}
                    iconName="calendar-outline"
                    iconColor="#C8A34D"
                    iconBgColor={isDark ? '#222222' : '#F5F5F5'}
                    helperText={totalTodaysHearingsCount === 0 ? t('cases.nothingScheduled') : t('cases.nextHearingToday')}
                    statusLabel={totalTodaysHearingsCount === 0 ? t('cases.emptyStatus') : t('cases.today').toUpperCase()}
                    statusType={totalTodaysHearingsCount === 0 ? 'neutral' : 'urgent'}
                    onPress={() => router.push('/(tabs)/cases')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title={t('home.pendingDrafts')}
                    value={totalPendingDrafts}
                    iconName="document-text-outline"
                    iconColor="#C8A34D"
                    iconBgColor={isDark ? '#222222' : '#F5F5F5'}
                    helperText={totalPendingDrafts === 0 ? t('cases.nothingPending') : t('cases.requiresReview')}
                    statusLabel={totalPendingDrafts === 0 ? t('cases.upToDate').toUpperCase() : t('cases.pending').toUpperCase()}
                    statusType={totalPendingDrafts === 0 ? 'completed' : (totalPendingDrafts > 5 ? 'urgent' : 'primary')}
                    onPress={() => router.push('/(tabs)/tools')}
                    isDark={isDark}
                    theme={theme}
                  />

                  <DashboardCard
                    title={t('home.pendingResearch')}
                    value={totalPendingResearch}
                    iconName="search-outline"
                    iconColor="#C8A34D"
                    iconBgColor={isDark ? '#222222' : '#F5F5F5'}
                    helperText={totalPendingResearch === 0 ? t('cases.upToDate') : t('cases.researchNeeded')}
                    statusLabel={totalPendingResearch === 0 ? t('cases.upToDate').toUpperCase() : t('cases.aiGenerated').toUpperCase()}
                    statusType={totalPendingResearch === 0 ? 'completed' : (totalPendingResearch > 5 ? 'purple' : 'primary')}
                    onPress={() => router.push('/(tabs)/tools')}
                    isDark={isDark}
                    theme={theme}
                  />
                </>
              )}
            </View>
          </View>

          {/* 3. Continue Working */}
          {continueWorkingCase && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('home.continueWorking')}</Text>
              <Pressable
                onPress={() => router.push(`/workspace/${continueWorkingCase._id}` as any)}
                style={({ pressed }) => [
                  styles.continueCard,
                  { backgroundColor: theme.card, borderColor: pressed ? theme.primary : theme.border },
                  Shadows.card,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Continue working on case: ${continueWorkingCase.name}`}
              >
                <View style={styles.continueHeader}>
                  <Badge label={t('cases.lastUpdated')} variant="info" />
                  <Ionicons name="open-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.continueTitle, { color: theme.textPrimary }]}>{continueWorkingCase.name}</Text>
                <Text style={[styles.continueSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                  {continueWorkingCase.summary || t('cases.noSummary')}
                </Text>
                <View style={[styles.continueFooter, { borderTopColor: theme.divider }]}>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    {t('cases.hearings')}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.hearings?.length || 0}</Text>
                  </Text>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    {t('cases.evidence')}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.evidence?.length || 0}</Text>
                  </Text>
                  <Text style={[styles.continueInfoText, { color: theme.textSecondary }]}>
                    {t('cases.contracts')}: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{continueWorkingCase.documents?.filter(d => d.type === 'Agreement' || d.tags?.includes('Contract'))?.length || 0}</Text>
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* AI Legal Knowledge Hub Card (Advocate Flow) */}
          <Animated.View
            style={{
              opacity: khOpacity,
              transform: [
                { translateY: khTranslateY },
                { scale: khScale }
              ],
            }}
          >
            <Pressable
              onPress={handleOpenKnowledgeHub}
              style={({ pressed }) => [
                styles.khCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isDark ? '#333333' : '#E5E5E5',
                },
                pressed && { opacity: 0.98 },
              ]}
              accessibilityLabel="AI Legal Knowledge Hub"
            >
              <View style={styles.khHeader}>
                <View style={[styles.khIconWrapper, { backgroundColor: isDark ? '#222222' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5E5E5' }]}>
                  <Ionicons name="book-outline" size={20} color="#C8A34D" />
                </View>
                <View style={styles.khTitleContainer}>
                  <Text style={[styles.khTitle, { color: theme.textPrimary }]}>AI Legal Knowledge Hub</Text>
                  <Text style={[styles.khSubtitle, { color: theme.textSecondary }]}>
                    Search Indian laws, sections, judgments, legal procedures and get AI-powered legal answers.
                  </Text>
                </View>
              </View>

              <View style={[styles.khSearchContainer, { backgroundColor: isDark ? '#221E38' : '#F9F8FF', borderColor: isDark ? '#4C4869' : '#DCD5FA' }]}>
                <Ionicons name="search-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
                <RNTextInput
                  placeholder="Ask any legal question..."
                  placeholderTextColor={isDark ? '#8A8A9E' : '#9CA3AF'}
                  style={[styles.khSearchInput, { color: theme.textPrimary }]}
                  onChangeText={(text) => {
                    router.push({
                      pathname: '/tools/knowledge-hub' as any,
                      params: { q: text }
                    });
                  }}
                />
              </View>

              <Text style={[styles.khTrendingTitle, { color: theme.textSecondary }]}>Trending Searches:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.khChipsContainer}
              >
                {TRENDING_SEARCHES.map((chip, idx) => (
                  <Pressable
                    key={idx}
                    style={[styles.khChip, { backgroundColor: isDark ? '#2D234D' : '#F5F5F5', borderColor: isDark ? '#333333' : '#E5DEFF' }]}
                    onPress={() => {
                      Vibration.vibrate(30);
                      router.push({
                        pathname: '/tools/knowledge-hub' as any,
                        params: { q: chip }
                      });
                    }}
                    android_ripple={{ color: 'rgba(124, 92, 255, 0.15)' }}
                  >
                    <Text style={[styles.khChipText, { color: '#C8A34D' }]}>{chip}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.khFooter}>
                <Text style={styles.khActionText}>Open Knowledge Hub</Text>
                <Ionicons name="arrow-forward" size={14} color="#C8A34D" />
              </View>
            </Pressable>
          </Animated.View>

          {/* Product Guide Card (Advocate Flow) */}
          {isBannerVisible && (
            <Animated.View
              style={{
                opacity: bannerOpacity,
                maxHeight: bannerMaxHeight,
                marginBottom: bannerMargin,
                transform: [{ translateY: bannerTranslateY }],
                overflow: 'hidden',
              }}
            >
              <View style={[styles.onboardingCard, { backgroundColor: isDark ? '#231545' : '#F5F5F5', borderColor: isDark ? '#4C1D95' : '#DDD6FE' }]}>
                <View style={styles.onboardingHeader}>
                  <View style={styles.onboardingTitleRow}>
                    <Ionicons name="sparkles" size={16} color={isDark ? '#A78BFA' : '#111111'} style={{ marginRight: 6 }} />
                    <Text style={[styles.onboardingTitle, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>New to AI LEGAL™?</Text>
                  </View>
                  <Pressable style={styles.onboardingDismiss} onPress={() => handleCloseOnboarding(false)} accessibilityRole="button" accessibilityLabel="Dismiss tips">
                    <Ionicons name="close" size={20} color={isDark ? '#A78BFA' : '#6B7280'} />
                  </Pressable>
                </View>

                <Text style={[styles.onboardingSubtitle, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Meet your AI Product Guide.</Text>

                <View style={styles.onboardingBullets}>
                  <View style={styles.onboardingBulletRow}>
                    <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                    <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Learn every feature step-by-step.</Text>
                  </View>
                  <View style={styles.onboardingBulletRow}>
                    <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                    <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Ask questions in Hindi or English.</Text>
                  </View>
                  <View style={styles.onboardingBulletRow}>
                    <Text style={[styles.onboardingBulletDot, { color: isDark ? '#A78BFA' : '#111111' }]}>•</Text>
                    <Text style={[styles.onboardingBulletText, { color: isDark ? '#E9D5FF' : '#4B5563' }]}>Get instant help while using the app.</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.onboardingBtn,
                    {
                      backgroundColor: pressed ? 'rgba(200, 163, 77, 0.85)' : '#C8A34D'
                    }
                  ]}
                  onPress={() => handleCloseOnboarding(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open Product Guide"
                >
                  <Text style={styles.onboardingBtnText}>Open Product Guide →</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Quick Actions (Positioned at bottom of Home Screen) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('home.quickActions')}</Text>
            <View style={styles.quickActionsRow}>
              <Animated.View style={{ transform: [{ scale: newCaseScale }], flex: 1 }}>
                <Pressable
                  onPressIn={() => {
                    Animated.timing(newCaseScale, {
                      toValue: 0.94,
                      duration: 100,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.timing(newCaseScale, {
                      toValue: 1,
                      duration: 120,
                      useNativeDriver: true,
                    }).start();
                    setIsCreateModalOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: pressed ? (isDark ? '#2D234D' : '#F5F5F5') : theme.card,
                    }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="New Case"
                  android_ripple={{ color: 'rgba(108, 76, 241, 0.15)', borderless: false }}
                >
                  <View style={styles.iconWrapper}>
                    <Ionicons name="add-outline" size={24} color="#111111" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>{t('home.newCaseTitle')}</Text>
                </Pressable>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: productGuideScale }], flex: 1 }}>
                <Pressable
                  onPressIn={() => {
                    Animated.timing(productGuideScale, {
                      toValue: 0.94,
                      duration: 100,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.timing(productGuideScale, {
                      toValue: 1,
                      duration: 120,
                      useNativeDriver: true,
                    }).start();
                    router.push('/settings/guide');
                  }}
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: pressed ? (isDark ? '#2D234D' : '#F5F5F5') : theme.card,
                    }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Product Guide"
                  android_ripple={{ color: 'rgba(108, 76, 241, 0.15)', borderless: false }}
                >
                  <View style={styles.iconWrapper}>
                    <Ionicons name="sparkles-outline" size={24} color="#111111" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>{t('home.productGuide')}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
          </>
          )}
        </ScrollView>

        {/* ActionSheet Menu for Case List Items */}
        <ActionSheet
          visible={isActionSheetOpen}
          onClose={() => setIsActionSheetOpen(false)}
          title={selectedCaseForActions?.name ? `${t('cases.actions')}: ${selectedCaseForActions.name}` : t('cases.actions')}
          items={caseActionItems}
        />

        {/* Delete Dialog Confirmation */}
        <DeleteDialog
          visible={caseToDeleteId !== null}
          onConfirm={handleDeleteCase}
          onCancel={() => setCaseToDeleteId(null)}
          title={t('cases.deleteFolderTitle')}
          description={t('cases.deleteFolderDesc')}
        />

        {/* Modal: Create Case Folder */}
        <NewCaseIntelligenceModal
          visible={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData(true);
          }}
        />

        {/* Modal: Edit Case Folder */}

        {/* Modal: Edit Case Folder */}
        <Modal
          visible={editingCase !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setEditingCase(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>{t('cases.editDetails')}</Text>
                <Pressable onPress={() => setEditingCase(null)}>
                  <Text style={{ fontSize: 20, color: theme.textSecondary }}>✕</Text>
                </Pressable>
              </View>

              {editingCase && (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <TextInput
                    label={t('cases.suitName')}
                    placeholder="e.g. Rajesh Sharma vs Amit Verma"
                    value={editingCase.name}
                    onChangeText={(text) => setEditingCase({ ...editingCase, name: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.clientName')}
                    placeholder="Plaintiff Name"
                    value={editingCase.clientName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, clientName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.opponentParty')}
                    placeholder="Defendant Name"
                    value={editingCase.opponentName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, opponentName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.legalDomain')}
                    placeholder="e.g. Commercial Contract Law"
                    value={editingCase.caseType || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, caseType: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.presidingCourt')}
                    placeholder="e.g. Delhi High Court"
                    value={editingCase.courtName || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, courtName: text })}
                    containerStyle={{ marginBottom: 12 }}
                  />

                  <TextInput
                    label={t('cases.statementSummary')}
                    placeholder="Provide brief background facts..."
                    value={editingCase.summary || ''}
                    onChangeText={(text) => setEditingCase({ ...editingCase, summary: text })}
                    multiline
                    numberOfLines={3}
                    containerStyle={{ marginBottom: 16 }}
                  />

                  {/* Priority Selector buttons */}
                  <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>{t('cases.priority')}</Text>
                  <View style={styles.priorityRow}>
                    {(['Low', 'Medium', 'High', 'Urgent'] as const).map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setEditingCase({ ...editingCase, priority: p })}
                        style={[
                          styles.priorityBtn,
                          {
                            borderColor: theme.border,
                            backgroundColor: editingCase.priority === p ? theme.primary : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: editingCase.priority === p ? '#FFFFFF' : theme.textSecondary,
                          }}
                        >
                          {p === 'Low' ? t('cases.priorityLow') : p === 'Medium' ? t('cases.priorityMedium') : p === 'High' ? t('cases.priorityHigh') : t('cases.priorityUrgent')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Button
                    title={t('cases.saveChanges')}
                    variant="primary"
                    onPress={handleUpdateCase}
                    style={{ marginTop: 24, marginBottom: 40 }}
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      {/* Workspace Invitation Modal */}
      <Modal
        visible={!!pendingInvite}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingInvite(null)}
      >
        <View style={styles.inviteOverlay}>
          <View style={[styles.inviteContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.inviteHeader}>
              <View style={[styles.inviteIconWrapper, { backgroundColor: isDark ? '#373015' : '#FEF3C7' }]}>
                <Ionicons name="mail-open" size={24} color="#C8A34D" />
              </View>
              <Text style={[styles.inviteTitle, { color: theme.textPrimary }]}>New Workspace Invitation</Text>
              <Text style={[styles.inviteSub, { color: theme.textSecondary }]}>
                You have been invited to join a Law Firm Workspace
              </Text>
            </View>

            {pendingInvite && (
              <View style={[styles.inviteDetails, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}>
                <View style={styles.inviteDetailRow}>
                  <Text style={[styles.inviteLabel, { color: theme.textSecondary }]}>Inviting Firm</Text>
                  <Text style={[styles.inviteVal, { color: theme.textPrimary }]}>
                    {pendingInvite.workspaceId?.name || 'ABC Law Associates'}
                  </Text>
                </View>
                <View style={styles.inviteDetailRow}>
                  <Text style={[styles.inviteLabel, { color: theme.textSecondary }]}>Professional Role</Text>
                  <Text style={[styles.inviteVal, { color: theme.textPrimary }]}>
                    {pendingInvite.role || 'Junior Advocate'}
                  </Text>
                </View>
                <View style={styles.inviteDetailRow}>
                  <Text style={[styles.inviteLabel, { color: theme.textSecondary }]}>Department</Text>
                  <Text style={[styles.inviteVal, { color: theme.textPrimary }]}>
                    {pendingInvite.department || 'Civil Litigation'}
                  </Text>
                </View>
                <View style={styles.inviteDetailRow}>
                  <Text style={[styles.inviteLabel, { color: theme.textSecondary }]}>Permission</Text>
                  <Text style={[styles.inviteVal, { color: theme.textPrimary }]}>
                    {pendingInvite.permission || 'Standard Member'}
                  </Text>
                </View>
                {pendingInvite.personalMessage && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
                    <Text style={[styles.inviteLabel, { color: theme.textSecondary, marginBottom: 4 }]}>Welcome Message</Text>
                    <Text style={[styles.inviteVal, { color: theme.textPrimary, fontStyle: 'italic', fontSize: 12 }]}>
                      "{pendingInvite.personalMessage}"
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={[styles.inviteBtn, styles.inviteBtnReject]}
                onPress={() => pendingInvite && handleRejectInvite(pendingInvite._id)}
              >
                <Text style={styles.inviteBtnRejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inviteBtn, styles.inviteBtnAccept, { backgroundColor: '#C8A34D' }]}
                onPress={() => pendingInvite && handleAcceptInvite(pendingInvite._id, pendingInvite.workspaceId?._id || pendingInvite.workspaceId?.id || pendingInvite.workspaceId)}
              >
                <Text style={styles.inviteBtnAcceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      </SafeAreaView>
      )}
    </ThemedView>
  );
}

function getStyles(theme: any) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[24],
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: Spacing[12],
  },
  headerContainer: {
    paddingHorizontal: Spacing[20],
    paddingVertical: Spacing[12],
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing[12],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  spinner: {
    marginLeft: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newCaseHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCaseHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: Spacing[16],
    paddingBottom: Spacing[40],
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: isTablet ? 'center' : undefined,
    width: '100%',
  },
  errorAlert: {
    padding: Spacing[12],
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing[16],
  },
  errorAlertText: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing[24],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing[12],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: Spacing[12],
  },
  titleWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[12],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    marginTop: 4,
    flex: 1,
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  helperText: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  statCardSkeleton: {
    width: '48%',
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonTitle: {
    height: 10,
    borderRadius: 4,
    width: '70%',
    marginTop: 6,
  },
  skeletonValue: {
    height: 26,
    borderRadius: 6,
    width: '45%',
    marginTop: 4,
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    width: '100%',
    backgroundColor: 'transparent',
  },
  skeletonPill: {
    width: 45,
    height: 12,
    borderRadius: 6,
  },
  skeletonHelper: {
    width: 60,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  continueCard: {
    padding: Spacing[16],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  continueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: Spacing[8],
  },
  continueSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  continueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing[12],
    paddingTop: Spacing[10],
  },
  continueInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    gap: Spacing[12],
  },
  listItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listItemPress: {
    flex: 1,
  },
  listItemContent: {
    padding: Spacing[14],
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  listItemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 10,
  },
  listItemOpenBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemOpenBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dotButton: {
    width: 44,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotButtonText: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyBox: {
    paddingVertical: Spacing[20],
    paddingHorizontal: Spacing[16],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  hearingCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[14],
  },
  hearingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hearingLeft: {
    flex: 1,
    marginRight: Spacing[8],
  },
  hearingCaseName: {
    fontSize: 14,
    fontWeight: '800',
  },
  hearingDetails: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  hearingTitleText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  hearingBadgeTime: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.sm,
  },
  hearingTimeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  todayOnlyBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  todayOnlyBadgeText: {
    color: '#111111',
    fontSize: 9,
    fontWeight: '800',
  },
  deadlineCard: {
    padding: Spacing[16],
  },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[10],
    borderBottomWidth: 1,
  },
  deadlineLeft: {
    flex: 1,
    marginRight: Spacing[12],
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  deadlineCase: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  deadlineDateBadge: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.sm,
  },
  deadlineDateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  analyticsCard: {
    padding: Spacing[16],
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  analyticsLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  analyticsPercent: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  distributionList: {
    borderTopWidth: 1,
    marginTop: Spacing[16],
    paddingTop: Spacing[12],
  },
  distHeader: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[8],
  },
  distRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing[4],
  },
  distName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  distCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  insightsList: {
    gap: Spacing[12],
  },
  insightCard: {
    padding: Spacing[12],
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
  insightTip: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  insightBadgeContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  insightBadgeText: {
    color: '#4B5563',
    fontSize: 9,
    fontWeight: '800',
  },
  activityCard: {
    padding: Spacing[16],
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing[10],
    borderBottomWidth: 1,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityCase: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: Spacing[8],
  },
  closedCard: {
    padding: Spacing[12],
  },
  closedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[6],
    borderBottomWidth: 1,
  },
  closedName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  restoreLink: {
    fontSize: 9,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[8],
    backgroundColor: '#D4AF37',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing[20],
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing[12],
    marginBottom: Spacing[16],
    padding: Spacing[20],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    shadowColor: '#6C63FF',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[10],
    flex: 1,
  },
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitleWhite: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalBreadcrumb: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    marginTop: Spacing[4],
    lineHeight: 18,
    flex: 1,
  },
  modalScroll: {
    flex: 1,
    padding: Spacing[20],
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing[8],
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing[6],
  },
  priorityBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAssistantCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: Radius.xl,
    padding: Spacing[16],
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.14)',
  },
  aiHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    marginBottom: Spacing[8],
  },
  aiHintTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiHintText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing[12],
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 40,
  },
  modalActionButton: {
    flex: 1,
    height: 50,
    borderRadius: Radius.lg,
  },
  primaryActionButton: {
    shadowColor: '#6C63FF',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    marginBottom: Spacing[12],
    marginTop: Spacing[4],
  },
  formSectionDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  clientRoleRow: {
    flexDirection: 'row',
    gap: Spacing[12],
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  clientRoleField: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  dropdownInput: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    paddingVertical: 0,
    justifyContent: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    minHeight: 48,
    marginBottom: 0,
  },
  dropdownBtnText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    color: '#6B7280',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[8],
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[10],
    marginBottom: Spacing[12],
  },
  datePickerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  inlineDatePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[6],
    padding: Spacing[8],
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing[12],
  },
  monthBtn: {
    paddingHorizontal: Spacing[10],
    paddingVertical: Spacing[6],
    borderWidth: 1,
    borderRadius: Radius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  roleDropdownBtn: {
    marginTop: 4,
    paddingVertical: 0,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 20,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing[2],
    backgroundColor: '#fff',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[12],
    paddingVertical: Spacing[10],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[10],
    paddingVertical: Spacing[10],
    minWidth: 64,
    justifyContent: 'center',
  },
  onboardingCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing[16],
    ...Shadows.card,
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[8],
  },
  onboardingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  onboardingDismiss: {
    padding: 4,
    borderRadius: 9999,
  },
  onboardingSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing[10],
  },
  onboardingBullets: {
    marginBottom: Spacing[14],
  },
  onboardingBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[4],
    paddingLeft: Spacing[4],
  },
  onboardingBulletDot: {
    fontSize: 12,
    marginRight: Spacing[8],
    lineHeight: 16,
  },
  onboardingBulletText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    flex: 1,
  },
  onboardingBtn: {
    borderRadius: 12,
    paddingVertical: Spacing[10],
    paddingHorizontal: Spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingBtnText: {
    color: '#111111',
    fontSize: 12.5,
    fontWeight: '800',
  },
  khCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing[16],
    marginBottom: Spacing[16],
    ...Shadows.card,
  },
  khHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[12],
  },
  khIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[12],
  },
  khTitleContainer: {
    flex: 1,
  },
  khTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  khSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  khSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing[12],
    height: 44,
    marginBottom: Spacing[12],
  },
  khSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
    height: '100%',
  },
  khTrendingTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: Spacing[6],
  },
  khChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing[6],
    marginBottom: Spacing[8],
  },
  khChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  khChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  khFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing[4],
  },
  khActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C8A34D',
  },
  inviteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  inviteHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  inviteSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  inviteDetails: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  inviteDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inviteLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  inviteVal: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inviteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteBtnReject: {
    backgroundColor: '#EF4444',
  },
  inviteBtnRejectText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  inviteBtnAccept: {
    backgroundColor: '#C8A34D',
  },
  inviteBtnAcceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
}
