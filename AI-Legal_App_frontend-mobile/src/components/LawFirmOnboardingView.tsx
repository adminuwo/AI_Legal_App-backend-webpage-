import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useWorkspaceContext, useToastContext } from '@/providers';
import { Spacing, Radius, Shadows } from '@/theme';
import { apiClient } from '../api/client';

interface LawFirmOnboardingViewProps {
  onRefreshInvite?: () => void;
}

export const LawFirmOnboardingView: React.FC<LawFirmOnboardingViewProps> = ({ onRefreshInvite }) => {
  const { theme, isDark } = useThemeContext();
  const { syncWorkspaces, switchWorkspace, refreshTeamMembers } = useWorkspaceContext();
  const { showToast } = useToastContext();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingInvites, setIsCheckingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const fetchPendingInvites = async () => {
    try {
      setIsCheckingInvites(true);
      const res = await apiClient.get('/workspaces/invitations/pending');
      if (res.data && res.data.success && Array.isArray(res.data.invitations)) {
        setPendingInvites(res.data.invitations);
      } else {
        setPendingInvites([]);
      }
    } catch (err) {
      console.warn('[LawFirmOnboarding] Failed to fetch invitations:', err);
    } finally {
      setIsCheckingInvites(false);
    }
  };

  React.useEffect(() => {
    fetchPendingInvites();
  }, []);

  const handleCreateFirm = async () => {
    if (!firmName.trim()) {
      showToast('error', 'Required Field', 'Please enter a Law Firm Name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post('/workspaces', { name: firmName.trim() });
      setIsSubmitting(false);

      if (res.data && res.data.success) {
        showToast('success', '⚖️ Firm Created Successfully', `Welcome to ${firmName}!`);
        setFirmName('');
        setIsCreateModalOpen(false);

        // Sync new list & switch to newly created workspace
        await syncWorkspaces();
        if (res.data.workspace && res.data.workspace.id) {
          await switchWorkspace(res.data.workspace.id);
        }
      } else {
        showToast('error', 'Failed to create firm', res.data.error || 'Something went wrong.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      showToast('error', 'Failed to create firm', err.message || 'Network error.');
    }
  };

  const handleCheckInvitations = async () => {
    try {
      if (onRefreshInvite) {
        await onRefreshInvite();
      }
      await fetchPendingInvites();
      showToast('success', 'Refreshed', 'Checked for new workspace invitations.');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleAcceptInvite = async (inviteId: string, wsId: string) => {
    try {
      setIsCheckingInvites(true);
      const res = await apiClient.post(`/workspaces/invitations/${inviteId}/accept`);
      if (res.data && res.data.success) {
        showToast('success', '✅ Invitation Accepted', 'You have joined the law firm workspace.');
        setPendingInvites((prev) => prev.filter((i) => (i._id || i.id) !== inviteId));
        await syncWorkspaces();
        if (wsId) {
          await switchWorkspace(wsId);
          if (refreshTeamMembers) await refreshTeamMembers(wsId);
        }
      } else {
        showToast('error', 'Action Failed', res.data.error || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to accept invitation.');
    } finally {
      setIsCheckingInvites(false);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    try {
      setIsCheckingInvites(true);
      const res = await apiClient.post(`/workspaces/invitations/${inviteId}/reject`);
      if (res.data && res.data.success) {
        showToast('info', 'Invitation Declined', 'Invitation rejected.');
        setPendingInvites((prev) => prev.filter((i) => (i._id || i.id) !== inviteId));
      } else {
        showToast('error', 'Action Failed', res.data.error || 'Failed to reject invitation.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to reject invitation.');
    } finally {
      setIsCheckingInvites(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* PENDING INVITATIONS SECTION */}
      {pendingInvites.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={[styles.pendingHeading, { color: theme.textPrimary }]}>
            📬 Pending Law Firm Invitations ({pendingInvites.length})
          </Text>

          <View style={styles.pendingCardsList}>
            {pendingInvites.map((inv) => {
              const wsName = inv.workspaceId?.name || inv.workspaceName || 'Law Firm Workspace';
              const wsId = inv.workspaceId?._id || inv.workspaceId?.id || inv.workspaceId;
              const invId = inv._id || inv.id;

              return (
                <View
                  key={invId}
                  style={[
                    styles.pendingCard,
                    { backgroundColor: theme.card, borderColor: '#C8A34D' },
                    Shadows.md,
                  ]}
                >
                  <View style={styles.pendingCardHeader}>
                    <View style={styles.pendingIconBox}>
                      <Ionicons name="mail-open" size={24} color="#C8A34D" />
                    </View>
                    <Text style={[styles.firmNameText, { color: theme.textPrimary }]} numberOfLines={1}>
                      {wsName}
                    </Text>
                    <Text style={[styles.roleDeptText, { color: theme.textSecondary }]} numberOfLines={1}>
                      Role: {inv.role || 'Advocate'}  •  {inv.department || 'General Practice'}
                    </Text>
                  </View>

                  {inv.personalMessage ? (
                    <Text style={[styles.messageText, { color: theme.textMuted }]}>
                      "{inv.personalMessage}"
                    </Text>
                  ) : null}

                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { flex: 1, backgroundColor: '#C8A34D', paddingHorizontal: 6 }]}
                      onPress={() => handleAcceptInvite(invId, wsId)}
                      disabled={isCheckingInvites}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#111111" style={{ marginRight: 4 }} />
                      <Text style={[styles.primaryBtnText, { fontSize: 12 }]} numberOfLines={1} adjustsFontSizeToFit>
                        Accept Invitation
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryBtn, { flex: 1, borderColor: '#EF4444', paddingHorizontal: 6 }]}
                      onPress={() => handleRejectInvite(invId)}
                      disabled={isCheckingInvites}
                    >
                      <Ionicons name="close-circle-outline" size={15} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.secondaryBtnText, { color: '#EF4444', fontSize: 12 }]} numberOfLines={1} adjustsFontSizeToFit>
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* MAIN LAW FIRM WORKSPACE CARD */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.md]}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={48} color="#C8A34D" />
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>Law Firm Workspace</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Welcome to AI LEGAL Enterprise.</Text>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          You are not currently associated with any Law Firm Workspace. You can create a new law firm or join one you have been invited to.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#C8A34D' }]}
            onPress={() => setIsCreateModalOpen(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#111111" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Create New Law Firm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={handleCheckInvitations}
            disabled={isCheckingInvites}
          >
            {isCheckingInvites ? (
              <ActivityIndicator size="small" color="#C8A34D" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="mail-unread-outline" size={18} color="#C8A34D" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.secondaryBtnText}>Check for Invitations</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CREATE FIRM MODAL */}
      <Modal visible={isCreateModalOpen} transparent animationType="slide" onRequestClose={() => setIsCreateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Create Law Firm</Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Firm or Associate Name</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="e.g. ABC Law Associates"
              placeholderTextColor={theme.textMuted}
              value={firmName}
              onChangeText={setFirmName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#C8A34D', opacity: isSubmitting ? 0.7 : 1 }]}
              onPress={handleCreateFirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#111111" />
              ) : (
                <Text style={styles.modalSubmitText}>Create Firm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: Spacing[16],
    paddingHorizontal: Spacing[12],
    alignItems: 'center',
  },
  pendingSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing[24],
    marginTop: Spacing[8],
  },
  pendingHeading: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  pendingCardsList: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  pendingCard: {
    width: '90%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing[20],
    alignItems: 'center',
    alignSelf: 'center',
  },
  pendingCardHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  pendingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(200, 163, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  firmNameText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleDeptText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  messageText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    width: '100%',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[24],
    alignItems: 'center',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(200, 163, 77, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[16],
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing[16],
    textAlign: 'center',
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing[24],
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing[12],
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: 13.5,
  },
  secondaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#C8A34D',
    fontWeight: '700',
    fontSize: 13.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing[20],
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[20],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[16],
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputField: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: Spacing[20],
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: 13.5,
  },
});
