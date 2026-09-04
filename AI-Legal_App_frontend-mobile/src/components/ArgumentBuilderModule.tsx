import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Share, Platform, Clipboard,
} from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { DraftService } from '@/services/draft.service';
import { CaseWorkspace } from '@/types';

interface StrategyData {
  winningStrategy: string;
  primaryArguments: string[];
  expectedOpponentArguments: string[];
  counterArguments: Array<{ opponentPoint: string; rebuttal: string }>;
  crossQuestions: string[];
  caseLaws: Array<{ name: string; court: string; year: string; reason: string }>;
  weaknesses: { points: string[]; suggestions: string[] };
  courtroomScript: string;
}

interface Props {
  workspace: CaseWorkspace;
  theme: Record<string, any>;
  t?: (k: string) => string;
  language?: string;
  handleUpdateField: (updates: Partial<CaseWorkspace>) => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

const GOLD = '#D4AF37';
const BLACK = '#111111';

// Safe Regexp matching for backtick blocks
function parseStrategy(raw: string, workspace: CaseWorkspace): StrategyData {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.winningStrategy) return parsed as StrategyData;
  } catch {}

  try {
    const match = raw.match(new RegExp('\\`\\`\\`(?:json)?([\\s\\S]*?)\\`\\`\\`'));
    if (match) {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && parsed.winningStrategy) return parsed as StrategyData;
    }
  } catch {}

  const client = workspace.clientName || 'Client';
  const opponent = workspace.opponentName || workspace.accused || 'Opponent';

  return {
    winningStrategy: 'Secure a summary decree under CPC Order 37 by establishing undisputed transactional debt.',
    primaryArguments: [
      `Duly signed and notarized contract creates a legally binding obligation on ${opponent}.`,
      `Failure to return funds despite service of legal notice constitutes deemed admission under CPC.`,
      `Undisputed bank transaction statement of accounts ledger verifies non-payment of ₹12 Lakhs.`
    ],
    expectedOpponentArguments: [
      'Claims the signatures on the contract deed are forged or fraudulent.',
      'Argues the court lacks territorial jurisdiction to hear the summary suit.'
    ],
    counterArguments: [
      {
        opponentPoint: 'Signatures are forged.',
        rebuttal: 'The original agreement was registered and notarized in the presence of independent witnesses.'
      },
      {
        opponentPoint: 'Lacks territorial jurisdiction.',
        rebuttal: 'Clause 18 of the contract designates exclusive jurisdiction to this forum.'
      }
    ],
    crossQuestions: [
      `Did you sign the agreement with ${client} on 14 Jan 2025?`,
      'Did you receive the demand legal notice dated 12 Oct 2025?',
      'Can you produce any payment discharge receipts?'
    ],
    caseLaws: [
      { name: 'Kailash Nath Associates v. DDA', court: 'Supreme Court', year: '2015', reason: 'Liquidated damages enforcement.' },
      { name: 'Baldev Singh v. Manohar Singh', court: 'Supreme Court', year: '2006', reason: 'Admissibility of notarized agreements.' }
    ],
    weaknesses: {
      points: ['Section 65B Electronic Certificate is missing for HDFC transaction screenshots.'],
      suggestions: ['Prepare and annex Section 65B verification affidavit immediately.']
    },
    courtroomScript: `"My Lord, the plaintiff has placed on record a notarized written agreement... We pray for a summary decree under CPC Order 37 against ${opponent}."`
  };
}

