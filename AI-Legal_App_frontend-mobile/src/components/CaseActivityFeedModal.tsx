import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import ActivityService from '@/services/activity.service';

export interface CaseActivityItem {
  id: string;
  _id?: string;
  workspaceId?: string;
  caseId?: string;
  caseName?: string;
  actorId?: string;
  actorName: string;
  actorAvatar?: string;
  actorRole?: string;
  module: string;
  activityCategory?: string;
  action: string;
  title: string;
  description?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  isRead?: boolean;
}

interface CaseActivityFeedModalProps {
  visible: boolean;
  onClose: () => void;
  caseId: string;
  caseName?: string;
  onNavigateToEntity?: (module: string, entityType?: string, entityId?: string) => void;
}

export const CaseActivityFeedModal: React.FC<CaseActivityFeedModalProps> = ({
  visible,
  onClose,
  caseId,
  caseName = 'Case Workspace',
  onNavigateToEntity,
}) => {
  let isDark = true;
  try {
    const themeCtx = useThemeContext();
    if (themeCtx && typeof themeCtx.isDark === 'boolean') {
      isDark = themeCtx.isDark;
    }
  } catch (e) {
    isDark = true;
  }

  const [activities, setActivities] = useState<CaseActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchActivities = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const res: any = await CaseService.getCaseActivities(caseId, activeFilter);
      if (res && res.success && Array.isArray(res.activities)) {
        setActivities(res.activities);
      }
    } catch (err) {
      console.warn('[CaseActivityFeedModal] Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && caseId) {
      fetchActivities();
      // Auto-mark activities as read for current user
      CaseService.markCaseActivitiesRead(caseId).catch(() => {});
    }
  }, [visible, caseId, activeFilter]);

  // Dynamic Theme Colors
  const containerBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBg = isDark ? '#121212' : '#F9FAFB';
  const borderColor = isDark ? '#2A2A2A' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const textBody = isDark ? '#D1D5DB' : '#374151';
  const closeBtnBg = isDark ? '#2A2A2A' : '#F3F4F6';

  const getModuleIcon = (mod: string) => {
    const norm = (mod || '').toLowerCase();
    if (norm.includes('doc')) return { name: 'document-text-outline', color: '#3B82F6' };
    if (norm.includes('task')) return { name: 'checkbox-outline', color: '#10B981' };
    if (norm.includes('hearing')) return { name: 'calendar-outline', color: '#C8A34D' };
    if (norm.includes('evidence')) return { name: 'folder-open-outline', color: '#8B5CF6' };
    if (norm.includes('team')) return { name: 'people-outline', color: '#EC4899' };
    if (norm.includes('report')) return { name: 'sparkles-outline', color: '#F59E0B' };
    if (norm.includes('client')) return { name: 'chatbubbles-outline', color: '#06B6D4' };
    if (norm.includes('research')) return { name: 'book-outline', color: '#6366F1' };
    return { name: 'flash-outline', color: '#C8A34D' };
  };

  const handleItemPress = (item: CaseActivityItem) => {
    onClose();
    if (onNavigateToEntity) {
      onNavigateToEntity(item.module || item.activityCategory || '', item.relatedEntityType, item.relatedEntityId);
    }
  };

  const handleDeleteSingleActivity = (id: string) => {
    if (!id) return;
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
              setActivities((prev) => prev.filter((a) => (a.id || a._id) !== id));
              await ActivityService.deleteActivity(id);
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
      'Are you sure you want to clear all activity logs for this case?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setActivities([]);
              if (caseId) {
                await ActivityService.clearAllActivities('', caseId);
              }
            } catch (err) {
              console.warn('Failed to clear activities:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)' }]} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.contentContainer,
              {
                backgroundColor: containerBg,
                borderColor: isDark ? '#333333' : '#E5E7EB',
              },
            ]}
          >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
              <View style={styles.goldSparkleBg}>
                <Ionicons name="notifications" size={15} color="#C8A34D" />
              </View>
              <View style={{ marginLeft: 6, flex: 1 }}>
                <Text style={[styles.titleText, { color: textPrimary, fontSize: 14 }]} numberOfLines={1}>Case Activity & Updates</Text>
                <Text style={[styles.subtitleText, { color: textSecondary }]} numberOfLines={1}>{caseName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {activities.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearAllActivities}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 2,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    borderRadius: 5,
                    backgroundColor: isDark ? '#2A1F1F' : '#FEF2F2',
                    borderWidth: 1,
                    borderColor: '#FCA5A5',
                  }}
                >
                  <Ionicons name="trash-bin-outline" size={11} color="#EF4444" />
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#EF4444' }}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: closeBtnBg }]} onPress={onClose}>
                <Ionicons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Chips */}
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {['All', 'Tasks', 'Hearings', 'Documents', 'Evidence', 'Team'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: activeFilter === cat ? '#C8A34D' : closeBtnBg,
                    borderColor: activeFilter === cat ? '#C8A34D' : borderColor,
                  },
                ]}
                onPress={() => setActiveFilter(cat)}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: activeFilter === cat ? '#FFFFFF' : textSecondary }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#C8A34D" />
              <Text style={styles.loadingText}>Loading Case Feed...</Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={32} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                Case activity will appear here as your team works on this case.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {activities.map((item) => {
                const iconInfo = getModuleIcon(item.module || item.activityCategory || '');
                const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                return (
                  <TouchableOpacity
                    key={item.id || item._id}
                    style={[styles.activityCard, { backgroundColor: cardBg, borderColor }]}
                    onPress={() => handleItemPress(item)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={[styles.iconBg, { backgroundColor: `${iconInfo.color}15`, borderColor: `${iconInfo.color}30` }]}>
                        <Ionicons name={iconInfo.name as any} size={16} color={iconInfo.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.actorText, { color: textPrimary }]}>
                            {item.actorName} <Text style={{ fontWeight: '400', color: textSecondary }}>{item.action ? `• ${item.action}` : ''}</Text>
                          </Text>
                          <Text style={[styles.timeText, { color: textSecondary }]}>{timeStr} ({dateStr})</Text>
                        </View>
                        <Text style={[styles.titleVal, { color: textPrimary }]}>{item.title}</Text>
                        {Boolean(item.description) && (
                          <Text style={[styles.descText, { color: textBody }]} numberOfLines={2}>{item.description}</Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'space-between' }}>
                          <View style={[styles.moduleBadge, { backgroundColor: isDark ? '#2A2A2A' : '#E5E7EB' }]}>
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: textSecondary, textTransform: 'uppercase' }}>
                              {item.module || 'CASE WORKSPACE'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity
                              style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: isDark ? '#371B1B' : '#FEF2F2' }}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleActivity(item.id || item._id || '');
                              }}
                            >
                              <Ionicons name="trash-outline" size={13} color="#EF4444" />
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#C8A34D', marginRight: 2 }}>Open Item</Text>
                              <Ionicons name="chevron-forward" size={12} color="#C8A34D" />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentContainer: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  goldSparkleBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 163, 77, 0.3)',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#C8A34D',
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  activityCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actorText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10,
  },
  titleVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  descText: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  moduleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default CaseActivityFeedModal;
