import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  ScrollView,
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useWorkspaceContext } from '@/providers';
import { useRoleStore, ROLES } from '@/store/role';

interface ExperienceRoleSelectorProps {
  style?: ViewStyle;
}

export const ExperienceRoleSelector: React.FC<ExperienceRoleSelectorProps> = ({ style }) => {
  const { theme, isDark } = useThemeContext();
  const { selectedRole, setRole } = useRoleStore();
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspaceContext();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  // 1. Filter AVAILABLE WORKSPACES: ONLY real Law Firm / Organization workspaces
  const availableFirmWorkspaces = (workspaces || []).filter(
    (ws: any) =>
      (ws.type === 'law_firm' || ws.type === 'firm' || ws.type === 'enterprise' || ws.isFirm) &&
      ws.type !== 'personal'
  );

  // 2. Compute Header Button Icon & Label
  const activeWsType = activeWorkspace?.type || (activeWorkspace as any)?.workspaceType;
  const currentRole = selectedRole as string;

  let displayTitle = 'Advocate';
  let displayIcon = 'person';

  if (currentRole === 'student') {
    displayTitle = 'Student';
    displayIcon = 'school';
  } else if (currentRole === 'advocate' || currentRole === 'personal' || currentRole === 'individual') {
    displayTitle = 'Advocate';
    displayIcon = 'person';
  } else if (currentRole === 'law_firm' || (activeWsType as string) === 'law_firm' || (activeWsType as string) === 'firm') {
    displayTitle = activeWorkspace?.name && (activeWsType as string) !== 'personal' ? activeWorkspace.name : 'Law Firm';
    displayIcon = 'business';
  }

  return (
    <>
      <Pressable
        onPress={() => setShowWorkspaceModal(true)}
        style={({ pressed }) => [
          styles.roleBtn,
          { backgroundColor: isDark ? '#1F2937' : '#FEF3C7', borderColor: '#C8A34D' },
          pressed && { opacity: 0.8 },
          style,
        ]}
      >
        <Ionicons
          name={displayIcon as any}
          size={13}
          color="#C8A34D"
          style={{ marginRight: 5 }}
        />
        <Text style={[styles.roleBtnText, { color: isDark ? '#F9FAFB' : '#92400E' }]} numberOfLines={1}>
          {displayTitle}
        </Text>
        <Ionicons name="chevron-down" size={12} color="#C8A34D" style={{ marginLeft: 3 }} />
      </Pressable>

      {/* Workspace & Experience Role Selection Modal */}
      <Modal
        visible={showWorkspaceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkspaceModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowWorkspaceModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Choose Workspace</Text>
                  <TouchableOpacity onPress={() => setShowWorkspaceModal(false)}>
                    <Ionicons name="close" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSub}>
                  Select where you want to work. Switching workspace updates your cases, AI context & team.
                </Text>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* 1. AVAILABLE WORKSPACES SECTION (Law Firms Only) */}
                  <Text style={[styles.sectionHeader, { color: '#C8A34D' }]}>
                    AVAILABLE WORKSPACES {availableFirmWorkspaces.length > 0 ? `(${availableFirmWorkspaces.length})` : ''}
                  </Text>

                  {availableFirmWorkspaces.length === 0 ? (
                    <View style={[styles.emptyFirmCard, { backgroundColor: isDark ? '#111111' : '#F9FAFB', borderColor: theme.border }]}>
                      <Ionicons name="business-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.emptyFirmText, { color: theme.textSecondary || '#9CA3AF' }]}>
                        No Law Firm workspaces available.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.roleList}>
                      {availableFirmWorkspaces.map((ws: any) => {
                        const wsId = ws.id || ws._id;
                        const activeWsId = activeWorkspace?.id || (activeWorkspace as any)?._id;
                        const isSelected = selectedRole === 'law_firm' && activeWsId === wsId;
                        return (
                          <TouchableOpacity
                            key={wsId}
                            style={[
                              styles.roleOptionCard,
                              {
                                backgroundColor: isSelected ? (isDark ? '#374151' : '#FEF3C7') : theme.background,
                                borderColor: isSelected ? '#C8A34D' : theme.border,
                              },
                            ]}
                            onPress={() => {
                              switchWorkspace(wsId);
                              setRole('law_firm');
                              setShowWorkspaceModal(false);
                            }}
                          >
                            <Ionicons
                              name="business"
                              size={22}
                              color={isSelected ? '#C8A34D' : theme.textSecondary}
                              style={{ marginRight: 12 }}
                            />
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.roleOptionLabel, { color: isSelected ? '#C8A34D' : theme.textPrimary }]}>
                                  {ws.name}
                                </Text>
                                <View style={[styles.roleBadge, { backgroundColor: isSelected ? '#C8A34D' : 'rgba(200, 163, 77, 0.2)' }]}>
                                  <Text style={[styles.roleBadgeText, { color: isSelected ? '#FFFFFF' : '#C8A34D' }]}>
                                    {ws.badge || 'Law Firm'}
                                  </Text>
                                </View>
                              </View>
                              <Text style={[styles.roleOptionDesc, { color: theme.textSecondary }]}>
                                Role: {ws.role || 'Member'}{ws.casesCount !== undefined ? ` • ${ws.casesCount} Cases` : ''}
                              </Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* 2. PRACTICE EXPERIENCE SECTION */}
                  <Text style={[styles.sectionHeader, { color: '#C8A34D', marginTop: 16 }]}>PRACTICE EXPERIENCE</Text>
                  <View style={styles.roleList}>
                    {ROLES.map((roleItem) => {
                      const isAdvocateRole = roleItem.id === 'advocate' && (currentRole === 'advocate' || currentRole === 'personal' || currentRole === 'individual');
                      const isStudentRole = roleItem.id === 'student' && currentRole === 'student';
                      const isFirmRole = roleItem.id === 'law_firm' && (currentRole === 'law_firm' || currentRole === 'enterprise');

                      const isSelected = isAdvocateRole || isStudentRole || isFirmRole;

                      return (
                        <TouchableOpacity
                          key={roleItem.id}
                          style={[
                            styles.roleOptionCard,
                            {
                              backgroundColor: isSelected ? (isDark ? '#374151' : '#FEF3C7') : theme.background,
                              borderColor: isSelected ? '#C8A34D' : theme.border,
                            },
                          ]}
                          onPress={() => {
                            setRole(roleItem.id);
                            if (roleItem.id === 'advocate' || roleItem.id === 'student') {
                              switchWorkspace('personal_practice');
                            } else if (roleItem.id === 'law_firm') {
                              if (availableFirmWorkspaces.length > 0) {
                                const targetFirmId = availableFirmWorkspaces[0].id || (availableFirmWorkspaces[0] as any)._id;
                                switchWorkspace(targetFirmId);
                              }
                            }
                            setShowWorkspaceModal(false);
                          }}
                        >
                          <Text style={{ fontSize: 22, marginRight: 12 }}>{roleItem.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.roleOptionLabel, { color: isSelected ? '#C8A34D' : theme.textPrimary }]}>
                              {roleItem.label}
                            </Text>
                            <Text style={[styles.roleOptionDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                              {roleItem.description}
                            </Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#C8A34D" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    maxWidth: '52%',
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  roleList: {
    gap: 8,
  },
  roleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleOptionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  roleOptionDesc: {
    fontSize: 10.5,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  emptyFirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  emptyFirmText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
