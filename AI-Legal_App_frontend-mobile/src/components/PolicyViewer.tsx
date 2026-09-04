import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Share,
  Clipboard,
  Alert,
  Linking,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { POLICY_DOCUMENTS, PolicyDocument, PolicySection } from '../constants/policy-data';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface PolicyViewerProps {
  defaultDocId: 'terms' | 'privacy' | 'disclaimer' | 'refunds' | 'cookies' | 'retention' | 'community';
  onBackPress?: () => void;
}

export default function PolicyViewer({ defaultDocId, onBackPress }: PolicyViewerProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();

  const [selectedDocId, setSelectedDocId] = useState(defaultDocId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});

  const currentDoc = useMemo(() => {
    return POLICY_DOCUMENTS.find(d => d.id === selectedDocId) || POLICY_DOCUMENTS[0];
  }, [selectedDocId]);

  // Expand first couple sections by default when selecting a doc
  useEffect(() => {
    if (currentDoc.sections.length > 0) {
      setExpandedSections({
        [currentDoc.sections[0].id]: true,
        [currentDoc.sections[1].id]: true,
      });
    } else {
      setExpandedSections({});
    }
    setSearchQuery('');
    setIsTocOpen(false);
  }, [selectedDocId]);

  const toggleSection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated: Record<string, boolean> = {};
    currentDoc.sections.forEach(s => {
      updated[s.id] = true;
    });
    setExpandedSections(updated);
  };

  const handleCollapseAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections({});
  };

  const handleCopyLink = () => {
    const url = `https://aisa24.com/legal/${currentDoc.id}`;
    Clipboard.setString(url);
    showToast('success', 'Link Copied', 'Policy link copied to clipboard.');
  };

  const handleShare = async () => {
    const url = `https://aisa24.com/legal/${currentDoc.id}`;
    try {
      await Share.share({
        message: `View the official AI LEGAL™ ${currentDoc.title} here: ${url}`,
        title: `AI LEGAL™ ${currentDoc.title}`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handlePrintMock = () => {
    const fullText = `${currentDoc.title}\nLast Updated: ${currentDoc.lastUpdated}\nVersion: ${currentDoc.version}\n\n${currentDoc.intro}\n\n` +
      currentDoc.sections.map(s => `--- ${s.title} ---\n${s.content}`).join('\n\n');
    
    Alert.alert(
      'Export Options',
      'Choose how you want to export this document for printing or archiving.',
      [
        {
          text: 'Copy Full Text',
          onPress: () => {
            Clipboard.setString(fullText);
            showToast('success', 'Copied to Clipboard', 'Full document text copied for printing.');
          }
        },
        {
          text: 'Share Text Document',
          onPress: () => {
            Share.share({
              message: fullText,
              title: currentDoc.title
            });
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Scroll to section by layout height mapping (robust fallback since measureLayout in ScrollView can be asynchronous)
  const handleScrollToSection = (id: string, index: number) => {
    setIsTocOpen(false);
    // Expand the targeted section so it is visible
    setExpandedSections(prev => ({ ...prev, [id]: true }));
    
    // Approximate position or scroll directly to offset
    setTimeout(() => {
      if (scrollRef.current) {
        // Approximate scroll offset calculation for robust performance
        const offset = 80 + index * 95; 
        scrollRef.current.scrollTo({ y: offset, animated: true });
      }
    }, 150);
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentDoc.sections;
    const q = searchQuery.toLowerCase().trim();
    return currentDoc.sections.filter(s => 
      s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [searchQuery, currentDoc]);

  // Styles using theme provider dynamically
  const activeStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 16,
    },
    docSelector: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    docSelectorContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    tabItem: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabItemActive: {
      borderColor: '#111111',
      backgroundColor: 'rgba(109, 93, 252, 0.08)',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: '#111111',
      fontWeight: '800',
    },
    body: {
      flex: 1,
    },
    bodyContent: {
      padding: 16,
      paddingBottom: 40,
    },
    docTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.textPrimary,
      marginBottom: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    metaText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    badge: {
      backgroundColor: 'rgba(109, 93, 252, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#111111',
    },
    intro: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 10,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.border,
      flex: 1,
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.textPrimary,
      padding: 0,
    },
    tocHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    tocTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    tocBody: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      gap: 10,
    },
    tocItem: {
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tocItemText: {
      fontSize: 12.5,
      color: '#111111',
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      backgroundColor: theme.surfaceVariant,
    },
    cardTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: theme.textPrimary,
      flex: 1,
      marginRight: 10,
    },
    cardContent: {
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    cardText: {
      fontSize: 12.5,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
  });

  return (
    <SafeAreaView style={activeStyles.container} edges={['top']}>
      {/* Sticky Header */}
      <View style={activeStyles.header}>
        <TouchableOpacity
          onPress={() => {
            if (onBackPress) {
              onBackPress();
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/settings');
            }
          }}
          style={{ padding: 4 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={activeStyles.headerTitle} numberOfLines={1}>Legal Policy Center</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={handleCopyLink} style={{ padding: 4 }}>
            <Ionicons name="link-outline" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={{ padding: 4 }}>
            <Ionicons name="share-social-outline" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Document Switcher Picker */}
      <View style={activeStyles.docSelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={activeStyles.docSelectorContent}
        >
          {POLICY_DOCUMENTS.map(doc => {
            const isSel = selectedDocId === doc.id;
            return (
              <TouchableOpacity
                key={doc.id}
                onPress={() => setSelectedDocId(doc.id as any)}
                style={[activeStyles.tabItem, isSel && activeStyles.tabItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[activeStyles.tabText, isSel && activeStyles.tabTextActive]}>
                  {doc.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Body */}
      <ScrollView
        ref={scrollRef}
        style={activeStyles.body}
        contentContainerStyle={activeStyles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={activeStyles.docTitle}>{currentDoc.title}</Text>
        
        <View style={activeStyles.metaRow}>
          <Text style={activeStyles.metaText}>Last Updated: {currentDoc.lastUpdated}</Text>
          <View style={activeStyles.badge}>
            <Text style={activeStyles.badgeText}>{currentDoc.version}</Text>
          </View>
        </View>

        <Text style={activeStyles.intro}>{currentDoc.intro}</Text>

        {/* Global Expand / Print Buttons */}
        <View style={activeStyles.actionRow}>
          <TouchableOpacity onPress={handleExpandAll} style={activeStyles.actionBtn}>
            <Ionicons name="add-circle-outline" size={14} color={theme.textPrimary} />
            <Text style={activeStyles.actionBtnText}>Expand All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCollapseAll} style={activeStyles.actionBtn}>
            <Ionicons name="remove-circle-outline" size={14} color={theme.textPrimary} />
            <Text style={activeStyles.actionBtnText}>Collapse All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrintMock} style={activeStyles.actionBtn}>
            <Ionicons name="print-outline" size={14} color={theme.textPrimary} />
            <Text style={activeStyles.actionBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={activeStyles.searchBar}>
          <Ionicons name="search-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={activeStyles.searchInput}
            placeholder={`Search within ${currentDoc.title.toLowerCase()}...`}
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Expandable Table of Contents (ToC) Accordion Dropdown */}
        {searchQuery.trim() === '' && (
          <View>
            <TouchableOpacity
              style={activeStyles.tocHeader}
              onPress={() => setIsTocOpen(!isTocOpen)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="list-outline" size={16} color={theme.textPrimary} />
                <Text style={activeStyles.tocTitle}>Table of Contents</Text>
              </View>
              <Ionicons name={isTocOpen ? "chevron-up" : "chevron-down"} size={16} color="#111111" />
            </TouchableOpacity>

            {isTocOpen && (
              <View style={activeStyles.tocBody}>
                {currentDoc.sections.map((sec, idx) => (
                  <TouchableOpacity
                    key={sec.id}
                    style={activeStyles.tocItem}
                    onPress={() => handleScrollToSection(sec.id, idx)}
                  >
                    <Text style={activeStyles.tocItemText}>{sec.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Sections Listing Accordions */}
        {filteredSections.length === 0 ? (
          <View style={activeStyles.emptyState}>
            <Ionicons name="search" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={activeStyles.emptyStateText}>No matching clauses found.</Text>
          </View>
        ) : (
          filteredSections.map((sec, idx) => {
            const isExpanded = expandedSections[sec.id] || searchQuery.trim() !== '';
            return (
              <View
                key={sec.id}
                style={activeStyles.card}
              >
                <TouchableOpacity
                  style={activeStyles.cardHeader}
                  onPress={() => toggleSection(sec.id)}
                  activeOpacity={0.8}
                >
                  <Text style={activeStyles.cardTitle}>{sec.title}</Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#111111"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={activeStyles.cardContent}>
                    <Text style={activeStyles.cardText}>{sec.content}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
