import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatStorageService } from '../services/chatStorageService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as highlighterTheme } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Globe, MessageCircle, Bot, User, Sparkles, ExternalLink, Calendar, Rocket, ChevronDown,
  X, Download, FileSpreadsheet, Presentation, FileText, File as FileIcon,
  Sun, Moon, Minus, Plus, RotateCcw, Copy, Search, ImagePlus, Video, Wand2, Scale, TrendingUp
} from 'lucide-react';
import Loader from '../Components/Loader/Loader';
import { getModeIcon, getModeName, MODES } from '../utils/modeDetection';
import toast from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { userData } from '../userStore/userData';
import { motion } from 'framer-motion';
import { logo } from '../constants';
import { apis } from '../types';
import { copyText } from '../utils/clipboard';
import ActionCard from '../Components/ActionCard';
import { useTheme } from '../context/ThemeContext';

const transformLegalActions = (content) => {
  if (!content) return "";

  let clean = content;

  // 1. Remove [ACTIVE TOOL: ...] tags (case insensitive, including surrounding stars/spaces)
  clean = clean.replace(/\*?\*?\[ACTIVE TOOL:.*?\]\*?\*?/gi, '');

  // 2. Remove any Suggested Actions section completely (from "Suggested Next Actions" or "Suggested Actions" to the end)
  clean = clean.replace(/(?:💡\s*)?Suggested\s+(?:Next\s+)?Actions[\s\S]*$/gi, '');

  // 3. Remove individual action cards/button patterns
  clean = clean.replace(/👉\s*\*\*.*?\*\*[\s\S]*?\(action:.*?\)/gi, '');
  clean = clean.replace(/\[ActionCard\|.*?\]\(action:.*?\)/gi, '');
  clean = clean.replace(/\[?:🔗|🔒\s*Action:.*?\]\(action:.*?\)/gi, '');

  // 4. Remove internal workflow & routing labels
  clean = clean.replace(/(?:Active Tool|Current Tool|Running Tool|Selected Tool|Assistant Engine|Pipeline|Internal AI|Selected Module|Hidden Agent|Workflow)\s*(?::|-)?\s*.*?(?:\n|$)/gi, '');

  return clean.trim();
};




