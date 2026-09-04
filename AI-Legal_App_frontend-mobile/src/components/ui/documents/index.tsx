/**
 * AI Legal Mobile - Legal Document Renderers & Viewers
 * Lightweight Markdown parsing fallbacks, structured document containers, and Notice views.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useThemeContext } from '@/providers';
import { Spacing, Radius } from '@/theme';
import { LegalNoticePreview } from '../legal';

export interface DocumentViewerProps {
  title: string;
  content: string;
  metadata?: Record<string, string>;
}

/**
 * Standard Document viewer content pane.
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  title,
  content,
  metadata,
}) => {
  const { theme } = useThemeContext();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      
      {metadata && Object.keys(metadata).length > 0 && (
        <View style={[styles.metadataBox, { backgroundColor: theme.surfaceVariant }]}>
          {Object.entries(metadata).map(([key, val]) => (
            <Text key={key} style={[styles.metaText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700' }}>{key}:</Text> {val}
            </Text>
          ))}
        </View>
      )}

      <Text style={[styles.contentBody, { color: theme.textPrimary }]}>{content}</Text>
    </ScrollView>
  );
};

export interface MarkdownRendererProps {
  text: string;
}

/**
 * Premium client-side Markdown syntax renderer for chat responses and briefs.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  const { theme } = useThemeContext();

  // Helper to parse bold markdown segments inline and strip stray asterisks
  const parseInlineStyles = (lineText: string, baseStyle: any) => {
    if (!lineText) return <Text style={baseStyle}></Text>;

    // Split text by **bold** markers
    const parts = lineText.split(/(\*\*.*?\*\*)/g);

    return (
      <Text style={baseStyle}>
        {parts.map((part, index) => {
          const trimmedPart = part.trim();
          if (/^\*\*.*?\*\*$/.test(trimmedPart)) {
            const cleaned = trimmedPart.slice(2, -2);
            return (
              <Text key={index} style={{ fontWeight: '800', color: theme.textPrimary }}>
                {cleaned}
              </Text>
            );
          }
          // Strip any stray asterisks
          return part.replace(/\*/g, '');
        })}
      </Text>
    );
  };

  const parseLines = () => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();

      // Skip completely empty lines, but add vertical spacing
      if (trimmed === '') {
        elements.push(<View key={`empty-${idx}`} style={{ height: 6 }} />);
        continue;
      }

      // Divider (e.g. --- or ***) (Step 1 & 8)
      if (trimmed === '---' || trimmed === '***') {
        elements.push(
          <View key={idx} style={[styles.divider, { backgroundColor: theme.border }]} />
        );
        continue;
      }

      // Blockquotes (e.g. > Quote) (Step 8)
      if (trimmed.startsWith('>')) {
        const cleanedText = trimmed.replace(/^>\s*/, '');
        elements.push(
          <View key={idx} style={[styles.blockquote, { borderLeftColor: '#C8A34D' }]}>
            {parseInlineStyles(cleanedText, { fontSize: 13, fontStyle: 'italic', lineHeight: 18, color: theme.textSecondary })}
          </View>
        );
        continue;
      }

      // Headings (H1, H2, H3, or legal emojis with uppercase title text) (Step 3)
      const isHeadingPattern = 
        trimmed.startsWith('#') || 
        trimmed.startsWith('##') || 
        trimmed.startsWith('###') || 
        /^(⚖️|🔥|🎯|⚠️|🧠|💣|🧑‍⚖️|🚀|📚|✓)\s+[A-Z\s\(\)]+/.test(trimmed) ||
        /^(CASE POSITION|PRIMARY ARGUMENTS|STRONGEST ARGUMENT|OPPOSITION ARGUMENTS|REBUTTAL STRATEGY|CROSS-EXAMINATION QUESTIONS|COURTROOM NARRATIVE|ARGUMENT STRATEGY|LEGAL BACKING|FINAL CLOSING STATEMENT|SUGGESTED NEXT ACTIONS|PLAINTIFF ARGUMENTS|DEFENCE STRATEGY|CROSS EXAMINATION|JUDGE QUESTIONS)/i.test(trimmed);

      if (isHeadingPattern) {
        // Clean symbols if starts with #
        const cleanedText = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <Text key={idx} style={[styles.h2, { color: theme.textPrimary }]}>
            {cleanedText}
          </Text>
        );
        continue;
      }

      // Lists bullet item (e.g. •, -, *) (Step 4)
      const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
      if (isListItem) {
        // Find leading spaces of original line for nesting depth
        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        const cleanedText = trimmed.replace(/^[-*•]\s*/, '');
        elements.push(
          <View key={idx} style={{ flexDirection: 'row', marginLeft: 8 + leadingSpaces * 4, marginVertical: 3, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 14, color: '#C8A34D', marginRight: 6, lineHeight: 19 }}>•</Text>
            <View style={{ flex: 1 }}>
              {parseInlineStyles(cleanedText, { fontSize: 13.5, lineHeight: 19, color: theme.textSecondary })}
            </View>
          </View>
        );
        continue;
      }

      // Numbered List Item (e.g. 1. , 2. ) (Step 4)
      const isNumberedItem = /^\d+\.\s+/.test(trimmed);
      if (isNumberedItem) {
        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        const match = trimmed.match(/^(\d+)\.\s+/);
        const number = match ? match[1] : '1';
        const cleanedText = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <View key={idx} style={{ flexDirection: 'row', marginLeft: 8 + leadingSpaces * 4, marginVertical: 3, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#C8A34D', marginRight: 6, lineHeight: 19 }}>{number}.</Text>
            <View style={{ flex: 1 }}>
              {parseInlineStyles(cleanedText, { fontSize: 13.5, lineHeight: 19, color: theme.textSecondary })}
            </View>
          </View>
        );
        continue;
      }

      // Markdown Table Detection (e.g. | Feature | Concept A | Concept B |)
      if (trimmed.startsWith('|')) {
        const tableLines: string[] = [];
        let tIdx = idx;
        while (tIdx < lines.length && lines[tIdx].trim().startsWith('|')) {
          tableLines.push(lines[tIdx].trim());
          tIdx++;
        }
        idx = tIdx - 1; // Advance main loop index

        if (tableLines.length > 0) {
          // Extract cells per row and clean special characters
          const cleanCellText = (str: string) => (str || '').replace(/[*#@~`\\_]/g, '').trim();
          const parsedRows = tableLines.map(rowLine =>
            rowLine.split('|').slice(1, -1).map(cell => cleanCellText(cell))
          );

          // Filter out header separator rows like |---|---|---|
          const dataRows = parsedRows.filter(row => !row.every(cell => /^:?-+:?$/.test(cell)));

          if (dataRows.length > 0) {
            const headerRow = dataRows[0];
            const bodyRows = dataRows.slice(1);

            elements.push(
              <View key={`table-${idx}`} style={{ marginVertical: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flexGrow: 0 }}>
                  <View style={[styles.tableContainer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                    {/* Table Header */}
                    <View style={[styles.tableHeaderRow, { backgroundColor: '#F0E6D2', borderBottomColor: theme.border }]}>
                      {headerRow.map((cell, cIdx) => (
                        <View
                          key={`th-${cIdx}`}
                          style={[
                            styles.tableCell,
                            {
                              borderRightWidth: cIdx < headerRow.length - 1 ? 1 : 0,
                              borderRightColor: theme.border,
                              minWidth: cIdx === 0 ? 100 : 140,
                              maxWidth: 220,
                            },
                          ]}
                        >
                          {parseInlineStyles(cell, { fontSize: 13, fontWeight: '800', color: theme.textPrimary })}
                        </View>
                      ))}
                    </View>
                    {/* Table Body */}
                    {bodyRows.map((row, rIdx) => (
                      <View
                        key={`tr-${rIdx}`}
                        style={[
                          styles.tableRow,
                          {
                            backgroundColor: rIdx % 2 === 1 ? (theme.surfaceVariant || '#F8F9FA') : theme.surface,
                            borderBottomWidth: rIdx < bodyRows.length - 1 ? 1 : 0,
                            borderBottomColor: theme.border,
                          },
                        ]}
                      >
                        {row.map((cell, cIdx) => (
                          <View
                            key={`td-${rIdx}-${cIdx}`}
                            style={[
                              styles.tableCell,
                              {
                                borderRightWidth: cIdx < row.length - 1 ? 1 : 0,
                                borderRightColor: theme.border,
                                minWidth: cIdx === 0 ? 100 : 140,
                                maxWidth: 220,
                              },
                            ]}
                          >
                            {parseInlineStyles(cell, { fontSize: 12.5, lineHeight: 18, color: theme.textSecondary })}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );
            continue;
          }
        }
      }

      // Simple paragraph with inline style parsing (Step 7)
      elements.push(
        <View key={idx} style={styles.paragraphContainer}>
          {parseInlineStyles(trimmed, { fontSize: 13.5, lineHeight: 19.5, color: theme.textSecondary })}
        </View>
      );
    }

    return elements;
  };

  return <View style={styles.markdownContainer}>{parseLines()}</View>;
};

export { LegalNoticePreview as LegalNoticeViewer };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing[16],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing[12],
  },
  metadataBox: {
    padding: Spacing[10],
    borderRadius: Radius.md,
    marginBottom: Spacing[16],
    gap: Spacing[4],
  },
  metaText: {
    fontSize: 13,
  },
  contentBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  markdownContainer: {
    alignSelf: 'stretch',
  },
  h2: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 22,
  },
  h3: {
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 20,
  },
  listItem: {
    fontSize: 13.5,
    lineHeight: 20,
    marginLeft: Spacing[8],
    marginVertical: Spacing[2],
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 21,
    marginVertical: Spacing[4],
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  paragraphContainer: {
    marginVertical: 4,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
});
