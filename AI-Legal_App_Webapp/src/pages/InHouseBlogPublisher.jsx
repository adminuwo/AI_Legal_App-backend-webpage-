import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Sparkles, Eye, Edit3, BookOpen, Tag,
  Clock, CheckCircle2, AlertCircle, FileText, Smartphone,
  Layers, Hash, RefreshCw, Check, Trash2, History, Plus,
  Search, ExternalLink, X, Save, Image as ImageIcon, Upload, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter, { OfficialAppStoreBadge, OfficialGooglePlayBadge } from '../Components/PublicFooter';
import { API } from '../types.js';

export default function InHouseBlogPublisher() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Active view: 'write' | 'preview' | 'history'
  const [activeTab, setActiveTab] = useState('write');
  const [submitting, setSubmitting] = useState(false);

  // History & Management State
  const [publishedList, setPublishedList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);

  // Form State: Exactly Title, Subtitle, Keywords, Description, Image
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    keywords: '',
    description: '',
    image: ''
  });

  const backendBase = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:8080'
    : (typeof API === 'string' ? API.replace(/\/api\/?$/, '') : '');

  // Calculate read time
  const getReadTime = (text) => {
    if (!text) return '3 min read';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 180));
    return `${minutes} min read`;
  };

  // Fetch all published blogs for History view
  const fetchPublishedList = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(`${backendBase}/api/blogs`);
      const serverBlogs = res.data?.blogs || [];

      let localBlogs = [];
      try {
        localBlogs = JSON.parse(localStorage.getItem('inhouse_published_blogs') || '[]');
      } catch (e) {}

      const combined = [];
      const seen = new Set();

      serverBlogs.forEach(b => {
        const key = b._id || b.slug;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(b);
        }
      });

      localBlogs.forEach(b => {
        const key = b._id || b.slug;
        if (!seen.has(key) && !seen.has(b.slug)) {
          seen.add(key);
          combined.push(b);
        }
      });

      setPublishedList(combined);
    } catch (err) {
      console.warn('Failed to load published blogs from server, reading local cache:', err);
      try {
        const localBlogs = JSON.parse(localStorage.getItem('inhouse_published_blogs') || '[]');
        setPublishedList(localBlogs);
      } catch (e) {}
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPublishedList();
  }, []);

  // Handle local image file upload (converts to base64 Data URL)
  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setFormData(prev => ({ ...prev, image: loadEvt.target.result }));
      toast.success('Cover image uploaded successfully! 📸');
    };
    reader.readAsDataURL(file);
  };

  // Start Editing an existing blog
  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setEditingId(blog._id || blog.slug);

    const kw = Array.isArray(blog.keywords)
      ? blog.keywords.join(', ')
      : (Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.keywords || blog.tags || ''));

    setFormData({
      title: blog.title || '',
      subtitle: blog.subtitle || blog.summary || '',
      keywords: kw,
      description: blog.description || blog.content || '',
      image: blog.image || blog.coverImage || ''
    });

    setActiveTab('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(`Loaded "${blog.title.slice(0, 32)}..." into editor! ✏️`);
  };

  // Cancel Editing and reset form
  const handleCancelEdit = () => {
    setEditingBlog(null);
    setEditingId(null);
    setFormData({
      title: '',
      subtitle: '',
      keywords: '',
      description: '',
      image: ''
    });
    toast('Switched to new article mode.');
  };

  // Delete an article
  const handleDelete = async (blog) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${blog.title}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      if (blog._id) {
        await axios.delete(`${backendBase}/api/blogs/${blog._id}`);
      }

      try {
        const localKey = 'inhouse_published_blogs';
        const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
        const filtered = saved.filter(b => (b._id && b._id !== blog._id) && (b.slug && b.slug !== blog.slug));
        localStorage.setItem(localKey, JSON.stringify(filtered));
      } catch (e) {}

      if (editingId && (editingId === blog._id || editingId === blog.slug)) {
        handleCancelEdit();
      }

      toast.success('Article deleted successfully.');
      fetchPublishedList();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete article.');
    }
  };

  // Form Submit (Handles both Publish and Update)
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter the Article Title');
      return;
    }
    if (!formData.subtitle.trim()) {
      toast.error('Please enter a Subtitle / Overview');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please write the Article Description');
      return;
    }

    setSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim(),
      summary: formData.subtitle.trim(),
      keywords: formData.keywords.split(',').map(t => t.trim()).filter(Boolean),
      tags: formData.keywords.split(',').map(t => t.trim()).filter(Boolean),
      description: formData.description.trim(),
      content: formData.description.trim(),
      image: formData.image.trim(),
      coverImage: formData.image.trim(),
      author: 'AI LEGAL™ In-House Editorial Board',
      category: 'Legal Insights',
      readTime: getReadTime(formData.description),
      hasMobileDownload: true,
      status: 'Published'
    };

    try {
      if (editingId && editingBlog?._id) {
        // --- UPDATE EXISTING BLOG (PUT /api/blogs/:id) ---
        const res = await axios.put(`${backendBase}/api/blogs/${editingBlog._id}`, payload);

        if (res.data?.success) {
          toast.success('Article updated successfully! ✨');

          try {
            const localKey = 'inhouse_published_blogs';
            const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
            const idx = saved.findIndex(b => b._id === editingBlog._id || b.slug === editingBlog.slug);
            if (idx !== -1) {
              saved[idx] = { ...saved[idx], ...res.data.blog };
            } else {
              saved.unshift(res.data.blog);
            }
            localStorage.setItem(localKey, JSON.stringify(saved));
          } catch (e) {}

          setEditingId(null);
          setEditingBlog(null);
          fetchPublishedList();
          navigate(`/blog/${res.data.blog?.slug || editingBlog.slug}`);
        } else {
          toast.error(res.data?.message || 'Could not update article.');
        }
      } else {
        // --- PUBLISH NEW BLOG (POST /api/blogs/publish) ---
        const res = await axios.post(`${backendBase}/api/blogs/publish`, payload);

        if (res.data?.success) {
          toast.success('Article published live to the AI LEGAL™ Journal! 🎉');

          try {
            const localKey = 'inhouse_published_blogs';
            const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
            saved.unshift(res.data.blog);
            localStorage.setItem(localKey, JSON.stringify(saved));
          } catch (e) {}

          fetchPublishedList();
          const targetSlug = res.data.blog?.slug;
          if (targetSlug) {
            navigate(`/blog/${targetSlug}`);
          } else {
            setActiveTab('history');
          }
        } else {
          toast.error(res.data?.message || 'Could not publish article');
        }
      }
    } catch (err) {
      console.warn('Backend operation fallback to local storage:', err);
      const fallbackSlug = editingBlog?.slug || (formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `article-${Date.now()}`);
      const fallbackBlog = {
        ...payload,
        slug: fallbackSlug,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        updatedAt: new Date().toISOString(),
        source: 'inhouse'
      };

      try {
        const localKey = 'inhouse_published_blogs';
        const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
        const idx = saved.findIndex(b => b.slug === fallbackSlug);
        if (idx !== -1) {
          saved[idx] = fallbackBlog;
        } else {
          saved.unshift(fallbackBlog);
        }
        localStorage.setItem(localKey, JSON.stringify(saved));
        toast.success('Article saved locally and visible on Blog! 📝');
        setEditingId(null);
        setEditingBlog(null);
        fetchPublishedList();
        navigate(`/blog/${fallbackSlug}`);
      } catch (storageErr) {
        toast.error('Failed to save article.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered published list for History tab
  const filteredHistory = publishedList.filter(blog => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    const titleMatch = (blog.title || '').toLowerCase().includes(q);
    const subMatch = (blog.subtitle || blog.summary || '').toLowerCase().includes(q);
    const descMatch = (blog.description || blog.content || '').toLowerCase().includes(q);
    return titleMatch || subMatch || descMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div onClick={() => navigate('/blog')} className="flex items-center gap-3 cursor-pointer select-none">
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/blog'); }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#C8A34D]/15 hover:text-[#C8A34D] transition-colors"
              title="Back to Blog"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-8 h-8 object-contain" />
              <div>
                <span className="text-base font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
                  AI LEGAL<span className="text-[10px] text-[#C8A34D] font-extrabold ml-0.5">TM</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#C8A34D] block -mt-1">
                  Editorial Publishing Studio
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'write'
                    ? 'bg-white dark:bg-[#0B0F19] text-[#C8A34D] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Edit3 size={13} /> {editingId ? 'Edit Article' : 'Write'}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-[#0B0F19] text-[#C8A34D] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Eye size={13} /> Preview
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('history'); fetchPublishedList(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-[#0B0F19] text-[#C8A34D] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <History size={13} /> History
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#C8A34D]/20 text-[#C8A34D]">
                  {publishedList.length}
                </span>
              </button>
            </div>

            <ThemeToggle />

            {/* Action Button: Publish or Save Changes */}
            {activeTab !== 'history' && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 shadow-md shadow-[#C8A34D]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> {editingId ? 'Updating...' : 'Publishing...'}
                  </>
                ) : editingId ? (
                  <>
                    <Save size={13} /> Save Changes
                  </>
                ) : (
                  <>
                    <Send size={13} /> Publish Article
                  </>
                )}
              </button>
            )}

            {activeTab === 'history' && (
              <button
                onClick={() => { handleCancelEdit(); setActiveTab('write'); }}
                className="px-4 py-2 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 shadow-md shadow-[#C8A34D]/25 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus size={14} /> New Article
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {/* EDITING MODE ALERT BANNER */}
        {editingId && activeTab === 'write' && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-[#C8A34D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#C8A34D] text-[#111111] flex items-center justify-center shrink-0 font-black">
                <Edit3 size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C8A34D] animate-ping" />
                  Currently Editing Published Article:
                </p>
                <p className="text-sm font-bold text-[#C8A34D] line-clamp-1">
                  "{editingBlog?.title || formData.title}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X size={13} /> Cancel Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black hover:opacity-95 transition-opacity flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Save size={13} /> Save Now
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: WRITE MODE — CLEAN FORM WITH TITLE, SUBTITLE, KEYWORDS, DESCRIPTION, IMAGE */}
        {activeTab === 'write' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. ARTICLE TITLE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Article Title *
              </label>
              <input
                type="text"
                placeholder="Enter compelling article title (e.g. Landmark Ruling on Anticipatory Bail under Section 482 BNSS 2024)..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-base sm:text-lg font-black bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D]"
                required
              />
            </div>

            {/* 2. ARTICLE SUBTITLE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Subtitle / Overview *
              </label>
              <textarea
                rows={2}
                placeholder="Provide a concise subtitle or brief overview summarizing key legal insights..."
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D] leading-relaxed"
                required
              />
            </div>

            {/* 3. KEYWORDS / TAGS */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. Keywords * (Comma separated)
                </label>
                <span className="text-[10px] text-slate-400">e.g. BNSS 2024, High Court, Bail, Criminal Law</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Anticipatory Bail, Supreme Court, Section 482 BNSS, Trial Procedure"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 pl-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                />
                <Tag size={15} className="absolute left-3.5 top-4 text-slate-400" />
              </div>
            </div>

            {/* 4. COVER IMAGE (IMAGE URL OR LOCAL FILE UPLOAD) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  4. Article Image (Cover / Banner Photo)
                </label>
                <span className="text-[10px] text-slate-400">Supports Image URL or File Upload</span>
              </div>

              {/* URL input and upload button row */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="url"
                    placeholder="Paste image URL (https://images.unsplash.com/...)..."
                    value={formData.image.startsWith('data:') ? 'Image uploaded from device' : formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-9 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#C8A34D]"
                  />
                  <LinkIcon size={14} className="absolute left-3 top-3.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-[#C8A34D]/15 hover:text-[#C8A34D] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload size={14} /> Upload Image
                  </button>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="p-2.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                      title="Remove Image"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Image Preview Thumbnail */}
              {formData.image && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-64 bg-slate-900 flex items-center justify-center shadow-inner group">
                  <img
                    src={formData.image}
                    alt="Article Cover Preview"
                    className="w-full h-48 sm:h-56 object-cover transition-transform group-hover:scale-102 duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-400" /> Image Attached
                  </div>
                </div>
              )}
            </div>

            {/* 5. ARTICLE DESCRIPTION (MAIN CONTENT) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  5. Article Description / Full Content * (Markdown Supported)
                </label>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>Supports:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">### Headings</code>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">* Bullets</code>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">**Bold**</code>
                </div>
              </div>

              <textarea
                rows={16}
                placeholder={`Type or paste your complete article description here...

### 1. Key Judicial Propositions
Describe the facts, procedural posture, and relevant provisions of the Bharatiya Nagarik Suraksha Sanhita (BNSS) or landmark authorities.

### 2. Courtroom Takeaways & Strategy
* Point 1: Essential statutory compliance
* Point 2: Evidentiary thresholds required`}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs sm:text-sm font-sans font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D] leading-relaxed resize-y"
                required
              />
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <Eye size={14} /> Preview Article
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 shadow-md shadow-[#C8A34D]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> {editingId ? 'Updating...' : 'Publishing...'}
                  </>
                ) : editingId ? (
                  <>
                    <Save size={14} /> Save Changes
                  </>
                ) : (
                  <>
                    <Send size={14} /> Publish Article Live
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: LIVE PREVIEW MODE */}
        {activeTab === 'preview' && (
          <article className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 flex items-center gap-1.5">
                <Sparkles size={12} /> Live Article Preview
              </span>
              <button
                onClick={() => setActiveTab('write')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#C8A34D] hover:underline cursor-pointer"
              >
                <Edit3 size={13} /> Return to Editor
              </button>
            </div>

            {/* Cover Image in Preview */}
            {formData.image && (
              <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 max-h-80 w-full">
                <img
                  src={formData.image}
                  alt={formData.title}
                  className="w-full h-64 sm:h-80 object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              {/* Keywords Preview */}
              {formData.keywords && (
                <div className="flex items-center gap-2 flex-wrap">
                  {formData.keywords.split(',').map(t => t.trim()).filter(Boolean).map((kw, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-[#C8A34D]/15 text-[#C8A34D] font-black text-[10px] uppercase tracking-wider border border-[#C8A34D]/25">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight tracking-tight">
                {formData.title || 'Untitled Article'}
              </h1>

              {/* Subtitle */}
              {formData.subtitle && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-slate-900/80 border-l-4 border-[#C8A34D] text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-relaxed font-bold shadow-xs">
                  {formData.subtitle}
                </div>
              )}
            </div>

            {/* Description / Content Preview with Full Markdown Formatting */}
            <div className="article-body-content max-w-none pt-4 border-t border-slate-100 dark:border-slate-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                urlTransform={(val) => val}
                className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed focus:outline-none"
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight mt-8 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight mt-7 mb-3" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight mt-6 mb-3" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-base sm:text-xl font-black text-slate-950 dark:text-white mt-5 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-[15px] leading-relaxed mb-4 font-normal" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-black text-slate-950 dark:text-white" {...props} />
                  ),
                  b: ({ node, ...props }) => (
                    <b className="font-black text-slate-950 dark:text-white" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 mb-5 space-y-2 text-slate-800 dark:text-slate-200 marker:text-[#C8A34D]" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-5 space-y-2 text-slate-800 dark:text-slate-200 marker:text-[#C8A34D] font-bold" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="pl-1 text-slate-800 dark:text-slate-200 text-sm sm:text-[15px] leading-relaxed font-normal" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-t-2 border-slate-200 dark:border-slate-800" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-[#C8A34D] bg-[#C8A34D]/10 dark:bg-[#C8A34D]/15 pl-4 py-3 pr-3 rounded-r-2xl my-5 text-slate-900 dark:text-zinc-100 font-medium italic" {...props} />
                  ),
                  code: ({ node, inline, className, children, ...props }) => (
                    <code className="bg-slate-100 dark:bg-slate-800 text-[#C8A34D] px-1.5 py-0.5 rounded-md font-mono text-xs border border-slate-200 dark:border-slate-700" {...props}>
                      {children}
                    </code>
                  ),
                  pre: ({ node, children, ...props }) => (
                    <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto my-4 shadow-sm border border-slate-800" {...props}>
                      {children}
                    </pre>
                  )
                }}
              >
                {formData.description || 'Article description will be formatted here...'}
              </ReactMarkdown>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 size={13} /> Return to Editor
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#C8A34D] to-[#B38628] hover:opacity-95 shadow-md shadow-[#C8A34D]/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> {editingId ? 'Saving...' : 'Publishing...'}
                  </>
                ) : editingId ? (
                  <>
                    <Save size={13} /> Save & Update Now
                  </>
                ) : (
                  <>
                    <Send size={13} /> Publish This Article Now
                  </>
                )}
              </button>
            </div>
          </article>
        )}

        {/* TAB 3: PUBLISHED ARTICLES HISTORY & ARCHIVE */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30">
                    Editorial Archive & History
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Total Articles: <strong className="text-slate-900 dark:text-white">{publishedList.length}</strong>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Published Journal Articles
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  View, inspect, edit or delete any article currently published live on the AI LEGAL™ Journal.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={fetchPublishedList}
                  disabled={loadingList}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#C8A34D] transition-colors cursor-pointer"
                  title="Refresh Article List"
                >
                  <RefreshCw size={15} className={loadingList ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => { handleCancelEdit(); setActiveTab('write'); }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B38628] text-[#111111] text-xs font-black hover:opacity-95 shadow-md shadow-[#C8A34D]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Write New Article
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search published articles by title, subtitle, keywords..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-10 py-3.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#C8A34D] shadow-xs"
              />
              <Search size={16} className="absolute left-4 top-4 text-slate-400" />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Articles List */}
            {loadingList ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
                <RefreshCw size={24} className="animate-spin text-[#C8A34D] mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-500">Loading published articles archive...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-3">
                <BookOpen size={36} className="text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  {historySearch ? 'No matching articles found' : 'No articles published yet'}
                </h3>
                <button
                  type="button"
                  onClick={() => { handleCancelEdit(); setActiveTab('write'); }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black hover:opacity-95"
                >
                  <Plus size={14} /> Write Your First Article
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((blog, idx) => {
                  const blogId = blog._id || blog.slug;
                  const isCurrentEditing = editingId === blogId || editingId === blog.slug;
                  const blogImg = blog.image || blog.coverImage;

                  return (
                    <div
                      key={blogId || idx}
                      className={`p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0F172A] border transition-all duration-200 shadow-xs hover:shadow-md ${
                        isCurrentEditing
                          ? 'border-[#C8A34D] ring-2 ring-[#C8A34D]/30 bg-amber-50/20'
                          : 'border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Thumbnail Image if present */}
                        {blogImg && (
                          <div className="w-full md:w-36 h-28 rounded-2xl overflow-hidden shrink-0 bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <img
                              src={blogImg}
                              alt={blog.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}

                        {/* Article Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400">
                              {blog.date || (blog.createdAt ? new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently')}
                            </span>
                            {isCurrentEditing && (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white">
                                Currently in Editor
                              </span>
                            )}
                          </div>

                          <h3
                            onClick={() => handleEdit(blog)}
                            className="text-base sm:text-lg font-black text-slate-900 dark:text-white hover:text-[#C8A34D] cursor-pointer transition-colors leading-snug line-clamp-2"
                          >
                            {blog.title}
                          </h3>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                            {blog.subtitle || blog.summary}
                          </p>

                          {/* Keywords preview */}
                          {blog.keywords && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {(Array.isArray(blog.keywords) ? blog.keywords : (blog.keywords || '').split(',')).slice(0, 4).map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  #{typeof kw === 'string' ? kw.trim() : kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 w-full md:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#C8A34D]/15 hover:text-[#C8A34D] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Open Article in New Tab"
                          >
                            <Eye size={14} /> View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(blog)}
                            className="px-3.5 py-2 rounded-xl bg-[#C8A34D]/20 text-[#C8A34D] hover:bg-[#C8A34D] hover:text-[#111111] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Edit this article in publisher"
                          >
                            <Edit3 size={14} /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(blog)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-500/15 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete article"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
