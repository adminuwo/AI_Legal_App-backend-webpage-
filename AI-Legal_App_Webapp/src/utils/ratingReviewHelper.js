/**
 * AI Legal Web - In-App Rating Gatekeeper Helper
 * Protects store reputation and customer trust by intercepting dissatisfaction internally,
 * alerting admin@uwo24.com directly, and celebrating satisfied users with Google Play review links.
 */

import axios from 'axios';

const STORAGE_KEYS = {
  LAST_SHOWN: 'ai_legal_web_rating_last_shown',
  SHOWN_COUNT_YEAR: 'ai_legal_web_rating_shown_count',
  YEAR_ANCHOR: 'ai_legal_web_rating_year_anchor',
  HAS_COMPLETED: 'ai_legal_web_rating_completed',
  EXPORT_COUNT: 'ai_legal_web_export_count',
  CHAT_TURNS: 'ai_legal_web_chat_turns_count',
};

const MAX_PROMPTS_PER_YEAR = 5;
const COOLDOWN_DAYS = 60;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export const getApiBaseUrl = () => {
  return (
    window._env_?.VITE_AISA_BACKEND_API ||
    import.meta.env?.VITE_AISA_BACKEND_API ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8080/api'
      : typeof window !== 'undefined'
      ? `${window.location.origin}/api`
      : 'http://localhost:8080/api')
  );
};

class RatingReviewWebHelper {
  constructor() {
    this.listeners = new Set();
    this.isModalOpen = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setModalOpen(isOpen) {
    this.isModalOpen = isOpen;
  }

  canPromptUser() {
    try {
      if (this.isModalOpen) return false;

      const isDev = import.meta.env?.DEV;
      if (!isDev) {
        // Has user already given 5 stars?
        const completed = localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED);
        if (completed === 'true') return false;

        const now = Date.now();
        const currentYear = new Date().getFullYear().toString();
        const storedYear = localStorage.getItem(STORAGE_KEYS.YEAR_ANCHOR);

        let shownCount = 0;
        if (storedYear === currentYear) {
          const raw = localStorage.getItem(STORAGE_KEYS.SHOWN_COUNT_YEAR);
          shownCount = raw ? parseInt(raw, 10) : 0;
        } else {
          localStorage.setItem(STORAGE_KEYS.YEAR_ANCHOR, currentYear);
          localStorage.setItem(STORAGE_KEYS.SHOWN_COUNT_YEAR, '0');
          shownCount = 0;
        }

        if (shownCount >= MAX_PROMPTS_PER_YEAR) {
          return false;
        }

        const lastShownRaw = localStorage.getItem(STORAGE_KEYS.LAST_SHOWN);
        if (lastShownRaw) {
          const lastShownTime = parseInt(lastShownRaw, 10);
          if (!isNaN(lastShownTime) && (now - lastShownTime) < COOLDOWN_MS) {
            return false;
          }
        }
      }

      return true;
    } catch (e) {
      console.warn('[RatingGatekeeperWeb] Error checking eligibility:', e);
      return false;
    }
  }