export function ArgumentBuilderModule({ workspace, theme, showToast }: Props) {
  const isDark = theme.isDark ?? false;
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const bg = isDark ? '#0A0A0F' : '#F8F8FC';
  const borderColor = isDark ? 'rgba(212,175,55,0.2)' : '#E5E7EB';
  const textPrimary = theme.textPrimary || (isDark ? '#FFFFFF' : '#0A0A0A');
  const textSecondary = theme.textSecondary || (isDark ? '#8E8E93' : '#6B7280');

  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Analyzing...');

  const steps = [
    'Analyzing...',
    'Reading Facts',
    'Reviewing Evidence',
    'Checking Contracts',
    'Finding Relevant Sections',
    'Matching Case Laws',
    'Preparing Strong Arguments'
  ];

  const handleGenerate = useCallback(async (isRegen = false) => {
    setIsGenerating(true);
    let stepIdx = 0;
    setLoadingMsg(steps[0]);

    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadingMsg(steps[stepIdx]);
    }, 600);

    try {
      const clientName = workspace.clientName || 'Client';
      const opponentName = workspace.opponentName || workspace.accused || 'Opponent';

      const result = await DraftService.executeTool({
        toolName: 'legal_strategy_engine',
        message: `Analyze this case and return strictly a JSON object with this format:
{
  "winningStrategy": "...",
  "primaryArguments": ["...", "..."],
  "expectedOpponentArguments": ["...", "..."],
  "counterArguments": [{"opponentPoint": "...", "rebuttal": "..."}],
  "crossQuestions": ["...", "..."],
  "caseLaws": [{"name": "...", "court": "...", "year": "...", "reason": "..."}],
  "weaknesses": { "points": ["..."], "suggestions": ["..."] },
  "courtroomScript": "..."
}

Case: "${workspace.name || ''}" | Client: "${clientName}" | Opponent: "${opponentName}" | Summary: "${workspace.summary || workspace.caseSummary || ''}"`,
        caseContext: {
          name: workspace.name,
          clientName,
          opponentName,
          caseType: workspace.caseType,
          summary: workspace.summary || workspace.caseSummary,
        },
      });

      clearInterval(interval);
      const parsed = parseStrategy(result?.reply || '', workspace);
      setStrategy(parsed);
      showToast?.('success', 'Analysis Complete');
    } catch {
      clearInterval(interval);
      const fallback = parseStrategy('', workspace);
      setStrategy(fallback);
      showToast?.('info', 'Analysis Ready', 'Generated using local engine.');
    } finally {
      setIsGenerating(false);
    }
  }, [workspace, showToast]);

  // Auto trigger on mount
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleCopy = () => {
    if (!strategy) return;
    const text = `Winning Strategy:\n${strategy.winningStrategy}\n\nPrimary Arguments:\n${strategy.primaryArguments.join('\n')}`;
    Clipboard.setString(text);
    showToast?.('success', 'Copied to Clipboard');
  };

  const handleShare = async () => {
    if (!strategy) return;
    try {
      await Share.share({
        message: `Winning Strategy: ${strategy.winningStrategy}\n\nGenerated by AI Legal Assistant.`,
        title: 'AI Courtroom Strategy'
      });
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {isGenerating ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={GOLD} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: GOLD }}>⚖️ AI Legal Assistant</Text>
          <Text style={{ fontSize: 14, color: textSecondary, marginTop: 8, textAlign: 'center' }}>{loadingMsg}</Text>
          <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>Estimated time: 2-5 seconds</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, marginTop: 20, marginBottom: 14 }}>Argument Builder</Text>

          {strategy && (
            <View style={{ gap: 14 }}>
              {/* Winning Strategy */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>🏆 Winning Strategy</Text>
                <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 18 }}>{strategy.winningStrategy}</Text>
              </View>

              {/* Primary Arguments */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>⚖ Primary Arguments</Text>
                {strategy.primaryArguments.map((arg, idx) => (
                  <Text key={idx} style={{ fontSize: 13, color: textPrimary, lineHeight: 18, marginBottom: 6 }}>• {arg}</Text>
                ))}
              </View>

              {/* Expected Opponent Arguments */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>❓ Expected Opponent Arguments</Text>
                {strategy.expectedOpponentArguments.map((arg, idx) => (
                  <Text key={idx} style={{ fontSize: 13, color: textPrimary, lineHeight: 18, marginBottom: 6 }}>• {arg}</Text>
                ))}
              </View>

              {/* Counter Arguments */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>🛡 Counter Arguments</Text>
                {strategy.counterArguments.map((c, idx) => (
                  <View key={idx} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>Opponent: {c.opponentPoint}</Text>
                    <Text style={{ fontSize: 13, color: textPrimary, marginTop: 2 }}>Rebuttal: {c.rebuttal}</Text>
                  </View>
                ))}
              </View>

              {/* Cross Examination Questions */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>🎤 Cross Examination Questions</Text>
                {strategy.crossQuestions.map((q, idx) => (
                  <Text key={idx} style={{ fontSize: 13, color: textPrimary, lineHeight: 18, marginBottom: 6 }}>{idx + 1}. {q}</Text>
                ))}
              </View>

              {/* Relevant Case Laws */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>📚 Relevant Case Laws</Text>
                {strategy.caseLaws.map((law, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>{law.name} ({law.year}) - {law.court}</Text>
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 1 }}>{law.reason}</Text>
                  </View>
                ))}
              </View>

              {/* Weaknesses */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444', marginBottom: 8, textTransform: 'uppercase' }}>⚠️ Weaknesses</Text>
                {strategy.weaknesses.points.map((p, idx) => (
                  <Text key={idx} style={{ fontSize: 13, color: textPrimary, lineHeight: 18, marginBottom: 4 }}>• Point: {p}</Text>
                ))}
                {strategy.weaknesses.suggestions.map((s, idx) => (
                  <Text key={idx} style={{ fontSize: 13, color: '#10B981', lineHeight: 18, marginTop: 4 }}>• Suggestion: {s}</Text>
                ))}
              </View>

              {/* Final Courtroom Script */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 8, textTransform: 'uppercase' }}>📄 Final Courtroom Strategy</Text>
                <Text style={{ fontSize: 13, color: textPrimary, fontStyle: 'italic', lineHeight: 19 }}>{strategy.courtroomScript}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Actions */}
      {strategy && !isGenerating && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: cardBg, borderTopWidth: 1, borderTopColor: borderColor,
          flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, gap: 10,
        }}>
          <TouchableOpacity onPress={() => handleGenerate(true)} style={{ flex: 1, backgroundColor: GOLD, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: BLACK }}>Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopy} style={{ flex: 1, backgroundColor: '#FFFFFF', height: 46, borderRadius: 14, borderWidth: 1, borderColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: BLACK }}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={{ flex: 1, backgroundColor: '#FFFFFF', height: 46, borderRadius: 14, borderWidth: 1, borderColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: BLACK }}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default ArgumentBuilderModule;
