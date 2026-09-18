import { useState, useEffect } from 'react';
import { X, Star, Scale, MessageSquareHeart, AlertCircle, CheckCircle2, Send, ExternalLink } from 'lucide-react';
import { ratingReviewWebHelper } from '../utils/ratingReviewHelper';
import { GOOGLE_PLAY_URL, APP_STORE_URL } from '../constants/mobileAppConfig';

export default function RatingGatekeeperModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('sentiment'); // 'sentiment' | 'positive' | 'negative' | 'submitted'
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = ratingReviewWebHelper.subscribe(() => {
      setStep('sentiment');
      setRating(5);
      setFeedbackText('');
      setIsSubmitting(false);
      setIsOpen(true);
      ratingReviewWebHelper.recordPromptShown();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    ratingReviewWebHelper.setModalOpen(false);
  };

  const getUserDetails = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        userName: user.name || user.fullName || '',
        userEmail: user.email || '',
      };
    } catch {
      return { userName: '', userEmail: '' };
    }
  };

  const handlePositiveClick = () => {
    setRating(5);
    setStep('positive');
  };

  const handleNegativeClick = () => {
    setRating(2);
    setStep('negative');
  };

  const handleStoreReviewRedirect = async (storeUrl) => {
    setIsSubmitting(true);
    const { userName, userEmail } = getUserDetails();
    try {
      await ratingReviewWebHelper.submitGatekeeperFeedback({
        sentiment: 'positive',
        rating: 5,
        userName,
        userEmail,
        feedbackText: 'User clicked to rate 5 stars on store.',
      });
      window.open(storeUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Error recording positive feedback:', e);
      window.open(storeUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsSubmitting(false);
      handleClose();
    }
  };

  const handleSubmitNegativeFeedback = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    const { userName, userEmail } = getUserDetails();

    try {
      await ratingReviewWebHelper.submitGatekeeperFeedback({
        sentiment: 'negative',
        rating,
        feedbackText: feedbackText.trim() || 'User reported dissatisfaction.',
        userName,
        userEmail,
      });

      setStep('submitted');
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err) {
      console.error('Failed to submit intercepted feedback:', err);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 transition-all transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            step === 'negative'
              ? 'from-amber-500 via-rose-500 to-red-500'
              : 'from-[#D4AF37] via-[#F59E0B] to-[#B88B2A]'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-7 text-center">
          {/* STEP 1: Sentiment Check */}
          {step === 'sentiment' && (
            <div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-[#D4AF37] shadow-inner">
                <Scale size={28} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Enjoying AI Legal™?
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Your feedback directly empowers advocates, researchers, and citizens with accurate legal intelligence.
              </p>

              <div className="space-y-3 mb-4">
                <button
                  type="button"
                  onClick={handlePositiveClick}
                  className="w-full py-3.5 px-5 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-[#D4AF37] via-[#E2C366] to-[#C8A34D] hover:brightness-105 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Yes, Loving it! 😍</span>
                </button>

                <button
                  type="button"
                  onClick={handleNegativeClick}
                  className="w-full py-3 px-5 rounded-xl font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Not Really 😕</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition py-1 cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          )}

          {/* STEP 2: Positive Sentiment -> Play Store / App Store */}
          {step === 'positive' && (
            <div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                <MessageSquareHeart size={28} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Thank You for the Support! ⭐
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Would you take 10 seconds to share a 5-star rating on Google Play or App Store? It helps legal chambers and advocates discover AI Legal.
              </p>

              <div className="flex items-center justify-center gap-1.5 mb-6 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={24} className="fill-amber-400 text-amber-400" />
                ))}
              </div>

              <div className="space-y-2.5 mb-4">
                <button
                  type="button"
                  onClick={() => handleStoreReviewRedirect(GOOGLE_PLAY_URL)}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#E2C366] hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <span>Rate 5 Stars on Google Play</span>
                  <ExternalLink size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => handleStoreReviewRedirect(APP_STORE_URL)}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Rate on Apple App Store</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
              >
                I already rated
              </button>
            </div>
          )}

          {/* STEP 3: Negative Sentiment -> In-App Intercept Form (Never goes to App Store!) */}
          {step === 'negative' && (
            <div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                <AlertCircle size={28} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                How can we improve?
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Tell our senior leadership team what didn&apos;t meet your standards. Your report is directly sent to <span className="font-semibold text-amber-500">admin@uwo24.com</span>.
              </p>

              {/* Interactive Star Rating */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                  >
                    <Star
                      size={26}
                      className={`${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Feedback Form */}
              <form onSubmit={handleSubmitNegativeFeedback} className="space-y-3 text-left">
                <div>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Please tell us what went wrong (draft formatting, research precision, speed, etc.)..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 dark:border-slate-600 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="text-xs">Submitting to admin...</span>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Submit to Admin Team</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 4: Submitted Success */}
          {step === 'submitted' && (
            <div className="py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500 shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Feedback Received
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                Your message has been directly dispatched to <span className="text-amber-500 font-medium">admin@uwo24.com</span>. Our technical and legal teams are already investigating.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
