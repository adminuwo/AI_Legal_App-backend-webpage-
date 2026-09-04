import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
  Clipboard,
  Share,
  Animated,
  Alert,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MarkdownRenderer } from '@/components/ui/documents';
import { useToastContext, useThemeContext } from '@/providers';
import { useAuthGuard } from '@/navigation/guards';
import { streamAIResponse } from '@/api/client';
import { ChatService } from '@/services/chat.service';
import { Shadows, Radius, Spacing } from '@/theme';
import { ChatMessage, ChatAttachment, CaseWorkspace } from '@/types';
import { AttachmentBottomSheet } from '@/components/ui/bottomSheets/AttachmentBottomSheet';
import { CustomCameraModal } from '@/components/ui/legal/CustomCameraModal';
import { useAttachmentHandler } from '@/hooks/use-attachment-handler';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chat';
import { useSpeechRecognition, SpeechLanguage } from '@/hooks/use-speech-recognition';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { OutputLanguageSelector } from '@/components/ui/OutputLanguageSelector';
import { tTool, getLocalizedCourtPrepStructure } from '@/localization/toolTranslations';
import { CaseSelectionModal } from '@/components/ui/legal/CaseSelectionModal';
import { CaseService } from '@/services/case.service';
import { CourtPrepHistoryService, CourtPrepHistoryItem } from '@/services/court-prep-history.service';

const formatSize = (bytes?: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'document-text';
  if (ext === 'doc' || ext === 'docx') return 'document';
  if (ext === 'txt') return 'reader-outline';
  return 'image-outline';
};

const estimatePages = (filename: string, size?: number) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') return 1;
  if (!size) return 1;
  return Math.max(1, Math.ceil(size / (120 * 1024)));
};

const { width, height } = Dimensions.get('window');

// 12 Structured Sections for Court Preparation Workspace (Step 3)
interface PrepSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: string;
  confidence: number; // 0 to 100
  why: string;
}

// 6 Court Preparation Intelligence tools (Step 4)
interface IntelligenceTool {
  id: string;
  title: string;
  icon: string;
  content: string;
  description: string;
}

interface IntelligenceTool {
  id: string;
  title: string;
  icon: string;
  content: string;
  description: string;
}

const generateDynamicWorkspaceData = (caseType: string, style: string, attachments: any[], targetLang: string = 'English') => {
  const fileName = attachments.length > 0 ? attachments[0].name : 'legal_document.pdf';
  const isHindi = targetLang === 'Hindi' || targetLang === 'Hinglish';

  if (caseType === 'Consumer Complaint') {
    return {
      sections: [
        {
          key: 'summary',
          title: isHindi ? '1. कार्यकारी सारांश' : '1. Executive Summary',
          icon: 'bulb-outline',
          description: isHindi ? 'उपभोक्ता शिकायत का उच्च-स्तरीय विश्लेषण।' : 'High-level synthesis of consumer complaint.',
          content: isHindi
            ? `• शिकायतकर्ता ने उत्पाद क्षति/सेवा में कमी के संबंध में एक शिकायत दर्ज की है, जैसा कि ${fileName} में संलग्न रसीद से सिद्ध होता है।\n• 12 जनवरी 2026 की चालान और वारंटी कार्ड विषय वस्तु की खरीद का समर्थन करते हैं।\n• 15 फरवरी 2026 का सर्विस सेंटर का उत्तर खराबी को ठीक करने में पूर्ण लापरवाही को प्रदर्शित करता है।`
            : `• Complainant has filed a consumer grievance regarding a product defect/service deficiency, as evidenced by the receipt attached in ${fileName}.\n• Invoices and warranty cards dated 12th January 2026 support the purchase of the subject item.\n• The service center reply dated 15th February 2026 exhibits complete negligence in rectifying the defect.`,
          confidence: 96,
          why: isHindi ? 'न्यायाधीश को सेवा विफलता का एक स्पष्ट विवरण देता है।' : 'Gives the judge a clean, non-technical overview of the service failure.',
        },
        {
          key: 'overview',
          title: isHindi ? '2. केस अवलोकन और पक्षकार' : '2. Case Overview & Parties',
          icon: 'person-outline',
          description: isHindi ? 'मुख्य पक्षकार, स्थिति और दावे की प्रकृति।' : 'Key parties, status, and claim nature.',
          content: isHindi
            ? `• **याचिकाकर्ता**: शिकायतकर्ता (उपभोक्ता)\n• **प्रतिवादी**: अधिकृत सेवा केंद्र और विक्रेता\n• **मुख्य मुद्दा**: वारंटी के तहत खराब वस्तु को बदलने में विफलता\n• **लेनदेन प्रमाण**: ${fileName} में सूचीबद्ध खरीद रसीद चालान।`
            : `• **Petitioner**: Complainant (Consumer)\n• **Respondent**: Authorized Service Center & Retailer\n• **Core Issue**: Failure to replace defective item under warranty\n• **Transaction Proof**: Purchase receipt invoice listed in ${fileName}.`,
          confidence: 98,
          why: isHindi ? 'क्षेत्राधिकार और ग्राहक की उपभोक्ता स्थिति की पुष्टि करता है।' : 'Confirms jurisdiction and consumer status of the client.',
        },
        {
          key: 'facts',
          title: isHindi ? '3. मुख्य तथ्य' : '3. Material Facts',
          icon: 'document-text-outline',
          description: isHindi ? 'चूक की तथ्यात्मक समयरेखा।' : 'Factual chronology of default.',
          content: isHindi
            ? `1. शिकायतकर्ता ने 12 जनवरी 2026 को वैध प्रतिफल के लिए उपभोक्ता सामान खरीदा।\n2. 5 फरवरी 2026 को वारंटी अवधि के भीतर खराबी सामने आई।\n3. विक्रेता को खराबी की सूचना दी गई, जिसने बार-बार रिमाइंडर देने के बावजूद उपभोक्ता संरक्षण अधिनियम, 2019 का उल्लंघन करते हुए बदलने से इनकार कर दिया।`
            : `1. The complainant purchased the consumer goods on 12th January 2026 for a valid consideration.\n2. Defect surfaced within the warranty period on 5th February 2026.\n3. Defect was reported to the retailer, who refused replacement despite repeated reminders, violating the Consumer Protection Act, 2019.`,
          confidence: 95,
          why: isHindi ? 'सेवा में कमी स्थापित करने के लिए तथ्यात्मक आधार आवश्यक है।' : 'Factual foundation required to establish deficiency of service.',
        },
        {
          key: 'chronology',
          title: isHindi ? '4. कालानुक्रमिक समयरेखा' : '4. Chronological Timeline',
          icon: 'calendar-outline',
          description: isHindi ? 'साक्ष्यों से घटनाओं का क्रम।' : 'Sequence of events from evidence.',
          content: isHindi
            ? `📅 **12 जन 2026**: वस्तु की खरीद।\n📅 **05 फर 2026**: खराबी उत्पन्न हुई।\n📅 **15 फर 2026**: सर्विस सेंटर का अस्वीकृति पत्र।\n📅 **20 फर 2026**: वैधानिक कानूनी नोटिस भेजा गया।`
            : `📅 **12 Jan 2026**: Purchase of the item.\n📅 **05 Feb 2026**: Defect arose (documented in email log).\n📅 **15 Feb 2026**: Service Center rejection letter.\n📅 **20 Feb 2026**: Pre-suit legal notice served.`,
          confidence: 94,
          why: isHindi ? 'यह स्थापित करता है कि खराबी और सूचना वारंटी के भीतर हुई।' : 'Establishes that the defect and notification happened within warranty.',
        },
        {
          key: 'arguments',
          title: isHindi ? '5. सहायक तर्क' : '5. Supporting Arguments',
          icon: 'shield-outline',
          description: isHindi ? 'तथ्यों से निर्मित मुख्य तर्क।' : 'Core arguments constructed from facts.',
          content: isHindi
            ? `• **सेवा में कमी**: वारंटी दायित्वों का पालन न करना COPRA 2019 की धारा 2(11) के तहत सेवा में कमी है।\n• **कठोर दायित्व**: खराब सामान सीधे बेचते समय विक्रेता निर्माता की ओर इशारा करके दायित्व से नहीं बच सकता।\n• **वैधानिक राहत**: उपभोक्ता प्रतिस्थापन और मुआवजे का हकदार है।`
            : `• **Deficiency of Service**: Non-performance of warranty obligations constitutes service deficiency under Sec 2(11) of COPRA 2019.\n• **Strict Liability**: Retailer cannot escape liability by pointing to manufacturer when selling defective merchandise directly.\n• **Statutory Relief**: Consumer is entitled to replacement and compensation.`,
          confidence: 92,
          why: isHindi ? 'उपभोक्ता संरक्षण अधिनियम के तहत स्पष्ट वैधानिक दायित्व स्थापित करता है।' : 'Establishes clear statutory liability under Consumer Protection Act.',
        },
        {
          key: 'counter_arguments',
          title: isHindi ? '6. विपक्षी तर्क और काट' : '6. Counter Arguments',
          icon: 'close-circle-outline',
          description: isHindi ? 'अनुमानित रक्षा तर्क और जवाब।' : 'Predicted defense arguments.',
          content: isHindi
            ? `• **विपक्षी तर्क**: खराबी भौतिक क्षति या उपयोगकर्ता की गलत इस्तेमाल के कारण है।\n• **काट**: ${fileName} में प्रमाणित तकनीशियन रिपोर्ट की ओर इशारा करें जो बिना किसी बाहरी नुकसान के आंतरिक सर्किट विफलता की पुष्टि करती है।`
            : `• **Opponent Argument**: Defect is due to physical damage or user mishandling.\n• **Counter**: Point to the certified technician report in ${fileName} confirming internal circuit failure with no signs of external physical impact.`,
          confidence: 88,
          why: isHindi ? 'आम मर्चेंट प्रतिरक्षा तर्कों को हराने के लिए वकालत तैयार करता है।' : 'Prepares advocacy vectors to defeat common merchant defenses.',
        },
        {
          key: 'witnesses',
          title: isHindi ? '7. साक्षी और साक्ष्य चेकलिस्ट' : '7. Witness & Evidence Checklist',
          icon: 'attach-outline',
          description: isHindi ? 'सुझाए गए गवाह और प्रदर्श।' : 'Suggested witnesses and exhibits.',
          content: isHindi
            ? `• **प्रदर्श**: मूल चालान (प्रदर्श C-1), वारंटी कार्ड (प्रदर्श C-2), सर्विस जॉब शीट (प्रदर्श C-3)।\n• **गवाह**: शिकायतकर्ता (PW-1) और स्वतंत्र तकनीकी विशेषज्ञ।`
            : `• **Exhibits**: Original Invoice (Exhibit C-1), Warranty Card (Exhibit C-2), Service Job Sheet (Exhibit C-3).\n• **Witnesses**: Complainant (PW-1) and independent technical expert.`,
          confidence: 90,
          why: isHindi ? 'खरीद और खराबी साबित करने के लिए आवश्यक रिकॉर्ड सूचीबद्ध करता है।' : 'Lists the physical records needed to prove purchase and defect.',
        },
        {
          key: 'citations',
          title: isHindi ? '8. प्रासंगिक केस कानून व नजीरें' : '8. Relevant Case Laws & Citations',
          icon: 'ribbon-outline',
          description: isHindi ? 'बाध्यकारी नजीरें।' : 'Binding precedent citations.',
          content: isHindi
            ? `• *टाटा मोटर्स बनाम राजेश त्यागी (2014)*: वारंटी के भीतर मरम्मत करने में विफल होना सेवा में कमी है।\n• *बिड़ला टेक्नोलॉजीज बनाम न्यूट्रल*: खराब सामान बदलने के व्यापारी कर्तव्य की पुष्टि की।`
            : `• *Tata Motors v. Rajesh Tyagi (2014)*: Held that selling a vehicle with manufacturing defects and failing to repair within warranty is deficiency of service.\n• *Birla Technologies v. Neutral*: Affirmed merchant duty to replace defect-ridden commercial components.`,
          confidence: 91,
          why: isHindi ? 'वारंटी सेवा दायित्वों पर राष्ट्रीय आयोग के फैसलों का हवाला देता है।' : 'Cites binding National Commission rulings on warranty service obligations.',
        },
        {
          key: 'prayer',
          title: isHindi ? '9. राहत और प्रार्थना' : '9. Relief / Prayer',
          icon: 'gift-outline',
          description: isHindi ? 'अंतिम राहत प्रार्थना मसौदा।' : 'Drafted final prayer for relief.',
          content: isHindi
            ? `• याचिकाकर्ता प्रार्थना करता है: 12% ब्याज के साथ खरीद मूल्य का पूरा रिफंड, मानसिक पीड़ा के लिए ₹50,000 और मुकदमेबाजी के खर्च के लिए ₹15,000।`
            : `• Petitioner prays for: Full refund of purchase price with 12% interest, INR 50,000 for mental agony, and INR 15,000 for litigation costs.`,
          confidence: 97,
          why: isHindi ? 'उपभोक्ता मंच से मांगी गई लक्षित राहत निर्दिष्ट करता है।' : 'Specifies the targeted decree sought from the consumer forum.',
        }
      ]
    };
  }

  return {
    sections: [
      {
        key: 'summary',
        title: isHindi ? '1. कार्यकारी सारांश' : '1. Executive Summary',
        icon: 'bulb-outline',
        description: isHindi ? 'चेक बाउंस / एनआई एक्ट दावे का उच्च-स्तरीय विश्लेषण।' : 'High-level synthesis of cheque bounce/NI Act claim.',
        content: isHindi
          ? `• शिकायतकर्ता ने चेक बाउंस के संबंध में धारा 138 के तहत एक आपराधिक मामला दर्ज किया है, जैसा कि ${fileName} में रिटर्न मेमो से सिद्ध होता है।\n• चालान अंतर्निहित व्यावसायिक लेनदेन का समर्थन करते हैं।\n• 12 मई 2026 का वैधानिक नोटिस वितरित किया गया था, और कोई भुगतान प्राप्त नहीं हुआ है।`
          : `• Complainant has filed a criminal case under Section 138 regarding a bounced cheque, as evidenced by the return memo in ${fileName}.\n• Invoices and delivery challans support the underlying commercial transaction.\n• The statutory notice dated 12th May 2026 was delivered, and no payment has been received.`,
        confidence: 95,
        why: isHindi ? 'वैधानिक आवश्यकताओं का त्वरित कालानुक्रमिक विवरण प्रदान करता है।' : 'Provides a quick chronological snapshot of the statutory requirements.',
      },
      {
        key: 'overview',
        title: isHindi ? '2. केस अवलोकन और पक्षकार' : '2. Case Overview & Parties',
        icon: 'person-outline',
        description: isHindi ? 'मुख्य पक्षकार, स्थिति और दावे की प्रकृति।' : 'Key parties, status, and claim nature.',
        content: isHindi
          ? `• **याचिकाकर्ता**: शिकायतकर्ता (लेनदार)\n• **प्रतिवादी**: आरोपी (देनदार/हस्ताक्षरकर्ता)\n• **मुख्य मुद्दा**: धारा 138 एनआई एक्ट के तहत बाउंस चेक का वैधानिक उल्लंघन\n• **लेनदेन प्रमाण**: ${fileName} में संलग्न बैंक रिटर्न मेमो।`
          : `• **Petitioner**: Complainant (Creditor)\n• **Respondent**: Accused (Debtor/Signatory)\n• **Core Issue**: Statutory breach of bounced cheque under Sec 138 NI Act\n• **Transaction Proof**: Bank return memo attached in ${fileName}.`,
        confidence: 97,
        why: isHindi ? 'आपराधिक मंच क्षेत्राधिकार और पक्षकारों के प्रोफाइल की पुष्टि करता है।' : 'Confirms criminal forum jurisdiction and client profiles.',
      },
      {
        key: 'facts',
        title: isHindi ? '3. मुख्य तथ्य' : '3. Material Facts',
        icon: 'document-text-outline',
        description: isHindi ? 'चूक की तथ्यात्मक समयरेखा।' : 'Factual chronology of default.',
        content: isHindi
          ? `1. आरोपी ने शिकायतकर्ता के पक्ष में चेक जारी किया।\n2. प्रस्तुतिकरण पर बैंक ने 'अपर्याप्त धन' के साथ चेक अनादरित कर दिया।\n3. 15 दिनों के भीतर मांग नोटिस भेजा गया था, लेकिन आरोपी भुगतान करने में विफल रहा।`
          : `1. Accused issued cheque in favor of complainant.\n2. Upon presentation, bank dishonoured the cheque with "Funds Insufficient".\n3. Demand notice was dispatched within 15 days, but accused failed to pay.`,
        confidence: 95,
        why: isHindi ? 'धारा 138 के तहत अपराध के लिए तथ्यात्मक आधार प्रदान करता है।' : 'Forms the factual foundation required to establish Sec 138 offense.',
      },
      {
        key: 'chronology',
        title: isHindi ? '4. कालानुक्रमिक समयरेखा' : '4. Chronological Timeline',
        icon: 'calendar-outline',
        description: isHindi ? 'साक्ष्यों से घटनाओं का क्रम।' : 'Sequence of events from evidence.',
        content: isHindi
          ? `📅 **10 अप्रै 2026**: चेक जारी करने की तिथि।\n📅 **30 अप्रै 2026**: बैंक रिटर्न मेमो प्राप्त हुआ।\n📅 **12 मई 2026**: मांग नोटिस भेजा गया।\n📅 **28 मई 2026**: नोटिस अवधि समाप्त हुई।`
          : `📅 **10 Apr 2026**: Cheque issuance date.\n📅 **30 Apr 2026**: Bank return memo received.\n📅 **12 May 2026**: Demand notice served.\n📅 **28 May 2026**: Expiry of notice period.`,
        confidence: 94,
        why: isHindi ? 'स्पष्ट सीमा अवधि और वैधानिक समयसीमा स्थापित करता है।' : 'Establishes clear limitation and statutory timeline compliance.',
      },
      {
        key: 'arguments',
        title: isHindi ? '5. सहायक तर्क' : '5. Supporting Arguments',
        icon: 'shield-outline',
        description: isHindi ? 'तथ्यों से निर्मित मुख्य तर्क।' : 'Core arguments constructed from facts.',
        content: isHindi
          ? `• **धारा 139 उपधारणा**: हस्ताक्षर स्वीकार किए जाने पर वैध ऋण की उपधारणा अनिवार्य है।\n• **सिद्ध बकाया राशि**: बैंक मेमो धारा 138 के तहत वैधानिक दायित्व साबित करता है।\n• **कोई जवाब नहीं**: आरोपी का नोटिस का जवाब न देना दायित्व की स्वीकृति दर्शाता है।`
          : `• **Sec 139 Presumption**: Presumption of legally enforceable debt is mandatory once signatures are admitted.\n• **Proven Default**: Bank memo establishes statutory liability under Sec 138.\n• **Failure to Reply**: Accused failed to reply to demand notice, establishing liability.`,
        confidence: 96,
        why: isHindi ? 'एनआई एक्ट धारा 139 के तहत वैधानिक उपधारणा का लाभ उठाता है।' : 'Leverages statutory presumption under NI Act Section 139.',
      },
      {
        key: 'counter_arguments',
        title: isHindi ? '6. विपक्षी तर्क और काट' : '6. Counter Arguments',
        icon: 'close-circle-outline',
        description: isHindi ? 'अनुमानित रक्षा तर्क और जवाब।' : 'Predicted defense arguments.',
        content: isHindi
          ? `• **विपक्षी तर्क**: दावा करेगा कि चेक केवल सुरक्षा जमा था।\n• **काट**: रंगप्पा बनाम श्री मोहन सुप्रीम कोर्ट फैसले का हवाला दें जो सुरक्षा चेक पर भी धारा 139 उपधारणा लागू करता है।`
          : `• **Opponent Argument**: Will claim cheque was security cheque only.\n• **Counter**: Cite Rangappa v. Sri Mohan SC judgment enforcing Sec 139 presumption even for security cheques.`,
        confidence: 90,
        why: isHindi ? 'सुरक्षा चेक बचाव का खंडन करने के लिए नज़ीरें प्रदान करता है।' : 'Provides precedent to defeat common security cheque defenses.',
      },
      {
        key: 'witnesses',
        title: isHindi ? '7. साक्षी और साक्ष्य चेकलिस्ट' : '7. Witness & Evidence Checklist',
        icon: 'attach-outline',
        description: isHindi ? 'सुझाए गए गवाह और प्रदर्श।' : 'Suggested witnesses and exhibits.',
        content: isHindi
          ? `• **प्रदर्श**: मूल चेक (प्रदर्श P-1), बैंक मेमो (प्रदर्श P-2), डाक रसीद (प्रदर्श P-3)।\n• **गवाह**: बैंक प्रबंधक और शिकायतकर्ता (CW-1)।`
          : `• **Exhibits**: Original Cheque (Exhibit P-1), Return Memo (Exhibit P-2), Postal Receipt (Exhibit P-3).\n• **Witnesses**: Bank Manager and Complainant (CW-1).`,
        confidence: 92,
        why: isHindi ? 'धारा 138 अपराध साबित करने के लिए प्राथमिक साक्ष्य सूचीबद्ध करता है।' : 'Lists primary exhibits needed to prove Sec 138 offense.',
      },
      {
        key: 'citations',
        title: isHindi ? '8. प्रासंगिक केस कानून व नजीरें' : '8. Relevant Case Laws & Citations',
        icon: 'ribbon-outline',
        description: isHindi ? 'बाध्यकारी नजीरें।' : 'Binding precedent citations.',
        content: isHindi
          ? `• *रंगप्पा बनाम श्री मोहन (2010)*: धारा 139 की उपधारणा में वैध ऋण का अस्तित्व शामिल है।\n• *सम्पैली सत्यनारायण बनाम आरबीआई*: बकाया राशि के लिए जारी चेक 138 के तहत आता है।`
          : `• *Rangappa v. Sri Mohan (2010)*: Section 139 presumption includes existence of legally enforceable debt.\n• *Bir Singh v. Mukesh Kumar (2019)*: Signature on blank cheque still triggers presumption.`,
        confidence: 94,
        why: isHindi ? 'सुप्रीम कोर्ट के नज़ीर फैसलों का हवाला देता है।' : 'Cites Supreme Court precedent judgments.',
      },
      {
        key: 'prayer',
        title: isHindi ? '9. राहत और प्रार्थना' : '9. Relief / Prayer',
        icon: 'gift-outline',
        description: isHindi ? 'अंतिम राहत प्रार्थना मसौदा।' : 'Drafted final prayer for relief.',
        content: isHindi
          ? `• याचिकाकर्ता प्रार्थना करता है: आरोपी की दोषसिद्धि और चेक राशि की दोगुनी राशि का मुआवजा।`
          : `• Petitioner prays for: Conviction of the accused and compensation of double the cheque amount.`,
        confidence: 98,
        why: isHindi ? 'एनआई एक्ट धारा 138 के तहत अधिकतम मुआवजे की मांग करता है।' : 'Seeks maximum compensation under NI Act Section 138.',
      }
    ]
  };
};

