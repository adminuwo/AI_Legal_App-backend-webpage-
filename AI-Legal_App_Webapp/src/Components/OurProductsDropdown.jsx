import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Sparkles, ShoppingBag, Share2, Layers, Megaphone } from 'lucide-react';

export const COMPANY_PRODUCTS = [
  {
    id: 'aisa',
    name: 'AISA',
    hasTm: true,
    url: 'https://aisa24.com/',
    icon: Sparkles,
  },
  {
    id: 'aimall',
    name: 'AI Mall',
    hasTm: true,
    url: 'https://aimall24.com/',
    icon: ShoppingBag,
  },
  {
    id: 'uwoconnect',
    name: 'Uwo Connect',
    hasTm: false,
    url: 'https://uwoconnect.aisa24.com/',
    icon: Share2,
  },
  {
    id: 'efv',
    name: 'EFV',
    hasTm: true,
    url: 'https://efvframework.com/',
    icon: Layers,
  },
  {
    id: 'aiads',
    name: 'AI Ads',
    hasTm: true,
    url: 'https://ai-ads-743928421487.asia-south1.run.app/',
    icon: Megaphone,
  },
];

const OurProductsDropdown = ({ isMobile = false, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside (Desktop)
  useEffect(() => {
    if (isMobile) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleProductClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
    if (onItemClick) onItemClick();
  };

  // Mobile View Rendering (Inside Drawer)
  if (isMobile) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628] transition-colors cursor-pointer"
        >
          <span>Our Products</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#B38628]' : 'text-slate-400'
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pl-3 pr-1 py-1 space-y-1 overflow-hidden"
            >
              {COMPANY_PRODUCTS.map((prod) => {
                const Icon = prod.icon;
                return (
                  <a
                    key={prod.id}
                    href={prod.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleProductClick(prod.url);
                    }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#B88B2A]/10 hover:text-[#B38628] dark:hover:text-amber-300 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5.5 h-5.5 rounded-md bg-[#B88B2A]/10 text-[#B88B2A] flex items-center justify-center shrink-0">
                        <Icon size={12} />
                      </div>
                      <span className="flex items-center font-bold text-xs">
                        {prod.name}
                        {prod.hasTm && (
                          <sup className="text-[8px] font-bold ml-0.5 text-slate-500 dark:text-slate-400 group-hover:text-[#B38628]">
                            TM
                          </sup>
                        )}
                      </span>
                    </div>
                    <ExternalLink size={12} className="text-slate-400 group-hover:text-[#B38628] shrink-0 ml-2" />
                  </a>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop View Rendering (Floating Dropdown)
  return (
    <>
      {/* Background Screen Blur Overlay */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && !isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/20 dark:bg-black/45 backdrop-blur-sm z-[45]"
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer py-1 ${
            isOpen
              ? 'text-[#B38628] dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#B38628] dark:hover:text-amber-400'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span>Our Products</span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#B38628]' : 'text-slate-400'
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-[#111625] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1 z-[100] overflow-hidden"
            >
              <div className="px-2 py-1 border-b border-slate-100 dark:border-zinc-800/80 mb-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Ecosystem Products
                </span>
              </div>

              <div className="space-y-0.5">
                {COMPANY_PRODUCTS.map((prod) => {
                  const Icon = prod.icon;
                  return (
                    <a
                      key={prod.id}
                      href={prod.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        handleProductClick(prod.url);
                      }}
                      className="flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#B88B2A]/10 hover:text-[#B38628] dark:hover:text-amber-300 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-[#B88B2A]/10 group-hover:bg-[#B88B2A]/20 text-[#B88B2A] flex items-center justify-center shrink-0 transition-colors">
                          <Icon size={12} />
                        </div>
                        <span className="font-bold flex items-center text-xs">
                          {prod.name}
                          {prod.hasTm && (
                            <sup className="text-[8px] font-bold ml-0.5 text-slate-500 dark:text-slate-400 group-hover:text-[#B38628]">
                              TM
                            </sup>
                          )}
                        </span>
                      </div>
                      <ExternalLink
                        size={12}
                        className="text-slate-400 group-hover:text-[#B38628] shrink-0 ml-1.5 opacity-70 group-hover:opacity-100 transition-all"
                      />
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default OurProductsDropdown;
