import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Outlet, Navigate, BrowserRouter, useNavigate, useLocation, Link } from 'react-router-dom';

import Landing from './landingpage/Landing';
import SplashScreen from './pages/SplashScreen';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerificationForm from './pages/VerificationForm';
import Sidebar from './Components/SideBar/Sidebar.jsx';
import Pricing from './landingpage/Pricing';
import CreditUpsellPopup from './Components/CreditUpsellPopup';
import SharedChat from './pages/SharedChat';




import { AppRoute, apis } from './types';
import { Menu, Bell, Sun, Moon, LogIn, User, Gavel, Scale } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { toggleState, getUserData, clearUser, activeModeData, activeLegalToolData, legalViewData, userData, setUserData } from './userStore/userData';
import axios from 'axios';
import { usePersonalization } from './context/PersonalizationContext';
import NotificationCenter from './Components/NotificationBar/NotificationCenter.jsx';
import ProfileSettingsDropdown from './Components/ProfileSettingsDropdown/ProfileSettingsDropdown.jsx';

import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import PrivacyPolicy from './landingpage/PrivacyPolicy.jsx';
import TermsOfService from './landingpage/TermsOfService.jsx';
import CookiePolicy from './landingpage/CookiePolicy.jsx';
import LegalPricingPortal from './pages/LegalPricingPortal.jsx';
import EnterprisePage from './pages/EnterprisePage.jsx';

import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import CookieConsentBanner from './landingpage/CookieConsentBanner';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import SubscriptionUpgradeModal from './Components/SubscriptionUpgradeModal';
const AiBase = lazy(() => import('./Tools/AI_Base/AI_Base').catch(() => ({ default: () => <div className="flex h-full items-center justify-center text-subtext">AI Base Module not found.</div> })));

// Vendor Imports Removed
// import VendorLayout from './Components/Vendor/VendorLayout';
// import VendorOverview from './pages/Vendor/VendorOverview';
// ...