  recordExportAndCheckTrigger(metadata = {}) {
    try {
      const rawExports = localStorage.getItem(STORAGE_KEYS.EXPORT_COUNT);
      const count = (rawExports ? parseInt(rawExports, 10) : 0) + 1;
      localStorage.setItem(STORAGE_KEYS.EXPORT_COUNT, count.toString());

      const rawTurns = localStorage.getItem(STORAGE_KEYS.CHAT_TURNS);
      const turns = rawTurns ? parseInt(rawTurns, 10) : 0;

      // Standalone tools export milestone check
      if (turns >= 5 || metadata?.forceTrigger) {
        if (this.canPromptUser()) {
          this.notifyPrompt({ triggerReason: 'export', metadata: { count, turns, ...metadata } });
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('[RatingGatekeeperWeb] Error recording export:', e);
      return false;
    }
  }

  recordChatTurn() {
    try {
      const rawTurns = localStorage.getItem(STORAGE_KEYS.CHAT_TURNS);
      const turns = (rawTurns ? parseInt(rawTurns, 10) : 0) + 1;
      localStorage.setItem(STORAGE_KEYS.CHAT_TURNS, turns.toString());
      return false;
    } catch (e) {
      console.warn('[RatingGatekeeperWeb] Error recording chat turn:', e);
      return false;
    }
  }

  /**
   * Called when user performs any satisfaction action (thumbs up, copy, share, export PDF)
   * after continuing conversation in the same chat (>= 5 continuous messages).
   */
  recordActionAndCheckTrigger(actionType, metadata = {}) {
    try {
      const rawTurns = localStorage.getItem(STORAGE_KEYS.CHAT_TURNS);
      const turns = rawTurns ? parseInt(rawTurns, 10) : 0;
      const sessionTurns = metadata?.userMessageCount !== undefined ? metadata.userMessageCount : turns;

      // User must chat continuously in the same conversation:
      // Minimum 5 chat turns required before any interaction triggers the rating dialog.
      const minTurns = 5;
      if (sessionTurns >= minTurns) {
        if (this.canPromptUser()) {
          this.notifyPrompt({ triggerReason: 'action', metadata: { actionType, sessionTurns, ...metadata } });
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('[RatingGatekeeperWeb] Error recording action trigger:', e);
      return false;
    }
  }

  triggerManualPrompt() {
    this.notifyPrompt({ triggerReason: 'manual' });
  }

  notifyPrompt(event) {
    this.isModalOpen = true;
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[RatingGatekeeperWeb] Listener error:', err);
      }
    });
  }

  recordPromptShown() {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SHOWN, Date.now().toString());
      const raw = localStorage.getItem(STORAGE_KEYS.SHOWN_COUNT_YEAR);
      const count = raw ? parseInt(raw, 10) : 0;
      localStorage.setItem(STORAGE_KEYS.SHOWN_COUNT_YEAR, (count + 1).toString());
    } catch (e) {
      console.warn('[RatingGatekeeperWeb] Error updating counters:', e);
    }
  }

  recordRatingCompleted() {
    try {
      localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED, 'true');
    } catch (e) {
      console.warn('[RatingGatekeeperWeb] Error saving rating completed:', e);
    }
  }

  redirectToReview() {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.ailegal.app';
    window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
  }

  async submitGatekeeperFeedback({ sentiment, rating, feedbackText, metadata = {} }) {
    try {
      const baseUrl = getApiBaseUrl();
      const userData = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
      const userEmail = userData?.email || localStorage.getItem('userEmail') || 'anonymous-web@ailegal.app';
      const userName = userData?.name || localStorage.getItem('userName') || 'AI Legal User';

      const token = localStorage.getItem('token') || userData?.token;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await axios.post(
        `${baseUrl}/feedback/review-gatekeeper`,
        {
          sentiment,
          rating: rating || (sentiment === 'positive' ? 5 : 2),
          feedbackText: feedbackText || '',
          platform: 'web_app',
          userName,
          userEmail,
          metadata: {
            userAgent: navigator.userAgent,
            ...metadata,
          },
        },
        { headers }
      );

      return response.data;
    } catch (err) {
      console.warn('[RatingGatekeeperWeb] Feedback submission error:', err);
      return { success: false, intercepted: sentiment === 'negative' };
    }
  }
}

export const ratingReviewWebHelper = new RatingReviewWebHelper();

if (typeof window !== 'undefined') {
  window.testRatingPrompt = () => {
    ratingReviewWebHelper.triggerManualPrompt();
    return '🌟 Rating Gatekeeper Modal triggered on Web!';
  };

  window.resetRatingData = () => {
    localStorage.removeItem(STORAGE_KEYS.LAST_SHOWN);
    localStorage.removeItem(STORAGE_KEYS.SHOWN_COUNT_YEAR);
    localStorage.removeItem(STORAGE_KEYS.YEAR_ANCHOR);
    localStorage.removeItem(STORAGE_KEYS.HAS_COMPLETED);
    localStorage.removeItem(STORAGE_KEYS.EXPORT_COUNT);
    localStorage.removeItem(STORAGE_KEYS.CHAT_TURNS);
    return '🔄 Local rating counters and cooldowns reset!';
  };
}
