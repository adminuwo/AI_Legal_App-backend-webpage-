import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, Filter, Bookmark, Plus, ArrowRight, RotateCcw, 
  Landmark, Scale, BookOpen, Layers, Menu, X, ArrowUp, CheckCircle2 
} from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter from '../Components/PublicFooter';
import OurProductsDropdown from '../Components/OurProductsDropdown';
import SearchModeSelector from '../Components/CaseSearch/SearchModeSelector';
import LegalSourceSelector from '../Components/CaseSearch/LegalSourceSelector';
import AdvancedFiltersModal from '../Components/CaseSearch/AdvancedFiltersModal';
import SearchResultCard from '../Components/CaseSearch/SearchResultCard';
import JudgmentReader from '../Components/CaseSearch/JudgmentReader';
import AddToCaseModal from '../Components/CaseSearch/AddToCaseModal';
import SavedResearchDrawer from '../Components/CaseSearch/SavedResearchDrawer';
import ActiveCaseDossierCard from '../Components/CaseSearch/ActiveCaseDossierCard';
import CaseDossierModal from '../Components/CaseSearch/CaseDossierModal';

import caseSearchService from '../services/caseSearchService';
import { POPULAR_SEARCH_CHIPS, INDIAN_COURTS } from '../data/indianCourtsData';
import { getUserData } from '../userStore/userData';

