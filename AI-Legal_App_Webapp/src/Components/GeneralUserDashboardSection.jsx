import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, FileText, ShieldCheck, Scale, MessageSquare, 
  ArrowRight, Calendar, Clock, AlertCircle, Sparkles, BookOpen, 
  CheckCircle2, ChevronRight, ChevronLeft, HelpCircle, FileCheck, PhoneCall,
  UserCheck, ExternalLink, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';

const LEGAL_TOPICS = [
  { id: 'family', label: 'Family & Divorce', query: 'Please explain Family Law & Divorce procedures under Indian Law in simple words. What are the key rights, maintenance, and child custody rules?' },
  { id: 'property', label: 'Property & Tenancy', query: 'What are tenant and landlord legal rights under Indian Law? How to resolve property possession, lease disputes, and eviction legally?' },
  { id: 'consumer', label: 'Consumer Rights', query: 'How can a citizen file a case in the Consumer Court/Forum in India? What are the compensation rights for defective goods or unfair service?' },
  { id: 'criminal', label: 'FIR & Police Rights', query: 'What are my legal rights during police questioning, arrest, and FIR registration under Indian Law? How does anticipatory bail work?' },
  { id: 'cyber', label: 'Cyber Fraud & Scams', query: 'What immediate legal steps should a victim of financial cyber fraud or online harassment take in India under the IT Act?' },
  { id: 'employment', label: 'Job & Labour Rights', query: 'What are employee rights in India regarding wrongful termination, salary dues, PF withdrawal, and notice period obligations?' },
  { id: 'cheque', label: 'Cheque Bounce (Sec 138)', query: 'How does Section 138 of the Negotiable Instruments Act for cheque bounce work in India? What are the legal notice requirements?' },
];

const CITIZEN_GUIDES = [
  {
    id: 'g1',
    title: 'Understanding Consumer Court Procedures',
    desc: 'Step-by-step guidance on issuing notice and filing claims in District Consumer Commission.',
    readTime: '3 min read',
    prompt: 'Provide a complete citizen guide on how to file a consumer complaint in India without hiring an expensive lawyer.',
  },
  {
    id: 'g2',
    title: '5 Crucial Clauses in Property & Rent Agreements',
    desc: 'Essential clauses for security deposit refunds, lock-in periods, and maintenance responsibilities.',
    readTime: '4 min read',
    prompt: 'Explain the 5 most critical clauses everyone must check before signing a house rent agreement or property lease in India.',
  },
  {
    id: 'g3',
    title: 'How Consultation with a Verified Advocate Works',
    desc: 'Tips on preparing facts, organizing evidence documents, and clarifying fee schedules.',
    readTime: '2 min read',
    prompt: 'How should a citizen prepare for their first legal consultation with an advocate? What documents and questions should they bring?',
  },
];

