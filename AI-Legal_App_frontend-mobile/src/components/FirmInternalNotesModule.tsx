import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext, useToastContext } from '@/providers';
import { Shadows } from '@/theme';

interface NoteItem {
  id: string;
  author: string;
  time: string;
  message: string;
}

export const FirmInternalNotesModule: React.FC = () => {
  const { theme, isDark } = useThemeContext();
  const { showToast } = useToastContext();

  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: '1',
      author: 'Adv. Rajesh Sharma',
      time: 'Today, 10:15 AM',
      message: 'Please prepare written arguments and cross-examination notes before Friday hearing.',
    },
    {
      id: '2',
      author: 'Adv. Rahul Verma',
      time: 'Yesterday, 4:30 PM',
      message: 'Bank statement evidence audit completed. Uploaded file to Evidence Vault.',
    },
  ]);

  const [newNoteText, setNewNoteText] = useState('');

  const handlePostNote = () => {
    if (!newNoteText.trim()) return;

    const newNote: NoteItem = {
      id: Date.now().toString(),
      author: 'Adv. Rajesh Sharma (You)',
      time: 'Just now',
      message: newNoteText.trim(),
    };

    setNotes([newNote, ...notes]);
    setNewNoteText('');
    showToast('success', 'Note Posted', 'Internal team note added to case.');
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, Shadows.sm]}>
      <View style={styles.titleRow}>
        <Ionicons name="chatbubbles-outline" size={18} color="#C8A34D" style={{ marginRight: 8 }} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Internal Case Notes ⭐</Text>
      </View>
      <Text style={[styles.subText, { color: theme.textSecondary }]}>
        Private team communication feed (Internal Advocates Only • Not Visible to Client).
      </Text>

      {/* Input box */}
      <View style={[styles.inputBox, { backgroundColor: isDark ? '#222228' : '#F9FAFB', borderColor: theme.border }]}>
        <TextInput
          placeholder="Write internal team note..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.textPrimary }]}
          multiline
          numberOfLines={2}
          value={newNoteText}
          onChangeText={setNewNoteText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handlePostNote}>
          <Ionicons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Notes Feed */}
      <View style={{ gap: 8, marginTop: 10 }}>
        {notes.map((n) => (
          <View key={n.id} style={[styles.noteRow, { backgroundColor: isDark ? '#1F2937' : '#FEF8EC', borderColor: '#C8A34D' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={[styles.authorName, { color: isDark ? '#F9FAFB' : '#92400E' }]}>{n.author}</Text>
              <Text style={{ fontSize: 10, color: theme.textMuted }}>{n.time}</Text>
            </View>
            <Text style={{ fontSize: 11.5, color: theme.textSecondary }}>{n.message}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subText: {
    fontSize: 10.5,
    marginBottom: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 12,
    maxHeight: 50,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#C8A34D',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  noteRow: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  authorName: {
    fontSize: 11.5,
    fontWeight: '800',
  },
});
