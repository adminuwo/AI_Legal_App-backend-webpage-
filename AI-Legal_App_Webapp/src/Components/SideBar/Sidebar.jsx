import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, Brain, Briefcase, Search, FileText, Library, 
  SearchCode, FileCheck, Gavel, Lightbulb, Scale, Calendar, 
  Users, Bell, User, Settings2, LogOut, ChevronRight, ChevronLeft, Binary,
  Sun, Moon, Globe, ChevronDown, Bookmark, HelpCircle, Download,
  CreditCard, Shield, Zap, GraduationCap, Building2, MessageSquare, BookOpen, Smartphone, X
} from 'lucide-react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { userData, selectedRoleState, clearUser } from '../../userStore/userData';
import { AppRoute } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ExperienceRoleSelector from '../ExperienceRoleSelector';
import { useSubscription } from '../../context/SubscriptionContext';
import { logo } from '../../constants';
import { isSuperAdmin } from '../../utils/isSuperAdmin';
import toast from 'react-hot-toast';

const CORE_VIEWS = [
  { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
  { name: 'AI Legal Assistant', icon: Scale, path: '/dashboard/chat/new' },
  { name: 'My Matters', icon: Briefcase, path: '/dashboard/cases' },
];

const AI_TOOLS = [
  { name: 'Legal Research', icon: Search, path: '/dashboard/tools/knowledge-hub' },
  { name: 'Legal Precedents', icon: Library, path: '/dashboard/tools/legal-precedents' },
  { name: 'Draft Maker', icon: FileText, path: '/dashboard/tools/draft-maker' },
  { name: 'Contract Analyzer', icon: FileCheck, path: '/dashboard/tools/contract-analyzer' },
  { name: 'Evidence Analyst', icon: Binary, path: '/dashboard/tools/evidence-analyst' },
  { name: 'Argument Builder', icon: Gavel, path: '/dashboard/tools/argument-builder' },
  { name: 'Case Predictor', icon: Scale, path: '/dashboard/tools/case-predictor' },
  { name: 'Strategy Engine', icon: Brain, path: '/dashboard/tools/strategy-engine' },
];

const Sidebar = ({ isOpen, onClose, onOpenSettings }) => {
  const { badge } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUserData, setUserRecoil] = useRecoilState(userData);
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
  const user = currentUserData.user || { name: "Advocate", email: "..." };

  // Collapse State
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // 4 Main Navigation Tabs (matching Mobile App)
  const coreNavigation = [
    { name: 'Home', icon: LayoutGrid, path: '/dashboard' },
    { name: selectedRole === 'law_firm' ? 'Firm Workspace' : 'My Matters', icon: Briefcase, path: '/dashboard/cases' },
    { 
      name: selectedRole === 'law_firm' ? 'AI Firm Assistant' : selectedRole === 'student' ? 'AI Legal Tutor' : 'AI Legal Assistant', 
      icon: selectedRole === 'student' ? GraduationCap : selectedRole === 'law_firm' ? Building2 : Scale, 
      path: '/dashboard/chat/new' 
    },
    { name: 'AI Tools', icon: Zap, path: '/dashboard/tools' },
    { name: 'Mobile App', icon: Smartphone, path: '/dashboard/mobile-app' },
  ];

  // Dynamic Role-Specific AI Tools
  const roleAiTools = selectedRole === 'student' ? [
    { name: 'Case Summarizer', icon: Search, path: '/dashboard/chat/new?tool=legal_research' },
    { name: 'Bare Act Tutor', icon: Library, path: '/dashboard/tools/legal-precedents' },
    { name: 'Moot Court Trainer', icon: Gavel, path: '/dashboard/tools/argument-builder' },
    { name: 'Essay & Draft Maker', icon: FileText, path: '/dashboard/tools/draft-maker' },
    { name: 'MCQ & Quiz Prep', icon: GraduationCap, path: '/dashboard/tools' },
  ] : selectedRole === 'law_firm' ? [
    { name: 'Firm Workspace', icon: Briefcase, path: '/dashboard/cases' },
    { name: 'AI Team Communication', icon: Users, path: '/dashboard/tools/client-connect' },
    { name: 'Contract Review', icon: FileCheck, path: '/dashboard/tools/contract-analyzer' },
    { name: 'Strategy Engine', icon: Brain, path: '/dashboard/tools/strategy-engine' },
    { name: 'Enterprise Toolkit', icon: Zap, path: '/dashboard/tools' },
  ] : [
    { name: 'Legal Research', icon: Search, path: '/dashboard/chat/new?tool=legal_research' },
    { name: 'Legal Precedents', icon: Library, path: '/dashboard/tools/legal-precedents' },
    { name: 'Draft Maker', icon: FileText, path: '/dashboard/tools/draft-maker' },
    { name: 'Contract Analyzer', icon: FileCheck, path: '/dashboard/tools/contract-analyzer' },
    { name: 'Evidence Analyst', icon: Binary, path: '/dashboard/tools/evidence-analyst' },
    { name: 'Argument Builder', icon: Gavel, path: '/dashboard/tools/argument-builder' },
    { name: 'Case Predictor', icon: Scale, path: '/dashboard/tools/case-predictor' },
    { name: 'Strategy Engine', icon: Brain, path: '/dashboard/tools/strategy-engine' },
    { name: 'AI Mock Courtroom', icon: Gavel, path: '/dashboard/tools/mock-courtroom' },
    { name: 'AI Client Connect', icon: MessageSquare, path: '/dashboard/tools/client-connect' },
  ];
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');
  const profileCardRef = useRef(null);
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    clearUser();
    setUserRecoil({ user: null });
    navigate(AppRoute.LOGIN);
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname + location.search === path;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileCardRef.current && !profileCardRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown && deviceType === 'desktop') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, deviceType]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const isToolDisabledByInstitution = (path) => {
    if (!path) return false;
    const rulesStr = localStorage.getItem('enterpriseFeatureAccessRules');
    if (!rulesStr) return false;
    try {
      const rules = JSON.parse(rulesStr);
      if (path.includes('evidence-analyst') && rules.evidenceAnalyst === false) return true;
      if (path.includes('case-predictor') && rules.casePredictor === false) return true;
      if (path.includes('contract-analyzer') && rules.contractAnalyzer === false) return true;
      if (path.includes('mock-courtroom') && rules.mockCourtroom === false) return true;
      if (path.includes('draft-maker') && rules.draftMaker === false) return true;
      if (path.includes('legal-precedents') && rules.legalResearch === false) return true;
      if (path.includes('strategy-engine') && rules.strategyEngine === false) return true;
    } catch (e) {}
    return false;
  };

  const renderLink = (item) => {
    const isLinkActive = isActive(item.path);
    const isDisabled = isToolDisabledByInstitution(item.path);

    if (isCollapsed) {
      return (
        <button
          key={item.name}
          title={isDisabled ? `🔒 Disabled by Institution Admin` : item.name}
          onClick={() => {
            if (isDisabled) {
              toast.error(`🔒 Access to "${item.name}" has been disabled by your Law College Administrator.`);
              return;
            }
            if (item.path.startsWith('/dashboard/chat/new')) {
              navigate(item.path, { state: { forceGlobal: true } });
            } else {
              navigate(item.path);
            }
            if (window.innerWidth < 1024) onClose();
          }}
          className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl mb-2 transition-all cursor-pointer ${
            isDisabled
              ? 'opacity-40 grayscale cursor-not-allowed text-slate-400'
              : isLinkActive
              ? 'bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/40 font-extrabold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {item.useLogoIcon ? (
            <img src="/logo/logo_gold_emblem.png" className="w-6 h-6 object-contain shrink-0" alt="AI LEGAL Emblem" />
          ) : (
            <item.icon className={`w-5 h-5 ${isLinkActive ? 'text-[#C8A34D]' : 'text-slate-400 dark:text-slate-400'}`} />
          )}
        </button>
      );
    }

    return (
      <button
        key={item.name}
        onClick={() => {
          if (isDisabled) {
            toast.error(`🔒 Access to "${item.name}" has been disabled by your Law College Administrator.`);
            return;
          }
          if (item.path.startsWith('/dashboard/chat/new')) {
            navigate(item.path, { state: { forceGlobal: true } });
          } else {
            navigate(item.path);
          }
          if (window.innerWidth < 1024) onClose();
        }}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl mb-1 transition-all cursor-pointer ${
          isDisabled
            ? 'opacity-40 grayscale cursor-not-allowed text-slate-400'
            : isLinkActive
            ? 'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 font-extrabold shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-semibold'
        }`}
      >
        <div className="flex items-center gap-3">
          <item.icon className={`w-4 h-4 ${isLinkActive ? 'text-[#C8A34D]' : 'text-slate-400'}`} />
          <span className="text-sm">{item.name}</span>
        </div>
        {isDisabled && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">🔒 Lock</span>}
      </button>
    );
  };

  const renderDropdownContent = () => {
    const profileLabel = selectedRole === 'student' 
      ? 'My Student Profile' 
      : selectedRole === 'law_firm' 
      ? 'Law Firm Profile' 
      : 'My Advocate Profile';

    const isAdminUser = isSuperAdmin(user);

    const menuItems = [
      { name: profileLabel, icon: User, action: 'profile' },
      { name: 'Settings', icon: Settings2, path: '/dashboard/settings' },
      { name: 'Pricing & Plans', icon: CreditCard, path: '/legal-pricing' },
      ...(isAdminUser ? [
        { name: 'AI Product Guide Knowledge', icon: BookOpen, path: '/dashboard/guide?mode=knowledge' },
        { name: 'Admin Portal', icon: Shield, path: '/dashboard/admin' }
      ] : []),
      { isDivider: true },
      { name: 'Logout', icon: LogOut, action: 'logout', danger: true },
    ];

    return (
      <div className="flex flex-col w-full font-sans select-none bg-white dark:bg-[#1E293B]">
        {/* User Identity Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-[#1E293B]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-[#C8A34D]/10 flex items-center justify-center shrink-0 overflow-hidden border border-[#C8A34D]/25">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }} />
              ) : (
                <span className="text-[#C8A34D] font-bold text-sm">{user.name?.charAt(0) || 'A'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-800 dark:text-white truncate leading-tight capitalize">{user.name || 'Advocate Profile'}</p>
              <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{user.email || 'Advocate Account'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/20 text-[9px] font-bold uppercase tracking-wider">
                {isAdminUser ? 'SUPER ADMIN' : selectedRole === 'student' ? 'Law Student' : selectedRole === 'law_firm' ? 'Law Firm Associate' : 'Advocate / Practitioner'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowDropdown(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Items List */}
        <div className="flex-1 py-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1E293B]">
          {menuItems.map((item, idx) => {
            if (item.isDivider) {
              return <div key={`div-${idx}`} className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1 mx-2" />;
            }

            const isItemDanger = item.danger;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setShowDropdown(false);
                  if (window.innerWidth < 1024) onClose();
                  if (item.action === 'profile') {
                    onOpenSettings('account');
                  } else if (item.action === 'logout') {
                    setShowLogoutConfirm(true);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                className={`w-full h-12 flex items-center justify-between px-4 rounded-xl transition-all text-left text-sm cursor-pointer ${
                  isItemDanger 
                    ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isItemDanger ? 'text-rose-400' : 'text-[#C8A34D]'}`} />
                  <span>{item.name}</span>
                </div>
                {!isItemDanger && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed lg:sticky top-0 left-0 h-[100dvh] ${isCollapsed ? 'w-20' : 'w-72'} bg-[#FFFFFF] dark:bg-[#0F172A] border-r border-[#E5E7EB] dark:border-slate-800 z-50 flex flex-col transition-all duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Brand Header */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'} border-b border-[#E5E7EB] dark:border-slate-800 shrink-0 transition-all`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-8 h-8 object-contain drop-shadow-xs" />
                <span className="text-xl font-black tracking-tight text-[#111827] dark:text-white">AI LEGAL<span className="text-[#C8A34D]">.</span></span>
              </div>
              <button
                onClick={toggleCollapse}
                title="Collapse Sidebar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#C8A34D] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={toggleCollapse}
                title="Expand Sidebar"
                className="w-12 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-[#C8A34D]/20 border border-slate-200 dark:border-slate-700 hover:border-[#C8A34D]/50 flex items-center justify-center gap-1 text-slate-700 dark:text-slate-200 hover:text-[#C8A34D] transition-all cursor-pointer shadow-xs"
              >
                <img src="/logo/logo_transparent.png" className="w-5 h-5 object-contain" alt="AI LEGAL Logo" />
                <ChevronRight className="w-3.5 h-3.5 text-[#C8A34D]" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Nav */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar py-3 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div className="mb-4">
            {coreNavigation.map(renderLink)}
          </div>
        </div>

        {/* Footer profile info (Clickable Card) */}
        <div ref={profileCardRef} className={`relative border-t border-[#E5E7EB] dark:border-slate-800 shrink-0 bg-[#F9FAFB] dark:bg-[#0F172A] ${isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-4 space-y-2'}`}>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</span>
              <ExperienceRoleSelector compact={true} />
            </div>
          )}
          
          {/* Dropdown for Desktop */}
          <AnimatePresence>
            {showDropdown && deviceType === 'desktop' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={`absolute bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-0.5 max-h-[70vh] overflow-hidden ${
                  isCollapsed ? 'bottom-2 left-16 w-72' : 'bottom-16 left-4 right-4'
                }`}
              >
                {renderDropdownContent()}
              </motion.div>
            )}
          </AnimatePresence>

          {!isCollapsed ? (
            <button 
              onClick={() => setShowDropdown(prev => !prev)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-[#1E293B] border border-transparent hover:border-[#E5E7EB] dark:hover:border-slate-800 transition-all duration-200 text-left select-none cursor-pointer"
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#C8A34D]/10 flex items-center justify-center shrink-0 overflow-hidden border border-[#C8A34D]/25">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }} />
                  ) : (
                    <span className="text-[#C8A34D] font-bold text-sm">{user.name?.charAt(0) || 'A'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-bold text-[#111827] dark:text-white truncate leading-tight capitalize">{user.name}</p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 shrink-0">
                      {isSuperAdmin(user) ? 'SUPER ADMIN' : badge === 'SUPER ADMIN' ? 'Free' : badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              onClick={() => setShowDropdown(prev => !prev)}
              title={user.name || "Advocate Account"}
              className="w-11 h-11 rounded-xl bg-[#C8A34D]/10 hover:bg-[#C8A34D]/20 border border-[#C8A34D]/30 flex items-center justify-center overflow-hidden transition-all cursor-pointer relative"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }} />
              ) : (
                <span className="text-[#C8A34D] font-black text-sm">{user.name?.charAt(0) || 'A'}</span>
              )}
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-[#C8A34D] ring-2 ring-white dark:ring-[#0F172A]" />
            </button>
          )}
        </div>
      </aside>

      {/* Popover for Tablet */}
      <AnimatePresence>
        {showDropdown && deviceType === 'tablet' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDropdown(false)}
              className="fixed inset-0 bg-slate-900/40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-[340px] bg-white rounded-2xl max-h-[80vh] overflow-hidden flex flex-col z-10 shadow-[0_12px_40px_rgba(0,0,0,0.1)] border border-slate-100 p-2"
            >
              {renderDropdownContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet for Mobile */}
      <AnimatePresence>
        {showDropdown && deviceType === 'mobile' && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDropdown(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full bg-white dark:bg-[#1E293B] rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col p-4 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.2)] border-t border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
              {renderDropdownContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-auto p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-6 z-10 text-center font-sans space-y-5"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <LogOut size={22} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Confirm Logout</h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2">
                  Are you sure you want to log out of your AI LEGAL account? This will end your active session.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    handleLogout();
                  }}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/10"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
