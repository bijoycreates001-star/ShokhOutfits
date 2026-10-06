import React, { useRef, useEffect } from 'react';
import { History, X, Search, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

interface RecentSearchesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  recentSearches: string[];
  popularSuggestions: string[];
  onSelectSearch: (term: string) => void;
  onRemoveSearch: (term: string, e: React.MouseEvent) => void;
  onClearAll: (e: React.MouseEvent) => void;
  currentQuery?: string;
  className?: string;
}

export const RecentSearchesDropdown: React.FC<RecentSearchesDropdownProps> = ({
  isOpen,
  onClose,
  recentSearches,
  popularSuggestions,
  onSelectSearch,
  onRemoveSearch,
  onClearAll,
  currentQuery = '',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter terms matching input if user is already typing
  const cleanQuery = currentQuery.trim().toLowerCase();
  const matchingRecent = cleanQuery
    ? recentSearches.filter((term) => term.toLowerCase().includes(cleanQuery))
    : recentSearches;

  const matchingPopular = cleanQuery
    ? popularSuggestions.filter(
        (term) =>
          term.toLowerCase().includes(cleanQuery) &&
          !matchingRecent.some((r) => r.toLowerCase() === term.toLowerCase())
      )
    : popularSuggestions.filter(
        (term) => !matchingRecent.some((r) => r.toLowerCase() === term.toLowerCase())
      );

  const hasItems = matchingRecent.length > 0 || matchingPopular.length > 0;

  return (
    <div
      ref={containerRef}
      className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden z-50 text-left animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-[#FAF9F5] border-b border-neutral-200/70 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-neutral-500" />
          <span>{cleanQuery ? 'Matching Searches' : 'Recent Searches'}</span>
        </div>

        {matchingRecent.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[11px] font-semibold text-neutral-400 hover:text-black transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto p-2 divide-y divide-neutral-100">
        {/* Recent Search Items */}
        {matchingRecent.length > 0 && (
          <div className="py-1">
            {matchingRecent.map((term, idx) => (
              <div
                key={`recent-${idx}`}
                onClick={() => onSelectSearch(term)}
                className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                    <History className="w-3.5 h-3.5 text-neutral-500 group-hover:text-black" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 group-hover:text-black truncate">
                    {term}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    Search
                  </span>
                  <button
                    onClick={(e) => onRemoveSearch(term, e)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors cursor-pointer"
                    title="Remove from history"
                    aria-label={`Remove ${term} from history`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Popular / Trending Suggestions */}
        {matchingPopular.length > 0 && (
          <div className="pt-2 pb-1">
            <div className="px-3 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-neutral-400" />
              <span>Trending in Shokh</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 px-3 py-1">
              {matchingPopular.slice(0, 6).map((term, idx) => (
                <button
                  key={`pop-${idx}`}
                  onClick={() => onSelectSearch(term)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-neutral-200 text-xs text-neutral-700 hover:border-black hover:text-black hover:bg-white transition-colors cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state if nothing matches */}
        {!hasItems && (
          <div className="py-6 px-4 text-center">
            <Search className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-medium">No recent searches found</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Press Enter to search for &ldquo;{currentQuery}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Quick footer hint */}
      {cleanQuery && (
        <div
          onClick={() => onSelectSearch(cleanQuery)}
          className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs font-bold text-black hover:bg-neutral-100 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search all for &ldquo;{cleanQuery}&rdquo;</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};
