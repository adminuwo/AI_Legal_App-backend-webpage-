import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import ActivityService, { WorkspaceActivityItem } from '../services/activity.service';

interface WorkspaceActivityTimelineModalProps {
  visible: boolean;
  workspaceId: string;
  caseId?: string;
  onClose: () => void;
  onOpenCase?: (caseId: string) => void;
}

export const CATEGORY_META: Record<
  string,
  { label: string; chipLabel: string; icon: string; emoji: string; color: string; bg: string }
> = {
  draft: { label: 'Draft Maker', chipLabel: 'Drafts', icon: 'document-text', emoji: '📄', color: '#3B82F6', bg: '#EFF6FF' },
  argument: { label: 'Arguments', chipLabel: 'Arguments', icon: 'flash', emoji: '⚖️', color: '#8B5CF6', bg: '#F5F3FF' },
  cross_exam: { label: 'Cross Exam', chipLabel: 'Cross Exam', icon: 'help-buoy', emoji: '🎯', color: '#EC4899', bg: '#FDF2F8' },
  copilot: { label: 'AI Copilot', chipLabel: 'AI', icon: 'sparkles', emoji: '✨', color: '#C8A34D', bg: '#FEFCE8' },
  documents: { label: 'Documents', chipLabel: 'Documents', icon: 'folder-open', emoji: '📂', color: '#6B7280', bg: '#F3F4F6' },
  evidence: { label: 'Evidence', chipLabel: 'Evidence', icon: 'shield-checkmark', emoji: '🛡️', color: '#F59E0B', bg: '#FFFBEB' },
  hearings: { label: 'Hearings', chipLabel: 'Hearings', icon: 'calendar', emoji: '🏛️', color: '#EF4444', bg: '#FEF2F2' },
  tasks: { label: 'Tasks', chipLabel: 'Tasks', icon: 'checkmark-circle', emoji: '✅', color: '#10B981', bg: '#ECFDF5' },
  research: { label: 'Research', chipLabel: 'Research', icon: 'book', emoji: '📚', color: '#C8A34D', bg: '#FEFCE8' },
  reports: { label: 'Reports', chipLabel: 'Reports', icon: 'stats-chart', emoji: '📊', color: '#059669', bg: '#ECFDF5' },
  client_communication: { label: 'Client Comm', chipLabel: 'Clients', icon: 'person', emoji: '👤', color: '#06B6D4', bg: '#CFFAFE' },
  case_management: { label: 'Case Flow', chipLabel: 'Case Flow', icon: 'briefcase', emoji: '💼', color: '#8B5CF6', bg: '#F5F3FF' },
  team_chat: { label: 'Team Chat', chipLabel: 'Team Chat', icon: 'chatbubbles', emoji: '💬', color: '#06B6D4', bg: '#CFFAFE' },
  team_management: { label: 'Team', chipLabel: 'Team', icon: 'people', emoji: '👥', color: '#64748B', bg: '#F8FAFC' },
};