const ImageViewer = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  const imgRef = useRef(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(s => Math.min(Math.max(1, s + delta), 5));
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setLastTouchDistance(dist);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setStartPos({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDistance) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist / lastTouchDistance;
      setScale(s => Math.min(Math.max(1, s * delta), 5));
      setLastTouchDistance(dist);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - startPos.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  useEffect(() => {
    if (scale === 1) setPosition({ x: 0, y: 0 });
  }, [scale]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black/90 select-none">
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/60 backdrop-blur-md rounded-full px-6 py-3 border border-white/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><Minus className="w-5 h-5" /></button>
        <span className="text-white text-sm font-bold font-mono min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><Plus className="w-5 h-5" /></button>
        <div className="w-px h-6 bg-white/20 mx-2"></div>
        <button onClick={handleReset} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors" title="Reset"><RotateCcw className="w-4 h-4" /></button>
      </div>

      <div
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          className="max-w-full max-h-full object-contain pointer-events-auto"
          draggable={false}
          onLoad={() => console.log("Viewer image loaded successfully:", src)}
          onError={(e) => {
            console.error("Viewer image load failed:", src);
            if (src && !e.target.dataset.retried) {
              e.target.dataset.retried = "true";
              const isSignedUrl = src?.includes('X-Goog-Signature');
              const retryUrl = isSignedUrl
                ? src
                : src + (src.includes('?') ? '&' : '?') + 'retry=' + Date.now();
              console.log("Retrying viewer image:", retryUrl);
              e.target.src = retryUrl;
            } else {
              e.target.src = `https://placehold.co/800x600/333/eee?text=Image+Loading+Failed%0AClick+to+Retry`;
              e.target.style.cursor = 'pointer';
              e.target.onclick = (event) => {
                event.stopPropagation();
                const isSignedUrl = src?.includes('X-Goog-Signature');
                e.target.src = isSignedUrl ? src : src + (src.includes('?') ? '&' : '?') + 'reload=' + Date.now();
              };
            }
          }}
        />
      </div>
    </div>
  );
};

const getModeInfo = (mode) => {
  switch (mode) {
    case MODES.DEEP_SEARCH:
      return { label: "AI Precedents Search & Citations", icon: Search, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20" };
    case MODES.WEB_SEARCH:
      return { label: "AI Web Search", icon: Globe, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" };
    case MODES.DOCUMENT_CONVERT:
      return { label: "AI Doc Convert", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    case MODES.FILE_ANALYSIS:
      return { label: "AI File Analysis", icon: Search, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    case MODES.LEGAL_TOOLKIT:
      return { label: "AI Legal™", icon: Scale, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-600/10 dark:bg-indigo-400/10", border: "border-indigo-600/20 dark:border-indigo-400/20" };
    default:
      return null;
  }
};

const SharedChat = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(null);

  const handleCopyImage = async (imageUrl) => {
    if (!imageUrl) return;

    const isSecureContext = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    const proxiedUrl = `${apis.imageProxy}?url=${encodeURIComponent(imageUrl)}`;

    if (isSecureContext && navigator.clipboard?.write) {
      const t = toast.loading('Copying image...');
      try {
        const blob = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas blob failed')), 'image/png');
            } catch (e) { reject(e); }
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = proxiedUrl;
        });

        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.dismiss(t);
        toast.success('Image copied! ✨');
        return;
      } catch (err) {
        toast.dismiss(t);
        console.warn('[CopyImage] Secure clipboard failed, trying fallback:', err.message);
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(imageUrl);
        toast.success('Image link copied! Open it and right-click → Save/Copy. 🔗', { duration: 4000 });
        return;
      }
    } catch (err) {
      console.warn('[CopyImage] writeText also blocked:', err.message);
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = imageUrl;
      textArea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (success) {
        toast.success('Image link copied! Open it and right-click → Save/Copy. 🔗', { duration: 4000 });
        return;
      }
    } catch (err) {
      console.warn('[CopyImage] execCommand fallback failed:', err.message);
    }

    toast(
      () => (
        <span className="flex flex-col gap-1.5">
          <span className="font-bold text-xs">📋 Browser Copy Blocked</span>
          <span className="text-[10px] opacity-80 leading-tight">
            This site runs on HTTP — browser blocks clipboard access. Your image has been opened in a new tab. Please right-click → <strong>Copy Image</strong> or <strong>Save Image As</strong>.
          </span>
        </span>
      ),
      { duration: 5000, icon: '🖼️' }
    );
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (url, filename) => {
    if (isDownloadingUrl === url) return;
    setIsDownloadingUrl(url);
    const downloadToast = toast.loading("Preparing download...");
    const downloadUrl = `${apis.imageProxy}?url=${encodeURIComponent(url)}`;

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'AI LEGAL™-download.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started!", { id: downloadToast });
    } catch (error) {
      console.error('Download failed even with proxy:', error);
      toast.error("Download failed", { id: downloadToast });
      window.open(url, '_blank');
    } finally {
      setIsDownloadingUrl(null);
    }
  };

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setLoading(true);
        const data = await chatStorageService.getSharedSession(shareId);
        setSession(data);
      } catch (err) {
        console.error("Shared chat fetch error:", err);
        setError("This shared chat link is invalid or has been removed.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedChat();
  }, [shareId]);

  const userStore = useRecoilValue(userData);
  const currentUser = userStore?.user;

  const handleDuplicate = async () => {
    try {
      const shareToast = toast.loading("Duplicating conversation...");
      const response = await chatStorageService.duplicateSharedSession(shareId, currentUser?.id);
      if (response.success) {
        toast.success("Conversation copied! Redirecting...", { id: shareToast });
        navigate(`/dashboard/chat/${response.sessionId}`);
      } else {
        throw new Error("Failed to duplicate");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy conversation. Please log in first.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]"><Loader /></div>;

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center bg-white dark:bg-[#0a0a0a]">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Oops!</h1>
        <p className="text-subtext mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-transparent">
      {/* ─── Animated Atmospheric Background ─── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-white dark:opacity-0 transition-opacity duration-500" />
        <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(ellipse at 15% 20%, rgba(139,92,246,0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(59,130,246,0.06) 0%, transparent 55%), #000000' }} />
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

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                {session?.title || "Shared Conversation"}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Shared via AI LEGAL™</span>
                <span className="text-[10px] text-zinc-400">•</span>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                  <Calendar size={10} />
                  {new Date(session?.lastModified || Date.now()).toLocaleDateString()}
                </span>
                <span className="ml-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold rounded-md border border-zinc-200 dark:border-zinc-700">
                  Read Only
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-primary transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <MessageCircle size={14} />
              <span>Continue this Chat</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <Rocket size={14} />
              <span>Try AI LEGAL™</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 w-full pt-24 pb-32 overflow-y-auto chatgpt-container select-text">
        <div className="w-full">
          {session?.messages?.map((msg, idx) => (
            <div
              key={idx}
              className={`chatgpt-message-row group ${msg.role === 'user' ? 'user-row mb-0 sm:mb-6' : 'ai-row mb-0 sm:mb-8'} ${idx === 0 ? 'mt-1 lg:mt-2' : ''}`}
            >
              <div className="chatgpt-message-content select-text">
                {/* Avatar */}
                <div className="chatgpt-avatar-container w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center">
                      <img src={logo} alt="AI LEGAL™" className="w-6 h-[18px] object-cover object-top" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 chatgpt-text select-text">
                  {/* Mode Indicator for Model */}
                  {msg.role === 'model' && (msg.mode === MODES.WEB_SEARCH || msg.isRealTime) && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full w-fit">
                      <Globe className="w-3.5 h-3.5 text-primary animate-pulse" />
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Web Search Mode</span>
                    </div>
                  )}

                  {/* Attachment Display */}
                  {((msg.attachments && msg.attachments.length > 0) || msg.attachment) && (
                    <div className="flex flex-col gap-3 mb-3 mt-1">
                      {(msg.attachments || (msg.attachment ? [msg.attachment] : [])).map((att, attIdx) => (
                        <div key={attIdx} className="w-full">
                          {att.type === 'image' || att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <div
                              className="relative group/image overflow-hidden rounded-xl border border-white/20 shadow-lg transition-all hover:scale-[1.01] cursor-pointer max-w-[320px]"
                              onClick={() => setViewingDoc(att)}
                            >
                              <img
                                src={att.url}
                                alt="Attachment"
                                className="w-full h-auto max-h-[400px] object-contain bg-black/5"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors backdrop-blur-md ${msg.role === 'user' ? 'bg-transparent border-white/20 hover:bg-white/10 shadow-none' : 'bg-secondary/30 border-border hover:bg-secondary/50'}`}>
                              <div
                                className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer p-0.5 rounded-lg"
                                onClick={() => setViewingDoc(att)}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${(() => {
                                  const name = (att.name || '').toLowerCase();
                                  if (msg.role === 'user') return 'bg-white shadow-sm';
                                  if (name.endsWith('.pdf')) return 'bg-red-50 dark:bg-red-900/20';
                                  if (name.match(/\.(doc|docx)$/)) return 'bg-blue-50 dark:bg-blue-900/20';
                                  if (name.match(/\.(xls|xlsx|csv)$/)) return 'bg-emerald-50 dark:bg-emerald-900/20';
                                  if (name.match(/\.(ppt|pptx)$/)) return 'bg-blue-50 dark:bg-blue-900/20';
                                  return 'bg-secondary';
                                })()}`}>
                                  {(() => {
                                    const name = (att.name || '').toLowerCase();
                                    const baseClass = "w-5 h-5";
                                    if (name.match(/\.(xls|xlsx|csv)$/)) return <FileSpreadsheet className={baseClass} />;
                                    if (name.match(/\.(ppt|pptx)$/)) return <Presentation className={baseClass} />;
                                    if (name.endsWith('.pdf')) return <FileText className={baseClass} />;
                                    if (name.match(/\.(doc|docx)$/)) return <FileIcon className={baseClass} />;
                                    return <FileIcon className={baseClass} />;
                                  })()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs truncate text-slate-800 dark:text-zinc-200 mb-0.5">{att.name || 'File'}</p>
                                  <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">
                                    {(() => {
                                      const name = (att.name || '').toLowerCase();
                                      if (name.endsWith('.pdf')) return 'PDF';
                                      if (name.match(/\.(doc|docx)$/)) return 'Word';
                                      if (name.match(/\.(xls|xlsx|csv)$/)) return 'Excel';
                                      if (name.match(/\.(ppt|pptx)$/)) return 'Powerpoint';
                                      return 'Document';
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={att.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                onClick={e => e.stopPropagation()}
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chat Bubble Container */}
                  {(msg.content || msg.text) && (
                    <div className={`chat-bubble-text break-words overflow-wrap-anywhere ${msg.role === 'model' ? 'prose prose-sm max-w-none' : ''}`}>
                      <div className="flex flex-col">
                        <div className="collapsible-container">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children }) => {
                                const text = children?.toString() || "";
                                if (href && href.startsWith('action:')) {
                                  const isLocked = text.includes('🔒') || text.includes('Unlock');

                                  if (text.startsWith('ActionCard|')) {
                                    const parts = text.split('|');
                                    const title = parts[1] || "";
                                    const desc = parts[2] || "";
                                    const actionLabel = (parts[3] || "Open").replace(/^Action:\s*/i, '');

                                    return (
                                      <ActionCard
                                        title={title}
                                        desc={desc}
                                        action={actionLabel}
                                        link={href}
                                        isLocked={isLocked}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          toast.error("Sign up or log in to AI LEGAL™ to use this interactive AI Legal tool.");
                                        }}
                                      />
                                    );
                                  }

                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toast.error("Sign up or log in to AI LEGAL™ to use this interactive AI Legal tool.");
                                      }}
                                      className={`inline-flex mt-2 items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${isLocked ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' : 'bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40'}`}
                                    >
                                      {children}
                                      <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
                                    </button>
                                  );
                                }
                                const isInternal = href && href.startsWith('/');
                                return (
                                  <a
                                    href={href}
                                    onClick={(e) => {
                                      if (isInternal) {
                                        e.preventDefault();
                                        navigate(href);
                                      }
                                    }}
                                    className="text-primary hover:underline font-bold cursor-pointer"
                                    target={isInternal ? "_self" : "_blank"}
                                    rel={isInternal ? "" : "noopener noreferrer"}
                                  >
                                    {children}
                                  </a>
                                );
                              },
                              p: ({ children }) => <p>{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>,
                              li: ({ children }) => <li>{children}</li>,
                              h1: ({ children }) => <h1 className="font-bold tracking-tight">{children}</h1>,
                              h2: ({ children }) => <h2 className="font-bold tracking-tight">{children}</h2>,
                              h3: ({ children }) => <h3 className="font-bold tracking-tight">{children}</h3>,
                              strong: ({ children }) => <strong>{children}</strong>,
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-4 rounded-xl border border-border/50 shadow-lg bg-surface/30 backdrop-blur-sm">
                                  <table className="w-full border-collapse text-sm">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="bg-primary/10 border-b border-border/50">{children}</thead>,
                              tbody: ({ children }) => <tbody className="divide-y divide-border/30">{children}</tbody>,
                              tr: ({ children }) => <tr className="transition-colors hover:bg-white/3">{children}</tr>,
                              th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-primary">{children}</th>,
                              td: ({ children }) => <td className="px-4 py-3 text-sm text-maintext leading-relaxed">{children}</td>,
                              mark: ({ children }) => <mark className="bg-[#5555ff] text-white px-1 py-0.5 rounded-sm">{children}</mark>,
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const lang = match ? match[1] : '';
                                const codeValue = String(children).replace(/\n$/, '');

                                return !inline ? (
                                  <div className="rounded-xl overflow-hidden my-3 border border-[#191a21] bg-[#282a36] shadow-2xl w-full max-w-full group/code">
                                    <div className="flex items-center justify-between px-4 py-3 bg-[#21222c] border-b border-[#191a21]">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 mr-2">
                                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#6272a4]">{lang || 'plain text'}</span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          copyText(codeValue);
                                          toast.success("Code copied!");
                                        }}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#6272a4] hover:text-[#f8f8f2] transition-all bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg border border-transparent hover:border-white/10 active:scale-95"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copy
                                      </button>
                                    </div>
                                    <div className="w-full bg-[#282a36]">
                                      <SyntaxHighlighter
                                        className="custom-scrollbar"
                                        language={lang || 'text'}
                                        style={highlighterTheme}
                                        PreTag="div"
                                        customStyle={{
                                          margin: 0,
                                          padding: '20px',
                                          fontSize: '14px',
                                          lineHeight: '1.7',
                                          background: 'transparent',
                                          borderRadius: 0,
                                          border: 'none',
                                          color: '#f8f8f2',
                                          fontFamily: '"Fira Code", "JetBrains Mono", source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
                                          overflowX: 'auto',
                                          overflowY: 'auto',
                                          maxHeight: '600px',
                                          WebkitOverflowScrolling: 'touch'
                                        }}
                                        codeTagProps={{
                                          style: {
                                            fontFamily: 'inherit',
                                            background: 'transparent',
                                            color: 'inherit',
                                            display: 'block',
                                            minWidth: 'max-content'
                                          }
                                        }}
                                        {...props}
                                      >
                                        {codeValue}
                                      </SyntaxHighlighter>
                                    </div>
                                  </div>
                                ) : (
                                  <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-primary font-bold mx-0.5 text-xs translate-y-[-1px] inline-block" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              img: ({ node, ...props }) => {
                                return (
                                  <div className="relative my-4 group/img-container max-w-full">
                                    <div
                                      className="relative group/image overflow-hidden aspect-auto max-w-[500px] cursor-zoom-in w-fit rounded-xl border border-zinc-200 dark:border-zinc-800"
                                      onClick={() => setViewingDoc({ url: props.src, type: 'image', name: props.alt || 'AI Image' })}
                                    >
                                      {msg.role === 'model' && (
                                        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-between items-center opacity-100 sm:opacity-0 sm:group-hover/img-container:opacity-100 transition-opacity duration-500 ease-in-out">
                                          <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">AI LEGAL™ Generated Asset</span>
                                          </div>
                                        </div>
                                      )}
                                      <ImageViewer
                                        src={props.src}
                                        alt={props.alt || "AI Image"}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img-container:opacity-100 transition-opacity duration-500 ease-in-out pointer-events-none" />
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(props.src, `AI LEGAL™_gen_${Date.now()}.png`);
                                      }}
                                      className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                                    >
                                      <Download className="w-4 h-4" />
                                      <span className="text-[10px] font-bold uppercase">Download</span>
                                    </button>
                                  </div>
                                );
                              }
                            }}
                          >
                            {transformLegalActions(msg.content || msg.text || "")}
                          </ReactMarkdown>
                        </div>

                        {/* Expand/Collapse Button */}
                        
                      </div>
                    </div>
                  )}



                  {/* Image Url Rendering */}
                  {msg.imageUrl && (
                    <div
                      className="relative group/generated mt-4 mb-2 overflow-hidden rounded-2xl transition-all duration-500 ease-in-out border border-transparent hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10 cursor-zoom-in w-fit max-w-sm"
                      onClick={() => {
                        if (!viewingDoc) setViewingDoc({ url: msg.imageUrl, type: 'image', name: 'Generated Image' });
                      }}
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Generated Content"
                        className="w-full h-auto max-h-[420px] object-contain transition-all duration-500"
                        loading="eager"
                      />
                      <div className="absolute bottom-5 right-4 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover/generated:opacity-100 transition-all duration-500 ease-in-out scale-100 sm:scale-90 sm:group-hover/generated:scale-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyImage(msg.imageUrl);
                          }}
                          className="p-2.5 bg-white/20 backdrop-blur-sm text-primary rounded-xl hover:bg-white/30 shadow-lg border border-white/20 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                          title="Copy Image"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          disabled={isDownloadingUrl === msg.imageUrl}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(msg.imageUrl, 'AI LEGAL™-generated.png');
                          }}
                          className={`p-2.5 rounded-xl shadow-lg border border-white/20 flex items-center justify-center transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ${isDownloadingUrl === msg.imageUrl ? 'bg-zinc-600 cursor-wait' : 'bg-primary text-white hover:bg-primary/90'}`}
                          title="Download High-Res"
                        >
                          {isDownloadingUrl === msg.imageUrl ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sources List */}
                  {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold uppercase text-subtext mb-3 flex items-center gap-2 tracking-widest">
                        <ExternalLink className="w-3 h-3" />
                        Shared Sources
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, sIdx) => (
                          <a key={sIdx} href={source.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-primary/10 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-maintext transition-all truncate max-w-[140px]">
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp below bubble */}
                  {msg.timestamp && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating CTA for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:hidden z-[60]">
        <button
          onClick={handleDuplicate}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
        >
          <MessageCircle size={18} />
          <span>Continue Chat</span>
        </button>
      </div>

      {/* Document/Image Viewer Modal (Lightbox popup) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-[110]">
            <a
              href={viewingDoc.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={20} />
            </a>
            <button
              onClick={() => setViewingDoc(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-w-full max-h-full flex items-center justify-center w-full h-full" onClick={() => setViewingDoc(null)}>
            <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {viewingDoc.type === 'video' || viewingDoc.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video src={viewingDoc.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
              ) : (
                <ImageViewer src={viewingDoc.url} alt={viewingDoc.name || "Preview"} />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SharedChat;