const SecurityAndGuidelines = lazy(() => import('./landingpage/SecurityAndGuidelines'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const LegalWorkspace = lazy(() => import('./pages/Workspace/LegalWorkspace'));
const HomeDashboard = lazy(() => import('./pages/HomeDashboard'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const HelpSupport = lazy(() => import('./pages/HelpSupport'));
const AiToolsPage = lazy(() => import('./pages/AiToolsPage'));
const ProductGuideWorkspace = lazy(() => import('./pages/Workspace/ProductGuideWorkspace'));
const KnowledgeHubWorkspace = lazy(() => import('./pages/Workspace/KnowledgeHubWorkspace'));
const DraftMakerWorkspace = lazy(() => import('./pages/DraftMakerWorkspace'));
const ArgumentBuilderWorkspace = lazy(() => import('./pages/ArgumentBuilderWorkspace'));
const LegalPrecedentsWorkspace = lazy(() => import('./pages/LegalPrecedentsWorkspace'));
const EvidenceAnalystWorkspace = lazy(() => import('./pages/EvidenceAnalystWorkspace'));
const ContractAnalyzerWorkspace = lazy(() => import('./pages/ContractAnalyzerWorkspace'));
const CasePredictorWorkspace = lazy(() => import('./pages/CasePredictorWorkspace'));
const StrategyEngineWorkspace = lazy(() => import('./pages/StrategyEngineWorkspace'));
const MockCourtroomWorkspace = lazy(() => import('./pages/MockCourtroomWorkspace'));
const ClientConnectWorkspace = lazy(() => import('./pages/ClientConnectWorkspace'));
const QuizPracticeWorkspace = lazy(() => import('./pages/QuizPracticeWorkspace'));
const NotesMakerWorkspace = lazy(() => import('./pages/NotesMakerWorkspace'));
const MobileAppPage = lazy(() => import('./pages/MobileAppPage'));

const EnterpriseSetupPage = lazy(() => import('./pages/Enterprise/EnterpriseSetupPage'));
const EnterpriseDashboardLayout = lazy(() => import('./pages/Enterprise/EnterpriseDashboardLayout'));
const EnterpriseOverview = lazy(() => import('./pages/Enterprise/EnterpriseOverview'));
const EnterpriseStudents = lazy(() => import('./pages/Enterprise/EnterpriseStudents'));
const EnterpriseFaculty = lazy(() => import('./pages/Enterprise/EnterpriseFaculty'));
const EnterpriseAcademic = lazy(() => import('./pages/Enterprise/EnterpriseAcademic'));
const EnterpriseCurriculum = lazy(() => import('./pages/Enterprise/EnterpriseCurriculum'));
const EnterpriseFeatureAccess = lazy(() => import('./pages/Enterprise/EnterpriseFeatureAccess'));
const EnterpriseUsageCredits = lazy(() => import('./pages/Enterprise/EnterpriseUsageCredits'));
const EnterpriseAnalytics = lazy(() => import('./pages/Enterprise/EnterpriseAnalytics'));
const EnterpriseAnnouncements = lazy(() => import('./pages/Enterprise/EnterpriseAnnouncements'));
const EnterpriseAddons = lazy(() => import('./pages/Enterprise/EnterpriseAddons'));
const EnterpriseReports = lazy(() => import('./pages/Enterprise/EnterpriseReports'));
const EnterpriseSettings = lazy(() => import('./pages/Enterprise/EnterpriseSettings'));

const isAuthenticated = () => {
  const tokenStr = localStorage.getItem('token');
  const userToken = getUserData()?.token;
  return !!tokenStr && tokenStr !== 'undefined' && tokenStr !== 'null' && 
         !!userToken && userToken !== 'undefined' && userToken !== 'null';
};

// ------------------------------
// Home Redirect Component
// ------------------------------
// Redirects unauthenticated users directly to /onboarding without delay.
const HomeRedirect = () => {
  const hasToken = isAuthenticated();

  if (hasToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const onboardingDone = localStorage.getItem('ai_legal_onboarding_completed');
  if (onboardingDone) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/onboarding" replace />;
};

// ------------------------------
// Guest Route Component
// ------------------------------
// Protects login/signup pages - redirects authenticated users to chat
const GuestRoute = ({ children }) => {
  const hasToken = isAuthenticated();

  if (hasToken) {
    return <Navigate to="/dashboard/chat/new" replace state={{ forceGlobal: true }} />;
  }

  // Otherwise, allow access to login/signup page
  return children;
};

const AuthenticatRoute = ({ children }) => {
  return children;
}

// ------------------------------
// Dashboard Layout (Auth pages)
// ------------------------------

const MobileNotificationBell = ({ onClick }) => {
  const { notifications } = usePersonalization();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/20 text-primary"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white dark:border-black animate-bounce">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// ─── SCROLL SHOW/HIDE LOGIC (PERMANENTLY VISIBLE HEADER) ───
const useScrollNavbar = () => {
  return true;
};

const DashboardLayout = () => {
  const { isUpgradeModalOpen, closeUpgradeModal, upgradeModalData } = useSubscription();
  const [tglState, setTglState] = useRecoilState(toggleState);
  const isSidebarOpen = tglState.sidebarOpen;
  const setIsSidebarOpen = (val) => setTglState(prev => ({ ...prev, sidebarOpen: val }));

  const location = useLocation();
  const isFullScreen = false;

  const currentUserData = useRecoilValue(userData);
  // Re-evaluate user and token based on Recoil state changes or fallback to localStorage
  const user = currentUserData?.user || getUserData() || { name: 'Guest' };
  const token = currentUserData?.user?.token || getUserData()?.token;
  
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [profileMenuTab, setProfileMenuTab] = useState(null);
  const currentMode = useRecoilValue(activeModeData);
  const selectedLegalTool = useRecoilValue(activeLegalToolData);
  const legalView = useRecoilValue(legalViewData);
  const isMobile = window.innerWidth < 768;
  const searchParams = new URLSearchParams(location.search);
  const tool = searchParams.get("tool");
  const hideNavbarTools = ["legal_my_case", "legal_precedents", "my-case", "legal-precedents"];

  // Jaha navbar NAHI chahiye
  const isHiddenTool =
    currentMode === 'LEGAL_TOOLKIT' ||
    hideNavbarTools.includes(tool) ||
    location.pathname === '/dashboard/cases';

  // Navbar is hidden if it's a restricted tool view, regardless of device.
  const allowNavbar = !isHiddenTool;

  const showOnScroll = useScrollNavbar();

  const mainRef = useRef(null);

  // Scroll main container to top on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Listen for sidebar toggle events from workspace sub-components
  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    const handleOpen = () => setIsSidebarOpen(true);
    window.addEventListener('open_sidebar', handleOpen);
    window.addEventListener('toggle_sidebar', handleToggle);
    return () => {
      window.removeEventListener('open_sidebar', handleOpen);
      window.removeEventListener('toggle_sidebar', handleToggle);
    };
  }, []);

  // Sync CSS variable for child pages top-padding
  useEffect(() => {
    // Keep padding constant to prevent layout shifts/flickering. The navbar will slide out of view smoothly via CSS translate, but the content shouldn't abruptly jump up.
    const hValue = allowNavbar ? '64px' : '0px';
    document.documentElement.style.setProperty('--mobile-nav-h', hValue);
  }, [allowNavbar]);

  return (
    <div
      id="aisa-app-root"
      className="fixed inset-0 flex bg-transparent text-maintext overflow-hidden aisa-scalable-text"
      style={{ height: 'var(--real-vh, 100dvh)', maxHeight: 'var(--real-vh, 100dvh)' }}
    >
      {/* ─── Animated Atmospheric Background ─── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-white dark:opacity-0 transition-opacity duration-500" />
        {/* Dark mode deep black space */}
        <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(ellipse at 15% 20%, rgba(139,92,246,0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(59,130,246,0.06) 0%, transparent 55%), #000000' }} />
        {/* Dark mode neural background */}
        {/* Neural background removed as per user request */}
        {/* Light mode orbs */}
        <motion.div
          animate={{ y: [0, 30, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-transparent dark:bg-violet-600/6 blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, -40, 0], x: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-transparent dark:bg-blue-600/6 blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full bg-transparent dark:bg-orange-500/3 blur-[100px]"
        />
      </div>

      {!tglState.focusMode && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenSettings={(tab) => setProfileMenuTab(tab || 'personalization')}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full relative">

        {/* ─── FINAL RENDER (Navbar) ─── */}
        {allowNavbar && !isFullScreen && !isSidebarOpen && !tglState.focusMode && (
          <div
            className="navbar fixed top-0 left-0 right-0 z-[1001] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 lg:border-none lg:bg-transparent lg:backdrop-blur-none translate-y-0"
          >
            <div className="flex items-center justify-between px-4 py-2.5 lg:justify-end shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[#C8A34D] cursor-pointer shadow-2xs"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.5]" />
              </motion.button>

              <div className="lg:hidden flex items-center gap-2">
                <img src="/logo/logo_transparent.png" alt="AI LEGAL" className="w-5 h-5 object-contain" />
                <span className="font-black text-xs tracking-tight text-[#111111] dark:text-white">AI LEGAL<span className="text-[#C8A34D]">.</span></span>
              </div>
            </div>
          </div>
        )}

        <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        {/* Outlet for pages */}
        <main
          ref={mainRef}
          className={`flex-1 ${(location.pathname.includes('/chat') || (location.pathname.includes('/case') && !location.pathname.includes('case-predictor'))) ? 'overflow-hidden' : 'overflow-y-auto'} relative w-full scroll-smooth p-0 scrollbar-hide transition-all duration-300 ease-in-out ${allowNavbar ? 'pt-14 lg:pt-0' : ''}`}
        >
          <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center bg-transparent">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 animate-pulse">Loading Page...</span>
              </div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <AnimatePresence>
        {profileMenuTab && (
          <ProfileSettingsDropdown
            defaultTab={profileMenuTab}
            onClose={() => setProfileMenuTab(null)}
            onLogout={() => {
              clearUser();
              navigate('/login');
              setProfileMenuTab(null);
            }}
          />
        )}
      </AnimatePresence>
      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        data={upgradeModalData}
      />
    </div>
  );
};

// ------------------------------
// Placeholder Page
// ------------------------------

const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center h-full text-subtext flex-col">
    <h2 className="text-2xl font-bold mb-2 text-maintext">{title}</h2>
    <p>Coming soon...</p>
  </div>
);

// ------------------------------
// App Router
// ------------------------------

const SSOInterceptor = ({ children }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const setUserRecoil = useSetRecoilState(userData);
  // Ref to ensure SSO handoff only runs once per token
  const processedSSORef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ssoToken = params.get('sso_token');
    const fromApp = params.get('from');
    const currentPathname = location.pathname;

    // Only process if we have a token AND we aren't already logged in
    if (ssoToken && !processedSSORef.current) {
      processedSSORef.current = true;
      // Strip token from URL immediately to prevent re-triggering
      window.history.replaceState({}, '', currentPathname);

      const existingToken = localStorage.getItem('token');
      const hasValidToken = !!existingToken && existingToken !== 'undefined' && existingToken !== 'null';

      if (!hasValidToken) {
        setIsVerifying(true);
        axios.post(apis.ssoHandoff, { sso_token: ssoToken, from: fromApp })
          .then(res => {
            const { token, user } = res.data;
            setUserData(user);
            setUserRecoil({ user: user });
            localStorage.setItem("userId", user.id);
            localStorage.setItem("token", token);
            // After successful handoff, just let them be on the dashboard!
            if (currentPathname === '/' || currentPathname === '/login') {
              navigate('/dashboard/chat', { replace: true });
            }
          })
          .catch(err => {
            console.error('[SSO] Handoff failed:', err);
            navigate('/login', { replace: true });
          })
          .finally(() => setIsVerifying(false));
      } else {
        // If already logged in, just ensure they go to the dashboard if they were sent to login
        if (currentPathname === '/login' || currentPathname === '/') {
          navigate('/dashboard/chat', { replace: true });
        }
      }
    }
  }, [location.search, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isVerifying) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
          <p className="text-white text-xs font-black uppercase tracking-widest animate-pulse">Synchronizing Session...</p>
        </div>
      </div>
    );
  }

  return children;
};

const NavigateProvider = () => {
  const [tglState] = useRecoilState(toggleState);

  return (
    <SubscriptionProvider>
      <SSOInterceptor>
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 99999 }}
          toastOptions={{
            duration: 2500, // Reduced from default to meet user request for 2-3 sec auto-close
            className: '!bg-white dark:!bg-[#1E2438] !text-slate-800 dark:!text-white !border !border-slate-100 dark:!border-white/10 !shadow-lg',
          }}
        />
        <CreditUpsellPopup />
        <Routes>
        {/* Public Routes */}
        <Route path={AppRoute.LANDING} element={<HomeRedirect />} />
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/onboarding" element={<GuestRoute><Onboarding /></GuestRoute>} />
        <Route path={AppRoute.LOGIN} element={<GuestRoute><Login /></GuestRoute>} />
        <Route path={AppRoute.SIGNUP} element={<GuestRoute><Signup /></GuestRoute>} />

        <Route path={AppRoute.E_Verification} element={<VerificationForm />} />
        <Route path={AppRoute.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={AppRoute.RESET_PASSWORD} element={<ResetPassword />} />

        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/legal-pricing" element={<LegalPricingPortal />} />
        <Route path="/subscription-checkout" element={<LegalPricingPortal />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/enterprise/setup" element={
          <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950 text-[#C8A34D] font-bold">Loading Enterprise Setup...</div>}>
            <EnterpriseSetupPage />
          </Suspense>
        } />

        <Route path="/dashboard/enterprise" element={
          <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950 text-[#C8A34D] font-bold">Loading Enterprise Dashboard...</div>}>
            <EnterpriseDashboardLayout />
          </Suspense>
        }>
          <Route index element={<EnterpriseOverview />} />
          <Route path="students" element={<EnterpriseStudents />} />
          <Route path="faculty" element={<EnterpriseFaculty />} />
          <Route path="academic" element={<EnterpriseAcademic />} />
          <Route path="curriculum" element={<EnterpriseCurriculum />} />
          <Route path="feature-access" element={<EnterpriseFeatureAccess />} />
          <Route path="usage-credits" element={<EnterpriseUsageCredits />} />
          <Route path="analytics" element={<EnterpriseAnalytics />} />
          <Route path="announcements" element={<EnterpriseAnnouncements />} />
          <Route path="add-ons" element={<EnterpriseAddons />} />
          <Route path="reports" element={<EnterpriseReports />} />
          <Route path="settings" element={<EnterpriseSettings />} />
        </Route>

        <Route path="/share/:shareId" element={<SharedChat />} />
        <Route path="/mobile-app" element={<Navigate to="/dashboard/mobile-app" replace />} />

        {/* Dashboard (Protected) */}
        <Route
          path={AppRoute.DASHBOARD}
          element={<DashboardLayout />}
        >
          <Route index element={<HomeDashboard />} />
          <Route path="home" element={<HomeDashboard />} />
          <Route path="chat" element={<Navigate to="new" replace state={{ forceGlobal: true }} />} />
          <Route path="chat/:sessionId" element={<LegalWorkspace />} />
          <Route path="cases" element={<LegalWorkspace />} />
          <Route path="cases/:caseId" element={<LegalWorkspace />} />
          <Route path="case/:caseId" element={<LegalWorkspace />} />
          <Route path="social-agent" element={<Navigate to="chat/new" replace state={{ forceGlobal: true }} />} />
          <Route path="ai-personal-assistant" element={<Navigate to="chat/new" replace state={{ forceGlobal: true }} />} />
          <Route path="ai-base" element={<Navigate to="chat/new" replace state={{ forceGlobal: true }} />} />

          <Route path="admin" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
              <AdminDashboard />
            </Suspense>
          } />
          <Route path="security" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
              <SecurityAndGuidelines />
            </Suspense>
          } />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<SettingsPage />} />
          <Route path="guide" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Product Guide...</div>}>
              <ProductGuideWorkspace />
            </Suspense>
          } />
          <Route path="tools/product-guide" element={<Navigate to="/dashboard/guide" replace />} />
          <Route path="product-guide" element={<Navigate to="/dashboard/guide" replace />} />
          <Route path="tools/knowledge-hub" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading AI Knowledge Hub...</div>}>
              <KnowledgeHubWorkspace />
            </Suspense>
          } />
          <Route path="knowledge-hub" element={<Navigate to="/dashboard/tools/knowledge-hub" replace />} />
          <Route path="tools" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading AI Tools...</div>}>
              <AiToolsPage />
            </Suspense>
          } />
          <Route path="tools/draft-maker" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Draft Maker...</div>}>
              <DraftMakerWorkspace />
            </Suspense>
          } />
          <Route path="draft-maker" element={<Navigate to="/dashboard/tools/draft-maker" replace />} />
          <Route path="tools/argument-builder" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Argument Builder...</div>}>
              <ArgumentBuilderWorkspace />
            </Suspense>
          } />
          <Route path="argument-builder" element={<Navigate to="/dashboard/tools/argument-builder" replace />} />
          <Route path="tools/legal-precedents" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Legal Precedents...</div>}>
              <LegalPrecedentsWorkspace />
            </Suspense>
          } />
          <Route path="legal-precedents" element={<Navigate to="/dashboard/tools/legal-precedents" replace />} />
          <Route path="tools/evidence-analyst" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Evidence Analyst...</div>}>
              <EvidenceAnalystWorkspace />
            </Suspense>
          } />
          <Route path="evidence-analyst" element={<Navigate to="/dashboard/tools/evidence-analyst" replace />} />
          <Route path="tools/contract-analyzer" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Contract Analyzer...</div>}>
              <ContractAnalyzerWorkspace />
            </Suspense>
          } />
          <Route path="contract-analyzer" element={<Navigate to="/dashboard/tools/contract-analyzer" replace />} />
          <Route path="tools/case-predictor" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Case Predictor...</div>}>
              <CasePredictorWorkspace />
            </Suspense>
          } />
          <Route path="case-predictor" element={<Navigate to="/dashboard/tools/case-predictor" replace />} />
          <Route path="tools/strategy-engine" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Strategy Engine...</div>}>
              <StrategyEngineWorkspace />
            </Suspense>
          } />
          <Route path="strategy-engine" element={<Navigate to="/dashboard/tools/strategy-engine" replace />} />
          <Route path="tools/mock-courtroom" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading AI Mock Courtroom...</div>}>
              <MockCourtroomWorkspace />
            </Suspense>
          } />
          <Route path="mock-courtroom" element={<Navigate to="/dashboard/tools/mock-courtroom" replace />} />
          <Route path="tools/client-connect" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading AI Client Connect...</div>}>
              <ClientConnectWorkspace />
            </Suspense>
          } />
          <Route path="client-connect" element={<Navigate to="/dashboard/tools/client-connect" replace />} />
          <Route path="tools/quiz-practice" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Quiz & MCQ Practice...</div>}>
              <QuizPracticeWorkspace />
            </Suspense>
          } />
          <Route path="quiz-practice" element={<Navigate to="/dashboard/tools/quiz-practice" replace />} />
          <Route path="tools/notes-maker" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading AI Notes Maker...</div>}>
              <NotesMakerWorkspace />
            </Suspense>
          } />
          <Route path="notes-maker" element={<Navigate to="/dashboard/tools/notes-maker" replace />} />
          <Route path="knowledge-vault" element={<PlaceholderPage title="Knowledge Vault" />} />
          <Route path="court-diary" element={<PlaceholderPage title="Court Diary" />} />
          <Route path="templates" element={<PlaceholderPage title="Templates" />} />
          <Route path="calculator" element={<PlaceholderPage title="Legal Calculator" />} />
          <Route path="downloads" element={<PlaceholderPage title="Downloads" />} />
          <Route path="bookmarks" element={<PlaceholderPage title="Bookmarks" />} />
          <Route path="mobile-app" element={
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading Mobile App Ecosystem...</div>}>
              <MobileAppPage />
            </Suspense>
          } />
          <Route path="help-support" element={<HelpSupport />} />
        </Route>


        {/* Vendor Dashboard Routes (Public for MVP/Testing) */}


        {/* Catch All */}
      </Routes>
    </SSOInterceptor>
  </SubscriptionProvider>
  );
};

export default NavigateProvider;