import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Animated,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { useTranslation } from '@/localization';
import { useUserStore } from '@/store/user';
import { ProfileService } from '@/services/profile.service';
import { useAuthContext } from '@/providers/auth-provider';
import { useSubscriptionStore } from '@/store/subscription';

const PRACTICE_AREAS = [
  'Civil Law',
  'Criminal Law',
  'Corporate Law',
  'Family Law',
  'Property Law',
  'Tax Law',
  'Labour Law',
  'Constitutional Law',
  'Arbitration',
  'IPR',
];

const PRESET_AVATARS = [
  { name: 'Male Counsel 1', url: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150&auto=format&fit=crop&q=80' },
  { name: 'Female Counsel 1', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { name: 'Male Counsel 2', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' },
  { name: 'Female Counsel 2', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { name: 'Judicial Crest', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150&auto=format&fit=crop&q=80' },
  { name: 'Attorney Shield', url: 'https://images.unsplash.com/photo-1453733190148-c44698c265f8?w=150&auto=format&fit=crop&q=80' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useToastContext();
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthContext();
  const { t } = useTranslation();

  // Luxury Theme colors
  const lTheme = useMemo(() => {
    return {
      bg: isDark ? '#000000' : '#FAFAFA',
      card: isDark ? '#222222' : '#FFFFFF',
      textPrimary: isDark ? '#FFFFFF' : '#111111',
      textSecondary: isDark ? '#CCCCCC' : '#555555',
      textMuted: isDark ? '#888888' : '#999999',
      gold: '#C8A34D',
      border: isDark ? '#333333' : '#E5E5E5',
      divider: isDark ? '#222222' : '#F0F0F0',
      lightGray: isDark ? '#1C1C1E' : '#F5F5F5',
      overlay: 'rgba(0, 0, 0, 0.75)',
      blackCardBg: '#111111',
      white: '#FFFFFF',
      black: '#000000',
      danger: '#D9383A',
      dangerBg: isDark ? 'rgba(217, 56, 58, 0.1)' : '#FFF5F5',
    };
  }, [isDark]);

  const getPracticeAreaText = (area: string) => {
    switch (area) {
      case 'Civil Law': return t('cases.civilCase');
      case 'Criminal Law': return t('cases.criminalCase');
      case 'Corporate Law': return t('cases.corporateLegal');
      case 'Family Law': return t('cases.divorceCase');
      case 'Property Law': return t('cases.propertyDispute');
      case 'Labour Law': return t('cases.laborDispute');
      case 'Tax Law': return t('profile.taxLaw', 'Tax Law');
      case 'Constitutional Law': return t('profile.constitutionalLaw', 'Constitutional Law');
      case 'Arbitration': return t('profile.arbitration', 'Arbitration');
      case 'IPR': return t('profile.ipr', 'IPR');
      default: return area;
    }
  };

  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const activePlan = profile?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : (profile?.subscription?.plan || 'FREE');

  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Staggered animated values for cards (increased count for more cards)
  const [animatedValues] = useState(() => Array(12).fill(0).map(() => new Animated.Value(0)));

  // Progress Bar animated value
  const animatedProgress = useRef(new Animated.Value(0)).current;

  // Form state syncing layout inputs with store
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    dob: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    country: '',
    barNumber: '',
    stateBarCouncil: '',
    enrollmentYear: '',
    enrollmentDate: '',
    practiceExperience: '',
    practiceAreas: [] as string[],
    primaryCourt: '',
    languagesKnown: '',
    officeName: '',
    officeAddress: '',
    bio: '',
    specialization: '',
    achievements: '',
    website: '',
    awards: '',
    landmarkCases: '',
    publications: '',
  });

  // Sync state with store profile
  useEffect(() => {
    if (profile) {
      const adv = profile.personalizations?.advocateProfile || {};
      const student = profile.personalizations?.studentProfile || {};
      const general = profile.personalizations?.generalProfile || {};
      const userProf = profile.personalizations?.userProfile || {};

      setForm({
        fullName: adv.fullName || student.fullName || general.fullName || userProf.fullName || profile.fullName || profile.name || '',
        phoneNumber: adv.phoneNumber || student.phoneNumber || general.phoneNumber || userProf.phoneNumber || profile.phoneNumber || profile.phone || '',
        dob: adv.dob || student.dob || general.dob || userProf.dob || profile.dob || profile.dateOfBirth || '',
        gender: adv.gender || student.gender || general.gender || userProf.gender || profile.gender || '',
        address: adv.address || student.address || general.address || userProf.address || profile.address || profile.residentialAddress || '',
        city: adv.city || student.city || general.city || userProf.city || profile.city || '',
        state: adv.state || student.state || general.state || userProf.state || profile.state || '',
        country: adv.country || student.country || general.country || userProf.country || profile.country || 'India',
        barNumber: adv.barNumber || profile.barNumber || profile.enrollmentNumber || profile.barEnrollmentNumber || student.enrollmentNumber || '',
        stateBarCouncil: adv.stateBarCouncil || profile.stateBarCouncil || profile.barCouncil || '',
        enrollmentYear: adv.enrollmentYear || profile.enrollmentYear || student.yearOfStudy || profile.yearOfStudy || '',
        enrollmentDate: adv.enrollmentDate || profile.enrollmentDate || '',
        practiceExperience: adv.practiceExperience || profile.practiceExperience || profile.experience || profile.yearsOfPractice || '',
        practiceAreas: (adv.practiceAreas && adv.practiceAreas.length > 0) ? adv.practiceAreas : ((profile.practiceAreas && profile.practiceAreas.length > 0) ? profile.practiceAreas : (student.practiceAreas || [])),
        primaryCourt: adv.primaryCourt || profile.primaryCourt || profile.court || profile.courtName || '',
        languagesKnown: adv.languagesKnown || student.languagesKnown || profile.languagesKnown || profile.languages || '',
        officeName: adv.officeName || profile.officeName || profile.chamberName || profile.lawFirmName || profile.organization || student.university || profile.university || profile.college || '',
        officeAddress: adv.officeAddress || profile.officeAddress || profile.chamberAddress || profile.firmAddress || '',
        bio: adv.bio || student.bio || general.bio || profile.bio || profile.summary || '',
        specialization: adv.specialization || student.degree || profile.specialization || profile.degree || profile.department || profile.course || '',
        achievements: adv.achievements || student.achievements || profile.achievements || profile.awards || '',
        website: adv.website || profile.website || '',
        awards: adv.awards || profile.awards || '',
        landmarkCases: adv.landmarkCases || profile.landmarkCases || '',
        publications: adv.publications || profile.publications || '',
      });
    }
  }, [profile, isEditing]);

  const [refreshing, setRefreshing] = useState(false);
  const subscription = useSubscriptionStore();

  const loadLatestProfileData = useCallback(async () => {
    try {
      const pRes = await ProfileService.getProfile();
      if (pRes && pRes.data) {
        setProfile(pRes.data);
      }
      await subscription.fetchSubscriptionStatus();
    } catch (e) {
      console.warn('[Profile] Refresh profile error:', e);
    }
  }, [setProfile]);

  useEffect(() => {
    loadLatestProfileData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLatestProfileData();
    }, [loadLatestProfileData])
  );

  // Run staggered slide/scale animations
  useEffect(() => {
    animatedValues.forEach((val) => val.setValue(0));
    Animated.stagger(
      50,
      animatedValues.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [isEditing]);

  const advocateProfileData = useMemo(() => {
    const adv = profile?.personalizations?.advocateProfile || {};
    const student = profile?.personalizations?.studentProfile || {};
    const general = profile?.personalizations?.generalProfile || {};
    const userProf = profile?.personalizations?.userProfile || {};

    return {
      fullName: form.fullName || adv.fullName || student.fullName || general.fullName || userProf.fullName || profile?.fullName || profile?.name || '',
      phoneNumber: form.phoneNumber || adv.phoneNumber || student.phoneNumber || general.phoneNumber || userProf.phoneNumber || profile?.phoneNumber || profile?.phone || '',
      dob: form.dob || adv.dob || student.dob || general.dob || userProf.dob || profile?.dob || profile?.dateOfBirth || '',
      gender: form.gender || adv.gender || student.gender || general.gender || userProf.gender || profile?.gender || '',
      address: form.address || adv.address || student.address || general.address || userProf.address || profile?.address || profile?.residentialAddress || '',
      city: form.city || adv.city || student.city || general.city || userProf.city || profile?.city || '',
      state: form.state || adv.state || student.state || general.state || userProf.state || profile?.state || '',
      country: form.country || adv.country || student.country || general.country || userProf.country || profile?.country || 'India',
      barNumber: form.barNumber || adv.barNumber || profile?.barNumber || profile?.enrollmentNumber || profile?.barEnrollmentNumber || student.enrollmentNumber || '',
      stateBarCouncil: form.stateBarCouncil || adv.stateBarCouncil || profile?.stateBarCouncil || profile?.barCouncil || '',
      enrollmentYear: form.enrollmentYear || adv.enrollmentYear || profile?.enrollmentYear || student.yearOfStudy || profile?.yearOfStudy || '',
      enrollmentDate: form.enrollmentDate || adv.enrollmentDate || profile?.enrollmentDate || '',
      practiceExperience: form.practiceExperience || adv.practiceExperience || profile?.practiceExperience || profile?.experience || profile?.yearsOfPractice || '',
      practiceAreas: (form.practiceAreas && form.practiceAreas.length > 0) ? form.practiceAreas : (adv.practiceAreas || profile?.practiceAreas || []),
      primaryCourt: form.primaryCourt || adv.primaryCourt || profile?.primaryCourt || profile?.court || profile?.courtName || '',
      languagesKnown: form.languagesKnown || adv.languagesKnown || student.languagesKnown || profile?.languagesKnown || profile?.languages || '',
      officeName: form.officeName || adv.officeName || profile?.officeName || profile?.chamberName || profile?.lawFirmName || profile?.organization || student.university || profile?.university || profile?.college || '',
      officeAddress: form.officeAddress || adv.officeAddress || profile?.officeAddress || profile?.chamberAddress || profile?.firmAddress || '',
      bio: form.bio || adv.bio || student.bio || general.bio || profile?.bio || profile?.summary || '',
      specialization: form.specialization || adv.specialization || student.degree || profile?.specialization || profile?.degree || profile?.department || profile?.course || '',
      achievements: form.achievements || adv.achievements || student.achievements || profile?.achievements || profile?.awards || '',
      avatar: profile?.avatar || '',
    };
  }, [form, profile]);

  // Compute profile completion percentage
  const profileCompletion = useMemo(() => {
    const fields = [
      advocateProfileData.fullName,
      advocateProfileData.phoneNumber,
      advocateProfileData.dob,
      advocateProfileData.gender,
      advocateProfileData.address,
      advocateProfileData.city,
      advocateProfileData.state,
      advocateProfileData.country,
      advocateProfileData.barNumber,
      advocateProfileData.stateBarCouncil,
      advocateProfileData.enrollmentYear,
      advocateProfileData.enrollmentDate,
      advocateProfileData.practiceExperience,
      advocateProfileData.practiceAreas.length > 0 ? 'yes' : '',
      advocateProfileData.primaryCourt,
      advocateProfileData.languagesKnown,
      advocateProfileData.officeName,
      advocateProfileData.officeAddress,
      advocateProfileData.bio,
      advocateProfileData.specialization,
      advocateProfileData.achievements,
      advocateProfileData.avatar ? 'yes' : '',
    ];

    const filled = fields.filter((f) => !!f && String(f).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }, [advocateProfileData]);

  // Animate the progress bar when completion percent changes
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: profileCompletion / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [profileCompletion]);

  // Checklist categories
  const checklist = useMemo(() => {
    return [
      {
        label: t('profile.personalInfo'),
        completed: !!(form.fullName && form.dob && form.gender && form.address && form.city && form.state && form.country),
      },
      {
        label: t('profile.contactDetails'),
        completed: !!(form.phoneNumber && profile?.email),
      },
      {
        label: t('profile.barCredentials'),
        completed: !!(form.barNumber && form.stateBarCouncil && form.enrollmentYear && form.enrollmentDate && form.practiceExperience && form.primaryCourt),
      },
      {
        label: t('profile.officeDetails'),
        completed: !!(form.officeName && form.officeAddress),
      },
      {
        label: t('profile.practiceAreasLabel'),
        completed: form.practiceAreas.length > 0,
      },
      {
        label: t('profile.advocateBio'),
        completed: !!(form.bio && form.specialization && form.achievements),
      },
    ];
  }, [form, profile?.email, t]);

  // Save changes handler
  const handleSave = async () => {
    if (!form.fullName.trim()) {
      showToast('error', t('profile.validationFailure'), t('profile.fullNameRequired'));
      return;
    }

    if (form.phoneNumber && !/^\+?[0-9\s-]{8,15}$/.test(form.phoneNumber)) {
      showToast('error', t('profile.validationFailure'), t('profile.invalidPhone'));
      return;
    }

    setSaving(true);
    try {
      // 1. Sync root fields on User model
      const rootUpdates: any = {
        name: form.fullName,
        fullName: form.fullName,
        phone: form.phoneNumber,
        city: form.city,
        state: form.state,
        country: form.country,
        barNumber: form.barNumber,
      };
      await ProfileService.updateProfile(rootUpdates);

      // 2. Sync Personalizations dossier objects for advocate, student & general roles
      const nextPersonalizations = {
        ...(profile?.personalizations || {}),
        advocateProfile: {
          ...form,
        },
        studentProfile: {
          ...(profile?.personalizations?.studentProfile || {}),
          ...form,
        },
        generalProfile: {
          ...(profile?.personalizations?.generalProfile || {}),
          ...form,
        },
      };

      const res = await ProfileService.updateProfile({
        // @ts-ignore
        personalizations: nextPersonalizations,
      });

      if (res.success && res.data) {
        setProfile(res.data);
        showToast('success', t('profile.updated'), t('profile.dossierSaved'));
        setIsEditing(false);
      }
    } catch (e: any) {
      console.error('[PROFILE SAVE ERROR]', e);
      showToast('error', t('profile.saveFailed'), e.message || t('profile.logoutError'));
    } finally {
      setSaving(false);
    }
  };

  // Avatar presets and upload triggers
  const handleSelectPresetAvatar = async (avatarUrl: string) => {
    setUploadingAvatar(true);
    try {
      const res = await ProfileService.updateProfile({ avatar: avatarUrl });
      if (res.success && res.data && profile) {
        setProfile({
          ...profile,
          avatar: avatarUrl,
        });
        showToast('success', t('profile.photoUpdated'), t('profile.avatarSynced'));
        setShowAvatarModal(false);
      }
    } catch (e) {
      showToast('error', t('profile.updateFailed'), t('profile.avatarSyncFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleMockUpload = () => {
    setUploadingAvatar(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        const picked = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
        handleSelectPresetAvatar(picked.url);
      }
    }, 400);
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await ProfileService.updateProfile({ avatar: '' });
      if (res.success && profile) {
        setProfile({
          ...profile,
          avatar: '',
        });
        showToast('success', t('profile.photoRemoved'), t('profile.photoCleared'));
        setShowAvatarModal(false);
      }
    } catch (e) {
      showToast('error', t('common.failed'), t('profile.deletePhotoFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePracticeArea = (area: string) => {
    if (form.practiceAreas.includes(area)) {
      setForm({ ...form, practiceAreas: form.practiceAreas.filter((a) => a !== area) });
    } else {
      setForm({ ...form, practiceAreas: [...form.practiceAreas, area] });
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const getCardStyle = (index: number) => {
    const anim = animatedValues[index] || new Animated.Value(1);
    return {
      opacity: anim,
      transform: [
        {
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
        {
          scale: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          }),
        },
      ],
    };
  };

  // Account section presses
  const handleAccountPress = (item: string) => {
    if (item === 'Settings' || item === 'Theme') {
      router.push('/settings' as any);
    } else if (item === 'Support') {
      router.push('/settings/help' as any);
    } else if (item === 'Notifications') {
      showToast('info', 'Notification Preferences', 'Notifications are managed via System Settings.');
    } else if (item === 'Privacy') {
      showToast('info', 'Privacy Shield', 'Your data is encrypted end-to-end.');
    } else if (item === 'Language') {
      showToast('info', 'Languages', 'Update language settings in the General tab.');
    } else if (item === 'Logout') {
      Alert.alert(
        t('profile.logoutConfirmTitle'),
        t('profile.logoutConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('profile.logoutConfirmTitle'),
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                router.replace('/auth/login' as any);
              } catch (e) {
                showToast('error', t('profile.logoutFailed'), t('profile.logoutError'));
              }
            },
          },
        ]
      );
    }
  };

  const renderRow = (icon: string, label: string, value: string | undefined) => {
    return (
      <View style={styles.infoRow} key={label}>
        <View style={[styles.infoRowIcon, { backgroundColor: lTheme.lightGray }]}>
          {/* @ts-ignore */}
          <Ionicons name={icon} size={14} color={lTheme.gold} />
        </View>
        <View style={styles.infoRowContent}>
          <Text style={[styles.infoRowLabel, { color: lTheme.textMuted }]}>{label}</Text>
          <Text style={[
            styles.infoRowValue,
            { color: lTheme.textPrimary },
            !value && [styles.infoRowValueEmpty, { color: lTheme.textMuted }]
          ]}>
            {value || t('common.notProvided')}
          </Text>
        </View>
      </View>
    );
  };

  const renderSecurityRow = (icon: string, label: string, value: string) => {
    return (
      <View style={styles.infoRow} key={label}>
        <View style={[styles.infoRowIcon, { backgroundColor: lTheme.lightGray }]}>
          {/* @ts-ignore */}
          <Ionicons name={icon} size={14} color={lTheme.gold} />
        </View>
        <View style={styles.infoRowContent}>
          <Text style={[styles.infoRowLabel, { color: lTheme.textMuted }]}>{label}</Text>
          <Text style={[styles.infoRowValue, { color: lTheme.textPrimary }]}>
            {value}
          </Text>
        </View>
      </View>
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (val: string) => void,
    placeholder: string,
    keyboardType: any = 'default',
    multiline: boolean = false,
    numberOfLines: number = 1
  ) => {
    return (
      <View style={styles.inputGroup} key={label}>
        <Text style={[styles.inputLabel, { color: lTheme.textMuted }]}>{label}</Text>
        <TextInput
          style={[
            styles.formInput,
            { borderColor: lTheme.border, color: lTheme.textPrimary, backgroundColor: lTheme.lightGray },
            multiline && styles.formTextArea
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={lTheme.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: lTheme.bg }]}>
      {/* 1. LUXURY HEADER */}
      <View style={[styles.customHeader, { paddingTop: Math.max(insets.top, 20) + 12, paddingBottom: 14, backgroundColor: lTheme.card, borderBottomColor: lTheme.border }]}>
        <View style={styles.headerLeft} />

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitleText, { color: lTheme.textPrimary }]} numberOfLines={1}>Profile</Text>
          <Text style={[styles.headerSubtitleText, { color: lTheme.textMuted }]} numberOfLines={1}>Manage Your Account</Text>
        </View>

        <View style={styles.headerRight}>
          {isEditing ? (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  setIsEditing(false);
                  showToast('info', t('profile.editDiscarded'), t('profile.editReverted'));
                }}
                style={styles.cancelLink}
              >
                <Text style={[styles.cancelLinkText, { color: lTheme.textSecondary }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: lTheme.blackCardBg },
                  pressed && { transform: [{ scale: 0.98 }] }
                ]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={lTheme.white} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={lTheme.gold} />
                    <Text style={[styles.saveBtnText, { color: lTheme.white }]}>{t('profile.save')}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsEditing(true)}
              style={({ pressed }) => [
                styles.editBtn, 
                { borderColor: lTheme.border, backgroundColor: lTheme.card },
                pressed && { transform: [{ scale: 0.97 }] }
              ]}
            >
              <Ionicons name="create-outline" size={14} color={lTheme.gold} style={{ marginRight: 4 }} />
              <Text style={[styles.editBtnText, { color: lTheme.textPrimary }]}>Edit Profile</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadLatestProfileData();
                  setRefreshing(false);
                }}
                tintColor={lTheme.gold}
                colors={[lTheme.gold]}
              />
            }
          >
            {/* CARD 0: Top Profile Card (Glass-style) */}
            <Animated.View style={[styles.card, getCardStyle(0), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarWrapper}>
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={[styles.avatarImg, { borderColor: lTheme.gold }]} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: lTheme.lightGray, borderColor: lTheme.gold }]}>
                      <Text style={[styles.avatarInitial, { color: lTheme.gold }]}>
                        {(form.fullName || profile?.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {isEditing && (
                    <Pressable
                      style={[styles.cameraBtn, { backgroundColor: lTheme.blackCardBg, borderColor: lTheme.card }]}
                      onPress={() => setShowAvatarModal(true)}
                    >
                      <Ionicons name="camera-outline" size={12} color={lTheme.gold} />
                    </Pressable>
                  )}
                </View>

                <View style={styles.identityCol}>
                  <Text style={[styles.fullNameText, { color: lTheme.textPrimary }]}>
                    {form.fullName || profile?.name || t('profile.title')}
                  </Text>
                  <Text style={[styles.emailText, { color: lTheme.textMuted }]}>{profile?.email || 'N/A'}</Text>

                  <View style={styles.badgesWrapper}>
                    <View style={[styles.statusBadge, { borderColor: lTheme.gold, backgroundColor: lTheme.card }]}>
                      <Text style={[styles.statusBadgeText, { color: lTheme.textPrimary }]}>
                        {form.barNumber ? '✔ VERIFIED' : 'PENDING VERIFICATION'}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { borderColor: lTheme.gold, backgroundColor: lTheme.card }]}>
                      <Text style={[styles.statusBadgeText, { color: lTheme.textPrimary }]}>
                        {activePlan === 'FREE' ? 'AI LEGAL FREE' : activePlan === 'SUPER_ADMIN' ? 'SUPER ADMIN' : activePlan}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>



              {/* Completion Progress Bar */}
              <View style={[styles.cardProgressContainer, { borderTopColor: lTheme.divider }]}>
                <View style={styles.cardProgressHeader}>
                  <Text style={[styles.cardProgressLabel, { color: lTheme.textPrimary }]}>Task Progress</Text>
                  <Text style={[styles.cardProgressValue, { color: lTheme.gold }]}>{profileCompletion}%</Text>
                </View>
                <View style={[styles.cardProgressBg, { backgroundColor: lTheme.lightGray }]}>
                  <Animated.View style={[styles.cardProgressFill, { 
                    backgroundColor: lTheme.gold,
                    width: animatedProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }]} />
                </View>
              </View>
            </Animated.View>

            {/* CARD 1: Amex-style Matte Black Membership Card */}
            {!isEditing && (
              <Pressable 
                onPress={() => router.push('/profile/billing' as any)}
                style={({ pressed }) => [
                  pressed && { opacity: 0.96 }
                ]}
              >
                <Animated.View style={[styles.membershipCard, getCardStyle(1), { backgroundColor: isDark ? 'rgba(200, 163, 77, 0.15)' : '#FCF8EF', borderColor: lTheme.gold }]}>
                  <View style={styles.membershipCardHeader}>
                    <Text style={[styles.membershipCrown, { color: lTheme.textPrimary }]}>👑 AI LEGAL™</Text>
                    <View style={[styles.membershipStatusBadge, { borderColor: lTheme.gold }]}>
                      <Text style={styles.membershipStatusText}>
                        {activePlan === 'FREE' ? 'STANDARD' : 'ACTIVE'}
                      </Text>
                    </View>
                  </View>

                  {activePlan === 'FREE' ? (
                    <View style={styles.membershipCardBody}>
                      <Text style={[styles.membershipUpgradeText, { color: lTheme.textPrimary }]}>Unlock Premium Intelligence</Text>
                      <Text style={[styles.membershipUpgradeSub, { color: lTheme.textSecondary }]}>Access elite AI toolkits and unlimited documents.</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.membershipUpgradeBtn,
                          { backgroundColor: lTheme.textPrimary },
                          pressed && { transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={() => router.push('/profile/billing' as any)}
                      >
                        <Text style={[styles.membershipUpgradeBtnText, { color: isDark ? '#111111' : '#FFFFFF' }]}>Upgrade to Pro</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.membershipCardBody}>
                      <View style={styles.membershipDetailRow}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.membershipDetailLabel, { color: lTheme.textMuted }]}>CURRENT PLAN</Text>
                          <Text style={[styles.membershipDetailVal, { color: lTheme.textPrimary }]}>
                            {(activePlan as string) === 'FREE' ? 'AI Legal™ Free' : activePlan === 'SUPER_ADMIN' ? 'Enterprise Admin' : activePlan}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.membershipDetailLabel, { color: lTheme.textMuted }]}>EXPIRES</Text>
                          <Text style={[styles.membershipDetailVal, { color: lTheme.textPrimary }]}>
                            {activePlan === 'SUPER_ADMIN' ? 'Never' : (profile?.subscription?.expiryDate
                              ? new Date(profile.subscription.expiryDate).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Never')}
                          </Text>
                        </View>
                      </View>
                      {activePlan !== 'SUPER_ADMIN' && (
                        <Pressable onPress={() => router.push('/profile/billing' as any)}>
                          <Text style={styles.manageSubscriptionLink}>Manage Subscription →</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>
              </Pressable>
            )}

            {/* STORAGE USAGE CARD */}
            {!isEditing && (() => {
              const planStr = String(profile?.subscription?.plan || activePlan || 'FREE').toUpperCase();
              const isSuperAdmin = activePlan === 'SUPER_ADMIN' || planStr === 'SUPER_ADMIN';
              
              let planLimitGB = 1;
              if (isSuperAdmin) planLimitGB = -1;
              else if (planStr.includes('ENTERPRISE') || planStr.includes('COMBO') || planStr.includes('FIRM')) planLimitGB = 500;
              else if (planStr.includes('PREMIUM')) planLimitGB = 100;
              else if (planStr.includes('PRO') || planStr.includes('PROFESSIONAL')) planLimitGB = 20;
              else if (planStr.includes('BASIC')) planLimitGB = 5;
              else if (subscription.storage?.limitGB && subscription.storage.limitGB > 1) planLimitGB = subscription.storage.limitGB;

              const usedGB = subscription.storage?.usedGB ?? 0;
              const usedText = subscription.storage?.usedMB ? `${subscription.storage.usedMB} MB` : `${usedGB} GB`;
              const isUnlimited = planLimitGB === -1;
              const limitText = isUnlimited ? 'Unlimited GB' : `${planLimitGB} GB total`;
              const remainingText = isUnlimited ? 'Unlimited' : `${Math.max(0, Number((planLimitGB - usedGB).toFixed(2)))} GB`;
              const percent = isUnlimited ? 0 : Math.min(100, Math.round((usedGB / planLimitGB) * 100));

              return (
                <Animated.View style={[styles.card, { backgroundColor: lTheme.card, borderColor: lTheme.border, marginTop: 12, padding: 16, borderRadius: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="cloud-done-outline" size={18} color={lTheme.gold} style={{ marginRight: 8 }} />
                      <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary, marginBottom: 0 }]}>Storage Usage</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: lTheme.gold }}>
                      {percent}%
                    </Text>
                  </View>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold, marginTop: 8, marginBottom: 12 }]} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: lTheme.textSecondary }}>
                      <Text style={{ color: lTheme.textPrimary, fontWeight: '800' }}>
                        {usedText}
                      </Text> used
                    </Text>
                    <Text style={{ fontSize: 13, color: lTheme.textMuted }}>
                      {limitText}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={{ height: 8, width: '100%', backgroundColor: isDark ? '#2A2A2E' : '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(100, percent)}%`,
                        backgroundColor: percent > 90 ? '#EF4444' : percent > 75 ? '#F59E0B' : lTheme.gold,
                        borderRadius: 4,
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: lTheme.textMuted }}>
                      Available: {remainingText}
                    </Text>
                    <Pressable onPress={() => router.push('/profile/billing' as any)}>
                      <Text style={{ fontSize: 11, color: lTheme.gold, fontWeight: '700' }}>Upgrade Storage →</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })()}

            {/* AI CHAT & QUOTA USAGE CARD */}
            {!isEditing && (() => {
              const planStr = String(profile?.subscription?.plan || activePlan || 'FREE').toUpperCase();
              const isSuperAdmin = activePlan === 'SUPER_ADMIN' || planStr === 'SUPER_ADMIN';

              const chatFeature = subscription.features?.ai_chat || subscription.features?.aiChat;
              const chatUsed = chatFeature?.used ?? 0;
              const chatLimit = isSuperAdmin || planStr.includes('PREMIUM') || planStr.includes('ENTERPRISE') 
                ? -1 
                : (chatFeature?.limit && chatFeature.limit > 0 ? chatFeature.limit : (planStr === 'FREE' ? 100 : 300));
              
              const isChatUnlimited = chatLimit === -1 || chatLimit >= 999999;
              const chatLimitText = isChatUnlimited ? 'Unlimited' : `${chatLimit} chats total`;
              const chatRemaining = isChatUnlimited ? -1 : Math.max(0, chatLimit - chatUsed);
              const chatRemainingText = isChatUnlimited ? 'Unlimited' : `${chatRemaining} chats`;
              const chatPercent = isChatUnlimited ? 0 : Math.min(100, Math.round((chatUsed / chatLimit) * 100));

              const casesUsed = subscription.cases?.used ?? 0;
              const casesLimit = subscription.cases?.limit ?? (planStr === 'FREE' ? 3 : 50);
              const isCasesUnlimited = casesLimit === -1 || casesLimit >= 999999;

              return (
                <Animated.View style={[styles.card, { backgroundColor: lTheme.card, borderColor: lTheme.border, marginTop: 12, padding: 16, borderRadius: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="chatbubbles-outline" size={18} color={lTheme.gold} style={{ marginRight: 8 }} />
                      <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary, marginBottom: 0 }]}>AI Chat & Quotas</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: lTheme.gold }}>
                      {isChatUnlimited ? '∞ Unlimited' : `${chatPercent}%`}
                    </Text>
                  </View>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold, marginTop: 8, marginBottom: 12 }]} />

                  {/* AI Chat Progress Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: lTheme.textSecondary }}>
                      AI Chat: <Text style={{ color: lTheme.textPrimary, fontWeight: '800' }}>{chatUsed}</Text> used
                    </Text>
                    <Text style={{ fontSize: 13, color: lTheme.textMuted }}>
                      {chatLimitText}
                    </Text>
                  </View>

                  {/* Chat Progress Bar */}
                  <View style={{ height: 8, width: '100%', backgroundColor: isDark ? '#2A2A2E' : '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <View
                      style={{
                        height: '100%',
                        width: isChatUnlimited ? '100%' : `${Math.min(100, chatPercent)}%`,
                        backgroundColor: isChatUnlimited ? lTheme.gold : (chatPercent > 90 ? '#EF4444' : chatPercent > 75 ? '#F59E0B' : lTheme.gold),
                        borderRadius: 4,
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: lTheme.textMuted }}>
                      Available: <Text style={{ color: lTheme.gold, fontWeight: '700' }}>{chatRemainingText}</Text>
                    </Text>
                    <Pressable onPress={() => router.push('/profile/billing' as any)}>
                      <Text style={{ fontSize: 11, color: lTheme.gold, fontWeight: '700' }}>Upgrade Limits →</Text>
                    </Pressable>
                  </View>

                  {/* Secondary Quotas Summary (Cases) */}
                  <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: lTheme.textSecondary }}>
                      <Ionicons name="folder-open-outline" size={14} color={lTheme.textMuted} style={{ marginRight: 4 }} />
                      Active Cases: <Text style={{ color: lTheme.textPrimary, fontWeight: '700' }}>{casesUsed} / {isCasesUnlimited ? '∞' : casesLimit}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: lTheme.textMuted }}>
                      {isCasesUnlimited ? 'Unlimited' : `${Math.max(0, casesLimit - casesUsed)} remaining`}
                    </Text>
                  </View>
                </Animated.View>
              );
            })()}



            {/* Editable Forms (Visible only during Edit Profile) */}
            {isEditing && (
              <>
                {/* CARD 3: Personal Information Input */}
                <Animated.View style={[styles.card, getCardStyle(3), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary }]}>{t('profile.personalInfo')}</Text>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold }]} />

                  <View style={styles.fieldsGroup}>
                    {renderInput(t('profile.fullName'), form.fullName, (v) => setForm({ ...form, fullName: v }), t('profile.fullNamePlaceholder'))}
                    {renderInput(t('profile.emailAddress'), profile?.email || '', () => {}, t('profile.emailPlaceholder'), 'email-address')}
                    {renderInput(t('profile.phoneNumber'), form.phoneNumber, (v) => setForm({ ...form, fullName: form.fullName, phoneNumber: v }), t('profile.phonePlaceholder'), 'phone-pad')}
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        {renderInput(t('profile.dob'), form.dob, (v) => setForm({ ...form, dob: v }), t('profile.dobPlaceholder'))}
                      </View>
                      <View style={{ flex: 1 }}>
                        {renderInput(t('profile.gender'), form.gender, (v) => setForm({ ...form, gender: v }), t('profile.genderPlaceholder'))}
                      </View>
                    </View>
                    {renderInput(t('profile.city'), form.city, (v) => setForm({ ...form, city: v }), t('profile.cityPlaceholder'))}
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        {renderInput(t('profile.state'), form.state, (v) => setForm({ ...form, state: v }), t('profile.statePlaceholder'))}
                      </View>
                      <View style={{ flex: 1 }}>
                        {renderInput(t('profile.country'), form.country, (v) => setForm({ ...form, country: v }), t('profile.countryPlaceholder'))}
                      </View>
                    </View>
                    {renderInput(t('profile.residentialAddress'), form.address, (v) => setForm({ ...form, address: v }), t('profile.addressPlaceholder'))}
                  </View>
                </Animated.View>

                {/* CARD 4: Professional Information Input */}
                <Animated.View style={[styles.card, getCardStyle(4), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary }]}>{t('profile.statistics')}</Text>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold }]} />

                  <View style={styles.fieldsGroup}>
                    {renderInput(t('profile.stateBarCouncil'), form.stateBarCouncil, (v) => setForm({ ...form, stateBarCouncil: v }), t('profile.barCouncilPlaceholder'))}
                    {renderInput(t('profile.enrollmentNumber'), form.barNumber, (v) => setForm({ ...form, barNumber: v }), t('profile.enrollmentPlaceholder'))}
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        {renderInput(t('profile.enrollmentYear'), form.enrollmentYear, (v) => setForm({ ...form, enrollmentYear: v }), t('profile.enrollmentYearPlaceholder'), 'numeric')}
                      </View>
                      <View style={{ flex: 1 }}>
                        {renderInput(t('profile.practiceExperienceYears'), form.practiceExperience, (v) => setForm({ ...form, practiceExperience: v }), t('profile.experiencePlaceholder'), 'numeric')}
                      </View>
                    </View>
                    {renderInput(t('profile.primaryCourt'), form.primaryCourt, (v) => setForm({ ...form, primaryCourt: v }), t('profile.courtPlaceholder'))}
                    {renderInput(t('profile.languagesKnown'), form.languagesKnown, (v) => setForm({ ...form, languagesKnown: v }), t('profile.languagesPlaceholder'))}
                  </View>
                </Animated.View>

                {/* CARD 5: Office & Practice Information Input */}
                <Animated.View style={[styles.card, getCardStyle(5), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary }]}>{t('settings.general')}</Text>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold }]} />

                  <View style={styles.fieldsGroup}>
                    {renderInput(t('profile.officeChamberName'), form.officeName, (v) => setForm({ ...form, officeName: v }), t('profile.officePlaceholder'))}
                    {renderInput(t('profile.chambersAddress'), form.officeAddress, (v) => setForm({ ...form, officeAddress: v }), t('profile.chambersAddressPlaceholder'))}
                    
                    {/* Practice Areas */}
                    <View style={styles.chipLabelGroup}>
                      <Text style={[styles.inputLabel, { color: lTheme.textMuted }]}>{t('profile.practiceAreasLabel')}</Text>
                      <View style={styles.chipsContainer}>
                        {PRACTICE_AREAS.map((area) => {
                          const isSelected = form.practiceAreas.includes(area);
                          return (
                            <Pressable
                              key={area}
                              style={[
                                styles.chipButton,
                                { backgroundColor: lTheme.card, borderColor: lTheme.border },
                                isSelected && { backgroundColor: lTheme.lightGray, borderColor: lTheme.gold }
                              ]}
                              onPress={() => togglePracticeArea(area)}
                            >
                              <Text style={[
                                styles.chipButtonText,
                                { color: lTheme.textSecondary },
                                isSelected && { color: lTheme.gold, fontWeight: '800' }
                              ]}>
                                {getPracticeAreaText(area)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {renderInput(t('profile.coreSpecialization'), form.specialization, (v) => setForm({ ...form, specialization: v }), t('profile.specializationPlaceholder'))}
                    {renderInput(t('profile.bioSummary'), form.bio, (v) => setForm({ ...form, bio: v }), t('profile.bioPlaceholder'), 'default', true, 4)}
                    {renderInput(t('profile.achievementsLabel'), form.achievements, (v) => setForm({ ...form, achievements: v }), t('profile.achievementsPlaceholder'), 'default', true, 3)}
                  </View>
                </Animated.View>
              </>
            )}

            {/* Display Dashboard Details Cards (Only visible when not editing) */}
            {!isEditing && (
              <>
                {/* CARD 3: Personal Information Details Card */}
                <Animated.View style={[styles.card, getCardStyle(3), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <View style={styles.cardHeaderWithToggle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="person-outline" size={16} color={lTheme.textPrimary} />
                      <Text style={[styles.sectionHeadingTitle, { color: lTheme.textPrimary }]}>{t('profile.personalInfo')}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={14} color={lTheme.gold} />
                  </View>
                  <View style={[styles.minimalRowDivider, { backgroundColor: lTheme.divider, marginVertical: 10 }]} />
                  
                  <View style={styles.infoGrid}>
                    {renderRow('person-outline', t('profile.fullName'), form.fullName)}
                    {renderRow('mail-outline', t('profile.emailAddress'), profile?.email)}
                    {renderRow('call-outline', t('profile.phoneNumber'), form.phoneNumber)}
                    {renderRow('calendar-outline', t('profile.dob'), form.dob)}
                    {renderRow('male-female-outline', t('profile.gender'), form.gender)}
                    {renderRow('business-outline', t('profile.city'), form.city)}
                    {renderRow('map-outline', t('profile.state'), form.state)}
                    {renderRow('globe-outline', t('profile.country'), form.country)}
                    {renderRow('home-outline', t('profile.residentialAddress'), form.address)}
                  </View>
                </Animated.View>

                {/* CARD 4: Professional credentials details view */}
                <Animated.View style={[styles.card, getCardStyle(4), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <View style={styles.cardHeaderWithToggle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="ribbon-outline" size={16} color={lTheme.textPrimary} />
                      <Text style={[styles.sectionHeadingTitle, { color: lTheme.textPrimary }]}>Professional Credentials</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={14} color={lTheme.gold} />
                  </View>
                  <View style={[styles.minimalRowDivider, { backgroundColor: lTheme.divider, marginVertical: 10 }]} />
                  
                  <View style={styles.infoGrid}>
                    {renderRow('ribbon-outline', t('profile.stateBarCouncil'), form.stateBarCouncil)}
                    {renderRow('card-outline', t('profile.enrollmentNumber'), form.barNumber)}
                    {renderRow('calendar-outline', t('profile.enrollmentYear'), form.enrollmentYear)}
                    {renderRow('briefcase-outline', t('profile.practiceExperience'), form.practiceExperience ? t('profile.yearsCount', { count: form.practiceExperience }) : undefined)}
                    {renderRow('library-outline', t('profile.primaryCourt'), form.primaryCourt)}
                    {renderRow('language-outline', t('profile.languagesKnown'), form.languagesKnown)}
                  </View>
                </Animated.View>



                {/* CARD 8: Completeness Checklist */}
                <Animated.View style={[styles.card, getCardStyle(8), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary }]}>{t('profile.progress')}</Text>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold }]} />
                  <Text style={[styles.checklistSubtitle, { color: lTheme.textSecondary }]}>
                    {t('profile.checklistSubtitle')}
                  </Text>
                  <View style={styles.checklistGrid}>
                    {checklist.map((item, idx) => (
                      <View key={idx} style={styles.checklistItem}>
                        <View style={styles.checklistIcon}>
                          <Ionicons
                            name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={item.completed ? lTheme.gold : lTheme.textMuted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.checklistText,
                            { color: item.completed ? lTheme.textPrimary : lTheme.textMuted }
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>

                {/* CARD 9: Account Settings Actions */}
                <Animated.View style={[styles.card, getCardStyle(9), { backgroundColor: lTheme.card, borderColor: lTheme.border }]}>
                  <Text style={[styles.luxurySectionHeading, { color: lTheme.textPrimary }]}>Account & Settings</Text>
                  <View style={[styles.goldDivider, { backgroundColor: lTheme.gold }]} />
                  
                  <View style={styles.accountList}>
                    {/* System Settings Card Item */}
                    <Pressable
                      style={({ pressed }) => [styles.accountOptionCardInline, pressed && { opacity: 0.7 }]}
                      onPress={() => handleAccountPress('Settings')}
                    >
                      <View style={styles.accountOptionLeft}>
                        <Ionicons name="settings-outline" size={16} color="#C8A34D" />
                        <Text style={[styles.accountOptionText, { color: lTheme.textPrimary }]}>{t('settings.title', 'System Settings')}</Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={14} color="#C8A34D" />
                    </Pressable>
                    <View style={[styles.minimalRowDivider, { backgroundColor: lTheme.divider }]} />

                    {/* RAG Knowledge Base for Admin Users */}
                    {(profile?.role === 'admin' || profile?.role === 'SUPER_ADMIN' || profile?.email?.toLowerCase().trim() === 'aditi@uwo24.com' || profile?.email?.toLowerCase().trim() === 'aditilakhera0@gmail.com') && (
                      <>
                        <Pressable
                          style={({ pressed }) => [styles.accountOptionCardInline, pressed && { opacity: 0.7 }]}
                          onPress={() => router.push('/settings/rag-knowledge-base')}
                        >
                          <View style={styles.accountOptionLeft}>
                            <Ionicons name="book-outline" size={16} color="#C8A34D" />
                            <Text style={[styles.accountOptionText, { color: lTheme.textPrimary }]}>{t('settings.ragKnowledgeBase', 'AI Product Guide Knowledge')}</Text>
                          </View>
                          <Ionicons name="chevron-forward-outline" size={14} color="#C8A34D" />
                        </Pressable>
                        <View style={[styles.minimalRowDivider, { backgroundColor: lTheme.divider }]} />

                        <Pressable
                          style={({ pressed }) => [styles.accountOptionCardInline, pressed && { opacity: 0.7 }]}
                          onPress={() => router.push('/settings/admin')}
                        >
                          <View style={styles.accountOptionLeft}>
                            <Ionicons name="shield-checkmark-outline" size={16} color="#C8A34D" />
                            <Text style={[styles.accountOptionText, { color: lTheme.textPrimary }]}>🛡 Admin Portal</Text>
                          </View>
                          <Ionicons name="chevron-forward-outline" size={14} color="#C8A34D" />
                        </Pressable>
                        <View style={[styles.minimalRowDivider, { backgroundColor: lTheme.divider }]} />
                      </>
                    )}

                    {/* Logout Card Item */}
                    <Pressable
                      style={({ pressed }) => [styles.accountOptionCardInline, pressed && { opacity: 0.7 }]}
                      onPress={() => handleAccountPress('Logout')}
                    >
                      <View style={styles.accountOptionLeft}>
                        <Ionicons name="log-out-outline" size={16} color={lTheme.danger} />
                        <Text style={[styles.accountOptionText, { color: lTheme.danger, fontWeight: '700' }]}>{t('settings.logout', 'Log Out')}</Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={14} color={lTheme.danger} />
                    </Pressable>
                  </View>
                </Animated.View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Preset Avatars Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: lTheme.overlay }]}>
          <Pressable style={styles.modalDismissBg} onPress={() => setShowAvatarModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: lTheme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: lTheme.border }]}>
              <Text style={[styles.modalTitle, { color: lTheme.textPrimary }]}>{t('profile.changePhoto')}</Text>
              <Pressable onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={20} color={lTheme.textSecondary} />
              </Pressable>
            </View>

            {uploadingAvatar ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator size="large" color={lTheme.gold} />
                <Text style={[styles.uploadingText, { color: lTheme.gold }]}>{t('profile.uploadingPhoto')}</Text>
              </View>
            ) : (
              <View style={{ paddingBottom: 24 }}>
                <Text style={[styles.drawerSectionTitle, { color: lTheme.textMuted }]}>{t('profile.choosePresets')}</Text>
                <View style={styles.avatarGrid}>
                  {PRESET_AVATARS.map((av, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.avatarChip}
                      onPress={() => handleSelectPresetAvatar(av.url)}
                    >
                      <Image source={{ uri: av.url }} style={[styles.gridAvatarImg, { borderColor: lTheme.gold }]} />
                      <Text style={[styles.gridAvatarLabel, { color: lTheme.textSecondary }]} numberOfLines={1}>
                        {av.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.avatarActions}>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.uploadBtn, 
                      { backgroundColor: lTheme.blackCardBg },
                      pressed && { transform: [{ scale: 0.98 }] }
                    ]} 
                    onPress={handleMockUpload}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color={lTheme.gold} />
                    <Text style={[styles.uploadBtnText, { color: lTheme.white }]}>{t('profile.uploadCustom')}</Text>
                  </Pressable>

                  {profile?.avatar ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeBtn,
                        {
                          backgroundColor: lTheme.dangerBg,
                          borderColor: lTheme.danger
                        },
                        pressed && { transform: [{ scale: 0.98 }] }
                      ]}
                      onPress={handleRemoveAvatar}
                    >
                      <Ionicons name="trash-outline" size={16} color={lTheme.danger} />
                      <Text style={[styles.removeBtnText, { color: lTheme.danger }]}>{t('profile.deletePhoto')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1.2,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1.4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  backText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitleText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelLink: {
    marginRight: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  cancelLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  identityCol: {
    flex: 1,
    justifyContent: 'center',
  },
  fullNameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  emailText: {
    fontSize: 12,
    marginTop: 2,
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  creditsSection: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditsLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  creditsValue: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  cardProgressContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  cardProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardProgressValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  luxurySectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  goldDivider: {
    height: 1.5,
    width: 40,
    marginTop: 4,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoRowIcon: {
    marginRight: 12,
    marginTop: 2,
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRowContent: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoRowValueEmpty: {
    fontStyle: 'italic',
    fontWeight: '500',
  },
  fieldsGroup: {
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  formTextArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  chipLabelGroup: {
    marginTop: 4,
    gap: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chipButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checklistSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: 6,
  },
  checklistIcon: {
    marginRight: 6,
  },
  checklistText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  accountList: {
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismissBg: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarChip: {
    width: '30%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  gridAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
  },
  gridAvatarLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  avatarActions: {
    gap: 8,
    marginTop: 10,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  uploadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  membershipCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  membershipCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membershipCrown: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  membershipStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  membershipStatusText: {
    color: '#C8A34D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  membershipCardBody: {
    marginTop: 4,
  },
  membershipUpgradeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  membershipUpgradeSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  membershipUpgradeBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  membershipUpgradeBtnText: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 11,
  },
  membershipDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  membershipDetailLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  membershipDetailVal: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  manageSubscriptionLink: {
    fontSize: 11,
    color: '#C8A34D',
    fontWeight: '800',
    textAlign: 'right',
  },
  cardHeaderWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  minimalRowDivider: {
    height: 1,
    marginVertical: 4,
  },
  usageRowsContainer: {
    gap: 8,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  usageValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  accountOptionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  accountOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accountOptionCardInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  timelineContainer: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 12,
  },
  timelineNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    minHeight: 30,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  timelineDescription: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  creditsCardRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsInfoCol: {
    flexDirection: 'column',
    gap: 2,
  },
  creditsTitleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  creditsValueText: {
    fontSize: 16,
    fontWeight: '800',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  topUpButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
});
