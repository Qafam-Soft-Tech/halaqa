import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const fetchSafe = async (url, selector) => {
  try {
    const res = await api.get(url);
    return selector ? selector(res.data) : res.data;
  } catch {
    return null;
  }
};

// Content API paths use /content/api/v4/ prefix
// User API paths use /auth/v1/ prefix
const useSessionData = (surahNumber, translationId = 131, tafsirId = 169) => {

  const versesQuery = useQuery({
    queryKey: ['verses', surahNumber],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/verses/by_chapter/${surahNumber}?words=true&limit=300`,
      (data) => data.verses
    ),
    enabled: !!surahNumber,
  });

  const translationsQuery = useQuery({
    queryKey: ['translations', surahNumber, translationId],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/quran/translations/${translationId}?chapter_number=${surahNumber}`,
      (data) => data.translations
    ),
    enabled: !!surahNumber,
  });

  const tafsirQuery = useQuery({
    queryKey: ['tafsirs', surahNumber, tafsirId],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/tafsirs/${tafsirId}/by_chapter/${surahNumber}`,
      (data) => data.tafsirs
    ),
    enabled: !!surahNumber,
  });

  const audioQuery = useQuery({
    queryKey: ['audio', surahNumber],
    queryFn:  () => fetchSafe(
      `/proxy/content/api/v4/chapter_recitations/7/${surahNumber}`
    ),
    enabled: !!surahNumber,
  });

  const isLoading = versesQuery.isLoading  || translationsQuery.isLoading ||
                    tafsirQuery.isLoading  || audioQuery.isLoading;

  const isError   = versesQuery.isError    || translationsQuery.isError   ||
                    tafsirQuery.isError    || audioQuery.isError;

  return {
    verses:       versesQuery.data       ?? [],
    translations: translationsQuery.data ?? [],
    tafsirs:      tafsirQuery.data       ?? [],
    audio:        audioQuery.data        ?? null,
    isLoading,
    isError,
  };
};

export default useSessionData;