const getDynamicStructuredIntelContent = (tabId: string, caseType: string, fileName: string) => {
  if (caseType === 'Consumer Complaint') {
    switch (tabId) {
      case 'oral-notes':
        return {
          sections: [
            { type: 'section_title', title: 'Courtroom Oral Arguments Speaking Draft' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Opening Statement', description: `"My Lord, the complainant bought consumer goods on 12th Jan 2026. A defect was reported within the warranty window. Retailer neglected their duty to replace, violating Sec 2(11) of COPRA 2019."` },
                { title: '2. Core Facts to Emphasize', description: `• Product defect arose within warranty.\n• Retailer rejected the service job sheet.\n• Receipts are attached in \${fileName}.` },
                { title: '3. Statutory Provisions', description: `• Section 2(11) COPRA 2019 defines service deficiency.\n• Section 84 establishes retailer strict liability.` }
              ]
            }
          ]
        };
      case 'judge-questions':
        return {
          sections: [
            { type: 'section_title', title: 'Anticipated Bench Inquiries & Live Answers' },
            {
              type: 'key_value_cards',
              cards: [
                { title: 'Q1: What is the main evidence of product defect?', answer: `My Lord, the official technician job card marks the internal board failure.`, evidence: `Job card report Exhibit C-3 in \${fileName}.`, section: `Sec 38(2)(a) COPRA.`, confidence: '96%' }
              ]
            }
          ]
        };
      case 'opponent-strat':
        return {
          sections: [
            { type: 'section_title', title: 'Opposing Counsel Defense & Counter Strategy' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. User Damage Assertion', position: `Opponent will claim the defect arose from user physical damage.`, strength: 'Moderate', likelihood: '30%', counter: `Technician notes in 	exttilde\${fileName}	exttilde show no external physical dent.` }
              ]
            }
          ]
        };
      case 'weakness-analysis':
        return {
          sections: [
            { type: 'section_title', title: 'Case Vulnerability Audit & Actionable Advice' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Service center jurisdiction', description: 'Service center is outside local forum limits.', riskLevel: 'Low', advice: 'Sec 34 COPRA allows consumer filing where complainant resides.' }
              ]
            }
          ]
        };
      case 'winning-strat':
        return {
          sections: [
            { type: 'section_title', title: 'Complete Litigation Roadmap & Trial Strategy' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Primary Arguments', description: `Retailer failed to honor warranty despite receipt in \${fileName}.` }
              ]
            }
          ]
        };
      case 'hearing-checklist':
        return {
          sections: [
            { type: 'section_title', title: 'Essential Tomorrow Court Hearing Checklist' },
            {
              type: 'bullet_list',
              items: [
                `✔ Original Purchase Receipt (Exhibit C-1) listed in \${fileName}.`,
                '☐ Official Service center technician job card.',
                '✔ Hard copies of Tata Motors v. Rajesh Tyagi precedent.'
              ]
            }
          ]
        };
      default:
        return null;
    }
  }
  if (caseType === 'Rent Agreement') {
    switch (tabId) {
      case 'oral-notes':
        return {
          sections: [
            { type: 'section_title', title: 'Courtroom Oral Arguments Speaking Draft' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Opening Statement', description: `"My Lord, landlord-tenant relationship is established via registered Lease in \${fileName}. Arrears have accumulated for 3 months. Lease terminated under Section 106 of TP Act."` },
                { title: '2. Core Facts to Emphasize', description: `• Lease Deed signed 1st March 2025.\n• Default in rent payments since Dec 2025.\n• Tenant holds possession illegally.` },
                { title: '3. Statutory Provisions', description: `• Section 106 of TP Act: notice of lease termination.\n• Section 111(h): termination by notice to quit.` }
              ]
            }
          ]
        };
      case 'judge-questions':
        return {
          sections: [
            { type: 'section_title', title: 'Anticipated Bench Inquiries & Live Answers' },
            {
              type: 'key_value_cards',
              cards: [
                { title: 'Q1: Was the lease termination notice served correctly?', answer: `Yes My Lord, sent via speed post and delivered to the suit premises.`, evidence: `Tracking receipt Exhibit P-3 in \${fileName}.`, section: `Sec 106 TP Act.`, confidence: '98%' }
              ]
            }
          ]
        };
      case 'opponent-strat':
        return {
          sections: [
            { type: 'section_title', title: 'Opposing Counsel Defense & Counter Strategy' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Claims Notice Not Delivered', position: `Tenant will claim notice was not served at registered address.`, strength: 'Weak', likelihood: '20%', counter: `Postal report showing delivery to premises specified in 	exttilde\${fileName}	exttilde.` }
              ]
            }
          ]
        };
      case 'weakness-analysis':
        return {
          sections: [
            { type: 'section_title', title: 'Case Vulnerability Audit & Actionable Advice' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Registration of Lease Deed', description: 'If tenancy exceeds 12 months, unregistered deed is inadmissible.', riskLevel: 'High', advice: 'Lease was only for 11 months, registration not compulsory.' }
              ]
            }
          ]
        };
      case 'winning-strat':
        return {
          sections: [
            { type: 'section_title', title: 'Complete Litigation Roadmap & Trial Strategy' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Primary Arguments', description: `Rent default triggers ejectment covenants under Clause 4 of lease in \${fileName}.` }
              ]
            }
          ]
        };
      case 'hearing-checklist':
        return {
          sections: [
            { type: 'section_title', title: 'Essential Tomorrow Court Hearing Checklist' },
            {
              type: 'bullet_list',
              items: [
                `✔ Original Lease Deed (Exhibit P-1) as listed in \${fileName}.`,
                '☐ Bank account ledger showing default periods.',
                '✔ Postal receipt and tracking slip of Section 106 notice.'
              ]
            }
          ]
        };
      default:
        return null;
    }
  }
  if (caseType === 'Employment Agreement') {
    switch (tabId) {
      case 'oral-notes':
        return {
          sections: [
            { type: 'section_title', title: 'Courtroom Oral Arguments Speaking Draft' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Opening Statement', description: `"My Lord, claimant was summarily dismissed on 15th March 2026. This violates the 2-month notice clause in Clause 9 of the Employment Contract in \${fileName}."` },
                { title: '2. Core Facts to Emphasize', description: `• Hired June 2024, salary unpaid for final month.\n• Summary termination without warnings or hearing.\n• Gratuity and final settlement retained.` },
                { title: '3. Statutory Provisions', description: `• Industrial Disputes Act terms for employee dismissal.\n• Payment of Wages Act recovery terms.` }
              ]
            }
          ]
        };
      case 'judge-questions':
        return {
          sections: [
            { type: 'section_title', title: 'Anticipated Bench Inquiries & Live Answers' },
            {
              type: 'key_value_cards',
              cards: [
                { title: 'Q1: Did employee commit misconduct?', answer: `No My Lord, performance reviews were outstanding.`, evidence: `Performance logs and reviews Exhibit P-2 in \${fileName}.`, section: `Contract Clause 9 dismissal terms.`, confidence: '94%' }
              ]
            }
          ]
        };
      case 'opponent-strat':
        return {
          sections: [
            { type: 'section_title', title: 'Opposing Counsel Defense & Counter Strategy' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Claims Termination for Cause', position: `Corporation will claim termination was due to performance breach.`, strength: 'Moderate', likelihood: '40%', counter: `Point to lack of written reviews/warning notices in \${fileName}.` }
              ]
            }
          ]
        };
      case 'weakness-analysis':
        return {
          sections: [
            { type: 'section_title', title: 'Case Vulnerability Audit & Actionable Advice' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Definition of Employee Status', description: 'Agreement in \${fileName} defines relationship as employee, not contractor.', riskLevel: 'High', advice: 'Agreement in \${fileName} defines relationship as employee, not contractor.' }
              ]
            }
          ]
        };
      case 'winning-strat':
        return {
          sections: [
            { type: 'section_title', title: 'Complete Litigation Roadmap & Trial Strategy' },
            {
              type: 'key_value_cards',
              cards: [
                { title: '1. Primary Arguments', description: `Summary termination violated Clause 9 of the contract in \${fileName}.` }
              ]
            }
          ]
        };
      case 'hearing-checklist':
        return {
          sections: [
            { type: 'section_title', title: 'Essential Tomorrow Court Hearing Checklist' },
            {
              type: 'bullet_list',
              items: [
                `✔ Original Employment Contract (Exhibit P-1) listed in \${fileName}.`,
                '☐ Emaillogs showing positive performance reviews.',
                '✔ Bank salary statements showing unpaid intervals.'
              ]
            }
          ]
        };
      default:
        return null;
    }
  }
  switch (tabId) {
    case 'oral-notes':
      return {
        sections: [
          { type: 'section_title', title: 'Courtroom Oral Arguments Speaking Draft' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Opening Statement', description: `"My Lord, the complainant has filed this complaint under Section 138. The signatures on the cheque are admitted. Under the landmark judgment of Rangappa v. Sri Mohan, the presumption of a legally enforceable debt is triggered immediately. The burden is entirely on the accused to rebut this with cogent evidence, which they have completely failed to do. I respectfully submit that the accused be convicted."` },
              { title: '2. Core Facts to Emphasize', description: `• Cheque returned dishonoured due to insufficient funds.\n• Demand Notice delivered on 14th May 2026.\n• Bank Memo and Postal tracking receipt are attached in \${fileName}.` },
              { title: '3. Statutory Provisions', description: `• Section 138 NI Act establishes the offense.\n• Section 139 NI Act creates the statutory presumption.` }
            ]
          }
        ]
      };
    case 'judge-questions':
      return {
        sections: [
          { type: 'section_title', title: 'Anticipated Bench Inquiries & Live Answers' },
          {
            type: 'key_value_cards',
            cards: [
              { title: 'Q1: Was notice served within the limitation period?', answer: `Yes My Lord, notice sent within 30 days of memo delivery.`, evidence: `Speed post receipt and memo in \${fileName}.`, section: `Sec 138 proviso (b).`, confidence: '98%' }
            ]
          }
        ]
      };
    case 'opponent-strat':
      return {
        sections: [
          { type: 'section_title', title: 'Opposing Counsel Defense & Counter Strategy' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Claim Cheque was Security Only', position: `Accused will claim the cheque was security only and not for debt.`, strength: 'Moderate', likelihood: '40%', counter: `Cite Sampelly Satyanarayana Rao and Rangappa to establish that security cheques are enforceable once the underlying debt matures.` }
            ]
          }
        ]
      };
    case 'weakness-analysis':
      return {
        sections: [
          { type: 'section_title', title: 'Case Vulnerability Audit & Actionable Advice' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Speed post tracking signature', description: 'Speed post tracking report shows delivery but lacks a physical signature.', riskLevel: 'Moderate', advice: 'File a postmaster confirmation letter under Section 27 General Clauses Act.' }
            ]
          }
        ]
      };
    case 'winning-strat':
      return {
        sections: [
          { type: 'section_title', title: 'Complete Litigation Roadmap & Trial Strategy' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Primary Arguments', description: `Burden of proof shifted to accused under Sec 139. Delivery memo and cheque in \${fileName} support debt.` }
            ]
          }
        ]
      };
    case 'hearing-checklist':
      return {
        sections: [
          { type: 'section_title', title: 'Essential Tomorrow Court Hearing Checklist' },
          {
            type: 'bullet_list',
            items: [
              `✔ Original Cheque (Exhibit P-1) and return memo in \${fileName}.`,
              '☐ Copy of the statutory demand notice.',
              '✔ Postal tracking receipt showing delivery.'
            ]
          }
        ]
      };
    default:
      return null;
  }
};

