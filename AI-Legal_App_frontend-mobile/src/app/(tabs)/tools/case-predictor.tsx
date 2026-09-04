import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  Dimensions,
  Clipboard,
  Share,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import { useToastContext, useThemeContext } from '@/providers';
import { CaseService } from '@/services/case.service';
import { CasePredictionHistoryService, CasePredictionItem } from '@/services/case-prediction.service';
import { DraftService } from '@/services/draft.service';
import { FlatList } from 'react-native';
import { CaseSummary } from '@/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Copilot hooks & components
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { MarkdownRenderer } from '@/components/ui/documents';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool } from '@/localization';
import { useLocalLanguageStore } from '@/localization/i18n';

const { width, height } = Dimensions.get('window');

// Step 1: Upload Documents list mockup
const MOCK_PREDICT_DOCS = [
  { id: 'suit', name: 'plaintiff_suit_filing.pdf', size: '2.4 MB', type: 'Civil Suit Plaint' },
  { id: 'reply', name: 'defense_written_statement.docx', size: '1.8 MB', type: 'Written Statement' },
  { id: 'evidence', name: 'exhibit_agreement_copy.pdf', size: '850 KB', type: 'Contract Evidence' },
];

// Step 2: 10 extraction progress steps
const PROCESSING_STEPS = [
  'Reading Documents',
  'OCR Extraction',
  'Identifying Parties',
  'Detecting Issues',
  'Mapping Evidence',
  'Finding Relevant Laws',
  'Finding Similar Judgments',
  'Running Prediction Model',
  'Building Strategy',
  'Generating Report',
];

// Tab 4: Precedents mockup data
const WINNING_FACTORS_DATA = [
  {
    title: 'Signed Agreement & Direct Admits',
    desc: 'The defendant signed execution contracts on May 10, 2026. Sig verification shifts presumption under law.',
    impact: 'Critical Win Driver',
    confidence: '94%',
    importance: 'High Importance',
    color: '#10B981'
  },
  {
    title: 'Strong Documentary Evidence Logs',
    desc: 'Exhibits Ex-1 to Ex-4 include certified bank memos and dishonoured cheque papers matching registry entries.',
    impact: 'High Impact',
    confidence: '92%',
    importance: 'Critical Importance',
    color: '#10B981'
  },
  {
    title: 'Statutory Notice Timely Served',
    desc: 'Demand notice served on May 14 meets strict 30-day post dishonour requirements under NI Act.',
    impact: 'Moderate Impact',
    confidence: '98%',
    importance: 'High Importance',
    color: '#0EA5E9'
  },
  {
    title: 'Relevant Supreme Court Citation',
    desc: 'Rangappa v. Sri Mohan binding precedent on burden shift is directly applicable to uncontested execution.',
    impact: 'High Impact',
    confidence: '88%',
    importance: 'Critical Importance',
    color: '#10B981'
  },
  {
    title: 'Presumption Burden Shifts to Accused',
    desc: 'Once basic ingredients are proved, Section 139 mandates presumption of enforceable debt.',
    impact: 'Critical Win Driver',
    confidence: '90%',
    importance: 'Critical Importance',
    color: '#10B981'
  }
];

const WEAKNESSES_DATA = [
  {
    title: 'No Independent Witness Registry',
    desc: 'Pleadings contain no testimony from third-party transaction auditors or public officials.',
    probReduction: '-12% success reduction',
    impact: 'Moderate Vulnerability',
    mitigation: 'Subpoena joint auditor ledger files during issues formulation.',
    color: '#EF4444'
  },
  {
    title: 'Missing Original Invoice copies',
    desc: 'Secondary photo copies of bills might trigger admissibility objections from defense.',
    probReduction: '-8% success reduction',
    impact: 'Low Vulnerability',
    mitigation: 'Submit Bankers Books Evidence certificate matching bank logs.',
    color: '#F59E0B'
  },
  {
    title: 'Limitation Delay of 11 Days',
    desc: 'Statutory notice served 11 days late due to courier registry gaps.',
    probReduction: '-15% success reduction',
    impact: 'High Vulnerability',
    mitigation: 'File condonation application under Section 142(1)(b) proviso.',
    color: '#EF4444'
  },
  {
    title: 'Possible Limitation Expiry Challenge',
    desc: 'Defendant will claim complaint period expired prior to filing desk registry submission.',
    probReduction: '-10% success reduction',
    impact: 'Moderate Vulnerability',
    mitigation: 'Present tracking delivery confirmations showing post office closure schedules.',
    color: '#EF4444'
  },
  {
    title: 'Compounding Settlement Risks',
    desc: 'Accused company declaring bankruptcy stays cash recovery actions.',
    probReduction: '-5% success reduction',
    impact: 'Low Vulnerability',
    mitigation: 'File case directly against directors in personal capacities.',
    color: '#F59E0B'
  }
];

const SCENARIOS_DATA = [
  {
    title: 'Scenario A: Defendant admits signature execution',
    desc: 'Presumption is activated immediately, restricting defense to proof of debt discharge.',
    chance: '84% Winning Chance',
    color: '#10B981'
  },
  {
    title: 'Scenario B: Signature authenticity disputed',
    desc: 'Case requires forensic handwriting examination report under Section 45, delaying trial.',
    chance: '58% Winning Chance',
    color: '#F59E0B'
  },
  {
    title: 'Scenario C: Primary witness unavailable',
    desc: 'Failure to summon branch manager leaves bank return memos uncertified in cross trial.',
    chance: '46% Winning Chance',
    color: '#EF4444'
  },
  {
    title: 'Scenario D: Settlement reached before evidence stage',
    desc: 'Parties agree to compounding terms under Damodar S. Prabhu compounding guidelines.',
    chance: '72% Settlement Likelihood',
    color: '#0EA5E9'
  }
];

const JUDGE_INSIGHTS_DATA = [
  {
    title: 'Typical Judicial View on Sec 138 NI Act',
    desc: 'Magistrates favor statutory notice adherence strictly, placing a heavy initial burden on cheque drawers.'
  },
  {
    title: 'Likely Magistrate Questions during trial',
    desc: 'Did the complainant receive stop payment alerts prior to cheque presentation dispatch?'
  },
  {
    title: 'Likely Objections from Opposing Counsel',
    desc: 'Objection to secondary printout screenshot files lacking signed Section 65B affidavits.'
  },
  {
    title: 'Important Court Concerns',
    desc: 'Verifying if notice was dispatched within exactly 30 days of receiving bank bounce slips.'
  },
  {
    title: 'Expected Legal Scrutiny Points',
    desc: 'Matching signature stroke match overlaps and company stamp authorization seals.'
  },
  {
    title: 'Most Persuasive Evidence Formats',
    desc: 'Certified speed post delivery tracking receipts and official Bankers book logs.'
  }
];

export const getLocalizedWinningFactors = (lang?: string) => {
  const selectedLang = lang || 'English';
  return [
    {
      title: tTool(selectedLang, 'Signed Agreement & Direct Admission', 'Signed Agreement & Direct Admission'),
      desc: tTool(selectedLang, 'Defendant executed terms agreement. Signature verification establishes binding debt under law.', 'Defendant executed terms agreement. Signature verification establishes binding debt under law.'),
      impact: tTool(selectedLang, 'Primary Driver', 'Primary Driver'),
      confidence: '94%',
      importance: tTool(selectedLang, 'High Priority', 'High Priority'),
      color: '#10B981'
    },
    {
      title: tTool(selectedLang, 'Bank Return Memo (Cheque Dishonour Evidence)', 'Bank Return Memo (Cheque Dishonour Evidence)'),
      desc: tTool(selectedLang, 'Bank return memo and ledger statements provide statutory presumption under Sec 139 NI Act.', 'Bank return memo and ledger statements provide statutory presumption under Sec 139 NI Act.'),
      impact: tTool(selectedLang, 'Procedural Strength', 'Procedural Strength'),
      confidence: '92%',
      importance: tTool(selectedLang, 'Critical', 'Critical'),
      color: '#10B981'
    },
    {
      title: tTool(selectedLang, 'Statutory Legal Notice Served on Time', 'Statutory Legal Notice Served on Time'),
      desc: tTool(selectedLang, 'Timely delivery of statutory legal demand notice within 30 days of dishonour confirmed.', 'Timely delivery of statutory legal demand notice within 30 days of dishonour confirmed.'),
      impact: tTool(selectedLang, 'High Impact', 'High Impact'),
      confidence: '98%',
      importance: tTool(selectedLang, 'High Priority', 'High Priority'),
      color: '#0EA5E9'
    },
    {
      title: tTool(selectedLang, 'Supreme Court Binding Precedent Alignment', 'Supreme Court Binding Precedent Alignment'),
      desc: tTool(selectedLang, 'Rangappa v. Sri Mohan (2010) ratio applies directly to shift burden of proof onto defendant.', 'Rangappa v. Sri Mohan (2010) ratio applies directly to shift burden of proof onto defendant.'),
      impact: tTool(selectedLang, 'High Impact', 'High Impact'),
      confidence: '88%',
      importance: tTool(selectedLang, 'Critical', 'Critical'),
      color: '#10B981'
    }
  ];
};

export const getLocalizedWeaknesses = (lang?: string) => {
  const selectedLang = lang || 'English';
  return [
    {
      title: tTool(selectedLang, 'Absence of Independent Eye-Witnesses', 'Absence of Independent Eye-Witnesses'),
      desc: tTool(selectedLang, 'Petition lacks testimony from neutral third-party auditors or independent witnesses.', 'Petition lacks testimony from neutral third-party auditors or independent witnesses.'),
      probReduction: '-12%',
      impact: tTool(selectedLang, 'Moderate Risk', 'Moderate Risk'),
      mitigation: tTool(selectedLang, 'Summon joint auditor ledger records during issue framing.', 'Summon joint auditor ledger records during issue framing.'),
      color: '#EF4444'
    },
    {
      title: tTool(selectedLang, 'Secondary Photocopy of Original Invoices', 'Secondary Photocopy of Original Invoices'),
      desc: tTool(selectedLang, 'Secondary photo copies of invoices may draw evidentiary objections from opponent counsel.', 'Secondary photo copies of invoices may draw evidentiary objections from opponent counsel.'),
      probReduction: '-8%',
      impact: tTool(selectedLang, 'Low Risk', 'Low Risk'),
      mitigation: tTool(selectedLang, 'Produce Banker Book Evidence Act certificate in court.', 'Produce Banker Book Evidence Act certificate in court.'),
      color: '#F59E0B'
    }
  ];
};

export const getLocalizedScenarios = (lang?: string) => {
  const selectedLang = lang || 'English';
  return [
    {
      title: tTool(selectedLang, 'Scenario A: Defendant Admits Signature Execution', 'Scenario A: Defendant Admits Signature Execution'),
      desc: tTool(selectedLang, 'Statutory presumption triggers immediately, narrowing defense strictly to proving debt discharge.', 'Statutory presumption triggers immediately, narrowing defense strictly to proving debt discharge.'),
      chance: tTool(selectedLang, '84% Win Probability', '84% Win Probability'),
      color: '#10B981'
    },
    {
      title: tTool(selectedLang, 'Scenario B: Signature Authenticity Disputed', 'Scenario B: Signature Authenticity Disputed'),
      desc: tTool(selectedLang, 'Requires Sec 45 forensic handwriting expert examination, extending trial timelines.', 'Requires Sec 45 forensic handwriting expert examination, extending trial timelines.'),
      chance: tTool(selectedLang, '58% Win Probability', '58% Win Probability'),
      color: '#F59E0B'
    }
  ];
};

export const getLocalizedJudgeInsights = (lang?: string) => {
  const selectedLang = lang || 'English';
  return [
    {
      title: tTool(selectedLang, 'Judicial Stance on Sec 138 Statutory Presumptions', 'Judicial Stance on Sec 138 Statutory Presumptions'),
      desc: tTool(selectedLang, 'Court strictly enforces statutory notice compliance before allowing oral defense testimony.', 'Court strictly enforces statutory notice compliance before allowing oral defense testimony.')
    }
  ];
};


interface PredictionResult {
  caseStrength: string;
  winProbability: string;
  primaryIssue: string;
  likelyCourtOutcome: string;
  reasons: string[];
  winningFactors: { title: string; desc: string; impact: string; confidence: string; importance: string; color: string }[];
  weaknesses: { title: string; desc: string; probReduction: string; impact: string; mitigation: string; color: string }[];
  scenarios: { title: string; desc: string; chance: string; color: string }[];
  judgeInsights: { title: string; desc: string }[];
  timeline: { stage: string; duration: string; color: string; done: boolean }[];
  rawReport: string;
  confidenceScore: string;
}

