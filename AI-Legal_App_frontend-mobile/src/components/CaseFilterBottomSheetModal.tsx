import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';

export interface FilterState {
  category: string; // 'All' | 'Notice' | 'Agreement' | 'Pleading' | 'Affidavit' | 'Other' etc.
  sharing: 'All' | 'Shared with Me' | 'Shared by Me';
  access: 'Any Access' | 'View Only' | 'Review Only' | 'Editor' | 'Reviewer / Approver';
}

export const DEFAULT_FILTER_STATE: FilterState = {
  category: 'All',
  sharing: 'All',
  access: 'Any Access',
};

interface Props {
  visible: boolean;
  filterState: FilterState;
  categories?: string[];
  onClose: () => void;
  onApply: (state: FilterState) => void;
  onReset: () => void;
  title?: string;
}

const DEFAULT_DOC_TYPES = ['All', 'Notice', 'Agreement', 'Pleading', 'Affidavit', 'Other'];

export const CaseFilterBottomSheetModal: React.FC<Props> = ({
  visible,
  filterState,
  categories = DEFAULT_DOC_TYPES,
  onClose,
  onApply,
  onReset,
  title = 'FILTER DOCUMENTS',
}) => {
  const { isDark } = useThemeContext();
  const [localState, setLocalState] = useState<FilterState>(filterState);

  const GOLD = '#D4AF37';
  const cardBg = isDark ? '#16161E' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const surfaceBg = isDark ? '#1E1E2A' : '#F9FAFB';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            borderWidth: 1,
            borderColor,
          }}
        >
          {/* Handle bar */}
          <View style={{ width: 40, height: 4, backgroundColor: borderColor, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {/* 1. DOCUMENT / EVIDENCE TYPE */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 10 }}>
                {title.includes('EVIDENCE') ? 'EVIDENCE TYPE' : 'DOCUMENT TYPE'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat) => {
                  const label = cat === 'All' ? 'All Types' : cat;
                  const active = localState.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setLocalState((p) => ({ ...p, category: cat }))}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? 'rgba(212,175,55,0.18)' : surfaceBg,
                        borderWidth: 1,
                        borderColor: active ? GOLD : borderColor,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. SHARING */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 10 }}>
                SHARING
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['All', 'Shared with Me', 'Shared by Me'] as const).map((opt) => {
                  const active = localState.sharing === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setLocalState((p) => ({ ...p, sharing: opt }))}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? 'rgba(212,175,55,0.18)' : surfaceBg,
                        borderWidth: 1,
                        borderColor: active ? GOLD : borderColor,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. ACCESS LEVEL */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', marginBottom: 10 }}>
                ACCESS LEVEL
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['Any Access', 'View Only', 'Review Only', 'Editor', 'Reviewer / Approver'] as const).map((opt) => {
                  const active = localState.access === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setLocalState((p) => ({ ...p, access: opt }))}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? 'rgba(212,175,55,0.18)' : surfaceBg,
                        borderWidth: 1,
                        borderColor: active ? GOLD : borderColor,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? GOLD : textPrimary }}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: borderColor }}>
            <TouchableOpacity
              onPress={() => {
                setLocalState(DEFAULT_FILTER_STATE);
                onReset();
                onClose();
              }}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: surfaceBg, borderWidth: 1, borderColor, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: textSecondary }}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onApply(localState);
                onClose();
              }}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#000000' }}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