export default function PublicCaseSearchWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchState = location.state;

  // Authentication status
  const token = localStorage.getItem('token');
  const user = getUserData();
  const isAuthenticated = Boolean((token && token !== 'undefined') || (user?.token && user.token !== 'undefined'));

  // Search Core State
  const [searchQuery, setSearchQuery] = useState(searchState?.searchQuery || searchParams.get('q') || '');
  const [activeMode, setActiveMode] = useState(searchState?.activeMode || 'AI'); // 'AI' | 'CASE' | 'CITATION' | 'ACT' | 'PARTY' | 'JUDGE'
  const [activeSource, setActiveSource] = useState(searchState?.activeSource || 'ALL'); // 'ALL' | 'SC' | 'HC' | 'ACTS'
  const [selectedHighCourt, setSelectedHighCourt] = useState(searchState?.selectedHighCourt || 'all');
  
  // Advanced Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(searchState?.filters || {
    court: 'all',
    year: 'all',
    caseType: 'All Types',
    act: '',
    section: '',
    judge: '',
    citation: '',
    party: ''
  });

  // Sorting
  const [sortBy, setSortBy] = useState(searchState?.sortBy || 'relevance'); // 'relevance' | 'newest' | 'oldest' | 'court'

  // Results & Loading State
  const [results, setResults] = useState([]);
  const [activeCaseResult, setActiveCaseResult] = useState(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [partyResults, setPartyResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Active Judgment Reader
  const [selectedJudgment, setSelectedJudgment] = useState(null);

  // Modals & Drawers
  const [isAddToCaseOpen, setIsAddToCaseOpen] = useState(false);
  const [judgmentToAdd, setJudgmentToAdd] = useState(null);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Bookmarks tracked in state for reactive updates
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  // Sync bookmarks list on mount
  useEffect(() => {
    const list = caseSearchService.getSavedJudgments();
    setBookmarkedIds(list.map(j => j.id));
  }, []);

  // Set document title for SEO
  useEffect(() => {
    document.title = 'AI Legal™ Case Search — Indian Judgments & Legal Research';
  }, []);

  // Handle protected actions (e.g. Dashboard)
  const handleProtectedAction = (destination) => {
    if (isAuthenticated) {
      navigate(destination);
    } else {
      navigate('/login', { state: { from: destination } });
    }
  };

  // Perform Search Action
  const executeSearch = async (overrideQuery = null, overrideSource = null, overrideCourt = null) => {
    const queryToUse = overrideQuery !== null ? overrideQuery : searchQuery;
    const sourceToUse = overrideSource !== null ? overrideSource : activeSource;
    const courtToUse = overrideCourt !== null ? overrideCourt : selectedHighCourt;

    setIsSearching(true);
    setHasSearched(true);
    setSelectedJudgment(null);
    setActiveCaseResult(null);
    setPartyResults([]);

    const cleanTrimmed = (queryToUse || '').trim();
    const sanitizedCnr = cleanTrimmed.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const isCnrPattern = /^[A-Z0-9]{16}$/.test(sanitizedCnr);

    try {
      // 1. If CNR pattern detected OR explicitly Case Search with 16 chars: lookup active eCourts case
      if (isCnrPattern || (activeMode === 'CASE' && sanitizedCnr.length === 16)) {
        try {
          const cnrData = await caseSearchService.searchActiveCaseByCnr(sanitizedCnr);
          if (cnrData) {
            setActiveCaseResult(cnrData);
            toast.success(`Active case records retrieved from ${cnrData.court_name || 'eCourts'}`);
          }
        } catch (cnrErr) {
          console.warn('CNR lookup notice:', cnrErr.message);
        }
      }

      // 2. If Party Search mode: query active cases by party
      if (activeMode === 'PARTY') {
        try {
          const partyCases = await caseSearchService.searchActiveCasesByParty(cleanTrimmed);
          if (partyCases && partyCases.length > 0) {
            setPartyResults(partyCases);
          }
        } catch (partyErr) {
          console.warn('Party search notice:', partyErr.message);
        }
      }

      // 3. Search judgments & precedents (Indian Kanoon + Gemini Google Grounding)
      const searchRes = await caseSearchService.searchJudgments({
        query: queryToUse,
        mode: activeMode,
        source: sourceToUse,
        selectedCourt: courtToUse,
        filters
      });

      setResults(searchRes);
      if (searchRes.length > 0) {
        toast.success(`Found ${searchRes.length} relevant judgments & precedents.`);
      }
    } catch (e) {
      console.error('Search failed:', e);
      toast.error('Search encountered an issue. Showing indexed landmark authorities.');
    } finally {
      setIsSearching(false);
    }
  };

  // Initial load if query in URL or returning from judgment detail
  useEffect(() => {
    if (searchState?.initialQuery) {
      setSearchQuery(searchState.initialQuery);
      executeSearch(searchState.initialQuery);
    } else if (searchState?.searchQuery) {
      executeSearch(searchState.searchQuery, searchState.activeSource, searchState.selectedHighCourt);
    } else {
      const initialQ = searchParams.get('q');
      if (initialQ && !hasSearched) {
        executeSearch(initialQ);
      }
    }
  }, [searchParams, location.state]);

  // Handle Filter Change
  const handleChangeFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      court: 'all',
      year: 'all',
      caseType: 'All Types',
      act: '',
      section: '',
      judge: '',
      citation: '',
      party: ''
    });
    toast.success('Filters reset to default');
  };

  // Handle Bookmark Toggle
  const handleToggleBookmark = (judgment) => {
    const { isBookmarked } = caseSearchService.toggleBookmark(judgment);
    if (isBookmarked) {
      setBookmarkedIds(prev => [...prev, judgment.id]);
      toast.success('Judgment saved to your bookmarks! 🔖');
    } else {
      setBookmarkedIds(prev => prev.filter(id => id !== judgment.id));
      toast('Removed from saved bookmarks');
    }
  };

  // Handle Add To Case
  const handleOpenAddToCase = (judgment) => {
    if (!isAuthenticated) {
      toast('Please sign in to attach judgments to your Case Workspace.', { icon: '🔒' });
      navigate('/login', { state: { from: '/case-search' } });
      return;
    }
    setJudgmentToAdd(judgment);
    setIsAddToCaseOpen(true);
  };

  // Filter & Sort Results
  const sortedResults = useMemo(() => {
    let list = [...results];
    if (sortBy === 'relevance') {
      list.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => parseInt(a.year || 0) - parseInt(b.year || 0));
    } else if (sortBy === 'court') {
      list.sort((a, b) => (a.court || '').localeCompare(b.court || ''));
    }
    return list;
  }, [results, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.court !== 'all') count++;
    if (filters.year !== 'all') count++;
    if (filters.caseType !== 'All Types') count++;
    if (filters.act) count++;
    if (filters.section) count++;
    if (filters.judge) count++;
    if (filters.citation) count++;
    if (filters.party) count++;
    return count;
  }, [filters]);

  // Direct handler to navigate to dedicated /judgment/:id workspace
  const handleReadJudgment = (j) => {
    if (!j) return;
    const targetId = j.id || j.slug || (j.ikDocId ? `ik_${j.ikDocId}` : 'sc_landmark_kesavananda');
    navigate(`/judgment/${targetId}`, {
      state: {
        judgment: j,
        searchQuery,
        activeMode,
        activeSource,
        selectedHighCourt,
        filters,
        sortBy
      }
    });
  };

  // When a judgment is selected from state/drawer, navigate to the dedicated /judgment/:id route
  useEffect(() => {
    if (selectedJudgment) {
      handleReadJudgment(selectedJudgment);
      setSelectedJudgment(null);
    }
  }, [selectedJudgment]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 font-sans selection:bg-[#B88B2A]/25 selection:text-[#111111]">
      
      {/* ─── PUBLIC TOP HEADER NAVBAR (Consistent across all pages) ─── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo */}
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none">
            <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-9 h-9 object-contain" />
            <span className="text-lg font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
              AI LEGAL<span className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
            
            {/* Active Case Search Pill */}
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#B88B2A]/15 text-[#B38628] dark:bg-amber-950/60 dark:text-amber-300 shadow-2xs">
              Case Search
            </span>

            <button onClick={() => navigate('/about')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              About
            </button>
            <OurProductsDropdown />
            <button onClick={() => handleProtectedAction('/dashboard')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Dashboard
            </button>
          </nav>

          {/* Desktop Right Header Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />

            {/* Post Judgement Shortcut */}
            <button
              onClick={() => navigate('/post-judgment')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#B88B2A]/50 bg-amber-50/50 text-[#B38628] hover:bg-amber-100/60 dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-300 dark:hover:bg-amber-950/70 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} className="text-[#B38628] stroke-[2.5]" />
              <span>Post your judgement</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#B88B2A]/30"
                >
                  Dashboard →
                </button>
                <div 
                  onClick={() => navigate('/dashboard/settings')}
                  className="w-7.5 h-7.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-[#B88B2A]/40 text-[#B38628] dark:text-amber-400 font-bold text-xs flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  title={user?.name || 'Profile'}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#B88B2A]/30"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Header Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B0F19] px-4 py-3 space-y-2">
            <button onClick={() => { setMobileMenuOpen(false); navigate('/'); }} className="w-full text-left py-2 text-xs font-bold">Home</button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/features'); }} className="w-full text-left py-2 text-xs font-bold">Features</button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/blog'); }} className="w-full text-left py-2 text-xs font-bold">Blog</button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/pricing'); }} className="w-full text-left py-2 text-xs font-bold">Pricing</button>
            <button onClick={() => { setMobileMenuOpen(false); }} className="w-full text-left py-2 text-xs font-bold text-[#B38628]">Case Search (Active)</button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/about'); }} className="w-full text-left py-2 text-xs font-bold">About</button>
            <OurProductsDropdown isMobile={true} onItemClick={() => setMobileMenuOpen(false)} />
            <button onClick={() => { setMobileMenuOpen(false); handleProtectedAction('/dashboard'); }} className="w-full text-left py-2 text-xs font-bold">Dashboard</button>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/post-judgment');
                }}
                className="w-full py-2.5 rounded-full text-xs font-bold border border-[#B88B2A]/50 bg-amber-50/50 text-[#B38628] flex items-center justify-center gap-1.5"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Post your judgement</span>
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] text-center"
                >
                  Dashboard →
                </button>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                  className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#B88B2A] to-[#B38628] text-center"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─── MAIN HERO & SEARCH INTERFACE (Compact) ─── */}
      <section className="relative pt-6 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 via-white to-white dark:from-[#080C14] dark:via-[#0B0F19] dark:to-[#0B0F19]">
        <div className="max-w-4xl mx-auto text-center space-y-2.5">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#B88B2A]/10 border border-[#B88B2A]/30 text-[#B38628] dark:text-[#E5A93C] text-[11px] font-extrabold uppercase tracking-wider shadow-2xs">
            <Sparkles size={12} />
            <span>AI LEGAL™ Case Search</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight">
            LEGAL RESEARCH, <span className="text-[#B38628] dark:text-[#E5A93C]">REIMAGINED</span>
          </h1>

          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-normal">
            Search Indian Judgments & Laws. Ask a legal question in natural language or search by case name, citation, section or keyword.
          </p>

          {/* Search Mode Selector (Section 6) */}
          <div className="pt-1">
            <SearchModeSelector
              activeMode={activeMode}
              onSelectMode={(mode) => setActiveMode(mode)}
            />
          </div>

          {/* Search Input Box */}
          <div className="pt-1 max-w-3xl mx-auto">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch();
              }}
              className="relative flex items-center bg-white dark:bg-[#111622] rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus-within:border-[#B88B2A] shadow-md hover:shadow-lg transition-all p-1 sm:p-1.5"
            >
              <div className="pl-3 pr-2 text-slate-400">
                <Search size={18} className="text-[#B88B2A]" />
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeMode === 'AI' ? 'Search judgments e.g. "maintenance rights of divorced Muslim woman", "anticipatory bail under PMLA"...' :
                  activeMode === 'CITATION' ? 'Enter citation (e.g. (2001) 7 SCC 740, (2017) 10 SCC 1, 2024 INSC 123)...' :
                  activeMode === 'ACT' ? 'Search by Act or Section (e.g. Section 125 CrPC, Section 438 CrPC, Section 138 NI Act)...' :
                  activeMode === 'PARTY' ? 'Search by Petitioner or Respondent name (e.g. Danial Latifi, Maneka Gandhi, D.K. Basu)...' :
                  activeMode === 'JUDGE' ? "Search by Hon'ble Judge name (e.g. Justice G.B. Pattanaik, Justice Chandrachud)..." :
                  'Search Indian judgments, precedents, and statutes...'
                }
                className="flex-1 bg-transparent py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-medium min-w-0"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X size={15} />
                </button>
              )}

              {/* Primary Search Button */}
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#E5A93C] to-[#B38628] hover:opacity-95 text-slate-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shrink-0 disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <Sparkles size={14} className="animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Legal Source Selector & Advanced Filters (Unified 1-Row) */}
          <div className="pt-1 max-w-3xl mx-auto">
            <LegalSourceSelector
              activeSource={activeSource}
              onSelectSource={(src) => {
                setActiveSource(src);
                executeSearch(null, src);
              }}
              selectedHighCourt={selectedHighCourt}
              onSelectHighCourt={(hc) => {
                setSelectedHighCourt(hc);
                executeSearch(null, 'HC', hc);
              }}
              isFilterOpen={isFilterOpen}
              onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
              activeFiltersCount={activeFiltersCount}
            />
          </div>

          {/* Advanced Filters Drawer Component */}
          <div className="max-w-4xl mx-auto">
            <AdvancedFiltersModal
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              filters={filters}
              onChangeFilter={handleChangeFilter}
              onResetFilters={handleResetFilters}
              onApplyFilters={() => {
                setIsFilterOpen(false);
                executeSearch();
              }}
              totalResultsCount={results.length}
            />
          </div>

        </div>
      </section>

      {/* ─── CONTENT AREA: EMPTY STATE / LOADING / RESULTS / READER ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* STATE 0: IN-SCREEN JUDGMENT READER & AI ANALYSIS */}
        {selectedJudgment ? (
          <div className="mb-8">
            <JudgmentReader
              judgment={selectedJudgment}
              onBack={() => setSelectedJudgment(null)}
              onAddToCase={handleOpenAddToCase}
              isBookmarked={bookmarkedIds.includes(selectedJudgment.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          </div>
        ) : (
          <>
            {/* STATE 1: INITIAL EMPTY STATE (Section 11) */}
            {!hasSearched && !isSearching && (
          <div className="max-w-3xl mx-auto space-y-8 py-4">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#B88B2A]/15 text-[#B38628] flex items-center justify-center mx-auto shadow-xs">
                <Landmark size={24} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Search Across 75+ Years of Indian Jurisprudence
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Explore binding ratio decidendi, key statutory provisions, and courtroom takeaways.
              </p>
            </div>

            {/* Popular Search Chips */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">
                Popular Legal Inquiries:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {POPULAR_SEARCH_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(chip);
                      executeSearch(chip);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-[#B38628] dark:hover:bg-amber-950/40 dark:hover:text-amber-300 border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Search size={12} className="text-slate-400" />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Landmark Categories Preview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div 
                onClick={() => {
                  setSearchQuery('Anticipatory bail');
                  executeSearch('Anticipatory bail');
                }}
                className="p-5 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800 hover:border-[#B88B2A]/60 transition-all cursor-pointer group shadow-xs space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#B88B2A] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Criminal & Bail</h3>
                <p className="text-[11px] text-slate-500">
                  Anticipatory bail, Section 482 quashing, BNS & BNSS landmark rulings.
                </p>
              </div>

              <div 
                onClick={() => {
                  setSearchQuery('Section 138 NI Act presumption');
                  executeSearch('Section 138 NI Act presumption');
                }}
                className="p-5 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800 hover:border-[#B88B2A]/60 transition-all cursor-pointer group shadow-xs space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#B88B2A] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Commercial & NI Act</h3>
                <p className="text-[11px] text-slate-500">
                  Cheque bounce, limitation period, blank cheques, and corporate liability.
                </p>
              </div>

              <div 
                onClick={() => {
                  setSearchQuery('Fundamental rights Article 21');
                  executeSearch('Fundamental rights Article 21');
                }}
                className="p-5 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800 hover:border-[#B88B2A]/60 transition-all cursor-pointer group shadow-xs space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#B88B2A] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Landmark size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Constitutional Law</h3>
                <p className="text-[11px] text-slate-500">
                  Basic structure doctrine, Article 21 privacy, natural justice & judicial review.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* STATE 2: LOADING SKELETONS (Section 12) */}
        {isSearching && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-[#B38628] dark:text-amber-300">
              <Sparkles size={16} className="animate-spin text-[#B88B2A]" />
              <div className="space-y-0.5">
                <span className="font-bold block">AI LEGAL™ is researching...</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Understanding legal intent • Matching statutes & citations • Ranking authorities
                </span>
              </div>
            </div>

            {/* Skeleton Cards */}
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                <div className="flex gap-2">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATE 3: SEARCH RESULTS WORKSPACE */}
        {hasSearched && !isSearching && (results.length > 0 || activeCaseResult || partyResults.length > 0) && (
          <div className="space-y-6">

            {/* LIVE ACTIVE ECOURTS CASE DOSSIER */}
            {activeCaseResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <Landmark size={13} />
                    <span>Live Court Registry Match (eCourts)</span>
                  </span>
                </div>
                <ActiveCaseDossierCard
                  activeCase={activeCaseResult}
                  onAddToCase={handleOpenAddToCase}
                  onOpenDossier={() => setIsDossierModalOpen(true)}
                />
              </div>
            )}

            {/* PARTY SEARCH RESULTS */}
            {partyResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Scale size={14} className="text-[#B88B2A]" />
                  <span>Matching Active Cases for Party ({partyResults.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partyResults.map((pCase, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (pCase.cnr_number) {
                          setSearchQuery(pCase.cnr_number);
                          executeSearch(pCase.cnr_number);
                        }
                      }}
                      className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-[#B88B2A]/60 transition-all cursor-pointer space-y-2 shadow-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#B38628]">CNR: {pCase.cnr_number || 'N/A'}</span>
                        <span className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Active</span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#B38628] transition-colors">
                        {pCase.case_title || `${pCase.parties?.petitioner || 'Petitioner'} vs ${pCase.parties?.respondent || 'Respondent'}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {pCase.court_name || 'District / High Court'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Results Header with Query Summary and Sort Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">
                  Legal Precedents & Judgments for:
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {searchQuery ? `"${searchQuery}"` : 'All Jurisprudential Authorities'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#B88B2A]/15 text-[#B38628] dark:text-amber-400 border border-[#B88B2A]/30">
                    {results.length} Relevant Authorities
                  </span>
                </div>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sort By:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#B88B2A] cursor-pointer"
                >
                  <option value="relevance">Highest Relevance</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="court">Court Hierarchy</option>
                </select>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 gap-5">
              {sortedResults.map(judgment => (
                <SearchResultCard
                  key={judgment.id}
                  judgment={judgment}
                  onReadJudgment={handleReadJudgment}
                  isBookmarked={bookmarkedIds.includes(judgment.id)}
                  onToggleBookmark={handleToggleBookmark}
                  onAddToCase={handleOpenAddToCase}
                />
              ))}
            </div>

          </div>
        )}

        {/* STATE 4: NO RESULTS FOUND (Section 13) */}
        {hasSearched && !isSearching && results.length === 0 && !activeCaseResult && partyResults.length === 0 && (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Scale size={28} />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              No Relevant Judgments Found
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find matches for <span className="font-bold text-slate-700 dark:text-slate-300">"{searchQuery}"</span> under current filters. Try broader legal keywords, clearing specific date filters, or searching directly by Act and section.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                onClick={() => executeSearch('')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] dark:bg-white text-white dark:text-slate-950 hover:opacity-90 cursor-pointer"
              >
                Show All Landmark Rulings
              </button>
            </div>
          </div>
        )}

          </>
        )}

      </main>

      {/* ─── ADD TO CASE MODAL ─── */}
      <AddToCaseModal
        isOpen={isAddToCaseOpen}
        onClose={() => setIsAddToCaseOpen(false)}
        judgment={judgmentToAdd}
      />

      {/* ─── IN-SCREEN CASE DOSSIER & COURT ORDER PDF VIEWER ─── */}
      <CaseDossierModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        activeCase={activeCaseResult}
        onAddToCase={handleOpenAddToCase}
      />

      {/* ─── SAVED BOOKMARKS & HISTORY DRAWER ─── */}
      <SavedResearchDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        onSelectJudgment={handleReadJudgment}
        onSelectSearchQuery={(q) => {
          setSearchQuery(q);
          executeSearch(q);
        }}
      />

      {/* ─── STANDARDIZED PUBLIC FOOTER (Consistent on all public pages) ─── */}
      <PublicFooter />

    </div>
  );
}