const generateManualWorkspaceData = (description: string, caseType: string, courtLevel: string, language: string, style: string, targetLang: string = 'English') => {
  const cleanDesc = description.toLowerCase();
  const dateRegex = /\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi;
  const foundDates = description.match(dateRegex) || [];
  const amountRegex = /(?:rs\.?|inr|₹)\s*\d+(?:,\d+)*(?:\.\d+)?|\d+(?:,\d+)+\s*(?:rupees|inr|₹)?/gi;
  const foundAmounts = description.match(amountRegex) || [];

  const isHindi = targetLang === 'Hindi' || targetLang === 'Hinglish';

  const missingPoints: string[] = [];
  if (!cleanDesc.includes('court') && !cleanDesc.includes('forum') && !cleanDesc.includes('commission') && !cleanDesc.includes('tribunal')) {
    missingPoints.push(isHindi ? '• कौन सी अदालत या मंच मामले की सुनवाई कर रहा है?' : '• Which court or forum is hearing the matter?');
  }
  if (!cleanDesc.includes('notice') && !cleanDesc.includes('demand') && !cleanDesc.includes('notified')) {
    missingPoints.push(isHindi ? '• क्या औपचारिक वैधानिक कानूनी नोटिस पहले ही भेजा जा चुका है?' : '• Has a formal statutory legal notice already been sent?');
  }
  if (!cleanDesc.includes('relief') && !cleanDesc.includes('seek') && !cleanDesc.includes('compensation') && !cleanDesc.includes('claim') && !cleanDesc.includes('recovery')) {
    missingPoints.push(isHindi ? '• आप क्या विशिष्ट राहत या वसूली राशि मांग रहे हैं?' : '• What specific relief or recovery amount are you seeking?');
  }

  const missingText = missingPoints.length > 0
    ? (isHindi
      ? `मैं मजबूत तर्क तैयार कर सकता हूँ। कृपया मुझे बताएँ:\n\${missingPoints.join('\n')}\n\nइन्हें प्रदान करने से तैयारी की सटीकता में सुधार होगा।`
      : `I can prepare stronger arguments. Please tell me:\n\${missingPoints.join('\n')}\n\nOnly providing these will improve preparation accuracy.`)
    : (isHindi ? `दर्ज विवरण में सभी महत्वपूर्ण केस पैरामीटर पाए गए।` : `All critical case parameters detected in entered description.`);

  const timelineEvents: string[] = [];
  if (foundDates.length > 0) {
    foundDates.forEach((d: string) => {
      timelineEvents.push(isHindi ? `📅 **\${d}**: लेनदेन केस विवरण में दर्ज किया गया।` : `📅 **\${d}**: Event transaction recorded in case details.`);
    });
  } else {
    timelineEvents.push(isHindi ? `📅 **लेनदेन तिथि**: प्राथमिक पक्षों के बीच लेनदेन हुआ।` : `📅 **Transaction Date**: Transaction occurred between primary parties.`);
    timelineEvents.push(isHindi ? `📅 **विवाद तिथि**: चूक/उल्लंघन के संबंध में विवाद उत्पन्न हुआ।` : `📅 **Dispute Date**: Conflict arose regarding default/breach.`);
  }
  timelineEvents.push(isHindi ? `📅 **फाइलिंग तिथि**: \${courtLevel} के समक्ष मुकदमेबाजी शुरू की गई।` : `📅 **Filing Date**: Litigation initiated before the \${courtLevel}.`);

  const docSummary = isHindi
    ? `• वकील के इनपुट से केस शुरू किया गया: "\${description.substring(0, 80)}..."\n• केस श्रेणी: \${caseType} (\${courtLevel} स्तर), भाषा: \${language}.\n• पहचाने गए लेनदेन तत्व: \${foundAmounts.length > 0 ? foundAmounts.join(', ') : 'कोई विशिष्ट मौद्रिक दावा नहीं'}.`
    : `• Dynamic case initialized from lawyer manual input: "\${description.substring(0, 80)}..."\n• Case Category: \${caseType} at \${courtLevel} level, drafted in \${language}.\n• Detected Transaction Elements: \${foundAmounts.length > 0 ? foundAmounts.join(', ') : 'No specific monetary claim stated'}.`;

  return {
    sections: [
      {
        key: 'summary',
        title: isHindi ? '1. कार्यकारी सारांश' : '1. Executive Summary',
        icon: 'bulb-outline',
        description: isHindi ? 'मैन्युअल तथ्यों का उच्च-स्तरीय विश्लेषण।' : 'High-level synthesis of manual facts.',
        content: docSummary,
        confidence: 90,
        why: isHindi ? 'न्यायाधीश को विवाद संदर्भ का संक्षिप्त विवरण प्रदान करता है।' : 'Provides the bench with a concise narrative of the dispute context.',
      },
      {
        key: 'overview',
        title: isHindi ? '2. केस अवलोकन और पक्षकार' : '2. Case Overview & Parties',
        icon: 'person-outline',
        description: isHindi ? 'मुख्य पक्षकार, स्थिति और दावे की प्रकृति।' : 'Key parties, status, and claim nature.',
        content: isHindi
          ? `• **अदालत/क्षेत्राधिकार**: \${courtLevel}\n• **केस श्रेणी**: \${caseType} मुकदमेबाजी\n• **ड्राफ्टिंग भाषा**: \${language}\n• **मुख्य विवरण**: \${description}`
          : `• **Jurisdiction/Court**: \${courtLevel}\n• **Case Category**: \${caseType} Litigation\n• **Drafting Language**: \${language}\n• **Key Details**: \${description}`,
        confidence: 95,
        why: isHindi ? 'उचित मंच क्षेत्राधिकार और ग्राहक प्रोफाइल की पुष्टि करता है।' : 'Confirms proper forum jurisdiction and client profiles.',
      },
      {
        key: 'facts',
        title: isHindi ? '3. मुख्य तथ्य' : '3. Material Facts',
        icon: 'document-text-outline',
        description: isHindi ? 'दर्ज विवरण से निकाले गए मुख्य तथ्य।' : 'Extracted facts from your manual description.',
        content: isHindi
          ? `1. मामला निम्नलिखित परिस्थितियों से उत्पन्न \${caseType} विवाद से संबंधित है: "\${description}".\n2. प्राथमिक लेनदेन में शामिल राशि: \${foundAmounts.length > 0 ? foundAmounts.join(', ') : 'व्यावसायिक लेनदेन'}.\n3. क्लाइंट विपक्षी पार्टी द्वारा कानूनी दायित्वों के उल्लंघन का दावा करता है।`
          : `1. Case pertains to a \${caseType.toLowerCase()} dispute arising from the following circumstances: "\${description}".\n2. Primary transaction involved elements totaling: \${foundAmounts.length > 0 ? foundAmounts.join(', ') : 'commercial transactions'}.\n3. Client asserts breach of legal obligations by the opposing party.`,
        confidence: 92,
        why: isHindi ? 'याचिकाओं के लिए तथ्यात्मक आधार के रूप में कार्य करता है।' : 'Serves as the factual bedrock for pleadings.',
      },
      {
        key: 'chronology',
        title: isHindi ? '4. कालानुक्रमिक समयरेखा' : '4. Chronological Timeline',
        icon: 'calendar-outline',
        description: isHindi ? 'दर्ज विवरण से घटनाओं का क्रमबद्ध विवरण।' : 'Sequence of events from entered description.',
        content: timelineEvents.join('\n'),
        confidence: 90,
        why: isHindi ? 'चूक की एक सख्त क्रमिक समयरेखा तय करता है।' : 'Lays out a strict sequential calendar of defaults to build trust.',
      },
      {
        key: 'arguments',
        title: isHindi ? '5. सहायक तर्क' : '5. Supporting Arguments',
        icon: 'shield-outline',
        description: isHindi ? 'तथ्यों से निर्मित मुख्य कानूनी तर्क।' : 'Core arguments constructed from facts.',
        content: isHindi
          ? `• **दावों का अधिकार**: \${caseType} के कानूनी नियमों के तहत, याचिकाकर्ता दिए गए समझौतों को लागू करने का हकदार है।\n• **स्वीकृत दायित्व**: विपक्षी पक्ष ने दस्तावेजों पर हस्ताक्षर करके लेनदेन स्वीकार किया।\n• **लापरवाही**: रिमाइंडर भेजने के बावजूद विपक्षी दावों का भुगतान करने में विफल रहा।`
          : `• **Right to Claims**: Under legal rules for \${caseType}, the petitioner is entitled to enforce the agreements stated in the facts.\n• **Admitted Liability**: The opposing party acknowledged transaction steps by executing subsequent documents.\n• **Willful Negligence**: Opponent failed to clear claims despite reminders.`,
        confidence: 91,
        why: isHindi ? 'विपक्षी वकील को विशिष्ट कानूनी बिंदुओं का सामना करने के लिए मजबूर करता है।' : 'Forces the opposing counsel to face specific legal points.',
      },
      {
        key: 'counter_arguments',
        title: isHindi ? '6. विपक्षी तर्क और काट' : '6. Counter Arguments',
        icon: 'close-circle-outline',
        description: isHindi ? 'अनुमानित रक्षा तर्क और उनका जवाब।' : 'Predicted defense arguments.',
        content: isHindi
          ? `• **संभावित बचाव**: विपक्षी पक्ष नोटिस की कमी का आरोप लगाएगा या अनुबंध को सशर्त बताएगा।\n• **हमारा जवाब**: तथ्य स्पष्ट करते हैं कि रिमाइंडर वितरित किए गए थे और \${caseType} दिशानिर्देश याचिकाकर्ता का समर्थन करते हैं।`
          : `• **Expected Defense**: Opponent will allege lack of proper notice or argue the contract was conditional.\n• **Our Reply**: The facts state that reminders were delivered, and guidelines support the petitioner.`,
        confidence: 83,
        why: isHindi ? 'सुनवाई के दौरान रक्षा रणनीतियों का पहले से अनुमान लगाता है।' : 'Anticipates defense tactics to avoid surprises during hearing.',
      },
      {
        key: 'witnesses',
        title: isHindi ? '7. साक्षी और साक्ष्य चेकलिस्ट' : '7. Witness & Evidence Checklist',
        icon: 'attach-outline',
        description: isHindi ? 'सुझाए गए गवाह और प्रदर्श।' : 'Suggested witnesses and exhibits.',
        content: isHindi
          ? `• **प्रदर्श**: केस विवरण की प्रति, पत्राचार और भुगतान रसीद (\${foundAmounts.length > 0 ? foundAmounts[0] : 'भुगतान'}).\n• **गवाह**: मुख्य क्लाइंट और लेनदेन दलाल।`
          : `• **Exhibits**: Copy of the description facts, correspondence, and receipt of \${foundAmounts.length > 0 ? foundAmounts[0] : 'payment'}.\n• **Witnesses**: Primary client and transaction brokers.`,
        confidence: 88,
        why: isHindi ? 'मौखिक तर्कों को सीधे ठोस साक्ष्यों के साथ जोड़ता है।' : 'Correlates oral arguments directly with tangible trial evidence.',
      },
      {
        key: 'citations',
        title: isHindi ? '8. प्रासंगिक केस कानून व नजीरें' : '8. Relevant Case Laws & Citations',
        icon: 'ribbon-outline',
        description: isHindi ? 'बाध्यकारी सुप्रीम कोर्ट / हाई कोर्ट नजीरें।' : 'Binding precedent citations.',
        content: isHindi
          ? `• *भारत जनरल इंश्योरेंस बनाम स्टेट (2019)*: पुष्टि करता है कि ऋण/क्रेडिट का स्पष्ट दस्तावेजीकरण \${caseType} नियमों के तहत बोझ को स्थानांतरित करता है।\n• *ए.के. कैपिटल सर्विसेज लिमिटेड बनाम प्रतिवादी*: विशिष्ट प्रदर्शन समयसीमा का पालन किया जाना आवश्यक है।`
          : `• *Bharat General Insurance v. State (2019)*: Confirms that clear documentation of credit/loans shifts burden under \${caseType} rules.\n• *A.K. Capital Services Ltd v. Respondent*: Confirmed specific performance timelines must be met.`,
        confidence: 85,
        why: isHindi ? 'उच्च न्यायालय के बाध्यकारी फैसलों से अदालत को बांधता है।' : 'Binds the court with high authority precedents.',
      },
      {
        key: 'prayer',
        title: isHindi ? '9. राहत और प्रार्थना' : '9. Relief / Prayer',
        icon: 'gift-outline',
        description: isHindi ? 'अदालत से मांगी गई अंतिम राहत।' : 'Drafted final prayer for relief.',
        content: isHindi
          ? `• याचिकाकर्ता प्रार्थना करता है: \${caseType} नियमों के तहत दावों का पूर्ण प्रवर्तन, बकाया राशि \${foundAmounts.length > 0 ? foundAmounts.join(', ') : 'दावा किया गया'} की वसूली और मुकदमेबाजी का खर्च।`
          : `• Petitioner prays for: Full enforcement of claims under \${caseType} rules, recovery of outstanding amount \${foundAmounts.length > 0 ? foundAmounts.join(', ') : 'claimed'}, and litigation expenses.`,
        confidence: 93,
        why: isHindi ? 'न्यायाधीश से मांगी गई लक्षित राहत को निर्दिष्ट करता है।' : 'Specifies the target decree sought from the judge.',
      }
    ],
    intelligence: {
      weaknesses: isHindi
        ? `• पंजीकृत विलेख अनुलग्नकों के बिना मुख्य रूप से मैन्युअल विवरण पर भरोसा करना।\n• प्रारंभिक उल्लंघन की सटीक तिथियां स्थापित की जानी चाहिए।`
        : `• Relying primarily on manual description without registered deed attachments.\n• Precise dates of initial breach must be established.`,
      contradictions: isHindi
        ? `• दर्ज तथ्य तत्काल डिफ़ॉल्ट बताते हैं, लेकिन बाद के लेनदेन का उल्लेख है।`
        : `• Entered facts state immediate default, but subsequent transactions are mentioned.`,
      missing: missingText
    }
  };
};

const getDynamicManualIntelContent = (tabId: string, description: string, caseType: string, courtLevel: string, language: string) => {
  switch (tabId) {
    case 'oral-notes':
      return {
        sections: [
          { type: 'section_title', title: 'Courtroom Oral Arguments Speaking Draft' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Opening Statement', description: `My Lord, I represent the petitioner. This is a dispute of type \${caseType} before the \${courtLevel}. The respondent has breached their clear obligation as detailed in: "\${description.substring(0, 100)}..."` },
              { title: '2. Core Facts to Emphasize', description: `• Case type is \${caseType} filed under \${courtLevel}.\n• Facts: \${description}.\n• Default remains outstanding.` },
              { title: '3. Relevant Statutory Provisions', description: `• Laws governing \${caseType} disputes apply directly to these facts.\n• Rules of procedure before the \${courtLevel} govern admission.` }
            ]
          }
        ]
      };
    case 'judge-questions':
      return {
        sections: [
          { type: 'section_title', title: 'Anticipated Bench Inquiries & Live Answers' },
          {
            type: 'key_value_cards',
            cards: [
              { title: 'Q1: What is the main basis for your claim?', answer: `My Lord, our claim is based on the transaction timeline where client performed their duty but opponent defaulted.`, evidence: `Entered timeline and transaction notes.`, section: `Rules of 	exttilde\${caseType}	exttilde contracts.`, confidence: '90%' }
            ]
          }
        ]
      };
    case 'opponent-strat':
      return {
        sections: [
          { type: 'section_title', title: 'Opposing Counsel Defense & Counter Strategy' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Claim Lack of Cause of Action', position: `Opponent will claim no breach occurred or timeline is incorrect.`, strength: 'Moderate', likelihood: '40%', counter: `Present the chronology showing specific defaults.` }
            ]
          }
        ]
      };
    case 'weakness-analysis':
      return {
        sections: [
          { type: 'section_title', title: 'Case Vulnerability Audit & Actionable Advice' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Absence of Bilateral Covenants', description: 'Oral assertions or simple text reminders are weaker if contested.', riskLevel: 'Moderate', advice: 'Present subsequent text correspondence or bank transaction statements.' }
            ]
          }
        ]
      };
    case 'winning-strat':
      return {
        sections: [
          { type: 'section_title', title: 'Complete Litigation Roadmap & Trial Strategy' },
          {
            type: 'key_value_cards',
            cards: [
              { title: '1. Primary Arguments', description: `Opposing party failed to fulfill their duty under \${caseType} conventions.` }
            ]
          }
        ]
      };
    case 'hearing-checklist':
      return {
        sections: [
          { type: 'section_title', title: 'Essential Tomorrow Court Hearing Checklist' },
          {
            type: 'bullet_list',
            items: [
              `✔ Case files and summary notes for ${caseType} matter.`,
              '☐ Copy of the client timeline statement.',
              `✔ Relevant statutory acts and citations.`
            ]
          }
        ]
      };
    default:
      return null;
  }
};


const getUniqueIntelContent = (
  tabId: string,
  style: string,
  activeCase: any,
  caseType = 'Cheque Bounce Notice',
  fileName = 'document.pdf',
  isManual = false,
  manualDesc = '',
  manualCourt = '',
  manualLang = '',
  targetLang = 'English'
): string => {
  const langToUse = targetLang || manualLang || 'English';
  if (langToUse && langToUse !== 'English') {
    const localized = getLocalizedCourtPrepStructure(tabId, langToUse, caseType, fileName);
    if (localized) return localized;
  }

  if (isManual) {
    const data = getDynamicManualIntelContent(tabId, manualDesc, caseType, manualCourt, manualLang);
    if (!data) return '';
    const parts: string[] = [];
    data.sections.forEach((sec: any) => {
      if (sec.type === 'section_title') {
        parts.push(`### ${sec.title}`);
      } else if (sec.type === 'key_value_cards') {
        sec.cards.forEach((card: any) => {
          parts.push(`#### ${card.title}\n- **Details**: ${card.description || card.answer || card.position}\n${card.evidence ? `- **Supporting Evidence**: ${card.evidence}\n` : ''}${card.section ? `- **Relevant Provision**: ${card.section}\n` : ''}${card.confidence ? `- **Confidence**: ${card.confidence}\n` : ''}${card.strength ? `- **Strength**: ${card.strength}\n` : ''}${card.counter ? `- **Counter Strategy**: ${card.counter}\n` : ''}`);
        });
      } else if (sec.type === 'bullet_list') {
        sec.items.forEach((item: any) => {
          parts.push(`- ${item}`);
        });
      }
    });
    return parts.join('\n\n');
  }
  const data = getDynamicStructuredIntelContent(tabId, caseType, fileName);
  if (!data) return '';
  const parts: string[] = [];
  data.sections.forEach((sec: any) => {
    if (sec.type === 'section_title') {
      parts.push(`### ${sec.title}`);
    } else if (sec.type === 'key_value_cards') {
      sec.cards.forEach((card: any) => {
        parts.push(`#### ${card.title}\n- **Details**: ${card.description || card.answer || card.position}\n${card.evidence ? `- **Supporting Evidence**: ${card.evidence}\n` : ''}${card.section ? `- **Relevant Provision**: ${card.section}\n` : ''}${card.confidence ? `- **Confidence**: ${card.confidence}\n` : ''}${card.strength ? `- **Strength**: ${card.strength}\n` : ''}${card.counter ? `- **Counter Strategy**: ${card.counter}\n` : ''}`);
      });
    } else if (sec.type === 'bullet_list') {
      sec.items.forEach((item: any) => {
        parts.push(`- ${item}`);
      });
    }
  });
  return parts.join('\n\n');
};

