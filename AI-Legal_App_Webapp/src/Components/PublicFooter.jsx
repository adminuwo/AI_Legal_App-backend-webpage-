import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronDown, BookOpen, PenTool, ArrowRight, Sparkles } from 'lucide-react';

// Official Apple App Store Download Badge Component (Matching Reference)
export const OfficialAppStoreBadge = ({ className = "h-10 w-auto" }) => (
  <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Download on the App Store">
    <rect width="200" height="60" rx="9" fill="#000000"/>
    <rect x="0.75" y="0.75" width="198.5" height="58.5" rx="8.25" stroke="#A6A6A6" strokeWidth="1.2"/>
    <path d="M42.4 28.5C42.4 24.3 45.8 22.3 46 22.2C44.1 19.4 41.1 19 40 18.9C37.5 18.6 34.9 20.4 33.6 20.4C32.3 20.4 30.2 18.9 28.2 18.9C25.6 18.9 23.2 20.4 21.8 22.8C19 27.7 21.1 35 23.8 38.9C25.1 40.8 26.6 42.9 28.7 42.8C30.7 42.7 31.5 41.5 33.9 41.5C36.3 41.5 37 42.8 39.1 42.8C41.2 42.8 42.5 40.9 43.8 39C45.3 36.8 45.9 34.7 46 34.6C45.9 34.5 42.4 33.2 42.4 28.5Z" fill="white"/>
    <path d="M37.7 16.5C38.8 15.1 39.6 13.2 39.3 11.3C37.7 11.4 35.6 12.4 34.5 13.7C33.5 14.8 32.7 16.8 33 18.7C34.8 18.8 36.7 17.8 37.7 16.5Z" fill="white"/>
    <text x="58" y="24" fill="white" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="10" fontWeight="500" letterSpacing="0.2">Download on the</text>
    <text x="58" y="44" fill="white" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="20" fontWeight="600" letterSpacing="-0.4">App Store</text>
  </svg>
);

// Official Google Play Download Badge Component (Matching Reference)
export const OfficialGooglePlayBadge = ({ className = "h-10 w-auto" }) => (
  <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GET IT ON Google Play">
    <rect width="200" height="60" rx="9" fill="#000000"/>
    <rect x="0.75" y="0.75" width="198.5" height="58.5" rx="8.25" stroke="#A6A6A6" strokeWidth="1.2"/>
    <path d="M22.8 13.4C22.3 13.9 22 14.7 22 15.8V44.2C22 45.3 22.3 46.1 22.8 46.6L22.9 46.7L38.1 31.5V31.2L22.9 16L22.8 13.4Z" fill="#00D2FF"/>
    <path d="M43.2 36.6L38.1 31.5V31.2L43.2 26.1L43.3 26.2L49.4 29.7C51.1 30.7 51.1 32.3 49.4 33.3L43.3 36.5L43.2 36.6Z" fill="#FFD500"/>
    <path d="M43.3 36.5L38.1 31.3L22.8 46.6C23.4 47.2 24.4 47.3 25.5 46.7L43.3 36.5Z" fill="#FF3A44"/>
    <path d="M43.3 26.2L25.5 16C24.4 15.4 23.4 15.5 22.8 16.1L38.1 31.4L43.3 26.2Z" fill="#00E676"/>
    <text x="58" y="24" fill="white" fontFamily="Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="9.5" fontWeight="500" letterSpacing="0.8">GET IT ON</text>
    <text x="58" y="44" fill="white" fontFamily="Google Sans, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="19" fontWeight="600" letterSpacing="-0.2">Google Play</text>
  </svg>
);

