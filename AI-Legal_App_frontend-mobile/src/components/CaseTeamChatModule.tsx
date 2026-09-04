import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useThemeContext, useToastContext, usePermissionFlow } from '@/providers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tTool } from '@/localization/toolTranslations';
import { CaseService } from '@/services/case.service';
import { CaseWorkspace } from '@/types';
import { useUserStore } from '@/store/user';
import { getSocket } from '@/services/socket.service';

interface CaseTeamChatModuleProps {
  caseData: CaseWorkspace;
  onCaseUpdate?: () => void;
  onBack?: () => void;
}

export const CaseTeamChatModule: React.FC<CaseTeamChatModuleProps> = ({
  caseData,
  onCaseUpdate,
  onBack,
}) => {
  const { isDark } = useThemeContext();
  const { showToast } = useToastContext();
  const { requestPermissionFlow } = usePermissionFlow();
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-workspace');
        if (saved) setOutputLanguage(saved);
      } catch (e) {}
    };
    loadLang();
  }, []);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);
  const flatListRef = useRef<FlatList>(null);

  const profile = useUserStore((s) => s.profile);
  const currentUserId = String(profile?._id || profile?.id || '');

  const [chatInfo, setChatInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');

  // Attachment States
  const [selectedAttachment, setSelectedAttachment] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
    type: 'image' | 'document';
  } | null>(null);
  const [attachmentPickerVisible, setAttachmentPickerVisible] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Menu & Action States
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // AI Discussion Assistance Modal State
  const [aiDiscussionVisible, setAiDiscussionVisible] = useState(false);
  const [aiDiscussionText, setAiDiscussionText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Resolved Real Team Roster
  const resolvedRoster = useMemo(() => {
    const list: Array<{ userId: string; name: string; role: string }> = [];
    const set = new Set<string>();

    if (Array.isArray(teamMembers) && teamMembers.length > 0) {
      teamMembers.forEach((m: any) => {
        const uId = typeof m === 'object' ? String(m._id || m.id || m.userId || '') : String(m);
        const nameStr = typeof m === 'object' ? (m.fullName || m.name || 'Advocate') : 'Advocate';
        if (uId && !set.has(uId)) {
          set.add(uId);
          list.push({ userId: uId, name: nameStr, role: m.role || 'Advocate' });
        }
      });
    }

    if (Array.isArray(caseData?.teamMembers)) {
      caseData.teamMembers.forEach((m: any) => {
        const uId = typeof m === 'object' ? String(m.userId || m._id || m.id || '') : String(m);
        const nameStr = typeof m === 'object' ? (m.name || m.fullName || 'Advocate') : 'Advocate';
        if (uId && !set.has(uId)) {
          set.add(uId);
          list.push({ userId: uId, name: nameStr, role: m.role || 'Advocate' });
        }
      });
    }

    if (caseData?.ownerInfo?.userId && !set.has(String(caseData.ownerInfo.userId))) {
      set.add(String(caseData.ownerInfo.userId));
      list.push({
        userId: String(caseData.ownerInfo.userId),
        name: caseData.ownerInfo.name || 'Firm Owner',
        role: caseData.ownerInfo.role || 'Firm Owner',
      });
    }

    return list;
  }, [teamMembers, caseData]);

  // Fetch Case Chat & Messages
  const loadCaseChatData = async () => {
    try {
      setIsLoading(true);
      const chatRes = await CaseService.getCaseChat(caseData._id);
      if (chatRes.success) {
        setChatInfo(chatRes.chat);
        setTeamMembers(chatRes.chat.users || []);
      }

      const msgRes = await CaseService.getCaseChatMessages(caseData._id);
      if (msgRes.success) {
        setMessages(msgRes.messages || []);
      }
    } catch (e: any) {
      console.error('[CASE CHAT LOAD ERROR]', e);
      showToast('error', 'Chat Load Failed', e?.message || 'Could not load Case Chat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (caseData && caseData._id) {
      loadCaseChatData();
    }
  }, [caseData._id]);

  // Scroll & Position States
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 120;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsNearBottom(isBottom);
  };

  const handleContentSizeChange = () => {
    if (isNearBottom) {
      scrollToBottom(true);
    }
  };

  // Auto-scroll to latest on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isLoading]);

  // Socket.IO Realtime Listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !caseData?._id) return;

    const handleIncomingMessage = (msg: any) => {
      if (msg && (msg.chat === chatInfo?._id || msg.caseId === caseData._id || msg.chat?._id === chatInfo?._id)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id || m.id) === String(msg._id || msg.id))) return prev;
          return [...prev, msg];
        });

        if (isNearBottom) {
          scrollToBottom(true);
        }
      }
    };

    socket.on('case_chat_message', handleIncomingMessage);
    return () => {
      socket.off('case_chat_message', handleIncomingMessage);
    };
  }, [caseData?._id, chatInfo?._id, isNearBottom]);

  // Handle Attachment Selection
  const handleAttachFile = () => {
    setAttachmentPickerVisible(true);
  };

  const handlePickDocument = async () => {
    setAttachmentPickerVisible(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const ext = asset.name.split('.').pop()?.toLowerCase() || '';
        const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) || asset.mimeType?.startsWith('image/');

        if (asset.size && asset.size > 25 * 1024 * 1024) {
          showToast('error', 'File Too Large', 'Maximum attachment size is 25MB.');
          return;
        }

        setSelectedAttachment({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || (isImg ? 'image/jpeg' : 'application/pdf'),
          type: isImg ? 'image' : 'document',
        });
      }
    } catch (err) {
      showToast('error', 'Selection Error', 'Could not select document.');
    }
  };

  const handlePickPhoto = async () => {
    setAttachmentPickerVisible(false);
    try {
      const granted = await requestPermissionFlow('photos');
      if (!granted) return;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;

        if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) {
          showToast('error', 'File Too Large', 'Maximum attachment size is 25MB.');
          return;
        }

        setSelectedAttachment({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
          type: 'image',
        });
      }
    } catch (err) {
      showToast('error', 'Selection Error', 'Could not select photo.');
    }
  };

  const handleLaunchCamera = async () => {
    setAttachmentPickerVisible(false);
    try {
      const granted = await requestPermissionFlow('camera');
      if (!granted) return;

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const fileName = `capture_${Date.now()}.jpg`;
        setSelectedAttachment({
          uri: asset.uri,
          name: fileName,
          size: asset.fileSize,
          mimeType: 'image/jpeg',
          type: 'image',
        });
      }
    } catch (err) {
      showToast('error', 'Camera Error', 'Could not capture photo.');
    }
  };

  const handleOpenAttachment = async (url: string) => {
    if (!url) return;
    try {
      if (url.startsWith('https://')) {
        await WebBrowser.openBrowserAsync(url);
      } else {
        const { openExternalUrl } = await import('../utils/url-launcher');
        await openExternalUrl(url);
      }
    } catch (err) {
      showToast('error', 'Opening Failed', 'Could not open file URL.');
    }
  };

  // Handle Send Message & Upload
  const handleSendMessage = async () => {
    const hasText = inputText.trim().length > 0;
    const hasAttachment = !!selectedAttachment;

    if (!hasText && !hasAttachment) return;
    if (isSending || isUploadingAttachment) return;

    const text = inputText.trim();
    const attachmentToUpload = selectedAttachment;

    console.log('[CASE CHAT] Send pressed');
    console.log('[CASE CHAT] Text:', text);
    console.log('[CASE CHAT] Selected attachment:', attachmentToUpload);

    try {
      setIsSending(true);
      let uploadedAttachments: any[] = [];

      if (attachmentToUpload) {
        setIsUploadingAttachment(true);
        console.log('[CASE CHAT] Starting upload...');
        const uploadRes = await CaseService.uploadCaseChatAttachment(
          caseData._id,
          attachmentToUpload.uri,
          attachmentToUpload.name,
          attachmentToUpload.mimeType || 'application/octet-stream'
        );
        console.log('[CASE CHAT] Upload response:', uploadRes);

        if (uploadRes && uploadRes.success && uploadRes.attachment) {
          uploadedAttachments = [uploadRes.attachment];
        } else {
          throw new Error('File upload failed.');
        }
      }

      console.log('[CASE CHAT] Sending message payload:', { content: text, attachments: uploadedAttachments });
      const res = await CaseService.postCaseChatMessage(caseData._id, {
        content: text,
        attachments: uploadedAttachments,
        replyTo: replyingTo ? replyingTo._id : undefined,
      });
      console.log('[CASE CHAT] API response:', res);

      if (res.success && res.message) {
        // Clear input and attachment state ONLY AFTER SUCCESS
        setInputText('');
        setSelectedAttachment(null);
        setReplyingTo(null);

        setMessages((prev) => {
          if (prev.some((m) => String(m._id || m.id) === String(res.message._id || res.message.id))) return prev;
          return [...prev, res.message];
        });

        setIsNearBottom(true);
        scrollToBottom(true);
      } else {
        throw new Error((res as any).error || 'Message posting failed');
      }
    } catch (e: any) {
      console.error('[CASE CHAT ERROR]', e);
      showToast('error', 'Send Error', e.message || 'Unable to upload attachment. Please try again.');
    } finally {
      setIsSending(false);
      setIsUploadingAttachment(false);
    }
  };

  // Ask AI About This Discussion (from Overflow ⋮ Menu)
  const handleAskAiAboutDiscussion = async () => {
    setOverflowMenuVisible(false);
    setAiDiscussionVisible(true);
    setAiDiscussionText('');
    try {
      setIsAiAnalyzing(true);
      const prompt = `Summarize current team discussion for case "${caseData.name}" and outline key advocate action items based on chat history.`;
      const res = await CaseService.sendCaseChatAiCommand(caseData._id, prompt);
      if (res.success && res.message) {
        setAiDiscussionText(res.message.content || 'AI analysis completed.');
      } else {
        throw new Error('No AI summary generated');
      }
    } catch (e: any) {
      showToast('error', 'AI Analysis Failed', e?.message || 'Could not analyze chat discussion.');
      setAiDiscussionVisible(false);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleTogglePin = (msg: any) => {
    if (!msg) return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pinned: !m.pinned } : m)));
    setActionModalVisible(false);
  };

  const pinnedMessages = messages.filter((m) => m.pinned);

  const renderMessageItem = ({ item, index }: { item: any; index: number }) => {
    const senderUserId = typeof item.sender === 'object'
      ? String(item.sender?._id || item.sender?.id || item.sender?.userId || '')
      : String(item.sender || item.senderUserId || '');

    const senderName = typeof item.sender === 'object'
      ? (item.sender?.fullName || item.sender?.name || 'Member')
      : (item.senderName || 'Member');

    const senderRole = typeof item.sender === 'object' ? item.sender?.role : undefined;

    const isAi = item.isAiGenerated || item.type === 'ai_response';
    const isOwnMessage = !isAi && Boolean(
      senderUserId && currentUserId && (
        senderUserId === currentUserId ||
        senderUserId === String(profile?._id) ||
        senderUserId === String(profile?.id)
      )
    );

    const prevMsg = index > 0 ? messages[index - 1] : null;
    const prevSenderId = prevMsg
      ? (typeof prevMsg.sender === 'object' ? String(prevMsg.sender?._id || prevMsg.sender?.id || '') : String(prevMsg.sender || ''))
      : null;
    const isSameSenderAsPrev = Boolean(
      prevMsg &&
      !isAi &&
      !prevMsg.isAiGenerated &&
      prevMsg.type !== 'ai_response' &&
      prevSenderId &&
      senderUserId &&
      prevSenderId === senderUserId
    );

    const msgDateStr = item.createdAt ? new Date(item.createdAt).toDateString() : '';
    const prevMsgDateStr = prevMsg?.createdAt ? new Date(prevMsg.createdAt).toDateString() : '';
    const showDateSeparator = Boolean(msgDateStr && msgDateStr !== prevMsgDateStr);

    const dateLabel = item.createdAt ? (() => {
      const d = new Date(item.createdAt);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (d.toDateString() === today) return 'Today';
      if (d.toDateString() === yesterday) return 'Yesterday';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    })() : '';

    const timeStr = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View key={item._id || String(index)}>
        {showDateSeparator && (
          <View style={styles.dateSeparatorRow}>
            <View style={[styles.dateSeparatorLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
            <Text style={[styles.dateSeparatorText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {dateLabel}
            </Text>
            <View style={[styles.dateSeparatorLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownContainer : styles.otherContainer,
            isSameSenderAsPrev ? { marginTop: 3 } : { marginTop: 8 }
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => {
              setSelectedMessage(item);
              setActionModalVisible(true);
            }}
            style={[
              styles.messageBubble,
              isOwnMessage
                ? [
                    styles.ownBubble,
                    {
                      backgroundColor: isDark ? '#262014' : '#FFFDF2',
                      borderColor: isDark ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.4)',
                    }
                  ]
                : isAi
                ? [
                    styles.aiBubble,
                    {
                      backgroundColor: isDark ? '#2D2640' : '#EEF2FF',
                      borderColor: '#818CF8',
                    }
                  ]
                : [
                    styles.otherBubble,
                    {
                      backgroundColor: isDark ? '#1E1E24' : '#FFFFFF',
                      borderColor: isDark ? '#2D2D38' : '#E2E8F0',
                    }
                  ],
            ]}
          >
            {isAi && (
              <Text style={[styles.senderName, { color: '#6366F1', marginBottom: 2 }]}>
                ✨ AI Co-Counsel
              </Text>
            )}

            {!isOwnMessage && !isAi && !isSameSenderAsPrev && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Text style={[styles.senderName, { color: isDark ? '#F3F4F6' : '#1F2937' }]}>
                  {senderName}
                </Text>
                {!!senderRole && (
                  <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    • {senderRole}
                  </Text>
                )}
              </View>
            )}

            {item.replyToContent && (
              <View style={[styles.replyQuote, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.replyQuoteText, { color: isDark ? '#D1D5DB' : '#4B5563' }]} numberOfLines={2}>
                  "{item.replyToContent}"
                </Text>
              </View>
            )}

            {!!item.content && (
              <Text style={[styles.messageContent, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {item.content}
              </Text>
            )}

            {Array.isArray(item.attachments) && item.attachments.length > 0 && (
              <View style={{ marginTop: item.content ? 6 : 2, gap: 6 }}>
                {item.attachments.map((att: any, attIdx: number) => {
                  const ext = (att.fileType || att.name?.split('.').pop() || '').toLowerCase();
                  const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) || att.mimeType?.includes('image');

                  if (isImg) {
                    return (
                      <TouchableOpacity
                        key={attIdx}
                        activeOpacity={0.9}
                        onPress={() => setPreviewImageUrl(att.url)}
                        style={{ borderRadius: 10, overflow: 'hidden', marginVertical: 4 }}
                      >
                        <Image source={{ uri: att.url }} style={{ width: 220, height: 150, borderRadius: 10 }} resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={attIdx}
                      activeOpacity={0.8}
                      onPress={() => handleOpenAttachment(att.url)}
                      style={[
                        styles.docAttachmentBubble,
                        {
                          backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        }
                      ]}
                    >
                      <View style={styles.docBubbleIcon}>
                        <Ionicons name="document-text-outline" size={22} color="#4F46E5" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.docBubbleTitle, { color: isDark ? '#F3F4F6' : '#111827' }]} numberOfLines={1}>
                          {att.name || 'Attached File'}
                        </Text>
                        <Text style={[styles.docBubbleMeta, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          {(att.fileType || 'FILE').toUpperCase()} • {att.size || 'Attachment'}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F46E5', marginTop: 2 }}>
                          Tap to Open →
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.bubbleFooter}>
              <Text style={[styles.timeText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {timeStr}
              </Text>
              {isOwnMessage && (
                <Ionicons name="checkmark-done" size={13} color="#D4AF37" style={{ marginLeft: 3 }} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#0B0B0E' : '#F4F5F7' }]}>
        {/* TOP HEADER & TEAM ROSTER */}
        <View style={[styles.rosterCard, { backgroundColor: isDark ? '#14141C' : '#FFFFFF' }]}>
          <View style={styles.rosterHeaderRow}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={{ marginRight: 10, padding: 4 }}>
                <Ionicons name="arrow-back" size={24} color={isDark ? '#F3F4F6' : '#111827'} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.chatTitleText, { color: isDark ? '#F3F4F6' : '#111827' }]}>
                {tTool(outputLanguage, 'chat.dedicatedChat', 'Dedicated Case Chat')}
              </Text>
              <Text style={[styles.chatSubText, { color: isDark ? '#9CA3AF' : '#6B7280' }]} numberOfLines={1}>
                {caseData?.name || 'Case Workspace'} • {resolvedRoster.length} {tTool(outputLanguage, 'chat.assignedMembers', 'Assigned Members')}
              </Text>
            </View>

            {/* OVERFLOW (⋮) MENU BUTTON */}
            <TouchableOpacity style={styles.iconBtn} onPress={() => setOverflowMenuVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={isDark ? '#E5E7EB' : '#374151'} />
            </TouchableOpacity>
          </View>

          {/* Assigned Team Members Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersRow}>
            {resolvedRoster.map((member, index) => {
              const nameStr = member.name || 'Member';
              return (
                <View key={index} style={styles.memberBadge}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{nameStr.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.memberNameText, { color: isDark ? '#D1D5DB' : '#374151' }]} numberOfLines={1}>
                    {nameStr.split(' ')[0]}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* PINNED MESSAGES BANNER */}
        {pinnedMessages.length > 0 && (
          <View style={[styles.pinnedBanner, { backgroundColor: isDark ? '#2D2640' : '#EEF2FF' }]}>
            <Ionicons name="pin" size={15} color="#4F46E5" />
            <Text style={[styles.pinnedText, { color: isDark ? '#E0E7FF' : '#3730A3' }]} numberOfLines={1}>
              Pinned: "{pinnedMessages[pinnedMessages.length - 1].content}"
            </Text>
          </View>
        )}

        {/* MESSAGES STREAM */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Connecting to secure Case Chat...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(item, index) => item._id || String(index)}
            renderItem={renderMessageItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
          />
        )}

      {/* REPLY BAR BANNER */}
      {replyingTo && (
        <View style={[styles.replyingBar, { backgroundColor: isDark ? '#2D2D2D' : '#E5E7EB' }]}>
          <Text style={[styles.replyingText, { color: isDark ? '#E5E7EB' : '#111827' }]} numberOfLines={1}>
            Replying to: "{replyingTo.content}"
          </Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* SELECTED ATTACHMENT PREVIEW CARD */}
      {selectedAttachment && (
        <View style={[styles.attachmentPreviewBar, { backgroundColor: isDark ? '#252530' : '#EEF2FF', borderColor: isDark ? '#373748' : '#C7D2FE' }]}>
          {selectedAttachment.type === 'image' ? (
            <Image source={{ uri: selectedAttachment.uri }} style={styles.previewThumb} />
          ) : (
            <View style={styles.previewDocBox}>
              <Ionicons name="document-text" size={20} color="#4F46E5" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.previewFileName, { color: isDark ? '#F3F4F6' : '#1E293B' }]} numberOfLines={1}>
              {selectedAttachment.name}
            </Text>
            <Text style={[styles.previewFileSize, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
              {selectedAttachment.size ? `${(selectedAttachment.size / 1048576).toFixed(1)} MB` : 'Attached file'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedAttachment(null)} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* CLEAN BOTTOM COMPOSER BAR ([📎] [Type a message...] [➤]) */}
      <View style={[styles.inputComposerCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', paddingBottom: bottomPadding }]}>
        <TouchableOpacity style={styles.attachmentBtn} onPress={handleAttachFile} disabled={isSending || isUploadingAttachment}>
          <Ionicons name="attach-outline" size={22} color={isDark ? '#E5E7EB' : '#4F46E5'} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.chatInput,
            {
              backgroundColor: isDark ? '#2D2D2D' : '#F9FAFB',
              color: isDark ? '#FFFFFF' : '#111827',
              borderColor: isDark ? '#374151' : '#E5E7EB',
            },
          ]}
          placeholder={tTool(outputLanguage, 'chat.typePlaceholder', 'Type a message...')}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: (inputText.trim() || selectedAttachment) ? '#4F46E5' : '#9CA3AF' }
          ]}
          onPress={handleSendMessage}
          disabled={(!inputText.trim() && !selectedAttachment) || isSending || isUploadingAttachment}
        >
          {isSending || isUploadingAttachment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* ATTACHMENT OPTIONS MODAL */}
      <Modal visible={attachmentPickerVisible} transparent animationType="slide" onRequestClose={() => setAttachmentPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAttachmentPickerVisible(false)}>
          <View style={[styles.overflowMenuCard, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#111827', marginBottom: 8 }]}>Attach File</Text>

            <TouchableOpacity style={styles.overflowMenuItem} onPress={handlePickDocument}>
              <Ionicons name="document-attach-outline" size={22} color="#4F46E5" />
              <Text style={[styles.overflowMenuText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Document (PDF, DOC, TXT)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.overflowMenuItem} onPress={handlePickPhoto}>
              <Ionicons name="images-outline" size={22} color="#10B981" />
              <Text style={[styles.overflowMenuText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Photo Library</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.overflowMenuItem} onPress={handleLaunchCamera}>
              <Ionicons name="camera-outline" size={22} color="#F59E0B" />
              <Text style={[styles.overflowMenuText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FULL IMAGE PREVIEW MODAL */}
      <Modal visible={!!previewImageUrl} transparent animationType="fade" onRequestClose={() => setPreviewImageUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setPreviewImageUrl(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image source={{ uri: previewImageUrl }} style={{ width: '95%', height: '80%' }} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* OVERFLOW (⋮) MENU MODAL */}
      <Modal visible={overflowMenuVisible} transparent animationType="fade" onRequestClose={() => setOverflowMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOverflowMenuVisible(false)}>
          <View style={[styles.overflowMenuCard, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
            <TouchableOpacity style={styles.overflowMenuItem} onPress={handleAskAiAboutDiscussion}>
              <Ionicons name="sparkles" size={18} color="#C8A34D" />
              <Text style={[styles.overflowMenuText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Ask AI About This Discussion
              </Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#333333' : '#E5E7EB' }]} />

            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setOverflowMenuVisible(false);
                showToast('info', 'Pinned Messages', `${pinnedMessages.length} message(s) pinned.`);
              }}
            >
              <Ionicons name="pin-outline" size={18} color={isDark ? '#E5E7EB' : '#374151'} />
              <Text style={[styles.overflowMenuText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Pinned Messages ({pinnedMessages.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setOverflowMenuVisible(false);
                showToast('info', 'Team Roster', `${teamMembers.length} advocate(s) assigned.`);
              }}
            >
              <Ionicons name="people-outline" size={18} color={isDark ? '#E5E7EB' : '#374151'} />
              <Text style={[styles.overflowMenuText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Assigned Team Roster ({teamMembers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ASK AI DISCUSSION ANALYSIS MODAL */}
      <Modal visible={aiDiscussionVisible} transparent animationType="slide" onRequestClose={() => setAiDiscussionVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.aiModalCard, { backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
            <View style={styles.aiModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color="#C8A34D" />
                <Text style={[styles.aiModalTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  AI Case Discussion Analysis
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAiDiscussionVisible(false)}>
                <Ionicons name="close" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginVertical: 10 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {isAiAnalyzing ? (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="large" color="#C8A34D" />
                  <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 10 }}>
                    Analyzing discussion history and extracting action items...
                  </Text>
                </View>
              ) : (
                <View style={[styles.aiResponseBox, { backgroundColor: isDark ? '#262626' : '#F9FAFB' }]}>
                  <Text style={[styles.aiResponseText, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                    {aiDiscussionText}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.aiModalCloseBtn, { backgroundColor: '#C8A34D' }]}
              onPress={() => {
                Clipboard.setString(aiDiscussionText);
                showToast('success', 'Copied', 'AI analysis copied to clipboard.');
              }}
            >
              <Ionicons name="copy-outline" size={16} color="#000000" />
              <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 13 }}>Copy AI Summary</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MESSAGE ACTION MODAL */}
      <Modal visible={actionModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={[styles.actionModalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              Message Actions
            </Text>
            <Text style={[styles.modalSnippet, { color: isDark ? '#9CA3AF' : '#6B7280' }]} numberOfLines={2}>
              "{selectedMessage?.content}"
            </Text>

            <View style={{ gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}
                onPress={() => {
                  setActionModalVisible(false);
                  setReplyingTo(selectedMessage);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={18} color="#4F46E5" />
                <Text style={[styles.actionRowText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Reply to Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}
                onPress={() => handleTogglePin(selectedMessage)}
              >
                <Ionicons name="pin-outline" size={18} color="#4F46E5" />
                <Text style={[styles.actionRowText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  {selectedMessage?.pinned ? 'Unpin Message' : 'Pin Message'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6' }]}
                onPress={() => {
                  if (selectedMessage) Clipboard.setString(selectedMessage.content);
                  setActionModalVisible(false);
                  showToast('success', 'Copied', 'Message text copied.');
                }}
              >
                <Ionicons name="copy-outline" size={18} color="#4F46E5" />
                <Text style={[styles.actionRowText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Copy Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rosterCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  rosterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  iconBtn: {
    padding: 6,
  },
  membersRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  memberBadge: {
    alignItems: 'center',
    marginRight: 12,
    width: 44,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  memberNameText: {
    fontSize: 10,
    marginTop: 2,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pinnedText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  messagesScrollView: {
    flex: 1,
  },
  messageContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: '78%',
  },
  ownBubble: {
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    borderBottomLeftRadius: 3,
  },
  aiBubble: {
    borderBottomLeftRadius: 3,
    maxWidth: '85%',
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 9.5,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  replyQuote: {
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  replyQuoteText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  messageContent: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorText: {
    fontSize: 10.5,
    fontWeight: '700',
    paddingHorizontal: 10,
    textTransform: 'uppercase',
  },
  replyingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyingText: {
    fontSize: 12,
    flex: 1,
  },
  inputComposerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  attachmentBtn: {
    padding: 6,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  overflowMenuCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 4,
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  overflowMenuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  aiModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    height: '80%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiLoadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  aiResponseBox: {
    padding: 14,
    borderRadius: 12,
  },
  aiResponseText: {
    fontSize: 13,
    lineHeight: 20,
  },
  aiModalCloseBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionModalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalSnippet: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  previewThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  previewDocBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFileName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  previewFileSize: {
    fontSize: 10.5,
    marginTop: 1,
  },
  docAttachmentBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    maxWidth: 240,
  },
  docBubbleIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBubbleTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  docBubbleMeta: {
    fontSize: 10,
    marginTop: 1,
  },
});
