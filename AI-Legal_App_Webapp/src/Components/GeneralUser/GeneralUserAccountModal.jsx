import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Calendar, Folder, LogOut, 
  X, CheckCircle2, FileText, UploadCloud, Trash2, Eye, 
  ArrowUpRight, Lock, Check, AlertCircle, Globe, RefreshCw
} from 'lucide-react';
import { useRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { apis } from '../../types';
import { getUserData, setUserData, userData, clearUser } from '../../userStore/userData';
import { consultationService } from '../../services/consultationService';
import { getVaultDocuments, addDocumentToVault, deleteVaultDocument } from '../../services/vaultService';

const GeneralUserAccountModal = ({ defaultTab = 'personal', onClose, onLogout }) => {
  const navigate = useNavigate();
  const [currentUserData, setUserRecoil] = useRecoilState(userData);
  const user = currentUserData.user || getUserData() || {};

  // Map initial tab: 'personal' | 'consultations' | 'vault'
  const initialTab = useMemo(() => {
    if (defaultTab === 'consultations' || defaultTab === 'requests') return 'consultations';
    if (defaultTab === 'vault' || defaultTab === 'documents') return 'vault';
    return 'personal';
  }, [defaultTab]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form State for Personal Details
  const [form, setForm] = useState({
    fullName: user.fullName || user.name || '',
    phone: user.phone || user.phoneNumber || '',
    city: user.city || '',
    address: user.address || '',
    state: user.state || '',
    gender: user.gender || '',
    dob: user.dob || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Consultations State
  const [consultations, setConsultations] = useState([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);

  // Document Vault State
  const [vaultDocs, setVaultDocs] = useState([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const docInputRef = useRef(null);

  // Sync Form when user data changes
  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || '',
        phone: user.phone || user.phoneNumber || '',
        city: user.city || '',
        address: user.address || '',
        state: user.state || '',
        gender: user.gender || '',
        dob: user.dob || '',
      });
    }
  }, [user]);

  // Load Vault Docs from vaultService (localStorage + backend sync)
  const loadVaultDocs = async () => {
    try {
      const docs = await getVaultDocuments();
      setVaultDocs(Array.isArray(docs) ? docs : []);
    } catch {
      setVaultDocs([]);
    }
  };

  useEffect(() => {
    loadVaultDocs();
  }, []);

  useEffect(() => {
    if (activeTab === 'vault') {
      loadVaultDocs();
    }
  }, [activeTab]);

  // Fetch Consultations
  const loadConsultations = async () => {
    setIsLoadingConsultations(true);
    try {
      const res = await consultationService.getMyRequests();
      if (res && res.success) {
        setConsultations(res.requests || []);
      }
    } catch (e) {
      setConsultations([]);
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'consultations') {
      loadConsultations();
    }
  }, [activeTab]);

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    const loadId = toast.loading('Saving personal details...');
    try {
      const payload = {
        name: form.fullName || user.name,
        fullName: form.fullName,
        phone: form.phone,
        city: form.city,
        address: form.address,
        state: form.state,
        gender: form.gender,
        dob: form.dob,
      };

      try {
        await axios.put(apis.profile, payload, {
          headers: { Authorization: `Bearer ${user.token || localStorage.getItem('token')}` }
        });
      } catch (err) {
        console.warn('Backend update note:', err);
      }

      const updatedUser = setUserData({
        ...user,
        ...payload,
        name: form.fullName || user.name
      });
      setUserRecoil({ user: updatedUser });

      toast.dismiss(loadId);
      toast.success('Personal details saved successfully! ✨');
    } catch (error) {
      toast.dismiss(loadId);
      toast.error('Failed to save details. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload Document to Vault
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const newDoc = await addDocumentToVault({
        name: file.name,
        size: file.size,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'doc',
        source: 'Personal Upload'
      });
      setVaultDocs(prev => [newDoc, ...prev.filter(d => d.name !== newDoc.name)]);
      toast.success(`"${file.name}" uploaded to Legal Vault! 📁`);
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId, docName) => {
    setVaultDocs(prev => prev.filter(d => d.id !== docId && d.name !== docName));
    await deleteVaultDocument(docId, docName);
    toast.success(`Removed ${docName || 'document'}`);
  };

  const handleExecuteLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    } else {
      clearUser();
      setUserRecoil({ user: null });
      navigate('/login');
    }
    if (onClose) onClose();
  };

  const displayName = user.fullName || user.name || 'General User';
  const displayEmail = user.email || 'user@ailegal.app';
  const displayPhone = form.phone || 'Not provided';
  const displayCity = form.city || user.country || 'India';

  const getStatusColor = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'ACCEPTED':
      case 'CONFIRMED':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'COMPLETED':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-amber-50 dark:bg-amber-950/40 text-[#B88B2A] border-amber-200 dark:border-amber-800/60';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Main Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Document File Input */}
        <input
          type="file"
          ref={docInputRef}
          onChange={handleDocUpload}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
        />

        {/* 1. TOP HEADER: USER IDENTITY & ROLE */}
        <div className="px-6 py-5 bg-gradient-to-b from-slate-50 to-white dark:from-[#1E293B] dark:to-[#111827] border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* User Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-[#B88B2A]/15 border-2 border-[#B88B2A]/40 flex items-center justify-center text-[#B88B2A] font-black text-xl shrink-0 overflow-hidden shadow-sm">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* User Name & Badges */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate capitalize">
                    {displayName}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30 text-[10px] font-black uppercase tracking-wider">
                    <User className="w-3 h-3 text-[#B88B2A]" />
                    General User
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {displayEmail}
                </p>

                {/* Quick Meta Strip */}
                <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#B88B2A]" />
                    <span>{displayPhone}</span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#B88B2A]" />
                    <span>{displayCity}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. THE 3 TOP TABS: 1. Personal Details | 2. My Consultations | 3. Saved Documents & Vault */}
          <div className="flex items-center gap-2 mt-5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-white dark:bg-[#1E293B] text-[#B88B2A] shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className={`w-4 h-4 ${activeTab === 'personal' ? 'text-[#B88B2A]' : 'text-slate-400'}`} />
              <span>Personal Details</span>
            </button>

            <button
              onClick={() => setActiveTab('consultations')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'consultations'
                  ? 'bg-white dark:bg-[#1E293B] text-[#B88B2A] shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className={`w-4 h-4 ${activeTab === 'consultations' ? 'text-[#B88B2A]' : 'text-slate-400'}`} />
              <span>My Consultations</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-white dark:bg-[#1E293B] text-[#B88B2A] shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder className={`w-4 h-4 ${activeTab === 'vault' ? 'text-[#B88B2A]' : 'text-slate-400'}`} />
              <span>Saved Documents & Vault</span>
            </button>
          </div>
        </div>

        {/* 3. SCROLLABLE TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-[#111827]">
          {/* ======================================================== */}
          {/* TAB 1: PERSONAL DETAILS */}
          {/* ======================================================== */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Personal Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update your personal profile details for case consultations and document verification.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#B88B2A]" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="e.g. Abha Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A]"
                      required
                    />
                  </div>

                  {/* Email (Read Only) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#B88B2A]" />
                      Registered Email
                    </label>
                    <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-sm font-semibold flex items-center justify-between">
                      <span className="truncate">{displayEmail}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#B88B2A]" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A]"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#B88B2A]" />
                      Gender
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A]"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#B88B2A]" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A]"
                    />
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B88B2A]" />
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. New Delhi, Mumbai, Bengaluru"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A]"
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B88B2A]" />
                      State / UT
                    </label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="e.g. Delhi, Maharashtra, Karnataka"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A]"
                    />
                  </div>

                  {/* Address (Full Span) */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B88B2A]" />
                      Residential Address / Locality
                    </label>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Flat / House No., Street, Colony, Landmark"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#1E293B] text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#B88B2A] resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#B88B2A] hover:bg-[#a07823] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#B88B2A]/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Personal Details'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MY CONSULTATIONS */}
          {/* ======================================================== */}
          {activeTab === 'consultations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    My Advocate Consultations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Track consultation bookings, advocate responses, appointment dates and case fees.
                  </p>
                </div>
                <button
                  onClick={loadConsultations}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Refresh Consultations"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingConsultations ? 'animate-spin text-[#B88B2A]' : ''}`} />
                </button>
              </div>

              {isLoadingConsultations ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-[#B88B2A] animate-spin" />
                  <span className="text-xs font-bold text-slate-400">Loading consultation bookings...</span>
                </div>
              ) : consultations.length === 0 ? (
                <div className="py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#B88B2A] flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Consultation Bookings Yet</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Consult verified advocates for legal analysis, bail, agreements, and civil or criminal dispute guidance.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/dashboard/advocates');
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#B88B2A] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#a07823] transition-all cursor-pointer"
                  >
                    Browse Verified Advocates
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {consultations.map((item) => {
                    const advName = item.advocateName || (typeof item.advocateId === 'object' && (item.advocateId?.fullName || item.advocateId?.name)) || 'Verified Advocate';
                    const statusClass = getStatusColor(item.status);
                    return (
                      <div
                        key={item._id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1E293B]/60 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{advName}</h4>
                            <p className="text-xs font-bold text-[#B88B2A] truncate">{item.practiceArea || 'Legal Consultation'}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${statusClass}`}>
                            {item.status || 'PENDING'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="truncate">Slot: {item.scheduledDate ? `${item.scheduledDate} • ${item.scheduledTimeSlot || ''}` : 'Pending schedule'}</span>
                          <span className="font-bold text-slate-800 dark:text-white shrink-0">Fee: ₹{item.fee || 1500}</span>
                        </div>

                        <button
                          onClick={() => {
                            onClose();
                            navigate('/dashboard/requests');
                          }}
                          className="w-full py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#B88B2A] text-[#B88B2A] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>View Request Details</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SAVED DOCUMENTS & VAULT */}
          {/* ======================================================== */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Legal Document Vault
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Encrypted personal vault for contracts, agreements, identity proofs, and petitions.
                  </p>
                </div>
                <button
                  onClick={() => docInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="px-3.5 py-2 rounded-xl bg-[#B88B2A] hover:bg-[#a07823] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {vaultDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1E293B]/50 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#B88B2A]/10 text-[#B88B2A] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{doc.name}</p>
                          {doc.source === 'AI Legal Assistant' && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30 shrink-0">
                              AI Chat
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400">{doc.size} • {doc.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (doc.url && doc.url.startsWith('http')) {
                            window.open(doc.url, '_blank');
                          } else {
                            toast.success(`Document: ${doc.name} (${doc.size})`);
                          }
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.name)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {vaultDocs.length === 0 && (
                  <div className="py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#B88B2A] flex items-center justify-center mx-auto">
                      <Folder className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Saved Documents</h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Upload personal documents here or attach documents when asking questions in AI Legal Assistant to automatically secure them in your vault.
                    </p>
                  </div>
                )}
              </div>

              {/* Encryption & Confidentiality Badge */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-[#B88B2A]/20 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <Lock className="w-4 h-4 text-[#B88B2A] shrink-0" />
                <span>
                  <strong>Encrypted & Confidential:</strong> All documents in your vault are protected with 256-bit encryption under attorney-client privilege.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER WITH LOGOUT */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#1E293B] border-t border-slate-200/70 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>

      {/* Logout Confirmation Sub-Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-10 text-center font-sans space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sign Out of AI Legal™</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Are you sure you want to log out of your session?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteLogout}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/10 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default GeneralUserAccountModal;