export default function PublicFooter() {
  const navigate = useNavigate();

  const [companyBlogDropdownOpen, setCompanyBlogDropdownOpen] = useState(false);
  const companyBlogTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (companyBlogTimeoutRef.current) clearTimeout(companyBlogTimeoutRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (path) => {
    if (path.startsWith('/#')) {
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById(path.substring(2));
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } else {
        const el = document.getElementById(path.substring(2));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full relative z-20 font-sans selection:bg-[#F59E0B]/30 selection:text-white">
      {/* ─── Upper Section: Deep Navy Blue (Matching Reference) ─── */}
      <div className="bg-[#0B132B] text-white pt-14 pb-12 px-6 sm:px-10 lg:px-16 border-t border-[#1C2541]/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          
          {/* Column 1: Brand Info & App Downloads (col-span-5) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Logo */}
            <div 
              onClick={() => handleNavClick('/')}
              className="flex items-center gap-2.5 cursor-pointer select-none group w-fit"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#B38628] flex items-center justify-center p-1.5 shadow-md shadow-[#E5A93C]/20">
                <img src="/logo/logo_transparent.png" alt="AI LEGAL" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center">
                AI<span className="text-[#F59E0B] ml-1">Legal</span>
                <span className="text-[10px] align-super text-[#F59E0B] font-extrabold ml-0.5">™</span>
              </h2>
            </div>

            {/* Tagline */}
            <p className="text-slate-300 text-sm leading-relaxed max-w-sm font-normal">
              India's first legal AI platform for lawyers, advocates, and law students.
            </p>

            {/* App Store & Google Play Badges Row (Matching Reference) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Google Play Badge */}
              <a
                href="https://play.google.com/store/apps/details?id=com.uwo.ailegal"
                target="_blank"
                rel="noreferrer"
                aria-label="GET IT ON Google Play"
                className="transition-transform duration-200 hover:scale-105 active:scale-95 inline-block"
              >
                <OfficialGooglePlayBadge className="h-10 w-auto rounded-lg shadow-sm" />
              </a>

              {/* App Store Badge */}
              <a
                href="https://apps.apple.com/in/app/ai-legal/id6797449251"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download on the App Store"
                className="transition-transform duration-200 hover:scale-105 active:scale-95 inline-block cursor-pointer"
              >
                <OfficialAppStoreBadge className="h-10 w-auto rounded-lg shadow-sm" />
              </a>
            </div>
          </div>

          {/* Column 2: Product (col-span-2) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-base font-bold text-white tracking-tight">Product</h3>
            <ul className="space-y-2.5 text-sm text-slate-300 font-normal">
              <li>
                <button onClick={() => handleNavClick('/')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/features')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/blog')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Blog
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/pricing')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Pricing
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/case-search')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Case Search
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/about')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  About
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/dashboard')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal (col-span-2) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-base font-bold text-white tracking-tight">Legal</h3>
            <ul className="space-y-2.5 text-sm text-slate-300 font-normal">
              <li>
                <button onClick={() => handleNavClick('/privacy-policy')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/terms')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick('/cookie-policy')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  Cookie Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Company (col-span-3) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h3 className="text-base font-bold text-white tracking-tight">Company</h3>
            <ul className="space-y-2.5 text-sm text-slate-300 font-normal">
              <li>
                <button onClick={() => handleNavClick('/about')} className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left">
                  About Us
                </button>
              </li>
              <li
                className="relative"
                onMouseEnter={() => {
                  if (companyBlogTimeoutRef.current) clearTimeout(companyBlogTimeoutRef.current);
                  setCompanyBlogDropdownOpen(true);
                }}
                onMouseLeave={() => {
                  companyBlogTimeoutRef.current = setTimeout(() => setCompanyBlogDropdownOpen(false), 250);
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompanyBlogDropdownOpen(prev => !prev);
                  }}
                  className="hover:text-[#F59E0B] transition-colors cursor-pointer text-left flex items-center gap-1.5 group"
                >
                  <span>Blog</span>
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 group-hover:text-[#F59E0B] transition-transform duration-200 ${
                      companyBlogDropdownOpen ? 'rotate-180 text-[#F59E0B]' : ''
                    }`}
                  />
                </button>

                {/* 2-Option Popover Menu for Blog (Read Articles vs In-House Publishing) */}
                {companyBlogDropdownOpen && (
                  <div
                    className="absolute left-0 lg:left-auto lg:right-0 bottom-full mb-2.5 w-72 sm:w-80 rounded-2xl bg-[#0F172A] border border-[#C8A34D]/40 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                  >
                    <div className="px-3 py-1.5 mb-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#C8A34D] flex items-center gap-1">
                        <Sparkles size={11} /> AI LEGAL™ Journal
                      </span>
                      <span className="text-[9px] bg-[#C8A34D]/15 text-[#C8A34D] px-1.5 py-0.5 rounded font-bold">
                        Company
                      </span>
                    </div>

                    {/* Option 1: Direct Blog Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyBlogDropdownOpen(false);
                        handleNavClick('/blog');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-all flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-[#C8A34D] transition-colors">
                            Explore Blog Articles
                          </span>
                          <ArrowRight size={12} className="text-slate-500 group-hover:text-[#C8A34D] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Browse published articles, chamber guides & legal updates
                        </p>
                      </div>
                    </button>

                    {/* Option 2: In-House Team Post Blog */}
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyBlogDropdownOpen(false);
                        handleNavClick('/blog/publish');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-amber-950/40 border border-transparent hover:border-[#C8A34D]/30 transition-all flex items-start gap-3 group cursor-pointer mt-1"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C8A34D] to-[#B38628] text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <PenTool size={15} className="stroke-[2.5]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-[#C8A34D] transition-colors flex items-center gap-1.5">
                            Post In-House Blog
                            <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black uppercase tracking-tight">
                              Studio
                            </span>
                          </span>
                          <ArrowRight size={12} className="text-slate-500 group-hover:text-[#C8A34D] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          In-House team workspace to write & publish new content
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ─── Bottom Sub-Footer Bar: Warm Pale Cream/Yellow (Exact Match) ─── */}
      <div className="bg-[#FEF5D4] text-[#1E293B] py-5 px-6 sm:px-10 lg:px-16 border-t border-[#FCD34D]/40 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-center">
          
          {/* Logo Badge in Dark Frame */}
          <div className="flex items-center gap-2.5">
            <div className="bg-[#111827] text-white px-3 py-1.5 rounded-md flex items-center gap-2 border border-black/10 shadow-xs">
              <img src="/logo/logo_transparent.png" alt="AI LEGAL" className="w-5 h-5 object-contain" />
              <span className="text-xs font-black tracking-tight text-white">
                AI<span className="text-[#F59E0B] ml-0.5">Legal</span>
              </span>
            </div>
          </div>

          {/* Corporate Legal Registration Text */}
          <div className="space-y-0.5 text-xs text-[#1F2937] font-semibold">
            <p className="font-bold">
              © 2026 by <span className="font-extrabold text-black">UNIFIED WEB OPTIONS & SERVICES PRIVATE LIMITED</span>, India
            </p>
            <p className="text-[11px] text-slate-700 tracking-wider">
              DPIIT Recognized | DUNS Registered | Incubated at IIT Ropar – TBIF
            </p>
          </div>

        </div>

        {/* Floating / Anchored Orange Scroll-To-Top Button */}
        <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2">
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </footer>
  );
}
