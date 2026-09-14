import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Scale, Filter, BookOpen, Copy, Plus, FileSignature, Check,
  ChevronRight, ExternalLink, ShieldCheck, ArrowRight, Sparkles, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter from '../Components/PublicFooter';
import { getUserData } from '../userStore/userData';

export default function PublicLegalResearch() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = getUserData();
  const isAuthenticated = Boolean((token && token !== 'undefined') || (user?.token && user.token !== 'undefined'));

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [courtFilter, setCourtFilter] = useState('All');
  const [statuteFilter, setStatuteFilter] = useState('All');
  const [benchFilter, setBenchFilter] = useState('All');
  const [dispositionFilter, setDispositionFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Realistic Precedent Database
  const samplePrecedents = [
    {
      id: 'case-1',
      title: 'Satender Kumar Antil v. Central Bureau of Investigation',
      citation: '(2022) 10 SCC 51 • 2022 INSC 690',
      court: 'Supreme Court of India',
      statute: 'BNSS / CrPC (Sec 482 / 438)',
      bench: '2-Judge Bench (S.K. Kaul & M.M. Sundresh, JJ.)',
      year: '2022',
      disposition: 'Guidelines Issued',
      status: 'Binding Precedent',
      statusColor: 'emerald',
      ratio: 'Courts must not insist on custodial appearance or mechanically remand accused for offenses punishable with imprisonment up to 7 years without investigating agency satisfying prerequisites of Section 41 CrPC (now Section 35 BNSS). Non-compliance entitles applicant to anticipatory bail.',
      propositions: [
        'Category A offenses (up to 7 years imprisonment) do not warrant routine arrest.',
        'Anticipatory bail petition maintainable even after filing of chargesheet if summons issued without coercive execution.'
      ]
    },
    {
      id: 'case-2',
      title: 'Arnesh Kumar v. State of Bihar & Anr.',
      citation: '(2014) 8 SCC 273 • AIR 2014 SC 2756',
      court: 'Supreme Court of India',
      statute: 'IPC / BNS (Sec 498A / 85)',
      bench: '2-Judge Bench (Chandramauli Kr. Prasad & Pinaki Chandra Ghose, JJ.)',
      year: '2014',
      disposition: 'Allowed',
      status: 'Binding Precedent',
      statusColor: 'emerald',
      ratio: 'Police officers cannot arrest an accused merely because a non-bailable offense is alleged in an FIR. Magistrate before authorising detention under Section 167 must record satisfaction on objective materials.',
      propositions: [
        'Notice of appearance under Section 41A CrPC mandatory for offenses under 7 years.',
        'Failure by police officer to record specific reasons for arrest attracts departmental action and contempt proceedings.'
      ]
    },
    {
      id: 'case-3',
      title: 'Dashrath Rupsingh Rathod v. State of Maharashtra',
      citation: '(2014) 9 SCC 129 • 2014 INSC 544',
      court: 'Supreme Court of India',
      statute: 'Negotiable Instruments Act (Sec 138)',
      bench: '3-Judge Bench (T.S. Thakur, Vikramajit Sen & C. Nagappan, JJ.)',
      year: '2014',
      disposition: 'Partly Allowed',
      status: 'Statutorily Modified by 2015 Amendment',
      statusColor: 'amber',
      ratio: 'Territorial jurisdiction for complaint under Section 138 NI Act resides exclusively where the drawee bank is situated. (Note: Statutorily superseded by Negotiable Instruments (Amendment) Act 2015, inserting Section 142(2) anchoring jurisdiction to payee\'s branch where account maintained).',
      propositions: [
        'Territorial jurisdiction in cheque dishonor tied to payee maintaining bank branch per Sec 142(2).',
        'Statutory 15-day notice timeline cannot be waived.'
      ]
    },
    {
      id: 'case-4',
      title: 'Anvar P.V. v. P.K. Basheer & Ors.',
      citation: '(2014) 10 SCC 473 • 2014 INSC 678',
      court: 'Supreme Court of India',
      statute: 'Indian Evidence Act / BSA (Sec 65B / 63)',
      bench: '3-Judge Bench (R.M. Lodha, C.J., Kurian Joseph & R.F. Nariman, JJ.)',
      year: '2014',
      disposition: 'Allowed',
      status: 'Clarified in Arjun Panditrao (2020)',
      statusColor: 'emerald',
      ratio: 'Electronic record produced by way of secondary evidence is wholly inadmissible unless accompanied by certificate under Section 65B(4) (now Section 63 BSA) executed by person occupying responsible official position in relation to the relevant device.',
      propositions: [
        'Section 65B constitutes a special self-contained code overruling general provisions on secondary evidence.',
        'Oral evidence in place of Section 65B/63 certificate is strictly impermissible in law.'
      ]
    },
    {
      id: 'case-5',
      title: 'U.N. Krishnamurthy v. A.M. Krishnamurthy',
      citation: '(2022) 11 SCC 382 • 2022 INSC 709',
      court: 'Supreme Court of India',
      statute: 'Specific Relief Act (Sec 16(c))',
      bench: '3-Judge Bench (Indira Banerjee, A.S. Bopanna & C.T. Ravikumar, JJ.)',
      year: '2022',
      disposition: 'Allowed',
      status: 'Binding Precedent',
      statusColor: 'emerald',
      ratio: 'In a suit for specific performance of contract, plaintiff must continuously plead and prove readiness and willingness to perform from date of contract through date of decree. Absence of documentary financial capacity disentitles decree.',
      propositions: [
        'Readiness implies financial resources; willingness implies the conduct and intention to execute.',
        '2018 amendment to Specific Relief Act does not dilute mandatory readiness proof under Section 16(c).'
      ]
    },
    {
      id: 'case-6',
      title: 'M/s Vidya Drolia and Others v. Durga Trading Corporation',
      citation: '(2021) 2 SCC 1 • 2020 INSC 697',
      court: 'Supreme Court of India',
      statute: 'Arbitration and Conciliation Act (Sec 8 & 11)',
      bench: '3-Judge Bench (N.V. Ramana, Sanjiv Khanna & Krishna Murari, JJ.)',
      year: '2021',
      disposition: 'Reference Answered',
      status: 'Binding Landmark',
      statusColor: 'emerald',
      ratio: 'Landlord-tenant disputes governed by Transfer of Property Act are arbitrable unless covered by special rent control legislation conferring exclusive jurisdiction on Rent Controllers.',
      propositions: [
        'Four-fold test of non-arbitrability: rights in rem, third-party rights, sovereign state functions, or non-arbitrable by mandatory statute.',
        'Prima facie review standard under Section 11 is narrow and pro-arbitration.'
      ]
    }
  ];

  // Filtered Precedents
  const filteredCases = samplePrecedents.filter(item => {
    const matchSearch = !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.citation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.statute.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ratio.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCourt = courtFilter === 'All' || item.court.includes(courtFilter);
    const matchStatute = statuteFilter === 'All' || item.statute.toLowerCase().includes(statuteFilter.toLowerCase());
    const matchBench = benchFilter === 'All' || item.bench.includes(benchFilter);
    const matchYear = yearFilter === 'All' || item.year === yearFilter;

    return matchSearch && matchCourt && matchStatute && matchBench && matchYear;
  });

  const handleCopyRatio = (item) => {
    const textToCopy = `[RATIO DECIDENDI]\n${item.title}, ${item.citation}\n${item.bench}\n\n${item.ratio}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    toast.success('Ratio decidendi copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleActionClick = (actionName, item) => {
    if (isAuthenticated) {
      navigate('/dashboard/cases');
      toast.success(`${actionName} applied to your active case workspace.`);
    } else {
      toast('Please sign in to link precedents to your case files.', { icon: '🔒' });
      navigate('/login', { state: { from: '/dashboard/cases' } });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 font-sans selection:bg-[#B88B2A]/25 selection:text-[#111111]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none">
            <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-9 h-9 object-contain" />
            <span className="text-lg font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
              AI LEGAL<span className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button onClick={() => navigate('/')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={() => navigate('/features')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Features
            </button>
            <button onClick={() => navigate('/blog')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Blog
            </button>
            <button onClick={() => navigate('/pricing')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Pricing
            </button>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#B88B2A]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs">
              Case Search
            </span>
            <button onClick={() => navigate('/about')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              About
            </button>
            <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-full text-xs font-black text-[#111111] bg-gradient-to-b from-[#D4AF37] to-[#B88B2A] hover:brightness-105 shadow-xs transition-all cursor-pointer"
              >
                Dashboard →
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#B88B2A] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 rounded-full text-xs font-black text-[#111111] bg-gradient-to-b from-[#D4AF37] to-[#B88B2A] hover:brightness-105 shadow-xs transition-all cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero & Search Sandbox */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50 via-white to-white dark:from-[#070A12] dark:via-[#0B0F19] dark:to-[#0B0F19]">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#B88B2A]/10 border border-[#B88B2A]/30 text-[#B88B2A] text-xs font-extrabold uppercase tracking-wider">
            <BookOpen size={13} /> 3.8 Crore+ Judgments & Bare Acts Indexed
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Search Indian Law. <span className="text-[#B88B2A]">Understand the Reasoning.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Search propositions across the Supreme Court, all 25 High Courts, Bare Acts (BNS, BNSS, BSA, IPC, CrPC, Evidence Act, NI Act, Contract Act, IBC), and tribunals.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="relative flex items-center bg-white dark:bg-[#1E293B] border-2 border-slate-300 dark:border-slate-700 focus-within:border-[#B88B2A] rounded-2xl shadow-sm transition-all overflow-hidden p-1.5">
              <div className="pl-3 text-[#B88B2A]">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a legal proposition, citation or case facts... (e.g. Anticipatory bail in cheating when FIR delayed)"
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Query Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 text-[11px]">
              <span className="text-slate-400 font-bold">Try searching:</span>
              {[
                'Anticipatory bail delay',
                'Section 138 NI Act notice',
                'Section 65B certificate',
                'Specific performance readiness',
                'Arbitration jurisdiction'
              ].map((query, i) => (
                <button
                  key={i}
                  onClick={() => setSearchQuery(query)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filters Bar & Results Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Filters Row */}
        <div className="p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl mb-8 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-bold">
            <Filter size={15} className="text-[#B88B2A]" />
            <span>Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Court Filter */}
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              aria-label="Filter by Court"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-[#B88B2A]"
            >
              <option value="All">All Courts</option>
              <option value="Supreme Court">Supreme Court of India</option>
              <option value="High Court">High Courts</option>
            </select>

            {/* Statute Filter */}
            <select
              value={statuteFilter}
              onChange={(e) => setStatuteFilter(e.target.value)}
              aria-label="Filter by Statute"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-[#B88B2A]"
            >
              <option value="All">All Statutes (BNS, BNSS, BSA, IPC...)</option>
              <option value="BNSS">BNSS / CrPC</option>
              <option value="BNS">BNS / IPC</option>
              <option value="Evidence">BSA / Indian Evidence Act</option>
              <option value="Negotiable">Negotiable Instruments Act</option>
              <option value="Specific">Specific Relief Act</option>
              <option value="Arbitration">Arbitration & Conciliation Act</option>
            </select>

            {/* Bench Filter */}
            <select
              value={benchFilter}
              onChange={(e) => setBenchFilter(e.target.value)}
              aria-label="Filter by Bench"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-[#B88B2A]"
            >
              <option value="All">All Bench Strengths</option>
              <option value="3-Judge Bench">3-Judge Bench</option>
              <option value="2-Judge Bench">2-Judge Bench</option>
              <option value="Constitution Bench">Constitution Bench</option>
            </select>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter by Year"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-[#B88B2A]"
            >
              <option value="All">All Years</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2014">2014</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400 font-bold">
            Showing {filteredCases.length} authorities
          </div>
        </div>

        {/* Precedents Result Cards */}
        <div className="space-y-6">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                No indexed authorities match your current filter query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCourtFilter('All');
                  setStatuteFilter('All');
                  setBenchFilter('All');
                  setYearFilter('All');
                }}
                className="text-xs text-[#B88B2A] font-bold underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            filteredCases.map(item => (
              <div
                key={item.id}
                className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 hover:border-[#B88B2A]/60 shadow-xs hover:shadow-sm transition-all space-y-4"
              >
                {/* Header Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#B88B2A]">
                      {item.court} • {item.statute}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {item.citation} • {item.bench}
                    </p>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-block ${
                      item.statusColor === 'emerald'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Ratio Decidendi */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Ratio Decidendi:
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    &ldquo;{item.ratio}&rdquo;
                  </p>
                </div>

                {/* Key Legal Propositions */}
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Key Legal Propositions:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {item.propositions.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#B88B2A] font-bold">▪</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyRatio(item)}
                      className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === item.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy Ratio'}</span>
                    </button>

                    <button
                      onClick={() => handleActionClick('Add to Case Timeline', item)}
                      className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add to Case Timeline</span>
                    </button>

                    <button
                      onClick={() => handleActionClick('Insert in Draft Petition', item)}
                      className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSignature size={13} />
                      <span>Insert in Draft Petition</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (isAuthenticated) navigate('/dashboard/tools/legal-precedents');
                      else navigate('/login', { state: { from: '/dashboard/tools/legal-precedents' } });
                    }}
                    className="text-xs font-bold text-[#B88B2A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Shepardize Report</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Reusable Public Footer Matching Reference */}
      <div className="mt-12">
        <PublicFooter />
      </div>
    </div>
  );
}
