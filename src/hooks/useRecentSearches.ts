import { useState, useEffect } from 'react';

const STORAGE_KEY = 'shokh_recent_searches';
const MAX_SEARCHES = 8;

const DEFAULT_POPULAR_SEARCHES = [
  'Oversized T-Shirt',
  'Heavyweight Hoodie',
  'Black Printed Tee',
  'Pure White Cotton',
  'Custom Print',
  'Drop Shoulder',
];

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load recent searches from storage', e);
    }
    return DEFAULT_POPULAR_SEARCHES;
  });

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setRecentSearches((prev) => {
      // Filter out duplicate (case-insensitive)
      const filtered = prev.filter(
        (term) => term.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...filtered].slice(0, MAX_SEARCHES);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent search to localStorage', e);
      }
      return updated;
    });
  };

  const removeRecentSearch = (queryToRemove: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (term) => term.toLowerCase() !== queryToRemove.toLowerCase()
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update recent searches', err);
      }
      return updated;
    });
  };

  const clearAllRecentSearches = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear recent searches', err);
    }
  };

  return {
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
    popularSuggestions: DEFAULT_POPULAR_SEARCHES,
  };
}
