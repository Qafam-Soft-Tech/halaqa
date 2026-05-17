// ─────────────────────────────────────────────────────────────────────────────
// usePreferences.js
// Lightweight hook that reads and writes user reading preferences to
// localStorage under the key 'halaqa-preferences'.
//
// Consumed by:
//   • Settings.jsx  — displays and edits preferences
//   • useSessionData.js — reads translationId / tafsirId / reciterId
//
// Shape of stored object:
// {
//   translationId:        131,   // Sahih International
//   tafsirId:             169,   // Tafsir Ibn Kathir
//   reciterId:            7,     // Mishary Rashid
//   sessionReminders:     true,
//   reflectionActivity:   true,
// }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'halaqa-preferences';

// Defaults mirror the hardcoded values that were previously in useSessionData
export const PREFERENCE_DEFAULTS = {
  translationId:      131,
  tafsirId:           169,
  reciterId:          7,
  sessionReminders:   true,
  reflectionActivity: true,
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const usePreferences = () => {
  const [prefs, setPrefsState] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      // Merge stored values on top of defaults so new keys are always present
      return { ...PREFERENCE_DEFAULTS, ...stored };
    } catch {
      return { ...PREFERENCE_DEFAULTS };
    }
  });

  // Accepts a partial object; merges with existing prefs and persists
  const setPrefs = useCallback((updates) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable in private-browsing edge cases
        console.warn('[usePreferences] Could not persist to localStorage');
      }
      return next;
    });
  }, []);

  return [prefs, setPrefs];
};

// ── Standalone reader (no React state) ───────────────────────────────────────
// Used by useSessionData.js outside of a hook call to read IDs synchronously.
export const getStoredPreferences = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...PREFERENCE_DEFAULTS, ...stored };
  } catch {
    return { ...PREFERENCE_DEFAULTS };
  }
};