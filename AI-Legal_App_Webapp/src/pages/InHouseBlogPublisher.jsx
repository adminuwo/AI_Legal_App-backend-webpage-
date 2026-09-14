import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Sparkles, Eye, Edit3, BookOpen, Tag,
  Clock, CheckCircle2, AlertCircle, FileText, Smartphone,
  Layers, Hash, RefreshCw, Check, Trash2, History, Plus,
  Search, ExternalLink, X, Save, Image as ImageIcon, Upload, Link as LinkIcon,
  Scale, Phone, Mail, Star, Download, XCircle
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

  // History Sub-Tab: 'articles' | 'judgments'
  const [historySubTab, setHistorySubTab] = useState('articles');

  // History & Management State
  const [publishedList, setPublishedList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);

  // Posted Advocate Judgements State & Telemetry
  const [judgmentsList, setJudgmentsList] = useState([]);
  const [judgmentsStats, setJudgmentsStats] = useState({ total: 0, pending: 0, approved: 0, featured: 0, rejected: 0 });
  const [judgmentsLoading, setJudgmentsLoading] = useState(false);
  const [judgmentsSearch, setJudgmentsSearch] = useState('');
  const [judgmentsStatusFilter, setJudgmentsStatusFilter] = useState('All');
  const [selectedPdfModal, setSelectedPdfModal] = useState(null);
  const [selectedJudgmentDetail, setSelectedJudgmentDetail] = useState(null);
  const [deleteJudgmentModal, setDeleteJudgmentModal] = useState(null);
  const [judgmentActionLoading, setJudgmentActionLoading] = useState(false);

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

  // Fetch Posted Judgements for Review
  const fetchJudgments = async (search = judgmentsSearch, status = judgmentsStatusFilter) => {
    setJudgmentsLoading(true);
    try {
      let token = null;
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        token = u?.token || localStorage.getItem('token');
      } catch (e) {}

      const params = new URLSearchParams();
      if (search && search.trim()) params.append('search', search.trim());
      if (status && status !== 'All') params.append('status', status);

      const res = await axios.get(`${backendBase}/api/admin/judgment-submissions?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        setJudgmentsList(res.data.submissions || []);
        if (res.data.stats) {
          setJudgmentsStats(res.data.stats);
        }
      } else {
        toast.error(res.data?.message || 'Failed to load judgments');
      }
    } catch (err) {
      console.error('Failed to fetch judgments:', err);
      toast.error('Failed to load posted judgments');
    } finally {
      setJudgmentsLoading(false);
    }
  };

  const handleUpdateJudgmentStatus = async (id, newStatus, adminNotes = '') => {
    setJudgmentActionLoading(true);
    try {
      let token = null;
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        token = u?.token || localStorage.getItem('token');
      } catch (e) {}

      const res = await axios.patch(
        `${backendBase}/api/admin/judgment-submissions/${id}/status`,
        { status: newStatus, adminNotes },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        toast.success(`Status updated to "${newStatus}"!`);
        setJudgmentsList(prev => prev.map(item => item._id === id ? { ...item, status: newStatus, adminNotes } : item));
        if (selectedJudgmentDetail && selectedJudgmentDetail._id === id) {
          setSelectedJudgmentDetail(prev => ({ ...prev, status: newStatus, adminNotes }));
        }
        fetchJudgments(judgmentsSearch, judgmentsStatusFilter);
      } else {
        toast.error(res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Status update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setJudgmentActionLoading(false);
    }
  };

  const handleDeleteJudgment = async (id) => {
    try {
      let token = null;
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        token = u?.token || localStorage.getItem('token');
      } catch (e) {}

      const res = await axios.delete(`${backendBase}/api/admin/judgment-submissions/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data?.success) {
        toast.success('Judgment submission deleted permanently');
        setJudgmentsList(prev => prev.filter(item => item._id !== id));
        setDeleteJudgmentModal(null);
        if (selectedJudgmentDetail && selectedJudgmentDetail._id === id) {
          setSelectedJudgmentDetail(null);
        }
        fetchJudgments(judgmentsSearch, judgmentsStatusFilter);
      } else {
        toast.error(res.data?.message || 'Failed to delete submission');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete judgment submission');
    }
  };

  const getJudgmentDocumentUrl = (item) => {
    if (!item) return '';
    if (item._id) {
      return `${backendBase}/api/judgment-submissions/${item._id}/view-pdf`;
    }
    if (item.pdfUrl && item.pdfUrl.startsWith('/uploads/')) {
      return `${backendBase}${item.pdfUrl}`;
    }
    return item.pdfUrl || item.pdfData || '';
  };

  useEffect(() => {
    fetchPublishedList();
    fetchJudgments();
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
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] transition-colors"
              title="Back to Blog"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-8 h-8 object-contain" />
              <div>
                <span className="text-base font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
                  AI LEGAL<span className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#B88B2A] block -mt-1">
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
                    ? 'bg-white dark:bg-[#0B0F19] text-[#B88B2A] shadow-xs'
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
                    ? 'bg-white dark:bg-[#0B0F19] text-[#B88B2A] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Eye size={13} /> Preview
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('history'); fetchPublishedList(); fetchJudgments(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-[#0B0F19] text-[#B88B2A] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <History size={13} /> History
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#B88B2A]/20 text-[#B88B2A]">
                  {publishedList.length + (judgmentsStats.total || judgmentsList.length)}
                </span>
              </button>
            </div>

            <ThemeToggle />

            {/* Action Button: Publish or Save Changes */}
            {activeTab !== 'history' && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 shadow-md shadow-[#B88B2A]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
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
                className="px-4 py-2 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 shadow-md shadow-[#B88B2A]/25 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus size={14} /> New Article
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`${activeTab === 'history' && historySubTab === 'judgments' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 transition-all`}>
        
        {/* EDITING MODE ALERT BANNER */}
        {editingId && activeTab === 'write' && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-[#B88B2A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#B88B2A] text-[#111111] flex items-center justify-center shrink-0 font-black">
                <Edit3 size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B88B2A] animate-ping" />
                  Currently Editing Published Article:
                </p>
                <p className="text-sm font-bold text-[#B88B2A] line-clamp-1">
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
                className="px-3.5 py-1.5 rounded-xl bg-[#B88B2A] text-[#111111] text-xs font-black hover:opacity-95 transition-opacity flex items-center gap-1 cursor-pointer shadow-xs"
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
                className="w-full text-base sm:text-lg font-black bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#B88B2A]"
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
                className="w-full text-xs sm:text-sm font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#B88B2A] leading-relaxed"
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
                  className="w-full text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 pl-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#B88B2A]"
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
                    className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-9 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#B88B2A]"
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
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                className="w-full text-xs sm:text-sm font-sans font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#B88B2A] leading-relaxed resize-y"
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
                className="px-6 py-2.5 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 shadow-md shadow-[#B88B2A]/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                className="inline-flex items-center gap-1 text-xs font-bold text-[#B88B2A] hover:underline cursor-pointer"
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
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-[#B88B2A]/15 text-[#B88B2A] font-black text-[10px] uppercase tracking-wider border border-[#B88B2A]/25">
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
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-slate-900/80 border-l-4 border-[#B88B2A] text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-relaxed font-bold shadow-xs">
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
                    <ul className="list-disc pl-6 mb-5 space-y-2 text-slate-800 dark:text-slate-200 marker:text-[#B88B2A]" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-5 space-y-2 text-slate-800 dark:text-slate-200 marker:text-[#B88B2A] font-bold" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="pl-1 text-slate-800 dark:text-slate-200 text-sm sm:text-[15px] leading-relaxed font-normal" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-t-2 border-slate-200 dark:border-slate-800" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-[#B88B2A] bg-[#B88B2A]/10 dark:bg-[#B88B2A]/15 pl-4 py-3 pr-3 rounded-r-2xl my-5 text-slate-900 dark:text-zinc-100 font-medium italic" {...props} />
                  ),
                  code: ({ node, inline, className, children, ...props }) => (
                    <code className="bg-slate-100 dark:bg-slate-800 text-[#B88B2A] px-1.5 py-0.5 rounded-md font-mono text-xs border border-slate-200 dark:border-slate-700" {...props}>
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
                className="px-5 py-2.5 rounded-full text-xs font-black text-[#111111] bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 shadow-md shadow-[#B88B2A]/25 transition-all flex items-center gap-1.5 cursor-pointer"
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

        {/* TAB 3: PUBLISHED ARTICLES & POSTED ADVOCATE JUDGEMENTS */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* SUB-TABS: Published Articles vs Posted Judgements */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setHistorySubTab('articles')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  historySubTab === 'articles'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <BookOpen size={14} className="text-[#B88B2A]" />
                <span>Published Articles</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#B88B2A]/20 text-[#B88B2A]">
                  {publishedList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setHistorySubTab('judgments'); fetchJudgments(); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  historySubTab === 'judgments'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Scale size={14} className="text-[#B88B2A]" />
                <span>Posted Judgements</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#B88B2A]/20 text-[#B88B2A]">
                  {judgmentsStats.total || judgmentsList.length}
                </span>
              </button>
            </div>

            {historySubTab === 'articles' ? (
              /* Published Articles Section */
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30">
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
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#B88B2A] transition-colors cursor-pointer"
                      title="Refresh Article List"
                    >
                      <RefreshCw size={15} className={loadingList ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleCancelEdit(); setActiveTab('write'); }}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B88B2A] to-[#B38628] text-[#111111] text-xs font-black hover:opacity-95 shadow-md shadow-[#B88B2A]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                    className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-10 py-3.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#B88B2A] shadow-xs"
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
                    <RefreshCw size={24} className="animate-spin text-[#B88B2A] mx-auto mb-3" />
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
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B88B2A] text-[#111111] text-xs font-black hover:opacity-95"
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
                              ? 'border-[#B88B2A] ring-2 ring-[#B88B2A]/30 bg-amber-50/20'
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
                                className="text-base sm:text-lg font-black text-slate-900 dark:text-white hover:text-[#B88B2A] cursor-pointer transition-colors leading-snug line-clamp-2"
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
                                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#B88B2A]/15 hover:text-[#B88B2A] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Open Article in New Tab"
                              >
                                <Eye size={14} /> View
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(blog)}
                                className="px-3.5 py-2 rounded-xl bg-[#B88B2A]/20 text-[#B88B2A] hover:bg-[#B88B2A] hover:text-[#111111] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
            ) : (
              /* Posted Advocate Judgements Section (Exact Admin Portal UI) */
              <div className="space-y-5 sm:space-y-6">
                {/* Header / Overview Hero Banner */}
                <div className="bg-gradient-to-r from-amber-500/15 via-[#B88B2A]/10 to-transparent dark:from-amber-500/20 dark:via-[#B88B2A]/10 dark:to-transparent rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#B88B2A]/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#B88B2A]/30 flex items-center justify-center text-[#B88B2A] shadow-xs shrink-0">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#B88B2A] bg-[#B88B2A]/10 px-2 py-0.5 rounded-md border border-[#B88B2A]/20">
                          Community Precedents
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                          Advocate Submissions Console
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                        Posted Advocate Judgements
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                        Review legal judgments and orders submitted by advocates across India. Scrutinize case matters, inspect attached PDFs, verify Bar Council credentials, and publish directly to AI Legal™ case research pool.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fetchJudgments(judgmentsSearch, judgmentsStatusFilter)}
                      disabled={judgmentsLoading}
                      className="px-3.5 py-2 bg-white dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#B88B2A] ${judgmentsLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open('/post-judgment', '_blank')}
                      className="px-3.5 py-2 bg-[#B88B2A] hover:bg-[#b08d3b] text-[#111111] text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Public Form</span>
                    </button>
                  </div>
                </div>

                {/* Telemetry Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {judgmentsStats.total || 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received</div>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl font-black text-amber-500">
                        {judgmentsStats.pending || 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</div>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl font-black text-emerald-500">
                        {(judgmentsStats.approved || 0) + (judgmentsStats.featured || 0)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved / Featured</div>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl font-black text-rose-500">
                        {judgmentsStats.rejected || 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by advocate, enrolment, matter, email..."
                      value={judgmentsSearch}
                      onChange={(e) => {
                        setJudgmentsSearch(e.target.value);
                        fetchJudgments(e.target.value, judgmentsStatusFilter);
                      }}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#B88B2A]"
                    />
                    {judgmentsSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setJudgmentsSearch('');
                          fetchJudgments('', judgmentsStatusFilter);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                    {['All', 'Pending', 'Approved', 'Featured', 'Rejected'].map(st => {
                      const isActive = judgmentsStatusFilter === st;
                      const count = st === 'All' ? judgmentsStats.total : judgmentsStats[st.toLowerCase()];
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setJudgmentsStatusFilter(st);
                            fetchJudgments(judgmentsSearch, st);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            isActive
                              ? 'bg-[#B88B2A] text-[#111111] shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{st}</span>
                          {count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              isActive ? 'bg-[#111111]/20 text-[#111111]' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Advocate & Enrolment</th>
                          <th className="py-3 px-4">Case Matter / Summary</th>
                          <th className="py-3 px-4">Contact & Socials</th>
                          <th className="py-3 px-4">Judgment PDF</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {judgmentsList.map(item => {
                          const docUrl = getJudgmentDocumentUrl(item);

                          return (
                            <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                              {/* Advocate & Enrolment */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {item.profilePhotoUrl ? (
                                    <img
                                      src={item.profilePhotoUrl}
                                      alt={item.advocateName}
                                      className="w-10 h-10 rounded-xl object-cover border border-[#B88B2A]/30 shadow-xs shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B88B2A]/20 to-amber-600/10 border border-[#B88B2A]/30 flex items-center justify-center text-[#B88B2A] font-black text-sm shrink-0">
                                      {item.advocateName?.charAt(0) || 'A'}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                      <span>{item.advocateName}</span>
                                      {item.status === 'Featured' && (
                                        <Star className="w-3.5 h-3.5 text-[#B88B2A] fill-[#B88B2A] shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-[#B88B2A] truncate">
                                      {item.enrolmentNumber}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Matter */}
                              <td className="py-3.5 px-4 max-w-xs">
                                <p className="line-clamp-2 text-slate-600 dark:text-slate-300 text-xs leading-relaxed" title={item.matter}>
                                  {item.matter}
                                </p>
                                {item.consentGiven && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Consent Verified
                                  </span>
                                )}
                              </td>

                              {/* Contacts */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.whatsappNumber && (
                                    <a
                                      href={`https://wa.me/${item.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"
                                      title={`WhatsApp: ${item.whatsappNumber}`}
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {item.email && (
                                    <a
                                      href={`mailto:${item.email}`}
                                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all"
                                      title={`Email: ${item.email}`}
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {item.linkedinUrl && (
                                    <a
                                      href={item.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-all"
                                      title="LinkedIn Profile"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {item.instagramId && (
                                    <a
                                      href={`https://instagram.com/${item.instagramId.replace('@', '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-all font-black text-[10px]"
                                      title={`Instagram: ${item.instagramId}`}
                                    >
                                      IG
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Judgment PDF & In-App View */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPdfModal({
                                      url: docUrl || item.pdfData,
                                      title: item.pdfFileName || `${item.advocateName} - Order`,
                                      advocateName: item.advocateName,
                                      enrolmentNumber: item.enrolmentNumber,
                                      fileSize: item.pdfFileSize
                                    })}
                                    className="px-2.5 py-1 rounded-lg bg-[#B88B2A]/15 hover:bg-[#B88B2A]/25 text-[#B88B2A] border border-[#B88B2A]/30 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                    title="Open in-app PDF Viewer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View PDF</span>
                                  </button>

                                  <a
                                    href={docUrl || item.pdfData}
                                    download={item.pdfFileName || 'judgement.pdf'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                    title="Download PDF directly"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={item.pdfFileName}>
                                  {item.pdfFileName || (item.pdfFileSize ? `${(item.pdfFileSize / (1024 * 1024)).toFixed(1)} MB` : 'PDF file')}
                                </div>
                              </td>

                              {/* Inline Status Dropdown */}
                              <td className="py-3.5 px-4">
                                <select
                                  value={item.status}
                                  onChange={(e) => handleUpdateJudgmentStatus(item._id, e.target.value)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border cursor-pointer focus:outline-none transition-all ${
                                    item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                    item.status === 'Featured' ? 'bg-[#B88B2A]/15 text-[#B88B2A] border-[#B88B2A]/30' :
                                    item.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Featured">Featured</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </td>

                              {/* Date */}
                              <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedJudgmentDetail(item)}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                    title="View Complete Dossier"
                                  >
                                    Details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteJudgmentModal({ id: item._id, name: item.advocateName })}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Delete Submission"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {judgmentsList.length === 0 && !judgmentsLoading && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                              <p className="font-bold text-slate-700 dark:text-slate-300">No judgment submissions found</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {judgmentsSearch || judgmentsStatusFilter !== 'All'
                                  ? 'No records match your active search or filter criteria.'
                                  : 'Submissions from advocates via "+ Post your judgement" will appear here automatically.'}
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── In-App PDF Document Viewer Modal ─────────────────────────────── */}
      {selectedPdfModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-zinc-900/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#B88B2A]/20 text-[#B88B2A] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#B88B2A]/20 text-[#B88B2A]">
                      Legal Order / Judgment
                    </span>
                    {selectedPdfModal.enrolmentNumber && (
                      <span className="text-[10px] font-mono font-bold text-slate-400 truncate">
                        {selectedPdfModal.enrolmentNumber}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
                    {selectedPdfModal.title || 'Case Precedent Judgment'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Submitted by: <strong className="text-slate-700 dark:text-slate-200">{selectedPdfModal.advocateName || 'Advocate'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Download Button */}
                <a
                  href={selectedPdfModal.url}
                  download={selectedPdfModal.title || 'judgement.pdf'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-700 transition-all flex items-center gap-1.5"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5 text-[#B88B2A]" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                {/* Open in New Tab Button */}
                <a
                  href={selectedPdfModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-zinc-700 transition-all flex items-center gap-1.5"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPdfModal(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF Embedded Frame */}
            <div className="flex-1 bg-slate-100 dark:bg-[#0B0F19] relative overflow-hidden flex flex-col">
              <object
                data={selectedPdfModal.url}
                type="application/pdf"
                className="w-full h-full border-0 rounded-b-2xl"
                title={selectedPdfModal.title || 'PDF Document'}
              >
                <iframe
                  src={selectedPdfModal.url}
                  className="w-full h-full border-0 rounded-b-2xl"
                  title={selectedPdfModal.title || 'PDF Document'}
                />
              </object>
              
              {/* Fallback bar with Open Direct PDF & Download options */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 text-center shrink-0 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                <span>PDF preview not rendering in browser window?</span>
                <div className="flex items-center gap-3">
                  <a
                    href={selectedPdfModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#B88B2A] hover:underline flex items-center gap-1"
                  >
                    Open Direct in New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={selectedPdfModal.url}
                    download={selectedPdfModal.title || 'judgement.pdf'}
                    className="font-bold text-slate-700 dark:text-zinc-200 hover:text-[#B88B2A] flex items-center gap-1"
                  >
                    Download <Download className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Advocate Judgment Dossier Modal ────────────────────────────────────── */}
      {selectedJudgmentDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-700 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {selectedJudgmentDetail.profilePhotoUrl ? (
                  <img
                    src={selectedJudgmentDetail.profilePhotoUrl}
                    alt={selectedJudgmentDetail.advocateName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#B88B2A]/40 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B88B2A]/20 to-amber-600/10 border-2 border-[#B88B2A]/30 flex items-center justify-center text-[#B88B2A] font-black text-xl shadow-sm">
                    {selectedJudgmentDetail.advocateName?.charAt(0) || 'A'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {selectedJudgmentDetail.advocateName}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      selectedJudgmentDetail.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      selectedJudgmentDetail.status === 'Featured' ? 'bg-[#B88B2A]/15 text-[#B88B2A] border-[#B88B2A]/30' :
                      selectedJudgmentDetail.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {selectedJudgmentDetail.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-[#B88B2A] mt-0.5">
                    {selectedJudgmentDetail.enrolmentNumber}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Submitted on {new Date(selectedJudgmentDetail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJudgmentDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Contact Links & Verification */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Advocate Contact & Socials</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedJudgmentDetail.whatsappNumber && (
                    <a
                      href={`https://wa.me/${selectedJudgmentDetail.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/20 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedJudgmentDetail.whatsappNumber}</span>
                    </a>
                  )}

                  {selectedJudgmentDetail.email && (
                    <a
                      href={`mailto:${selectedJudgmentDetail.email}`}
                      className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-2 hover:bg-blue-500/20 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedJudgmentDetail.email}</span>
                    </a>
                  )}

                  {selectedJudgmentDetail.linkedinUrl && (
                    <a
                      href={selectedJudgmentDetail.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-2 hover:bg-sky-500/20 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">LinkedIn Profile</span>
                    </a>
                  )}

                  {selectedJudgmentDetail.instagramId && (
                    <a
                      href={`https://instagram.com/${selectedJudgmentDetail.instagramId.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-bold flex items-center gap-2 hover:bg-pink-500/20 transition-all font-black text-[10px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Instagram ({selectedJudgmentDetail.instagramId})</span>
                    </a>
                  )}

                  {selectedJudgmentDetail.twitterUrl && (
                    <a
                      href={selectedJudgmentDetail.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 hover:bg-slate-500/20 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">X / Twitter</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Matter / Case Description */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Case Matter & Strategic Takeaways</label>
                <div className="mt-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {selectedJudgmentDetail.matter || 'No detailed description provided.'}
                </div>
              </div>

              {/* Attached Judgment PDF Card */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Attached Legal Order / Judgment</label>
                <div className="mt-1.5 p-3.5 rounded-2xl bg-[#B88B2A]/5 border border-[#B88B2A]/25 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#B88B2A]/20 text-[#B88B2A] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedJudgmentDetail.pdfFileName || 'judgement_record.pdf'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {selectedJudgmentDetail.pdfFileSize ? `${(selectedJudgmentDetail.pdfFileSize / (1024 * 1024)).toFixed(2)} MB` : 'PDF Document'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const docUrl = getJudgmentDocumentUrl(selectedJudgmentDetail);
                        setSelectedPdfModal({
                          url: docUrl || selectedJudgmentDetail.pdfData,
                          title: selectedJudgmentDetail.pdfFileName || 'Judgment PDF',
                          advocateName: selectedJudgmentDetail.advocateName,
                          enrolmentNumber: selectedJudgmentDetail.enrolmentNumber,
                          fileSize: selectedJudgmentDetail.pdfFileSize
                        });
                      }}
                      className="px-3 py-1.5 bg-[#B88B2A] hover:bg-[#b08d3b] text-[#111111] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </button>

                    <a
                      href={getJudgmentDocumentUrl(selectedJudgmentDetail) || selectedJudgmentDetail.pdfData}
                      download={selectedJudgmentDetail.pdfFileName || 'judgement.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-[#B88B2A]" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Status Update Actions */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Change Verification Status</label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Pending', 'Approved', 'Featured', 'Rejected'].map(st => (
                    <button
                      key={st}
                      type="button"
                      disabled={judgmentActionLoading}
                      onClick={() => handleUpdateJudgmentStatus(selectedJudgmentDetail._id, st)}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                        selectedJudgmentDetail.status === st
                          ? 'bg-[#B88B2A] text-[#111111] border-[#B88B2A] shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Submission Confirm Modal ─────────────────────────────── */}
      {deleteJudgmentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">Delete Judgment Submission?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to permanently delete submission by <strong className="text-slate-700 dark:text-slate-200">{deleteJudgmentModal.name}</strong>? This action cannot be reversed.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteJudgmentModal(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJudgment(deleteJudgmentModal.id)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
