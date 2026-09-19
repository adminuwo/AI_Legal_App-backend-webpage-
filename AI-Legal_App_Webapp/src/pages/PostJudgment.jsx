import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, CheckCircle2, Sparkles, X, Plus, 
  ArrowLeft, Shield, AlertCircle, Camera, Check, Menu
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { apis } from '../types';
import ThemeToggle from '../Components/ThemeToggle';
import PublicFooter from '../Components/PublicFooter';
import OurProductsDropdown from '../Components/OurProductsDropdown';

export default function PostJudgment() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form State
  const [advocateName, setAdvocateName] = useState('');
  const [enrolmentNumber, setEnrolmentNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [instagramId, setInstagramId] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [matter, setMatter] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [consentGiven, setConsentGiven] = useState(true);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPdfDragOver, setIsPdfDragOver] = useState(false);
  const [isPhotoDragOver, setIsPhotoDragOver] = useState(false);

  const pdfInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Profile Photo selection handler
  const handlePhotoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Profile photo must be less than 15 MB.');
      return;
    }
    setProfilePhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setProfilePhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // PDF selection handler
  const handlePdfSelect = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF document.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('PDF file size must be less than 50 MB.');
      return;
    }
    setPdfFile(file);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!advocateName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!enrolmentNumber.trim()) {
      toast.error('Please enter your Bar Council enrolment number.');
      return;
    }
    if (!whatsappNumber.trim()) {
      toast.error('Please enter your WhatsApp number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!pdfFile) {
      toast.error('Please attach the Judgment PDF order.');
      return;
    }
    if (!consentGiven) {
      toast.error('Please check the consent box to feature this win.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build FormData for multipart file uploads
      const formData = new FormData();
      formData.append('advocateName', advocateName.trim());
      formData.append('enrolmentNumber', enrolmentNumber.trim());
      formData.append('whatsappNumber', whatsappNumber.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('instagramId', instagramId.trim());
      formData.append('linkedinUrl', linkedinUrl.trim());
      formData.append('twitterUrl', twitterUrl.trim());
      formData.append('matter', matter.trim());
      formData.append('consentGiven', consentGiven ? 'true' : 'false');

      if (profilePhoto) {
        formData.append('profilePhoto', profilePhoto);
      }

      formData.append('judgementPdf', pdfFile);

      // Determine backend endpoint
      const endpoint = (apis && apis.baseUrl) 
        ? `${apis.baseUrl}/judgment-submissions` 
        : '/api/judgment-submissions';

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        setIsSuccess(true);
        toast.success('Your win has been submitted to the editorial desk!');
      } else {
        throw new Error(response.data?.message || 'Submission failed');
      }
    } catch (err) {
      console.error('[Post Judgment Error]:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to submit judgment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAdvocateName('');
    setEnrolmentNumber('');
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
    setInstagramId('');
    setLinkedinUrl('');
    setWhatsappNumber('');
    setEmail('');
    setTwitterUrl('');
    setMatter('');
    setPdfFile(null);
    setConsentGiven(true);
    setIsSuccess(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#060D0B] text-slate-800 dark:text-slate-100 font-sans selection:bg-[#B88B2A]/30 selection:text-slate-950 dark:selection:text-white transition-colors duration-300">
      
      {/* ─── Top Header (Matching Public Website Standard) ─── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#07130F]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-emerald-950/60 transition-colors shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[#B88B2A]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/logo/logo_transparent.png" alt="AI LEGAL Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain relative" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] dark:text-white flex items-center">
              AI LEGAL<span className="text-[10px] text-[#B88B2A] font-extrabold ml-0.5">TM</span>
            </span>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-emerald-100/75">
            <button onClick={() => navigate('/')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={() => navigate('/features')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Features
            </button>
            <button onClick={() => navigate('/blog')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Blog
            </button>
            <button onClick={() => navigate('/pricing')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Pricing
            </button>
            <button onClick={() => navigate('/case-search')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Case Search
            </button>
            <button onClick={() => navigate('/about')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              About
            </button>
            <OurProductsDropdown />
            <button onClick={() => navigate('/dashboard')} className="hover:text-[#B38628] dark:hover:text-amber-400 transition-colors cursor-pointer">
              Dashboard
            </button>
          </nav>

          {/* Desktop Right Header Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />
            
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#B88B2A]/60 bg-amber-50 text-[#966b1a] dark:bg-[#B88B2A]/20 dark:border-[#B88B2A] dark:text-amber-300 flex items-center gap-1.5 shadow-2xs">
              <Plus size={14} className="text-[#B88B2A] stroke-[2.5]" />
              <span>Post your judgement</span>
            </span>

            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 transition-all cursor-pointer shadow-md shadow-[#B88B2A]/25"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Header Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-[#0D1C17] border-b border-slate-200 dark:border-emerald-950 px-5 py-5 space-y-4 shadow-xl"
            >
              <div className="flex flex-col space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Home
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/features'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Features
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/blog'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Blog
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/pricing'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Pricing
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/case-search'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Case Search
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/about'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  About
                </button>
                <OurProductsDropdown isMobile={true} onItemClick={() => setMobileMenuOpen(false)} />
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="text-left px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#B38628]"
                >
                  Dashboard
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-emerald-950 flex flex-col gap-2.5">
                <span className="w-full py-2.5 rounded-full text-xs font-bold border border-[#B88B2A]/50 bg-amber-50/50 text-[#B38628] dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center gap-1.5">
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Post your judgement (Active)</span>
                </span>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                  className="w-full py-2.5 bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-white font-bold rounded-full text-center text-xs shadow-md shadow-[#B88B2A]/30"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Main Content Hero & Form ─── */}
      <main className="flex-1 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-400/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-emerald-500/5 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10">

          {/* Headline Block Matching CLAW Reference */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-[10px] sm:text-[11px] font-black tracking-widest text-emerald-700 dark:text-emerald-400 uppercase shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#B88B2A]" />
              <span>HAVE YOUR WIN TOLD</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Send us the judgement.
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-100/75 max-w-lg mx-auto leading-relaxed font-medium">
              One screen. About thirty seconds. Add your own account, or just the order. Our editors, with AI, shape the problem, the fight, and the impact into a story worth sharing.
            </p>
          </div>

          {/* Form Card (Matching Reference Card) */}
          <div className="bg-white dark:bg-[#0D1C17] border border-slate-200/90 dark:border-emerald-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-xl shadow-slate-200/50 dark:shadow-2xl transition-all">
            
            {isSuccess ? (
              /* Success State */
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Your Win Has Been Received!
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-100/80 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong className="text-[#B38628] dark:text-amber-400">{advocateName}</strong>. Our editorial team and legal intelligence desk are reviewing the order. It will be showcased across AI Legal™ portals and channels.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    Submit Another Judgement
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/case-search')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-emerald-950/60 border border-slate-300 dark:border-emerald-800/60 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
                  >
                    Explore Case Search
                  </button>
                </div>
              </div>
            ) : (
              /* Main Submission Form */
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                
                {/* 2-Column: Your Name & Enrolment Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                      YOUR NAME <span className="text-[#B38628] dark:text-amber-400 text-[10px] normal-case font-semibold">Required</span>
                    </label>
                    <input
                      type="text"
                      value={advocateName}
                      onChange={(e) => setAdvocateName(e.target.value)}
                      placeholder="Adv. Full Name"
                      className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                      ENROLMENT NUMBER <span className="text-[#B38628] dark:text-amber-400 text-[10px] normal-case font-semibold">Required</span>
                    </label>
                    <input
                      type="text"
                      value={enrolmentNumber}
                      onChange={(e) => setEnrolmentNumber(e.target.value)}
                      placeholder="e.g. MAH/1123/2019"
                      className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Profile Photo Uploader */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                    PROFILE PHOTO <span className="text-slate-400 dark:text-emerald-100/50 text-[10px] normal-case font-normal">(you can add more than one · up to 50 MB each)</span>
                  </label>
                  
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e.target.files[0])}
                    className="hidden"
                  />

                  {profilePhotoPreview ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-800/60">
                      <img 
                        src={profilePhotoPreview} 
                        alt="Advocate Profile Preview" 
                        className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-emerald-700/50 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profilePhoto?.name || 'profile_photo.jpg'}</p>
                        <p className="text-[10px] text-[#B38628] dark:text-emerald-400 font-semibold">{formatFileSize(profilePhoto?.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePhoto(null);
                          setProfilePhotoPreview(null);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsPhotoDragOver(true); }}
                      onDragLeave={() => setIsPhotoDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsPhotoDragOver(false);
                        if (e.dataTransfer.files?.[0]) handlePhotoSelect(e.dataTransfer.files[0]);
                      }}
                      className={`flex items-center gap-2.5 py-3 px-4 rounded-xl bg-slate-50 dark:bg-[#12251F] border cursor-pointer transition-all ${
                        isPhotoDragOver ? 'border-[#B88B2A] bg-amber-50/50 dark:bg-[#162D26]' : 'border-slate-200 dark:border-emerald-900/60 hover:border-[#B88B2A] dark:hover:border-emerald-700'
                      }`}
                    >
                      <Camera className="w-4 h-4 text-slate-400 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-500 dark:text-emerald-100/50 font-medium">Upload profile photo</span>
                    </div>
                  )}
                </div>

                {/* 2-Column: Instagram & LinkedIn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                      INSTAGRAM ID <span className="text-slate-400 dark:text-emerald-100/50 text-[10px] normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={instagramId}
                      onChange={(e) => setInstagramId(e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                      LINKEDIN PROFILE URL <span className="text-slate-400 dark:text-emerald-100/50 text-[10px] normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="linkedin.com/in/..."
                      className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                    />
                  </div>
                </div>

                {/* 2-Column: WhatsApp & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                      WHATSAPP NUMBER <span className="text-[#B38628] dark:text-amber-400 text-[10px] normal-case font-semibold">Required</span>
                    </label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="So we can reach you"
                      className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                      EMAIL <span className="text-[#B38628] dark:text-amber-400 text-[10px] normal-case font-semibold">Required</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {/* X (Twitter) URL */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                    X (TWITTER) URL <span className="text-slate-400 dark:text-emerald-100/50 text-[10px] normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="x.com/yourhandle"
                    className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all font-medium"
                  />
                </div>

                {/* The Judgement PDF Zone (Matching Large Dropzone) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                    THE JUDGEMENT <span className="text-slate-400 dark:text-emerald-100/50 text-[10px] normal-case font-normal">(PDF · attach more than one if needed · up to 50 MB each)</span>
                  </label>

                  <input
                    type="file"
                    ref={pdfInputRef}
                    accept=".pdf,application/pdf"
                    onChange={(e) => handlePdfSelect(e.target.files[0])}
                    className="hidden"
                  />

                  {pdfFile ? (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/60 dark:bg-[#12251F] border border-amber-200 dark:border-emerald-600/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{pdfFile.name}</p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">{formatFileSize(pdfFile.size)} • PDF Ready</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPdfFile(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove PDF"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => pdfInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsPdfDragOver(true); }}
                      onDragLeave={() => setIsPdfDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsPdfDragOver(false);
                        if (e.dataTransfer.files?.[0]) handlePdfSelect(e.dataTransfer.files[0]);
                      }}
                      className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        isPdfDragOver 
                          ? 'border-[#B88B2A] bg-amber-50/60 dark:bg-[#162D26]' 
                          : 'border-slate-300 dark:border-emerald-800/70 bg-slate-50/80 dark:bg-[#12251F]/60 hover:border-[#B88B2A] hover:bg-amber-50/20 dark:hover:bg-[#12251F]'
                      }`}
                    >
                      <Upload className="w-6 h-6 text-[#B88B2A] dark:text-emerald-400 stroke-[2]" />
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-emerald-200 text-center">
                        Drag your judgement PDFs here
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-emerald-100/50">
                        or click to choose files
                      </p>
                    </div>
                  )}
                </div>

                {/* The Matter (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-emerald-200/90 mb-1.5">
                    THE MATTER <span className="text-slate-400 dark:text-emerald-100/50 text-[10px] normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={matter}
                    onChange={(e) => setMatter(e.target.value)}
                    placeholder="One line on what you won. Or let our editors write it."
                    className="w-full bg-slate-50 dark:bg-[#12251F] border border-slate-200 dark:border-emerald-900/60 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-emerald-100/30 focus:outline-none focus:border-[#B88B2A] focus:ring-2 focus:ring-[#B88B2A]/20 focus:bg-white dark:focus:bg-[#12251F] transition-all resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Consent Checkbox */}
                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="consent-check"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-emerald-800 accent-[#B88B2A] cursor-pointer shrink-0"
                  />
                  <label htmlFor="consent-check" className="text-xs text-slate-600 dark:text-emerald-100/70 leading-relaxed cursor-pointer select-none font-medium">
                    I consent to AI Legal featuring this win across its channels: YouTube, Instagram, LinkedIn, X, the website, and AI answer engines.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-[#B88B2A] to-[#B38628] hover:opacity-95 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#B88B2A]/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      <span>Submitting your win...</span>
                    </>
                  ) : (
                    "Submit your win"
                  )}
                </button>

                {/* Reassurance Footer Note */}
                <p className="text-[11px] text-center text-slate-500 dark:text-emerald-100/50 pt-1">
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">Free. Curated.</strong> We feature a limited number of wins that deserve to be seen.
                </p>
              </form>
            )}

          </div>

        </div>
      </main>

      {/* ─── Standard Reusable Public Footer ─── */}
      <PublicFooter />
    </div>
  );
}
