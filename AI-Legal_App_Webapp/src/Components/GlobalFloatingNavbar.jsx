import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, User, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { getUserData, clearUser, toggleState } from '../userStore/userData';
import ProfileSettingsDropdown from './ProfileSettingsDropdown/ProfileSettingsDropdown.jsx';

/**
 * GlobalFloatingNavbar Component
 * A premium, glassmorphic floating navbar that hides on scroll down and reappears on scroll up.
 * Contains Theme Toggle and User Profile button.
 */
const GlobalFloatingNavbar = () => {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(new Map());
  const scrollThreshold = 15;
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [tglState, setTglState] = useRecoilState(toggleState);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const user = getUserData() || { name: 'Guest' };
  const token = user?.token;

  // Scroll detection logic
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target;
      
      // Ignore document/window scrolls as they can be noisy on mobile
      if (target === document || target === document.documentElement || target === window) {
        return; 
      }
      
      // Identify scrollable containers (consistent with Navigation.Provider.jsx)
      const isChat = target.classList && target.classList.contains('chatgpt-container');
      const isMain = target.tagName === 'MAIN';
      
      if (!isChat && !isMain) return;

      const targetKey = isChat ? 'chat' : 'main';
      const currentScrollY = target.scrollTop ?? 0;
      const prevScrollY = lastScrollY.current.get(targetKey) || 0;

      // Always show at top
      if (currentScrollY <= 10) {
        setVisible(true);
        lastScrollY.current.set(targetKey, currentScrollY);
        return;
      }

      const diff = currentScrollY - prevScrollY;
      if (Math.abs(diff) > scrollThreshold) {
        if (currentScrollY > prevScrollY) {
          // scroll down -> hide
          setVisible(false);
        } else {
          // scroll up -> show
          setVisible(true);
        }
        lastScrollY.current.set(targetKey, currentScrollY);
      }
    };

    // Use capture: true to catch scroll events from child containers
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true, passive: true });
  }, []);

  // Update CSS variable for layout padding (optional but good for consistency)
  useEffect(() => {
    // Keep padding constant to prevent layout shifts/flickering on scroll.
    document.documentElement.style.setProperty('--floating-nav-h', '72px');
    return () => document.documentElement.style.setProperty('--floating-nav-h', '0px');
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: 0, opacity: 0 }}
        animate={{ 
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0
        }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="fixed top-0 right-0 left-0 lg:left-auto z-[1001] p-3 sm:p-5 pointer-events-none flex justify-between lg:justify-end items-center gap-3"
      >
        {/* Left Side: Menu button for mobile */}
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setTglState(prev => ({ ...prev, sidebarOpen: true }))}
            className="lg:hidden w-10 h-10 flex items-center justify-center bg-white border border-[#E5E7EB] shadow-sm rounded-xl text-[#111827] pointer-events-auto"
        >
            <Menu className="w-5 h-5" />
        </motion.button>

        <div className="hidden lg:flex items-center gap-2.5 pointer-events-auto bg-transparent p-1.5 sm:p-2 transition-all duration-300">
          
          {/* Theme Toggle Button - Hidden on mobile if sidebar is open */}
          {!(tglState.sidebarOpen && window.innerWidth < 1024) && (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] border border-transparent hover:border-[#E5E7EB] transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
            </motion.button>
          )}

          {/* Profile Avatar Button */}
          {token ? (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-xl border border-[#E5E7EB] text-[#111827] overflow-hidden shadow-sm"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/account.png'; }} />
                ) : (
                  <span className="font-bold text-sm uppercase">{user?.name?.charAt(0) || 'U'}</span>
                )}
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-4 h-9 sm:h-10 flex items-center justify-center bg-[#6D5DFC] text-white rounded-lg font-bold text-sm shadow-sm"
            >
              Login
            </motion.button>
          )}
        </div>
      </motion.nav>

      <AnimatePresence>
        {isProfileMenuOpen && (
          <ProfileSettingsDropdown
            onClose={() => setIsProfileMenuOpen(false)}
            onLogout={() => {
              clearUser();
              navigate('/login');
              setIsProfileMenuOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalFloatingNavbar;