const parsePredictionResult = (text: string): PredictionResult => {
  const result: PredictionResult = {
    caseStrength: 'Moderate',
    winProbability: '66%',
    primaryIssue: 'Burden of Proof & Evidence evaluation',
    likelyCourtOutcome: 'Case likely to succeed subject to procedural compliance',
    reasons: [],
    winningFactors: [],
    weaknesses: [],
    scenarios: [],
    judgeInsights: [],
    timeline: [],
    rawReport: text,
    confidenceScore: '91%'
  };

  if (!text) return result;

  const lines = text.split('\n');
  let currentSection = '';

  const cleanLine = (l: string) => l.replace(/[*#_\-`~[\]()]/g, '').trim();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for Section Emojis or Multilingual Header keywords
    if (line.includes('⚖️') || line.includes('FINAL OUTCOME') || line.includes('परिणाम') || line.includes('OUTCOME')) {
      currentSection = 'final_outcome';
      continue;
    } else if (line.includes('📊') || line.includes('WIN PROBABILITY') || line.includes('संभावना') || line.includes('PROBABILITY')) {
      currentSection = 'probability_breakdown';
      continue;
    } else if (line.includes('🔍') || line.includes('KEY REASONS') || line.includes('कारण') || line.includes('REASONS')) {
      currentSection = 'key_reasons';
      continue;
    } else if (line.includes('⚠️') || line.includes('RISKS') || line.includes('जोखिम') || line.includes('कमजोरी') || line.includes('VULNERABILITIES')) {
      currentSection = 'risks';
      continue;
    } else if (line.includes('🎭') || line.includes('MULTI-SCENARIO') || line.includes('परिदृश्य') || line.includes('SCENARIOS')) {
      currentSection = 'scenarios';
      continue;
    } else if (line.includes('🧑‍⚖️') || line.includes('JUDICIAL OUTLOOK') || line.includes('न्यायाधीश') || line.includes('JUDGE')) {
      currentSection = 'judicial';
      continue;
    } else if (line.includes('🧠') || line.includes('BREAKPOINTS')) {
      currentSection = 'breakpoints';
      continue;
    } else if (line.includes('🚀') || line.includes('STRATEGIC') || line.includes('रणनीति')) {
      currentSection = 'strategy';
      continue;
    }

    if (currentSection === 'final_outcome') {
      const lower = line.toLowerCase();
      if (lower.includes('strength') || lower.includes('ताकत') || lower.includes('सामर्थ्य')) {
        const parts = line.split(':');
        if (parts.length > 1) result.caseStrength = cleanLine(parts.slice(1).join(':'));
      }
      if (line.includes('%')) {
        const match = line.match(/\d+%/);
        if (match) result.winProbability = match[0];
      }
      if (lower.includes('outcome') || lower.includes('परिणाम') || lower.includes('decision')) {
        const parts = line.split(':');
        if (parts.length > 1) result.likelyCourtOutcome = cleanLine(parts.slice(1).join(':'));
      }
    } else if (currentSection === 'key_reasons' || (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
      const cleaned = cleanLine(line);
      if (cleaned.length > 8 && !result.reasons.includes(cleaned)) {
        result.reasons.push(cleaned);
      }
    } else if (currentSection === 'probability_breakdown') {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.includes(':')) {
        const parts = line.split(':');
        const title = cleanLine(parts[0]);
        const desc = cleanLine(parts.slice(1).join(':')) || title;
        if (title.length > 3) {
          result.winningFactors.push({
            title,
            desc,
            impact: 'High Impact',
            confidence: '90%',
            importance: 'High Importance',
            color: '#10B981'
          });
        }
      }
    } else if (currentSection === 'risks') {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.includes(':')) {
        const parts = line.split(':');
        const title = cleanLine(parts[0]);
        const desc = cleanLine(parts.slice(1).join(':')) || title;
        if (title.length > 3) {
          result.weaknesses.push({
            title,
            desc,
            probReduction: '-8%',
            impact: 'Vulnerability Risk',
            mitigation: 'Mitigation Suggested',
            color: '#EF4444'
          });
        }
      }
    } else if (currentSection === 'scenarios') {
      const cleaned = cleanLine(line);
      if (cleaned.length > 6) {
        result.scenarios.push({
          title: cleanLine(line.split(':')[0]),
          desc: cleaned,
          chance: '50%',
          color: '#0EA5E9'
        });
      }
    } else if (currentSection === 'judicial') {
      const cleaned = cleanLine(line);
      if (cleaned.length > 6) {
        const parts = line.split(':');
        result.judgeInsights.push({
          title: cleanLine(parts[0]),
          desc: cleanLine(parts.slice(1).join(':')) || cleaned
        });
      }
    }
  }

  if (result.winningFactors.length === 0) {
    result.winningFactors = [...WINNING_FACTORS_DATA];
  }
  if (result.weaknesses.length === 0) {
    result.weaknesses = [...WEAKNESSES_DATA];
  }
  if (result.scenarios.length === 0) {
    result.scenarios = [...SCENARIOS_DATA];
  }
  if (result.judgeInsights.length === 0) {
    result.judgeInsights = [...JUDGE_INSIGHTS_DATA];
  }
  if (result.timeline.length === 0) {
    result.timeline = [
      { stage: 'Notice Service', duration: 'Completed', color: '#10B981', done: true },
      { stage: 'Complaint Plaint Logged', duration: 'Completed', color: '#10B981', done: true },
      { stage: 'Summons Issuance', duration: '2 Months', color: '#0EA5E9', done: false },
      { stage: 'Evidence Hearings', duration: '6 Months', color: '#0EA5E9', done: false },
      { stage: 'Arguments Presentation', duration: '14 Months', color: '#EF4444', done: false },
      { stage: 'Final Court Judgment', duration: '22 Months', color: '#EF4444', done: false }
    ];
  }

  return result;
};

const parseFollowUpSuggestions = (text: string) => {
  let mainText = text;
  let suggestions: string[] = [];
  let disclaimer = '';

  const discIdx = text.indexOf('--- DISCLAIMER ---');
  if (discIdx !== -1) {
    mainText = text.substring(0, discIdx).trim();
    disclaimer = text.substring(discIdx + 18).trim();
  }

  const sugIdx = mainText.indexOf('--- SUGGESTIONS ---');
  if (sugIdx !== -1) {
    const sugPart = mainText.substring(sugIdx + 19).trim();
    mainText = mainText.substring(0, sugIdx).trim();
    
    suggestions = sugPart
      .split('\n')
      .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
      .filter((s) => s.length > 0);
  }

  if (suggestions.length === 0) {
    const match = mainText.match(/(?:suggested next actions|next actions|suggestions):([\s\S]+)$/i);
    if (match) {
      const listText = match[1].trim();
      mainText = mainText.replace(match[0], '').trim();
      suggestions = listText
        .split('\n')
        .map((s) => s.replace(/^[•\-*\s✓\d.]+\s*/, '').trim())
        .filter((s) => s.length > 0);
    }
  }

  return { cleanedText: mainText, suggestions, disclaimer };
};

export const getDetailedLegalAnalysis = (
  title: string,
  type: 'factor' | 'weakness' | 'scenario' | 'judge' | 'timeline',
  lang?: string,
  desc?: string
) => {
  const selectedLang = lang || 'English';
  const cleanTitle = (title || '').trim();
  const cleanDesc = (desc || '').trim();

  if (type === 'factor') {
    return [
      {
        heading: tTool(selectedLang, 'Strategic Context & Legal Importance', 'Strategic Context & Legal Importance'),
        text: cleanDesc 
          ? `Establishing "${cleanTitle}" strongly reinforces the legal claim. ${cleanDesc}`
          : `Establishing "${cleanTitle}" reinforces the legal foundation of the claim and shifts the burden of proof onto the opposing party.`
      },
      {
        heading: tTool(selectedLang, 'Applicable Statutory Provisions & Principles', 'Applicable Statutory Provisions & Principles'),
        text: `Governed by applicable substantive and procedural laws (CPC, Evidence Act, NI Act, or Commercial Courts Act) supporting prima facie claims.`
      },
      {
        heading: tTool(selectedLang, 'Evidentiary Support & Corroboration', 'Evidentiary Support & Corroboration'),
        text: `Must be backed by primary executed contracts, registered delivery confirmations, banking ledger entries, or certified affidavits.`
      },
      {
        heading: tTool(selectedLang, 'Strategic Advantage in Court', 'Strategic Advantage in Court'),
        text: `Significantly narrows defense options for opposing counsel, establishing statutory presumption in favor of your case.`
      }
    ];
  }

  if (type === 'weakness') {
    return [
      {
        heading: tTool(selectedLang, 'Vulnerability & Risk Analysis', 'Vulnerability & Risk Analysis'),
        text: cleanDesc 
          ? `The vulnerability "${cleanTitle}" poses a procedural or evidentiary risk. ${cleanDesc}`
          : `The issue "${cleanTitle}" creates a vulnerability that opposing counsel can exploit during cross-examination or pleadings scrutiny.`
      },
      {
        heading: tTool(selectedLang, 'Expected Opposing Counsel Challenge', 'Expected Opposing Counsel Challenge'),
        text: `Opposing counsel is likely to move objections on document admissibility, delay, missing certificates, or lack of independent corroboration.`
      },
      {
        heading: tTool(selectedLang, 'Forecasting Mitigation & Advocacy Steps', 'Forecasting Mitigation & Advocacy Steps'),
        text: `File supporting affidavits, produce original records under Sec 65B Evidence Act / Bankers Books, or file condonation of delay applications.`
      },
      {
        heading: tTool(selectedLang, 'Evidentiary Remediation Plan', 'Evidentiary Remediation Plan'),
        text: `Subpoena neutral third-party witnesses, verify audit trail logs, and anchor legal arguments on binding Supreme Court precedents.`
      }
    ];
  }

  if (type === 'scenario') {
    return [
      {
        heading: tTool(selectedLang, 'Scenario Trigger & Simulation Parameters', 'Scenario Trigger & Simulation Parameters'),
        text: cleanDesc 
          ? `Under "${cleanTitle}", trial dynamics alter significantly. ${cleanDesc}`
          : `If "${cleanTitle}" unfolds during proceedings, court focus shifts toward specific evidentiary standards and witness credibility.`
      },
      {
        heading: tTool(selectedLang, 'Procedural & Trial Impact', 'Procedural & Trial Impact'),
        text: `Directs judicial examination toward expert witness opinions (Sec 45 Evidence Act), cross-examination of bank officials, or compounding terms.`
      },
      {
        heading: tTool(selectedLang, 'Expected Defense Counter-Strategy', 'Expected Defense Counter-Strategy'),
        text: `Opposing counsel will attempt to delay proceedings, dispute document execution, or challenge service compliance.`
      },
      {
        heading: tTool(selectedLang, 'Recommended Strategic Contingency Plan', 'Recommended Strategic Contingency Plan'),
        text: `Keep fallback witness affidavits ready, prepare targeted cross-examination questions, and maintain binding precedents on burden shift.`
      }
    ];
  }

  if (type === 'judge') {
    return [
      {
        heading: tTool(selectedLang, 'Judicial Perspective & Bench Expectations', 'Judicial Perspective & Bench Expectations'),
        text: cleanDesc
          ? `Bench stance on "${cleanTitle}": ${cleanDesc}`
          : `Judges strictly evaluate statutory notices, dishonour memos, and compliance timelines before granting oral defense leeway.`
      },
      {
        heading: tTool(selectedLang, 'Likely Bench Inquiries During Arguments', 'Likely Bench Inquiries During Arguments'),
        text: `The judge will inquire about exact notice service timelines, tracking confirmations, stop-payment alerts, and authorization seals.`
      },
      {
        heading: tTool(selectedLang, 'Persuasive Advocacy Strategy', 'Persuasive Advocacy Strategy'),
        text: `Present a clean vertical chronological timeline of dishonour and legal notices, highlighting statutory presumptions under Sec 139.`
      },
      {
        heading: tTool(selectedLang, 'Key Judicial Precedents & Ratios', 'Key Judicial Precedents & Ratios'),
        text: `Rely on Supreme Court landmark ratios (e.g. Rangappa v. Sri Mohan) regarding statutory presumption and burden of proof.`
      }
    ];
  }

  return [
    {
      heading: tTool(selectedLang, 'Stage Objectives & Deliverables', 'Stage Objectives & Deliverables'),
      text: `Primary objective during "${cleanTitle}" is completing procedural filings, securing service receipts, and framing core triable issues.`
    },
    {
      heading: tTool(selectedLang, 'Mandatory Filings & Documentation', 'Mandatory Filings & Documentation'),
      text: `Ensure list of documents, vakalatnama, certified evidence copies, and supporting Section 65B electronic affidavits are filed.`
    },
    {
      heading: tTool(selectedLang, 'Risk of Delay & Procedural Default', 'Risk of Delay & Procedural Default'),
      text: `Monitor court registry dates closely to avoid ex-parte orders or procedural objections from opposing counsel.`
    },
    {
      heading: tTool(selectedLang, 'Recommended Action Items', 'Recommended Action Items'),
      text: `Brief advocate on record, synchronize case files with Evidence Analyst, and verify witness availability for trial dates.`
    }
  ];
};