export default function GeneralUserDashboardSection({ user, onRefresh }) {
  const navigate = useNavigate();
  const userName = user?.name || user?.fullName || 'Citizen';
  const topicsScrollRef = useRef(null);

  const [recentRequests, setRecentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoadingRequests(true);
        const res = await consultationService.getMyRequests();
        if (res && res.requests) {
          setRecentRequests(res.requests.slice(0, 3));
        }
      } catch (err) {
        console.warn('[GeneralUserDashboardSection] Error loading requests:', err);
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchRequests();
  }, []);

  const handleQuickAction = (action) => {
    if (action === 'advocates') {
      navigate('/dashboard/advocates');
    } else if (action === 'requests') {
      navigate('/dashboard/requests');
    } else if (action === 'analyze') {
      const prompt = 'Please analyze this legal agreement / document for me. Highlight any unfair clauses, hidden liabilities, risk factors, and dispute resolution terms in simple language.';
      navigate(`/dashboard/chat/new?prompt=${encodeURIComponent(prompt)}&autoSend=false`);
    } else if (action === 'draft') {
      const prompt = 'I need to draft a legal document (e.g. Legal Notice, Rent Agreement, Affidavit, or Police Complaint). Please ask me the required facts and draft a legally sound document with appropriate clauses.';
      navigate(`/dashboard/chat/new?prompt=${encodeURIComponent(prompt)}&autoSend=false`);
    } else if (action === 'rights') {
      const prompt = 'What are my fundamental legal rights under Indian Law regarding police FIRs, consumer protection, tenant rights, and civil remedies? Please guide me in plain English.';
      navigate(`/dashboard/chat/new?prompt=${encodeURIComponent(prompt)}&autoSend=true`);
    }
  };

  const handleTopicClick = (topicQuery) => {
    navigate(`/dashboard/chat/new?prompt=${encodeURIComponent(topicQuery)}&autoSend=true`);
  };

  const scrollTopics = (direction) => {
    if (topicsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      topicsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'accepted':
        return { bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Accepted' };
      case 'scheduled':
        return { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Scheduled' };
      case 'completed':
        return { bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', label: 'Completed' };
      case 'cancelled':
        return { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', label: 'Cancelled' };
      case 'rejected':
        return { bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', label: 'Declined' };
      default:
        return { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Pending' };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 select-none">
      {/* 1. CITIZEN HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome, {userName} 👋
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30">
              Citizen Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Access plain-language AI legal advice, verify legal agreements, and connect with verified advocates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/dashboard/advocates')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Find Advocates</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/requests')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#B88B2A]" />
            <span>My Consultations</span>
          </button>
        </div>
      </div>

      {/* 2. FOUR PRIMARY SERVICE CARDS (Compact Height & Width) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Find Advocates */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => handleQuickAction('advocates')}
          className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm hover:border-[#B88B2A]/50 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-[#B88B2A]/15 text-[#B88B2A] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B88B2A] transition-colors line-clamp-1">
              Find Verified Advocates
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
              Consult verified Bar Council advocates with upfront transparent fees.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#B88B2A] mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Browse Advocates</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Card 2: Document Analyzer */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => handleQuickAction('analyze')}
          className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm hover:border-[#B88B2A]/50 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B88B2A] transition-colors line-clamp-1">
              Analyze Legal Documents
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
              Paste or upload rent agreements and notices to identify hidden risks & traps.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#B88B2A] mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Scan Document</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Card 3: Draft Maker */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => handleQuickAction('draft')}
          className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm hover:border-[#B88B2A]/50 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-500 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B88B2A] transition-colors line-clamp-1">
              Draft Legal Notice
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
              Draft rental deeds, affidavits, police complaints, and formal notices with standard clauses.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#B88B2A] mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Start Drafting</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Card 4: Know Your Rights */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => handleQuickAction('rights')}
          className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm hover:border-[#B88B2A]/50 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B88B2A] transition-colors line-clamp-1">
              Know Your Legal Rights
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
              Ask questions about police FIRs, bail rights, consumer disputes, and remedies.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#B88B2A] mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Ask AI Legal</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* 3. ACTIVE CONSULTATIONS SECTION (Compact Cards) */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#B88B2A]" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              My Consultation Requests
            </h2>
          </div>
          <button
            onClick={() => navigate('/dashboard/requests')}
            className="text-xs font-bold text-[#B88B2A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingRequests ? (
          <div className="py-6 flex items-center justify-center text-slate-400 gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B88B2A]" />
            <span>Loading your consultations...</span>
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <div className="w-10 h-10 rounded-full bg-[#B88B2A]/10 text-[#B88B2A] flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              No Consultation Requests Yet
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-0.5 mb-3">
              Need legal advice from an enrolled advocate? Browse our directory and book a consultation.
            </p>
            <button
              onClick={() => navigate('/dashboard/advocates')}
              className="px-3.5 py-1.5 rounded-lg bg-[#B88B2A] text-white font-bold text-xs hover:bg-[#A37722] transition-colors cursor-pointer shadow-xs"
            >
              Browse Verified Advocates
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-5xl">
            {recentRequests.map((req) => {
              const statusCfg = getStatusBadge(req.status);
              const advocateName = req.advocateName || (typeof req.advocateId === 'object' ? req.advocateId?.fullName || req.advocateId?.name : 'Advocate');
              const dateDisplay = req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Confirmation';

              return (
                <div
                  key={req._id || req.id}
                  onClick={() => navigate('/dashboard/requests')}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-[#B88B2A]/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        {req.requestId || 'REQ'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${statusCfg.bg}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {advocateName}
                    </h4>
                    <p className="text-[11px] text-[#B88B2A] font-semibold mt-0.5 truncate">
                      {req.practiceArea || 'General Consultation'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 leading-snug">
                      {req.legalIssueSummary || 'No summary provided.'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 min-w-0">
                      <Clock className="w-3 h-3 text-[#B88B2A] shrink-0" />
                      <span className="truncate">{dateDisplay}</span>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 whitespace-nowrap ml-2">
                      ₹{req.fee || 1500}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. POPULAR CITIZEN LEGAL TOPICS (Single Horizontal Row) */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B88B2A]" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Common Legal Topics & Citizen Rights
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => scrollTopics('left')}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollTopics('right')}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
          Click any topic to get instant, verified AI explanations and statutory protections under Indian Law.
        </p>

        {/* Single Row with horizontal scroll */}
        <div 
          ref={topicsScrollRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 flex-nowrap"
        >
          {LEGAL_TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicClick(topic.query)}
              className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-[#B88B2A]/10 dark:bg-slate-900/60 dark:hover:bg-[#B88B2A]/15 border border-slate-200 dark:border-slate-800 hover:border-[#B88B2A]/40 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-[#B88B2A] transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. RECOMMENDED LEGAL GUIDES (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CITIZEN_GUIDES.map((guide) => (
          <div
            key={guide.id}
            onClick={() => handleTopicClick(guide.prompt)}
            className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 hover:border-[#B88B2A]/40 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-[#B88B2A] uppercase tracking-wider">
                  Citizen Advisory
                </span>
                <span className="text-[10px] text-slate-400">{guide.readTime}</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B88B2A] transition-colors leading-snug line-clamp-1">
                {guide.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                {guide.desc}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#B88B2A] mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span>Read Guide with AI</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
