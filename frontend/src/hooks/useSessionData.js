// ─────────────────────────────────────────────────────────────────────────────
// useSessionData.js
// Fetches all Quran content needed for a TafsirSession.
//
// FIX: previously translationId (131), tafsirId (169), and reciterId (7) were
// hardcoded.  They are now read from usePreferences so any change the user
// makes in Settings takes effect immediately — React Query re-fetches
// automatically because the IDs are part of each query key.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery }       from '@tanstack/react-query';
import api                from '@/lib/api';
import { usePreferences } from '@/hooks/usePreferences';

// ── Safe fetch: returns null on any error instead of throwing ─────────────────
const fetchSafe = async (url, selector) => {
  try {
    const res = await api.get(url);
    return selector ? selector(res.data) : res.data;
  } catch {
    return null;
  }
};

// ── Hook ──────────────────────────────────────────────────────────────────────
// surahNumber — string or number, e.g. '1' or 18
const useSessionData = (surahNumber) => {
  // Read user preferences reactively.
  // When the user changes a value in Settings → localStorage updates →
  // usePreferences re-renders → these IDs change → React Query sees new query
  // keys → it fetches fresh data with the correct IDs.
  const [prefs] = usePreferences();
  const { translationId, tafsirId, reciterId } = prefs;

  // ── Verses ────────────────────────────────────────────────────────────────
  const versesQuery = useQuery({
    queryKey: ['verses', surahNumber],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/verses/by_chapter/${surahNumber}?words=true&limit=300`,
      (data) => data.verses
    ),
    enabled:   !!surahNumber,
    staleTime: 5 * 60_000,  // verses don't change — cache for 5 min
  });

  // ── Translation — re-fetches when translationId changes ───────────────────
  const translationsQuery = useQuery({
    queryKey: ['translations', surahNumber, translationId],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/quran/translations/${translationId}?chapter_number=${surahNumber}`,
      (data) => data.translations
    ),
    enabled:   !!surahNumber,
    staleTime: 5 * 60_000,
  });

  // ── Tafsir — re-fetches when tafsirId changes ─────────────────────────────
  const tafsirQuery = useQuery({
    queryKey: ['tafsirs', surahNumber, tafsirId],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/tafsirs/${tafsirId}/by_chapter/${surahNumber}`,
      (data) => data.tafsirs
    ),
    enabled:   !!surahNumber,
    staleTime: 5 * 60_000,
  });

  // ── Audio recitation — re-fetches when reciterId changes ─────────────────
  // Previously hardcoded as recitation/7 — now uses prefs.reciterId
  const audioQuery = useQuery({
    queryKey: ['audio', surahNumber, reciterId],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/chapter_recitations/${reciterId}/${surahNumber}`
    ),
    enabled:   !!surahNumber,
    staleTime: 5 * 60_000,
  });

  return {
    verses:       versesQuery.data       ?? [],
    translations: translationsQuery.data ?? [],
    tafsirs:      tafsirQuery.data       ?? [],
    audio:        audioQuery.data        ?? null,
    isLoading:    versesQuery.isLoading  || translationsQuery.isLoading ||
                  tafsirQuery.isLoading  || audioQuery.isLoading,
    isError:      versesQuery.isError    || translationsQuery.isError   ||
                  tafsirQuery.isError    || audioQuery.isError,
  };
};

export default useSessionData;