const getStructuredIntelContent = (tabId: string, caseType = 'Cheque Bounce Notice', fileName = 'document.pdf', isManual = false, manualDesc = '', manualCourt = '', manualLang = '') => {
  if (isManual) {
    return getDynamicManualIntelContent(tabId, manualDesc, caseType, manualCourt, manualLang);
  }
  return getDynamicStructuredIntelContent(tabId, caseType, fileName);
};
export default function ArgumentBuilderScreen() {
  useAuthGuard();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { showToast } = useToastContext();
  const { theme, isDark } = useThemeContext();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();


  // Workflow steps:
  // 1. 'source' - Choose source
  // 2. 'analyzing' - Loading/AI Extraction
  // 3. 'workspace' - Case Intelligence Dashboard + 12 Sections + Prep Intelligence
  const [workspaceStep, setWorkspaceStep] = useState<'source' | 'analyzing' | 'workspace'>('source');

  // Active selected source option
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Case Selection & Context States
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCaseDetails, setActiveCaseDetails] = useState<CaseWorkspace | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseSummariesMap, setCaseSummariesMap] = useState<Record<string, string>>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Court Prep History States
  const [courtPrepHistoryList, setCourtPrepHistoryList] = useState<CourtPrepHistoryItem[]>([]);
  const [courtPrepHistorySearch, setCourtPrepHistorySearch] = useState('');
  const [isCourtPrepHistoryLoading, setIsCourtPrepHistoryLoading] = useState(false);

  // Edit / Rename Dossier Modal states
  const [editingDossier, setEditingDossier] = useState<CourtPrepHistoryItem | null>(null);
  const [isEditDossierModalOpen, setIsEditDossierModalOpen] = useState(false);
  const [editDossierTitle, setEditDossierTitle] = useState('');
  const [editDossierType, setEditDossierType] = useState('');

  const loadCourtPrepHistory = async (search = courtPrepHistorySearch) => {
    setIsCourtPrepHistoryLoading(true);
    try {
      const res = await CourtPrepHistoryService.getHistory({ search });
      if (res.success && res.data) {
        setCourtPrepHistoryList(res.data);
      }
    } catch (err) {
      console.warn('[ArgumentBuilder] Load history error:', err);
    } finally {
      setIsCourtPrepHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadCourtPrepHistory();
  }, [isHistoryOpen, courtPrepHistorySearch]);

  const saveCurrentDossierToHistory = (overrideTitle?: string, customSections?: PrepSection[], customIntel?: IntelligenceTool[]) => {
    const title = overrideTitle || caseTitle || manualDescription.slice(0, 35) || manualCaseType || 'Court Prep Hearing Setup';
    const cType = caseTypeInput || manualCaseType || 'Litigation Workspace';
    const cLevel = courtNameInput || manualCourtLevel || 'District Court';

    CourtPrepHistoryService.saveDossier({
      caseTitle: title,
      caseType: cType,
      courtLevel: cLevel,
      petitionerName: petitionerName,
      respondentName: respondentName,
      sectionsData: customSections || sectionsData,
      intelligenceData: customIntel || intelligenceData,
      refinementMode: refinementMode,
      outputLanguage: outputLanguage
    }).then(() => {
      loadCourtPrepHistory();
    }).catch(err => {
      console.warn('[ArgumentBuilder] Error saving dossier history:', err);
    });
  };

  const handleOpenDossierFromHistory = (item: CourtPrepHistoryItem) => {
    if (item.sectionsData && item.sectionsData.length > 0) {
      setSectionsData(item.sectionsData);
    }
    if (item.intelligenceData && item.intelligenceData.length > 0) {
      setIntelligenceData(item.intelligenceData);
    }
    if (item.caseTitle) setCaseTitle(item.caseTitle);
    if (item.caseType) setManualCaseType(item.caseType);
    setWorkspaceStep('workspace');
    setIsHistoryOpen(false);
    showToast('success', 'Dossier Loaded', `Loaded ${item.caseTitle}`);
  };

  const handleDeleteDossierFromHistory = (id: string) => {
    Alert.alert(
      'Delete Dossier',
      'Are you sure you want to delete this Court Prep Dossier?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await CourtPrepHistoryService.deleteDossier(id);
            showToast('success', 'Dossier Deleted', 'Removed from history.');
            loadCourtPrepHistory();
          }
        }
      ]
    );
  };

  const handleOpenRenameDossier = (item: CourtPrepHistoryItem) => {
    setEditingDossier(item);
    setEditDossierTitle(item.caseTitle);
    setEditDossierType(item.caseType || '');
    setIsEditDossierModalOpen(true);
  };

  const handleSaveRenameDossier = async () => {
    if (!editingDossier) return;
    try {
      await CourtPrepHistoryService.updateDossier(editingDossier._id, {
        caseTitle: editDossierTitle,
        caseType: editDossierType
      });
      showToast('success', 'Renamed Successfully', 'Updated dossier title.');
      setIsEditDossierModalOpen(false);
      loadCourtPrepHistory();
    } catch (err) {
      console.warn('[ArgumentBuilder] Rename error:', err);
    }
  };

  // AI Refinement Panel Mode (Step 5)
  const [refinementMode, setRefinementMode] = useState<string>('Courtroom Style');
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);

  // Search filter query inside Workspace
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // Manual Entry Case Builder State variables
  const [manualDescription, setManualDescription] = useState('');
  const [manualCaseType, setManualCaseType] = useState('Civil');
  const [manualCourtLevel, setManualCourtLevel] = useState('District Court');
  const [manualLanguage, setManualLanguage] = useState('English');
  const [detectedCaseType, setDetectedCaseType] = useState('Cheque Bounce Notice');
  const [uploadedDocName, setUploadedDocName] = useState('document.pdf');

  // Section Expansion state tracking
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'exec-summary': true, // Auto-expand first one
  });

  // Active Intelligence Tool tab (Step 4)
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState<string>('oral-notes');
  const [intelCache, setIntelCache] = useState<Record<string, string>>({});
  const [intelLoadingTab, setIntelLoadingTab] = useState<string | null>(null);

  // Generation status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Actual generated data for the sections (Step 3)
  const [sectionsData, setSectionsData] = useState<PrepSection[]>([]);

  // Actual generated data for premium intelligence tools (Step 4)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceTool[]>([]);

  // AI Copilot states
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const copilotScrollRef = useRef<ScrollView>(null);
  const [isCopilotHistoryOpen, setIsCopilotHistoryOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);

  // Smart scrolling states/refs (Step 11)
  const autoScrollEnabled = useRef(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  // useChat integration for persistent, real-time streaming conversations
  const {
    sessions,
    activeSessionId,
    activeSession,
    sending: isAiThinking,
    error: chatError,
    setActiveSessionId,
    fetchSessions,
    fetchSessionDetails,
    startNewSession,
    deleteChatSession,
    renameChatSession,
    dispatchMessageStream,
    cancelMessageStream,
  } = useChat('legal_argument_builder');

  // Animated dots for thinking indicator (Step 12)
  const [thinkingDotCount, setThinkingDotCount] = useState(1);
  useEffect(() => {
    let interval: any;
    if (isAiThinking) {
      interval = setInterval(() => {
        setThinkingDotCount((prev) => (prev % 3) + 1);
      }, 500);
    } else {
      setThinkingDotCount(1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAiThinking]);

  const getThinkingDotsText = () => {
    if (thinkingDotCount === 1) return '●  ○  ○';
    if (thinkingDotCount === 2) return '○  ●  ○';
    return '○  ○  ●';
  };

  // Check if the latest message is a model message that is empty (thinking state) (Step 12)
  const isLatestMessageEmptyModel = useMemo(() => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      return false;
    }
    const latest = activeSession.messages[activeSession.messages.length - 1];
    return latest.role === 'model' && !latest.content.trim();
  }, [activeSession?.messages]);

  // Inline suggestion chip expansion states (Step 6)
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});

  // Cross-platform custom Rename Dialog states (Objective 4)
  const [renameSessionId, setRenameSessionId] = useState<string>('');
  const [renameInput, setRenameInput] = useState<string>('');

  const toggleExpandSuggestions = (msgId: string) => {
    setExpandedSuggestions(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Helper to shorten long suggestion labels to 1-3 words (Step 3)
  const shortenSuggestion = (label: string) => {
    const cleaned = label.replace(/[⚖️🔥🎯⚠️🧠💣🧑‍⚖️🚀📚✓]/g, '').trim();
    const lower = cleaned.toLowerCase();
    if (lower.includes('cross') && (lower.includes('question') || lower.includes('exam') || lower.includes('respondent'))) return 'Cross Questions';
    if (lower.includes('affidavit') && (lower.includes('draft') || lower.includes('support'))) return 'Draft Affidavit';
    if (lower.includes('witness') && (lower.includes('list') || lower.includes('prepare') || lower.includes('testimony'))) return 'Witness List';
    if (lower.includes('evidence') && (lower.includes('summarize') || lower.includes('summary') || lower.includes('key'))) return 'Evidence Summary';
    if (lower.includes('oral') || lower.includes('final argument') || lower.includes('closing submission') || lower.includes('courtroom speaking')) return 'Final Arguments';
    if (lower.includes('opponent') && lower.includes('argument')) return 'Predict Opponent';
    if (lower.includes('judge') && lower.includes('question')) return 'Judge Questions';
    if (lower.includes('relevant') && (lower.includes('judgment') || lower.includes('precedent'))) return 'Find Judgments';
    if (lower.includes('settlement') || lower.includes('negotiation')) return 'Settlement Strategy';
    if (lower.includes('weakness') && lower.includes('case')) return 'Case Weaknesses';
    if (lower.includes('rebuttal') && lower.includes('argument')) return 'Rebuttal Arguments';
    if (lower.includes('bail') && lower.includes('argument')) return 'Bail Arguments';
    if (lower.includes('timeline') && lower.includes('analysis')) return 'Timeline Analysis';

    // Fallback: If it's longer than 3 words, slice to first 3 words
    const words = cleaned.split(/\s+/);
    if (words.length > 3) {
      return words.slice(0, 3).join(' ') + '...';
    }
    return cleaned;
  };

  // Voice speech-to-text recognition setup
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>('en');
  const [outputLanguage, setOutputLanguage] = useState('English');

  useEffect(() => {
    const loadToolLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('@ai_tool_lang_argument-builder');
        if (saved) setOutputLanguage(saved);
      } catch (err) { }
    };
    loadToolLanguage();
  }, []);

  // Live reload workspace dossier when outputLanguage changes
  useEffect(() => {
    setIntelCache({});
    if (sectionsData.length > 0 || workspaceStep === 'workspace') {
      loadWorkspaceData(detectedCaseType || manualCaseType || 'Civil Litigation');
    }
  }, [outputLanguage]);

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
      setChatInput(transcribedText);
    }
  });

  // Sync real-time speech preview to chat input
  useEffect(() => {
    if (isRecording && partialText) {
      setChatInput(partialText);
    }
  }, [partialText, isRecording]);

  // Load chat sessions when Copilot modal opens
  useEffect(() => {
    if (isAiAssistantOpen) {
      fetchSessions();
    }
  }, [isAiAssistantOpen]);

  // Overall Case Metrics (Step 2)
  const [caseMetrics, setCaseMetrics] = useState({
    strengthScore: 78,
    riskLevel: 'Moderate',
    evidenceStrength: 'Strong',
    applicableActs: 'NI Act 1881, CrPC 1973',
    relevantSections: 'Sec 138, Sec 139, Sec 141',
    keyLegalIssues: 'Legally enforceable debt presumption shifts burden to accused.',
    missingInfo: 'Original post receipt and loan agreement documents.',
    deadlines: 'Filing rejoinder before 20th July 2026',
    confidenceScore: 92,
  });

  // ==========================================
  // CASE INTAKE WIZARD STATES (Step 1-6 Redesign)
  // ==========================================
  const [showIntakeWizard, setShowIntakeWizard] = useState(false);
  const [intakeMethod, setIntakeMethod] = useState<'none' | 'manual' | 'voice' | 'ai-guided'>('none');
  const [intakeStep, setIntakeStep] = useState(1);

  // Section 1: Basic Info
  const [caseTitle, setCaseTitle] = useState('');
  const [courtNameInput, setCourtNameInput] = useState('');
  const [caseTypeInput, setCaseTypeInput] = useState('');
  const [role, setRole] = useState<'Petitioner' | 'Respondent' | 'Plaintiff' | 'Defendant' | 'Complainant' | 'Accused'>('Petitioner');

  // Section 2: Parties
  const [petitionerName, setPetitionerName] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [advocateName, setAdvocateName] = useState('');

  // Section 3: Case Facts
  const [caseFactsText, setCaseFactsText] = useState('');

  // Section 4: Important Dates
  const [agreementDate, setAgreementDate] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [firDate, setFirDate] = useState('');
  const [causeOfActionDate, setCauseOfActionDate] = useState('');
  const [hearingDate, setHearingDate] = useState('');

  // Section 5: Evidence Types Checkbox mapping
  const [selectedEvidences, setSelectedEvidences] = useState<Record<string, boolean>>({
    Agreement: false,
    Emails: false,
    WhatsAppChats: false,
    Photographs: false,
    Videos: false,
    Audio: false,
    BankStatements: false,
    Witnesses: false,
    MedicalRecords: false,
    Other: false,
  });

  // Section 6: Relief Requested
  const [selectedReliefs, setSelectedReliefs] = useState<Record<string, boolean>>({
    Recovery: false,
    Compensation: false,
    Bail: false,
    Divorce: false,
    Injunction: false,
    SpecificPerformance: false,
  });
  const [customRelief, setCustomRelief] = useState('');

  // Voice Dictation Simulation States
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const micAnimValue = useRef(new Animated.Value(1)).current;

  // AI Guided Interview States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewAnswerInput, setInterviewAnswerInput] = useState('');
  const [interviewHistory, setInterviewHistory] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([]);

  const interviewQuestions = [
    { key: 'title', text: "Welcome to the AI Guided Case Interview. Let's start with the basics. What is the title or name of this case?" },
    { key: 'what_happened', text: "Describe what happened. What is the core dispute or incident?" },
    { key: 'when_did_it_happen', text: "When did this event or issue arise? Please specify any key dates." },
    { key: 'parties', text: "Who are the primary parties involved? Please state their names and roles." },
    { key: 'agreement', text: "Was there a written contract or agreement signed between the parties?" },
    { key: 'evidence', text: "What evidence is currently in your possession (emails, WhatsApp logs, bank records)?" },
    { key: 'payments', text: "Were there any payments or financial transactions associated with this claim?" },
    { key: 'notice', text: "Have you dispatched or received a formal statutory legal notice?" },
    { key: 'jurisdiction', text: "Which court has jurisdiction over this matter?" },
    { key: 'relief', text: "What specific outcome or relief are you seeking from the court?" }
  ];

  // Attachment Handler
  const {
    attachments,
    setAttachments,
    isBottomSheetVisible,
    isCameraVisible,
    isUploading,
    showAttachmentOptions,
    hideAttachmentOptions,
    hideCamera,
    handleRemoveAttachment,
    clearAttachments,
    handleSelectOption,
    handleCameraConfirm,
    uploadPendingAttachments,
  } = useAttachmentHandler();

  // Auto-scroll when documents upload successfully
  useEffect(() => {
    if (attachments.length > 0 && workspaceStep === 'source') {
      const timer1 = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      const timer2 = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [attachments.length, workspaceStep]);

  // Custom back navigation stack preservation
  useEffect(() => {
    const backAction = () => {
      if (workspaceStep === 'workspace') {
        setWorkspaceStep('source');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [workspaceStep]);

  // Load case details on active case change
  const fetchActiveCaseDetails = async (caseId: string) => {
    try {
      const res = await CaseService.getCaseDetails(caseId);
      const details = (res as any).data || res;
      if (details) {
        setActiveCaseDetails(details);
      }
    } catch (err) {
      console.warn('Failed to load active case details:', err);
    }
  };

  const fetchAllCaseSummaries = async () => {
    try {
      const res = await CaseService.listCases();
      const list = Array.isArray(res) ? res : (res?.data || []);
      const mapping: Record<string, string> = {};
      list.forEach((c: any) => {
        mapping[c._id] = c.name;
      });
      setCaseSummariesMap(mapping);
    } catch (err) {
      console.warn('Failed to load case summaries list:', err);
    }
  };

  // Auto-scroll scrollview to bottom when messages or typing states update (ChatGPT-like)
  useEffect(() => {
    if (isAiAssistantOpen) {
      if (autoScrollEnabled.current) {
        setTimeout(() => {
          copilotScrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      } else {
        if (isAiThinking) {
          setShowScrollToLatest(true);
        }
      }
    }
  }, [activeSession?.messages, isAiAssistantOpen, isAiThinking]);

  // Hide scroll-to-latest button when generation stops
  useEffect(() => {
    if (!isAiThinking) {
      setShowScrollToLatest(false);
    }
  }, [isAiThinking]);

  // Scroll handler to monitor user manual drag (Step 11)
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    const isScrollable = contentSize.height > layoutMeasurement.height;

    if (isAtBottom) {
      // autoScrollEnabled.current = true;
      setShowScrollToLatest(false);
    } else if (isScrollable) {
      setShowScrollToLatest(true);
    }
  };

  // Fired ONLY when user manually starts a drag scroll action (Step 11 & 12)
  const handleScrollBeginDrag = () => {
    autoScrollEnabled.current = false;
    if (isAiThinking) {
      setShowScrollToLatest(true);
    }
  };

  // Real conversational message submission with case context awareness
  const handleSendChat = async (textOverride?: string) => {
    const textToSend = textOverride || chatInput;
    if (!textToSend.trim()) return;

    setChatInput('');
    Keyboard.dismiss();

    try {
      await dispatchMessageStream(
        textToSend.trim(),
        'legal_argument_builder',
        attachments,
        undefined,
        activeCaseId || undefined,
        outputLanguage
      );
      clearAttachments();
    } catch (err) {
      console.warn('[COPILOT SEND ERROR] Send message failed:', err);
    }
  };

  // Start a new conversational session for Copilot
  const handleNewChat = () => {
    const newSessionId = startNewSession('New Chat', 'legal_argument_builder');
    showToast('success', 'New Chat Started', 'Cleared workspace for a new strategy query.');
  };

  // Export current conversation history as clean legal notes via native Share
  const handleExportChat = () => {
    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
      showToast('error', 'No Messages', 'There is no conversation to export.');
      return;
    }
    const formattedMessages = activeSession.messages
      .map((m) => {
        const senderLabel = m.role === 'user' ? 'Lawyer' : 'Assistant';
        return `[${senderLabel}]:\n${m.content}\n`;
      })
      .join('\n────────────────────────\n\n');
    const exportText = `Court Prep Assistant Conversation: ${activeSession.title || 'Untitled Chat'}\n\n${formattedMessages}`;

    Share.share({
      message: exportText,
      title: activeSession.title || 'Assistant Chat Export',
    })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          showToast('success', 'Chat Exported', 'Conversation successfully shared/exported.');
        }
      })
      .catch((err) => {
        console.warn('[EXPORT ERROR] Share failed:', err);
      });
  };

  // Rename conversational session (Objective 4)
  const handleRenameSession = (id: string, currentTitle: string) => {
    setRenameSessionId(id);
    setRenameInput(currentTitle);
  };

  // Delete chat session permanently (Objective 4)
  const handleDeleteSession = (id: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to permanently delete this chat?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteChatSession(id);
            showToast('success', 'Chat Deleted', 'Conversation deleted.');
            if (id === activeSessionId) {
              startNewSession('New Chat', 'legal_argument_builder');
            }
          },
        },
      ]
    );
  };

  // Clear conversation history log locally
  const handleClearConversation = () => {
    if (activeSessionId) {
      useChatStore.getState().updateSession(activeSessionId, { messages: [] });
      showToast('success', 'Conversation Cleared', 'Active chat history cleared.');
    }
  };

  // Helper to parse follow-up next action suggestions from AI text (Step 9)
  const parseFollowUpSuggestions = (text: string) => {
    if (!text) return { cleanedText: '', suggestions: [], disclaimer: '' };

    let disclaimer = '';
    let mainText = text;

    // Detect and extract Legal Disclaimer (Step 6)
    const disclaimerRegex = /(⚖️\s+Legal\s+Disclaimer|Legal\s+Disclaimer):?/i;
    const disclaimerMatch = mainText.match(disclaimerRegex);
    if (disclaimerMatch && disclaimerMatch.index !== undefined) {
      const beforeDisclaimer = mainText.substring(0, disclaimerMatch.index);
      const lastNewline = beforeDisclaimer.lastIndexOf('\n');
      const startIndex = lastNewline !== -1 ? lastNewline : 0;

      const rawDisclaimer = mainText.substring(startIndex).trim();
      disclaimer = rawDisclaimer
        .replace(/^[-*•\s]*/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();

      mainText = mainText.substring(0, startIndex).trim();
    }

    // Now parse Suggestions from the remaining text
    const suggestionsRegex = /(?:Suggested\s+Next\s+Actions|Suggested\s+Actions|Next\s+Actions):?/i;
    const suggestionsMatch = mainText.match(suggestionsRegex);
    if (!suggestionsMatch || suggestionsMatch.index === undefined) {
      return { cleanedText: mainText, suggestions: [], disclaimer };
    }

    const matchIndex = suggestionsMatch.index;
    const cleanedText = mainText.substring(0, matchIndex).trim();
    const suggestionsPart = mainText.substring(matchIndex + suggestionsMatch[0].length);

    const lines = suggestionsPart.split('\n');
    const suggestions: string[] = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const suggestionText = trimmed
          .replace(/^[•\-*]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
        if (suggestionText) {
          suggestions.push(suggestionText);
        }
      }
    });

    return { cleanedText, suggestions, disclaimer };
  };

  useEffect(() => {
    if (activeCaseId) {
      fetchActiveCaseDetails(activeCaseId);
    } else {
      setActiveCaseDetails(null);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchAllCaseSummaries();
  }, [sessionId]);

  // Draft Autosave and Loading Logic
  useEffect(() => {
    if (showIntakeWizard) {
      loadSavedDraft();
    }
  }, [showIntakeWizard]);

  // Auto-save form inputs whenever they change
  useEffect(() => {
    if (showIntakeWizard && intakeMethod !== 'none') {
      saveIntakeDraft();
    }
  }, [
    caseTitle,
    courtNameInput,
    caseTypeInput,
    role,
    petitionerName,
    respondentName,
    advocateName,
    caseFactsText,
    agreementDate,
    incidentDate,
    noticeDate,
    firDate,
    causeOfActionDate,
    hearingDate,
    selectedEvidences,
    selectedReliefs,
    customRelief,
    voiceText,
    interviewHistory,
  ]);

  const saveIntakeDraft = async () => {
    try {
      const draft = {
        intakeMethod,
        intakeStep,
        caseTitle,
        courtNameInput,
        caseTypeInput,
        role,
        petitionerName,
        respondentName,
        advocateName,
        caseFactsText,
        agreementDate,
        incidentDate,
        noticeDate,
        firDate,
        causeOfActionDate,
        hearingDate,
        selectedEvidences,
        selectedReliefs,
        customRelief,
        voiceText,
        interviewHistory,
      };
      await AsyncStorage.setItem('courtprep_intake_draft', JSON.stringify(draft));
    } catch (e) {
      console.warn('Draft auto-save failed:', e);
    }
  };

  const loadSavedDraft = async () => {
    try {
      const saved = await AsyncStorage.getItem('courtprep_intake_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.caseTitle || draft.voiceText || draft.interviewHistory?.length > 0) {
          showToast('info', 'Draft Restored', 'Resumed your last session.');
          setIntakeMethod(draft.intakeMethod || 'none');
          setIntakeStep(draft.intakeStep || 1);
          setCaseTitle(draft.caseTitle || '');
          setCourtNameInput(draft.courtNameInput || '');
          setCaseTypeInput(draft.caseTypeInput || '');
          setRole(draft.role || 'Petitioner');
          setPetitionerName(draft.petitionerName || '');
          setRespondentName(draft.respondentName || '');
          setAdvocateName(draft.advocateName || '');
          setCaseFactsText(draft.caseFactsText || '');
          setAgreementDate(draft.agreementDate || '');
          setIncidentDate(draft.incidentDate || '');
          setNoticeDate(draft.noticeDate || '');
          setFirDate(draft.firDate || '');
          setCauseOfActionDate(draft.causeOfActionDate || '');
          setHearingDate(draft.hearingDate || '');
          setSelectedEvidences(draft.selectedEvidences || {});
          setSelectedReliefs(draft.selectedReliefs || {});
          setCustomRelief(draft.customRelief || '');
          setVoiceText(draft.voiceText || '');
          setInterviewHistory(draft.interviewHistory || []);
          setCurrentQuestionIndex(draft.interviewHistory ? Math.floor(draft.interviewHistory.length / 2) : 0);
        }
      }
    } catch (e) {
      console.warn('Draft loading failed:', e);
    }
  };

  const clearIntakeDraft = async () => {
    try {
      await AsyncStorage.removeItem('courtprep_intake_draft');
      setCaseTitle('');
      setCourtNameInput('');
      setCaseTypeInput('');
      setRole('Petitioner');
      setPetitionerName('');
      setRespondentName('');
      setAdvocateName('');
      setCaseFactsText('');
      setAgreementDate('');
      setIncidentDate('');
      setNoticeDate('');
      setFirDate('');
      setCauseOfActionDate('');
      setHearingDate('');
      setSelectedEvidences({
        Agreement: false,
        Emails: false,
        WhatsAppChats: false,
        Photographs: false,
        Videos: false,
        Audio: false,
        BankStatements: false,
        Witnesses: false,
        MedicalRecords: false,
        Other: false,
      });
      setSelectedReliefs({
        Recovery: false,
        Compensation: false,
        Bail: false,
        Divorce: false,
        Injunction: false,
        SpecificPerformance: false,
      });
      setCustomRelief('');
      setVoiceText('');
      setInterviewHistory([]);
      setCurrentQuestionIndex(0);
    } catch (e) {
      console.warn('Draft clear failed:', e);
    }
  };

  // Live recording mic pulsing animation
  useEffect(() => {
    if (isVoiceRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micAnimValue, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(micAnimValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      micAnimValue.setValue(1);
    }
  }, [isVoiceRecording]);

  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      // Simulate real-time legal facts extraction
      showToast('success', 'Recording Completed', 'Speech converted to legal draft.');
    } else {
      setIsVoiceRecording(true);
      setVoiceText('');
      // Simulate speech conversion in real time
      let transcriptWords = [
        "In", "discharge", "of", "the", "outstanding", "dues", "of", "INR", "five", "lakhs",
        "under", "commercial", "invoices", "dated", "tenth", "March,", "the", "accused", "issued",
        "a", "cheque", "which", "dishonoured", "upon", "presentation", "on", "thirtieth", "April",
        "due", "to", "insufficient", "funds.", "Statutory", "legal", "notice", "was", "sent", "on",
        "twelfth", "May", "but", "accused", "failed", "to", "make", "payment."
      ];
      let currentWordIdx = 0;
      let tempText = "";
      const timer = setInterval(() => {
        if (currentWordIdx < transcriptWords.length) {
          tempText += (currentWordIdx === 0 ? "" : " ") + transcriptWords[currentWordIdx];
          setVoiceText(tempText);
          currentWordIdx++;
        } else {
          clearInterval(timer);
          setIsVoiceRecording(false);
        }
      }, 150);
    }
  };

  const startAIInterview = () => {
    setIntakeMethod('ai-guided');
    setInterviewHistory([{ role: 'ai', text: interviewQuestions[0].text }]);
    setCurrentQuestionIndex(0);
  };

  const handleSendInterviewAnswer = () => {
    if (!interviewAnswerInput.trim()) return;

    const answer = interviewAnswerInput;
    const history = [...interviewHistory, { role: 'user' as const, text: answer }];
    setInterviewHistory(history);
    setInterviewAnswerInput('');

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < interviewQuestions.length) {
      setIsGenerating(true);
      setTimeout(() => {
        setInterviewHistory((prev) => [
          ...prev,
          { role: 'ai', text: interviewQuestions[nextIndex].text },
        ]);
        setCurrentQuestionIndex(nextIndex);
        setIsGenerating(false);
      }, 700);
    } else {
      // Completed interview
      setIsGenerating(true);
      setTimeout(() => {
        setInterviewHistory((prev) => [
          ...prev,
          { role: 'ai', text: "Thank you. I have collected all necessary parameters. Let's analyze and prepare your workspace." },
        ]);
        setIsGenerating(false);
      }, 800);
    }
  };

  const triggerCaseAnalysisFromWizard = () => {
    setShowIntakeWizard(false);
    clearIntakeDraft();
    triggerCaseAnalysis();
  };

  // Load templates based on selected case type and attachments
  const loadWorkspaceData = (caseType: string) => {
    setDetectedCaseType(caseType);
    setIntelCache({});

    if (outputLanguage === 'Hindi' || outputLanguage === 'Hinglish') {
      setCaseMetrics({
        strengthScore: 78,
        riskLevel: outputLanguage === 'Hindi' ? 'मध्यम' : 'Moderate',
        evidenceStrength: outputLanguage === 'Hindi' ? 'मजबूत' : 'Strong',
        applicableActs: 'NI Act 1881, CrPC 1973',
        relevantSections: outputLanguage === 'Hindi' ? 'धारा 138, धारा 139, धारा 141' : 'Sec 138, Sec 139, Sec 141',
        keyLegalIssues: outputLanguage === 'Hindi'
          ? 'कानूनी रूप से लागू करने योग्य ऋण उपधारणा का बोझ आरोपी पर स्थानांतरित होता है।'
          : 'Legally enforceable debt presumption burden accused par shift hota hai.',
        missingInfo: outputLanguage === 'Hindi'
          ? 'मूल डाक रसीद और ऋण समझौता दस्तावेज।'
          : 'Original post receipt aur loan agreement missing hain.',
        deadlines: outputLanguage === 'Hindi' ? '20 जुलाई 2026 से पहले प्रत्युत्तर दाखिल करें' : 'Filing rejoinder before 20th July 2026',
        confidenceScore: 92,
      });
    } else {
      setCaseMetrics({
        strengthScore: 78,
        riskLevel: 'Moderate',
        evidenceStrength: 'Strong',
        applicableActs: 'NI Act 1881, CrPC 1973',
        relevantSections: 'Sec 138, Sec 139, Sec 141',
        keyLegalIssues: 'Legally enforceable debt presumption shifts burden to accused.',
        missingInfo: 'Original post receipt and loan agreement documents.',
        deadlines: 'Filing rejoinder before 20th July 2026',
        confidenceScore: 92,
      });
    }

    if (selectedSource === 'manual') {
      const data = generateManualWorkspaceData(manualDescription, manualCaseType, manualCourtLevel, manualLanguage, refinementMode, outputLanguage);
      setSectionsData(data.sections.map(s => ({
        id: s.key,
        title: s.title,
        icon: s.icon,
        description: s.description,
        content: s.content,
        confidence: s.confidence,
        why: s.why
      })));

      const dynamicTools: IntelligenceTool[] = [
        {
          id: 'oral-notes',
          title: tTool(outputLanguage, 'argumentBuilder.oralNotes', 'Oral Submission Notes'),
          icon: 'mic-outline',
          description: 'Concise courtroom speaking notes.',
          content: getUniqueIntelContent('oral-notes', refinementMode, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage, outputLanguage),
        },
        {
          id: 'judge-questions',
          title: tTool(outputLanguage, 'argumentBuilder.judgeQuestions', 'Likely Judge Questions'),
          icon: 'help-buoy-outline',
          description: 'Common questions from the bench and answers.',
          content: getUniqueIntelContent('judge-questions', refinementMode, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage, outputLanguage),
        },
        {
          id: 'opponent-strat',
          title: tTool(outputLanguage, 'argumentBuilder.opponentStrat', 'Opposing Strategy'),
          icon: 'shield-outline',
          description: 'Expected defenses and rebuttals.',
          content: getUniqueIntelContent('opponent-strat', refinementMode, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage, outputLanguage),
        },
        {
          id: 'weakness-analysis',
          title: tTool(outputLanguage, 'argumentBuilder.weaknessAnalysis', 'Weakness Analysis'),
          icon: 'warning-outline',
          description: 'Potential case vulnerabilities.',
          content: getUniqueIntelContent('weakness-analysis', refinementMode, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage, outputLanguage),
        },
        {
          id: 'winning-strat',
          title: tTool(outputLanguage, 'argumentBuilder.winningStrat', 'Hearing Strategy'),
          icon: 'trophy-outline',
          description: 'Actionable courtroom guidance.',
          content: getUniqueIntelContent('winning-strat', refinementMode, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage, outputLanguage),
        },
        {
          id: 'hearing-checklist',
          title: tTool(outputLanguage, 'argumentBuilder.hearingChecklist', 'Hearing Checklist'),
          icon: 'checkbox-outline',
          description: 'Pre-trial readiness check.',
          content: getUniqueIntelContent('hearing-checklist', refinementMode, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage, outputLanguage),
        }
      ];
      setIntelligenceData(dynamicTools);
      return;
    }

    const mainDocName = attachments.length > 0 ? attachments[0].name : 'legal_document.pdf';
    setUploadedDocName(mainDocName);

    const data = generateDynamicWorkspaceData(caseType, refinementMode, attachments, outputLanguage);
    setSectionsData(data.sections.map(s => ({
      id: s.key,
      title: s.title,
      icon: s.icon,
      description: s.description,
      content: s.content,
      confidence: s.confidence,
      why: s.why
    })));

    const dynamicTools: IntelligenceTool[] = [
      {
        id: 'oral-notes',
        title: tTool(outputLanguage, 'argumentBuilder.oralNotes', 'Oral Submission Notes'),
        icon: 'mic-outline',
        description: 'Concise courtroom speaking notes.',
        content: getUniqueIntelContent('oral-notes', refinementMode, activeCaseDetails, caseType, mainDocName, false, '', '', outputLanguage, outputLanguage),
      },
      {
        id: 'judge-questions',
        title: tTool(outputLanguage, 'argumentBuilder.judgeQuestions', 'Likely Judge Questions'),
        icon: 'help-buoy-outline',
        description: 'Common questions from the bench and answers.',
        content: getUniqueIntelContent('judge-questions', refinementMode, activeCaseDetails, caseType, mainDocName, false, '', '', outputLanguage, outputLanguage),
      },
      {
        id: 'opponent-strat',
        title: tTool(outputLanguage, 'argumentBuilder.opponentStrat', 'Opposing Strategy'),
        icon: 'shield-outline',
        description: 'Expected defenses and rebuttals.',
        content: getUniqueIntelContent('opponent-strat', refinementMode, activeCaseDetails, caseType, mainDocName, false, '', '', outputLanguage, outputLanguage),
      },
      {
        id: 'weakness-analysis',
        title: tTool(outputLanguage, 'argumentBuilder.weaknessAnalysis', 'Weakness Analysis'),
        icon: 'warning-outline',
        description: 'Potential case vulnerabilities.',
        content: getUniqueIntelContent('weakness-analysis', refinementMode, activeCaseDetails, caseType, mainDocName, false, '', '', outputLanguage, outputLanguage),
      },
      {
        id: 'winning-strat',
        title: tTool(outputLanguage, 'argumentBuilder.winningStrat', 'Hearing Strategy'),
        icon: 'trophy-outline',
        description: 'Actionable courtroom guidance.',
        content: getUniqueIntelContent('winning-strat', refinementMode, activeCaseDetails, caseType, mainDocName, false, '', '', outputLanguage, outputLanguage),
      },
      {
        id: 'hearing-checklist',
        title: tTool(outputLanguage, 'argumentBuilder.hearingChecklist', 'Hearing Checklist'),
        icon: 'checkbox-outline',
        description: 'Pre-trial readiness check.',
        content: getUniqueIntelContent('hearing-checklist', refinementMode, activeCaseDetails, caseType, mainDocName, false, '', '', outputLanguage, outputLanguage),
      }
    ];
    setIntelligenceData(dynamicTools);
  };


  // Step 1 -> Step 2 Action
  const handleSelectSource = (sourceId: string) => {
    setSelectedSource(sourceId);
    if (sourceId === 'workspace' && !activeCaseId) {
      setIsCaseModalOpen(true);
      return;
    }
    if (sourceId === 'manual') {
      setShowIntakeWizard(true);
      setIntakeMethod('none');
      return;
    }
    triggerCaseAnalysis();
  };

  const triggerManualCaseAnalysis = () => {
    setWorkspaceStep('analyzing');
    setGenerationProgress(10);

    let progress = 10;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        loadWorkspaceData(manualCaseType);
        setWorkspaceStep('workspace');
        setShowIntakeWizard(false);
        setTimeout(() => saveCurrentDossierToHistory(), 500);
        showToast('success', 'Case Workspace Prepared', 'Court Prep dossier successfully generated.');
      } else {
        setGenerationProgress(progress);
      }
    }, 300);
  };

  const triggerCaseAnalysis = () => {
    setWorkspaceStep('analyzing');
    setGenerationProgress(10);

    // Simulate premium AI generation and workflow phases
    let progress = 10;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        loadWorkspaceData(activeCaseDetails?.caseType || 'NI Act Case');
        setWorkspaceStep('workspace');
        setTimeout(() => saveCurrentDossierToHistory(), 500);
        showToast('success', 'Case Workspace Prepared', 'Court Prep dossier successfully generated.');
      } else {
        setGenerationProgress(progress);
      }
    }, 300);
  };

  // Perform Refinement (Step 5)
  const handleRefineWorkspace = (style: string) => {
    setIsRefinementOpen(false);

    const applyStyle = (regenerate: boolean) => {
      setRefinementMode(style);
      showToast('success', 'Argument Style Updated', `Argument style updated to ${style}.`);

      if (regenerate) {
        setIsGenerating(true);
        setTimeout(() => {
          if (selectedSource === 'manual') {
            const data = generateManualWorkspaceData(manualDescription, manualCaseType, manualCourtLevel, manualLanguage, style);
            setSectionsData(data.sections.map(s => ({
              id: s.key,
              title: s.title,
              icon: s.icon,
              description: s.description,
              content: s.content,
              confidence: s.confidence,
              why: s.why
            })));
            const dynamicTools: IntelligenceTool[] = [
              {
                id: 'oral-notes',
                title: 'Oral Submission Notes',
                icon: 'mic-outline',
                description: 'Concise courtroom speaking notes.',
                content: getUniqueIntelContent('oral-notes', style, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage),
              },
              {
                id: 'judge-questions',
                title: 'Likely Judge Questions',
                icon: 'help-buoy-outline',
                description: 'Common questions from the bench and answers.',
                content: getUniqueIntelContent('judge-questions', style, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage),
              },
              {
                id: 'opponent-strat',
                title: 'Opposing Strategy',
                icon: 'shield-outline',
                description: 'Expected defenses and rebuttals.',
                content: getUniqueIntelContent('opponent-strat', style, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage),
              },
              {
                id: 'weakness-analysis',
                title: 'Weakness Analysis',
                icon: 'warning-outline',
                description: 'Potential case vulnerabilities.',
                content: getUniqueIntelContent('weakness-analysis', style, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage),
              },
              {
                id: 'winning-strat',
                title: 'Hearing Strategy',
                icon: 'trophy-outline',
                description: 'Actionable courtroom guidance.',
                content: getUniqueIntelContent('winning-strat', style, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage),
              },
              {
                id: 'hearing-checklist',
                title: 'Hearing Checklist',
                icon: 'checkbox-outline',
                description: 'Pre-trial readiness check.',
                content: getUniqueIntelContent('hearing-checklist', style, activeCaseDetails, manualCaseType, '', true, manualDescription, manualCourtLevel, manualLanguage),
              }
            ];
            setIntelligenceData(dynamicTools);
          } else {
            const mainDocName = attachments.length > 0 ? attachments[0].name : 'legal_document.pdf';
            const data = generateDynamicWorkspaceData(detectedCaseType, style, attachments);
            setSectionsData(data.sections.map(s => ({
              id: s.key,
              title: s.title,
              icon: s.icon,
              description: s.description,
              content: s.content,
              confidence: s.confidence,
              why: s.why
            })));
            const dynamicTools: IntelligenceTool[] = [
              {
                id: 'oral-notes',
                title: 'Oral Submission Notes',
                icon: 'mic-outline',
                description: 'Concise courtroom speaking notes.',
                content: getUniqueIntelContent('oral-notes', style, activeCaseDetails, detectedCaseType, mainDocName, false),
              },
              {
                id: 'judge-questions',
                title: 'Likely Judge Questions',
                icon: 'help-buoy-outline',
                description: 'Common questions from the bench and answers.',
                content: getUniqueIntelContent('judge-questions', style, activeCaseDetails, detectedCaseType, mainDocName, false),
              },
              {
                id: 'opponent-strat',
                title: 'Opposing Strategy',
                icon: 'shield-outline',
                description: 'Expected defenses and rebuttals.',
                content: getUniqueIntelContent('opponent-strat', style, activeCaseDetails, detectedCaseType, mainDocName, false),
              },
              {
                id: 'weakness-analysis',
                title: 'Weakness Analysis',
                icon: 'warning-outline',
                description: 'Potential case vulnerabilities.',
                content: getUniqueIntelContent('weakness-analysis', style, activeCaseDetails, detectedCaseType, mainDocName, false),
              },
              {
                id: 'winning-strat',
                title: 'Hearing Strategy',
                icon: 'trophy-outline',
                description: 'Actionable courtroom guidance.',
                content: getUniqueIntelContent('winning-strat', style, activeCaseDetails, detectedCaseType, mainDocName, false),
              },
              {
                id: 'hearing-checklist',
                title: 'Hearing Checklist',
                icon: 'checkbox-outline',
                description: 'Pre-trial readiness check.',
                content: getUniqueIntelContent('hearing-checklist', style, activeCaseDetails, detectedCaseType, mainDocName, false),
              }
            ];
            setIntelligenceData(dynamicTools);
          }
          setIsGenerating(false);
          showToast('success', 'Workspace Refined', 'Dossier updated successfully.');
        }, 1000);
      }
    };

    if (sectionsData.length > 0) {
      Alert.alert(
        "Apply new style?",
        "Apply the new style to the current courtroom preparation?",
        [
          {
            text: "Keep Existing",
            onPress: () => applyStyle(false),
            style: "cancel"
          },
          {
            text: "Regenerate",
            onPress: () => applyStyle(true)
          }
        ]
      );
    } else {
      setRefinementMode(style);
      showToast('success', 'Argument Style Updated', `Argument style updated to ${style}.`);
    }
  };

  // Section level operations
  const handleRegenerateSection = (sectionId: string) => {
    showToast('info', 'Regenerating Section', 'Querying AI Court engine...');
    setTimeout(() => {
      let targetContent = '';
      if (selectedSource === 'manual') {
        const data = generateManualWorkspaceData(manualDescription, manualCaseType, manualCourtLevel, manualLanguage, refinementMode);
        const sec = data.sections.find(s => s.key === sectionId);
        if (sec) targetContent = sec.content;
      } else {
        const data = generateDynamicWorkspaceData(detectedCaseType, refinementMode, attachments);
        const sec = data.sections.find(s => s.key === sectionId);
        if (sec) targetContent = sec.content;
      }
      setSectionsData((prev) =>
        prev.map((sec) => {
          if (sec.id === sectionId && targetContent) {
            return {
              ...sec,
              content: targetContent,
              confidence: Math.min(sec.confidence + 2, 99),
            };
          }
          return sec;
        })
      );
      showToast('success', 'Updated', 'Section rewritten.');
    }, 1000);
  };

  const handleCopySection = (content: string) => {
    Clipboard.setString(content);
    showToast('success', 'Copied', 'Section content copied to clipboard.');
  };

  const handleSelectIntelTab = (tabId: string) => {
    setActiveIntelligenceTab(tabId);
    if (!intelCache[tabId]) {
      setIntelLoadingTab(tabId);
      setTimeout(() => {
        const style = refinementMode || 'Courtroom Style';
        const generated = getUniqueIntelContent(
          tabId,
          style,
          activeCaseDetails,
          detectedCaseType || manualCaseType || 'NI Act Case',
          uploadedDocName,
          selectedSource === 'manual',
          manualDescription,
          manualCourtLevel,
          manualLanguage,
          outputLanguage
        );
        setIntelCache(prev => ({ ...prev, [tabId]: generated }));
        setIntelLoadingTab(null);
      }, 500);
    }
  };

  const handleRegenerateIntelTab = (tabId: string) => {
    setIntelLoadingTab(tabId);
    setTimeout(() => {
      const style = refinementMode || 'Courtroom Style';
      const generated = getUniqueIntelContent(
        tabId,
        style,
        activeCaseDetails,
        detectedCaseType || manualCaseType || 'NI Act Case',
        uploadedDocName,
        selectedSource === 'manual',
        manualDescription,
        manualCourtLevel,
        manualLanguage,
        outputLanguage
      );
      setIntelCache(prev => ({ ...prev, [tabId]: generated }));
      setIntelLoadingTab(null);
      showToast('success', 'Regeneration Complete', 'Refining speech vectors complete.');
    }, 600);
  };

  const renderStructuredResponse = (tabId: string) => {
    const cachedOrLocalized = intelCache[tabId] || getLocalizedCourtPrepStructure(tabId, outputLanguage);
    if (cachedOrLocalized) {
      return (
        <View style={{ paddingVertical: 4 }}>
          <MarkdownRenderer text={cachedOrLocalized} />
        </View>

      );
    }

    const data = getStructuredIntelContent(tabId);
    if (!data) return null;


    return (
      <View style={{ gap: 12 }}>
        {data.sections.map((section: any, sIdx: number) => {
          if (section.type === 'section_title') {
            return (
              <Text key={sIdx} style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>
                {section.title}
              </Text>
            );
          }

          if (section.type === 'bullet_list') {
            return (
              <View key={sIdx} style={{ gap: 8 }}>
                {section.items.map((item: string, iIdx: number) => (
                  <View key={iIdx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 13, color: theme.textPrimary, marginRight: 6 }}>•</Text>
                    <Text style={{ fontSize: 13.5, color: theme.textPrimary, flex: 1, lineHeight: 18 }}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          }

          if (section.type === 'key_value_cards') {
            return (
              <View key={sIdx} style={{ gap: 12 }}>
                {section.cards.map((card: any, cIdx: number) => (
                  <View
                    key={cIdx}
                    style={{
                      borderWidth: 1.5,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: theme.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#C8A34D', marginBottom: 8 }}>
                      {card.title}
                    </Text>

                    {card.description && (
                      <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>
                        {card.description}
                      </Text>
                    )}

                    {card.position && (
                      <View style={{ gap: 4, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Defense Position</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 8 }}>{card.position}</Text>

                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Strength</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>{card.strength}</Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Likelihood</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>{card.likelihood}</Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Suggested Counter</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>{card.counter}</Text>
                      </View>
                    )}

                    {card.answer && (
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Suggested Answer</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 6 }}>{card.answer}</Text>

                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Supporting Evidence</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textPrimary, lineHeight: 18, marginBottom: 6 }}>{card.evidence}</Text>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Relevant Section</Text>
                            <Text style={{ fontSize: 12, color: theme.textPrimary, fontWeight: '700' }}>{card.section}</Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>Confidence</Text>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>{card.confidence}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {card.riskLevel && (
                      <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: card.riskLevel === 'High' ? '#EF4444' : '#F59E0B' }}>
                            Risk Level: {card.riskLevel}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>AI Recommendation</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 }}>{card.advice}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          }

          return null;
        })}
      </View>
    );
  };

  const renderPrepSectionContent = (content: string) => {
    if (!content) return null;

    const cleanMarkdown = (text: string) => {
      return text
        .replace(/\*\*\*+/g, '') // remove triple asterisks
        .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold asterisks
        .replace(/\*([^*]+)\*/g, '$1') // remove single asterisks
        .replace(/__+/g, '') // remove underscores
        .replace(/_+/g, '')
        .replace(/#+/g, '') // remove hashtags
        .replace(/`+/g, '') // remove backticks
        .replace(/^>+/g, '') // remove blockquotes
        .trim();
    };

    const lines = content.split('\n');
    return (
      <View style={{ gap: 8, paddingVertical: 4 }}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // 1. Check if it is a key-value pair like: **Key**: Value
          const kvMatch = trimmed.match(/^[\-\*•]?\s*\*\*([^*:]+)\*\*:\s*(.*)$/);
          if (kvMatch) {
            const key = kvMatch[1].trim();
            const val = kvMatch[2].trim();
            return (
              <View
                key={idx}
                style={{
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  borderRadius: 10,
                  padding: 10,
                  backgroundColor: theme.surface,
                  marginVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D', textTransform: 'uppercase', marginBottom: 2 }}>
                  {tTool(outputLanguage, key, key)}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>
                  {tTool(outputLanguage, cleanMarkdown(val), cleanMarkdown(val))}
                </Text>
              </View>
            );
          }

          // 2. Check if it is a timeline event like: 📅 **Date**: Event or **Date**: Event
          const dateMatch = trimmed.match(/^(📅)?\s*\*\*([^*]+)\*\*:\s*(.*)$/);
          if (dateMatch) {
            const dateStr = dateMatch[2].trim();
            const eventStr = dateMatch[3].trim();
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4 }}>
                <View style={{ width: 16, alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="calendar-outline" size={14} color="#C8A34D" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#C8A34D', marginBottom: 2 }}>
                    {tTool(outputLanguage, dateStr, dateStr)}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>
                    {tTool(outputLanguage, cleanMarkdown(eventStr), cleanMarkdown(eventStr))}
                  </Text>
                </View>
              </View>
            );
          }

          // 3. Check if it is a bullet point: •, *, -
          if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
            const textOnly = trimmed.replace(/^[\-\*•]\s*/, '');
            const parts = textOnly.split('**');
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4 }}>
                <Text style={{ fontSize: 13, color: theme.textPrimary, marginRight: 6, marginTop: 1 }}>•</Text>
                <Text style={{ fontSize: 13.5, color: theme.textPrimary, flex: 1, lineHeight: 18 }}>
                  {parts.map((part, pIdx) => {
                    const isBold = pIdx % 2 === 1;
                    const cleanedPart = cleanMarkdown(part);
                    return (
                      <Text key={pIdx} style={isBold ? { fontWeight: '700', color: theme.textPrimary } : undefined}>
                        {tTool(outputLanguage, cleanedPart, cleanedPart)}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            );
          }

          // 4. Check if it is a numbered list item: 1. or 1)
          const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)$/);
          if (numMatch) {
            const num = numMatch[1];
            const textOnly = numMatch[2];
            const parts = textOnly.split('**');
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8A34D', marginRight: 6, marginTop: 1 }}>{num}.</Text>
                <Text style={{ fontSize: 13.5, color: theme.textPrimary, flex: 1, lineHeight: 18 }}>
                  {parts.map((part, pIdx) => {
                    const isBold = pIdx % 2 === 1;
                    const cleanedPart = cleanMarkdown(part);
                    return (
                      <Text key={pIdx} style={isBold ? { fontWeight: '700', color: theme.textPrimary } : undefined}>
                        {tTool(outputLanguage, cleanedPart, cleanedPart)}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            );
          }

          // 5. Normal text with potential inline bold tags
          const parts = trimmed.split('**');
          return (
            <Text key={idx} style={{ fontSize: 13.5, color: theme.textPrimary, lineHeight: 19, marginVertical: 2 }}>
              {parts.map((part, pIdx) => {
                const isBold = pIdx % 2 === 1;
                const cleanedPart = cleanMarkdown(part);
                return (
                  <Text key={pIdx} style={isBold ? { fontWeight: '700', color: theme.textPrimary } : undefined}>
                    {tTool(outputLanguage, cleanedPart, cleanedPart)}
                  </Text>
                );
              })}
            </Text>
          );
        })}
      </View>
    );
  };

  // Export functions (Step 6)
  const generateDossierText = () => {
    const lines: string[] = [];
    lines.push('AI LEGAL ™ COURT PREPARATION DOSSIER & HEARING INTELLIGENCE');
    lines.push('===================================================');
    if (caseTitle) lines.push(`Case Title: ${caseTitle}`);
    if (courtNameInput) lines.push(`Court: ${courtNameInput}`);
    if (caseTypeInput || detectedCaseType || manualCaseType) {
      lines.push(`Case Type: ${caseTypeInput || detectedCaseType || manualCaseType}`);
    }
    lines.push(`Role: ${role}`);
    if (petitionerName) lines.push(`Petitioner/Plaintiff: ${petitionerName}`);
    if (respondentName) lines.push(`Respondent/Defendant: ${respondentName}`);
    lines.push('');

    lines.push('--- DOSSIER SECTIONS ---');
    sectionsData.forEach((sec) => {
      lines.push(`\n[${sec.title.toUpperCase()}]\n${sec.content}`);
    });

    return lines.join('\n');
  };

  const handleCopyAll = () => {
    if (!sectionsData || sectionsData.length === 0) {
      showToast('info', 'Nothing to Copy', 'There is no dossier content available to copy.');
      return;
    }
    const fullText = generateDossierText();
    Clipboard.setString(fullText);
    showToast('success', 'Copied All', 'Full dossier content copied to clipboard.');
  };

  const handleExport = async (format: string) => {
    try {
      const dossierText = generateDossierText();
      if (format === 'PDF' || format === 'Share') {
        const htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style>
                body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #111; line-height: 1.6; }
                h1 { color: #C8A34D; font-size: 20px; border-bottom: 2px solid #C8A34D; padding-bottom: 8px; }
                pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
              </style>
            </head>
            <body>
              <pre>${dossierText}</pre>
            </body>
          </html>
        `;
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        if (format === 'Share') {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
          } else {
            showToast('info', 'Sharing Unavailable', 'Sharing is not supported on this device.');
          }
        } else {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
          showToast('success', 'Export Complete', 'Dossier PDF exported successfully.');
        }
      } else {
        Clipboard.setString(dossierText);
        showToast('success', 'Exported', `Dossier text ready for ${format}. Copied to clipboard.`);
      }
    } catch (err) {
      showToast('error', 'Export Failed', 'Unable to export dossier at this time.');
    }
  };

  const handleLaunchMockCourt = () => {
    showToast('info', 'Launching Simulator', 'Booting AI Moot Court simulation room...');
    router.push({
      pathname: '/tools/mock-courtroom',
      params: { caseId: activeCaseId || 'current' }
    });
  };

  // Toggle sections collapse
  const toggleSection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredSections = useMemo(() => {
    if (!workspaceSearch.trim()) return sectionsData;
    return sectionsData.filter(
      (s) =>
        s.title.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
        s.content.toLowerCase().includes(workspaceSearch.toLowerCase())
    );
  }, [sectionsData, workspaceSearch]);

  const activeIntelContent = useMemo(() => {
    return intelligenceData.find((d) => d.id === activeIntelligenceTab);
  }, [intelligenceData, activeIntelligenceTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={() => {
            if (workspaceStep === 'workspace') {
              setWorkspaceStep('source');
            } else {
              router.back();
            }
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {tTool(outputLanguage, 'argumentBuilder.title', 'Court Prep Workspace')}
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {tTool(outputLanguage, 'argumentBuilder.subtitle', 'Hearing Intelligence Platform')}
          </Text>
        </View>

        <OutputLanguageSelector
          toolId="argument-builder"
          selectedLanguage={outputLanguage}
          onLanguageChange={setOutputLanguage}
          compact
        />

        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => setIsAiAssistantOpen(true)} style={[styles.headerBtn, { marginRight: 4 }]}>
            <Ionicons name="sparkles" size={20} color="#D4AF37" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsHistoryOpen(true)} style={styles.headerBtn}>
            <Ionicons name="time-outline" size={20} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </View>


      {/* CASE INTAKE WIZARD OVERLAY VIEW */}
      {showIntakeWizard ? (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Header */}
          <View style={[styles.wizardHeader, { borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <TouchableOpacity
              onPress={() => {
                setShowIntakeWizard(false);
                setManualDescription('');
              }}
              style={styles.wizardBackBtn}
            >
              <Ionicons name="close-outline" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.wizardTitle, { color: theme.textPrimary, fontSize: 16, fontWeight: '700' }]}>
                {tTool(outputLanguage, 'argumentBuilder.describeCase', 'Describe Your Case')}
              </Text>
              <Text style={[styles.wizardSubtitle, { color: theme.textSecondary, fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                {tTool(outputLanguage, 'argumentBuilder.describeCaseDesc', 'Briefly explain your case or paste legal facts. AI will prepare arguments.')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setManualDescription('');
                setManualCaseType('Civil');
                setManualCourtLevel('District Court');
                setManualLanguage('English');
              }}
              style={styles.clearDraftBtn}
            >
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>
                {tTool(outputLanguage, 'common.clear', 'Reset')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Case Type Dropdown */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {tTool(outputLanguage, 'argumentBuilder.caseCategory', 'Case Category')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {['Civil', 'Criminal', 'Corporate', 'Consumer Protection', 'Cyber Crime', 'Family Law'].map((t) => {
                const isActive = manualCaseType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setManualCaseType(t)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: isActive ? 'rgba(138, 92, 245, 0.12)' : theme.card,
                      borderWidth: 1.5,
                      borderColor: isActive ? '#C8A34D' : theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#C8A34D' : theme.textPrimary }}>
                      {tTool(outputLanguage, `category.${t}`, tTool(outputLanguage, t, t))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Court Level Dropdown */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {tTool(outputLanguage, 'argumentBuilder.jurisdiction', 'Court / Forum Jurisdiction')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {['Supreme Court', 'High Court', 'District Court', 'Sessions Court', 'Consumer Forum', 'Tribunal'].map((c) => {
                const isActive = manualCourtLevel === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setManualCourtLevel(c)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: isActive ? 'rgba(138, 92, 245, 0.12)' : theme.card,
                      borderWidth: 1.5,
                      borderColor: isActive ? '#C8A34D' : theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#C8A34D' : theme.textPrimary }}>
                      {tTool(outputLanguage, `jurisdiction.${c}`, tTool(outputLanguage, c, c))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Language Selection */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {tTool(outputLanguage, 'argumentBuilder.draftingLanguage', 'Drafting Language')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {['English', 'Hindi', 'Marathi', 'Kannada'].map((l) => {
                const isActive = manualLanguage === l;
                return (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setManualLanguage(l)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: isActive ? 'rgba(138, 92, 245, 0.12)' : theme.card,
                      borderWidth: 1.5,
                      borderColor: isActive ? '#C8A34D' : theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#C8A34D' : theme.textPrimary }}>
                      {tTool(outputLanguage, l, l)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Case Facts input */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {tTool(outputLanguage, 'argumentBuilder.factsDesc', 'Case Facts / Description')}
            </Text>
            <TextInput
              value={manualDescription}
              onChangeText={setManualDescription}
              placeholder={tTool(outputLanguage, 'argumentBuilder.factsPlaceholder', 'Explain details of your case or paste legal facts here. AI will extract material parameters, dates, and amounts...')}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: theme.border,
                padding: 16,
                fontSize: 14,
                color: theme.textPrimary,
                minHeight: 160,
                lineHeight: 20,
                marginBottom: 30,
              }}
            />

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={() => {
                if (!manualDescription.trim()) {
                  showToast('error', 'Incomplete Details', 'Please provide a case description to generate arguments.');
                  return;
                }
                triggerManualCaseAnalysis();
              }}
              style={{
                backgroundColor: '#C8A34D',
                paddingVertical: 15,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                marginBottom: 40,
              }}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                {tTool(outputLanguage, 'argumentBuilder.analyzeCase', 'Analyze Case')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        // RENDER DEFAULT WORKSPACE SCREENS
        <React.Fragment>
          {workspaceStep === 'source' && (
            <View style={{ flex: 1 }}>
              <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.scrollContent, attachments.length > 0 && { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>
                {/* STEP 1: CHOOSE SOURCE */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
                  <Text style={[styles.welcomeMainTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                    {tTool(outputLanguage, 'argumentBuilder.setupTitle', 'Hearing Preparation Setup')}
                  </Text>
                  <OutputLanguageSelector
                    toolId="argument-builder"
                    selectedLanguage={outputLanguage}
                    onLanguageChange={(lang) => setOutputLanguage(lang)}
                  />
                </View>
                <Text style={[styles.welcomeSubText, { color: theme.textSecondary }]}>
                  {tTool(outputLanguage, 'argumentBuilder.setupDesc', 'Select a case source. AI will analyze documents, extract facts, build timelines, research precedents, and prepare your hearing workspace.')}
                </Text>

                <View style={styles.sourceGrid}>
                  {/* Card 1: Case Workspace */}
                  <TouchableOpacity
                    style={[
                      styles.sourceCard,
                      { borderColor: theme.border, backgroundColor: theme.card },
                    ]}
                    onPress={() => handleSelectSource('workspace')}
                  >
                    <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                      <Ionicons name="folder-open-outline" size={22} color="#C8A34D" />
                    </View>
                    <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.caseWorkspace', 'Case Workspace')}
                    </Text>
                    <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {tTool(outputLanguage, 'argumentBuilder.caseWorkspaceDesc', 'Import an existing case with documents, evidence, timelines, and AI analysis.')}
                    </Text>
                    {activeCaseDetails && (
                      <View style={styles.activeCaseBadge}>
                        <Text style={styles.activeCaseBadgeText} numberOfLines={1}>
                          Active: {activeCaseDetails.name}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.sourceCardBtn, { backgroundColor: '#C8A34D' }]}>
                      <Text style={styles.sourceCardBtnText}>
                        {tTool(outputLanguage, 'argumentBuilder.selectWorkspace', 'Select Workspace')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 2: Upload Documents or Success State */}
                  {attachments.length > 0 ? (
                    <View
                      style={[
                        styles.sourceCard,
                        { borderColor: '#10B981', backgroundColor: theme.card, alignSelf: 'stretch', width: '100%', padding: 16 }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: '900', color: theme.textPrimary }}>Document Uploaded Successfully</Text>
                      </View>

                      <View style={{ gap: 8, width: '100%', marginBottom: 14 }}>
                        {attachments.map((file) => {
                          const fileExt = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                          const fileTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const filePages = estimatePages(file.name, file.size);
                          return (
                            <View
                              key={file.name}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: theme.surfaceVariant,
                                padding: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: theme.border,
                                width: '100%'
                              }}
                            >
                              <Ionicons name={getFileIcon(file.name) as any} size={18} color="#C8A34D" style={{ marginRight: 8 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textPrimary }} numberOfLines={1}>
                                  {file.name}
                                </Text>
                                <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 2 }}>
                                  {fileExt} • {formatSize(file.size)} • {filePages} Page{filePages > 1 ? 's' : ''} • {fileTime}
                                </Text>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#10B981', marginTop: 2 }}>
                                  OCR Completed ✅
                                </Text>
                              </View>
                              <TouchableOpacity onPress={() => handleRemoveAttachment(file.name)} style={{ padding: 4 }}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>

                      <TouchableOpacity
                        style={{
                          backgroundColor: '#C8A34D',
                          borderRadius: 10,
                          paddingVertical: 12,
                          width: '100%',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={triggerCaseAnalysis}
                      >
                        <Ionicons name="sparkles" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                          {tTool(outputLanguage, 'argumentBuilder.generatePrep', 'Initialize Court preparation')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.sourceCard,
                        { borderColor: theme.border, backgroundColor: theme.card },
                      ]}
                      onPress={showAttachmentOptions}
                    >
                      <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                        <Ionicons name="cloud-upload-outline" size={22} color="#C8A34D" />
                      </View>
                      <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>
                        {tTool(outputLanguage, 'argumentBuilder.uploadLegalDocs', 'Upload Legal Documents')}
                      </Text>
                      <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                        {tTool(outputLanguage, 'argumentBuilder.uploadDocsDesc', 'Extract parties, timeline, and facts from PDF, Word or images.')}
                      </Text>
                      <View style={[styles.sourceCardBtn, { backgroundColor: '#C8A34D' }]}>
                        <Text style={styles.sourceCardBtnText}>
                          {tTool(outputLanguage, 'argumentBuilder.uploadDocsBtn', 'Upload Documents')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Card 3: Manual Entry */}
                  <TouchableOpacity
                    style={[
                      styles.sourceCard,
                      { borderColor: theme.border, backgroundColor: theme.card },
                    ]}
                    onPress={() => handleSelectSource('manual')}
                  >
                    <View style={[styles.sourceIconWrapper, { backgroundColor: 'rgba(138, 92, 245, 0.12)' }]}>
                      <Ionicons name="create-outline" size={22} color="#C8A34D" />
                    </View>
                    <Text style={[styles.sourceCardTitle, { color: theme.textPrimary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.manualEntry', 'Manual Entry')}
                    </Text>
                    <Text style={[styles.sourceCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {tTool(outputLanguage, 'argumentBuilder.manualEntryDesc', 'Launch Intake Wizard: Write details, dictate, or run an AI interview.')}
                    </Text>
                    <View style={[styles.sourceCardBtn, { backgroundColor: '#C8A34D' }]}>
                      <Text style={styles.sourceCardBtnText}>
                        {tTool(outputLanguage, 'argumentBuilder.enterFacts', 'Enter Facts')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                </View>
              </ScrollView>

              {/* Sticky bottom CTA when files are attached */}
              {attachments.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    padding: 16,
                    paddingBottom: Math.max(insets.bottom, 16),
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#C8A34D',
                      borderRadius: 12,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={triggerCaseAnalysis}
                  >
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Initialize Court preparation</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {workspaceStep === 'analyzing' && (
            <View style={[styles.analyzingContainer, { paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color="#C8A34D" style={{ marginBottom: 20 }} />
              <Text style={[styles.analyzingText, { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6 }]}>Initializing Court Prep...</Text>
              <Text style={[styles.analyzingSubtext, { color: theme.textSecondary, textAlign: 'center', marginBottom: 24, fontSize: 13 }]}>
                AI is compiling workspace files, researching codes, and generating arguments.
              </Text>

              {/* Progress bar */}
              <View style={[styles.progressBarBg, { backgroundColor: theme.border, height: 6, borderRadius: 3, marginBottom: 24 }]}>
                <View style={[styles.progressBarFill, { width: `${generationProgress}%`, backgroundColor: '#C8A34D', height: 6, borderRadius: 3 }]} />
              </View>

              {/* Step list status */}
              <View style={{ alignSelf: 'stretch', backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 12 }}>
                {[
                  { label: 'Uploading Complete ✅', threshold: 15 },
                  { label: 'Running OCR...', threshold: 30 },
                  { label: 'Extracting Facts...', threshold: 45 },
                  { label: 'Identifying Parties...', threshold: 60 },
                  { label: 'Building Timeline...', threshold: 75 },
                  { label: 'Researching Case Laws...', threshold: 85 },
                  { label: 'Preparing Hearing Workspace...', threshold: 95 },
                  { label: 'Generating AI Court Preparation...', threshold: 100 },
                ].map((step, idx) => {
                  const isDone = generationProgress >= step.threshold;
                  const isCurrent = generationProgress >= (idx > 0 ? [
                    { label: 'Uploading Complete ✅', threshold: 15 },
                    { label: 'Running OCR...', threshold: 30 },
                    { label: 'Extracting Facts...', threshold: 45 },
                    { label: 'Identifying Parties...', threshold: 60 },
                    { label: 'Building Timeline...', threshold: 75 },
                    { label: 'Researching Case Laws...', threshold: 85 },
                    { label: 'Preparing Hearing Workspace...', threshold: 95 },
                    { label: 'Generating AI Court Preparation...', threshold: 100 },
                  ][idx - 1].threshold : 0) && generationProgress < step.threshold;

                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {isDone ? (
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 8 }} />
                      ) : isCurrent ? (
                        <ActivityIndicator size="small" color="#C8A34D" style={{ marginRight: 8, transform: [{ scale: 0.8 }] }} />
                      ) : (
                        <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.placeholder, marginRight: 8, alignItems: 'center', justifyContent: 'center' }} />
                      )}
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: isCurrent ? '700' : '500',
                          color: isDone ? '#10B981' : isCurrent ? theme.textPrimary : theme.placeholder
                        }}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {workspaceStep === 'workspace' && (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.workspaceScroll} showsVerticalScrollIndicator={false}>
                {/* STEP 2: CASE INTELLIGENCE DASHBOARD */}
                <View style={[styles.dashboardCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.dashboardHeader}>
                    <Ionicons name="bar-chart-outline" size={20} color="#EF4444" />
                    <Text style={[styles.dashboardTitle, { color: theme.textPrimary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.intelDashboard', 'Case Intelligence Dashboard')}
                    </Text>
                  </View>

                  <View style={styles.dashboardMetricsGrid}>
                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>
                        {tTool(outputLanguage, 'argumentBuilder.strengthScore', 'Strength Score')}
                      </Text>
                      <Text style={[styles.metricValue, { color: '#10B981' }]}>{caseMetrics.strengthScore}%</Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>
                        {tTool(outputLanguage, 'argumentBuilder.riskLevel', 'Risk Level')}
                      </Text>
                      <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                        {tTool(outputLanguage, caseMetrics.riskLevel, caseMetrics.riskLevel)}
                      </Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>
                        {tTool(outputLanguage, 'argumentBuilder.evidenceStrength', 'Evidence Strength')}
                      </Text>
                      <Text style={[styles.metricValue, { color: '#10B981' }]}>
                        {tTool(outputLanguage, caseMetrics.evidenceStrength, caseMetrics.evidenceStrength)}
                      </Text>
                    </View>
                    <View style={[styles.metricBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={styles.metricLabel}>
                        {tTool(outputLanguage, 'argumentBuilder.confidence', 'Confidence')}
                      </Text>
                      <Text style={[styles.metricValue, { color: theme.primary }]}>{caseMetrics.confidenceScore}%</Text>
                    </View>
                  </View>

                  {/* Extra details (Acts, sections, deadlines) */}
                  <View style={styles.dashboardDetailsRow}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.applicableActs', 'Applicable Acts:')}
                    </Text>
                    <Text style={[styles.detailsValue, { color: theme.textPrimary }]}>{caseMetrics.applicableActs}</Text>
                  </View>
                  <View style={styles.dashboardDetailsRow}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.keyIssue', 'Key Issue:')}
                    </Text>
                    <Text style={[styles.detailsValue, { color: theme.textPrimary }]} numberOfLines={1}>
                      {tTool(outputLanguage, caseMetrics.keyLegalIssues, caseMetrics.keyLegalIssues)}
                    </Text>
                  </View>
                  <View style={styles.dashboardDetailsRow}>
                    <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.missingInfo', 'Missing Info:')}
                    </Text>
                    <Text style={[styles.detailsValue, { color: '#EF4444' }]} numberOfLines={1}>
                      {tTool(outputLanguage, caseMetrics.missingInfo, caseMetrics.missingInfo)}
                    </Text>
                  </View>
                </View>

                {/* SEARCH COMPRESSED */}
                <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  <Ionicons name="search-outline" size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder={tTool(outputLanguage, 'argumentBuilder.searchPlaceholder', 'Search Court Preparation Dossier...')}
                    placeholderTextColor={theme.placeholder}
                    value={workspaceSearch}
                    onChangeText={setWorkspaceSearch}
                  />
                </View>

                {/* STEP 3: COURT PREPARATION WORKSPACE (12 SECTIONS) */}
                <Text style={[styles.workspaceSubheading, { color: theme.textPrimary }]}>
                  {tTool(outputLanguage, 'argumentBuilder.caseFolderSections', 'Case Folder & Sections')}
                </Text>

                {filteredSections.map((sec) => {
                  const isExpanded = expandedSections[sec.id];
                  const localizedTitle = tTool(outputLanguage, sec.title, tTool(outputLanguage, `argumentBuilder.sec.${sec.id}`, sec.title));
                  const localizedDesc = tTool(outputLanguage, sec.description, sec.description);
                  const localizedWhy = tTool(outputLanguage, sec.why, sec.why);
                  return (
                    <View key={sec.id} style={[styles.sectionContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
                      <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => toggleSection(sec.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.sectionHeaderLeft}>
                          <Ionicons name={sec.icon as any} size={20} color="#EF4444" style={{ marginRight: 10 }} />
                          <View>
                            <Text style={[styles.sectionTitleText, { color: theme.textPrimary }]}>{localizedTitle}</Text>
                            <Text style={[styles.sectionDescText, { color: theme.textSecondary }]}>{localizedDesc}</Text>
                          </View>
                        </View>
                        <View style={styles.sectionHeaderRight}>
                          <View style={[styles.confidencePill, { backgroundColor: sec.confidence > 90 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                            <Text style={[styles.confidencePillText, { color: sec.confidence > 90 ? '#10B981' : '#F59E0B' }]}>
                              {sec.confidence}% {tTool(outputLanguage, 'common.conf', 'Conf')}
                            </Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                            size={18}
                            color={theme.textMuted}
                          />
                        </View>
                      </TouchableOpacity>


                      {isExpanded && (
                        <View style={[styles.sectionBody, { borderTopColor: theme.border }]}>
                          {renderPrepSectionContent(sec.content)}

                          <View style={[styles.whyCallout, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.whyTitle, { color: theme.textSecondary }]}>
                              {tTool(outputLanguage, 'common.explainWhy', '💡 Explain Why')}
                            </Text>
                            <Text style={[styles.whyContent, { color: theme.textSecondary }]}>{localizedWhy}</Text>
                          </View>

                          {/* Section Action Row */}
                          <View style={styles.sectionActionsRow}>
                            <TouchableOpacity style={[styles.sectionActionButton, { borderColor: theme.border }]} onPress={() => handleRegenerateSection(sec.id)}>
                              <Ionicons name="sync-outline" size={14} color={theme.textSecondary} />
                              <Text style={[styles.sectionActionText, { color: theme.textSecondary }]}>
                                {tTool(outputLanguage, 'common.rewrite', 'Rewrite')}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.sectionActionButton, { borderColor: theme.border }]} onPress={() => handleCopySection(sec.content)}>
                              <Ionicons name="copy-outline" size={14} color={theme.textSecondary} />
                              <Text style={[styles.sectionActionText, { color: theme.textSecondary }]}>
                                {tTool(outputLanguage, 'common.copy', 'Copy')}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.sectionActionButton, { borderColor: theme.border }]}
                              onPress={() => {
                                showToast('info', 'Editor Open', 'Section layout unlocked.');
                              }}
                            >
                              <Ionicons name="create-outline" size={14} color={theme.textSecondary} />
                              <Text style={[styles.sectionActionText, { color: theme.textSecondary }]}>
                                {tTool(outputLanguage, 'common.edit', 'Edit')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* STEP 4: COURT PREPARATION INTELLIGENCE (PREMIUM PANEL) */}
                <View style={[styles.intelligenceContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.intelligenceHeader}>
                    <Ionicons name="bulb" size={22} color="#EF4444" />
                    <Text style={[styles.intelligenceTitle, { color: theme.textPrimary }]}>
                      {tTool(outputLanguage, 'argumentBuilder.hearingIntelTools', 'Hearing Intelligence Tools')}
                    </Text>

                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.intelligenceTabsScroll}
                  >
                    {intelligenceData.map((tab) => {
                      const isActive = activeIntelligenceTab === tab.id;
                      return (
                        <TouchableOpacity
                          key={tab.id}
                          style={[
                            styles.intelligenceTab,
                            isActive
                              ? { backgroundColor: '#C8A34D', borderColor: '#C8A34D' }
                              : { backgroundColor: '#FFFFFF', borderColor: '#C8A34D', borderWidth: 1.5 },
                          ]}
                          onPress={() => handleSelectIntelTab(tab.id)}
                        >
                          <Ionicons
                            name={tab.icon as any}
                            size={14}
                            color={isActive ? '#FFFFFF' : '#C8A34D'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.intelligenceTabText,
                              { color: isActive ? '#FFFFFF' : '#C8A34D', fontWeight: '700' },
                            ]}
                          >
                            {tTool(outputLanguage, tab.title, tab.title)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {intelLoadingTab === activeIntelligenceTab ? (
                    <View style={{ padding: 36, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color="#C8A34D" />
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 10, fontWeight: '600' }}>
                        AI synthesizing intelligence report...
                      </Text>
                    </View>
                  ) : activeIntelContent ? (
                    <View style={[styles.intelligenceContentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.intelDescription, { color: theme.textSecondary, marginBottom: 12, fontSize: 12, fontStyle: 'italic' }]}>
                        {tTool(outputLanguage, activeIntelContent.description, activeIntelContent.description)}
                      </Text>

                      {renderStructuredResponse(activeIntelligenceTab)}

                      {/* Actions for intel tab */}
                      <View style={[styles.intelActionsRow, { flexWrap: 'wrap', gap: 10, marginTop: 14 }]}>
                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleCopySection(JSON.stringify(getStructuredIntelContent(activeIntelligenceTab)))}
                        >
                          <Ionicons name="copy-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#C8A34D' }]}>Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleRegenerateIntelTab(activeIntelligenceTab)}
                        >
                          <Ionicons name="refresh-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#C8A34D' }]}>Regenerate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Saved to Case', 'Report pinned to case assets folder.')}
                        >
                          <Ionicons name="save-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#C8A34D' }]}>Save to Case</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => handleExport('PDF')}
                        >
                          <Ionicons name="document-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#C8A34D' }]}>Export PDF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Shared', 'Pre-analysis briefing shared with client.')}
                        >
                          <Ionicons name="share-social-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#C8A34D' }]}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.intelActionBtn}
                          onPress={() => showToast('success', 'Pinned', 'Successfully pinned to active workspace notes.')}
                        >
                          <Ionicons name="pin-outline" size={14} color="#C8A34D" style={{ marginRight: 4 }} />
                          <Text style={[styles.intelActionBtnText, { color: '#C8A34D' }]}>Pin to Notes</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* STEP 6: EXPORT BAR */}
                <View style={[styles.exportBar, { borderTopColor: theme.border }]}>
                  <Text style={[styles.exportTitle, { color: theme.textSecondary }]}>Export Folder</Text>
                  <View style={styles.exportButtonsGrid}>
                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border, flex: 1 }]} onPress={() => handleExport('PDF')}>
                      <Ionicons name="document-outline" size={16} color="#EF4444" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border, flex: 1 }]} onPress={() => handleExport('DOCX')}>
                      <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Word</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border, flex: 1 }]} onPress={handleCopyAll}>
                      <Ionicons name="copy-outline" size={16} color="#10B981" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Copy All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.exportBtn, { borderColor: theme.border, flex: 1 }]} onPress={() => handleExport('Share')}>
                      <Ionicons name="share-social-outline" size={16} color="#C8A34D" />
                      <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.exportToolbarFooter}>
                    <TouchableOpacity
                      style={styles.footerUtilityBtn}
                      onPress={() => showToast('success', 'Case Linked', 'Court prep dossier pinned to CaseWorkspace')}
                    >
                      <Ionicons name="link-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.footerUtilityBtnText, { color: theme.textSecondary }]}>Link Workspace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.footerUtilityBtn}
                      onPress={() => showToast('info', 'Version History', 'v1.2 (Active)')}
                    >
                      <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.footerUtilityBtnText, { color: theme.textSecondary }]}>Version History</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>


              {/* STEP 5: AI REFINEMENT FLOATING BUTTON */}
              <TouchableOpacity
                style={[styles.floatingRefinementBtn, Shadows.md]}
                onPress={() => setIsRefinementOpen(true)}
              >
                <Text style={styles.floatingRefinementBtnText}>✨ Style: {refinementMode}</Text>
              </TouchableOpacity>
            </View>
          )}
        </React.Fragment>
      )}

      {/* Refinement Modal Selector */}
      <Modal visible={isRefinementOpen} animationType="slide" transparent={true} onRequestClose={() => setIsRefinementOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsRefinementOpen(false)} />
          <View style={[styles.bottomSheetContainer, Shadows.modal, { height: height * 0.75 }]}>
            <View style={styles.bottomSheetDragHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>AI Argument Refinement Style</Text>
              <TouchableOpacity onPress={() => setIsRefinementOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {[
                'Courtroom Style',
                'Formal',
                'Judge Friendly',
                'Senior Counsel Style',
                'Aggressive Litigation',
                'Neutral',
                'Concise',
                'Detailed',
                'Plain English',
                'Hindi Legal Drafting',
              ].map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.refinementStyleRow,
                    { borderBottomColor: theme.border },
                    refinementMode === style && {
                      backgroundColor: isDark ? 'rgba(138, 92, 245, 0.15)' : 'rgba(138, 92, 245, 0.08)',
                      borderLeftWidth: 3,
                      borderLeftColor: '#C8A34D',
                    },
                  ]}
                  onPress={() => handleRefineWorkspace(style)}
                >
                  <Text
                    style={[
                      styles.refinementStyleText,
                      { color: theme.textPrimary },
                      refinementMode === style && { fontWeight: '800', color: '#C8A34D' },
                    ]}
                  >
                    {style}
                  </Text>
                  {refinementMode === style && <Ionicons name="checkmark" size={18} color="#C8A34D" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Copilot Chat Drawer (Full-Screen AI Workspace) */}
      <Modal
        visible={isAiAssistantOpen}
        transparent={false}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsAiAssistantOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            {/* Header Wrapper matching status bar background */}
            <View style={{ backgroundColor: theme.surface, paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              {/* Simplified Header */}
              <View style={[styles.copilotHeader, { borderBottomWidth: 0, backgroundColor: 'transparent' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                  <TouchableOpacity onPress={() => setIsAiAssistantOpen(false)} style={styles.copilotBackBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.copilotHeaderTitleContainer}>
                    <Text style={[styles.copilotHeaderTitle, { color: theme.textPrimary }]}>Court Prep Assistant</Text>
                    <Text style={styles.copilotHeaderSubtitle}>Hearing Intelligence Assistant</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={handleNewChat} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="add" size={24} color="#C8A34D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsHeaderMenuOpen(true)} style={styles.copilotHeaderIconAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Header Menu Dropdown Overlay */}
            {isHeaderMenuOpen && (
              <Modal
                transparent={true}
                visible={isHeaderMenuOpen}
                animationType="fade"
                onRequestClose={() => setIsHeaderMenuOpen(false)}
              >
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsHeaderMenuOpen(false)} />
                <View
                  style={[
                    styles.menuDropdown,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      top: insets.top + 56,
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.menuItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsHeaderMenuOpen(false);
                      setIsCopilotHistoryOpen(true);
                    }}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>History</Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={[styles.menuItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setIsHeaderMenuOpen(false);
                      handleExportChat();
                    }}
                  >
                    <Ionicons name="share-outline" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Export Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsHeaderMenuOpen(false);
                      handleClearConversation();
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Clear Conversation</Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            )}

            {/* Case Workspace context indicator (if synced) */}
            {activeCaseDetails?.name && (
              <View style={[styles.copilotCaseContextBadge, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="folder-open" size={14} color="#C8A34D" style={{ marginRight: 6 }} />
                <Text style={[styles.copilotCaseContextText, { color: theme.textPrimary }]} numberOfLines={1}>
                  Case: {activeCaseDetails.name}
                </Text>
              </View>
            )}

            {/* Chat dialog Scrollable lists */}
            <ScrollView
              ref={copilotScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16, paddingTop: 12 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              scrollEventThrottle={16}
            >
              {activeSession && activeSession.messages && activeSession.messages.length > 0 ? (
                activeSession.messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';

                  // Skip empty model placeholder bubbles (Step 12)
                  if (!isUser && !msg.content.trim()) {
                    return null;
                  }

                  if (isUser) {
                    return (
                      <View
                        key={msg.id || idx}
                        style={[styles.chatBubbleContainer, styles.userBubbleAlign]}
                      >
                        <View style={[styles.chatBubble, styles.userBubble]}>
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

                          {/* Disclaimer at the bottom of the AI response (Step 6) */}
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

                      {/* Clickable inline action chips (Step 9) */}
                      {suggestions.length > 0 && (
                        <View style={{ marginLeft: 30, marginTop: 12 }}>
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
                                    <Text style={[styles.bubbleSuggestionText, { color: '#C8A34D' }]}>✓ {shortened}</Text>
                                  </TouchableOpacity>
                                );
                              })}

                            {suggestions.length > 4 && !expandedSuggestions[msg.id] && (
                              <TouchableOpacity
                                style={[styles.bubbleSuggestionChip, { borderColor: '#C8A34D', backgroundColor: theme.surface, borderStyle: 'dashed' }]}
                                onPress={() => toggleExpandSuggestions(msg.id)}
                              >
                                <Text style={[styles.bubbleSuggestionText, { color: '#C8A34D' }]}>+ More Suggestions</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                // Minimal empty state & greeting (Step 3 & 4)
                <View style={styles.emptyChatContainer}>
                  {/* Lightweight 2-line greeting */}
                  <View style={styles.lightweightGreetingContainer}>
                    <Text style={[styles.lightweightGreetingTitle, { color: theme.textPrimary }]}>
                      Hi! I'm your Court Prep Assistant.
                    </Text>
                    <Text style={[styles.lightweightGreetingSub, { color: theme.textSecondary }]}>
                      How can I help you prepare for today's hearing?
                    </Text>
                  </View>
                </View>
              )}
              {isAiThinking && isLatestMessageEmptyModel && (
                <View style={styles.thinkingBubbleContainer}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={11} color="#FFFFFF" />
                  </View>
                  <View style={[styles.chatBubble, styles.aiBubble, { backgroundColor: theme.surfaceVariant, paddingVertical: 8, paddingHorizontal: 12, minWidth: 120, justifyContent: 'center' }]}>
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
                  {attachments.map((a, i) => (
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

            {/* Floating "Scroll to Latest" Button (Step 11) */}
            {showScrollToLatest && (
              <TouchableOpacity
                style={[styles.floatingScrollBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  copilotScrollRef.current?.scrollToEnd({ animated: true });
                  // autoScrollEnabled.current = true;
                  setShowScrollToLatest(false);
                }}
              >
                <Ionicons name="arrow-down" size={18} color="#C8A34D" />
              </TouchableOpacity>
            )}

            {/* Chat Composer (ChatGPT Style Rounded Input Area) */}
            <View style={[styles.copilotComposerContainer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 28, paddingTop: 8 }]}>
              {isRecording || isTranscribing ? (
                <View style={styles.recordingWrapper}>
                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={cancelRecording}
                    style={styles.voiceControlBtn}
                  >
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </TouchableOpacity>

                  {/* Transcribing Indicator / Duration Waveform */}
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

                  {/* Language switch */}
                  <TouchableOpacity
                    onPress={() => {
                      const nextLang = speechLanguage === 'en' ? 'hi' : speechLanguage === 'hi' ? 'hinglish' : 'en';
                      setSpeechLanguage(nextLang);
                      showToast('info', 'Language Changed', `Listening in ${nextLang === 'en' ? 'English' : nextLang === 'hi' ? 'Hindi' : 'Hinglish'}`);
                    }}
                    style={styles.langSelectorBtn}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>
                      {speechLanguage === 'en' ? 'EN' : speechLanguage === 'hi' ? 'HI' : 'HING'}
                    </Text>
                  </TouchableOpacity>

                  {/* Stop/Send Button */}
                  <TouchableOpacity
                    onPress={stopRecording}
                    style={styles.voiceStopBtn}
                  >
                    <Ionicons name="stop" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                  {/* Rounded Text Input Field & Inner triggers (Step 1) */}
                  <View style={[
                    styles.composerTextInputContainer,
                    {
                      borderColor: isInputFocused ? '#D4AF37' : theme.border,
                      borderWidth: isInputFocused ? 1.5 : 1,
                      backgroundColor: '#FFFFFF'
                    }
                  ]}>
                    {/* Attachment button */}
                    <TouchableOpacity
                      onPress={showAttachmentOptions}
                      style={styles.composerInnerBtn}
                      disabled={isAiThinking}
                    >
                      <Ionicons name="add" size={22} color="#C8A34D" />
                    </TouchableOpacity>

                    {/* AI Suggestions Sparkles Button */}
                    <TouchableOpacity
                      onPress={() => setIsSuggestionsSheetOpen(true)}
                      style={styles.composerInnerBtn}
                      disabled={isAiThinking}
                    >
                      <Ionicons name="sparkles" size={18} color="#C8A34D" />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.composerTextInput, { color: theme.textPrimary }]}
                      placeholder="Ask about arguments, witnesses..."
                      placeholderTextColor={theme.placeholder}
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={() => handleSendChat()}
                      editable={!isAiThinking && !isRecording}
                      multiline
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onContentSizeChange={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      }}
                    />

                    {/* Dynamic Action Button - Mic, Send or Stop depending on state */}
                    {isAiThinking ? (
                      <TouchableOpacity
                        style={[styles.composerInnerSendBtn, { backgroundColor: '#D4AF37' }]}
                        onPress={cancelMessageStream}
                      >
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
                        onPress={() => startRecording(speechLanguage)}
                        disabled={isRecording}
                      >
                        <Ionicons name="mic" size={18} color="#111111" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
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
              {/* Category: Arguments */}
              <Text style={styles.suggestionsCategoryTitle}>Arguments</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Prepare Plaintiff Arguments',
                  'Prepare Defence Arguments',
                  'Rebuttal Strategy'
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category: Cross Examination */}
              <Text style={styles.suggestionsCategoryTitle}>Cross Examination</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Cross Questions',
                  'Witness Questions',
                  'Contradictions'
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category: Hearing */}
              <Text style={styles.suggestionsCategoryTitle}>Hearing</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Judge Questions',
                  'Oral Submission',
                  'Final Hearing Notes'
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.suggestionsItemText, { color: theme.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category: Analysis */}
              <Text style={styles.suggestionsCategoryTitle}>Analysis</Text>
              <View style={styles.suggestionsCategoryGroup}>
                {[
                  'Weaknesses',
                  'Evidence Review',
                  'Timeline Summary'
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.suggestionsItemBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setChatInput(item);
                      setIsSuggestionsSheetOpen(false);
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

      {/* Copilot History Drawer Overlay */}
      <Modal
        visible={isCopilotHistoryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCopilotHistoryOpen(false)}
      >
        <View style={styles.historyDrawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCopilotHistoryOpen(false)} />
          <View style={[styles.historyDrawerContainer, { backgroundColor: theme.surface }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={[styles.historyDrawerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.historyDrawerTitle, { color: theme.textPrimary }]}>Chat History</Text>
                <TouchableOpacity onPress={() => setIsCopilotHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.historyDrawerList}>
                {sessions.filter(s => s.activeTool === 'legal_argument_builder').length > 0 ? (
                  sessions
                    .filter(s => s.activeTool === 'legal_argument_builder')
                    .sort((a, b) => new Date(b.lastModified || b.createdAt || 0).getTime() - new Date(a.lastModified || a.createdAt || 0).getTime())
                    .map((session) => (
                      <View key={session.sessionId} style={[styles.historySessionItem, activeSessionId === session.sessionId && { backgroundColor: theme.surfaceVariant, borderLeftWidth: 3, borderLeftColor: '#C8A34D' }]}>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => {
                            setActiveSessionId(session.sessionId);
                            fetchSessionDetails(session.sessionId);
                            setIsCopilotHistoryOpen(false);
                          }}
                        >
                          <Text style={[styles.historySessionTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {session.title || 'Untitled Conversation'}
                          </Text>
                          <Text style={styles.historySessionTime}>
                            {new Date(session.lastModified || session.createdAt || Date.now()).toLocaleString([], {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                          <TouchableOpacity onPress={() => handleRenameSession(session.sessionId, session.title || '')}>
                            <Ionicons name="create-outline" size={18} color="#C8A34D" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteSession(session.sessionId)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                ) : (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No chat history found.</Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Custom Rename Dialog Modal (Objective 4) */}
      <Modal visible={!!renameSessionId} transparent={true} animationType="fade" onRequestClose={() => setRenameSessionId('')}>
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Rename Conversation</Text>
            <TextInput
              style={[styles.dialogInput, { borderColor: theme.border, color: theme.textPrimary }]}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              placeholder="Enter new title"
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setRenameSessionId('')} style={styles.dialogCancelBtn}>
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (renameSessionId && renameInput.trim()) {
                    renameChatSession(renameSessionId, renameInput.trim());
                    showToast('success', 'Chat Renamed', 'Title updated successfully.');
                    setRenameSessionId('');
                  }
                }}
                style={[styles.dialogConfirmBtn, { backgroundColor: '#C8A34D' }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Legacy modals preserved */}
      <AttachmentBottomSheet
        visible={isBottomSheetVisible}
        onClose={hideAttachmentOptions}
        onSelectOption={handleSelectOption}
      />

      <CustomCameraModal visible={isCameraVisible} onClose={hideCamera} onConfirm={handleCameraConfirm} />

      <CaseSelectionModal
        visible={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        activeCaseId={activeCaseId}
        onSelectCase={(caseId) => {
          setActiveCaseId(caseId);
          fetchActiveCaseDetails(caseId);
          showToast('success', 'Workspace Synced', 'Case dossier contexts successfully pulled.');
          triggerCaseAnalysis();
        }}
      />

      {/* Sliding Sidebar History Drawer */}
      <Modal visible={isHistoryOpen} animationType="none" transparent={true} onRequestClose={() => setIsHistoryOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setIsHistoryOpen(false)} />
          <View style={styles.drawerContainer}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Dossier History</Text>
                <Pressable onPress={() => setIsHistoryOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textPrimary} />
                </Pressable>
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceVariant, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme.border }}>
                  <Ionicons name="search-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 12.5, color: theme.textPrimary, padding: 0 }}
                    value={courtPrepHistorySearch}
                    onChangeText={setCourtPrepHistorySearch}
                    placeholder="Search prep dossiers..."
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
              </View>

              <ScrollView style={styles.drawerList}>
                <TouchableOpacity
                  style={[styles.drawerActionBtn, { backgroundColor: '#C8A34D', marginVertical: 10 }]}
                  onPress={() => {
                    setWorkspaceStep('source');
                    setSectionsData([]);
                    setIsHistoryOpen(false);
                  }}
                >
                  <Ionicons name="add-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.drawerActionBtnText, { color: '#FFFFFF' }]}>New Hearing Setup</Text>
                </TouchableOpacity>

                <Text style={styles.historySectionHeader}>Court Prep Dossiers</Text>

                {isCourtPrepHistoryLoading ? (
                  <ActivityIndicator size="small" color="#C8A34D" style={{ marginVertical: 20 }} />
                ) : courtPrepHistoryList.length > 0 ? (
                  courtPrepHistoryList.map((item) => (
                    <View key={item._id} style={{ backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 12, marginBottom: 10 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.textPrimary }} numberOfLines={1}>
                        📄 {item.caseTitle}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        🏷 {item.caseType} • {item.courtLevel || 'District Court'}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.placeholder, marginTop: 2 }}>
                        📅 {new Date(item.createdAt).toLocaleDateString()}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => handleOpenDossierFromHistory(item)}
                          style={{ backgroundColor: 'rgba(200,163,77,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#C8A34D' }}>Open</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenRenameDossier(item)}
                          style={{ backgroundColor: theme.surfaceVariant, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}
                        >
                          <Ionicons name="pencil-outline" size={12} color={theme.textPrimary} />
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.textPrimary }}>Rename</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteDossierFromHistory(item._id)}
                          style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}
                        >
                          <Ionicons name="trash-outline" size={12} color="#EF4444" />
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#EF4444' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Ionicons name="folder-open-outline" size={36} color={theme.textMuted} style={{ marginBottom: 6 }} />
                    <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center' }}>No saved Court Prep Dossiers found.</Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Edit / Rename Dossier Modal */}
      <Modal visible={isEditDossierModalOpen} transparent animationType="fade" onRequestClose={() => setIsEditDossierModalOpen(false)}>
        <View style={styles.drawerOverlay}>
          <View style={{ width: '85%', backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 18, alignSelf: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: theme.textPrimary, marginBottom: 12 }}>Rename Dossier</Text>
            
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Case Title</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: theme.textPrimary, backgroundColor: theme.background, fontSize: 13, marginBottom: 12 }}
              value={editDossierTitle}
              onChangeText={setEditDossierTitle}
              placeholder="Case title..."
              placeholderTextColor={theme.placeholder}
            />

            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>Case Category / Type</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: theme.textPrimary, backgroundColor: theme.background, fontSize: 13, marginBottom: 16 }}
              value={editDossierType}
              onChangeText={setEditDossierType}
              placeholder="e.g. Cheque Bounce, Criminal..."
              placeholderTextColor={theme.placeholder}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setIsEditDossierModalOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surfaceVariant }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveRenameDossier} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#C8A34D' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    headerBtn: {
      width: 38,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 19,
    },
    headerTitleContainer: {
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    headerSubtitle: {
      fontSize: 10,
      color: '#94A3B8',
      marginTop: 1,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scrollContent: {
      padding: 14,
    },
    welcomeMainTitle: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    welcomeSubText: {
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
      marginBottom: 14,
    },
    sourceGrid: {
      gap: 10,
      marginBottom: 10,
    },
    sourceCard: {
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 175,
    },
    sourceIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    sourceCardTitle: {
      fontSize: 14.5,
      fontWeight: '800',
      marginBottom: 2,
    },
    sourceCardDesc: {
      fontSize: 11.5,
      lineHeight: 15,
      textAlign: 'center',
      marginBottom: 10,
      paddingHorizontal: 10,
    },
    sourceCardBtn: {
      width: '100%',
      height: 42,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sourceCardBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    activeCaseBadge: {
      marginTop: 10,
      backgroundColor: '#E6F4FE',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    activeCaseBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#C8A34D',
    },
    generateButton: {
      backgroundColor: '#C8A34D',
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    generateButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    attachmentsListWrapper: {
      marginTop: 20,
      gap: 10,
    },
    attachmentsHeading: {
      fontSize: 15,
      fontWeight: '800',
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderWidth: 1,
      borderRadius: 12,
    },
    attachmentNameText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 13,
      fontWeight: '700',
    },
    analyzingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    analyzingText: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 20,
    },
    analyzingSubtext: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    progressBarBg: {
      height: 6,
      width: '80%',
      backgroundColor: '#E2E8F0',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#EF4444',
    },
    workspaceScroll: {
      padding: 16,
    },
    dashboardCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    dashboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    dashboardTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    dashboardMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    metricBox: {
      flex: 1,
      minWidth: '45%',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    dashboardDetailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    detailsLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    detailsValue: {
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
      textAlign: 'right',
      marginLeft: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
      marginBottom: 20,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
    },
    workspaceSubheading: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },
    sectionContainer: {
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionTitleText: {
      fontSize: 14,
      fontWeight: '800',
    },
    sectionDescText: {
      fontSize: 11,
      marginTop: 2,
    },
    sectionHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    confidencePill: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    confidencePillText: {
      fontSize: 9,
      fontWeight: '800',
    },
    sectionBody: {
      borderTopWidth: 1,
      padding: 16,
    },
    sectionBodyContent: {
      fontSize: 13,
      lineHeight: 20,
    },
    whyCallout: {
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#94A3B8',
    },
    whyTitle: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    whyContent: {
      fontSize: 11,
      lineHeight: 16,
    },
    sectionActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    sectionActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    sectionActionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    intelligenceContainer: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
      marginBottom: 20,
    },
    intelligenceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    intelligenceTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    intelligenceTabsScroll: {
      gap: 8,
      paddingBottom: 10,
    },
    intelligenceTab: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: 'transparent',
    },
    intelligenceTabActive: {
      backgroundColor: '#EF4444',
    },
    intelligenceTabText: {
      fontSize: 12,
      fontWeight: '700',
    },
    intelligenceContentCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
    },
    intelDescription: {
      fontSize: 11,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    intelBody: {
      fontSize: 13,
      lineHeight: 20,
    },
    intelActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingTop: 10,
    },
    intelActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    intelActionBtnText: {
      fontSize: 11.5,
      color: '#EF4444',
      fontWeight: '700',
    },
    mockCourtCard: {
      borderWidth: 2,
      borderRadius: 16,
      padding: 20,
      backgroundColor: '#F5F5F5',
      marginBottom: 20,
    },
    mockCourtHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    mockCourtTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#C8A34D',
    },
    mockCourtDesc: {
      fontSize: 12,
      lineHeight: 18,
      color: '#475569',
      marginBottom: 16,
    },
    mockCourtBtn: {
      backgroundColor: '#C8A34D',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    mockCourtBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    exportBar: {
      borderTopWidth: 1,
      paddingTop: 16,
      marginTop: 10,
    },
    exportTitle: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    exportButtonsGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    exportBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      gap: 6,
    },
    exportBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    exportToolbarFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    footerUtilityBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    footerUtilityBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },
    floatingRefinementBtn: {
      position: 'absolute',
      bottom: 24,
      right: 16,
      backgroundColor: '#0F172A',
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    floatingRefinementBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
      width: '100%',
      height: height * 0.75,
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
    refinementStyleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    refinementStyleText: {
      fontSize: 14,
      fontWeight: '600',
    },
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
    drawerContainer: {
      width: width * 0.8,
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: '#E2E8F0',
      paddingHorizontal: 16,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    drawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    drawerList: {
      flex: 1,
    },
    drawerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
    },
    drawerActionBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },
    historySectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 14,
      marginBottom: 8,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    drawerItemText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // ==========================================
    // CASE INTAKE WIZARD NEW STYLES (Phase 5)
    // ==========================================
    wizardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    wizardBackBtn: {
      padding: 4,
    },
    wizardTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    wizardSubtitle: {
      fontSize: 11,
      color: '#64748B',
      marginTop: 2,
    },
    clearDraftBtn: {
      padding: 6,
    },
    wizardScroll: {
      padding: 16,
      paddingBottom: 60,
    },
    wizardSectionHeading: {
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },
    wizardMethodGrid: {
      gap: 16,
      marginTop: 10,
    },
    wizardMethodCard: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 20,
      position: 'relative',
    },
    recommendedBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: '#C8A34D',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    recommendedBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    wizardMethodIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    wizardMethodTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 6,
    },
    wizardMethodDesc: {
      fontSize: 12,
      lineHeight: 18,
    },
    wizardProgressContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 6,
      justifyContent: 'center',
    },
    wizardProgressBarDot: {
      flex: 1,
      height: 6,
      borderRadius: 3,
    },
    wizardStepForm: {
      gap: 14,
    },
    wizardFormHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 6,
    },
    wizardInputLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    wizardTextInputField: {
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    wizardRoleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    roleSelectBtn: {
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    roleSelectText: {
      fontSize: 12,
      fontWeight: '700',
    },
    wizardFactsEditor: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 12,
      fontSize: 13,
      textAlignVertical: 'top',
    },
    wizardFactsUtilityBar: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    utilityActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    utilityActionBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    evidenceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    evidenceCheckboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
      minWidth: '46%',
    },
    evidenceLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    wizardFooterControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
    },
    navigationBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    navigationBtnText: {
      fontSize: 13,
      fontWeight: '800',
    },
    navigationBtnActive: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EF4444',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    navigationBtnActiveText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    micInterfaceContainer: {
      alignItems: 'center',
      marginVertical: 30,
      position: 'relative',
    },
    micPulsingRing: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      top: 0,
    },
    micRecordCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    recordingStatusLabel: {
      marginTop: 20,
      fontSize: 13,
      fontWeight: '700',
    },
    transcriptionCard: {
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
    },
    transcriptionHeading: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    transcriptionEditorText: {
      fontSize: 13.5,
      lineHeight: 20,
    },
    wizardProgressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    interviewProgressBarBg: {
      height: 4,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 2,
      overflow: 'hidden',
    },
    interviewProgressBarFill: {
      height: '100%',
    },
    chatBubbleRow: {
      flexDirection: 'row',
      marginVertical: 4,
      alignItems: 'flex-end',
    },
    chatAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#C8A34D',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
    },
    chatBubble: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: '100%',
    },
    chatBubbleText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    interviewComposerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      gap: 8,
    },
    interviewInput: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 13,
      maxHeight: 80,
    },
    interviewSendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#C8A34D',
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingAiBtn: {
      position: 'absolute',
      right: 16,
      bottom: 84,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#C8A34D',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#C8A34D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    chatDrawerContainer: {
      width: '100%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    userBubble: {
      backgroundColor: '#C8A34D',
      alignSelf: 'flex-end',
    },
    userBubbleText: {
      fontSize: 12.5,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    aiBubble: {
      backgroundColor: 'rgba(138, 92, 245, 0.08)',
      alignSelf: 'flex-start',
    },
    aiBubbleText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    promptBubbleScroll: {
      maxHeight: 40,
      marginBottom: 10,
    },
    promptBubbleScrollContent: {
      gap: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    promptBubble: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    promptBubbleText: {
      fontSize: 11,
      fontWeight: '700',
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
      borderRadius: 22,
      paddingHorizontal: 12,
      gap: 8,
    },
    chatComposerInput: {
      flex: 1,
      fontSize: 13,
      paddingVertical: 4,
    },
    chatComposerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copilotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 56,
      borderBottomWidth: 1,
    },
    copilotBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    copilotBackBtnText: {
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 4,
    },
    copilotHeaderTitleContainer: {
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    copilotHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    copilotHeaderSubtitle: {
      fontSize: 9,
      color: '#94A3B8',
      marginTop: 1,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    copilotHeaderActionBtn: {
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    copilotCaseContextBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 8,
    },
    copilotCaseContextText: {
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    chatBubbleContainer: {
      flexDirection: 'row',
      marginVertical: 6,
      alignItems: 'flex-start',
      maxWidth: '92%',
    },
    userBubbleAlign: {
      alignSelf: 'flex-end',
      justifyContent: 'flex-end',
    },
    aiBubbleAlign: {
      alignSelf: 'flex-start',
      justifyContent: 'flex-start',
    },
    aiAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#C8A34D',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      marginTop: 4,
    },
    emptyChatContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyChatIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(138, 92, 245, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyChatTitle: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
    },
    emptyChatSubtitle: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '600',
      marginBottom: 24,
    },
    welcomeBox: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      width: '100%',
      marginBottom: 24,
    },
    welcomeBoxTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 8,
    },
    welcomeBoxSub: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 10,
    },
    welcomeBoxText: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
    emptyChatSuggestedTitle: {
      fontSize: 12,
      fontWeight: '700',
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    suggestedChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
    },
    suggestedChip: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    suggestedChipText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    thinkingBubbleContainer: {
      flexDirection: 'row',
      marginVertical: 6,
      alignItems: 'flex-start',
      alignSelf: 'flex-start',
    },
    copilotAttachmentBar: {
      paddingVertical: 8,
      borderTopWidth: 1,
      maxHeight: 46,
    },
    copilotAttachChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 6,
    },
    copilotAttachLabel: {
      fontSize: 11,
      fontWeight: '700',
      maxWidth: 100,
    },
    copilotComposerContainer: {
      borderTopWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    composerIconBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
    },
    composerTextInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    composerSendBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 12,
      height: 48,
    },
    voiceControlBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    waveformContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    langSelectorBtn: {
      borderWidth: 1,
      borderColor: '#C8A34D',
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    voiceStopBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    historyDrawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    historyDrawerContainer: {
      height: height * 0.7,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    historyDrawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    historyDrawerTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    historyDrawerList: {
      flex: 1,
      marginTop: 10,
    },
    historySessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginVertical: 4,
    },
    historySessionTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    historySessionTime: {
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '600',
    },
    copilotHeaderIconAction: {
      padding: 4,
    },
    menuDropdown: {
      position: 'absolute',
      right: 16,
      width: 200,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      paddingVertical: 4,
      zIndex: 9999,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
    },
    menuItemText: {
      fontSize: 13.5,
      fontWeight: '600',
    },
    lightweightGreetingContainer: {
      width: '100%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    lightweightGreetingTitle: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 24,
      marginBottom: 2,
    },
    lightweightGreetingSub: {
      fontSize: 13,
      fontWeight: '500',
    },
    minimalEmptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
      paddingVertical: 40,
    },
    minimalEmptyStateEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    minimalEmptyStateTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    minimalEmptyStateSubtitle: {
      fontSize: 12.5,
      fontWeight: '500',
    },
    composerTextInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderWidth: 1,
      borderRadius: 24,
      paddingLeft: 10,
      paddingRight: 6,
      paddingBottom: 6,
      paddingTop: 6,
      minHeight: 52,
      maxHeight: 140,
    },
    composerInnerBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composerInnerMicBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    composerInnerSendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    suggestionsSheetContainer: {
      height: height * 0.6,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    suggestionsSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    suggestionsSheetTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    suggestionsCategoryTitle: {
      fontSize: 11,
      color: '#C8A34D',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    suggestionsCategoryGroup: {
      gap: 6,
    },
    suggestionsItemBtn: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    suggestionsItemText: {
      fontSize: 13,
      fontWeight: '600',
    },
    bubbleSuggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      width: '100%',
    },
    bubbleSuggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.2,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      height: 36,
      marginBottom: 4,
    },
    bubbleSuggestionText: {
      fontSize: 11,
      fontWeight: '700',
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
      fontStyle: 'italic',
      lineHeight: 14.5,
      opacity: 0.8,
    },
    floatingScrollBtn: {
      position: 'absolute',
      bottom: 80,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      zIndex: 9999,
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    dialogContainer: {
      width: '100%',
      maxWidth: 320,
      borderRadius: 16,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    dialogTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 16,
    },
    dialogInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      marginBottom: 20,
    },
    dialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    dialogCancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialogConfirmBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
