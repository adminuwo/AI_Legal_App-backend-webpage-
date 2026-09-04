import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Brain, Briefcase, ChevronDown, Star,
  ImagePlus, Video, PlayCircle, Wand2, Headphones,
  Search, Globe, FileText, Code, Scale, TrendingUp, Megaphone
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useIsDark } from '../../context/ThemeContext';

const SidebarTools = ({ onToolSelect, activeToolId }) => {
  const { t } = useLanguage();
  const isDark = useIsDark();
  const [expandedCategories, setExpandedCategories] = useState({
    create: true,
    intelligence: false,
    business: false
  });

  const categories = [
    {
      id: 'create',
      title: 'CREATE',
      icon: Sparkles,
      color: '#a78bfa',
      tools: [
        { id: 'image', label: t('generateImage') || 'Generate Image', icon: ImagePlus, color: '#a78bfa' },
        { id: 'video', label: t('generateVideo') || 'Generate Video', icon: Video, color: '#fb923c' },
        { id: 'image_to_video', label: t('imageToVideo') || 'Image to Video', icon: PlayCircle, color: '#f97316' },
        { id: 'edit_image', label: t('editImage') || 'Edit Image', icon: Wand2, color: '#f43f5e' },
        { id: 'audio', label: 'Generate Audio', icon: Headphones, color: '#34d399' },
      ]
    },
    {
      id: 'intelligence',
      title: 'INTELLIGENCE',
      icon: Brain,
      color: '#0ea5e9',
      tools: [
        { id: 'deep_search', label: t('deepSearch') || 'Deep Search', icon: Search, color: '#0ea5e9' },
        { id: 'web_search', label: t('realTimeSearch') || 'Real-Time Search', icon: Globe, color: '#22d3ee' },
        { id: 'document', label: t('analyzeDocument') || 'Convert Document', icon: FileText, color: '#3b82f6' },
        { id: 'code', label: t('codeWriter') || 'Code Writer', icon: Code, color: '#6366f1' },
      ]
    },
    {
      id: 'business',
      title: 'BUSINESS',
      icon: Briefcase,
      color: '#818cf8',
      tools: [
        { id: 'legal', label: t('aiLegal') || 'AI Legal', icon: Scale, color: '#818cf8', premium: true },
        { id: 'ai_cashflow', label: 'AI Cashflow™', icon: TrendingUp, color: '#10b981', premium: true },
        { id: 'aiad_agent', label: t('aiAds') || 'AI ADS', icon: Megaphone, color: '#eab308', premium: true },
      ]
    }
  ];

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="flex flex-col gap-1 mt-2">
      {categories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCategories[category.id];

        return (
          <div key={category.id} className="flex flex-col">
            <button
              onClick={() => toggleCategory(category.id)}
              className={`flex items-center justify-between px-5 py-2 hover:bg-white/5 transition-colors group/cat ${isDark ? 'text-subtext/60' : 'text-slate-500'}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 transition-colors ${isExpanded ? 'text-primary' : ''}`} />
                <span className={`text-[12px] font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-primary' : ''}`}>
                  {category.title}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`} />
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "circOut" }}
                  className="overflow-hidden flex flex-col px-3 gap-0.5"
                >
                  {category.tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isActive = activeToolId === tool.id;

                    return (
                      <button
                        key={tool.id}
                        onClick={() => onToolSelect(tool.id)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-300 group/tool ${
                          isActive 
                            ? 'bg-primary/10 text-primary shadow-sm' 
                            : isDark 
                              ? 'text-subtext/80 hover:bg-white/5 hover:text-white' 
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className={`p-1.5 rounded-lg transition-transform group-hover/tool:scale-110 ${isActive ? 'bg-primary/20' : 'bg-white/10'}`}
                            style={{ color: tool.color }}
                          >
                            <ToolIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className={`text-[13px] font-bold truncate ${isActive ? 'text-primary' : ''}`}>
                            {tool.label}
                          </span>
                        </div>
                        {tool.premium && (
                          <Star className={`w-2.5 h-2.5 fill-violet-500 text-violet-500 opacity-60`} />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default SidebarTools;
