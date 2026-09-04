import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dashboard-dark.css'
// import './dashboard-dark.css'
import App from './App.jsx'
import { ToastProvider } from './Components/Toast/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { PersonalizationProvider } from './context/PersonalizationContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, useLocation } from 'react-router-dom';

import ErrorBoundary from './Components/ErrorBoundary';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || import.meta.env.AISA_GOOGLE_CLIENT_ID
  || (typeof window !== 'undefined' && window._env_?.AISA_GOOGLE_CLIENT_ID)
  || 'dummy_client_id_to_prevent_crash';

// ─── Visual Viewport Manager ───
// Definitive fix for Android Chrome mobile keyboard push-up.
// Strategy: Lock body scroll + track visualViewport + set CSS vars + patch DOM directly.
const VisualViewportManager = () => {
  const location = useLocation();

  useEffect(() => {
    const isMobile = () => window.innerWidth < 1024;
    const root = document.documentElement;
    const isDashboardRoute = location.pathname.startsWith('/dashboard');
    const shouldLock = isMobile() && isDashboardRoute;
    let isSetup = false;

    // ── Step 1: Lock body to prevent Android Chrome's auto-scroll on input focus ──
    // This is the most critical fix. When body is position:fixed, the browser
    // cannot scroll it, so focusing an input never shifts the entire page.
    const lockBody = () => {
      if (!shouldLock || isSetup) return;
      isSetup = true;
      document.documentElement.style.cssText += ';height:100%;overflow:hidden;';
      document.body.style.cssText += ';position:fixed;width:100%;height:100%;overflow:hidden;overscroll-behavior:none;';
      // Prevent window scroll restore attempts
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    };

    const unlockBody = () => {
      if (shouldLock) return;
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      isSetup = false;
    };

    // ── Step 2: Track visualViewport and update CSS variables + DOM directly ──
    const updateViewport = () => {
      const vv = window.visualViewport;
      const fullH = window.screen.height;
      const vh = vv ? vv.height : window.innerHeight;
      const vw = vv ? vv.width : window.innerWidth;
      // offsetTop = distance from top of layout viewport to top of visual viewport
      // (positive when content is scrolled behind keyboard)
      const offsetTop = vv ? vv.offsetTop : 0;

      // Calculate actual keyboard height
      const windowH = window.innerHeight;
      const keyboardH = Math.max(0, windowH - vh - offsetTop);

      // Set CSS variables
      root.style.setProperty('--real-vh', `${vh}px`);
      root.style.setProperty('--real-vw', `${vw}px`);
      root.style.setProperty('--dvh', `${vh * 0.01}px`);
      root.style.setProperty('--keyboard-height', `${keyboardH}px`);
      root.style.setProperty('--keyboard-safe-bottom', `${Math.max(keyboardH, parseInt(getComputedStyle(root).getPropertyValue('--safe-area-bottom') || '0'))}px`);

      // Directly patch #aisa-app-root — height = visual viewport height
      const appRoot = document.getElementById('aisa-app-root');
      if (appRoot) {
        appRoot.style.height = `${vh}px`;
        appRoot.style.maxHeight = `${vh}px`;
        // Also neutralize any leftover bottom offset from inset-0
        appRoot.style.bottom = 'auto';
      }
    };

    // ── Step 3: Guard against window scroll (belt and suspenders) ──
    const preventWindowScroll = () => {
      if (shouldLock && (window.scrollX !== 0 || window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }
    };

    // ── Step 4: On input focus, guard scroll + update after keyboard settles ──
    let focusTimer = null;
    const onFocusIn = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.contentEditable === 'true') {
        preventWindowScroll();
        clearTimeout(focusTimer);
        // Short delay: keyboard animation is ~250-400ms on Android
        focusTimer = setTimeout(() => {
          preventWindowScroll();
          updateViewport();
        }, 300);
      }
    };
    const onFocusOut = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        preventWindowScroll();
        updateViewport();
      }, 300);
    };

    // ── Initialize ──
    if (shouldLock) {
      lockBody();
      document.body.classList.add('is-dashboard');
      document.body.classList.remove('is-landing-page');
    } else {
      unlockBody();
      document.body.classList.add('is-landing-page');
      document.body.classList.remove('is-dashboard');
    }
    updateViewport();

    // ── Event Listeners ──
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewport, { passive: true });
      vv.addEventListener('scroll', updateViewport, { passive: true });
    }
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('scroll', preventWindowScroll, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (shouldLock) {
          lockBody();
        } else {
          unlockBody();
        }
        updateViewport();
      }, 400);
    });
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);

    // ── Handle resize to desktop ──
    const resizeObserver = new ResizeObserver(() => {
      const currentShouldLock = isMobile() && window.location.pathname.startsWith('/dashboard');
      if (!currentShouldLock) {
        unlockBody();
      } else {
        lockBody();
      }
      updateViewport();
    });
    resizeObserver.observe(document.documentElement);

    return () => {
      clearTimeout(focusTimer);
      if (vv) {
        vv.removeEventListener('resize', updateViewport);
        vv.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('scroll', preventWindowScroll);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      resizeObserver.disconnect();
      // Ensure body is unlocked when location changes and this cleanup runs
      unlockBody();
    };
  }, [location.pathname]);

  return null;
};

import { MotionConfig } from 'framer-motion';

const AppTree = (
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <MotionConfig transition={{ ease: [0.22, 1, 0.36, 1] }} reducedMotion="user">
          <VisualViewportManager />
          <ToastProvider>
            <PersonalizationProvider>
              <ThemeProvider>
                <LanguageProvider>
                  <App />
                </LanguageProvider>
              </ThemeProvider>
            </PersonalizationProvider>
          </ToastProvider>
        </MotionConfig>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

// is-scrolling optimization removed — it triggered CSS repaints on ALL backdrop-blur elements
// causing severe full-screen flicker on scroll. Glassmorphism is now always GPU-rendered.

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    {AppTree}
  </GoogleOAuthProvider>
);