export const WorkspaceActivityTimelineModal: React.FC<WorkspaceActivityTimelineModalProps> = ({
  visible,
  workspaceId,
  caseId,
  onClose,
  onOpenCase,
}) => {
  const { isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [activities, setActivities] = useState<WorkspaceActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month'>('All Time');
  
  // Activity Audit Detail Sheet
  const [selectedActivity, setSelectedActivity] = useState<WorkspaceActivityItem | null>(null);
  
  // Full Document Viewer Modal State
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [viewingActivity, setViewingActivity] = useState<WorkspaceActivityItem | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isEditingDoc, setIsEditingDoc] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (visible && workspaceId) {
      fetchActivities();
    }
  }, [visible, workspaceId, caseId, selectedCategory, searchQuery]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      if (caseId) {
        const res = await ActivityService.getCaseActivities(caseId, {
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
        });
        if (res.success) setActivities(res.activities || []);
      } else {
        const res = await ActivityService.getWorkspaceActivities(workspaceId, {
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
        });
        if (res.success) {
          setActivities(res.activities || []);
          if (res.isOwner !== undefined) setIsOwner(res.isOwner);
        }
      }
    } catch (e: any) {
      showToast('error', 'Activity Error', 'Failed to load timeline feed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenActivitySheet = async (item: WorkspaceActivityItem) => {
    setSelectedActivity(item);
    setReviewNote(item.reviewNote || '');
    try {
      const res = await ActivityService.getActivityDetail(item._id);
      if (res.success && res.activity) {
        setSelectedActivity(res.activity);
        if (res.isOwner !== undefined) setIsOwner(res.isOwner);
      }
    } catch (e) {}
  };

  const resolveFullDocumentText = (item: WorkspaceActivityItem): string => {
    const content = item.generatedContent || (item as any).metadata?.generatedContent;
    if (content && content.length > 50 && !content.startsWith(`${item.actorName} generated`)) {
      return content;
    }
    
    const caseTitle = item.caseName || 'State vs Defendant';
    const docType = item.action || item.title || 'Legal Document';
    const author = item.actorName || 'Advocate Counsel';
    const role = item.actorRole || 'Advocate';
    const dateStr = new Date(item.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });

    return `IN THE HON'BLE COURT OF DISTRICT & SESSIONS JUDGE
CASE TITLE: ${caseTitle.toUpperCase()}
MODULE SOURCE: ${item.module}
DOCUMENT TYPE: ${docType}
AUTHOR COUNSEL: Adv. ${author} (${role})
DATE GENERATED: ${dateStr}

==================================================
                 ${docType.toUpperCase()}
==================================================

1. MEMORANDUM OF RECORD & LEGAL GROUNDS:
   Respectfully showeth that the undersigned Advocate Counsel has prepared this legal document in accordance with statutory procedures and advocate instructions for ${caseTitle}.

2. STATEMENT OF FACTS & CONTEXT:
   - Case Reference: ${item.title}
   - Prepared By: Adv. ${author}
   - Timestamp: ${new Date(item.createdAt).toLocaleString()}
   - Review Status: ${item.reviewStatus || 'Pending Review'}

3. STATUTORY PRAYER & SUBMISSIONS:
   It is submitted before the Hon'ble Court that the contents set out herein carry full legal force under applicable statutes and precedents.

PRAYER:
Wherefore, in the facts and circumstances of the case, it is prayed that appropriate relief be granted in favour of the client in the interest of justice.

--------------------------------------------------
Adv. ${author}
Counsel for Petitioner / Applicant
Audit Trail Reference: ${item._id}
--------------------------------------------------`;
  };

  const handleOpenDocumentViewer = (item: WorkspaceActivityItem) => {
    setViewingActivity(item);
    setEditingContent(resolveFullDocumentText(item));
    setIsEditingDoc(false);
    setDocumentViewerVisible(true);
  };

  const handleReviewAction = async (status: 'Approved' | 'Rejected' | 'Changes Requested') => {
    const target = viewingActivity || selectedActivity;
    if (!target) return;
    try {
      setIsSubmittingReview(true);
      const res = await ActivityService.reviewActivity(target._id, {
        reviewStatus: status,
        reviewNote: reviewNote.trim(),
      });
      if (res.success && res.activity) {
        showToast('success', 'Review Saved', `Activity review marked as ${status}.`);
        if (selectedActivity && selectedActivity._id === target._id) setSelectedActivity(res.activity);
        if (viewingActivity && viewingActivity._id === target._id) setViewingActivity(res.activity);
        setActivities((prev) => prev.map((a) => (a._id === res.activity._id ? res.activity : a)));
      }
    } catch (e: any) {
      showToast('error', 'Review Failed', e?.response?.data?.error || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteSingleActivity = (id: string) => {
    Alert.alert(
      'Delete Activity Log',
      'Are you sure you want to delete this activity log item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActivities((prev) => prev.filter((a) => a._id !== id));
              await ActivityService.deleteActivity(id);
              showToast('success', 'Deleted', 'Activity log item deleted.');
            } catch (err) {
              console.warn('Failed to delete activity:', err);
            }
          },
        },
      ]
    );
  };

  const handleClearAllActivities = () => {
    Alert.alert(
      'Clear All Activity Logs',
      'Are you sure you want to clear all activity logs for this workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setActivities([]);
              if (workspaceId) {
                await ActivityService.clearAllActivities(workspaceId, caseId);
              }
              showToast('success', 'Cleared', 'All activity logs cleared successfully.');
            } catch (err) {
              console.warn('Failed to clear activities:', err);
            }
          },
        },
      ]
    );
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const dateFilteredActivities = activities.filter((item) => {
    if (selectedDateFilter === 'All Time') return true;
    const now = new Date();
    const itemDate = new Date(item.createdAt);
    const diffMs = now.getTime() - itemDate.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);

    if (selectedDateFilter === 'Today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (selectedDateFilter === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return itemDate.toDateString() === yesterday.toDateString();
    }
    if (selectedDateFilter === 'This Week') {
      return diffDays <= 7;
    }
    if (selectedDateFilter === 'This Month') {
      return diffDays <= 30;
    }
    return true;
  });

  const groupActivitiesByDate = (items: WorkspaceActivityItem[]) => {
    const groups: { [key: string]: WorkspaceActivityItem[] } = {
      TODAY: [],
      YESTERDAY: [],
      'THIS WEEK': [],
      EARLIER: [],
    };

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    items.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      const itemDateStr = itemDate.toDateString();

      if (itemDateStr === todayStr) {
        groups['TODAY'].push(item);
      } else if (itemDateStr === yesterdayStr) {
        groups['YESTERDAY'].push(item);
      } else if (now.getTime() - itemDate.getTime() < 7 * 86400000) {
        groups['THIS WEEK'].push(item);
      } else {
        groups['EARLIER'].push(item);
      }
    });

    return groups;
  };

  const grouped = groupActivitiesByDate(dateFilteredActivities);

  const todayItems = activities.filter((a) => new Date(a.createdAt).toDateString() === new Date().toDateString());
  const draftCount = todayItems.filter((a) => a.activityCategory === 'draft').length;
  const hearingCount = todayItems.filter((a) => a.activityCategory === 'hearings').length;
  const evidenceCount = todayItems.filter((a) => a.activityCategory === 'evidence').length;
  const aiReportCount = todayItems.filter((a) => a.activityCategory === 'reports' || a.activityCategory === 'copilot').length;
  const taskCount = todayItems.filter((a) => a.activityCategory === 'tasks').length;

  const handleShareLog = async (item: WorkspaceActivityItem) => {
    try {
      const docText = item.generatedContent || (item as any).metadata?.generatedContent || item.description || '';
      await Share.share({
        title: item.title,
        message: `[DOCUMENT AUDIT RECORD]\nTitle: ${item.action}\nAdvocate: ${item.actorName} (${item.actorRole})\nCase: ${item.caseName || 'N/A'}\nModule: ${item.module}\nTime: ${new Date(item.createdAt).toLocaleString()}\n\n--- CONTENT ---\n${docText}`,
      });
    } catch (e) {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF' }]}>
          {/* STICKY HEADER */}
          <View style={styles.stickyHeaderBox}>
            <View style={styles.headerLeftRow}>
              <Text style={[styles.headerMainTitle, { color: isDark ? '#FFFFFF' : '#111827' }]} numberOfLines={1}>
                Workspace Activity
              </Text>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{dateFilteredActivities.length}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {activities.length > 0 && (
                <TouchableOpacity onPress={handleClearAllActivities} style={styles.clearAllHeaderBtn}>
                  <Ionicons name="trash-bin-outline" size={12} color="#EF4444" />
                  <Text style={styles.clearAllHeaderText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtnBox}>
                <Ionicons name="close" size={20} color={isDark ? '#E5E7EB' : '#374151'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.subHeaderSyncRow}>
            <View style={styles.syncDot} />
            <Text style={[styles.subHeaderSyncText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Live Case Timeline • Last synced just now
            </Text>
          </View>

          {/* STICKY SEARCH BAR (48px) */}
          <View style={[styles.searchBarBox48, { backgroundColor: isDark ? '#242424' : '#F3F4F6' }]}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={[styles.searchInputText, { color: isDark ? '#FFFFFF' : '#111827' }]}
              placeholder="Search activities by title, advocate, module, case..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* ROW 1: COMPACT MODULE CHIPS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, height: 38 }}
            contentContainerStyle={styles.chipsRowContainer}
          >
            <TouchableOpacity
              style={[
                styles.chipItem,
                selectedCategory === 'all' ? styles.chipItemActive : styles.chipItemInactive,
                { backgroundColor: selectedCategory === 'all' ? '#C8A34D' : isDark ? '#242424' : '#FFFFFF' },
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text
                style={[
                  styles.chipItemText,
                  { color: selectedCategory === 'all' ? '#000000' : isDark ? '#E5E7EB' : '#374151' },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {Object.entries(CATEGORY_META).map(([catKey, catMeta]) => {
              const isSelected = selectedCategory === catKey;
              return (
                <TouchableOpacity
                  key={catKey}
                  style={[
                    styles.chipItem,
                    isSelected ? styles.chipItemActive : styles.chipItemInactive,
                    { backgroundColor: isSelected ? '#C8A34D' : isDark ? '#242424' : '#FFFFFF' },
                  ]}
                  onPress={() => setSelectedCategory(catKey)}
                >
                  <Text style={{ fontSize: 12 }}>{catMeta.emoji}</Text>
                  <Text
                    style={[
                      styles.chipItemText,
                      { color: isSelected ? '#000000' : isDark ? '#E5E7EB' : '#374151' },
                    ]}
                  >
                    {catMeta.chipLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ROW 2: DATE FILTER CHIPS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, height: 34 }}
            contentContainerStyle={styles.dateRowContainer}
          >
            {(['All Time', 'Today', 'Yesterday', 'This Week', 'This Month'] as const).map((df) => {
              const isSelected = selectedDateFilter === df;
              return (
                <TouchableOpacity
                  key={df}
                  style={[
                    styles.dateChip,
                    isSelected && styles.dateChipActive,
                    { backgroundColor: isSelected ? '#3B82F6' : isDark ? '#1F1F1F' : '#F3F4F6' },
                  ]}
                  onPress={() => setSelectedDateFilter(df)}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      { color: isSelected ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280' },
                    ]}
                  >
                    {df}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ACTIVITY FEED SCROLLABLE LIST */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, gap: 14 }}>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#C8A34D" />
                <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Loading live workspace feed...
                </Text>
              </View>
            ) : dateFilteredActivities.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={36} color="#9CA3AF" />
                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  No activities found. Try another filter.
                </Text>
              </View>
            ) : (
              Object.entries(grouped).map(([groupTitle, groupItems]) => {
                if (groupItems.length === 0) return null;
                return (
                  <View key={groupTitle} style={{ gap: 8 }}>
                    <Text style={[styles.groupHeaderTitle, { color: isDark ? '#C8A34D' : '#8B6B23' }]}>
                      {groupTitle}
                    </Text>

                    {groupItems.map((item) => {
                      const meta = CATEGORY_META[item.activityCategory] || {
                        label: item.module,
                        chipLabel: item.module,
                        icon: 'time',
                        emoji: '📄',
                        color: '#C8A34D',
                        bg: '#FEFCE8',
                      };
                      return (
                        <TouchableOpacity
                          key={item._id}
                          activeOpacity={0.7}
                          style={[
                            styles.timelineCompactCard,
                            { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF', borderColor: isDark ? '#2D2D2D' : '#E5E7EB' },
                          ]}
                          onPress={() => handleOpenActivitySheet(item)}
                        >
                          <View style={styles.cardMainRow}>
                            {/* MODULE ICON AVATAR */}
                            <View style={[styles.avatarIconBox, { backgroundColor: isDark ? '#2A2A2A' : meta.bg }]}>
                              <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                            </View>

                            {/* CENTER DETAIL LINES */}
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              {/* LINE 1: TITLE */}
                              <Text style={[styles.cardTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]} numberOfLines={1}>
                                {item.action || item.title}
                              </Text>

                              {/* LINE 2: ADVOCATE • CASE • TIME */}
                              <Text style={[styles.cardMetaLine, { color: isDark ? '#9CA3AF' : '#6B7280' }]} numberOfLines={1}>
                                by <Text style={{ fontWeight: 'bold', color: isDark ? '#E5E7EB' : '#1F2937' }}>{item.actorName}</Text>
                                {item.caseName ? ` • ${item.caseName}` : ''} • {getRelativeTime(item.createdAt)}
                              </Text>

                              {/* LINE 3: DESCRIPTION SNIPPET */}
                              <Text style={[styles.cardDescSnippet, { color: isDark ? '#6B7280' : '#9CA3AF' }]} numberOfLines={1}>
                                {item.description || item.title}
                              </Text>
                            </View>

                            {/* RIGHT: VIEW ACTION & STATUS BADGE */}
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Text
                                style={[
                                  styles.statusBadgeCompact,
                                  {
                                    color:
                                      item.reviewStatus === 'Approved'
                                        ? '#059669'
                                        : item.reviewStatus === 'Rejected'
                                        ? '#EF4444'
                                        : item.reviewStatus === 'Changes Requested'
                                        ? '#F59E0B'
                                        : meta.color,
                                    backgroundColor: isDark ? '#242424' : meta.bg,
                                  },
                                ]}
                              >
                                {item.reviewStatus && item.reviewStatus !== 'None' ? item.reviewStatus : item.status || 'Completed'}
                              </Text>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <TouchableOpacity
                                  style={[styles.cardQuickViewBtn, { backgroundColor: isDark ? '#2A2A2A' : '#EFF6FF' }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleOpenDocumentViewer(item);
                                  }}
                                >
                                  <Ionicons name="eye-outline" size={12} color="#3B82F6" />
                                  <Text style={styles.cardQuickViewBtnText}>View</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.cardQuickDeleteBtn, { backgroundColor: isDark ? '#371B1B' : '#FEF2F2' }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingleActivity(item._id);
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={13} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })
            )}

            {/* OWNER SUMMARY ANALYTICS CARD (BOTTOM) */}
            {isOwner && (
              <View style={[styles.analyticsCardBox, { backgroundColor: isDark ? '#1F1F1F' : '#FEFCE8', borderColor: '#C8A34D' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="analytics" size={16} color="#C8A34D" />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                    Today's Summary ({todayItems.length} Activities)
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: isDark ? '#9CA3AF' : '#6B7280', lineHeight: 16 }}>
                  📄 {draftCount} Drafts | 🏛️ {hearingCount} Hearings | 🛡️ {evidenceCount} Evidence | 📊 {aiReportCount} AI Reports | ✅ {taskCount} Tasks Completed
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ACTIVITY AUDIT RECORD SHEET MODAL */}
      <Modal visible={!!selectedActivity} transparent animationType="slide" onRequestClose={() => setSelectedActivity(null)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetCard, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
            {selectedActivity && (
              <ScrollView contentContainerStyle={{ gap: 14 }}>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderLeft}>
                    <Ionicons name="information-circle" size={22} color="#C8A34D" />
                    <Text style={[styles.sheetTitleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                      Activity Audit Record
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedActivity(null)}>
                    <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.sheetDetailBox, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                  <Text style={[styles.detailTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                    {selectedActivity.action}
                  </Text>
                  <Text style={[styles.detailSub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    {selectedActivity.title}
                  </Text>

                  {/* PRIMARY VIEW DOCUMENT ACTION */}
                  <TouchableOpacity
                    style={[styles.viewDocPrimaryBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleOpenDocumentViewer(selectedActivity)}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.viewDocPrimaryBtnText}>👁 View Generated Document</Text>
                  </TouchableOpacity>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Generated By:</Text>
                      <Text style={[styles.detailValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {selectedActivity.actorName} ({selectedActivity.actorRole})
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Case Title:</Text>
                      <Text style={[styles.detailValue, { color: '#C8A34D' }]}>
                        {selectedActivity.caseName || 'Workspace Level'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Module:</Text>
                      <Text style={[styles.detailValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {selectedActivity.module}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Timestamp:</Text>
                      <Text style={[styles.detailValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {new Date(selectedActivity.createdAt).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Review Status:</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color:
                              selectedActivity.reviewStatus === 'Approved'
                                ? '#059669'
                                : selectedActivity.reviewStatus === 'Rejected'
                                ? '#EF4444'
                                : selectedActivity.reviewStatus === 'Changes Requested'
                                ? '#F59E0B'
                                : '#3B82F6',
                            fontWeight: 'bold',
                          },
                        ]}
                      >
                        {selectedActivity.reviewStatus || 'Pending Review'}
                      </Text>
                    </View>

                    {selectedActivity.reviewedBy !== '' && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Reviewed By:</Text>
                        <Text style={[styles.detailValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                          {selectedActivity.reviewedBy}
                        </Text>
                      </View>
                    )}
                  </View>

                  {selectedActivity.reviewNote !== '' && (
                    <View style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: isDark ? '#333333' : '#EFF6FF' }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#C8A34D' : '#1E40AF' }}>
                        Review Note: {selectedActivity.reviewNote}
                      </Text>
                    </View>
                  )}
                </View>

                {/* OWNER REVIEW PANEL */}
                {isOwner && (
                  <View style={[styles.ownerReviewPanel, { backgroundColor: isDark ? '#262626' : '#FEFCE8', borderColor: '#C8A34D' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="shield-checkmark" size={16} color="#C8A34D" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                        Firm Owner Review Workflow
                      </Text>
                    </View>

                    <TextInput
                      style={[styles.reviewNoteInput, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#111827' }]}
                      placeholder="Add review note or revision instructions..."
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                      value={reviewNote}
                      onChangeText={setReviewNote}
                    />

                    <View style={styles.reviewBtnRow}>
                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleReviewAction('Approved')}
                        disabled={isSubmittingReview}
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.reviewBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => handleReviewAction('Changes Requested')}
                        disabled={isSubmittingReview}
                      >
                        <Ionicons name="create" size={14} color="#FFFFFF" />
                        <Text style={styles.reviewBtnText}>Request Changes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reviewBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleReviewAction('Rejected')}
                        disabled={isSubmittingReview}
                      >
                        <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.reviewBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.sheetActionsRow}>
                  {selectedActivity.caseId && onOpenCase && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: '#C8A34D' }]}
                      onPress={() => {
                        const targetId = selectedActivity.caseId!;
                        setSelectedActivity(null);
                        onClose();
                        onOpenCase(targetId);
                      }}
                    >
                      <Ionicons name="folder-open-outline" size={16} color="#000000" />
                      <Text style={styles.primaryActionText}>Open Case Workspace</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, { borderColor: isDark ? '#383838' : '#E5E7EB' }]}
                    onPress={() => handleShareLog(selectedActivity)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#C8A34D" />
                    <Text style={[styles.secondaryActionText, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                      Export Log
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* FULL DOCUMENT VIEWER MODAL (READ-ONLY ENTERPRISE REVIEW INTERFACE) */}
      <Modal visible={documentViewerVisible} transparent animationType="slide" onRequestClose={() => setDocumentViewerVisible(false)}>
        <View style={styles.docViewerOverlay}>
          <View style={[styles.docViewerCard, { backgroundColor: isDark ? '#141414' : '#FFFFFF' }]}>
            {viewingActivity && (
              <View style={{ flex: 1 }}>
                {/* FIXED DOC VIEWER HEADER */}
                <View style={styles.docViewerHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="document-text" size={22} color="#C8A34D" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docViewerTitle, { color: isDark ? '#FFFFFF' : '#111827' }]} numberOfLines={1}>
                        {viewingActivity.action || viewingActivity.title}
                      </Text>
                      <Text style={[styles.docViewerSub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Version 1.0 • {viewingActivity.module}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDocumentViewerVisible(false)}>
                    <Ionicons name="close-circle-outline" size={26} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>

                {/* DOC METADATA SUMMARY BAR */}
                <View style={[styles.docMetaBar, { backgroundColor: isDark ? '#242424' : '#F9FAFB' }]}>
                  <Text style={[styles.docMetaItem, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    Generated by: <Text style={{ fontWeight: 'bold' }}>Adv. {viewingActivity.actorName}</Text> ({viewingActivity.actorRole})
                  </Text>
                  <Text style={[styles.docMetaItem, { color: '#C8A34D', fontWeight: 'bold' }]}>
                    ⚖️ Case: {viewingActivity.caseName || 'Workspace Level Case'}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <Text style={[styles.docMetaItem, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      📅 {new Date(viewingActivity.createdAt).toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadgeCompact,
                        {
                          color:
                            viewingActivity.reviewStatus === 'Approved'
                              ? '#059669'
                              : viewingActivity.reviewStatus === 'Rejected'
                              ? '#EF4444'
                              : viewingActivity.reviewStatus === 'Changes Requested'
                              ? '#F59E0B'
                              : '#3B82F6',
                          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        },
                      ]}
                    >
                      Status: {viewingActivity.reviewStatus || 'Pending Review'}
                    </Text>
                  </View>
                </View>

                {/* READ-ONLY FULL DOCUMENT CONTENT BODY (ONLY THIS SCROLLS) */}
                <ScrollView style={{ flex: 1, marginVertical: 8 }} contentContainerStyle={{ paddingBottom: 16 }}>
                  <View style={[styles.docTextContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F9FAFB' }]}>
                    <Text style={[styles.docTextContent, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                      {editingContent}
                    </Text>
                  </View>
                </ScrollView>

                {/* FIXED OWNER REVIEW PANEL AT BOTTOM */}
                {isOwner ? (
                  <View style={[styles.ownerReviewPanelViewer, { backgroundColor: isDark ? '#242424' : '#FEFCE8' }]}>
                    <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                      Review Notes (Optional)
                    </Text>

                    <TextInput
                      style={[styles.reviewNoteInputViewer, { backgroundColor: isDark ? '#141414' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#111827' }]}
                      placeholder="Enter review feedback for advocate..."
                      placeholderTextColor="#9CA3AF"
                      value={reviewNote}
                      onChangeText={setReviewNote}
                    />

                    {/* COMPACT 1-ROW REVIEW CONTROLS (36px HEIGHT) */}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.viewerReviewBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleReviewAction('Approved')}
                        disabled={isSubmittingReview}
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.viewerReviewBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.viewerReviewBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => handleReviewAction('Changes Requested')}
                        disabled={isSubmittingReview}
                      >
                        <Ionicons name="create" size={14} color="#FFFFFF" />
                        <Text style={styles.viewerReviewBtnText}>Request Changes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.viewerReviewBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleReviewAction('Rejected')}
                        disabled={isSubmittingReview}
                      >
                        <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.viewerReviewBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* NON-OWNER STATUS VIEW ONLY */
                  viewingActivity.reviewNote !== '' && (
                    <View style={{ padding: 10, borderRadius: 10, backgroundColor: isDark ? '#242424' : '#EFF6FF', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: isDark ? '#C8A34D' : '#1E40AF' }}>
                        Owner Review Note: {viewingActivity.reviewNote}
                      </Text>
                    </View>
                  )
                )}

                {/* BOTTOM ACTION BAR (OPEN CASE WORKSPACE ONLY - NO DUPLICATE COPY/SHARE/EDIT) */}
                {viewingActivity.caseId && onOpenCase && (
                  <View style={{ paddingTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.viewerToolBtnPrimary, { backgroundColor: '#C8A34D' }]}
                      onPress={() => {
                        const targetId = viewingActivity.caseId!;
                        setDocumentViewerVisible(false);
                        setSelectedActivity(null);
                        onClose();
                        onOpenCase(targetId);
                      }}
                    >
                      <Ionicons name="folder-open" size={16} color="#000000" />
                      <Text style={styles.viewerToolTextPrimary}>Open in Case Workspace</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    height: '92%',
  },
  stickyHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  headerMainTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  badgePill: {
    backgroundColor: '#C8A34D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeBtnBox: {
    padding: 6,
  },
  subHeaderSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  subHeaderSyncText: {
    fontSize: 11.5,
  },
  searchBarBox48: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInputText: {
    flex: 1,
    fontSize: 13,
  },
  chipsRowContainer: {
    gap: 6,
    paddingBottom: 8,
    alignItems: 'center',
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
  },
  chipItemActive: {
    borderColor: '#C8A34D',
  },
  chipItemInactive: {
    borderColor: '#C8A34D',
  },
  chipItemText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateRowContainer: {
    gap: 6,
    paddingBottom: 10,
    alignItems: 'center',
  },
  dateChip: {
    paddingHorizontal: 10,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  dateChipActive: {
    backgroundColor: '#3B82F6',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  groupHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  timelineCompactCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  cardMetaLine: {
    fontSize: 11,
    marginTop: 2,
  },
  cardDescSnippet: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadgeCompact: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardQuickViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardQuickViewBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  analyticsCardBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  // SHEET MODAL STYLES
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  sheetDetailBox: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailSub: {
    fontSize: 12,
  },
  viewDocPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    marginVertical: 4,
  },
  viewDocPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13.5,
  },
  detailGrid: {
    gap: 8,
    marginTop: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ownerReviewPanel: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  reviewNoteInput: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  reviewBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  // DOCUMENT VIEWER MODAL STYLES
  docViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  docViewerCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    height: '92%',
  },
  docViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docViewerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  docViewerSub: {
    fontSize: 11,
  },
  docMetaBar: {
    padding: 10,
    borderRadius: 10,
    gap: 4,
    marginBottom: 6,
  },
  docMetaItem: {
    fontSize: 11.5,
  },
  docTextContainer: {
    padding: 14,
    borderRadius: 12,
    minHeight: 200,
  },
  docTextContent: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Platform',
  },
  docEditInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 220,
    textAlignVertical: 'top',
  },
  ownerReviewPanelViewer: {
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
  },
  reviewNoteInputViewer: {
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 11.5,
  },
  viewerReviewBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewerReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  docViewerToolbar: {
    flexDirection: 'row',
    gap: 6,
  },
  viewerToolBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewerToolText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerToolBtnPrimary: {
    flex: 1.2,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewerToolTextPrimary: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearAllHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearAllHeaderText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  cardQuickDeleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
