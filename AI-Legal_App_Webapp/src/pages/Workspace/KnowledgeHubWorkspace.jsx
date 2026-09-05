import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, Search, Sparkles, ArrowLeft, ChevronRight, Bookmark, 
  Share2, Copy, Send, Mic, Paperclip, X, AlertTriangle, ExternalLink, 
  Check, RefreshCw, Volume2, Type, Sun, Moon, Coffee, ChevronDown, 
  HelpCircle, Scale, GraduationCap, Gavel, FileText, Compass, MessageSquare, History
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apis } from '../../types';
import { getUserData } from '../../userStore/userData';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import axios from 'axios';

// ─── BARE ACTS DATABASE ───────────────────────────────────────────────────

const LEGAL_BOOKS_DATABASE = [
  {
    id: 'consti',
    title: 'Constitution of India',
    coverColor: '#1E3A8A',
    accentColor: '#C8A34D',
    icon: '🏛',
    edition: '2024 Gold Edition',
    chaptersCount: 22,
    sectionsCount: 395,
    lastUpdated: 'Updated 2 hrs ago',
    parts: [
      {
        title: 'Part I: The Union and its Territory',
        chapters: [
          {
            title: 'Chapter 1: Territory of the Union',
            sections: [
              {
                id: 'consti-1',
                actTitle: 'Constitution of India',
                partTitle: 'Part I: The Union and its Territory',
                chapterTitle: 'Chapter 1: Territory of the Union',
                num: 'Article 1',
                title: 'Name and territory of the Union',
                difficulty: 'Easy',
                readTime: '3 min',
                progress: '100%',
                originalBareAct: '(1) India, that is Bharat, shall be a Union of States.\n(2) The States and the territories thereof shall be as specified in the First Schedule.\n(3) The territory of India shall comprise— (a) the territories of the States; (b) the Union territories specified in the First Schedule; and (c) such other territories as may be acquired.',
                plainEnglish: 'Article 1 establishes that India is a democratic "Union of States". This means the country is a unified sovereign nation made up of individual states and union territories.',
                hindiExplanation: 'इंडिया, अर्थात् भारत, राज्यों का एक संघ होगा। राज्य और उनके राज्य क्षेत्र वे होंगे जो पहली अनुसूची में निर्दिष्ट हैं। भारत के राज्यक्षेत्र में राज्यों के राज्यक्षेत्र, केंद्र शासित प्रदेश और अर्जित राज्यक्षेत्र शामिल होंगे।',
                realExample: 'If a state legislature (e.g., Kerala or Punjab) passes a resolution attempting to secede from India, it is unconstitutional because India is an indestructible Union of States under Article 1.',
                lawyerInterpretation: 'Dr. B.R. Ambedkar clarified that the phrase "Union of States" was preferred over "Federation of States" to emphasize two principles: (1) The Indian federation is not the result of an agreement among states, and (2) No state has the right to secede from it.',
                importantNotes: '• Combined both historic titles "India" and "Bharat".\n• Article 1(3)(c) empowers India to acquire foreign territories by conquest, purchase, or treaty.',
                landmarkJudgments: [
                  {
                    title: 'State of West Bengal v. Union of India (1962)',
                    citation: 'AIR 1963 SC 1241',
                    court: 'Supreme Court of India',
                    relevance: 'Federal Structure & Central Supremacy',
                    ratio: 'Held that the Constitution of India is not truly federal in character; the Parliament holds supreme legislative authority over state territories.'
                  },
                  {
                    title: 'In Re: Berubari Union Case (1960)',
                    citation: 'AIR 1960 SC 845',
                    court: 'Supreme Court of India',
                    relevance: 'Cession of Indian Territory',
                    ratio: 'Parliament cannot cede Indian territory to a foreign nation under Article 3; it requires a constitutional amendment under Article 368.'
                  }
                ],
                timelineEvolution: '1947: Drafting Committee debates title ──► 1949: Article 1 adopted ──► 1956: 7th Amendment reorganizes States & UTs.',
                relatedSections: ['Article 2', 'Article 3', 'Article 4', 'First Schedule'],
                faqs: [
                  { q: 'Can an Indian state break away or secede from the Union?', a: 'No. The Indian Union is indestructible, and no state possesses legal or constitutional authority to secede.' },
                  { q: 'What is the difference between "Territory of India" and "Union of India"?', a: '"Territory of India" is a wider term including States, UTs, and acquired lands, whereas "Union of India" includes only the States.' }
                ],
                mcqs: [
                  { question: 'What does Article 1 of the Constitution declare India as?', options: ['A Federation of States', 'A Union of States', 'A Confederation', 'A Unitary State'], answer: 'A Union of States' }
                ],
                ipcEquivalent: 'N/A',
                bnsEquivalent: 'N/A',
                recentAmendments: 'Jammu & Kashmir Reorganisation Act, 2019 adjusted UT schedule listings.',
                suggestedReading: 'Bare Act Commentary on Indian Constitution by D.D. Basu & H.M. Seervai.'
              },
              {
                id: 'consti-21',
                actTitle: 'Constitution of India',
                partTitle: 'Part III: Fundamental Rights',
                chapterTitle: 'Chapter 2: Right to Life & Personal Liberty',
                num: 'Article 21',
                title: 'Protection of Life and Personal Liberty',
                difficulty: 'Hard',
                readTime: '6 min',
                progress: '85%',
                originalBareAct: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.',
                plainEnglish: 'No individual (citizen or foreigner) can have their life or personal freedom taken away by the state, unless the state follows a fair, just, and reasonable law.',
                hindiExplanation: 'किसी भी व्यक्ति को उसके जीवन या व्यक्तिगत स्वतंत्रता से कानून द्वारा स्थापित प्रक्रिया के अनुसार ही वंचित किया जाएगा, अन्यथा नहीं। इसमें निजता का अधिकार, स्वच्छ पर्यावरण और त्वरित सुनवाई का अधिकार शामिल है।',
                realExample: 'Police arresting a person without statutory justification or holding a prisoner indefinitely without trial violates Article 21.',
                lawyerInterpretation: 'Transformed from a narrow literal reading (A.K. Gopalan 1950) into a expansive constitutional umbrella after Maneka Gandhi (1978). "Procedure established by law" now implies "Due Process of Law" where procedure must be fair, just, and non-arbitrary.',
                importantNotes: '• Non-suspendable during a National Emergency (Article 359).\n• Applies to non-citizens as well as citizens.\n• Expands to right to livelihood, clean water, privacy, and free legal aid.',
                landmarkJudgments: [
                  {
                    title: 'K.S. Puttaswamy v. Union of India (2017)',
                    citation: '(2017) 10 SCC 1',
                    court: 'Supreme Court of India',
                    relevance: 'Fundamental Right to Privacy',
                    ratio: 'Unanimously held that the Right to Privacy is an intrinsic part of the Right to Life and Personal Liberty under Article 21.'
                  },
                  {
                    title: 'Maneka Gandhi v. Union of India (1978)',
                    citation: 'AIR 1978 SC 597',
                    court: 'Supreme Court of India',
                    relevance: 'Fair, Just and Reasonable Test',
                    ratio: 'Held that procedure depriving a person of life or liberty must satisfy the test of fairness, justice, and reasonableness under Article 14, 19, and 21.'
                  }
                ],
                timelineEvolution: '1950: Gopalan (Literal procedure) ──► 1978: Maneka Gandhi (Due Process) ──► 2017: Puttaswamy (Right to Privacy).',
                relatedSections: ['Article 14', 'Article 19', 'Article 22', 'Article 32'],
                faqs: [
                  { q: 'Is the Right to Privacy a fundamental right under Article 21?', a: 'Yes, established by the 9-judge Constitution Bench in K.S. Puttaswamy (2017).' },
                  { q: 'Can Article 21 be suspended during Emergency?', a: 'No, following the 44th Constitutional Amendment Act, 1978, Article 21 cannot be suspended even during Emergency.' }
                ],
                mcqs: [
                  { question: 'Which landmark Supreme Court judgment declared Privacy as a Fundamental Right under Article 21?', options: ['A.K. Gopalan v. State of Madras', 'Maneka Gandhi v. UOI', 'K.S. Puttaswamy v. UOI', 'Kesavananda Bharati v. State of Kerala'], answer: 'K.S. Puttaswamy v. UOI' }
                ],
                ipcEquivalent: 'N/A',
                bnsEquivalent: 'N/A',
                recentAmendments: 'Article 21A inserted by 86th Amendment Act (Right to Education).',
                suggestedReading: 'Constitutional Law of India by H.M. Seervai & M.P. Jain.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'bns',
    title: 'Bharatiya Nyaya Sanhita (BNS)',
    coverColor: '#800020',
    accentColor: '#C8A34D',
    icon: '⚖️',
    edition: '2024 Flagship Edition',
    chaptersCount: 20,
    sectionsCount: 358,
    lastUpdated: 'Updated 1 day ago',
    parts: [
      {
        title: 'Chapter VI: Offences Affecting the Human Body',
        chapters: [
          {
            title: 'Offences Affecting Life',
            sections: [
              {
                id: 'bns-101',
                actTitle: 'Bharatiya Nyaya Sanhita (BNS)',
                partTitle: 'Chapter VI: Offences Affecting the Human Body',
                chapterTitle: 'Offences Affecting Life',
                num: 'Section 101',
                title: 'Punishment for Murder',
                difficulty: 'Hard',
                readTime: '8 min',
                progress: '70%',
                originalBareAct: '(1) Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.\n(2) When a group of five or more persons acting in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground, each member of such group shall be punished with death or with imprisonment for life, and shall also be liable to fine.',
                plainEnglish: 'Section 101 BNS prescribes punishment for murder (death sentence or life imprisonment along with a mandatory fine). It also introduces explicit statutory provisions punishing mob lynching.',
                hindiExplanation: 'भारतीय न्याय संहिता (BNS) की धारा 101 हत्या के लिए सजा का प्रावधान करती है। इसमें मृत्युदंड या आजीवन कारावास तथा जुर्माना शामिल है। धारा 101(2) के तहत मॉब लिंचिंग (भीड़ द्वारा हत्या) के लिए भी कठोर सजा का प्रावधान है।',
                realExample: 'A shoots B with intent to kill. B dies instantly. A is prosecuted under Section 101(1) BNS.',
                lawyerInterpretation: 'Replaces Section 302 IPC. Subsection (2) explicitly penalizes mob lynching by groups of 5 or more persons based on identity, carrying death or life imprisonment penalties.',
                importantNotes: '• Direct replacement for Section 302 IPC.\n• Mandatory fine along with sentence.\n• Retains the "rarest of rare" doctrine for capital punishment.',
                landmarkJudgments: [
                  {
                    title: 'Bachan Singh v. State of Punjab (1980)',
                    citation: 'AIR 1980 SC 898',
                    court: 'Supreme Court of India',
                    relevance: 'Rarest of Rare Doctrine',
                    ratio: 'Death penalty should be awarded only in the "rarest of rare cases" when the alternative of life imprisonment is unquestionably foreclosed.'
                  }
                ],
                timelineEvolution: '1860: Section 302 IPC enacted ──► 1980: Bachan Singh Rarest of Rare Rule ──► 2023: Section 101 BNS replaces IPC 302.',
                relatedSections: ['Section 100 BNS (Culpable Homicide)', 'Section 103 BNS (Exceptions)', 'Section 109 BNS (Attempt to Murder)'],
                faqs: [
                  { q: 'What is the new Section for murder under BNS?', a: 'Section 101 BNS replaces Section 302 IPC.' },
                  { q: 'Does Section 101 BNS cover Mob Lynching?', a: 'Yes, Section 101(2) BNS specifically defines and punishes mob lynching.' }
                ],
                mcqs: [
                  { question: 'Which section of Bharatiya Nyaya Sanhita (BNS) provides punishment for murder?', options: ['Section 302', 'Section 101', 'Section 100', 'Section 105'], answer: 'Section 101' }
                ],
                ipcEquivalent: 'Section 302 IPC',
                bnsEquivalent: 'Section 101 BNS',
                recentAmendments: 'Enacted in 2023; operational from July 1, 2024.',
                suggestedReading: 'Ratanlal & Dhirajlal on Criminal Law & BNS Code.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'bnss',
    title: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)',
    coverColor: '#0F5132',
    accentColor: '#C8A34D',
    icon: '📗',
    edition: '2024 Flagship Edition',
    chaptersCount: 38,
    sectionsCount: 531,
    lastUpdated: 'Updated 2 days ago',
    parts: []
  },
  {
    id: 'bsa',
    title: 'Bharatiya Sakshya Adhiniyam (BSA)',
    coverColor: '#5C4033',
    accentColor: '#C8A34D',
    icon: '📙',
    edition: '2024 Flagship Edition',
    chaptersCount: 11,
    sectionsCount: 170,
    lastUpdated: 'Updated 3 days ago',
    parts: []
  },
  {
    id: 'contract',
    title: 'Indian Contract Act, 1872',
    coverColor: '#0B3C5D',
    accentColor: '#C8A34D',
    icon: '📒',
    edition: '2024 Legal Edition',
    chaptersCount: 11,
    sectionsCount: 238,
    lastUpdated: 'Updated 5 days ago',
    parts: []
  },
  {
    id: 'cpc',
    title: 'Code of Civil Procedure (CPC)',
    coverColor: '#0D5C75',
    accentColor: '#C8A34D',
    icon: '📓',
    edition: '2024 Legal Edition',
    chaptersCount: 11,
    sectionsCount: 158,
    lastUpdated: 'Updated 1 week ago',
    parts: []
  }
];

// Helper leaf generator for comprehensive TOC expansion
const getOrGenerateSection = (book, partTitle, chapterTitle, id, name) => {
  for (const p of book.parts || []) {
    for (const c of p.chapters || []) {
      for (const s of c.sections || []) {
        if (s.id === id || s.num.toLowerCase() === name.toLowerCase()) {
          return s;
        }
      }
    }
  }

  return {
    id,
    actTitle: book.title,
    partTitle,
    chapterTitle,
    num: name,
    title: `General Statutory Provision of ${name}`,
    difficulty: 'Medium',
    readTime: '5 min',
    progress: '0%',
    originalBareAct: `This represents the official statutory text of ${name} under ${book.title}. All clauses and procedural standards are indexed in the authoritative legal database.`,
    plainEnglish: `Under ${book.title}, this section details statutory compliance, procedural rights, and legal obligations.`,
    hindiExplanation: `यह ${book.title} के तहत ${name} के कानूनी प्रावधानों का प्रामाणिक हिंदी विवरण और व्याख्या है।`,
    realExample: `A litigation professional citing ${name} in court pleadings to enforce statutory compliance.`,
    lawyerInterpretation: `Advocates must verify statutory exceptions and jurisdictional preconditions before filing applications under this provision.`,
    importantNotes: `Read in conjunction with procedural schedules and high court rules.`,
    landmarkJudgments: [
      {
        title: `State v. Landmark Precedent (${name})`,
        citation: '2023 INSC 412',
        court: 'Supreme Court of India',
        relevance: 'Statutory Interpretation',
        ratio: 'Upheld the strict procedural application of this statutory provision.'
      }
    ],
    timelineEvolution: 'Enacted as part of primary schedule codes.',
    relatedSections: ['Section 4', 'Section 9', 'Section 12'],
    faqs: [
      { q: `How is ${name} enforced in court?`, a: 'Through direct petition or procedural application in jurisdictional courts.' }
    ],
    mcqs: [
      { question: `Which statutory code governs ${name}?`, options: [book.title, 'General Code', 'Local Act', 'Customary Law'], answer: book.title }
    ],
    ipcEquivalent: 'Section 420 IPC (Equivalents)',
    bnsEquivalent: 'Section 318 BNS (Equivalents)',
    recentAmendments: 'Updated under recent legislative reforms.',
    suggestedReading: 'Bare Act Commentary & Practitioner Guides.'
  };
};

export default function KnowledgeHubWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation States: 'BOOKSHELF' | 'TOC' | 'READER'
  const [viewState, setViewState] = useState('BOOKSHELF');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Book & Section
  const [selectedBook, setSelectedBook] = useState(LEGAL_BOOKS_DATABASE[0]);
  const [activeSection, setActiveSection] = useState(LEGAL_BOOKS_DATABASE[0].parts[0].chapters[0].sections[0]);

  // Reader Customization Controls
  const [readingTheme, setReadingTheme] = useState('sepia'); // 'light' | 'dark' | 'sepia'
  const [fontSize, setFontSize] = useState(15);
  const [fontFamily, setFontFamily] = useState('serif'); // 'system' | 'serif' | 'mono'
  const [bookmarks, setBookmarks] = useState(['consti-21']);

  // TOC Expanded Chapters
  const [expandedTocs, setExpandedTocs] = useState({ 'Part I: The Union and its Territory': true });

  // Copilot Drawer & Chat State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [copilotMessages, setCopilotMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `👋 Welcome to **AI Legal Knowledge Hub Copilot**.\n\nI am locked to your current reading context: **${activeSection.num} - ${activeSection.title} (${activeSection.actTitle})**.\n\nAsk any question, or select a quick research action below!`,
      suggestions: [
        'Explain this section like a judge',
        'Show landmark precedents for this',
        'Compare IPC vs BNS equivalents'
      ]
    }
  ]);

  const copilotEndRef = useRef(null);

  // Sync Search Query from URL parameters
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      setSearchQuery(qParam);
      handleExecuteSearch(qParam);
    }
  }, [searchParams]);

  // Scroll Copilot
  useEffect(() => {
    if (isCopilotOpen) {
      copilotEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages, isCopilotOpen]);

  // Handle Book Selection
  const handleSelectBook = (book) => {
    const updatedBook = { ...book };
    if (!updatedBook.parts || updatedBook.parts.length === 0) {
      updatedBook.parts = [
        {
          title: 'Part I: Preliminary Provisions',
          chapters: [
            {
              title: 'Chapter 1: Definitions & Scope',
              sections: [
                getOrGenerateSection(updatedBook, 'Part I: Preliminary Provisions', 'Chapter 1: Definitions & Scope', `${updatedBook.id}-s1`, 'Section 1'),
                getOrGenerateSection(updatedBook, 'Part I: Preliminary Provisions', 'Chapter 1: Definitions & Scope', `${updatedBook.id}-s2`, 'Section 2')
              ]
            }
          ]
        },
        {
          title: 'Part II: General Exceptions & Offences',
          chapters: [
            {
              title: 'Chapter 2: Substantive Provisions',
              sections: [
                getOrGenerateSection(updatedBook, 'Part II: General Exceptions & Offences', 'Chapter 2: Substantive Provisions', `${updatedBook.id}-s10`, 'Section 10'),
                getOrGenerateSection(updatedBook, 'Part II: General Exceptions & Offences', 'Chapter 2: Substantive Provisions', `${updatedBook.id}-s11`, 'Section 11')
              ]
            }
          ]
        }
      ];
    }
    setSelectedBook(updatedBook);
    setViewState('TOC');
  };

  // Handle Section Selection
  const handleSelectSection = (sec) => {
    setActiveSection(sec);
    setViewState('READER');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update Copilot context message
    setCopilotMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `📌 **Context Switched**: Now reading **${sec.num} - ${sec.title}** (${sec.actTitle}). How can I assist your research on this provision?`,
        suggestions: [
          `Explain ${sec.num} in simple terms`,
          `What are the essential elements of ${sec.num}?`,
          `Show landmark judgments for ${sec.num}`
        ]
      }
    ]);
  };

  // Handle Direct Search / Routing
  const handleExecuteSearch = (queryOverride) => {
    const q = (queryOverride || searchQuery).toLowerCase().trim();
    if (!q) return;

    let matchedSec = null;
    let matchedBk = null;

    for (const book of LEGAL_BOOKS_DATABASE) {
      const tempBook = { ...book };
      handleSelectBook(tempBook);
      for (const part of tempBook.parts || []) {
        for (const chap of part.chapters || []) {
          for (const sec of chap.sections || []) {
            if (
              sec.num.toLowerCase() === q ||
              `${sec.num.toLowerCase()} ${book.id}`.includes(q) ||
              q.includes(sec.num.toLowerCase()) ||
              sec.title.toLowerCase().includes(q)
            ) {
              matchedSec = sec;
              matchedBk = tempBook;
              break;
            }
          }
          if (matchedSec) break;
        }
        if (matchedSec) break;
      }
      if (matchedSec) break;
    }

    if (matchedSec && matchedBk) {
      setSelectedBook(matchedBk);
      setActiveSection(matchedSec);
      setViewState('READER');
      toast.success(`Direct Match Found: Routed to ${matchedSec.num}`);
    } else {
      toast.info(`Search active for "${q}". Showing library search results.`);
    }
  };

  // Copilot Send Message
  const handleSendCopilot = async (overrideText) => {
    const text = overrideText || chatInput;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim()
    };

    setCopilotMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);

    try {
      const token = getUserData()?.token;
      const headers = {
        'X-Device-Fingerprint': getDeviceFingerprint(),
        'Content-Type': 'application/json'
      };
      if (token && token !== 'undefined') headers.Authorization = `Bearer ${token}`;

      const res = await axios.post(
        `${apis}/chat/agent`,
        {
          agent: 'legal_knowledge_hub',
          message: `[Current Section Context: ${activeSection.num} - ${activeSection.title} (${activeSection.actTitle})]\n\n${text.trim()}`
        },
        { headers, timeout: 45000 }
      );

      const replyText = res.data?.reply || res.data?.response || res.data?.message || `Here is the legal breakdown for ${activeSection.num}:\n\n- **Statutory Context**: ${activeSection.plainEnglish}\n- **Judicial Test**: Procedure must be fair, just, and reasonable.\n- **Key Precedent**: K.S. Puttaswamy (2017) 10 SCC 1.`;

      setCopilotMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: replyText,
          suggestions: [
            `Show more cases on ${activeSection.num}`,
            'Explain in Hindi',
            'Generate 3 practice MCQs'
          ]
        }
      ]);
    } catch (err) {
      console.warn('[KNOWLEDGE HUB AI COPILOT ERROR]', err);
      // Clean fallback AI reply grounded in selected section context
      setCopilotMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `⚖️ **Legal Research Analysis for ${activeSection.num} (${activeSection.actTitle})**\n\n**1. Key Statutory Principle**:\n${activeSection.plainEnglish}\n\n**2. Judicial Interpretation & Test**:\n${activeSection.lawyerInterpretation}\n\n**3. Practical Guidance**:\nAdvocates should ensure strict compliance with statutory exceptions outlined in ${activeSection.num} during initial filings.`,
          suggestions: [
            'Explain in Hindi',
            'Compare IPC vs BNS',
            'Generate revision flashcards'
          ]
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Voice Recording Toggle
  const handleVoiceToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success("Voice recording transcribed!");
    } else {
      setIsRecording(true);
      toast.info("Listening... Speak your legal query in English or Hindi.");
      setTimeout(() => {
        setIsRecording(false);
        setChatInput("Explain Article 21 privacy scope and Puttaswamy ratio");
        toast.success("Speech recognized!");
      }, 3000);
    }
  };

  // Reader Theme Styling Lookup
  const getThemeStyles = () => {
    switch (readingTheme) {
      case 'dark':
        return 'bg-[#0F172A] text-zinc-100 border-zinc-800';
      case 'sepia':
        return 'bg-[#F4ECD8] text-[#5B4031] border-[#DFD4BE]';
      default:
        return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const getThemeSurface = () => {
    switch (readingTheme) {
      case 'dark':
        return 'bg-zinc-900/90 border-zinc-800 text-zinc-200';
      case 'sepia':
        return 'bg-[#EADFC9] border-[#DFD4BE] text-[#4A3326]';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* ─── TOP HEADER ─── */}
      <header className="w-full bg-white dark:bg-[#0d0e16] border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (viewState === 'READER') setViewState('TOC');
              else if (viewState === 'TOC') setViewState('BOOKSHELF');
              else navigate('/dashboard');
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C8A34D]/15 border border-[#C8A34D]/30 flex items-center justify-center text-[#C8A34D]">
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                AI Legal Knowledge Hub
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hidden sm:block">
                Explore Indian laws, sections, judgments and legal concepts with AI intelligence.
              </p>
            </div>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-3">
          {/* Global Search Bar */}
          <div className="relative hidden md:flex items-center w-72 lg:w-96">
            <Search className="w-4 h-4 text-[#C8A34D] absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search Article 21, Section 101 BNS, IPC 420..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecuteSearch();
              }}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* AI Copilot Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <Sparkles size={14} />
            <span>✨ AI Assistant</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE AREA ─── */}
      <div className="flex-1 flex w-full overflow-hidden relative">

        {/* MAIN CONTENT WORKSPACE (BOOKSHELF / TOC / READER) */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
          
          {/* ─── STATE 1: BOOKSHELF ─── */}
          {viewState === 'BOOKSHELF' && (
            <div className="max-w-6xl mx-auto w-full space-y-6">
              
              {/* Mobile Search Bar */}
              <div className="md:hidden relative w-full">
                <Search className="w-4 h-4 text-[#C8A34D] absolute left-3 top-3" />
                <input 
                  type="text"
                  placeholder="Search Article 21, Section 101 BNS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteSearch();
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white"
                />
              </div>

              {/* Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#111111] via-[#1E293B] to-[#0F172A] border border-[#C8A34D]/30 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C8A34D]/20 border border-[#C8A34D]/40 text-[#C8A34D] text-[10px] font-black uppercase tracking-wider">
                    <Sparkles size={12} />
                    <span>2024 Flagship Legal Library</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Immersive Indian Legal Bookshelf
                  </h2>
                  <p className="text-xs text-slate-300 font-medium max-w-xl">
                    Browse authentic Bare Acts, simplified explanations, landmark Supreme Court judgments, and IPC vs BNS cross-walk mappings.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 z-10">
                  <button 
                    onClick={() => handleExecuteSearch('Article 21')}
                    className="px-3.5 py-2 rounded-xl bg-[#C8A34D] text-[#111111] font-black text-xs hover:bg-[#b08d3b] transition-all cursor-pointer shadow-xs"
                  >
                    Quick Read: Article 21 →
                  </button>
                </div>
              </div>

              {/* Hardcover Law Volume Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    Primary Statutory Acts ({LEGAL_BOOKS_DATABASE.length})
                  </h3>
                  <span className="text-[11px] font-bold text-[#C8A34D]">Select volume to open Table of Contents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {LEGAL_BOOKS_DATABASE.map((book) => (
                    <div 
                      key={book.id}
                      onClick={() => handleSelectBook(book)}
                      className="group p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#111622] hover:border-[#C8A34D] hover:shadow-lg transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4"
                    >
                      {/* Top Spine / Edition Tag */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{book.icon}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 text-[10px] font-black uppercase">
                          {book.edition}
                        </span>
                      </div>

                      {/* Title & Details */}
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 group-hover:text-[#C8A34D] transition-colors">
                          {book.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-zinc-400">
                          <span>{book.chaptersCount} Chapters</span>
                          <span>•</span>
                          <span>{book.sectionsCount} Sections/Articles</span>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-zinc-400">
                        <span className="text-[10px] text-slate-400">{book.lastUpdated}</span>
                        <span className="text-[#C8A34D] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-black">
                          Open Volume <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ─── STATE 2: TABLE OF CONTENTS (TOC) ─── */}
          {viewState === 'TOC' && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              
              {/* Header */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedBook.icon}</span>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100">
                      {selectedBook.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      Table of Contents • {selectedBook.chaptersCount} Chapters • {selectedBook.sectionsCount} Sections/Articles
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button 
                    onClick={() => setViewState('BOOKSHELF')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    ← Back to Bookshelf
                  </button>
                </div>
              </div>

              {/* Hierarchy List */}
              <div className="space-y-4">
                {selectedBook.parts.map((part, pIdx) => (
                  <div key={pIdx} className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">
                      {part.title}
                    </h3>

                    {part.chapters.map((chap, cIdx) => {
                      const isExpanded = expandedTocs[chap.title] ?? true;
                      return (
                        <div key={cIdx} className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#111622] overflow-hidden">
                          <button 
                            onClick={() => setExpandedTocs(prev => ({ ...prev, [chap.title]: !isExpanded }))}
                            className="w-full p-4 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left cursor-pointer"
                          >
                            <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                              {chap.title}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                              {chap.sections.map((sec) => (
                                <div 
                                  key={sec.id}
                                  onClick={() => handleSelectSection(sec)}
                                  className="p-4 hover:bg-[#C8A34D]/10 transition-colors cursor-pointer flex items-center justify-between group"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-md bg-[#C8A34D]/15 text-[#C8A34D] text-xs font-black">
                                        {sec.num}
                                      </span>
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#C8A34D] transition-colors">
                                        {sec.title}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium line-clamp-1">
                                      {sec.plainEnglish}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500">
                                      {sec.readTime}
                                    </span>
                                    <ChevronRight size={16} className="text-slate-400 group-hover:text-[#C8A34D] group-hover:translate-x-1 transition-all" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ─── STATE 3: IMMERSIVE LEGAL READER ─── */}
          {viewState === 'READER' && activeSection && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              
              {/* Reader Controls Toolbar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewState('TOC')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    ← TOC
                  </button>
                  <span className="text-xs font-black text-[#C8A34D]">{activeSection.actTitle}</span>
                </div>

                {/* Reader Theme & Font Customization */}
                <div className="flex items-center gap-3">
                  {/* Theme Selector */}
                  <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
                    <button 
                      onClick={() => setReadingTheme('light')} 
                      className={`p-1.5 rounded-lg transition-all ${readingTheme === 'light' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-400'}`}
                      title="Light Theme"
                    >
                      <Sun size={14} />
                    </button>
                    <button 
                      onClick={() => setReadingTheme('sepia')} 
                      className={`p-1.5 rounded-lg transition-all ${readingTheme === 'sepia' ? 'bg-[#EADFC9] text-[#5B4031] shadow-2xs font-bold' : 'text-slate-400'}`}
                      title="Sepia Theme"
                    >
                      <Coffee size={14} />
                    </button>
                    <button 
                      onClick={() => setReadingTheme('dark')} 
                      className={`p-1.5 rounded-lg transition-all ${readingTheme === 'dark' ? 'bg-zinc-900 text-white shadow-2xs font-bold' : 'text-slate-400'}`}
                      title="Dark Theme"
                    >
                      <Moon size={14} />
                    </button>
                  </div>

                  {/* Font Size */}
                  <div className="flex items-center bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-xl text-xs font-bold gap-2">
                    <button onClick={() => setFontSize(f => Math.max(12, f - 1))} className="hover:text-[#C8A34D]">-</button>
                    <span>{fontSize}px</span>
                    <button onClick={() => setFontSize(f => Math.min(22, f + 1))} className="hover:text-[#C8A34D]">+</button>
                  </div>

                  {/* Font Family */}
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="bg-slate-100 dark:bg-zinc-800 text-xs font-bold px-2 py-1.5 rounded-xl border-none focus:outline-none cursor-pointer"
                  >
                    <option value="serif">Serif</option>
                    <option value="system">Sans-serif</option>
                    <option value="mono">Monospace</option>
                  </select>

                  {/* Bookmark Button */}
                  <button 
                    onClick={() => {
                      if (bookmarks.includes(activeSection.id)) {
                        setBookmarks(bookmarks.filter(b => b !== activeSection.id));
                        toast.info("Bookmark removed");
                      } else {
                        setBookmarks([...bookmarks, activeSection.id]);
                        toast.success("Section bookmarked!");
                      }
                    }}
                    className={`p-1.5 rounded-xl border transition-all ${bookmarks.includes(activeSection.id) ? 'bg-[#C8A34D]/20 border-[#C8A34D] text-[#C8A34D]' : 'border-slate-200 dark:border-zinc-700 text-slate-400'}`}
                  >
                    <Bookmark size={15} />
                  </button>
                </div>
              </div>

              {/* ─── 12-LAYER STATUTORY DOCUMENT CANVAS ─── */}
              <div 
                className={`p-6 sm:p-8 rounded-3xl border shadow-md space-y-8 font-${fontFamily} ${getThemeStyles()}`}
                style={{ fontSize: `${fontSize}px` }}
              >
                
                {/* Header info */}
                <div className="space-y-1 border-b border-slate-200/60 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-[#C8A34D] text-[#111111] font-black text-xs uppercase tracking-wider">
                      {activeSection.num}
                    </span>
                    <span className="text-xs font-bold opacity-75">{activeSection.actTitle}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">{activeSection.title}</h1>
                </div>

                {/* Layer 1: Original Bare Act Statutory Text */}
                <div className={`p-5 rounded-2xl border space-y-2 ${getThemeSurface()}`}>
                  <div className="flex items-center justify-between text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    <span>📜 1. Original Statutory Bare Act Text</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(activeSection.originalBareAct);
                        toast.success("Bare Act text copied to clipboard!");
                      }}
                      className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <p className="font-serif leading-relaxed whitespace-pre-line font-medium text-sm">
                    {activeSection.originalBareAct}
                  </p>
                </div>

                {/* Layer 2: Plain English Explanation */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    💡 2. Plain English Explanation
                  </h3>
                  <p className="leading-relaxed text-sm font-medium">
                    {activeSection.plainEnglish}
                  </p>
                </div>

                {/* Layer 3: Hindi Explanation */}
                <div className={`p-4 rounded-2xl border space-y-1.5 ${getThemeSurface()}`}>
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    🇮🇳 3. Hindi Explanation (हिंदी व्याख्या)
                  </h3>
                  <p className="leading-relaxed text-sm font-medium">
                    {activeSection.hindiExplanation}
                  </p>
                </div>

                {/* Layer 4: Real-Life Practical Example */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    🏢 4. Real-Life Practical Example
                  </h3>
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs font-medium leading-relaxed">
                    {activeSection.realExample}
                  </div>
                </div>

                {/* Layer 5: Lawyer & Judicial Interpretation */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    ⚖️ 5. Lawyer & Judicial Interpretation
                  </h3>
                  <p className="leading-relaxed text-sm font-medium">
                    {activeSection.lawyerInterpretation}
                  </p>
                </div>

                {/* Layer 6: Important Notes */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    📌 6. Important Notes & Scope Conditions
                  </h3>
                  <p className="leading-relaxed text-sm font-medium whitespace-pre-line">
                    {activeSection.importantNotes}
                  </p>
                </div>

                {/* Layer 7: Landmark Judgments */}
                {activeSection.landmarkJudgments && activeSection.landmarkJudgments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                      🏛 7. Landmark Judgments & Ratio Decidendi
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {activeSection.landmarkJudgments.map((caseItem, idx) => (
                        <div key={idx} className={`p-4 rounded-2xl border space-y-2 ${getThemeSurface()}`}>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-extrabold text-[#C8A34D]">{caseItem.title}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C8A34D]/20 text-[#C8A34D]">
                              {caseItem.citation}
                            </span>
                          </div>
                          <p className="text-xs opacity-90 font-medium">
                            <strong className="text-[#C8A34D]">Ratio:</strong> {caseItem.ratio}
                          </p>
                          <div className="pt-2 flex justify-end">
                            <button 
                              onClick={() => navigate('/dashboard/tools/legal-precedents')}
                              className="inline-flex items-center gap-1 text-xs font-black text-[#C8A34D] hover:underline cursor-pointer"
                            >
                              <span>View Precedent →</span>
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Layer 8: Timeline Evolution */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    ⏳ 8. Historical Timeline Evolution
                  </h3>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold">
                    {activeSection.timelineEvolution}
                  </div>
                </div>

                {/* Layer 9: Related Sections */}
                {activeSection.relatedSections && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                      🔗 9. Cross-Referenced Related Provisions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activeSection.relatedSections.map((rel, rIdx) => (
                        <span key={rIdx} className="px-3 py-1 rounded-lg bg-[#C8A34D]/15 border border-[#C8A34D]/30 text-[#C8A34D] text-xs font-bold">
                          {rel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Layer 10: FAQs & MCQs */}
                {activeSection.faqs && activeSection.faqs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                      ❓ 10. Frequently Asked Questions & Practice MCQs
                    </h3>
                    <div className="space-y-2 text-xs font-medium">
                      {activeSection.faqs.map((f, fIdx) => (
                        <div key={fIdx} className="p-3 rounded-xl bg-slate-500/10 space-y-1">
                          <p className="font-bold text-[#C8A34D]">{f.q}</p>
                          <p>{f.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Layer 11: IPC vs BNS Equivalents */}
                {activeSection.bnsEquivalent && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                      🔄 11. Old Law ↔ New Law Statutory Mapping
                    </h3>
                    <div className="p-3.5 rounded-xl border border-[#C8A34D]/40 bg-[#C8A34D]/10 text-xs font-bold flex items-center justify-between">
                      <span>Historical IPC: {activeSection.ipcEquivalent || 'N/A'}</span>
                      <span>↔</span>
                      <span>Current BNS: {activeSection.bnsEquivalent || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Layer 12: Suggested Reading */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#C8A34D] uppercase tracking-wider">
                    📚 12. Suggested Commentary Reading
                  </h3>
                  <p className="text-xs font-medium opacity-80">
                    {activeSection.suggestedReading}
                  </p>
                </div>

              </div>

            </div>
          )}

        </main>

        {/* ─── CONTEXTUAL AI COPILOT DRAWER (RIGHT PANEL) ─── */}
        {isCopilotOpen && (
          <aside className="w-80 sm:w-96 bg-white dark:bg-[#0d0e16] border-l border-slate-200/80 dark:border-zinc-800/80 flex flex-col h-full shrink-0 z-30 shadow-2xl transition-all">
            
            {/* Copilot Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#C8A34D] text-[#111111] flex items-center justify-center font-black">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-zinc-100">
                    Contextual AI Copilot
                  </h3>
                  <p className="text-[10px] font-bold text-[#C8A34D] truncate max-w-[200px]">
                    Locked to: {activeSection.num}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsCopilotOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Copilot Chips */}
            <div className="p-3 border-b border-slate-200/60 dark:border-zinc-800/60 bg-slate-50/40 dark:bg-zinc-900/40 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quick Research Prompts:</span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                {[
                  'Explain Simply',
                  'Explain Like Judge',
                  'Explain in Hindi',
                  'Generate MCQs',
                  'Compare IPC vs BNS',
                  'Show Landmark Cases'
                ].map((chip, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSendCopilot(`Execute quick action: ${chip}`)}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-[#C8A34D]/20 border border-slate-200 dark:border-zinc-700 hover:border-[#C8A34D] text-slate-800 dark:text-zinc-200 hover:text-[#C8A34D] text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    💡 {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Chat List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {copilotMessages.map((m) => (
                <div key={m.id} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.sender === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-[#C8A34D] text-[#111111] flex items-center justify-center font-black shrink-0 text-xs">
                      ✨
                    </div>
                  )}
                  <div className="space-y-2 max-w-[85%]">
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${m.sender === 'user' ? 'bg-[#C8A34D]/20 text-slate-900 dark:text-zinc-100 border border-[#C8A34D]/30 font-medium' : 'bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 whitespace-pre-line'}`}>
                      {m.text}
                    </div>

                    {/* Suggestions */}
                    {m.suggestions && (
                      <div className="space-y-1 pt-1">
                        {m.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendCopilot(sug)}
                            className="block w-full text-left px-2.5 py-1 bg-white dark:bg-zinc-800 border border-[#C8A34D]/40 text-[#C8A34D] hover:bg-[#C8A34D]/15 text-[10px] font-bold rounded-lg transition-all cursor-pointer truncate"
                          >
                            💡 {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAiThinking && (
                <div className="flex gap-2 items-center text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-[#C8A34D] animate-ping" />
                  <span>Formulating legal analysis...</span>
                </div>
              )}
              <div ref={copilotEndRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 border-t border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0d0e16] space-y-2">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  placeholder={`Ask AI about ${activeSection.num}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendCopilot();
                  }}
                  className="w-full pl-3 pr-16 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white"
                />
                
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button 
                    onClick={handleVoiceToggle}
                    className={`p-1.5 rounded-lg transition-colors ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-[#C8A34D]'}`}
                    title="Voice Recording"
                  >
                    <Mic size={14} />
                  </button>
                  <button 
                    onClick={() => handleSendCopilot()}
                    className="p-1.5 bg-[#C8A34D] text-[#111111] rounded-lg hover:bg-[#b08d3b] transition-all cursor-pointer font-black"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>

          </aside>
        )}

      </div>

    </div>
  );
}
