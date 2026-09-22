import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, ShieldCheck, MapPin, Scale, Star, 
  Calendar, Clock, X, Check, MessageSquare, Phone, 
  Video, User, ArrowRight, Filter, AlertCircle, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import consultationService from '../services/consultationService';

const PRACTICE_FILTERS = [
  'All',
  'Civil Law',
  'Criminal Law',
  'Corporate Law',
  'Family Law',
  'Property Law',
  'Cyber Law',
  'Consumer Law',
];

export default function AdvocatesDirectoryPage() {
  const navigate = useNavigate();

  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPractice, setSelectedPractice] = useState('All');

  // Booking Modal State
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [bookingType, setBookingType] = useState('video');
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookingTimeSlot, setBookingTimeSlot] = useState('10:00 AM - 11:00 AM');
  const [legalIssueSummary, setLegalIssueSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Advocates
  const fetchAdvocates = async () => {
    try {
      setLoading(true);
      const res = await consultationService.getVerifiedAdvocates({
        search: searchQuery || undefined,
        practiceArea: selectedPractice !== 'All' ? selectedPractice : undefined,
      });
      if (res && res.advocates) {
        setAdvocates(res.advocates);
      }
    } catch (err) {
      console.warn('[AdvocatesDirectoryPage] Error loading advocates:', err);
      toast.error('Failed to load advocates directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvocates();
  }, [selectedPractice]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdvocates();
  };

  const handleOpenBooking = (advocate) => {
    setSelectedAdvocate(advocate);
    setLegalIssueSummary('');
  };

  const handleCloseBooking = () => {
    setSelectedAdvocate(null);
    setIsSubmitting(false);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdvocate) return;
    if (!legalIssueSummary.trim()) {
      toast.error('Please provide a brief summary of your legal issue.');
      return;
    }

    try {
      setIsSubmitting(true);
      const advId = selectedAdvocate._id || selectedAdvocate.id;
      const practiceArea = selectedAdvocate.practiceAreas?.[0] || 'General Legal Consultation';

      await consultationService.createConsultationRequest({
        advocateId: advId,
        consultationType: bookingType,
        scheduledDate: bookingDate,
        scheduledTimeSlot: bookingTimeSlot,
        practiceArea,
        legalIssueSummary: legalIssueSummary.trim(),
      });

      toast.success('Consultation request sent successfully!');
      handleCloseBooking();
      navigate('/dashboard/requests');
    } catch (err) {
      console.error('[AdvocatesDirectoryPage] Booking error:', err);
      toast.error(err?.response?.data?.message || 'Failed to submit consultation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Advocates for display
  const filteredAdvocates = advocates.filter((adv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (adv.fullName || adv.name || '').toLowerCase().includes(q);
    const cityMatch = (adv.city || adv.state || '').toLowerCase().includes(q);
    const courtMatch = (adv.primaryCourt || '').toLowerCase().includes(q);
    const areaMatch = (adv.practiceAreas || []).some((a) => a.toLowerCase().includes(q));
    return nameMatch || cityMatch || courtMatch || areaMatch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto text-[#111827] dark:text-white font-sans transition-colors pb-16 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Verified Advocates Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B88B2A]/15 text-[#B88B2A] border border-[#B88B2A]/30">
              Verified Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Browse and consult enrolled advocates across High Courts & Supreme Court of India with clear upfront pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/requests')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 hover:border-[#B88B2A]/50 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#B88B2A]" />
            <span>My Requests</span>
          </button>
        </div>
      </div>

      {/* Search & Practice Area Filter Bar */}
      <div className="my-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search advocates by name, court, practice area, or city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#B88B2A] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Practice Area Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {PRACTICE_FILTERS.map((practice) => {
            const isSelected = selectedPractice === practice;
            return (
              <button
                key={practice}
                onClick={() => setSelectedPractice(practice)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#B88B2A] text-white shadow-xs'
                    : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#B88B2A]/40'
                }`}
              >
                {practice}
              </button>
            );
          })}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin text-[#B88B2A]" />
          <p className="text-xs font-semibold">Loading verified advocates...</p>
        </div>
      ) : filteredAdvocates.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#B88B2A]/10 text-[#B88B2A] flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Advocates Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            No verified advocates match your current search or practice area filter. Try changing your filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedPractice('All'); }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-[#B88B2A] hover:text-white transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAdvocates.map((adv) => {
            const advId = adv._id || adv.id;
            const name = adv.fullName || adv.name || 'Advocate';
            const court = adv.primaryCourt || 'High Court';
            const experience = adv.experience || '8+ Years';
            const rating = adv.rating || 4.9;
            const fee = adv.consultationFee || 1500;
            const areas = adv.practiceAreas || ['Civil Law', 'Corporate Law'];

            return (
              <motion.div
                key={advId}
                whileHover={{ y: -3 }}
                className="p-5 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#B88B2A]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Avatar & Verification */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-[#B88B2A]/15 border border-[#B88B2A]/30 flex items-center justify-center font-bold text-base text-[#B88B2A] overflow-hidden shrink-0">
                        {adv.avatar && adv.avatar !== '/User.jpeg' ? (
                          <img src={adv.avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {name}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-[#B88B2A] shrink-0" title="Verified Advocate" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{adv.city ? `${adv.city}, ${adv.state || 'India'}` : court}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{rating}</span>
                    </div>
                  </div>

                  {/* Badges: Court, Exp, Enrollment */}
                  <div className="flex flex-wrap gap-1.5 my-3">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {court}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {experience} Exp
                    </span>
                    {adv.barCouncil && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {adv.barCouncil}
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 my-2 leading-relaxed">
                    {adv.bio || `${name} is an enrolled advocate practicing in ${court} with proven experience in litigation and advisory.`}
                  </p>

                  {/* Practice Areas */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {areas.slice(0, 3).map((area) => (
                      <span
                        key={area}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#B88B2A]/10 text-[#B88B2A] border border-[#B88B2A]/20"
                      >
                        {area}
                      </span>
                    ))}
                    {areas.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{areas.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Fee & Book Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Consultation Fee</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{fee} <span className="text-[11px] font-normal text-slate-500">/ session</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(adv)}
                    className="px-4 py-2 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    Book Consult
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedAdvocate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col text-slate-900 dark:text-white max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Book Legal Consultation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    With {selectedAdvocate.fullName || selectedAdvocate.name} • ₹{selectedAdvocate.consultationFee || 1500}
                  </p>
                </div>
                <button
                  onClick={handleCloseBooking}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleBookingSubmit} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 py-4 pr-1">
                {/* 1. Consultation Mode */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Select Consultation Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'video', label: 'Video Call', icon: Video },
                      { id: 'audio', label: 'Audio Call', icon: Phone },
                      { id: 'chat', label: 'In-App Chat', icon: MessageSquare },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isSel = bookingType === mode.id;
                      return (
                        <button
                          type="button"
                          key={mode.id}
                          onClick={() => setBookingType(mode.id)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                            isSel
                              ? 'bg-[#B88B2A]/15 border-[#B88B2A] text-[#B88B2A] font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Date & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Time Slot
                    </label>
                    <select
                      value={bookingTimeSlot}
                      onChange={(e) => setBookingTimeSlot(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A]"
                    >
                      <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                      <option value="12:00 PM - 01:00 PM">12:00 PM - 01:00 PM</option>
                      <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                      <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
                      <option value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* 3. Summary of Legal Matter */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Brief Summary of Your Legal Query
                  </label>
                  <textarea
                    rows={4}
                    value={legalIssueSummary}
                    onChange={(e) => setLegalIssueSummary(e.target.value)}
                    placeholder="Briefly describe your situation (e.g. Tenant notice issue, contract dispute, property registration clarification, consumer grievance)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] resize-none"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your details are securely transmitted directly to the advocate.
                  </p>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseBooking}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#B88B2A] hover:bg-[#A37722] text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Request</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
