import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CategoryType } from '../types';
import { ProductCard } from './ProductCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { RecentSearchesDropdown } from './RecentSearchesDropdown';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { metaPixel } from '../services/metaPixel';

interface ShopPageProps {
  products: Product[];
  selectedCategory?: CategoryType;
  onSelectCategory?: (category: CategoryType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onViewProduct: (product: Product) => void;
  isWishlisted?: (productId: string) => boolean;
  onToggleWishlist?: (product: Product) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  selectedCategory = 'All',
  onSelectCategory,
  searchQuery,
  setSearchQuery,
  onAddToCart,
  onViewProduct,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [internalCategory, setInternalCategory] = useState<CategoryType>(selectedCategory);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when parent selectedCategory changes
  useEffect(() => {
    setInternalCategory(selectedCategory);
  }, [selectedCategory]);

  const activeCategory = onSelectCategory ? selectedCategory : internalCategory;

  const handleCategoryClick = (cat: CategoryType) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const {
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
    popularSuggestions,
  } = useRecentSearches();

  const categories: CategoryType[] = ['All', 'T-Shirts', 'Printed T-Shirts', 'Hoodies'];

  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((item) => {
        if (!item || !item.id) return false;
        const matchesCategory =
          activeCategory === 'All' ? true : item.category === activeCategory;
        const matchesSearch =
          searchQuery.trim() === ''
            ? true
            : (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return 0;
      });
  }, [products, activeCategory, searchQuery, sortBy]);

  const handleSelectSearch = (term: string) => {
    saveRecentSearch(term);
    setSearchQuery(term);
    metaPixel.trackSearch(term);
    setShowDropdown(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        saveRecentSearch(q);
        metaPixel.trackSearch(q);
      }
      setShowDropdown(false);
    }
  };

  return (
    <div className="bg-[#FAF9F5] dark:bg-[#0f1115] min-h-screen py-6 sm:py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8 text-left">
          <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-semibold">
            Catalog &amp; Inventory
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-black dark:text-white tracking-tight mt-1">
            Shop All Apparel
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-xl">
            Explore our complete collection of plain combed cotton t-shirts, high-density screen printed tees, and heavyweight 340 GSM winter hoodies.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#FAF9F5] dark:bg-[#151820] p-3 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          
          {/* Category Tabs: All | T-Shirts | Printed T-Shirts | Hoodies */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                    : 'bg-white dark:bg-[#1f232d] text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Search Input with Recent Searches Dropdown */}
            <div className="relative flex-grow md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-[#1a1d26] border border-neutral-300 dark:border-neutral-700 rounded-xl text-black dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white p-0.5 z-10 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Recent Searches Dropdown */}
              <RecentSearchesDropdown
                isOpen={showDropdown}
                onClose={() => setShowDropdown(false)}
                recentSearches={recentSearches}
                popularSuggestions={popularSuggestions}
                onSelectSearch={handleSelectSearch}
                onRemoveSearch={removeRecentSearch}
                onClearAll={clearAllRecentSearches}
                currentQuery={searchQuery}
                className="w-full min-w-[280px]"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-white dark:bg-[#1a1d26] border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2 pr-7 text-xs sm:text-sm font-medium text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white cursor-pointer"
              >
                <option value="default">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Product Count & Active Filters Indicator */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          <span>
            Showing <strong className="text-black dark:text-white">{filteredProducts.length}</strong> products
            {activeCategory !== 'All' && ` in "${activeCategory}"`}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>

          {(activeCategory !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                handleCategoryClick('All');
                setSearchQuery('');
              }}
              className="text-black dark:text-white font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onAddToCart={onAddToCart}
                onViewProduct={onViewProduct}
                isWishlisted={isWishlisted ? isWishlisted(prod.id) : false}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl bg-[#FAF9F5] dark:bg-[#161922] p-6">
            <h3 className="text-lg font-bold text-black dark:text-white uppercase">No Products Found</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `We couldn't find anything matching "${searchQuery}". Try adjusting your keywords.`
                : 'No products are currently available in the store. Add new products via the Admin panel.'}
            </p>
            <button
              onClick={() => {
                handleCategoryClick('All');
                setSearchQuery('');
              }}
              className="mt-4 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Clear Search &amp; Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
