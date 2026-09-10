/**
 * AI Legal Web - Real-Time Student Study Streak Service
 * Tracks consecutive daily active study days (like Snapchat streaks).
 * 1 streak per calendar day. Persists in localStorage & syncs with MongoDB backend.
 */

import axios from 'axios';
import { API } from '../types';

const STREAK_STORAGE_PREFIX = 'student_study_streak_';

export const getLocalDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getStudyStreak = (userId) => {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        resolvedUserId = u._id || u.id;
      }
    } catch (e) {}
  }
  const key = `${STREAK_STORAGE_PREFIX}${resolvedUserId || 'current'}`;
  const todayStr = getLocalDateString();

  let streakData = {
    streak: 1,
    lastActiveDate: todayStr,
    bestStreak: 1,
    totalActiveDays: 1,
    isStreakActiveToday: true,
  };

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      streakData = JSON.parse(raw);
      if (streakData.lastActiveDate) {
        if (streakData.lastActiveDate === todayStr) {
          streakData.isStreakActiveToday = true;
        } else {
          const last = new Date(streakData.lastActiveDate + 'T00:00:00');
          const today = new Date(todayStr + 'T00:00:00');
          const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streakData.isStreakActiveToday = false;
          } else if (diffDays > 1) {
            streakData.streak = 0;
            streakData.isStreakActiveToday = false;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[StreakService Web] Error reading local streak:', e);
  }

  return streakData;
};

export const recordStudyActivity = async (userId, token) => {
  let resolvedUserId = userId;
  let resolvedToken = token;
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (!resolvedUserId) resolvedUserId = u._id || u.id;
      if (!resolvedToken) resolvedToken = u.token;
    }
    if (!resolvedToken) resolvedToken = localStorage.getItem('token');
  } catch (e) {}

  const key = `${STREAK_STORAGE_PREFIX}${resolvedUserId || 'current'}`;
  const todayStr = getLocalDateString();
  const current = getStudyStreak(resolvedUserId);

  let newStreak = current.streak;
  let newTotal = current.totalActiveDays || 0;

  if (!current.lastActiveDate) {
    newStreak = 1;
    newTotal = 1;
  } else if (current.lastActiveDate === todayStr) {
    if (newStreak === 0) newStreak = 1;
  } else {
    const last = new Date(current.lastActiveDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = (current.streak || 0) + 1;
      newTotal += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
      newTotal += 1;
    }
  }

  const bestStreak = Math.max(current.bestStreak || 0, newStreak);

  const updatedData = {
    streak: newStreak,
    lastActiveDate: todayStr,
    bestStreak,
    totalActiveDays: newTotal,
    isStreakActiveToday: true,
  };

  try {
    localStorage.setItem(key, JSON.stringify(updatedData));
  } catch (e) {
    console.warn('[StreakService Web] Error saving local streak:', e);
  }

  // Sync with backend API
  const authToken = resolvedToken;
  if (authToken) {
    try {
      const res = await axios.post(`${API}/user/streak/ping`, {}, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 8000,
      });
      if (res.data?.success) {
        const synced = {
          streak: res.data.streak,
          lastActiveDate: res.data.lastActiveDate || todayStr,
          bestStreak: res.data.bestStreak || bestStreak,
          totalActiveDays: res.data.totalActiveDays || newTotal,
          isStreakActiveToday: true,
        };
        localStorage.setItem(key, JSON.stringify(synced));
        return synced;
      }
    } catch (e) {
      // Offline / network fallback is already stored in localStorage
    }
  }

  return updatedData;
};
