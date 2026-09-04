import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  Platform,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import { useLocalLanguageStore } from '@/localization/i18n';
import { useUserStore } from '@/store/user';
import { ProfileService } from '@/services/profile.service';

export interface IndianStateItem {
  name: string;
  language: string;
  locale: string;
  flag: string;
}

export const INDIAN_STATES_LIST: IndianStateItem[] = [
  // 28 States of India
  { name: 'Andhra Pradesh', language: 'Telugu', locale: 'te-IN', flag: '🏛️' },
  { name: 'Arunachal Pradesh', language: 'Hindi', locale: 'hi-IN', flag: '🏔️' },
  { name: 'Assam', language: 'Assamese', locale: 'as-IN', flag: '🦏' },
  { name: 'Bihar', language: 'Hindi', locale: 'hi-IN', flag: '📜' },
  { name: 'Chhattisgarh', language: 'Hindi', locale: 'hi-IN', flag: '🌾' },
  { name: 'Goa', language: 'Konkani', locale: 'gom-IN', flag: '🏖️' },
  { name: 'Gujarat', language: 'Gujarati', locale: 'gu-IN', flag: '🦁' },
  { name: 'Haryana', language: 'Hindi', locale: 'hi-IN', flag: '🌾' },
  { name: 'Himachal Pradesh', language: 'Hindi', locale: 'hi-IN', flag: '🏔️' },
  { name: 'Jharkhand', language: 'Hindi', locale: 'hi-IN', flag: '🌲' },
  { name: 'Karnataka', language: 'Kannada', locale: 'kn-IN', flag: '🏰' },
  { name: 'Kerala', language: 'Malayalam', locale: 'ml-IN', flag: '🌴' },
  { name: 'Madhya Pradesh', language: 'Hindi', locale: 'hi-IN', flag: '🐅' },
  { name: 'Maharashtra', language: 'Marathi', locale: 'mr-IN', flag: '🚩' },
  { name: 'Manipur', language: 'Manipuri', locale: 'mni-IN', flag: '🏞️' },
  { name: 'Meghalaya', language: 'English', locale: 'en-IN', flag: '☁️' },
  { name: 'Mizoram', language: 'English', locale: 'en-IN', flag: '⛰️' },
  { name: 'Nagaland', language: 'English', locale: 'en-IN', flag: '🌄' },
  { name: 'Odisha', language: 'Odia', locale: 'or-IN', flag: '🛕' },
  { name: 'Punjab', language: 'Punjabi', locale: 'pa-IN', flag: '🌾' },
  { name: 'Rajasthan', language: 'Hindi', locale: 'hi-IN', flag: '🏰' },
  { name: 'Sikkim', language: 'Nepali', locale: 'ne-IN', flag: '🏔️' },
  { name: 'Tamil Nadu', language: 'Tamil', locale: 'ta-IN', flag: '🛕' },
  { name: 'Telangana', language: 'Telugu', locale: 'te-IN', flag: '🏛️' },
  { name: 'Tripura', language: 'Bengali', locale: 'bn-IN', flag: '🌿' },
  { name: 'Uttar Pradesh', language: 'Hindi', locale: 'hi-IN', flag: '⚖️' },
  { name: 'Uttarakhand', language: 'Hindi', locale: 'hi-IN', flag: '🏔️' },
  { name: 'West Bengal', language: 'Bengali', locale: 'bn-IN', flag: '🐯' },

  // 8 Union Territories of India
  { name: 'Andaman & Nicobar Islands', language: 'Hindi', locale: 'hi-IN', flag: '🏝️' },
  { name: 'Chandigarh', language: 'Punjabi', locale: 'pa-IN', flag: '🏛️' },
  { name: 'Dadra & Nagar Haveli and Daman & Diu', language: 'Gujarati', locale: 'gu-IN', flag: '🌊' },
  { name: 'Delhi (NCT)', language: 'Hindi', locale: 'hi-IN', flag: '🏛️' },
  { name: 'Jammu & Kashmir', language: 'Urdu', locale: 'ur-IN', flag: '❄️' },
  { name: 'Ladakh', language: 'Urdu', locale: 'ur-IN', flag: '🏔️' },
  { name: 'Lakshadweep', language: 'Malayalam', locale: 'ml-IN', flag: '🏝️' },
  { name: 'Puducherry', language: 'Tamil', locale: 'ta-IN', flag: '🏛️' },
];

interface StatePickerInputProps {
  label?: string;
  selectedState: string;
  onSelectState: (stateItem: IndianStateItem) => void;
  error?: string;
}

export function StatePickerInput({
  label = 'State / Union Territory',
  selectedState,
  onSelectState,
  error,
}: StatePickerInputProps) {
  const { theme } = useThemeContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const currentItem = INDIAN_STATES_LIST.find(
    (s) => s.name.toLowerCase() === (selectedState || '').toLowerCase()
  ) || INDIAN_STATES_LIST[0]; // Default Gujarat or first

  const filteredStates = INDIAN_STATES_LIST.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.language.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: IndianStateItem) => {
    onSelectState(item);
    // Instantly update local app language store
    useLocalLanguageStore.getState().setLocalLanguage(item.language);
    useLocalLanguageStore.getState().setLocalLocale(item.locale);

    // Sync profile state & language if user profile is loaded
    const currentProfile = useUserStore.getState().profile;
    if (currentProfile) {
      const updatedGeneral = {
        ...(currentProfile.personalizations?.general || {}),
        language: item.language,
        state: item.name,
      };
      useUserStore.getState().updatePersonalizations({
        general: updatedGeneral as any,
      });
      ProfileService.updateProfile({
        personalizations: {
          ...(currentProfile.personalizations || {}),
          general: updatedGeneral,
        } as any,
      }).catch((err) => console.warn('[StatePicker] Backend sync failed:', err));
    }

    setModalVisible(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.textSecondary || '#475569' }]}>{label}</Text>}
      
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.pickerBtn,
          {
            backgroundColor: theme.card || '#F8FAFC',
            borderColor: error ? '#EF4444' : theme.border || '#E2E8F0',
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={styles.leftContent}>
          <Text style={styles.flagIcon}>{currentItem.flag}</Text>
          <View style={styles.textColumn}>
            <Text style={[styles.stateText, { color: theme.text || '#0F172A' }]}>
              {selectedState || 'Select State'}
            </Text>
            <Text style={styles.langSubtext}>
              Auto Language: <Text style={styles.langHighlight}>{currentItem.language}</Text>
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary || '#64748B'} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: theme.background || '#FFFFFF' }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border || '#E2E8F0' }]}>
            <Text style={[styles.modalTitle, { color: theme.text || '#0F172A' }]}>Select Indian State</Text>
            <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text || '#0F172A'} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.card || '#F1F5F9' }]}>
              <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text || '#0F172A' }]}
                placeholder="Search State or Language..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            </View>
          </View>

          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const isSelected = item.name.toLowerCase() === (selectedState || '').toLowerCase();
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.stateItemRow,
                    isSelected && { backgroundColor: '#FEF3C7', borderColor: '#C8A34D' },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemStateName, { color: theme.text || '#0F172A' }]}>{item.name}</Text>
                    <Text style={styles.itemLangBadge}>App Language: {item.language}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color="#C8A34D" />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  textColumn: {
    flexDirection: 'column',
  },
  stateText: {
    fontSize: 15,
    fontWeight: '700',
  },
  langSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  langHighlight: {
    color: '#C8A34D',
    fontWeight: '800',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  stateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  itemStateName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemLangBadge: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
});
