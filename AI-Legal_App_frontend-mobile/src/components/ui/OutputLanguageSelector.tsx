import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, LanguageConfig } from '@/constants/languages';
import { useThemeContext } from '@/providers';

interface OutputLanguageSelectorProps {
  toolId: string;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  containerStyle?: object;
  compact?: boolean;
}

export const OutputLanguageSelector: React.FC<OutputLanguageSelectorProps> = ({
  toolId,
  selectedLanguage,
  onLanguageChange,
  containerStyle,
  compact = false,
}) => {
  const { theme, isDark } = useThemeContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved per-tool language on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@ai_tool_lang_${toolId}`);
        if (saved && saved !== selectedLanguage) {
          onLanguageChange(saved);
        }
      } catch (err) {
        console.warn('Failed to load saved tool language:', err);
      }
    };
    loadSavedLanguage();
  }, [toolId]);

  const handleSelectLanguage = async (lang: LanguageConfig) => {
    const targetLang = lang.englishName;
    onLanguageChange(targetLang);
    setModalVisible(false);
    setSearchQuery('');
    try {
      await AsyncStorage.setItem(`@ai_tool_lang_${toolId}`, targetLang);
    } catch (err) {
      console.warn('Failed to save tool language:', err);
    }
  };

  const filteredLanguages = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.englishName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentLangObj =
    LANGUAGES.find((l) => l.englishName.toLowerCase() === selectedLanguage?.toLowerCase()) ||
    LANGUAGES[0];

  const dynamicBg = isDark ? '#161B22' : '#FFFFFF';
  const dynamicBorder = isDark ? '#21262D' : '#E2E8F0';
  const dynamicTextPrimary = isDark ? '#F0F6FC' : '#1E293B';
  const dynamicTextSecondary = isDark ? '#8B949E' : '#64748B';
  const dynamicInputBg = isDark ? '#0D1117' : '#F8FAFC';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          compact && styles.compactButton,
          { backgroundColor: dynamicBg, borderColor: dynamicBorder },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="language-outline" size={14} color={theme.primary} />
        {!compact && (
          <Text style={[styles.selectorLabel, { color: dynamicTextSecondary }]}>
            Output:
          </Text>
        )}
        <View style={[styles.langPill, { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.15)' : 'rgba(200, 163, 77, 0.1)', borderColor: theme.primary }]}>
          <Text style={[styles.langPillText, { color: theme.primary }]}>
            {currentLangObj.englishName}
          </Text>
          <Ionicons name="chevron-down" size={11} color={theme.primary} />
        </View>
      </TouchableOpacity>


      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissBg} onPress={() => setModalVisible(false)} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: dynamicBg, borderColor: dynamicBorder },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: dynamicBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="earth-outline" size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: dynamicTextPrimary }]}>
                  Select AI Output Language
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={dynamicTextSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtext, { color: dynamicTextSecondary }]}>
              All generated legal content, analysis, clauses, and reports for this tool will be in the selected language.
            </Text>

            <View style={[styles.searchBox, { backgroundColor: dynamicInputBg, borderColor: dynamicBorder }]}>
              <Ionicons name="search" size={16} color={dynamicTextSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: dynamicTextPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search language (e.g., Hindi, Marathi, Gujarati)..."
                placeholderTextColor={dynamicTextSecondary}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {filteredLanguages.map((lang) => {
                const isSelected =
                  lang.englishName.toLowerCase() === selectedLanguage?.toLowerCase();
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[
                      styles.langOptionItem,
                      { borderBottomColor: dynamicBorder },
                      isSelected && { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.15)' : 'rgba(200, 163, 77, 0.08)' },
                    ]}
                    onPress={() => handleSelectLanguage(lang)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langOptionName, { color: isSelected ? theme.primary : dynamicTextPrimary }]}>
                        {lang.name}
                      </Text>
                      <Text style={[styles.langOptionSub, { color: dynamicTextSecondary }]}>
                        {lang.englishName}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  compactButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  langPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDismissBg: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  modalSubtext: {
    fontSize: 10.5,
    marginTop: 8,
    marginBottom: 10,
    lineHeight: 15,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  langOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderRadius: 6,
  },
  langOptionName: {
    fontSize: 13,
    fontWeight: '700',
  },
  langOptionSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
});

export default OutputLanguageSelector;
