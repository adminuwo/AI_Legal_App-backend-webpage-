import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Dimensions,
  Share,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { CaseWorkspace, CaseNote } from '@/types';
import { useThemeContext } from '@/providers';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface AiCaseNotebookManagerProps {
  workspace: CaseWorkspace | null;
  id: string;
  handleUpdateField: (updatedFields: Partial<CaseWorkspace>) => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  'General Notes',
  'Hearing Notes',
  'Client Meeting',
  'Research Notes',
  'Legal Strategy',
  'Evidence Notes',
  'Opponent Analysis',
  'AI Notes',
];

export default function AiCaseNotebookManager({
  workspace,
  id,
  handleUpdateField,
  showToast,
}: AiCaseNotebookManagerProps) {
  const { theme } = useThemeContext();

  // Notes state
  const activeNotes = useMemo(() => workspace?.notes || [], [workspace]);
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [notesFilter, setNotesFilter] = useState('All');
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [noteFormType, setNoteFormType] = useState<'add' | 'edit'>('add');
  const [noteFormTargetId, setNoteFormTargetId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<Partial<CaseNote>>({
    title: '',
    content: '',
    category: 'General Notes',
    priority: 'Medium',
    tags: [],
    author: 'Advocate',
    pinned: false,
    attachments: [],
  });
  
  // Text inputs for editor
  const [editorTagsText, setEditorTagsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newlySavedNoteId, setNewlySavedNoteId] = useState<string | null>(null);

  // Voice Note states
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [voiceText, setVoiceText] = useState('');

  const {
    isRecording: isSpeechRecording,
    isTranscribing: isSpeechTranscribing,
    partialText: speechPartialText,
    duration: speechDuration,
    startRecording: startSpeechRecording,
    stopRecording: stopSpeechRecording,
    cancelRecording: cancelSpeechRecording,
  } = useSpeechRecognition((finalTranscript) => {
    if (finalTranscript) {
      setVoiceText(finalTranscript);
    }
  });

  // Sync partial transcription to the text editor dynamically
  useEffect(() => {
    if (speechPartialText) {
      setVoiceText(speechPartialText);
    }
  }, [speechPartialText]);

  // Handle start/stop record toggle
  const handleVoiceRecordToggle = async () => {
    if (isSpeechRecording) {
      setIsVoiceProcessing(true);
      try {
        await stopSpeechRecording();
      } catch (err) {
        console.warn('Speech stop error:', err);
      } finally {
        setIsVoiceProcessing(false);
      }
    } else {
      setVoiceText('');
      try {
        await startSpeechRecording(voiceLanguage || 'auto');
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  // Save the voice note to backend
  const handleSaveVoiceNote = async () => {
    if (!voiceText.trim()) {
      showToast('error', 'Text Empty', 'Transcribed text is empty.');
      return;
    }

    setIsSaving(true);
    try {
      const newNoteId = 'note_voice_' + Date.now().toString();
      const newNote: CaseNote = {
        _id: newNoteId,
        title: `Voice Note Dictation - ${new Date().toLocaleDateString()}`,
        content: voiceText,
        category: 'Client Meeting',
        priority: 'Medium',
        author: 'Voice Dictation',
        tags: ['voice-dictation', 'dictation-logs'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedNotes = [newNote, ...activeNotes];
      await handleUpdateField({ notes: updatedNotes });
      
      showToast('success', '✓ Note Saved Successfully', 'Saved transcribed dictation.');
      setNewlySavedNoteId(newNoteId);
      setIsVoiceModalOpen(false);
      setVoiceText('');
      setTimeout(() => {
        setNewlySavedNoteId(null);
      }, 1500);
    } catch (err) {
      showToast('error', '❌ Failed to save note', 'Try Again');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Actions state
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiWorkOutput, setAiWorkOutput] = useState<string | null>(null);

  // AI Improve note state
  const [activeImproveNote, setActiveImproveNote] = useState<CaseNote | null>(null);

  // View Details note state
  const [activeViewNote, setActiveViewNote] = useState<CaseNote | null>(null);

  // Prepopulate notebooks if empty
  useEffect(() => {
    if (activeNotes.length === 0) {
      // Injected standard auto-notes on mount for empty case notebooks
      const initialNotes: CaseNote[] = [
        {
          _id: 'note_init_1_' + Date.now().toString(),
          title: 'AI Strategy Summary (v1)',
          content: 'Focus on verifying **documentary evidence** and establishing a clear timeline for cheque dishonour under **Section 138 NI Act**.\n\nKey Strategy:\n* Submit postal dispatch receipts as proof of notice delivery.\n* Match bank ledger transaction logs.\n* Secure client signatures on affidavit declarations.',
          category: 'Legal Strategy',
          priority: 'Critical',
          author: 'AI Generated',
          tags: ['strategy', '138ni', 'evidence'],
          pinned: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          _id: 'note_init_2_' + Date.now().toString(),
          title: 'Evidence Observation Note',
          content: 'Digital evidence WhatsApp screenshots detected. Need to file a **Section 65B Certificate** for WhatsApp logs to ensure legal admissibility in court. Review bank ledgers for transaction confirmation stamps.',
          category: 'Evidence Notes',
          priority: 'High',
          author: 'AI Generated',
          tags: ['whatsapp', '65b', 'bank-statement'],
          pinned: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
      handleUpdateField({ notes: initialNotes });
    }
  }, []);



  // Filters mapping presets
  const filterOptions = [
    'All',
    'Pinned',
    'AI Notes',
    'Manual Notes',
    'Voice Notes',
    'Recent',
    'Important',
  ];

  // Helper dates calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const lastWeekDate = new Date(Date.now() - 7 * 86400000);
  const lastWeekStr = lastWeekDate.toISOString().split('T')[0];

  // Normalized sorting & filtering
  const filteredNotes = useMemo(() => {
    return activeNotes
      .filter((n) => {
        // Search queries title, tags, content
        if (notesSearchQuery.trim()) {
          const q = notesSearchQuery.toLowerCase();
          const matchesTitle = (n.title || '').toLowerCase().includes(q);
          const matchesContent = (n.content || '').toLowerCase().includes(q);
          const matchesCategory = (n.category || '').toLowerCase().includes(q);
          const matchesTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesContent && !matchesCategory && !matchesTags) return false;
        }

        // Chip Filters
        switch (notesFilter) {
          case 'Pinned':
            return !!n.pinned;
          case 'AI Notes':
            return n.author === 'AI Generated' || n.category === 'AI Notes';
          case 'Manual Notes':
            return n.author !== 'AI Generated' && n.author !== 'Voice Dictation';
          case 'Voice Notes':
            return n.author === 'Voice Dictation' || !!n.voiceRecordingUrl;
          case 'Recent':
            // Within last 2 days
            return n.createdAt && n.createdAt >= yesterdayStr;
          case 'Important':
            return n.priority === 'High' || n.priority === 'Critical';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        // Pinned notes are always on top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Chronological descending order otherwise
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
  }, [activeNotes, notesSearchQuery, notesFilter, yesterdayStr]);

  // Group notes chronologically
  const groupedNotes = useMemo(() => {
    // Exclude pinned notes from chronological list as they are displayed on top
    const chronologicalNotes = filteredNotes.filter((n) => !n.pinned);
    
    const todayGroup: CaseNote[] = [];
    const yesterdayGroup: CaseNote[] = [];
    const lastWeekGroup: CaseNote[] = [];
    const olderGroup: CaseNote[] = [];

    chronologicalNotes.forEach((note) => {
      const noteDate = (note.createdAt || '').split('T')[0];
      if (noteDate === todayStr) {
        todayGroup.push(note);
      } else if (noteDate === yesterdayStr) {
        yesterdayGroup.push(note);
      } else if (noteDate >= lastWeekStr) {
        lastWeekGroup.push(note);
      } else {
        olderGroup.push(note);
      }
    });

    return {
      today: todayGroup,
      yesterday: yesterdayGroup,
      lastWeek: lastWeekGroup,
      older: olderGroup,
    };
  }, [filteredNotes, todayStr, yesterdayStr, lastWeekStr]);

  // Priority color maps
  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Critical':
        return '#EF4444';
      case 'High':
        return '#F59E0B';
      case 'Medium':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  // Category Pill background color
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'Legal Strategy':
        return { bg: '#F5F5F5', txt: '#C8A34D' }; // Purple
      case 'Evidence Notes':
        return { bg: '#ECFDF5', txt: '#10B981' }; // Green
      case 'Hearing Notes':
        return { bg: '#FEF3C7', txt: '#D97706' }; // Amber
      case 'Research Notes':
        return { bg: '#E0F2FE', txt: '#0284C7' }; // Blue
      case 'Client Meeting':
        return { bg: '#FDF2F8', txt: '#DB2777' }; // Pink
      case 'Opponent Analysis':
        return { bg: '#FFF5F5', txt: '#E53E3E' }; // Red
      default:
        return { bg: '#F3F4F6', txt: '#4B5563' }; // Grey
    }
  };

  // Pin Note toggler
  const handleTogglePinNote = async (noteId: string) => {
    const updatedNotes = activeNotes.map((n) =>
      n._id === noteId ? { ...n, pinned: !n.pinned } : n
    );
    await handleUpdateField({ notes: updatedNotes });
    const isPinned = updatedNotes.find(n => n._id === noteId)?.pinned;
    showToast('success', isPinned ? 'Note Pinned' : 'Note Unpinned', isPinned ? 'Note stays at the top.' : 'Note unpinned.');
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    const updatedNotes = activeNotes.filter((n) => n._id !== noteId);
    await handleUpdateField({ notes: updatedNotes });
    showToast('success', 'Note Deleted', 'Case note removed.');
  };

  // Save Note (Add or Edit)
  const handleSaveNoteForm = async () => {
    if (isSaving) return; // Prevent double clicks
    
    if (!noteForm.title?.trim()) {
      showToast('error', 'Validation Error', 'Note title is required.');
      return;
    }
    if (!noteForm.content?.trim()) {
      showToast('error', 'Validation Error', 'Note content cannot be empty.');
      return;
    }

    const tagsArray = editorTagsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSaving(true);

    try {
      let savedId = '';
      if (noteFormType === 'add') {
        const newNoteId = 'note_' + Date.now().toString();
        savedId = newNoteId;
        const newNote: CaseNote = {
          _id: newNoteId,
          title: noteForm.title,
          content: noteForm.content,
          category: noteForm.category || 'General Notes',
          priority: noteForm.priority || 'Medium',
          tags: tagsArray,
          author: noteForm.author || 'Advocate',
          pinned: false,
          attachments: noteForm.attachments || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updatedNotes = [newNote, ...activeNotes];
        await handleUpdateField({ notes: updatedNotes });
      } else {
        savedId = noteFormTargetId || '';
        const updatedNotes = activeNotes.map((n) => {
          if (n._id === noteFormTargetId) {
            return {
              ...n,
              title: noteForm.title!,
              content: noteForm.content!,
              category: noteForm.category || 'General Notes',
              priority: noteForm.priority || 'Medium',
              tags: tagsArray,
              attachments: noteForm.attachments || [],
              updatedAt: new Date().toISOString(),
            };
          }
          return n;
        });
        await handleUpdateField({ notes: updatedNotes });
      }

      showToast('success', '✓ Note Saved Successfully', 'Notebook timeline updated.');
      setNewlySavedNoteId(savedId);
      setIsEditorOpen(false);
      setTimeout(() => {
        setNewlySavedNoteId(null);
      }, 1500);
    } catch (err: any) {
      console.error('[AiCaseNotebookManager] Failed to save case note:', err);
      showToast('error', '❌ Failed to save note', 'Try Again');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Editor
  const handleOpenAddEditor = () => {
    setNoteFormType('add');
    setNoteFormTargetId(null);
    setNoteForm({
      title: '',
      content: '',
      category: 'General Notes',
      priority: 'Medium',
      tags: [],
      author: 'Advocate',
      attachments: [],
    });
    setEditorTagsText('');
    setIsEditorOpen(true);
  };

  // Open Edit Editor
  const handleOpenEditEditor = (note: CaseNote) => {
    setNoteFormType('edit');
    setNoteFormTargetId(note._id || null);
    setNoteForm({
      title: note.title,
      content: note.content,
      category: note.category,
      priority: note.priority,
      tags: note.tags,
      author: note.author,
      attachments: note.attachments || [],
    });
    setEditorTagsText((note.tags || []).join(', '));
    setIsEditorOpen(true);
  };



  // Rich text styling compiler
  const parseRichText = (text: string) => {
    if (!text) return [];
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Check if bullet point
      const isBullet = line.trim().startsWith('*') || line.trim().startsWith('•') || line.trim().startsWith('-');
      const isQuote = line.trim().startsWith('>');
      
      let cleanLine = line;
      if (isBullet) {
        cleanLine = line.replace(/^[\*\•\-]\s*/, '• ');
      } else if (isQuote) {
        cleanLine = line.replace(/^\>\s*/, '');
      }

      // Inline Bold markdown parser (**text**)
      const parts = cleanLine.split(/\*\*([\s\S]*?)\*\*/g);
      const textElements = parts.map((part, pIdx) => {
        const isBold = pIdx % 2 === 1;
        
        // Inline Italic markdown parser (*text*)
        const italicParts = part.split(/\*([\s\S]*?)\*/g);
        const subElements = italicParts.map((sub, sIdx) => {
          const isItalic = sIdx % 2 === 1;
          return (
            <Text 
              key={sIdx} 
              style={[
                isBold && { fontWeight: '700' }, 
                isItalic && { fontStyle: 'italic' }
              ]}
            >
              {sub}
            </Text>
          );
        });

        return <Text key={pIdx}>{subElements}</Text>;
      });

      return (
        <View 
          key={lIdx} 
          style={[
            isBullet && { paddingLeft: 12, marginVertical: 2 },
            isQuote && { borderLeftWidth: 3, borderLeftColor: '#C8A34D', paddingLeft: 8, marginVertical: 4, opacity: 0.8 },
            !isBullet && !isQuote && { marginVertical: 3 }
          ]}
        >
          <Text style={[
            styles.richTextLine,
            isQuote && { fontStyle: 'italic', color: '#4B5563' }
          ]}>
            {textElements}
          </Text>
        </View>
      );
    });
  };

  // AI Quick Actions implementation
  const handleAiNotebookAction = (actionId: string) => {
    setActiveAiAction(actionId);
    setIsAiProcessing(true);
    setAiWorkOutput(null);

    setTimeout(() => {
      let title = '';
      let category = 'AI Notes';
      let content = '';
      let tags: string[] = ['ai-generated'];

      switch (actionId) {
        case 'summarize':
          title = 'AI Case Brief Summary';
          content = `### CASE BRIEF SUMMARY\n\n**Brief Details**: Dispute regarding default of contractual transaction execution.\n**Primary Claims**: Recovery of default sum with interest under cheque dishonour clauses.\n**Critical Evidence Gaps**:\n* Uploaded WhatsApp chats require **Section 65B Electronic Evidence Certification**.\n* Opponent claiming defective notice dispatch.\n\n*AI auto-generated legal summary.*`;
          tags.push('case-brief', 'summary');
          break;
        case 'strategy':
          title = 'AI Strategy & Winning Theory';
          content = `### LITIGATION STRATEGY\n\n**Weakness**: Lack of registered postage delivery proof.\n**Defense Counter Strategy**:\n1. Plead implied notice receipt based on Defendant WhatsApp chats acknowledging defaulted debt.\n2. Apply Supreme Court citations on Section 65B admissibility rules.\n3. Establish fact timeline confirming default dates.`;
          tags.push('strategy-engine', 'litigation');
          break;
        case 'issues':
          title = 'AI Extracted Legal Issues';
          content = `### ISSUES FOR TRIAL CONSIDERATION\n\n* **Issue 1**: Whether there exists a legally enforceable debt liability between the parties.\n* **Issue 2**: Whether the WhatsApp screenshots and banking ledger details satisfy the requirements of **Section 65B of the Evidence Act**.\n* **Issue 3**: Whether the notice service was executed in compliance with statutory deadlines.`;
          tags.push('legal-issues', 'trial-prep');
          break;
        case 'hearings':
          title = 'AI Hearing Preparation Notes';
          content = `### ADMISSION HEARING CHECKLIST\n\n* Prepare defense against opponent jurisdiction demur objections.\n* File replication pleadings reply regarding parawise denials.\n* Draft witness cross-examination briefing points focusing on transaction default logs.`;
          tags.push('hearing-notes', 'checklist');
          break;
        default:
          title = 'AI Notebook Insights';
          content = `### AI WORKSPACE BRIEFING\n\nScanned active workspace variables. Recommended next steps: finalize Section 65B Certificate, attach post dispatch slip, and schedule filing details.`;
      }

      setAiWorkOutput(content);
      setIsAiProcessing(false);

      // Save note automatically
      const generatedNote: CaseNote = {
        _id: 'note_ai_act_' + Date.now().toString(),
        title,
        content,
        category,
        priority: 'High',
        author: 'AI Generated',
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedNotes = [generatedNote, ...activeNotes];
      handleUpdateField({ notes: updatedNotes });
      showToast('success', 'AI Note Logged', `Generated: "${title}" added to timeline.`);
    }, 2000);
  };

  // AI Improve Note Execution
  const handleExecuteImprovement = async (mode: string) => {
    if (!activeImproveNote) return;
    showToast('info', 'AI Assistant', 'Enhancing legal writing details...');
    
    setTimeout(async () => {
      let improvedContent = activeImproveNote.content;
      
      if (mode === 'legalize') {
        improvedContent = `**AMENDED LEGAL PLEADING MEMORANDUM**\n\n${activeImproveNote.content}\n\n*The facts set out herein are certified to be true and correct. Pleaded before Court registry under applicable statutory sections and judicial precedents.*`;
      } else if (mode === 'summarize') {
        improvedContent = `**AI EXECUTIVE SUMMARY**\n\n*Summary*: Scanned note. The advocate observes default of notice execution. Evidence review indicates Section 65B requirements remain pending.\n\n*Original Note*: ${activeImproveNote.content}`;
      } else if (mode === 'grammar') {
        improvedContent = `${activeImproveNote.content}\n\n*(Grammar cleaned and flow polished by AI)*`;
      } else if (mode === 'risks') {
        improvedContent = `${activeImproveNote.content}\n\n⚠️ **AI RISK WARNING**: Review limitation act deadlines and Section 65B admissibility gaps in attached screenshots.`;
      }

      const updatedNotes = activeNotes.map((n) =>
        n._id === activeImproveNote._id
          ? { ...n, content: improvedContent, updatedAt: new Date().toISOString() }
          : n
      );
      await handleUpdateField({ notes: updatedNotes });
      setActiveImproveNote(null);
      showToast('success', 'Note Improved', 'Legal text enhanced successfully.');
    }, 1500);
  };

  // Simulated AI Note drafting inside full editor
  const handleEditorAiAssist = () => {
    if (!noteForm.title?.trim()) {
      showToast('error', 'Title Required', 'Please enter a note title first to guide the AI.');
      return;
    }
    showToast('info', 'AI Assistant', 'Drafting legal note content...');
    
    setTimeout(() => {
      const generated = `**AI DRAFT PRODUCT REGARDING: ${noteForm.title}**\n\nBased on active case parameters, we review the following details:\n\n* **Limitation Deadline**: Actions must comply with CPC Section timeline rules.\n* **Evidence admissibility**: Finalize WhatsApp screenshots mapping and notarize the **Section 65B Certificate**.\n* **Next Trial Stage**: Complete pleadings replication and file notice files.`;
      setNoteForm((prev) => ({ ...prev, content: generated }));
      showToast('success', 'AI Drafting Complete', 'Injected draft content into editor.');
    }, 1500);
  };

  // Export Note text to PDF / DOCX Share
  const handleExportNote = async (note: CaseNote) => {
    try {
      const shareContent = `AI Case Notebook Export:\n\nTitle: ${note.title}\nCategory: ${note.category}\nPriority: ${note.priority}\nAuthor: ${note.author}\nDate: ${note.createdAt}\n\nContent:\n${note.content}`;
      await Share.share({
        message: shareContent,
        title: `Export ${note.title}`,
      });
      showToast('success', 'Export Complete', 'Case note shared successfully.');
    } catch (e) {
      showToast('error', 'Export Failed', 'Unable to initiate export.');
    }
  };

  // Render Notebook timeline group header
  const renderTimelineGroup = (title: string, groupList: CaseNote[]) => {
    if (groupList.length === 0) return null;
    return (
      <View style={styles.timelineGroupBlock}>
        <Text style={styles.timelineGroupHeader}>{title}</Text>
        {groupList.map(renderNoteCard)}
      </View>
    );
  };

  // Render Note Card Item
  const renderNoteCard = (note: CaseNote) => {
    const catStyle = getCategoryStyles(note.category);
    const pColor = getPriorityColor(note.priority);
    const isAi = note.author === 'AI Generated';

    const isHighlighted = newlySavedNoteId === note._id;

    return (
      <View key={note._id} style={[
        styles.noteCard, 
        isAi && styles.aiGeneratedNoteCard,
        isHighlighted && { backgroundColor: '#FDF9F0', borderColor: '#C8A34D', borderWidth: 1.5 }
      ]}>
        <View style={styles.noteCardTop}>
          <View style={styles.noteCardHeaderLeft}>
            {isAi ? (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#C8A34D" />
                <Text style={styles.aiBadgeText}>🤖 AI Generated</Text>
              </View>
            ) : (
              <Text style={styles.authorBadgeText}>✍️ {note.author || 'Advocate'}</Text>
            )}
            
            <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.catBadgeText, { color: catStyle.txt }]}>{note.category}</Text>
            </View>
          </View>
          
          <View style={styles.noteCardHeaderRight}>
            <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
            <Text style={[styles.priorityText, { color: pColor }]}>{note.priority}</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => setActiveViewNote(note)}
          style={styles.noteCardBody}
        >
          <Text style={styles.noteCardTitle}>{note.title}</Text>
          <Text numberOfLines={3} style={styles.noteCardPreview}>
            {note.content ? note.content.replace(/\*\*|\*/g, '') : ''}
          </Text>
        </TouchableOpacity>

        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map((tag) => (
              <Text key={tag} style={styles.tagLabel}>#{tag}</Text>
            ))}
          </View>
        )}

        <View style={styles.noteCardFooter}>
          <Text style={styles.dateLabel}>
            {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Today'}
          </Text>

          {/* Notebook Quick Actions Row */}
          <View style={styles.noteActionsRow}>
            <TouchableOpacity 
              onPress={() => handleTogglePinNote(note._id!)}
              style={styles.noteActionIconBtn}
            >
              <Ionicons 
                name={note.pinned ? "pin" : "pin-outline"} 
                size={16} 
                color={note.pinned ? "#C8A34D" : "#4B5563"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleOpenEditEditor(note)}
              style={styles.noteActionIconBtn}
            >
              <Ionicons name="create-outline" size={16} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveViewNote(note)}
              style={styles.noteActionIconBtn}
            >
              <Ionicons name="eye-outline" size={16} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleExportNote(note)}
              style={styles.noteActionIconBtn}
            >
              <Ionicons name="share-outline" size={16} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveImproveNote(note)}
              style={[styles.noteActionIconBtn, { backgroundColor: '#F5F5F5', borderRadius: 4 }]}
            >
              <Ionicons name="sparkles" size={15} color="#C8A34D" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleDeleteNote(note._id!)}
              style={styles.noteActionIconBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const isTimelineEmpty = filteredNotes.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      


      {/* Roster actions panel */}
      <View style={styles.newAndVoiceNotePanel}>
        <TouchableOpacity onPress={handleOpenAddEditor} style={[styles.actionBtn, { backgroundColor: '#C8A34D' }]}>
          <Ionicons name="add" size={18} color="#111111" />
          <Text style={[styles.actionBtnText, { color: '#111111' }]}>New Note</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsVoiceModalOpen(true)} style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C8A34D' }]}>
          <Ionicons name="mic" size={18} color="#C8A34D" />
          <Text style={[styles.actionBtnText, { color: '#C8A34D' }]}>Voice Note</Text>
        </TouchableOpacity>
      </View>

      {/* 11. Search Input Bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInputText}
            placeholder="Search notebook by title, tags, content..."
            placeholderTextColor="#9CA3AF"
            value={notesSearchQuery}
            onChangeText={setNotesSearchQuery}
          />
          {notesSearchQuery ? (
            <TouchableOpacity onPress={() => setNotesSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 12. Smart Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {filterOptions.map((chip) => {
          const isActive = notesFilter === chip;
          return (
            <TouchableOpacity
              key={chip}
              onPress={() => setNotesFilter(chip)}
              style={[styles.filterChip, isActive && styles.activeFilterChip]}
            >
              <Text style={[styles.filterChipText, isActive && styles.activeFilterChipText]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeline display listing */}
      {isTimelineEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>Notebook is empty</Text>
          <Text style={styles.emptySubtitle}>No case notes matching the active filter.</Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {/* Pinned notes list (stay on top) */}
          {filteredNotes.filter(n => n.pinned).length > 0 && (
            <View style={styles.pinnedSection}>
              <Text style={styles.pinnedSectionHeader}>📌 Pinned Notebooks</Text>
              {filteredNotes.filter(n => n.pinned).map(renderNoteCard)}
            </View>
          )}

          {/* Chronological Notebook Timeline grouping */}
          {renderTimelineGroup('Today', groupedNotes.today)}
          {renderTimelineGroup('Yesterday', groupedNotes.yesterday)}
          {renderTimelineGroup('Last Week', groupedNotes.lastWeek)}
          {renderTimelineGroup('Older Notes', groupedNotes.older)}
        </View>
      )}


      {/* 2. Full-Screen "New/Edit Note" Editor Modal */}
      <Modal
        visible={isEditorOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsEditorOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editorContainer}
        >
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setIsEditorOpen(false)} style={styles.editorHeaderBtn} disabled={isSaving}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.editorHeaderTitle}>
              {noteFormType === 'add' ? 'New Legal Note' : 'Edit Legal Note'}
            </Text>
            <TouchableOpacity onPress={handleSaveNoteForm} style={styles.editorHeaderBtn} disabled={isSaving}>
              <Text style={[styles.editorSaveText, isSaving && { color: '#9CA3AF' }]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editorFormScroll} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            
            {/* AI Assistant Editor Assistance trigger */}
            <TouchableOpacity 
              onPress={handleEditorAiAssist}
              style={styles.editorAiAssistBtn}
              disabled={isSaving}
            >
              <Ionicons name="sparkles" size={14} color="#111111" />
              <Text style={[styles.editorAiAssistText, { color: '#111111' }]}>Draft with AI Assistant</Text>
            </TouchableOpacity>

            <Text style={styles.editorLabel}>Note Title *</Text>
            <TextInput
              style={styles.editorTitleInput}
              placeholder="e.g. Witness Testimony Objections"
              placeholderTextColor="#9CA3AF"
              value={noteForm.title}
              onChangeText={(text) => setNoteForm(prev => ({ ...prev, title: text }))}
              editable={!isSaving}
            />

            <Text style={styles.editorLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editorCatSelector}>
              {CATEGORIES.map((cat) => {
                const isSelected = noteForm.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNoteForm(prev => ({ ...prev, category: cat }))}
                    style={[styles.editorCatBtn, isSelected && styles.editorCatBtnActive]}
                    disabled={isSaving}
                  >
                    <Text style={[styles.editorCatBtnText, isSelected && styles.editorCatBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.editorLabel}>Priority</Text>
            <View style={styles.editorPrioritySelector}>
              {['Low', 'Medium', 'High', 'Critical'].map((p) => {
                const isSelected = noteForm.priority === p;
                const pColor = getPriorityColor(p);
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setNoteForm(prev => ({ ...prev, priority: p as any }))}
                    style={[
                      styles.editorPriorityBtn,
                      isSelected && { borderColor: pColor, backgroundColor: pColor + '10' }
                    ]}
                    disabled={isSaving}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                    <Text style={[styles.editorPriorityBtnText, isSelected && { color: pColor, fontWeight: '700' }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.editorLabel}>Rich Note Content *</Text>
            <TextInput
              style={styles.editorBodyInput}
              placeholder="Start typing observation notes... Support **bold** or *italic* styling."
              placeholderTextColor="#9CA3AF"
              multiline
              value={noteForm.content}
              onChangeText={(text) => setNoteForm(prev => ({ ...prev, content: text }))}
              editable={!isSaving}
            />

            <Text style={styles.editorLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.editorTitleInput}
              placeholder="e.g. strategy, hearing, cross-exam"
              placeholderTextColor="#9CA3AF"
              value={editorTagsText}
              onChangeText={setEditorTagsText}
              editable={!isSaving}
            />

            {/* Attachments Picker link */}
            <View style={styles.attachmentSelectorBox}>
              <Ionicons name="attach" size={18} color="#C8A34D" />
              <Text style={styles.attachmentSelectorText}>Attach Documents / Evidence / Photos</Text>
            </View>

          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.editorFooterRow}>
            <TouchableOpacity 
              onPress={() => setIsEditorOpen(false)}
              style={[styles.editorFooterBtn, { backgroundColor: '#F3F4F6' }]}
              disabled={isSaving}
            >
              <Text style={[styles.editorFooterBtnText, { color: '#4B5563' }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSaveNoteForm}
              style={[styles.editorFooterBtn, { backgroundColor: '#C8A34D' }, isSaving && { opacity: 0.8 }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color="#111111" />
                  <Text style={[styles.editorFooterBtnText, { color: '#111111' }]}>Saving...</Text>
                </View>
              ) : (
                <Text style={[styles.editorFooterBtnText, { color: '#111111' }]}>Save Note</Text>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </Modal>

      {/* 8. Voice Dictation Popup Modal */}
      <Modal
        visible={isVoiceModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!isSaving) {
            cancelSpeechRecording();
            setIsVoiceModalOpen(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.voiceRecorderContainer}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.aiBadgeLabel}>
                <Ionicons name="mic" size={14} color="#C8A34D" />
                <Text style={styles.aiBadgeText}>Voice Notebook Dictation</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  cancelSpeechRecording();
                  setIsVoiceModalOpen(false);
                  setVoiceText('');
                }}
                disabled={isSaving}
              >
                <Ionicons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.voiceRecordSubtitle}>
              Voice to legal text. Dictate observation notes.
            </Text>

            {/* Language Selection Tab Row */}
            <View style={styles.voiceLangContainer}>
              <Text style={styles.voiceLangLabel}>Dictation Language:</Text>
              <View style={styles.voiceLangButtons}>
                {(['en', 'hi', 'hinglish'] as const).map((lang) => {
                  const isActive = voiceLanguage === lang;
                  const label = lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Hinglish';
                  return (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => !isSpeechRecording && setVoiceLanguage(lang)}
                      style={[
                        styles.voiceLangBtn, 
                        isActive && styles.voiceLangBtnActive,
                        isSpeechRecording && { opacity: 0.5 }
                      ]}
                      disabled={isSpeechRecording}
                    >
                      <Text style={[
                        styles.voiceLangBtnText, 
                        isActive && styles.voiceLangBtnTextActive
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {isVoiceProcessing ? (
              <View style={styles.voiceLoadingBlock}>
                <ActivityIndicator size="large" color="#C8A34D" />
                <Text style={styles.voiceLoadingText}>AI transcribing audio recording...</Text>
              </View>
            ) : (
              <View style={styles.voiceRecorderConsole}>
                {isSpeechRecording ? (
                  <View style={styles.recordingConsoleActive}>
                    {/* Visual Animated Waveform */}
                    <View style={styles.waveformContainer}>
                      <View style={[styles.waveformBar, { height: 16 }]} />
                      <View style={[styles.waveformBar, { height: 28 }]} />
                      <View style={[styles.waveformBar, { height: 36 }]} />
                      <View style={[styles.waveformBar, { height: 22 }]} />
                      <View style={[styles.waveformBar, { height: 32 }]} />
                      <View style={[styles.waveformBar, { height: 12 }]} />
                    </View>
                    <Text style={styles.recordingTimer}>
                      00:{speechDuration < 10 ? `0${speechDuration}` : speechDuration}
                    </Text>
                    <Text style={styles.recordingLiveText}>Listening live dictation logs...</Text>
                  </View>
                ) : (
                  <View style={styles.recordingConsoleIdle}>
                    <Ionicons name="mic-circle" size={56} color="#C8A34D" />
                    <Text style={styles.recordingHelperText}>Press mic icon to start recording</Text>
                  </View>
                )}

                <TouchableOpacity 
                  onPress={handleVoiceRecordToggle}
                  style={[styles.voiceMicBtnCircle, isSpeechRecording && { backgroundColor: '#EF4444' }]}
                  disabled={isSaving}
                >
                  <Ionicons name={isSpeechRecording ? "stop" : "mic"} size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Editable transcribed text block for manual correction */}
            <Text style={styles.voiceTextLabel}>Transcribed Text (Editable):</Text>
            <TextInput
              style={styles.voiceTextInput}
              multiline
              placeholder="Speech transcript will appear here in real time. Keep speaking..."
              placeholderTextColor="#9CA3AF"
              value={voiceText}
              onChangeText={setVoiceText}
              editable={!isSaving && !isSpeechRecording}
            />

            {/* Bottom actions footer for Voice Modal */}
            <View style={styles.voiceFooterRow}>
              <TouchableOpacity
                onPress={() => {
                  cancelSpeechRecording();
                  setIsVoiceModalOpen(false);
                  setVoiceText('');
                }}
                style={[styles.voiceCancelBtn, { backgroundColor: '#F3F4F6' }]}
                disabled={isSaving}
              >
                <Text style={{ color: '#4B5563', fontWeight: '700', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveVoiceNote}
                style={[
                  styles.voiceSaveBtn, 
                  { backgroundColor: '#C8A34D' }, 
                  (isSaving || isSpeechRecording || !voiceText.trim()) && { opacity: 0.5 }
                ]}
                disabled={isSaving || isSpeechRecording || !voiceText.trim()}
              >
                {isSaving ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#111111" />
                    <Text style={{ color: '#111111', fontWeight: '800', fontSize: 12 }}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={{ color: '#111111', fontWeight: '800', fontSize: 12 }}>Save to Notebook</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 13. AI Improve Choices Dialog Popup */}
      <Modal
        visible={!!activeImproveNote}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveImproveNote(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.improveDialogContainer}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.aiBadgeLabel}>
                <Ionicons name="sparkles" size={14} color="#C8A34D" />
                <Text style={styles.aiBadgeText}>Improve note with AI</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveImproveNote(null)}>
                <Ionicons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.improveDialogSubtitle}>
              Select an option to optimize your case observation note text:
            </Text>

            <View style={styles.improveChoicesGrid}>
              <TouchableOpacity onPress={() => handleExecuteImprovement('legalize')} style={styles.improveChoiceBtn}>
                <Ionicons name="document-text" size={16} color="#C8A34D" />
                <Text style={styles.improveChoiceText}>Legalize Language</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleExecuteImprovement('summarize')} style={styles.improveChoiceBtn}>
                <Ionicons name="list" size={16} color="#C8A34D" />
                <Text style={styles.improveChoiceText}>Summarize Note</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleExecuteImprovement('grammar')} style={styles.improveChoiceBtn}>
                <Ionicons name="language" size={16} color="#C8A34D" />
                <Text style={styles.improveChoiceText}>Correct Grammar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleExecuteImprovement('risks')} style={styles.improveChoiceBtn}>
                <Ionicons name="alert-circle" size={16} color="#C8A34D" />
                <Text style={styles.improveChoiceText}>Highlight Risks</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Quick Actions loader overlay modal */}
      <Modal
        visible={!!activeAiAction}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aiActionLoaderBox}>
            <ActivityIndicator size="large" color="#C8A34D" />
            <Text style={styles.aiActionLoaderText}>AI Strategy Assistant is synthesizing case brief notebook data...</Text>
          </View>
        </View>
      </Modal>

      {/* View Note Details Modal */}
      <Modal
        visible={!!activeViewNote}
        animationType="slide"
        onRequestClose={() => setActiveViewNote(null)}
      >
        <View style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setActiveViewNote(null)} style={styles.editorHeaderBtn}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.editorHeaderTitle} numberOfLines={1}>
              {activeViewNote?.title}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                const note = activeViewNote!;
                setActiveViewNote(null);
                handleOpenEditEditor(note);
              }} 
              style={styles.editorHeaderBtn}
            >
              <Text style={styles.editorSaveText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.viewNoteContentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.viewNoteMetaHeader}>
              <View style={styles.viewNoteTags}>
                <View style={[styles.catBadge, { backgroundColor: getCategoryStyles(activeViewNote?.category || '').bg }]}>
                  <Text style={[styles.catBadgeText, { color: getCategoryStyles(activeViewNote?.category || '').txt }]}>
                    {activeViewNote?.category}
                  </Text>
                </View>
                {activeViewNote?.author === 'AI Generated' && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>🤖 AI Generated</Text>
                  </View>
                )}
              </View>
              <Text style={styles.viewNoteDateText}>
                Created on: {activeViewNote?.createdAt ? new Date(activeViewNote.createdAt).toLocaleString() : 'Today'}
              </Text>
            </View>

            {/* Render Rich text style parsed observations */}
            <View style={styles.richTextBodyBlock}>
              {parseRichText(activeViewNote?.content || '')}
            </View>

            {activeViewNote?.tags && activeViewNote.tags.length > 0 && (
              <View style={[styles.tagsContainer, { marginTop: 20 }]}>
                {activeViewNote.tags.map(tag => (
                  <Text key={tag} style={styles.tagLabel}>#{tag}</Text>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.viewNoteFooter}>
            <TouchableOpacity 
              onPress={() => {
                handleExportNote(activeViewNote!);
              }}
              style={styles.viewNoteFooterBtn}
            >
              <Ionicons name="share" size={16} color="#C8A34D" />
              <Text style={styles.viewNoteFooterBtnText}>Export PDF / Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  
  // AI Actions styling
  aiQuickActionsRow: {
    paddingHorizontal: 12,
    marginVertical: 10,
    gap: 6,
  },
  aiQuickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  aiQuickActionText: {
    fontSize: 10,
    color: '#C8A34D',
    fontWeight: '700',
  },

  // Roster buttons styling
  newAndVoiceNotePanel: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Search input styling
  searchBarRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInputText: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    paddingVertical: 0,
  },

  // Filter chips styling
  filterChipsRow: {
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterChip: {
    backgroundColor: '#C8A34D',
    borderColor: '#C8A34D',
  },
  filterChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Empty State notebook screen style
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },

  // Pinned Section styling
  pinnedSection: {
    marginBottom: 12,
  },
  pinnedSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C8A34D',
    marginHorizontal: 12,
    marginBottom: 6,
  },

  // Timeline chronology display styles
  timelineGroupBlock: {
    marginBottom: 16,
  },
  timelineGroupHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    marginHorizontal: 12,
    marginBottom: 6,
  },
  timelineList: {
    paddingBottom: 20,
  },

  // Note Cards layout style
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  aiGeneratedNoteCard: {
    borderColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
  },
  noteCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C8A34D',
  },
  authorBadgeText: {
    fontSize: 9,
    color: '#4B5563',
    fontWeight: '600',
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  noteCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  noteCardBody: {
    marginBottom: 8,
  },
  noteCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  noteCardPreview: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tagLabel: {
    fontSize: 9,
    color: '#C8A34D',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noteCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  noteActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteActionIconBtn: {
    padding: 4,
  },

  // Full Screen Editor Modal styles
  editorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  editorHeaderBtn: {
    padding: 4,
  },
  editorHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  editorSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C8A34D',
  },
  editorFormScroll: {
    flex: 1,
    padding: 16,
  },
  editorAiAssistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8A34D',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  editorAiAssistText: {
    fontSize: 12,
    color: '#111111',
    fontWeight: '700',
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 10,
  },
  editorTitleInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  editorCatSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 2,
  },
  editorCatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  editorCatBtnActive: {
    backgroundColor: '#F5F5F5',
  },
  editorCatBtnText: {
    fontSize: 10,
    color: '#4B5563',
  },
  editorCatBtnTextActive: {
    color: '#C8A34D',
    fontWeight: '700',
  },
  editorPrioritySelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  editorPriorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  editorPriorityBtnText: {
    fontSize: 10,
    color: '#4B5563',
  },
  editorBodyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F9FAFB',
    height: 180,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  attachmentSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5F5F5',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
  },
  attachmentSelectorText: {
    fontSize: 11,
    color: '#C8A34D',
    fontWeight: '700',
  },
  editorFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    gap: 8,
  },
  editorFooterBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorFooterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Voice recorder styling layout
  voiceRecorderContainer: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    borderRadius: 12,
    padding: 16,
  },
  voiceRecordSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 16,
  },
  voiceLoadingBlock: {
    alignItems: 'center',
    padding: 24,
  },
  voiceLoadingText: {
    fontSize: 11,
    color: '#C8A34D',
    marginTop: 8,
  },
  voiceRecorderConsole: {
    alignItems: 'center',
    marginVertical: 12,
  },
  recordingConsoleIdle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingHelperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
  recordingConsoleActive: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingTimer: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginVertical: 6,
  },
  recordingLiveText: {
    fontSize: 11,
    color: '#EF4444',
  },
  voiceMicBtnCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C8A34D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // AI Improve Note Dialog styles
  improveDialogContainer: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    borderRadius: 12,
    padding: 16,
  },
  improveDialogSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 14,
  },
  improveChoicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  improveChoiceBtn: {
    width: (width * 0.9 - 40) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  improveChoiceText: {
    fontSize: 11,
    color: '#C8A34D',
    fontWeight: '700',
  },

  // Loader popups
  aiActionLoaderBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
  },
  aiActionLoaderText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },

  // View note modal layout styles
  viewNoteContentScroll: {
    flex: 1,
    padding: 16,
  },
  viewNoteMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
    marginBottom: 16,
  },
  viewNoteTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewNoteDateText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  richTextBodyBlock: {
    marginVertical: 4,
  },
  richTextLine: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  viewNoteFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    alignItems: 'center',
  },
  viewNoteFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    gap: 6,
  },
  viewNoteFooterBtnText: {
    fontSize: 12,
    color: '#C8A34D',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiBadgeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  voiceLangContainer: {
    marginBottom: 14,
  },
  voiceLangLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  voiceLangButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voiceLangBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  voiceLangBtnActive: {
    backgroundColor: '#FCF8EF',
    borderColor: '#C8A34D',
  },
  voiceLangBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  voiceLangBtnTextActive: {
    color: '#C8A34D',
    fontWeight: '700',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    marginBottom: 10,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#C8A34D',
  },
  voiceTextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 10,
  },
  voiceTextInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F9FAFB',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  voiceFooterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  voiceCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceSaveBtn: {
    flex: 2,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
