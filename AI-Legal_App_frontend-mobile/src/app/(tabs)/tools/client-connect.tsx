import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
import { ClientConnectModule } from '@/components/ClientConnectModule';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization/toolTranslations';
import { useLocalLanguageStore } from '@/localization/i18n';

export default function ClientConnectScreen() {
  const router = useRouter();
  const { theme } = useThemeContext();
  const { showToast } = useToastContext();

  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_client-connect');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);
  const [flowOption, setFlowOption] = useState<'existing' | 'new' | null>(null);
  const [cases, setCases] = useState<CaseWorkspace[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseWorkspace[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseWorkspace | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Saved Clients Directory state
  const [savedClients, setSavedClients] = useState<any[]>([]);
  const [filteredSavedClients, setFilteredSavedClients] = useState<any[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Onboarding Form State
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientMobileInput, setClientMobileInput] = useState('');
  const [clientWhatsAppInput, setClientWhatsAppInput] = useState('');
  const [clientEmailInput, setClientEmailInput] = useState('');
  const [clientOrgInput, setClientOrgInput] = useState('');
  const [clientNotesInput, setClientNotesInput] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Fetch all cases & clients on mount
  useEffect(() => {
    fetchCases();
    fetchSavedClients();
  }, []);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await CaseService.listCases();
      const casesData = Array.isArray(res) ? res : (res?.data || []);
      // Filter active legal cases
      const activeLegalCases = (casesData as CaseWorkspace[]).filter(
        (c) => c.isLegalCase && c.status !== 'Archived'
      );
      setCases(activeLegalCases);
      setFilteredCases(activeLegalCases);
    } catch (err) {
      console.error(err);
      showToast('error', 'Fetch Error', 'Failed to retrieve case folders.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedClients = async () => {
    try {
      const res = await CaseService.listClients();
      if (res && res.success) {
        setSavedClients(res.clients || []);
        setFilteredSavedClients(res.clients || []);
      }
    } catch (e) {
      console.warn('Failed to load standalone clients:', e);
    }
  };

  // Saved clients directory search filter
  useEffect(() => {
    if (clientSearchQuery.trim() === '') {
      setFilteredSavedClients(savedClients);
    } else {
      const query = clientSearchQuery.toLowerCase().trim();
      const filtered = savedClients.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.mobileNumber?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
      setFilteredSavedClients(filtered);
    }
  }, [clientSearchQuery, savedClients]);

  // Case Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCases(cases);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = cases.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.clientName?.toLowerCase().includes(query)
      );
      setFilteredCases(filtered);
    }
  }, [searchQuery, cases]);

  // Handler to reload case details when updates happen
  const handleCaseUpdated = async () => {
    if (!selectedCase) return;
    try {
      const res = await CaseService.getCaseDetails(selectedCase._id);
      const updatedCase = (res as any).data || res;
      if (updatedCase) {
        setSelectedCase(updatedCase as CaseWorkspace);
      }
    } catch (e) {
      console.warn('Failed to refresh selected case details:', e);
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!clientNameInput.trim()) errs.name = 'Client Full Name is required';
    
    const phoneClean = clientMobileInput.replace(/\s+/g, '');
    if (!clientMobileInput.trim()) {
      errs.mobileNumber = 'Mobile Number is required';
    } else if (!/^\+?([0-9]{1,4})?[-. ]?([0-9]{10})$/.test(phoneClean)) {
      errs.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (clientWhatsAppInput.trim()) {
      const waClean = clientWhatsAppInput.replace(/\s+/g, '');
      if (!/^\+?([0-9]{1,4})?[-. ]?([0-9]{10})$/.test(waClean)) {
        errs.whatsAppNumber = 'Please enter a valid 10-digit WhatsApp number';
      }
    }

    if (clientEmailInput.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmailInput.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveNewClient = async () => {
    if (!validateForm()) return;
    setIsFormSubmitting(true);
    try {
      const res = await CaseService.createClient({
        name: clientNameInput.trim(),
        mobileNumber: clientMobileInput.trim(),
        whatsAppNumber: clientWhatsAppInput.trim(),
        email: clientEmailInput.trim().toLowerCase(),
        organization: clientOrgInput.trim(),
        notes: clientNotesInput.trim(),
      });
      
      if (res && res.success) {
        showToast('success', 'Success', '✓ Client Added Successfully');
        // Reset onboarding inputs
        setClientNameInput('');
        setClientMobileInput('');
        setClientWhatsAppInput('');
        setClientEmailInput('');
        setClientOrgInput('');
        setClientNotesInput('');
        setFormErrors({});
        // Reload saved clients & return
        await fetchSavedClients();
        setFlowOption(null);
      } else {
        showToast('error', 'Onboarding Failed', 'Failed to onboard standalone client.');
      }
    } catch (err: any) {
      console.error(err);
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        setFormErrors(serverErrors);
      } else {
        showToast('error', 'Error', err.message || 'Onboarding failed.');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              if (selectedCase) {
                setSelectedCase(null);
                setFlowOption(null);
                fetchCases();
                fetchSavedClients();
              } else if (flowOption) {
                setFlowOption(null);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {selectedCase ? tTool(outputLanguage, 'clientConnect.title', 'AI Client Connect') : flowOption === 'new' ? tTool(outputLanguage, 'clientConnect.connectNewClient', 'Connect New Client') : flowOption === 'existing' ? tTool(outputLanguage, 'clientConnect.selectCaseFolderTitle', 'Select Case Folder') : tTool(outputLanguage, 'clientConnect.title', 'AI Client Connect')}
          </Text>
          <OutputLanguageSelector
            toolId="client-connect"
            selectedLanguage={outputLanguage}
            onLanguageChange={(newLang) => {
    setOutputLanguage(newLang);
    useLocalLanguageStore.getState().setLocalLanguage(newLang);
  }}
          />
        </View>

        {!flowOption && !selectedCase ? (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>{tTool(outputLanguage, 'clientConnect.title', 'AI CLIENT CONNECT')}</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
                {tTool(outputLanguage, 'clientConnect.subtitle', "Choose how you'd like to connect with your client.")}
              </Text>
            </View>

            {/* Option 1: Existing Case Client */}
            <View style={[styles.flowCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="folder-open-outline" size={24} color="#C8A34D" />
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'clientConnect.existingCaseTitle', 'Existing Case Client')}</Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {tTool(outputLanguage, 'clientConnect.existingCaseDesc', 'Connect with a client already linked to one of your cases.')}
              </Text>
              <TouchableOpacity
                style={[styles.flowCta, { backgroundColor: '#C8A34D' }]}
                onPress={() => setFlowOption('existing')}
              >
                <Text style={styles.flowCtaText}>{tTool(outputLanguage, 'clientConnect.selectExistingCase', 'Select Existing Case')}</Text>
              </TouchableOpacity>
            </View>

            {/* Option 2: New Client */}
            <View style={[styles.flowCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="person-add-outline" size={24} color="#C8A34D" />
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'clientConnect.newClientTitle', 'New Client')}</Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {tTool(outputLanguage, 'clientConnect.newClientDesc', 'Connect with a client who is not yet linked to any case.')}
              </Text>
              <TouchableOpacity
                style={[styles.flowCta, { backgroundColor: '#C8A34D' }]}
                onPress={() => setFlowOption('new')}
              >
                <Text style={styles.flowCtaText}>{tTool(outputLanguage, 'clientConnect.connectNewClient', 'Connect New Client')}</Text>
              </TouchableOpacity>
            </View>

            {/* Section 3: Saved Clients (CRM Directory List) */}
            <View style={{ marginVertical: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{tTool(outputLanguage, 'clientConnect.savedClients', 'Saved Clients')}</Text>
              
              <View style={[styles.clientSearchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.clientSearchInput, { color: theme.textPrimary }]}
                  placeholder={tTool(outputLanguage, 'clientConnect.searchClientPlaceholder', 'Search Client...')}
                  placeholderTextColor={theme.placeholder}
                  value={clientSearchQuery}
                  onChangeText={setClientSearchQuery}
                />
                {clientSearchQuery ? (
                  <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {filteredSavedClients.length > 0 ? (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {filteredSavedClients.map((client) => (
                    <TouchableOpacity
                      key={client._id}
                      style={[styles.savedClientCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => {
                        if (client.project) {
                          setSelectedCase(client.project);
                        } else {
                          showToast('error', 'Error', 'No workspace link found for this client.');
                        }
                      }}
                    >
                      <View style={[styles.avatarWrapper, { backgroundColor: `${theme.primary}12` }]}>
                        <Ionicons name="person-circle-outline" size={24} color="#C8A34D" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.clientNameText, { color: theme.textPrimary }]}>{client.name}</Text>
                        <Text style={[styles.clientMobileText, { color: theme.textSecondary }]}>{client.mobileNumber}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptySavedClients, { borderColor: theme.border }]}>
                  <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center' }}>
                    {clientSearchQuery ? tTool(outputLanguage, 'clientConnect.noMatchingClients', 'No matching clients found.') : tTool(outputLanguage, 'clientConnect.noSavedClients', 'No saved clients in directory yet.')}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : flowOption === 'new' && !selectedCase ? (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={[styles.formContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.formHeaderTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'clientConnect.onboardingTitle', 'Client Onboarding Form')}</Text>
                <Text style={[styles.formHeaderSubtitle, { color: theme.textMuted }]}>
                  {tTool(outputLanguage, 'clientConnect.onboardingSubtitle', 'Please fill in the details to onboard this client to the directory.')}
                </Text>

                <View style={{ gap: 14, marginTop: 16 }}>
                  {/* Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'clientConnect.fullNameLabel', 'Client Full Name *')}</Text>
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary, borderColor: formErrors.name ? theme.danger : theme.border, backgroundColor: theme.background }]}
                      placeholder={tTool(outputLanguage, 'clientConnect.fullNamePlaceholder', 'Enter full name')}
                      placeholderTextColor={theme.placeholder}
                      value={clientNameInput}
                      onChangeText={setClientNameInput}
                    />
                    {formErrors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{formErrors.name}</Text>}
                  </View>

                  {/* Mobile Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'clientConnect.mobileLabel', 'Mobile Number *')}</Text>
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary, borderColor: formErrors.mobileNumber ? theme.danger : theme.border, backgroundColor: theme.background }]}
                      placeholder={tTool(outputLanguage, 'clientConnect.mobilePlaceholder', 'e.g. 9876543210')}
                      placeholderTextColor={theme.placeholder}
                      keyboardType="phone-pad"
                      value={clientMobileInput}
                      onChangeText={setClientMobileInput}
                    />
                    {formErrors.mobileNumber && <Text style={[styles.errorText, { color: theme.danger }]}>{formErrors.mobileNumber}</Text>}
                  </View>

                  {/* WhatsApp Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'clientConnect.whatsappLabel', 'WhatsApp Number')}</Text>
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary, borderColor: formErrors.whatsAppNumber ? theme.danger : theme.border, backgroundColor: theme.background }]}
                      placeholder={tTool(outputLanguage, 'clientConnect.mobilePlaceholder', 'e.g. 9876543210')}
                      placeholderTextColor={theme.placeholder}
                      keyboardType="phone-pad"
                      value={clientWhatsAppInput}
                      onChangeText={setClientWhatsAppInput}
                    />
                    {formErrors.whatsAppNumber && <Text style={[styles.errorText, { color: theme.danger }]}>{formErrors.whatsAppNumber}</Text>}
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'clientConnect.emailLabel', 'Email Address')}</Text>
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary, borderColor: formErrors.email ? theme.danger : theme.border, backgroundColor: theme.background }]}
                      placeholder="e.g. client@domain.com"
                      placeholderTextColor={theme.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={clientEmailInput}
                      onChangeText={setClientEmailInput}
                    />
                    {formErrors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{formErrors.email}</Text>}
                  </View>

                  {/* Organization Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'clientConnect.orgLabel', 'Organization / Company Name (Optional)')}</Text>
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
                      placeholder={tTool(outputLanguage, 'clientConnect.companyPlaceholder', 'Enter company name')}
                      placeholderTextColor={theme.placeholder}
                      value={clientOrgInput}
                      onChangeText={setClientOrgInput}
                    />
                  </View>

                  {/* Notes Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{tTool(outputLanguage, 'clientConnect.notesLabel', 'Notes (Optional)')}</Text>
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background, height: 80, textAlignVertical: 'top' }]}
                      placeholder={tTool(outputLanguage, 'clientConnect.notesPlaceholder', 'Add case files references or consult notes...')}
                      placeholderTextColor={theme.placeholder}
                      multiline
                      numberOfLines={3}
                      value={clientNotesInput}
                      onChangeText={setClientNotesInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#C8A34D' }]}
                    onPress={handleSaveNewClient}
                    disabled={isFormSubmitting}
                  >
                    {isFormSubmitting ? (
                      <ActivityIndicator size="small" color="#111111" />
                    ) : (
                      <Text style={styles.submitBtnText}>{tTool(outputLanguage, 'clientConnect.saveClientBtn', 'Save Client')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </ScrollView>
        ) : flowOption === 'existing' && !selectedCase ? (
          <View style={{ flex: 1 }}>
            {/* Search Input */}
            <View style={styles.searchBarContainer}>
              <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder={tTool(outputLanguage, 'clientConnect.searchCasePlaceholder', 'Search case name or client name...')}
                  placeholderTextColor={theme.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Cases List */}
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  {tTool(outputLanguage, 'clientConnect.retrievingFolders', 'Retrieving active case folders...')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCases}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.caseItemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={async () => {
                      setSelectedCase(item);
                      try {
                        const res = await CaseService.getCaseDetails(item._id || (item as any).id);
                        const freshData = (res as any).data || res;
                        if (freshData && freshData._id) {
                          setSelectedCase(freshData as CaseWorkspace);
                        }
                      } catch (e) {
                        console.warn('Failed to fetch fresh case details:', e);
                      }
                    }}
                  >
                    <View style={[styles.caseIconWrapper, { backgroundColor: `${theme.primary}12` }]}>
                      <Ionicons name="folder-open" size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.caseName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.clientSubText, { color: theme.textSecondary }]}>
                        Client: {item.clientName || 'N/A'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="folder-outline" size={48} color={theme.textMuted} style={{ marginBottom: 10 }} />
                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'clientConnect.noCaseFoldersFound', 'No Case Folders Found')}</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                      {tTool(outputLanguage, 'clientConnect.noCaseFoldersDesc', 'Create or index a legal case folder first to begin communication workflows.')}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={{ flex: 1, padding: 18 }}>
              <ClientConnectModule
                caseData={selectedCase!} outputLanguage={outputLanguage}
                onUpdate={handleCaseUpdated}
                onDelete={() => {
                  setSelectedCase(null);
                  setFlowOption(null);
                  fetchSavedClients();
                }}
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
  },
  searchBarContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  caseItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  caseIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caseName: {
    fontSize: 14,
    fontWeight: '800',
  },
  clientSubText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  flowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  flowCta: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  flowCtaText: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 13,
  },
  formContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  formHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  formHeaderSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 13,
  },
  clientSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  clientSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  savedClientCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  clientMobileText: {
    fontSize: 12,
  },
  emptySavedClients: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
