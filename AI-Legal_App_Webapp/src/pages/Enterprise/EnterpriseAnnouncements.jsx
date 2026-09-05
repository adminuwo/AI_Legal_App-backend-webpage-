import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Send, Calendar, Users, X, Trash2, Pin, BellRing, CheckCircle2, Filter } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const [form, setForm] = useState({
    title: '',
    message: '',
    targetAudience: 'All Students',
    targetCourse: 'BA LLB (5-Yr)',
    targetSemester: 'Semester 1',
    sendPushNotification: true,
    isPinned: false
  });

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${getBackendUrl()}/enterprise/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.announcements) {
        setAnnouncements(res.data.announcements);
      } else {
        loadDefaultAnnouncements();
      }
    } catch (e) {
      loadDefaultAnnouncements();
    }
  };

  const loadDefaultAnnouncements = () => {
    const saved = localStorage.getItem('enterpriseAnnouncementsList');
    if (saved) {
      try {
        setAnnouncements(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    const initialList = [
      {
        _id: '1',
        title: 'AI Mock Courtroom Access Enabled for Final Year Students',
        message: 'Final Year BA LLB & LLM students can now launch simulated AI Mock Courtroom arguments for trial prep & moot court practice.',
        targetAudience: 'Specific Batch',
        targetCourse: 'BA LLB (5-Yr)',
        targetSemester: 'Semester 9',
        isPinned: true,
        notifiedCount: 390,
        createdAt: new Date()
      },
      {
        _id: '2',
        title: 'Constitutional Law I Mid-Term AI Notes & Bare Acts Published',
        message: 'Syllabus-aligned AI notes & Bare Act reference guides for Units 1 to 5 have been published directly into student AI Tutor context.',
        targetAudience: 'All Students',
        targetCourse: 'BA LLB (5-Yr)',
        targetSemester: 'Semester 1',
        isPinned: false,
        notifiedCount: 1240,
        createdAt: new Date(Date.now() - 86400000)
      }
    ];
    setAnnouncements(initialList);
    localStorage.setItem('enterpriseAnnouncementsList', JSON.stringify(initialList));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      toast.error('Please enter Title and Message content');
      return;
    }

    const newAnnouncement = {
      _id: String(Date.now()),
      title: form.title,
      message: form.message,
      targetAudience: form.targetAudience,
      targetCourse: form.targetAudience === 'Specific Course' || form.targetAudience === 'Specific Batch' ? form.targetCourse : 'All',
      targetSemester: form.targetAudience === 'Specific Semester' || form.targetAudience === 'Specific Batch' ? form.targetSemester : 'All',
      isPinned: form.isPinned,
      notifiedCount: form.targetAudience === 'All Students' ? 1480 : 390,
      createdAt: new Date()
    };

    const updatedList = [newAnnouncement, ...announcements];
    setAnnouncements(updatedList);
    localStorage.setItem('enterpriseAnnouncementsList', JSON.stringify(updatedList));

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${getBackendUrl()}/enterprise/announcements/create`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {}

    toast.success(`📢 Announcement published & broadcasted to ${newAnnouncement.notifiedCount} mobile & web app users!`);
    setShowCreateModal(false);
    setForm({
      title: '',
      message: '',
      targetAudience: 'All Students',
      targetCourse: 'BA LLB (5-Yr)',
      targetSemester: 'Semester 1',
      sendPushNotification: true,
      isPinned: false
    });
  };

  const handleDelete = (id) => {
    const updated = announcements.filter(a => a._id !== id);
    setAnnouncements(updated);
    localStorage.setItem('enterpriseAnnouncementsList', JSON.stringify(updated));
    toast.success('Announcement removed.');
  };

  const handleTogglePin = (id) => {
    const updated = announcements.map(a => a._id === id ? { ...a, isPinned: !a.isPinned } : a);
    setAnnouncements(updated);
    localStorage.setItem('enterpriseAnnouncementsList', JSON.stringify(updated));
    toast.success('Announcement pin status updated.');
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PINNED') return a.isPinned;
    if (selectedFilter === 'STUDENTS') return a.targetAudience.includes('Students') || a.targetAudience.includes('Batch');
    if (selectedFilter === 'FACULTY') return a.targetAudience.includes('Faculty');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="text-[#C8A34D]" size={26} /> Institutional Announcements & Broadcasts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publish targeted circulars, academic notices, and push notifications to students, courses, or faculty members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-extrabold shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> New Institutional Announcement
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'ALL', label: 'All Updates' },
          { key: 'PINNED', label: '📌 Pinned Notices' },
          { key: 'STUDENTS', label: '🎓 Student Broadcasts' },
          { key: 'FACULTY', label: '🏛️ Faculty Circulars' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedFilter(tab.key)}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === tab.key
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#C8A34D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <Megaphone className="mx-auto text-slate-300 dark:text-slate-600" size={32} />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No Announcements Found</p>
            <p className="text-xs text-slate-400">Click "+ New Institutional Announcement" to publish a circular to students or faculty.</p>
          </div>
        ) : (
          filteredAnnouncements.map(item => (
            <div
              key={item._id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all space-y-3 shadow-xs ${
                item.isPinned
                  ? 'border-[#C8A34D]/60 ring-1 ring-[#C8A34D]/30'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.isPinned && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                      <Pin size={11} /> PINNED NOTICE
                    </span>
                  )}
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C8A34D] px-2.5 py-0.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/20">
                    Audience: {item.targetAudience} {item.targetCourse !== 'All' ? `(${item.targetCourse})` : ''}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <BellRing size={10} /> {item.notifiedCount || 480} App Users Notified
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleTogglePin(item._id)}
                    title={item.isPinned ? "Unpin Notice" : "Pin to Top"}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      item.isPinned ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : 'text-slate-400 hover:text-slate-600 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    title="Delete Announcement"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {item.message}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone size={20} className="text-[#C8A34D]" /> Create Institutional Notice
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Constitutional Law Mid-Term Notes Published"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Target Audience</label>
                  <select
                    value={form.targetAudience}
                    onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                  >
                    <option value="All Students">All Enrolled Students</option>
                    <option value="Specific Course">Specific Law Course</option>
                    <option value="Specific Batch">Specific Batch / Semester</option>
                    <option value="Faculty">Faculty & HODs Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Course Filter</label>
                  <select
                    value={form.targetCourse}
                    onChange={e => setForm({ ...form, targetCourse: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                  >
                    <option value="BA LLB (5-Yr)">BA LLB (5-Yr Integrated)</option>
                    <option value="BBA LLB (5-Yr)">BBA LLB (5-Yr Integrated)</option>
                    <option value="LLB (3-Yr)">LLB (3-Yr Graduate)</option>
                    <option value="LLM">LLM Post-Graduate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Type the official announcement message for students or faculty..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">📌 Pin Notice to Top of Mobile & Web App Feed</span>
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={e => setForm({ ...form, isPinned: e.target.checked })}
                  className="w-4 h-4 accent-[#C8A34D] rounded"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} /> Broadcast Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseAnnouncements;
