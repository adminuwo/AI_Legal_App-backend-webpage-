import { 
  FileText, Shield, FileCheck, Scale, Binary, 
  Mail, PenTool, AlertTriangle, Edit3, Brain, 
  Library, Clock, CheckCircle, ArrowLeftRight, Lock, Sparkles,
  MessageCircle, ArrowRight, X, ChevronDown, Zap, Maximize2, Minimize2, Gavel, Briefcase, Search 
} from 'lucide-react';
import LegalLogo from '../components/LegalLogo';

export const PREMIUM_TOOLS = [
  {
    id: 'legal_my_case',
    name: 'My Case',
    icon: Briefcase,
    desc: 'Personal Legal CRM & Case Intelligence System',
    price: '₹1299',
    workflow: [
      'Select or create a legal case folder.',
      'Input client details and case summary.',
      'Chat with AI assistant focused strictly on case context.',
      'Access specialized case tools (Drafting, Analysis, etc.)'
    ]
  },
  {
    id: 'legal_draft_maker',
    name: 'Draft Maker',
    icon: FileText,
    desc: 'Notice, Affidavit, FIR & Legal Agreements Architect',
    price: '₹599',
    workflow: [
      'Describe the document you need (FIR, Notice, Agreement, etc.).',
      'Provide key names, dates, and factual background.',
      'AI generates a litigation-ready professional draft.'
    ]
  },
  {
    id: 'legal_contract_analyzer',
    name: 'Contract Analyzer',
    icon: FileCheck,
    desc: 'Risk Scanning & Protective Clause Rewriter',
    price: '₹799',
    workflow: [
      'Upload or paste your contract/agreement text.',
      'AI scans for hidden risks, liabilities, and unfair clauses.',
      'Get professional rewrites to protect your interests.'
    ]
  },
  {
    id: 'legal_case_predictor',
    name: 'Case Predictor',
    icon: LegalLogo,
    desc: 'Outcome Probability & Case Strength Analyst',
    price: '₹999',
    workflow: [
      'Input case facts, evidence, and legal claims.',
      'AI evaluates scenarios against legal precedents.',
      'Receive success probability and predicted judicial verdict.'
    ]
  },
  {
    id: 'legal_strategy_engine',
    name: 'Strategy Engine',
    icon: Brain,
    desc: 'Tactical Planning & Case Journey Timeline',
    price: '₹899',
    workflow: [
      'Brief the AI on your current legal dispute.',
      'AI simulates opponent moves and creates counter-strategies.',
      'Get aggressive, balanced, and safe tactical options.'
    ]
  },
  {
    id: 'legal_evidence_checker',
    name: 'Evidence Analyst',
    icon: Binary,
    desc: 'Professional Strengths, Admissibility & Risk Reporting',
    price: '₹599',
    workflow: [
      'Submit a list or description of your evidence.',
      'AI checks admissibility under Section 65B and other laws.',
      'AI identifies gaps and suggests ways to strengthen proof.'
    ]
  },
  {
    id: 'legal_research',
    name: 'Legal Research',
    icon: Search,
    desc: 'Research Workspace for Acts, Judgments & Precedents',
    price: '₹699',
    workflow: [
      'Enter a legal topic, act, or section to research.',
      'AI searches relevant statutes and case laws.',
      'Receive detailed summaries and precedents.'
    ]
  },
  {
    id: 'legal_research_assistant',
    name: 'Research Assistant',
    icon: Library,
    desc: 'Statutory Interpetation & Case Law CITATIONS',
    price: '₹699',
    workflow: [
      'Ask any complex legal query or situational question.',
      'AI searches relevant statutes (IPC, BNS) and case laws.',
      'Receive citations and strategic summaries for court use.'
    ]
  },
  {
    id: 'legal_argument_builder',
    name: 'Argument Builder',
    icon: Gavel,
    desc: 'Structure Courtroom-Ready Arguments & Cross-Exams',
    price: '₹999',
    workflow: [
      'Provide brief facts and the core dispute.',
      'AI structures primary arguments and secondary rebuttals.',
      'AI generates targeted cross-examination questions.'
    ]
  },
  {
    id: 'legal_general_chat',
    name: 'General Legal Chat',
    icon: MessageCircle,
    desc: 'Professional legal discourse, simple guidance, and Q&A.',
    price: 'Free',
    workflow: [
      'Ask any general legal question.',
      'Get professional guidance and simple explanations.',
      'Engage in AI-assisted legal discussion.'
    ]
  }
];
