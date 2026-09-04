import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, Brain, Briefcase, Search, FileText, Library, 
  SearchCode, FileCheck, Gavel, Lightbulb, Scale, Calendar, 
  Users, Bell, User, Settings2, LogOut, ChevronRight, Binary,
  Sun, Moon, Globe, ChevronDown, Bookmark, HelpCircle, Download,
  CreditCard, Shield, Zap, GraduationCap, Building2
} from 'lucide-react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { userData, selectedRoleState } from '../../userStore/userData';
import { AppRoute } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import ExperienceRoleSelector from '../ExperienceRoleSelector';

const CORE_VIEWS = [
  { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
  { name: 'AI Legal Assistant', icon: Scale, path: '/dashboard/chat/new' },
  { name: 'My Matters', icon: Briefcase, path: '/dashboard/cases' },
];

const AI_TOOLS = [
  { name: 'Legal Research', icon: Search, path: '/dashboard/chat/new?tool=legal_research' },
  { name: 'Legal Precedents', icon: Library, path: '/dashboard/chat/new?tool=legal_precedents' },
  { name: 'Draft Maker', icon: FileText, path: '/dashboard/chat/new?tool=legal_draft_maker' },
  { name: 'Contract Analyzer', icon: FileCheck, path: '/dashboard/chat/new?tool=legal_contract_analyzer' },
  { name: 'Evidence Analyst', icon: Binary, path: '/dashboard/chat/new?tool=legal_evidence_checker' },
  { name: 'Argument Builder', icon: Gavel, path: '/dashboard/chat/new?tool=legal_argument_builder' },
  { name: 'Case Predictor', icon: Scale, path: '/dashboard/chat/new?tool=legal_case_predictor' },
  { name: 'Strategy Engine', icon: Brain, path: '/dashboard/chat/new?tool=legal_strategy_engine' },
  { name: 'Research Assistant', icon: Library, path: '/dashboard/chat/new?tool=legal_research_assistant' },
];

const Sidebar = ({ isOpen, onClose, onOpenSettings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUserData, setUserRecoil] = useRecoilState(userData);
  const selectedRole = useRecoilValue(selectedRoleState) || 'advocate';
  const user = currentUserData.user || { name: "Advocate", email: "..." };

  // 5 Main Navigation Tabs (matching Mobile App)
  const coreNavigation = [
    { name: 'Home', icon: LayoutGrid, path: '/dashboard' },
    { name: selectedRole === 'law_firm' ? 'Firm Workspace' : 'My Matters', icon: Briefcase, path: '/dashboard/cases' },
    { name: 'AI Legal Assistant', icon: Scale, path: '/dashboard/chat/new' },
    { name: 'AI Tools', icon: Zap, path: '/dashboard/tools' },
    { name: 'Profile & Settings', icon: User, path: '/dashboard/settings' },
  ];

  // Dynamic Role-Specific AI Tools
  const roleAiTools = selectedRole === 'student' ? [
    { name: 'Case Summarizer', icon: Search, path: '/dashboard/chat/new?tool=legal_research' },
    { name: 'Bare Act Tutor', icon: Library, path: '/dashboard/chat/new?tool=legal_precedents' },
    { name: 'Moot Court Trainer', icon: Gavel, path: '/dashboard/chat/new?tool=legal_argument_builder' },
    { name: 'Essay & Draft Maker', icon: FileText, path: '/dashboard/chat/new?tool=legal_draft_maker' },
    { name: 'MCQ & Quiz Prep', icon: GraduationCap, path: '/dashboard/tools' },
  ] : selectedRole === 'law_firm' ? [
    { name: 'Firm Workspace', icon: Building2, path: '/dashboard/cases' },
    { name: 'AI Client Connect', icon: Users, path: '/dashboard/chat/new?prompt=AI%20Client%20Connect' },
    { name: 'Contract Analyzer', icon: FileCheck, path: '/dashboard/chat/new?tool=legal_contract_analyzer' },
    { name: 'Strategy Engine', icon: Brain, path: '/dashboard/chat/new?tool=legal_strategy_engine' },
    { name: 'Enterprise Toolkit', icon: Zap, path: '/dashboard/tools' },
  ] : [
    { name: 'Legal Research', icon: Search, path: '/dashboard/chat/new?tool=legal_research' },
    { name: 'Legal Precedents', icon: Library, path: '/dashboard/chat/new?tool=legal_precedents' },
    { name: 'Draft Maker', icon: FileText, path: '/dashboard/chat/new?tool=legal_draft_maker' },
    { name: 'Contract Analyzer', icon: FileCheck, path: '/dashboard/chat/new?tool=legal_contract_analyzer' },
    { name: 'Evidence Analyst', icon: Binary, path: '/dashboard/chat/new?tool=legal_evidence_checker' },
    { name: 'Argument Builder', icon: Gavel, path: '/dashboard/chat/new?tool=legal_argument_builder' },
    { name: 'Case Predictor', icon: Scale, path: '/dashboard/chat/new?tool=legal_case_predictor' },
    { name: 'Strategy Engine', icon: Brain, path: '/dashboard/chat/new?tool=legal_strategy_engine' },
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
    localStorage.clear();
    setUserRecoil({ user: null });
    navigate(AppRoute.LANDING);
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

  const renderLink = (item) => (
    <button
      key={item.name}
      onClick={() => {
        if (item.path.startsWith('/dashboard/chat/new')) {
          navigate(item.path, { state: { forceGlobal: true } });
        } else {
          navigate(item.path);
        }
        if (window.innerWidth < 1024) onClose();
      }}
      className={`w-full flex items-center justify-between px-4 py-2 rounded-lg mb-0.5 transition-all ${
        isActive(item.path)
          ? 'bg-[#F3F6FF] text-[#6D5DFC] font-bold'
          : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] font-semibold'
      }`}
    >
      <div className="flex items-center gap-3">
        <item.icon className={`w-4 h-4 ${isActive(item.path) ? 'text-[#6D5DFC]' : 'text-[#9CA3AF]'}`} />
        <span className="text-sm">{item.name}</span>
      </div>
    </button>
  );

  const renderDropdownContent = () => {
    const menuItems = [
      { name: 'My Profile', icon: User, action: 'profile' },
      { name: 'Pricing & Plans', icon: CreditCard, path: '/legal-pricing' },
      { name: 'Admin Portal', icon: Shield, path: '/dashboard/admin' },
      { name: 'Settings', icon: Settings2, path: '/dashboard/settings' },
      { isDivider: true },
      { name: 'Help & Support', icon: HelpCircle, path: '/dashboard/help-support' },
      { name: 'Logout', icon: LogOut, action: 'logout', danger: true },
    ];

    return (
      <div className="flex flex-col w-full font-sans select-none bg-white">
        {/* User Identity Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="w-10 h-10 rounded-full bg-[#6D5DFC]/10 flex items-center justify-center shrink-0 overflow-hidden border border-[#6D5DFC]/20">
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }} />
            ) : (
              <span className="text-[#6D5DFC] font-bold text-sm">{user.name?.charAt(0) || 'A'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-800 truncate leading-tight capitalize">{user.name}</p>
            <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Action Items List */}
        <div className="flex-1 py-1 overflow-y-auto custom-scrollbar bg-white">
          {menuItems.map((item, idx) => {
            if (item.isDivider) {
              return <div key={`div-${idx}`} className="h-[1px] bg-slate-100 my-1 mx-2" />;
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
                className={`w-full h-12 flex items-center justify-between px-4 rounded-xl transition-all text-left text-sm ${
                  isItemDanger 
                    ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isItemDanger ? 'text-rose-400' : 'text-[#6D5DFC]'}`} />
                  <span>{item.name}</span>
                </div>
                {!isItemDanger && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 transition-colors" />
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
      <aside className={`fixed lg:sticky top-0 left-0 h-[100dvh] w-72 bg-[#FFFFFF] border-r border-[#E5E7EB] z-50 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <Scale className="w-7 h-7 text-[#6D5DFC]" strokeWidth={2.5} />
            <span className="text-xl font-black tracking-tight text-[#111827]">AI LEGAL<span className="text-[#6D5DFC]">.</span></span>
          </div>
        </div>

        {/* Global Legal Search */}
        <div className="px-4 pt-6 pb-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#6D5DFC] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Global Legal Search..."
              className="block w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] bg-[#F9FAFB] focus:bg-white transition-all shadow-sm"
              title="Search: Cases, Clients, Judgments, Research, Drafts, Documents, Evidence, Sections, Acts"
            />
          </div>
        </div>

        {/* Scrollable Nav */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-4">
          
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2 px-4">Navigation</h3>
            {coreNavigation.map(renderLink)}
          </div>

        </div>

        {/* Footer profile info (Clickable Card) */}
        <div ref={profileCardRef} className="relative p-4 border-t border-[#E5E7EB] shrink-0 bg-[#F9FAFB] space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</span>
            <ExperienceRoleSelector compact={true} />
          </div>
          
          {/* Dropdown for Desktop */}
          <AnimatePresence>
            {showDropdown && deviceType === 'desktop' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute bottom-16 left-4 right-4 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] z-50 p-2 flex flex-col gap-0.5 max-h-[70vh] overflow-hidden"
              >
                {renderDropdownContent()}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowDropdown(prev => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white border border-transparent hover:border-[#E5E7EB] transition-all duration-200 text-left select-none cursor-pointer"
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#6D5DFC]/10 flex items-center justify-center shrink-0 overflow-hidden border border-[#6D5DFC]/20">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }} />
                ) : (
                  <span className="text-[#6D5DFC] font-bold text-sm">{user.name?.charAt(0) || 'A'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#111827] truncate leading-tight capitalize">{user.name}</p>
                <p className="text-xs text-[#6B7280] truncate mt-0.5">{user.email}</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
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
              className="relative w-full bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-slate-100"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />
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