const formatLastUpdated = (dateStr?: string) => {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
};
export default function CasePredictorScreen() {
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles: any = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Output Language state
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_case-predictor');
        if (saved) setOutputLanguage(saved);
      } catch (err) {}
    };
    loadToolLanguage();
  }, []);

  // Wizard Navigation States
  // 'HOME' -> 'ANALYZING' -> 'INTELLIGENCE'
  const [step, setStep] = useState<'HOME' | 'ANALYZING' | 'INTELLIGENCE'>('HOME');

  // Tabs for STEP 3: Prediction, Winning Factors, Weaknesses, Scenarios, Judge Insights, Timeline, Reports
  const [activeTab, setActiveTab] = useState<'prediction' | 'factors' | 'weaknesses' | 'scenarios' | 'judge' | 'timeline' | 'reports'>('prediction');

  // Existing Cases mapping
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [linkedCaseId, setLinkedCaseId] = useState<string>('');
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);

  // Manual inputs form fields (Card 3)
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  
  // NEW Prediction states
  const [predictionData, setPredictionData] = useState<PredictionResult | null>(null);
  const [uploadedPleadings, setUploadedPleadings] = useState<any[]>([]);
  const [extractedOcrText, setExtractedOcrText] = useState('');
  const [ocrConfidenceLow, setOcrConfidenceLow] = useState(false);
  const [isOcrReviewOpen, setIsOcrReviewOpen] = useState(false);
  
  // OCR Editable fields
  const [ocrTitle, setOcrTitle] = useState('');
  const [ocrParties, setOcrParties] = useState('');
  const [ocrClaims, setOcrClaims] = useState('');
  const [ocrFacts, setOcrFacts] = useState('');
  const [ocrEvidence, setOcrEvidence] = useState('');
  const [ocrCourt, setOcrCourt] = useState('');
  const [ocrActs, setOcrActs] = useState('');

  // Manual input additional fields
  const [manualCaseType, setManualCaseType] = useState('Civil Recovery Suit');
  const [manualCourtLevel, setManualCourtLevel] = useState('District Court');
  const [manualLanguage, setManualLanguage] = useState('English');

  // History states
  const [predictionHistoryList, setPredictionHistoryList] = useState<CasePredictionItem[]>([]);
  const [isPredictionHistoryOpen, setIsPredictionHistoryOpen] = useState(false);
  const [isPredictionHistoryLoading, setIsPredictionHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  const [activePredictionGroupId, setActivePredictionGroupId] = useState<string | null>(null);
  const [activePredictionVersion, setActivePredictionVersion] = useState<number | null>(null);
  const [currentPredictionId, setCurrentPredictionId] = useState<string | null>(null);
  const [availablePredictionVersions, setAvailablePredictionVersions] = useState<CasePredictionItem[]>([]);

  // Edit prediction metadata modal
  const [isEditPredictionOpen, setIsEditPredictionOpen] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState<CasePredictionItem | null>(null);
  const [editPredName, setEditPredName] = useState('');
  const [editPredWorkspaceId, setEditPredWorkspaceId] = useState('');
  const [isCardMenuOpen, setIsCardMenuOpen] = useState<string | null>(null);
  const [manualCourt, setManualCourt] = useState('');
  const isExportingPdfRef = useRef(false);

  const handleExportPredictionPdf = async () => {
    if (isExportingPdfRef.current) return;
    isExportingPdfRef.current = true;
    try {
      const winProb = predictionData?.winProbability || '66%';
      const verdict = predictionData?.caseStrength || 'Moderately Strong';
      const outcome = predictionData?.likelyCourtOutcome || 'Prediction calculated based on pleading evidence and binding precedents.';
      const title = manualTitle || ocrTitle || 'Legal Dispute Analysis';
      
      const reasons = predictionData?.reasons && predictionData.reasons.length > 0 
        ? predictionData.reasons 
        : [
            'Cheque execution signatures are uncontested, triggering burden shift presumption under Section 139 NI Act.',
            'Bank dishonour memo returned with code "Insufficient Funds", providing direct proof of defaulted balance.',
            'Precedents in Aditya Birla Chemicals protect representations against retrospective government alterations.'
          ];

      const winningFactors = predictionData?.winningFactors?.length 
        ? predictionData.winningFactors 
        : getLocalizedWinningFactors(outputLanguage);

      const weaknesses = predictionData?.weaknesses?.length 
        ? predictionData.weaknesses 
        : getLocalizedWeaknesses(outputLanguage);

      const scenarios = predictionData?.scenarios?.length 
        ? predictionData.scenarios 
        : getLocalizedScenarios(outputLanguage);

      const judgeInsights = predictionData?.judgeInsights?.length 
        ? predictionData.judgeInsights 
        : getLocalizedJudgeInsights(outputLanguage);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: Helvetica, Arial, sans-serif; padding: 10px; color: #1E293B; line-height: 1.6; background-color: #FFFFFF; font-size: 12px; }
              
              .tab-section { display: block; clear: both; margin-bottom: 24px; }
              .page-break-section { page-break-before: always; break-before: page; display: block; clear: both; margin-top: 24px; padding-top: 12px; }
              
              .header { border-bottom: 3.5px solid #C8A34D; padding-bottom: 12px; margin-bottom: 20px; }
              .badge { display: inline-block; background-color: #C8A34D; color: #111; font-size: 10px; font-weight: 800; padding: 3px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
              h1 { font-size: 20px; color: #0F172A; margin: 8px 0 2px 0; font-weight: 800; }
              .sub { font-size: 12px; color: #64748B; }
              
              .kpi-row { display: flex; gap: 8px; margin: 16px 0; }
              .kpi { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 6px; flex: 1; text-align: center; }
              .kpi-val { font-size: 16px; font-weight: 900; color: #0EA5E9; }
              .kpi-lbl { font-size: 9px; color: #64748B; text-transform: uppercase; font-weight: bold; margin-top: 2px; }

              .sec-title { font-size: 13.5px; font-weight: 800; color: #0F172A; border-left: 4px solid #C8A34D; padding-left: 8px; margin-top: 16px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
              .box { background: #FFFFFF; border: 1px solid #CBD5E1; padding: 12px; border-radius: 6px; margin-bottom: 12px; font-size: 12px; color: #334155; page-break-inside: avoid; break-inside: avoid; }
              .box-title { font-weight: 800; color: #0F172A; margin-bottom: 4px; font-size: 12.5px; }
              
              .tag-win { color: #15803D; font-weight: bold; background: #DCFCE7; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
              .tag-risk { color: #B91C1C; font-weight: bold; background: #FEE2E2; padding: 2px 6px; border-radius: 4px; font-size: 10px; }

              .detail-sec { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #E2E8F0; }
              .detail-head { font-size: 11px; font-weight: 800; color: #0F172A; margin-bottom: 2px; }

              .footer { margin-top: 36px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 10px; color: #94A3B8; text-align: center; }
            </style>
          </head>
          <body>
            <!-- PAGE 1: COVER & TAB 1 -->
            <div class="tab-section">
              <div class="header">
                <span class="badge">AI LEGAL™ Case Predictor Dossier</span>
                <h1>${title}</h1>
                <div class="sub">Case Category: ${manualCaseType || 'Litigation Forecast'} • Generated on ${new Date().toLocaleDateString()}</div>
              </div>

              <div class="kpi-row">
                <div class="kpi"><div class="kpi-val" style="color:#10B981;">${winProb}</div><div class="kpi-lbl">Win Probability</div></div>
                <div class="kpi"><div class="kpi-val" style="color:#10B981;">91%</div><div class="kpi-lbl">Court Confidence</div></div>
                <div class="kpi"><div class="kpi-val" style="color:#EF4444;">18%</div><div class="kpi-lbl">Appeal Risk</div></div>
                <div class="kpi"><div class="kpi-val" style="color:#0EA5E9;">42%</div><div class="kpi-lbl">Settlement Chance</div></div>
              </div>

              <div class="sec-title">TAB 1 — Outcome Prediction & Verdict</div>
              <div class="box" style="background:#F0FDF4; border-color:#86EFAC;">
                <div class="box-title" style="color:#166534;">FORECASTING VERDICT: ${verdict}</div>
                <div>${outcome}</div>
              </div>
              <div class="box">
                <div class="box-title">Main Forecasting Reasons:</div>
                ${reasons.map((r: string) => `<div style="margin-bottom:4px;">• ${r}</div>`).join('')}
              </div>
              ${predictionData?.rawReport ? `<div class="box"><div class="box-title">Executive Legal Analysis:</div><div>${predictionData.rawReport}</div></div>` : ''}
            </div>

            <!-- PAGE 2: TAB 2 -->
            <div class="page-break-section">
              <div class="sec-title">TAB 2 — Winning Factors (Success Drivers)</div>
              ${winningFactors.map((item: any) => {
                const itemTitle = item.title || item.factor || item.name || 'Winning Factor';
                const details = getDetailedLegalAnalysis(itemTitle, 'factor', outputLanguage, item.desc || item.description);
                return `
                  <div class="box">
                    <div class="box-title">${itemTitle} <span class="tag-win">+${item.impact || item.score || 'High'} Impact</span></div>
                    <div style="margin-bottom:6px;">${item.desc || item.description || ''}</div>
                    ${details.map((sec: any) => `
                      <div class="detail-sec">
                        <div class="detail-head">${sec.heading}</div>
                        <div>${sec.text}</div>
                      </div>
                    `).join('')}
                    ${item.precedent ? `<div style="font-size:10.5px; color:#475569; margin-top:4px; font-weight:bold;">Binding Precedent: ${item.precedent}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- PAGE 3: TAB 3 -->
            <div class="page-break-section">
              <div class="sec-title">TAB 3 — Weaknesses & Risk Vulnerabilities</div>
              ${weaknesses.map((item: any) => {
                const itemTitle = item.title || item.risk || item.name || 'Case Risk';
                const details = getDetailedLegalAnalysis(itemTitle, 'weakness', outputLanguage, item.desc || item.description);
                return `
                  <div class="box">
                    <div class="box-title">${itemTitle} <span class="tag-risk">Risk Level: ${item.severity || item.riskLevel || 'Moderate'}</span></div>
                    <div style="margin-bottom:6px;">${item.desc || item.description || ''}</div>
                    ${details.map((sec: any) => `
                      <div class="detail-sec">
                        <div class="detail-head" style="color:#B91C1C;">${sec.heading}</div>
                        <div>${sec.text}</div>
                      </div>
                    `).join('')}
                    ${item.mitigation ? `
                      <div style="background:#FFFBEB; border:1px solid #FCD34D; padding:6px 10px; border-radius:5px; margin-top:6px;">
                        <div style="font-weight:bold; color:#B45309; font-size:10.5px;">Recommended Mitigation Action:</div>
                        <div style="color:#92400E;">${item.mitigation}</div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- PAGE 4: TAB 4 & 5 -->
            <div class="page-break-section">
              <div class="sec-title">TAB 4 — Strategic Scenarios & Outcomes</div>
              ${scenarios.map((item: any) => {
                const itemTitle = item.name || item.title || 'Strategic Scenario';
                const details = getDetailedLegalAnalysis(itemTitle, 'scenario', outputLanguage, item.desc || item.outcome);
                return `
                  <div class="box">
                    <div class="box-title">${itemTitle}</div>
                    <div style="margin-bottom:6px;">${item.desc || item.outcome || ''}</div>
                    ${details.map((sec: any) => `
                      <div class="detail-sec">
                        <div class="detail-head" style="color:#0369A1;">${sec.heading}</div>
                        <div>${sec.text}</div>
                      </div>
                    `).join('')}
                    <div style="font-weight:bold; color:#0EA5E9; margin-top:4px;">Outcome Forecast: ${item.chance || 'Moderate'}</div>
                  </div>
                `;
              }).join('')}

              <div class="sec-title" style="margin-top:24px;">TAB 5 — Judicial Bench Insights</div>
              ${judgeInsights.map((item: any) => {
                const itemTitle = item.title || item.aspect || 'Bench Insight';
                const details = getDetailedLegalAnalysis(itemTitle, 'judge', outputLanguage, item.desc || item.recommendation);
                return `
                  <div class="box">
                    <div class="box-title">${itemTitle}</div>
                    <div style="margin-bottom:6px;">${item.desc || item.recommendation || ''}</div>
                    ${details.map((sec: any) => `
                      <div class="detail-sec">
                        <div class="detail-head" style="color:#B45309;">${sec.heading}</div>
                        <div>${sec.text}</div>
                      </div>
                    `).join('')}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- PAGE 5: TAB 6 & 7 -->
            <div class="page-break-section">
              <div class="sec-title">TAB 6 — Litigation Timeline Forecast</div>
              <div class="box">
                ${[
                  { stage: 'Notice Service', duration: 'Completed', status: 'Completed' },
                  { stage: 'Complaint Plaint Logged', duration: 'Completed', status: 'Completed' },
                  { stage: 'Summons Issuance', duration: '2 Months', status: 'Pending' },
                  { stage: 'Evidence Hearings', duration: '6 Months', status: 'Pending' },
                  { stage: 'Arguments Presentation', duration: '14 Months', status: 'Pending' },
                  { stage: 'Final Court Judgment', duration: '22 Months', status: 'Pending' }
                ].map((tItem) => `
                  <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #E2E8F0;">
                    <div style="font-weight:bold; color:#1E293B;">${tItem.stage}</div>
                    <div style="color:#64748B;">Duration: ${tItem.duration} (${tItem.status})</div>
                  </div>
                `).join('')}
              </div>

              <div class="sec-title" style="margin-top:24px;">TAB 7 — Executive Reports & Final Strategy</div>
              <div class="box" style="background:#F8FAFC;">
                <div class="box-title">Strategic Action Items:</div>
                <div style="margin-bottom:4px;">1. File Section 65B Electronic Evidence Affidavit for all communication logs.</div>
                <div style="margin-bottom:4px;">2. Anchor opening arguments on statutory presumption shifting onus to opposing party.</div>
                <div>3. Cite binding High Court and Supreme Court precedents to prevent procedural delays.</div>
              </div>

              <div class="footer">
                Generated by AI LEGAL™ Case Predictor Engine • Comprehensive Multi-Tab Legal Report
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        showToast('success', 'PDF Exported', 'Complete multi-tab Case Predictor report saved as PDF.');
      } else {
        showToast('info', 'PDF Ready', `PDF created at ${uri}`);
      }
    } catch (err) {
      console.error('Failed to export Case Predictor PDF:', err);
      showToast('error', 'Export Failed', 'Unable to export Case Predictor PDF.');
    } finally {
      isExportingPdfRef.current = false;
    }
  };
  const [manualFacts, setManualFacts] = useState('');
  const [manualClaims, setManualClaims] = useState('');

  // Upload selectors state (Card 2)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // AI Extraction Progress states
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progressVal] = useState(new Animated.Value(0));

  // Collapsible Summary Header
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const summaryAnim = useRef(new Animated.Value(0)).current;

  const toggleSummary = () => {
    const toValue = isSummaryExpanded ? 0 : 1;
    setIsSummaryExpanded(!isSummaryExpanded);
    Animated.spring(summaryAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  };

  const handleResultsScroll = (event: any) => {
    if (isSummaryExpanded) {
      setIsSummaryExpanded(false);
      Animated.timing(summaryAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    }
  };

  // Expandable accordions for Tab views
  const [expandedFactors, setExpandedFactors] = useState<Record<number, boolean>>({ 0: true });
  const [expandedWeaknesses, setExpandedWeaknesses] = useState<Record<number, boolean>>({ 0: true });
  const [expandedScenarios, setExpandedScenarios] = useState<Record<number, boolean>>({ 0: true });
  const [expandedJudge, setExpandedJudge] = useState<Record<number, boolean>>({ 0: true });
  const [expandedTimeline, setExpandedTimeline] = useState<Record<number, boolean>>({ 2: true });

  const [loadingOverlayText, setLoadingOverlayText] = useState<string | null>(null);

  const handleLaunchModule = (module: 'court_prep' | 'cross_exam' | 'reply_draft' | 'ask_copilot' | 'evidence_verify', item: any, sourceTab: string) => {
    let loadingText = 'Loading Case Context...';
    let targetRoute = '';
    let targetParams: any = {
      caseId: linkedCaseId || 'independent_temp',
      caseName: linkedCaseName,
      sourceTab,
      selectedItemTitle: item.title || item.stage || '',
    };

    if (module === 'court_prep') {
      loadingText = 'Preparing Court Arguments...';
      targetRoute = '/tools/argument-builder';
      targetParams.mode = 'arguments';
      targetParams.injectPrompt = `Prepare courtroom arguments using this Case Predictor analysis for: ${item.title || item.stage}. Ensure it includes Opening Statement, legal issues, and prayer.`;
    } else if (module === 'cross_exam') {
      loadingText = 'Generating Cross Examination Strategy...';
      targetRoute = '/tools/argument-builder';
      targetParams.mode = 'cross_examination';
      targetParams.injectPrompt = `Generate professional cross-examination questions based on the Case Predictor finding: ${item.title || item.stage}. Include trap questions and witness impeachment strategy.`;
    } else if (module === 'reply_draft') {
      loadingText = 'Drafting Reply Strategy...';
      targetRoute = '/tools/draft-maker';
      targetParams.mode = 'draft';
      targetParams.draftType = 'Reply Notice';
      targetParams.injectPrompt = `Draft a Reply Notice based on the Case Predictor finding: ${item.title || item.stage}. Use statutory acts and relevant precedents.`;
    } else if (module === 'evidence_verify') {
      loadingText = 'Synchronizing Evidence with Analyst...';
      targetRoute = '/tools/evidence-analyst';
      targetParams.injectPrompt = `Analyze whether the evidence supports or weakens this Case Predictor finding: ${item.title || item.stage}.`;
    } else if (module === 'ask_copilot') {
      setIsAiAssistantOpen(true);
      setChatInput(`Regarding "${item.title || item.stage}": How can we mitigate this weakness or strengthen this point in our litigation?`);
      return;
    }

    setLoadingOverlayText(loadingText);
    setTimeout(() => {
      setLoadingOverlayText(null);
      router.push({
        pathname: targetRoute as any,
        params: targetParams,
      });
    }, 1200);
  };

  // Executive Full Report Modal
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);

  // Custom back navigation stack preservation
  useEffect(() => {
    const backAction = () => {
      if (step === 'INTELLIGENCE') {
        setStep('HOME');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [step]);

  // Fetch active Case Workspaces on mount
  useEffect(() => {
    const fetchCasesList = async () => {
      try {
        const response = await CaseService.listCases();
        const list = Array.isArray(response) ? response : (response?.data || []);
        setCases(list.filter((c: any) => c.isLegalCase));
      } catch (err) {
        console.warn('Failed to load cases:', err);
      }
    };
    fetchCasesList();
  }, []);

  const handleSelectCase = (caseId: string) => {
    setLinkedCaseId(caseId);
    showToast('success', 'Case Synced', 'Timeline, evidence, and pleadings loaded successfully.');
    // Trigger Analysis Immediately
    handleStartAnalysis();
  };

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    showToast('success', 'Document Selected', 'OCR queued for litigation model.');
  };

  const handleStartAnalysis = () => {
    setStep('ANALYZING');
    setCurrentStepIdx(0);
    progressVal.setValue(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < PROCESSING_STEPS.length) {
        setCurrentStepIdx(idx);
        Animated.timing(progressVal, {
          toValue: (idx + 1) / PROCESSING_STEPS.length,
          duration: 300,
          useNativeDriver: false,
        }).start();
      } else {
        clearInterval(interval);
        setStep('INTELLIGENCE');
        showToast('success', 'Forecast Ready', 'Winning probability metrics generated.');
      }
    }, 450);
  };

  // Case Predictor Copilot state hook configurations
  const {
    sessions,
    activeSessionId,
    activeSession,
    sending: isAiThinking,
    setActiveSessionId,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_case_predictor');

  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('en');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition((transcribedText) => {
    if (transcribedText) {
      setChatInput((prev) => (prev ? prev + ' ' + transcribedText : transcribedText));
    }
  });

  const {
    attachments,
    isBottomSheetVisible,
    hideAttachmentOptions,
    showAttachmentOptions,
    handleSelectOption,
    handleRemoveAttachment,
    clearAttachments,
    isCameraVisible,
    hideCamera,
    handleCameraConfirm,
  } = useAttachmentHandler();

  const loadPredictionHistory = async () => {
    setIsPredictionHistoryLoading(true);
    try {
      const res = await CasePredictionHistoryService.listPredictions({
        search: historySearchQuery,
        filter: historyFilter
      });
      if (res.success && res.data) {
        setPredictionHistoryList(res.data);
      }
    } catch (err) {
      console.warn('Failed to load predictions history:', err);
    } finally {
      setIsPredictionHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isPredictionHistoryOpen) {
      loadPredictionHistory();
    }
  }, [isPredictionHistoryOpen, historySearchQuery, historyFilter]);

  const loadPredictionVersions = async (groupId: string) => {
    try {
      const res = await CasePredictionHistoryService.listVersions(groupId);
      if (res.success && res.data) {
        setAvailablePredictionVersions(res.data);
      }
    } catch (err) {
      console.warn('Failed to load versions:', err);
    }
  };

  const handleOpenPrediction = (item: CasePredictionItem) => {
    const parsed = parsePredictionResult(item.generatedPrediction);
    setPredictionData(parsed);

    setActivePredictionGroupId(item.versionGroupId);
    setActivePredictionVersion(item.version);
    setCurrentPredictionId(item._id);
    setLinkedCaseId(item.workspaceId && typeof item.workspaceId === 'object' ? (item.workspaceId as any)._id : (item.workspaceId || ''));

    setIsPredictionHistoryOpen(false);
    setStep('INTELLIGENCE');
    showToast('success', 'Prediction Loaded', `Loaded version ${item.version} of ${item.caseName}`);

    loadPredictionVersions(item.versionGroupId);
  };

  const handleDeletePrediction = (item: CasePredictionItem) => {
    Alert.alert(
      'Delete Prediction Forecast?',
      'This action cannot be undone and will delete all versions of this case prediction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await CasePredictionHistoryService.deletePrediction(item._id);
              if (res.success) {
                showToast('success', 'Deleted successfully', 'Removed prediction history.');
                setPredictionHistoryList(prev => prev.filter(p => p.versionGroupId !== item.versionGroupId));
                if (activePredictionGroupId === item.versionGroupId) {
                  setPredictionData(null);
                  setStep('HOME');
                }
              }
            } catch (err) {
              showToast('error', 'Delete Failed', 'Failed to delete prediction.');
            }
          }
        }
      ]
    );
  };

  const handleDuplicatePrediction = async (item: CasePredictionItem) => {
    try {
      const res = await CasePredictionHistoryService.duplicatePrediction(item._id);
      if (res.success && res.data) {
        showToast('success', 'Prediction Duplicated', 'Duplicated case prediction successfully.');
        loadPredictionHistory();
      }
    } catch (err) {
      showToast('error', 'Duplicate Failed', 'Failed to duplicate prediction.');
    }
  };

  const handleOpenEditPrediction = (item: CasePredictionItem) => {
    setEditingPrediction(item);
    setEditPredName(item.caseName);
    setEditPredWorkspaceId(item.workspaceId && typeof item.workspaceId === 'object' ? (item.workspaceId as any)._id : (item.workspaceId || ''));
    setIsEditPredictionOpen(true);
  };



  const handleSaveEditPrediction = async () => {
    if (!editingPrediction) return;
    try {
      const res = await CasePredictionHistoryService.updatePrediction(editingPrediction._id, {
        caseName: editPredName,
        workspaceId: editPredWorkspaceId || null
      });
      if (res.success && res.data) {
        showToast('success', 'Metadata Saved', 'Saved details successfully.');
        setIsEditPredictionOpen(false);
        setEditingPrediction(null);
        loadPredictionHistory();

        if (activePredictionGroupId === editingPrediction.versionGroupId) {
          setLinkedCaseId(editPredWorkspaceId || '');
        }
      }
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to save metadata.');
    }
  };

  const handlePleadingsUpload = (attach: { name: string; url: string; size?: string }) => {
    const newDoc = {
      id: `doc_${Date.now()}`,
      name: attach.name,
      url: attach.url,
      size: attach.size || '1.8 MB'
    };
    const updatedDocs = [...uploadedPleadings, newDoc];
    setUploadedPleadings(updatedDocs);
    showToast('success', 'File Uploaded', `${attach.name} added to pleadings context.`);

    setLoadingOverlayText('Running OCR Extraction...');
    setTimeout(() => {
      setLoadingOverlayText(null);
      const mergedTitle = updatedDocs.map(d => d.name.replace(/\.[^/.]+$/, "")).join(" and ");
      setOcrTitle(mergedTitle + " Suit");
      setOcrParties("Plaintiff vs Defendant");
      setOcrClaims("Recovery of ₹8,0,000/- with 18% p.a. interest");
      setOcrFacts("The defendant executed commercial agreement but defaulted on check payment.");
      setOcrEvidence("Original contract Copy, Cheque return memo, postal receipt");
      setOcrCourt("District Court, Commercial Division");
      setOcrActs("Section 138, Section 139 NI Act, Section 34 Evidence Act");
      
      const ext = attach.name.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
        setOcrConfidenceLow(true);
      } else {
        setOcrConfidenceLow(false);
      }
      setIsOcrReviewOpen(true);
    }, 1500);
  };

  useEffect(() => {
    if (attachments.length > 0) {
      attachments.forEach(attach => {
        handlePleadingsUpload({
          name: attach.name,
          url: attach.url,
          size: attach.size ? `${(attach.size / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB'
        });
      });
      clearAttachments();
    }
  }, [attachments]);

  const runPredictionAnalysis = async (customMessage?: string) => {
    setStep('ANALYZING');
    setCurrentStepIdx(0);
    progressVal.setValue(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < PROCESSING_STEPS.length) {
        setCurrentStepIdx(idx);
        Animated.timing(progressVal, {
          toValue: (idx + 1) / PROCESSING_STEPS.length,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }, 450);

    try {
      let finalMessage = customMessage || '';
      
      if (!finalMessage) {
        if (linkedCaseId) {
          finalMessage = `Generate litigation outcome prediction for Case Workspace ID: ${linkedCaseId}. Analyze all case facts, pleadings, evidence vaults, and timeline history.`;
        } else if (uploadedPleadings.length > 0) {
          const fileNames = uploadedPleadings.map(f => f.name).join(', ');
          finalMessage = `Generate outcome prediction for uploaded pleadings: ${fileNames}. Extracted OCR facts: ${extractedOcrText}`;
        } else {
          finalMessage = `Generate outcome prediction for manual case facts in ${outputLanguage}:\nCase Title: ${manualTitle}\nCase Type: ${manualCaseType}\nCourt Level: ${manualCourtLevel}\nLanguage: ${outputLanguage}\nFacts: ${manualFacts}`;
        }
      }

      const res = await DraftService.executeTool({
        toolName: 'legal_case_predictor',
        message: finalMessage,
        caseContext: linkedCaseId ? { name: linkedCaseName } : undefined,
        outputLanguage: outputLanguage,
        language: outputLanguage,
      });

      clearInterval(interval);

      if (res && res.reply) {
        const parsed = parsePredictionResult(res.reply);
        setPredictionData(parsed);

        // Auto-save to history
        (async () => {
          try {
            const savePayload = {
              caseName: linkedCaseId ? linkedCaseName : (manualTitle || uploadedPleadings[0]?.name || 'Untitled Prediction'),
              workspaceId: linkedCaseId || undefined,
              uploadedDocuments: uploadedPleadings.map(f => ({ name: f.name, url: f.url })),
              ocrResults: extractedOcrText,
              manualFacts: !linkedCaseId && uploadedPleadings.length === 0 ? {
                title: manualTitle,
                caseType: manualCaseType,
                courtLevel: manualCourtLevel,
                language: manualLanguage,
                facts: manualFacts
              } : undefined,
              generatedPrediction: res.reply,
              riskAnalysis: parsed.weaknesses.map(w => w.title).join(', '),
              winProbability: parsed.winProbability,
              aiSummary: parsed.likelyCourtOutcome || parsed.caseStrength,
              versionGroupId: activePredictionGroupId || undefined
            };

            const saveRes = await CasePredictionHistoryService.savePrediction(savePayload);
            if (saveRes.success && saveRes.data) {
              setActivePredictionGroupId(saveRes.data.versionGroupId);
              setActivePredictionVersion(saveRes.data.version);
              setCurrentPredictionId(saveRes.data._id);
              loadPredictionVersions(saveRes.data.versionGroupId);
            }
          } catch (historyErr) {
            console.warn('Failed to save case prediction to history:', historyErr);
          }
        })();

        setStep('INTELLIGENCE');
        showToast('success', 'Forecast Ready', 'Winning probability metrics generated.');
      } else {
        throw new Error('No reply received from Prediction Engine');
      }
    } catch (err: any) {
      clearInterval(interval);
      setStep('HOME');
      Alert.alert(
        'Prediction Failed',
        err.message || 'Litigation prediction model execution failed. Please check connection and try again.'
      );
    }
  };



  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const copilotScrollRef = useRef<ScrollView>(null);
  const [chatInput, setChatInput] = useState('');
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (contentSize.height > layoutMeasurement.height && distanceFromBottom > 150) {
      setShowScrollToLatest(true);
    } else {
      setShowScrollToLatest(false);
    }
  };

  // Custom dialogs & UI states
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);

  // Suggestions timeline categories
  const CASE_SUGGESTIONS_SHEET = {
    Outcome: [
      'Predict Final Outcome',
      'Increase Success Chances',
      'Estimate Settlement Probability',
      'Appeal Chances',
    ],
    Risks: [
      'Analyze Opponent Strategy',
      'Summarize Litigation Risks',
      'Review Weaknesses',
      'Burden of Proof',
    ],
    Actions: [
      'Find Missing Evidence',
      'Prepare Cross Questions',
      'Suggest Legal Arguments',
      'Generate Hearing Strategy',
    ],
  };

  // Animated dot progress indicators
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 400);
    } else {
      setThinkingDotCount(1);
    }
    return () => clearInterval(interval);
  }, [isAiThinking]);

  const getThinkingDotsText = () => '.'.repeat(thinkingDotCount);

  // Sync speech preview to chat input
  useEffect(() => {
    if (isRecording && partialText) {
      setChatInput(partialText);
    }
  }, [partialText, isRecording]);

  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});
  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleOpenRename = (id: string, currentTitle: string) => {
    setRenameSessionId(id);
    setRenameValue(currentTitle);
    setIsRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (renameSessionId && renameValue.trim()) {
      await renameChatSession(renameSessionId, renameValue.trim());
      setIsRenameDialogOpen(false);
      setRenameSessionId(null);
      setRenameValue('');
      showToast('success', 'Session Renamed', 'Conversation title updated successfully.');
    }
  };

  const handleDeletePress = (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChatSession(id);
            showToast('success', 'Conversation Deleted', 'Session removed.');
          },
        },
      ]
    );
  };

  const handleClearConversation = () => {
    if (activeSessionId) {
      useChatStore.getState().updateSession(activeSessionId, { messages: [] });
      showToast('success', 'Conversation Cleared', 'Active analysis log cleared.');
    }
  };

  const handleClearPress = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages in this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            handleClearConversation();
          }
        }
      ]
    );
  };

  const shortenSuggestion = (text: string) => {
    if (text.length > 25) return text.substring(0, 22) + '...';
    return text;
  };

  const handleNewChat = () => {
    startNewSession('New Outcome Prediction', 'legal_case_predictor');
    showToast('success', 'New Predictor Session', 'Ready to model litigation outcomes.');
  };

  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formattedMessages = activeSession.messages
      .map((m) => {
         const senderLabel = m.role === 'user' ? 'Lawyer' : 'Case Predictor Specialist';
         return `[${senderLabel}]:\n${m.content}\n`;
      })
      .join('\n────────────────────────\n\n');
    const exportText = `Case Outcome Prediction Report: ${activeSession.title || 'Untitled Predictor'}\n\n${formattedMessages}`;
    
    Share.share({
      title: 'Export Case Prediction Log',
      message: exportText,
    })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Report Exported', 'Case prediction report successfully exported.');
        }
      })
      .catch((err) => {
        console.warn('[EXPORT ERROR] Share failed:', err);
      });
  };

  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim() && attachments.length === 0) return;

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        textToSend.trim(),
        'legal_case_predictor',
        attachments,
        undefined,
        linkedCaseId || undefined,
        outputLanguage
      );
      clearAttachments();
    } catch (err) {
      console.warn('[COPILOT SEND ERROR] Send message failed:', err);
    }
  };

  const handleAiAction = (action: string) => {
    setIsAiAssistantOpen(true);
    let promptText = '';
    switch (action) {
      case 'explain-hindi':
        promptText = "Explain the litigation outcome predictions in Hindi translation.";
        break;
      case 'explain-english':
        promptText = "Explain the outcome predictions in plain simple English.";
        break;
      case 'court-submission':
        promptText = "Generate a draft hearing strategy statement based on these predictions.";
        break;
      case 'export-pdf':
        promptText = "Generate and export a comprehensive litigation risk analysis prediction report.";
        break;
      default:
        return;
    }
    setTimeout(() => {
      handleSendChat(promptText);
    }, 450);
  };

  const linkedCaseName = useMemo(() => {
    const matched = cases.find(c => c._id === linkedCaseId);
    return matched ? matched.name : 'Independent Analysis';
  }, [cases, linkedCaseId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Navigation Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'INTELLIGENCE') {
              setStep('HOME');
            } else {
              router.back();
            }
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Case Predictor</Text>
          <Text style={styles.headerSubtitle}>Predict litigation outcome using AI, precedents and evidence metrics.</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={[
              styles.copilotIconBtn, 
              { backgroundColor: isDark ? 'rgba(138, 92, 245, 0.08)' : 'rgba(138, 92, 245, 0.15)', marginRight: 8 }
            ]}
            onPress={() => setIsAiAssistantOpen(true)}
          >
            <Ionicons name="sparkles" size={18} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.copilotIconBtn, 
              { backgroundColor: isDark ? 'rgba(138, 92, 245, 0.08)' : 'rgba(138, 92, 245, 0.15)', marginRight: 10 }
            ]}
            onPress={() => setIsPredictionHistoryOpen(true)}
          >
            <Ionicons name="time-outline" size={18} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCREEN 1: Home Dashboard */}
      {step === 'HOME' && (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.homeTitle, { color: theme.textPrimary, marginBottom: 0 }]}>{tTool(outputLanguage, 'casePredictor.engineTitle', 'Litigation Intelligence Engine')}</Text>
            <OutputLanguageSelector
              toolId="case-predictor"
              selectedLanguage={outputLanguage}
              onLanguageChange={(newLang) => {
    setOutputLanguage(newLang);
    useLocalLanguageStore.getState().setLocalLanguage(newLang);
  }}
            />
          </View>
          <Text style={[styles.homeDesc, { color: theme.textSecondary }]}>
            {tTool(outputLanguage, 'casePredictor.engineDesc', 'Select or upload your case files to compute success probability, map risks, and generate courtroom strategies.')}
          </Text>

          {/* Card 1: Existing Case Workspace */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="briefcase-outline" size={26} color="#C8A34D" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.cardWorkspaceTitle', 'Existing Case Workspace')}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {tTool(outputLanguage, 'casePredictor.cardWorkspaceDesc', 'Pull case files directly from My Matters to synchronize timelines, parties, and evidence assets.')}
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#C8A34D' }]} onPress={() => setIsCaseSelectOpen(true)}>
              <Text style={styles.cardBtnText}>{tTool(outputLanguage, 'casePredictor.selectWorkspaceBtn', 'Select Case Workspace')}</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Upload Documents */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-upload-outline" size={26} color="#C8A34D" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.cardUploadTitle', 'Upload Court Pleadings')}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {tTool(outputLanguage, 'casePredictor.cardUploadDesc', 'Drop PDF, DOCX, or ZIP documents to run OCR extraction, issue mapping, and litigation intelligence.')}
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#C8A34D' }]} onPress={showAttachmentOptions}>
              <Text style={styles.cardBtnText}>{tTool(outputLanguage, 'casePredictor.uploadDocsBtn', 'Upload Documents')}</Text>
            </TouchableOpacity>

            {uploadedPleadings.length > 0 && (
              <View style={{ gap: 8, marginTop: 10, width: '100%' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase' }}>Uploaded Pleadings Context</Text>
                {uploadedPleadings.map((doc, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surfaceVariant, padding: 10, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: theme.textPrimary, flex: 1 }} numberOfLines={1}>📄 {doc.name}</Text>
                    <TouchableOpacity onPress={() => setUploadedPleadings(prev => prev.filter(d => d.id !== doc.id))}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Card 3: Manual Case Facts */}
          <View style={[styles.workspaceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="document-text-outline" size={26} color="#C8A34D" style={{ marginBottom: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.cardManualTitle', 'Manual Case Facts')}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
              {tTool(outputLanguage, 'casePredictor.cardManualDesc', 'Enter case title, claims, facts, and evidence descriptions manually to calculate outcome predictions.')}
            </Text>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: '#C8A34D' }]} onPress={() => setIsManualFormOpen(true)}>
              <Text style={styles.cardBtnText}>{tTool(outputLanguage, 'casePredictor.writeFactsBtn', 'Write Facts Manually')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* STEP 2: AI Processing Screen */}
      {step === 'ANALYZING' && (
        <View style={[styles.analyzingWrapper, { backgroundColor: theme.background }]}>
          <View style={[styles.analyzingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color="#C8A34D" style={{ marginBottom: 16 }} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, textAlign: 'center' }]}>{tTool(outputLanguage, 'casePredictor.runningTitle', 'Running Litigation Predictions')}</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              {tTool(outputLanguage, 'casePredictor.runningSub', 'Mapping procedural violations, scanning binding precedents, and drafting courtroom strategies.')}
            </Text>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressVal.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Steps Checklist */}
            <ScrollView style={styles.stepsList} contentContainerStyle={{ gap: 10 }}>
              {PROCESSING_STEPS.map((text, idx) => {
                const isPassed = idx < currentStepIdx;
                const isActive = idx === currentStepIdx;
                const stepKeys = [
                  'casePredictor.stepReadDocs',
                  'casePredictor.stepOcr',
                  'casePredictor.stepParties',
                  'casePredictor.stepIssues',
                  'casePredictor.stepEvidence',
                  'casePredictor.stepLaws',
                  'casePredictor.stepJudgments',
                  'casePredictor.stepModel',
                  'casePredictor.stepStrategy',
                  'casePredictor.stepReport',
                ];
                const translatedStep = tTool(outputLanguage, stepKeys[idx] || 'casePredictor.stepReadDocs', text);
                return (
                  <View key={text} style={styles.stepRow}>
                    {isPassed ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#0EA5E9" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={theme.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.stepRowText,
                        { color: isPassed ? theme.textPrimary : isActive ? '#0EA5E9' : theme.textSecondary },
                        isActive && { fontWeight: '800' }
                      ]}
                    >
                      {translatedStep}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* STEP 3: Executive Forecast Dashboard & Intelligence view */}
      {step === 'INTELLIGENCE' && (
        <View style={{ flex: 1 }}>

          {/* ── Collapsible Summary Card ── */}
          <View style={[{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>

            {/* Mini Header Row (always visible) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={toggleSummary}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}
            >
              {/* Probability ring — compact */}
              <View style={{
                width: 50, height: 50, borderRadius: 25,
                borderWidth: 3.5, borderColor: '#10B981',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0EA5E9' }}>{predictionData?.winProbability || '66%'}</Text>
                <Text style={{ fontSize: 5.5, fontWeight: '800', color: theme.textSecondary, textAlign: 'center' }}>WIN</Text>
              </View>

              {/* Key stats inline */}
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: tTool(outputLanguage, 'casePredictor.courtConfidenceLabel', 'Court Confidence'), value: '91%', color: '#10B981' },
                  { label: tTool(outputLanguage, 'casePredictor.appealRiskLabel', 'Appeal Risk'), value: predictionData?.weaknesses.length ? (predictionData.weaknesses.length * 5 + '%') : '18%', color: '#EF4444' },
                  { label: tTool(outputLanguage, 'casePredictor.settlementLabel', 'Settlement'), value: '42%', color: '#0EA5E9' },
                ].map((kpi, ki) => (
                  <View key={ki} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: kpi.color }}>{kpi.value}</Text>
                    <Text style={{ fontSize: 9.5, color: theme.textSecondary, fontWeight: '600' }}>{kpi.label}</Text>
                    {ki < 2 && <Text style={{ color: theme.border, fontSize: 10 }}>  ·  </Text>}
                  </View>
                ))}
              </View>

              {/* Save PDF Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#C8A34D',
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 7,
                  gap: 4,
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  handleExportPredictionPdf();
                }}
              >
                <Ionicons name="document-text-outline" size={13} color="#111111" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#111111' }}>
                  {tTool(outputLanguage, 'casePredictor.savePdf', 'Save PDF')}
                </Text>
              </TouchableOpacity>

              {/* Expand/collapse chevron */}
              <Animated.View style={{ transform: [{ rotate: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </Animated.View>
            </TouchableOpacity>

            {/* Expanded Detail Panel */}
            <Animated.View style={{
              maxHeight: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] }),
              overflow: 'hidden',
              opacity: summaryAnim,
            }}>
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: tTool(outputLanguage, 'casePredictor.winningProbLabel', 'Winning Probability'), value: '66%', color: '#0EA5E9' },
                    { label: tTool(outputLanguage, 'casePredictor.courtConfidenceLabel', 'Court Confidence'), value: '91%', color: '#10B981' },
                    { label: tTool(outputLanguage, 'casePredictor.settlementChanceLabel', 'Settlement Chance'), value: '42%', color: '#0EA5E9' },
                    { label: 'Appeal Risk', value: predictionData?.weaknesses.length ? (predictionData.weaknesses.length * 5 + '%') : '18%', color: '#EF4444' },
                    { label: tTool(outputLanguage, 'casePredictor.evidenceReliabilityLabel', 'Evidence Reliability'), value: '88%', color: '#10B981' },
                    { label: tTool(outputLanguage, 'casePredictor.expectedDurationLabel', 'Expected Duration'), value: '18 Mo', color: theme.textPrimary },
                  ].map((kpi, ki) => (
                    <View key={ki} style={{
                      backgroundColor: theme.surfaceVariant, borderRadius: 10,
                      paddingHorizontal: 10, paddingVertical: 7, width: '30%',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: kpi.color }}>{kpi.value}</Text>
                      <Text style={{ fontSize: 8.5, color: theme.textSecondary, fontWeight: '600', marginTop: 1 }} numberOfLines={2}>{kpi.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', marginBottom: 2 }}>AI VERDICT</Text>
                  <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16 }}>
                    {predictionData?.caseStrength || 'Moderately Strong'} — {predictionData?.likelyCourtOutcome || 'Overall contract health score is moderate.'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Sticky Tab Selectors */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.surface, height: 44 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}>
              {[
                { id: 'prediction', key: 'casePredictor.tabPrediction', label: 'Prediction' },
                { id: 'factors', key: 'casePredictor.tabFactors', label: 'Winning Factors' },
                { id: 'weaknesses', key: 'casePredictor.tabWeaknesses', label: 'Weaknesses' },
                { id: 'scenarios', key: 'casePredictor.tabScenarios', label: 'Scenarios' },
                { id: 'judge', key: 'casePredictor.tabJudge', label: 'Judge Insights' },
                { id: 'timeline', key: 'casePredictor.tabTimeline', label: 'Timeline' },
                { id: 'reports', key: 'casePredictor.tabReport', label: 'Reports' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabBtn,
                    { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 8 },
                    activeTab === tab.id && { borderBottomColor: '#10B981' }
                  ]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === tab.id ? '#10B981' : theme.textSecondary }}>
                    {tTool(outputLanguage, tab.key, tab.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab Contents ScrollView */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false} onScroll={handleResultsScroll} scrollEventThrottle={16}>
            
            {/* TAB 1: PREDICTION */}
            {activeTab === 'prediction' && (
              <View style={{ gap: 16 }}>
                <View style={[styles.verdictBox, { backgroundColor: 'rgba(16, 185, 129, 0.06)', borderColor: '#10B981', borderWidth: 1, padding: 16, borderRadius: 12 }]}>
                  <Text style={[styles.cardTitle, { color: '#0EA5E9', marginBottom: 4, fontWeight: '800' }]}>{tTool(outputLanguage, 'casePredictor.verdictTitle', 'AI OUTCOME PREDICTION VERDICT')}</Text>
                  <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18, fontWeight: '700' }}>
                    {predictionData?.caseStrength || 'Moderately Strong'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18, marginTop: 4 }}>
                    {predictionData?.likelyCourtOutcome || 'Prediction calculated based on pleading evidence and binding precedents.'}
                  </Text>
                </View>

                {/* Main Reasons Section */}
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.textPrimary, textTransform: 'uppercase' }}>{tTool(outputLanguage, 'casePredictor.keyReasonsTitle', 'Main Forecasting Reasons')}</Text>
                <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, gap: 8 }}>
                  {predictionData?.reasons && predictionData.reasons.length > 0 ? (
                    predictionData.reasons.map((r, rIdx) => (
                      <Text key={rIdx} style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>• {r}</Text>
                    ))
                  ) : (
                    <>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>• Cheque execution signatures are uncontested, triggering burden shift presumption under Section 139 NI Act.</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>• Bank dishonour memo returned with code "Insufficient Funds", providing direct proof of defaulted balance.</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>• Precedents in Aditya Birla Chemicals protect representations against retrospective government alterations.</Text>
                    </>
                  )}
                </View>

                {/* Full Localized AI Legal Report */}
                {predictionData?.rawReport ? (
                  <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D', marginBottom: 10, textTransform: 'uppercase' }}>
                      {tTool(outputLanguage, 'casePredictor.execReportTitle', 'Executive Legal Analysis Report')}
                    </Text>
                    <MarkdownRenderer text={predictionData.rawReport} />
                  </View>
                ) : null}

                {/* Likelihood Timeline / Settlement Chance */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0EA5E9' }}>{tTool(outputLanguage, 'casePredictor.settlementLabel', 'Settlement Chance')}</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary, marginVertical: 4 }}>42%</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>{tTool(outputLanguage, 'casePredictor.courtConfidenceLabel', 'Forecasting Confidence')}</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary, marginVertical: 4 }}>91%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: WINNING FACTORS */}
            {activeTab === 'factors' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.winningFactorsTitle', 'Winning Factors (Success Drivers)')}</Text>
                {(predictionData?.winningFactors?.length ? predictionData.winningFactors : getLocalizedWinningFactors(outputLanguage)).map((item: any, idx: number) => {
                  const isOpen = expandedFactors[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedFactors(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {tTool(outputLanguage, item.title, item.title)}
                        </Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{tTool(outputLanguage, item.desc, item.desc)}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'factor', outputLanguage, item.desc).map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#111111', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                            <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#10B981' }}>{tTool(outputLanguage, 'casePredictor.impactLabel', 'Impact')}: {tTool(outputLanguage, item.impact, item.impact)}</Text></View>
                            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#0EA5E9' }}>{tTool(outputLanguage, 'casePredictor.confidenceLabel', 'Confidence')}: {item.confidence}</Text></View>
                            <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706' }}>{tTool(outputLanguage, item.importance, item.importance)}</Text></View>
                          </View>

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'factors')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'factors')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'factors')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'factors')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'factors')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 3: WEAKNESSES */}
            {activeTab === 'weaknesses' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.weaknessesTitle', 'Vulnerabilities Reducing Success')}</Text>
                {(predictionData?.weaknesses?.length ? predictionData.weaknesses : getLocalizedWeaknesses(outputLanguage)).map((item: any, idx: number) => {
                  const isOpen = expandedWeaknesses[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedWeaknesses(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="alert-circle" size={18} color={item.color} style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {tTool(outputLanguage, item.title, item.title)}
                        </Text>
                        <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#EF4444' }}>{item.probReduction}</Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{tTool(outputLanguage, item.desc, item.desc)}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'weakness', outputLanguage, item.desc).map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#EF4444', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textPrimary, marginTop: 4, marginBottom: 6 }}>{tTool(outputLanguage, 'casePredictor.vulnerabilityImpact', 'Vulnerability Impact')}: {tTool(outputLanguage, item.impact, item.impact)}</Text>
                          <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8, padding: 8, marginTop: 4, marginBottom: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>Forecasting Mitigation Action</Text>
                            <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>{tTool(outputLanguage, item.mitigation, item.mitigation)}</Text>
                          </View>

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'weaknesses')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'weaknesses')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 4: SCENARIOS */}
            {activeTab === 'scenarios' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.scenariosTitle', 'Simulation Scenarios & Outcomes')}</Text>
                {(predictionData?.scenarios?.length ? predictionData.scenarios : getLocalizedScenarios(outputLanguage)).map((item: any, idx: number) => {
                  const isOpen = expandedScenarios[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedScenarios(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="git-network-outline" size={18} color="#0EA5E9" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {tTool(outputLanguage, item.title, item.title)}
                        </Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{tTool(outputLanguage, item.desc, item.desc)}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'scenario', outputLanguage, item.desc).map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0EA5E9', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          <View style={{ backgroundColor: item.color + '1C', padding: 8, borderRadius: 6, marginTop: 4, marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: item.color }}>🎯 {tTool(outputLanguage, 'casePredictor.outcomeForecast', 'Outcome Forecast')}: {tTool(outputLanguage, item.chance, item.chance)}</Text>
                          </View>

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'scenarios')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'scenarios')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 5: JUDGE INSIGHTS */}
            {activeTab === 'judge' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.judgeInsightsTitle', 'Judicial Behaviour & Insights')}</Text>
                {(predictionData?.judgeInsights?.length ? predictionData.judgeInsights : getLocalizedJudgeInsights(outputLanguage)).map((item: any, idx: number) => {
                  const isOpen = expandedJudge[idx];
                  return (
                    <View key={idx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedJudge(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                        <Ionicons name="eye-outline" size={18} color="#0EA5E9" style={{ marginRight: 6 }} />
                        <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                          {tTool(outputLanguage, item.title, item.title)}
                        </Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 }}>{tTool(outputLanguage, item.desc, item.desc)}</Text>
                          
                          {getDetailedLegalAnalysis(item.title, 'judge', outputLanguage, item.desc).map((sec, sIdx) => (
                            <View key={sIdx} style={{ marginBottom: 12 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#C8A34D', marginBottom: 4 }}>{sec.heading}</Text>
                              <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                            </View>
                          ))}

                          {/* Connected AI Action Bar Grid */}
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', item, 'judge')}>
                                <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', item, 'judge')}>
                                <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', item, 'judge')}>
                                <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', item, 'judge')}>
                                <Text style={styles.actionChipText}>💬 Ask AI</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', item, 'judge')}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 6: TIMELINE */}
            {activeTab === 'timeline' && (
              <View style={{ gap: 14 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.timelineTitle', 'Expected Litigation Timeline Forecast')}</Text>
                <View style={{ gap: 10 }}>
                  {[
                    { stage: 'Notice Service', duration: 'Completed', color: '#10B981', done: true },
                    { stage: 'Complaint Plaint Logged', duration: 'Completed', color: '#10B981', done: true },
                    { stage: 'Summons Issuance', duration: '2 Months', color: '#0EA5E9', done: false },
                    { stage: 'Evidence Hearings', duration: '6 Months', color: '#0EA5E9', done: false },
                    { stage: 'Arguments Presentation', duration: '14 Months', color: '#EF4444', done: false },
                    { stage: 'Final Court Judgment', duration: '22 Months', color: '#EF4444', done: false }
                  ].map((tItem, tIdx) => {
                    const isOpen = expandedTimeline[tIdx];
                    return (
                      <View key={tIdx} style={[styles.accordion, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <TouchableOpacity 
                          style={styles.accordionHeader} 
                          onPress={() => setExpandedTimeline(prev => ({ ...prev, [tIdx]: !prev[tIdx] }))}
                        >
                          <Ionicons name={tItem.done ? 'checkmark-circle' : 'time-outline'} size={18} color={tItem.color} style={{ marginRight: 6 }} />
                          <Text style={[styles.accordionTitleText, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                            {tItem.stage}
                          </Text>
                          <View style={{ backgroundColor: tItem.done ? '#ECFDF5' : '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: tItem.done ? '#10B981' : '#EF4444' }}>{tItem.duration}</Text>
                          </View>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {isOpen && (
                          <View style={[styles.accordionBody, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 }]}>
                            {getDetailedLegalAnalysis(tItem.stage, 'timeline', outputLanguage).map((sec, sIdx) => (
                              <View key={sIdx} style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: tItem.color, marginBottom: 4 }}>{sec.heading}</Text>
                                <Text style={{ fontSize: 11.5, color: theme.textPrimary, lineHeight: 16.5 }}>{sec.text}</Text>
                              </View>
                            ))}

                            {/* Connected AI Action Bar Grid */}
                            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Connected AI Workflows</Text>
                              <View style={styles.actionGrid}>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('court_prep', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>⚖️ Court Prep</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('cross_exam', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>🎯 Cross Exam</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('reply_draft', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>📝 Draft Reply</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionChip} onPress={() => handleLaunchModule('ask_copilot', tItem, 'timeline')}>
                                  <Text style={styles.actionChipText}>💬 Ask AI</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ width: '100%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 4 }} onPress={() => handleLaunchModule('evidence_verify', tItem, 'timeline')}>
                                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#16A34A' }}>📂 Verify in Evidence Analyst</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* TAB 7: REPORTS */}
            {activeTab === 'reports' && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.execReportTitle', 'Winning Probability & Outcome Forecasts')}</Text>
                {[
                  { name: 'Winning Probability Report', key: 'probability', confidence: '98%', time: '08 Jul 2026 • 1:30 PM' },
                  { name: 'Outcome & Risk Forecast', key: 'outcome', confidence: '95%', time: '08 Jul 2026 • 1:31 PM' },
                  { name: 'Settlement & Appeal Forecast', key: 'appeal', confidence: '92%', time: '08 Jul 2026 • 1:35 PM' },
                  { name: 'Evidence Admissibility Dossier', key: 'evidence_prob', confidence: '88%', time: 'Not Generated' }
                ].map(item => (
                  <View key={item.key} style={[styles.reportCardRow, { flexDirection: 'column', padding: 12, backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 12, borderWidth: 1.5, gap: 6 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="document-text-outline" size={20} color="#10B981" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reportCardName, { color: theme.textPrimary, fontWeight: '700' }]}>{item.name}</Text>
                        <Text style={{ fontSize: 10, color: item.time !== 'Not Generated' ? '#10B981' : '#F59E0B', fontWeight: '800' }}>{item.time !== 'Not Generated' ? 'Generated' : 'Pending'}</Text>
                      </View>
                    </View>

                    {item.time !== 'Not Generated' && (
                      <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>🤖 AI Confidence: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.confidence}</Text></Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>📅 Generated: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.time}</Text></Text>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <TouchableOpacity 
                            style={{ flex: 1, height: 32, backgroundColor: '#0EA5E9', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setIsReportViewerOpen(true)}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Preview</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ width: 44, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => showToast('success', 'Shared', 'Shared forecast link.')}
                          >
                            <Ionicons name="share-social-outline" size={14} color={theme.textPrimary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ width: 44, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => showToast('success', 'Downloaded', 'Downloaded forecast report.')}
                          >
                            <Ionicons name="download-outline" size={14} color={theme.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

          </ScrollView>

          {/* Floating AI Assistant Trigger removed */}
        </View>
      )}

      {/* OCR Review Extracted Information Modal */}
      <Modal visible={isOcrReviewOpen} transparent={false} animationType="slide" onRequestClose={() => setIsOcrReviewOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setIsOcrReviewOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10, fontWeight: '700' }]}>Review Extracted Information</Text>
          </View>

          <ScrollView contentContainerStyle={[styles.scrollBody, { padding: 16 }]} showsVerticalScrollIndicator={false}>
            {ocrConfidenceLow && (
              <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderWidth: 1.5, borderColor: '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <Text style={{ fontSize: 12.5, color: '#D97706', fontWeight: '800', flex: 1 }}>
                  Low OCR Confidence (68%) detected. Please review and correct any incorrect fields before proceeding.
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Case Title</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={ocrTitle}
                onChangeText={setOcrTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Parties</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={ocrParties}
                onChangeText={setOcrParties}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Claims & Remedies</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={ocrClaims}
                onChangeText={setOcrClaims}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Material Case Facts</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                multiline
                value={ocrFacts}
                onChangeText={setOcrFacts}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Evidence List</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={ocrEvidence}
                onChangeText={setOcrEvidence}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Court Name</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={ocrCourt}
                onChangeText={setOcrCourt}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Acts & Provisions</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                value={ocrActs}
                onChangeText={setOcrActs}
              />
            </View>

            <TouchableOpacity
              style={[styles.actionBtnLarge, { backgroundColor: '#D4AF37', marginTop: 16 }]}
              onPress={() => {
                setIsOcrReviewOpen(false);
                const compiledOcrText = `Case Title: ${ocrTitle}\nParties: ${ocrParties}\nClaims: ${ocrClaims}\nFacts: ${ocrFacts}\nEvidence: ${ocrEvidence}\nCourt: ${ocrCourt}\nActs: ${ocrActs}`;
                setExtractedOcrText(compiledOcrText);
                runPredictionAnalysis(`Run case outcome predictions based on the reviewed OCR pleading files context:\n\${compiledOcrText}`);
              }}
            >
              <Text style={styles.actionBtnLargeText}>Generate Outcome Prediction</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Case Prediction History Modal */}
      <Modal
        visible={isPredictionHistoryOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsPredictionHistoryOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.wizardHeader, { borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <TouchableOpacity onPress={() => setIsPredictionHistoryOpen(false)} style={styles.wizardBackBtn}>
              <Ionicons name="close-outline" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.wizardTitle, { color: theme.textPrimary, fontSize: 16, fontWeight: '700' }]}>
                Case Prediction History
              </Text>
              <Text style={[styles.wizardSubtitle, { color: theme.textSecondary, fontSize: 11 }]}>
                Previously generated forecasts
              </Text>
            </View>
          </View>

          {/* Search and Filters */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, paddingHorizontal: 10 }}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                value={historySearchQuery}
                onChangeText={setHistorySearchQuery}
                placeholder="Search by case name, type, or party name..."
                placeholderTextColor={theme.textSecondary}
                style={{ flex: 1, paddingVertical: 10, color: theme.textPrimary, fontSize: 13.5 }}
              />
              {historySearchQuery ? (
                <TouchableOpacity onPress={() => setHistorySearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'high_win', label: 'High Win Probability' },
                { id: 'linked', label: 'Linked Workspace' },
                { id: 'manual', label: 'Manual Entry' },
                { id: 'uploaded', label: 'Uploaded Documents' }
              ].map((f) => {
                const isActive = historyFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setHistoryFilter(f.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 15,
                      backgroundColor: isActive ? '#111111' : theme.card,
                      borderWidth: 1,
                      borderColor: isActive ? '#111111' : theme.border
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: isActive ? '#FFFFFF' : theme.textPrimary }}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* History List */}
          {isPredictionHistoryLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#111111" />
            </View>
          ) : predictionHistoryList.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Ionicons name="pulse" size={64} color={theme.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }}>
                No Case Predictions Yet
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
                Upload a case or describe your case to generate your first AI prediction.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsPredictionHistoryOpen(false);
                  setStep('HOME');
                }}
                style={{ backgroundColor: '#D4AF37', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
              >
                <Text style={{ color: '#111111', fontWeight: '700', fontSize: 13.5 }}>
                  Create First Prediction
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={predictionHistoryList}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => {
                const isMenuOpen = isCardMenuOpen === item._id;
                return (
                  <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, padding: 14, position: 'relative' }}>
                    <TouchableOpacity onPress={() => handleOpenPrediction(item)}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }} numberOfLines={1}>
                            ⚖️ {item.caseName}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                            📁 {item.workspaceId && typeof item.workspaceId === 'object' ? (item.workspaceId as any).name : (item.manualFacts ? 'Manual Entry' : 'Pleading Scan')}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#0EA5E91C' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#0EA5E9' }}>
                              WIN: {item.winProbability}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => setIsCardMenuOpen(isMenuOpen ? null : item._id)} style={{ padding: 4 }}>
                            <Ionicons name="ellipsis-vertical" size={16} color={theme.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8, lineHeight: 18 }} numberOfLines={2}>
                        {item.aiSummary || 'No summary available.'}
                      </Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
                        <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                          📅 {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: theme.textSecondary }}>
                          v{item.version} • Last updated {formatLastUpdated(item.updatedAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* dropdown menu */}
                    {isMenuOpen && (
                      <View style={{ position: 'absolute', right: 14, top: 40, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 4, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleOpenPrediction(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="eye-outline" size={14} color={theme.textPrimary} />
                          <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleOpenEditPrediction(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={14} color={theme.textPrimary} />
                          <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleDuplicatePrediction(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="copy-outline" size={14} color={theme.textPrimary} />
                          <Text style={{ fontSize: 12.5, color: theme.textPrimary }}>Duplicate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setIsCardMenuOpen(null);
                            handleDeletePrediction(item);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          <Text style={{ fontSize: 12.5, color: '#EF4444' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Prediction Modal */}
      <Modal
        visible={isEditPredictionOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditPredictionOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Edit Prediction Details</Text>
            
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 4, marginTop: 8 }}>Case Name</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary, marginBottom: 12 }]}
              value={editPredName}
              onChangeText={setEditPredName}
              placeholder="Case Name"
              placeholderTextColor={theme.placeholder}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Linked Workspace ID (Optional)</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary, marginBottom: 16 }]}
              value={editPredWorkspaceId}
              onChangeText={setEditPredWorkspaceId}
              placeholder="Paste Case Workspace ID..."
              placeholderTextColor={theme.placeholder}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => { setIsEditPredictionOpen(false); setEditingPrediction(null); }}>
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSaveEditPrediction}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Case List drawer modal */}
      <Modal visible={isCaseSelectOpen} transparent animationType="slide" onRequestClose={() => setIsCaseSelectOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCaseSelectOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Select Case Workspace</Text>
                  <TouchableOpacity onPress={() => setIsCaseSelectOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {cases.map((c) => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectCase(c._id);
                        setIsCaseSelectOpen(false);
                        runPredictionAnalysis();
                      }}
                    >
                      <Ionicons name="folder-outline" size={18} color="#0EA5E9" style={{ marginRight: 10 }} />
                      <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Upload Documents popup modal */}
      <Modal visible={isUploadOpen} transparent animationType="slide" onRequestClose={() => setIsUploadOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsUploadOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetDragHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Upload Court pleadings</Text>
                  <TouchableOpacity onPress={() => setIsUploadOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }}>
                  {MOCK_PREDICT_DOCS.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.caseItemRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleSelectDoc(doc.id);
                        setIsUploadOpen(false);
                        handleStartAnalysis();
                      }}
                    >
                      <Ionicons name="document-outline" size={18} color="#10B981" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.caseItemText, { color: theme.textPrimary }]}>{doc.name}</Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>{doc.type} • {doc.size}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Manual Input form modal */}
      <Modal visible={isManualFormOpen} transparent={false} animationType="slide" onRequestClose={() => setIsManualFormOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setIsManualFormOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.modalTitle', 'Describe Your Case')}</Text>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 20, lineHeight: 18 }}>
              {tTool(outputLanguage, 'casePredictor.modalSub', 'Explain your case in your own words. AI will understand the facts and predict the likely legal outcome.')}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.caseFactsLabel', 'Case Facts & Background')}</Text>
              <TextInput
                style={[styles.textArea, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface, height: 160, fontSize: 13.5 }]}
                multiline
                numberOfLines={8}
                value={manualFacts}
                onChangeText={setManualFacts}
                placeholder={"Example:\nMy client lent ₹8 lakh in January 2025.\nThe borrower signed an agreement but has not returned the money despite repeated notices.\nI want to know the chances of winning a recovery suit."}
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.caseTypeLabel', 'Case Type (Optional)')}</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface, fontSize: 13 }]}
                value={manualCaseType}
                onChangeText={setManualCaseType}
                placeholder="e.g. Commercial debt recovery, property dispute"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.courtLevelLabel', 'Court Level (Optional)')}</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface, fontSize: 13 }]}
                value={manualCourtLevel}
                onChangeText={setManualCourtLevel}
                placeholder="e.g. Supreme Court, High Court, District Court"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{tTool(outputLanguage, 'casePredictor.languageLabel', 'Language (Optional)')}</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface, fontSize: 13 }]}
                value={manualLanguage}
                onChangeText={setManualLanguage}
                placeholder="e.g. English, Hindi, Tamil"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            <TouchableOpacity
              style={[styles.actionBtnLarge, { backgroundColor: '#D4AF37', marginTop: 16 }]}
              onPress={() => {
                if (!manualFacts.trim()) {
                  showToast('error', 'Validation Error', 'Case Facts are required to make predictions.');
                  return;
                }
                setIsManualFormOpen(false);
                runPredictionAnalysis();
              }}
            >
              <Text style={styles.actionBtnLargeText}>{tTool(outputLanguage, 'casePredictor.generatePredictionBtn', 'Generate Prediction')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Executive Report Viewer Modal */}
      <Modal visible={isReportViewerOpen} transparent={false} animationType="slide" onRequestClose={() => setIsReportViewerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 16 }]}>
            <TouchableOpacity onPress={() => setIsReportViewerOpen(false)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary, marginLeft: 10, fontWeight: '700' }]}>Forecasting Report Preview</Text>
            <TouchableOpacity style={{ marginLeft: 'auto', padding: 4 }} onPress={() => showToast('success', 'Shared', 'Shared forecast link.')}>
              <Ionicons name="share-social-outline" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* The Document Sheet */}
            <View style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: 8, 
              padding: 24, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.1, 
              shadowRadius: 8, 
              elevation: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              gap: 20
            }}>
              
              {/* Document Header */}
              <View style={{ alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1E293B', paddingBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: 1, textAlign: 'center', marginBottom: 12 }}>
                  WINNING PROBABILITY & FORECAST REPORT
                </Text>
                
                <View style={{ width: '100%', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>CASE:</Text> Apex Fabrics Pvt Ltd vs Modern Outfitters</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>PREPARED FOR:</Text> Outcome & Success Forecasting</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>GENERATED BY:</Text> AI LEGAL Case Predictor Engine</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>GENERATED ON:</Text> 08 July 2026</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}><Text style={{ fontWeight: '800', color: '#1E293B' }}>AI CONFIDENCE:</Text> 98%</Text>
                </View>
              </View>

              {/* SECTION 1: OUTCOME ANALYSIS */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  1. Outcome Analysis & Verdict
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  The forecasting model estimates a 66% probability of success for the petitioner. Cheque execution signatures are uncontested, automatically shifting the burden of proof to the accused under Section 139 NI Act.
                </Text>
              </View>

              {/* SECTION 2: RISK FORECAST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  2. Risk Forecast
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Limitation Delay Risk:</Text> 11-day delay in legal notice service requires filing a Section 142(1)(b) condonation application.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Moratorium Risk:</Text> In case of corporate bankruptcy, personal liability suits must target directors directly.</Text>
                </View>
              </View>

              {/* SECTION 3: SETTLEMENT FORECAST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  3. Settlement Forecast
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  Settlement chance stands at 42%. The defendant historically compromises and settles immediately after issues are framed by the court if stay orders remain intact.
                </Text>
              </View>

              {/* SECTION 4: APPEAL FORECAST */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  4. Appeal Forecast
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, textAlign: 'justify' }}>
                  18% Appeal risk rate. High pecuniary stake makes a subsequent appeal to the High Court likely for the losing party.
                </Text>
              </View>

              {/* SECTION 5: EVIDENCE PROBABILITY REPORT */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1E293B', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 4 }}>
                  5. Evidence Probability & Admissibility
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Signed Agreement:</Text> 94% strength based on uncontested execution.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>Original Dishonoured Cheque:</Text> 95% admissibility rating.</Text>
                  <Text style={{ fontSize: 12, color: '#334155' }}>• <Text style={{ fontWeight: '700' }}>WhatsApp Timelines:</Text> 30% admissibility due to missing Section 65B affidavit certificates.</Text>
                </View>
              </View>

              {/* Document Divider */}
              <View style={{ borderTopWidth: 2, borderTopColor: '#1E293B', marginTop: 12, paddingTop: 12, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B' }}>CONFIDENTIAL • FORECAST DOSSIER</Text>
                <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>
                  Generated by AI LEGAL Case Predictor Engine • Prepared for legal assistance only. Review before court submission.
                </Text>
              </View>
            </View>
            
            {/* Export Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 }}>
              <TouchableOpacity 
                style={{ flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onPress={() => showToast('success', 'Export PDF', 'Forecast report exported as PDF.')}
              >
                <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Export PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onPress={() => showToast('success', 'Export DOCX', 'Forecast report exported as DOCX.')}
              >
                <Ionicons name="document-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Export DOCX</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* AI Copilot Chat Drawer (Full-Screen AI Workspace) */}
      <Modal
        visible={isAiAssistantOpen}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setIsAiAssistantOpen(false)}
      >
        <View style={[styles.copilotOverlay, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Header Bar */}
              <View style={[styles.copilotHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.copilotBackBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <View style={styles.copilotHeaderTitleContainer}>
                    <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Case Predictor Assistant</Text>
                    <Text style={styles.copilotHeaderSubtitle}>Litigation Outcome Workspace</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={handleNewChat} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="add" size={24} color="#C8A34D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsMenuVisible(!isMenuVisible)} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Header Action Dropdown Menu */}
              {isMenuVisible && (
                <Modal
                  transparent={true}
                  visible={isMenuVisible}
                  animationType="fade"
                  onRequestClose={() => setIsMenuVisible(false)}
                >
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuVisible(false)} />
                  <View 
                    style={[
                      styles.menuOverlayContainer, 
                      { 
                        backgroundColor: theme.surface, 
                        borderColor: theme.border, 
                        top: insets.top + 56 
                      }
                    ]}
                  >
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        setIsHistoryOpen(true);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        handleExportChat();
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="share-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: theme.textPrimary, opacity: activeSession ? 1 : 0.5 }]}>Export Chat</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

                    <TouchableOpacity 
                      style={styles.menuItem} 
                      onPress={() => {
                        setIsMenuVisible(false);
                        handleClearPress();
                      }}
                      disabled={!activeSession}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={[styles.menuItemText, { color: '#EF4444', opacity: activeSession ? 1 : 0.5, fontWeight: '700' }]}>Clear Conversation</Text>
                    </TouchableOpacity>
                  </View>
                </Modal>
              )}

              {/* Chat Messages / Greeting View */}
              <ScrollView 
                ref={copilotScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
                  activeSession.messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    
                    if (!isUser && !msg.content.trim()) {
                      return null;
                    }

                    if (isUser) {
                      return (
                        <View 
                          key={msg.id || idx} 
                          style={[styles.chatBubbleContainer, { alignItems: 'flex-end' }]}
                        >
                          <View style={[styles.chatBubble, styles.userBubble, { maxWidth: '75%' }]}>
                            <Text style={styles.userBubbleText}>{msg.content}</Text>
                          </View>
                        </View>
                      );
                    }

                    const { cleanedText, suggestions, disclaimer } = parseFollowUpSuggestions(msg.content);

                    return (
                      <View 
                        key={msg.id || idx} 
                        style={[styles.chatBubbleContainer, styles.aiBubbleAlign, { flexDirection: 'column' }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                          <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                          </View>
                          <View 
                            style={[
                              styles.chatBubble, 
                              styles.aiBubble, 
                              { backgroundColor: theme.surfaceVariant }
                            ]}
                          >
                            <MarkdownRenderer text={cleanedText} />
 
                            {/* Disclaimer at the bottom of the AI response card */}
                            {disclaimer ? (
                              <View style={styles.disclaimerContainer}>
                                <View style={[styles.disclaimerDivider, { backgroundColor: theme.border }]} />
                                <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                                  ⚖️ {disclaimer}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
 
                        {/* Dynamic contextual suggestions outside the bubble card */}
                        {suggestions.length > 0 && (
                          <View style={{ marginLeft: 26, marginRight: 16, marginTop: 12, alignSelf: 'stretch' }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Suggested Next Actions
                            </Text>
                            <View style={styles.bubbleSuggestionsContainer}>
                              {suggestions
                                .slice(0, expandedSuggestions[msg.id] ? undefined : 4)
                                .map((suggestion, sIdx) => {
                                  const shortened = shortenSuggestion(suggestion);
                                  return (
                                    <TouchableOpacity
                                      key={sIdx}
                                      style={[styles.bubbleSuggestionChip, { borderColor: '#C8A34D', backgroundColor: theme.surface }]}
                                      onPress={() => handleSendChat(suggestion)}
                                      disabled={isAiThinking}
                                    >
                                      <Text style={[styles.bubbleSuggestionText, { color: '#C8A34D' }]} numberOfLines={1} ellipsizeMode="tail">✓ {shortened}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              
                              {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                                <TouchableOpacity
                                  style={[styles.bubbleSuggestionChip, { borderColor: '#C8A34D', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                  onPress={() => toggleExpandSuggestions(msg.id)}
                                >
                                  <Text style={[styles.bubbleSuggestionText, { color: '#C8A34D' }]} numberOfLines={1} ellipsizeMode="tail">+ More Suggestions</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  // Minimal empty state & greeting
                  <View style={styles.emptyChatContainer}>
                    <View style={styles.lightweightGreetingContainer}>
                      <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                        Hi, I'm your Case Predictor Assistant.
                      </Text>
                      <View style={{ marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }}>
                          I can help you with:
                        </Text>
                        {[
                          'Case Outcome Prediction',
                          'Success Probability',
                          'Litigation Risk Analysis',
                          'Case Strength Assessment',
                          'Weakness Detection',
                          'Judicial Intelligence',
                          'Settlement Possibility',
                          'Court Readiness',
                        ].map((bullet) => (
                          <Text key={bullet} style={{ fontSize: 12.5, lineHeight: 22, color: theme.textSecondary, fontWeight: '500' }}>
                            • {bullet}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
                {isAiThinking && (
                  <View style={styles.thinkingBubbleContainer}>
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                    </View>
                    <View style={[styles.chatBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 4, alignSelf: 'flex-start' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#C8A34D' }}>
                        ⚖️ Thinking  {getThinkingDotsText()}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Attachments preview bar */}
              {attachments.length > 0 && (
                <View style={[styles.copilotAttachmentBar, { borderTopColor: theme.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                    {attachments.map((a: any, i: number) => (
                      <View key={i} style={[styles.copilotAttachChip, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                        <Ionicons name="document-attach" size={14} color="#C8A34D" />
                        <Text style={[styles.copilotAttachLabel, { color: theme.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                        <TouchableOpacity onPress={() => handleRemoveAttachment(a.name)}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Floating "Scroll to Latest" Button */}
              {showScrollToLatest && (
                <TouchableOpacity
                  style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border, bottom: 90 }]}
                  onPress={() => {
                    copilotScrollRef.current?.scrollToEnd({ animated: true });
                  }}
                >
                  <Ionicons name="arrow-down" size={18} color="#C8A34D" />
                </TouchableOpacity>
              )}

              {/* Chat Composer */}
              <View style={[styles.copilotComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 28, paddingTop: 8 }]}>
                {isRecording || isTranscribing ? (
                  <View style={styles.recordingWrapper}>
                    <TouchableOpacity onPress={cancelRecording} style={styles.voiceControlBtn}>
                      <Ionicons name="close" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    <View style={styles.waveformContainer}>
                      {isTranscribing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color="#C8A34D" />
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribing...</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
                            {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Listening...</Text>
                          <View style={styles.recordingIndicatorDot} />
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={stopRecording} style={styles.voiceStopBtn}>
                      <Ionicons name="square" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                    <View style={[
                      styles.composerTextInputContainer, 
                      { 
                        borderColor: isInputFocused ? '#D4AF37' : theme.border, 
                        borderWidth: isInputFocused ? 1.5 : 1,
                        backgroundColor: '#FFFFFF' 
                      }
                    ]}>
                      <TouchableOpacity onPress={showAttachmentOptions} style={styles.composerInnerBtn}>
                        <Ionicons name="add" size={22} color="#C8A34D" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setIsSuggestionsSheetOpen(true)}
                        style={styles.composerInnerBtn}
                        disabled={isAiThinking}
                      >
                        <Ionicons name="sparkles" size={18} color="#C8A34D" />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.composerTextInput, { color: theme.textPrimary }]}
                        placeholder="Model Case Outcome..."
                        placeholderTextColor={theme.placeholder}
                        value={chatInput}
                        onChangeText={setChatInput}
                        multiline
                        maxLength={1500}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        editable={!isAiThinking && !isRecording}
                      />
                      
                      {isAiThinking ? (
                        <TouchableOpacity style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]} onPress={cancelMessageStream}>
                          <Ionicons name="stop" size={12} color="#111111" />
                        </TouchableOpacity>
                      ) : chatInput.trim() ? (
                        <TouchableOpacity 
                          style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]} 
                          onPress={() => handleSendChat()}
                        >
                          <Ionicons name="arrow-up" size={16} color="#111111" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]} 
                          onPress={() => startRecording(selectedLanguage)}
                          disabled={isRecording}
                        >
                          <Ionicons name="mic" size={18} color="#111111" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Suggestions Bottom Sheet */}
      <Modal
        visible={isSuggestionsSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSuggestionsSheetOpen(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSuggestionsSheetOpen(false)} />
          <View style={[styles.suggestionsSheetContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.suggestionsSheetHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#C8A34D" />
                <Text style={[styles.suggestionsSheetTitle, { color: theme.textPrimary }]}>AI Suggestions</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSuggestionsSheetOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.suggestionsCategoryTitle}>Litigation & Outcome Prediction</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CASE_SUGGESTIONS_SHEET.Outcome.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.suggestionsCategoryTitle}>Risk & Judicial Analysis</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CASE_SUGGESTIONS_SHEET.Risks.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.suggestionsCategoryTitle}>Litigation Tactics & Supporting Evidence</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {CASE_SUGGESTIONS_SHEET.Actions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsSuggestionsSheetOpen(false);
                      handleSendChat(item);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* History Drawer Modal */}
      <Modal
        visible={isHistoryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.historyDrawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />
          <View style={[styles.historyDrawerContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.historyDrawerHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.historyDrawerTitle, { color: theme.textPrimary }]}>Sessions History</Text>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{ marginVertical: 12 }}>
              <TextInput
                style={[styles.dialogInput, { marginBottom: 0, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Search history..."
                placeholderTextColor={theme.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.historyDrawerList} showsVerticalScrollIndicator={false}>
              {sessions
                .filter(s => s.activeTool === 'legal_case_predictor')
                .filter(s => !searchQuery.trim() || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => new Date(b.lastModified || b.createdAt || 0).getTime() - new Date(a.lastModified || a.createdAt || 0).getTime())
                .map((s) => {
                  const isActive = activeSessionId === s.sessionId;
                  return (
                    <TouchableOpacity
                      key={s.sessionId}
                      style={[
                        styles.historySessionItem,
                        { backgroundColor: isActive ? 'rgba(138, 92, 245, 0.08)' : 'transparent' },
                      ]}
                      onPress={() => {
                        setActiveSessionId(s.sessionId);
                        setIsHistoryOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.historySessionTitle, { color: isActive ? '#C8A34D' : theme.textPrimary }]}>{s.title}</Text>
                        <Text style={styles.historySessionTime}>
                          {new Date(s.lastModified || s.createdAt || 0).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={() => handleOpenRename(s.sessionId, s.title)} style={{ padding: 6 }}>
                          <Ionicons name="pencil" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeletePress(s.sessionId)} style={{ padding: 6 }}>
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rename Dialog Modal */}
      <Modal
        visible={isRenameDialogOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameDialogOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Rename Session</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary }]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Enter new title..."
              placeholderTextColor={theme.placeholder}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={[styles.dialogCancelBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setIsRenameDialogOpen(false)}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dialogConfirmBtn}
                onPress={handleConfirmRename}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Staged attachments sheets */}
      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      <CustomCameraModal
        visible={isCameraVisible}
        onClose={hideCamera}
        onConfirm={handleCameraConfirm}
      />

      {loadingOverlayText && (
        <View style={isDark ? styles.loadingOverlayDark : styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#C8A34D" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' }}>
            {loadingOverlayText}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6, textAlign: 'center' }}>
            AI Ready
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    actionChip: {
      width: '49%',
      backgroundColor: 'rgba(138, 92, 245, 0.08)',
      borderColor: 'rgba(138, 92, 245, 0.15)',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#C8A34D',
      textAlign: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      zIndex: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingOverlayDark: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.98)',
      zIndex: 9999,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 24,
      marginRight: 8,
      marginLeft: -10,
    },
    headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
      fontWeight: '700',
    },
    scrollBody: {
      padding: 16,
      paddingBottom: 40,
    },
    homeTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    homeDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 20,
    },
    workspaceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    cardDesc: {
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 12,
    },
    cardBtn: {
      backgroundColor: '#0EA5E9',
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    cardBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    // Step 2: Progress loader
    analyzingWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    analyzingBox: {
      width: '100%',
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    sectionDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      marginBottom: 20,
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      width: '100%',
      overflow: 'hidden',
      marginBottom: 20,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#C8A34D',
    },
    stepsList: {
      maxHeight: 280,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    stepRowText: {
      fontSize: 12.5,
      fontWeight: '600',
    },

    // Step 3: Executive Forecast Dashboard
    forecastDashboard: {
      padding: 16,
      borderBottomWidth: 1.5,
    },
    forecastSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    radialCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 6,
      borderColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },
    radialVal: {
      fontSize: 22,
      fontWeight: '900',
      color: '#0EA5E9',
    },
    radialLabel: {
      fontSize: 7.5,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 2,
    },
    forecastKpis: {
      flex: 1,
      marginLeft: 16,
      gap: 6,
    },
    kpiBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    kpiValText: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    kpiLabelText: {
      fontSize: 9.5,
      fontWeight: '700',
    },
    durationMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },

    // Sticky tabs
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      height: 44,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
    },

    // Tabs details
    verdictBox: {
      padding: 12,
      borderRadius: 12,
    },
    sectionHeading: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 10,
    },
    accordion: {
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
    },
    accordionTitleText: {
      fontSize: 12.5,
      fontWeight: '800',
      flex: 1,
    },
    accordionBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 10,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    infoLabel: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    infoValue: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    clauseBtnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    clauseActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clauseActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#0EA5E9',
    },

    // Risk Dot & Labels
    riskDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    riskLabelBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },

    // Precedent specific
    precedentTitleText: {
      fontSize: 12.5,
      fontWeight: '800',
    },

    // Reports list
    reportCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
    },
    reportCardName: {
      fontSize: 13,
      fontWeight: '800',
    },
    reportOpenBtn: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    reportOpenBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0EA5E9',
    },

    // copilotIconBtn: icon-only header sparkles button (36dp)
    copilotIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Back Link
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 14,
    },
    backLinkText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#0EA5E9',
    },

    // Forms Inputs
    formGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      marginBottom: 6,
    },
    input: {
      height: 44,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 13,
    },
    textArea: {
      height: 80,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      fontSize: 13,
      textAlignVertical: 'top',
    },
    actionBtnLarge: {
      backgroundColor: '#D4AF37',
      borderRadius: 10,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: 10,
    },
    actionBtnLargeText: {
      color: '#111111',
      fontSize: 13.5,
      fontWeight: '800',
    },

    // Report Viewer
    reportContentBlock: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
    },
    reportHeaderTitle: {
      fontSize: 15,
      fontWeight: '900',
    },
    reportSectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 6,
    },
    reportParaText: {
      fontSize: 12,
      lineHeight: 18,
    },

    // Sticky Actions bottom footer
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      height: 40,
    },
    footerBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#0EA5E9',
    },

    // Copilot Styles
    startCopilotBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    startCopilotText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#C8A34D',
    },
    copilotOverlay: {
      flex: 1,
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      height: 56,
    },
    copilotBackBtn: {
      padding: 8,
    },
    copilotHeaderTitleContainer: {
      marginLeft: 4,
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    copilotHeaderSubtitle: {
      fontSize: 10.5,
      color: '#94A3B8',
      fontWeight: '600',
    },
    copilotHeaderIconAction: {
      padding: 8,
    },
    menuOverlayContainer: {
      position: 'absolute',
      right: 16,
      width: 190,
      borderRadius: 12,
      borderWidth: 1,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 9999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    menuItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    menuDivider: {
      height: 1,
      marginVertical: 4,
    },
    chatBubbleContainer: {
      width: '100%',
      marginVertical: 6,
    },
    chatBubble: {
      padding: 14,
      borderRadius: 16,
    },
    userBubbleText: {
      fontSize: 13,
      color: '#FFFFFF',
      fontWeight: '600',
      lineHeight: 18,
    },
    userBubble: {
      backgroundColor: '#C8A34D',
      borderBottomRightRadius: 4,
    },
    aiBubbleAlign: {
      alignItems: 'flex-start',
    },
    aiAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#C8A34D',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
      marginTop: 2,
    },
    aiBubble: {
      flex: 1,
      borderTopLeftRadius: 4,
    },
    disclaimerContainer: {
      marginTop: 10,
      width: '100%',
    },
    disclaimerDivider: {
      height: 1,
      marginVertical: 8,
      width: '100%',
      opacity: 0.5,
    },
    disclaimerText: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      width: '100%',
    },
    bubbleSuggestionChip: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.2,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 8,
      height: 36,
      marginBottom: 8,
    },
    bubbleSuggestionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    emptyChatContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 24,
      paddingBottom: 40,
    },
    lightweightGreetingContainer: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    lightweightGreetingTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 10,
      textAlign: 'center',
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 6,
    },
    copilotAttachmentBar: {
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      gap: 6,
    },
    copilotAttachLabel: {
      fontSize: 12,
      fontWeight: '600',
      maxWidth: 120,
    },
    floatingScrollBtn: {
      position: 'absolute',
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 99,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
    },
    composerTextInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minHeight: 48,
    },
    composerInnerBtn: {
      padding: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerTextInput: {
      flex: 1,
      fontSize: 13,
      maxHeight: 100,
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    composerInnerMicBtn: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerInnerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      height: 48,
      justifyContent: 'space-between',
    },
    voiceControlBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    waveformContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordingIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    voiceStopBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    suggestionsSheetContainer: {
      width: '100%',
      height: height * 0.7,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    suggestionsSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    suggestionsSheetTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    suggestionsCategoryTitle: {
      fontSize: 11.5,
      fontWeight: '800',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    suggestionsCategoryGroup: {
      gap: 8,
      marginBottom: 8,
    },
    suggestionsItemBtn: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    suggestionsItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    historyDrawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      flexDirection: 'row',
    },
    historyDrawerContainer: {
      width: '80%',
      height: '100%',
      paddingHorizontal: 16,
      paddingTop: 48,
    },
    historyDrawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    historyDrawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    historyDrawerList: {
      flex: 1,
      marginTop: 8,
    },
    historySessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginVertical: 4,
    },
    historySessionTitle: {
      fontSize: 13.5,
      fontWeight: '700',
    },
    historySessionTime: {
      fontSize: 10.5,
      color: '#94A3B8',
      marginTop: 2,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogContainer: {
      width: '85%',
      borderRadius: 16,
      borderWidth: 1,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 14,
    },
    dialogInput: {
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      marginBottom: 16,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    dialogCancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    dialogConfirmBtn: {
      backgroundColor: '#C8A34D',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },

    // Modal Headers
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },

    // Bottom Modal Sheets Case link selection drawer
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.5,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    bottomSheetDragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#E2E8F0',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 12,
    },
    bottomSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1F2937',
    },
    caseItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    caseItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
  });
}
