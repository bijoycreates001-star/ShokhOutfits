import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  ArrowRight,
  Heart,
  User,
  Shield,
  Sun,
  Moon,
  MoreVertical
} from 'lucide-react';
import { ShokhLogo } from './ShokhLogo';
import { RecentSearchesDropdown } from './RecentSearchesDropdown';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { metaPixel } from '../services/metaPixel';

interface HeaderProps {
  activeTab: 'home' | 'shop' | 'customize' | 'wholesale';
  setActiveTab: (tab: 'home' | 'shop' | 'customize' | 'wholesale') => void;
  cartCount: number;
  openCart: () => void;
  wishlistCount: number;
  openWishlist: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit?: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  openCart,
  wishlistCount,
  openWishlist,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onOpenAdmin,
}) => {
  const { admin, customer, openCustomerAuthModal, openCustomerDrawer } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tabletMoreOpen, setTabletMoreOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tabletMenuRef = useRef<HTMLDivElement>(null);

  const {
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
    popularSuggestions,
  } = useRecentSearches();

  // Close tablet dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabletMenuRef.current && !tabletMenuRef.current.contains(event.target as Node)) {
        setTabletMoreOpen(false);
      }
    };
    if (tabletMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tabletMoreOpen]);

  const handleNav = (tab: 'home' | 'shop' | 'customize' | 'wholesale') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setTabletMoreOpen(false);
    setShowDropdown(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeSearch = (queryToSearch: string) => {
    const trimmed = queryToSearch.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
      setSearchQuery(trimmed);
      metaPixel.trackSearch(trimmed);
    }
    setShowDropdown(false);
    setMobileMenuOpen(false);
    setTabletMoreOpen(false);
    if (onSearchSubmit) onSearchSubmit();
    setActiveTab('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch(searchQuery);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full pt-2.5 sm:pt-4 pb-2 px-2.5 sm:px-6 lg:px-8 pointer-events-none transition-all duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="pointer-events-auto neumorphic-navbar-bar px-3 sm:px-5 lg:px-7 py-2 sm:py-2.5 lg:py-3 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 transition-all">
          
          {/* ============================================================ */}
          {/* 1. LEFT BRAND LOGO (All devices)                             */}
          {/* ============================================================ */}
          <div className="flex items-center shrink-0 pr-1.5 sm:pr-3 lg:pr-4 border-r border-neutral-300/40 dark:border-neutral-700/60 mr-0.5 sm:mr-1">
            <button
              onClick={() => handleNav('home')}
              className="text-left group cursor-pointer focus:outline-none flex items-center"
              aria-label="Shokh Outfits Home"
            >
              <ShokhLogo size="sm" showText={true} />
            </button>
          </div>

          {/* ============================================================ */}
          {/* 2. TABLET MENU SECTIONS (768px <= width < 1024px)            */}
          {/* ============================================================ */}
          <nav className="hidden md:flex lg:hidden items-center gap-1 shrink-0">
            <button
              onClick={() => handleNav('home')}
              className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'home'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('shop')}
              className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'shop'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Shop
            </button>
            <button
              onClick={() => handleNav('customize')}
              className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'customize'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Custom
            </button>
            <button
              onClick={() => handleNav('wholesale')}
              className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'wholesale'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Wholesale
            </button>
          </nav>

          {/* ============================================================ */}
          {/* 3. DESKTOP MENU SECTIONS (>= 1024px)                         */}
          {/* ============================================================ */}
          <nav className="hidden lg:flex items-center gap-1 sm:gap-2 lg:gap-2.5 shrink-0">
            <button
              onClick={() => handleNav('home')}
              className={`text-xs sm:text-sm tracking-wide transition-all px-3.5 lg:px-4.5 py-2 rounded-xl cursor-pointer relative ${
                activeTab === 'home'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('shop')}
              className={`text-xs sm:text-sm tracking-wide transition-all px-3.5 lg:px-4.5 py-2 rounded-xl cursor-pointer relative ${
                activeTab === 'shop'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Shop
            </button>
            <button
              onClick={() => handleNav('customize')}
              className={`text-xs sm:text-sm tracking-wide transition-all px-3.5 lg:px-4.5 py-2 rounded-xl cursor-pointer relative ${
                activeTab === 'customize'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Customize
            </button>
            <button
              onClick={() => handleNav('wholesale')}
              className={`text-xs sm:text-sm tracking-wide transition-all px-3.5 lg:px-4.5 py-2 rounded-xl cursor-pointer relative ${
                activeTab === 'wholesale'
                  ? 'neumorphic-active-pill font-bold text-neutral-900 dark:text-white'
                  : 'font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Wholesale
            </button>
          </nav>

          {/* ============================================================ */}
          {/* 4. SEARCH BAR (Visible directly on Mobile, Tablet & Desktop) */}
          {/* ============================================================ */}
          <div className="relative flex-1 min-w-0 max-w-full sm:max-w-xs md:max-w-[200px] lg:max-w-xs mx-1">
            <div className="flex items-center neumorphic-active-pill px-2.5 sm:px-3 py-1.5 sm:py-2 transition-all w-full">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500 mr-1.5 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Search products..."
                className="w-full bg-transparent text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none placeholder-neutral-400 font-medium"
                aria-label="Search products"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-neutral-400 hover:text-black dark:hover:text-white p-0.5 cursor-pointer ml-1 shrink-0 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown for Recent Searches */}
            <RecentSearchesDropdown
              isOpen={showDropdown}
              onClose={() => setShowDropdown(false)}
              recentSearches={recentSearches}
              popularSuggestions={popularSuggestions}
              onSelectSearch={executeSearch}
              onRemoveSearch={removeRecentSearch}
              onClearAll={clearAllRecentSearches}
              currentQuery={searchQuery}
              className="w-72 sm:w-80 left-0 sm:left-auto sm:right-0 mt-2 shadow-2xl rounded-2xl z-50"
            />
          </div>

          {/* ============================================================ */}
          {/* 5. TABLET ACTIONS (Account + 3 Dots More Menu)               */}
          {/* ============================================================ */}
          <div className="hidden md:flex lg:hidden items-center gap-1.5 shrink-0">
            {/* Account Button on Tablet */}
            <button
              onClick={() => {
                if (customer) {
                  openCustomerDrawer();
                } else {
                  openCustomerAuthModal('login');
                }
              }}
              className="flex items-center justify-center w-8 h-8 rounded-xl neumorphic-btn text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-all"
              aria-label={customer ? `Signed in as ${customer.fullName}` : 'Account'}
              title={customer ? `Account: ${customer.fullName}` : 'Sign In / Account'}
            >
              <User className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
            </button>

            {/* 3 Dots Like Lines Menu Button on Tablet */}
            <div className="relative" ref={tabletMenuRef}>
              <button
                onClick={() => setTabletMoreOpen(!tabletMoreOpen)}
                className={`relative flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer transition-all ${
                  tabletMoreOpen || cartCount > 0 || wishlistCount > 0
                    ? 'neumorphic-btn text-black dark:text-white font-bold'
                    : 'neumorphic-btn text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
                }`}
                aria-label="More Options (Cart, Wishlist, Theme)"
                title="More Options"
              >
                <MoreVertical className="w-4 h-4" />
                {(cartCount > 0 || wishlistCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-neutral-900 dark:bg-white text-white dark:text-black text-[9px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none shadow-xs">
                    {cartCount + wishlistCount}
                  </span>
                )}
              </button>

              {/* Tablet 3 Dots Dropdown Menu */}
              {tabletMoreOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="space-y-1">
                    {/* Cart Option */}
                    <button
                      onClick={() => {
                        setTabletMoreOpen(false);
                        openCart();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                        <span>Shopping Cart</span>
                      </div>
                      {cartCount > 0 && (
                        <span className="bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                          {cartCount}
                        </span>
                      )}
                    </button>

                    {/* Wishlist Option */}
                    <button
                      onClick={() => {
                        setTabletMoreOpen(false);
                        openWishlist();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-neutral-600 dark:text-neutral-300'}`} />
                        <span>My Wishlist</span>
                      </div>
                      {wishlistCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {wishlistCount}
                        </span>
                      )}
                    </button>

                    {/* Dark / Light Mode Toggle Option */}
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {theme === 'dark' ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-500" />
                        )}
                        <span>Theme Appearance</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {theme === 'dark' ? 'Dark' : 'Light'}
                      </span>
                    </button>

                    {/* Admin Link - Only visible when Admin is authenticated */}
                    {admin && onOpenAdmin && (
                      <button
                        onClick={() => {
                          setTabletMoreOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          <span>Admin Portal ({admin.name || admin.email})</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 6. DESKTOP ACTIONS (Wishlist, Account, Cart, Theme, Admin)   */}
          {/* ============================================================ */}
          <div className="hidden lg:flex items-center gap-2 lg:gap-2.5 shrink-0">
            {/* Favorites / Wishlist Button */}
            <button
              onClick={openWishlist}
              className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl cursor-pointer transition-all ${
                wishlistCount > 0
                  ? 'neumorphic-btn text-rose-600'
                  : 'neumorphic-btn text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
              }`}
              aria-label={`Wishlist with ${wishlistCount} saved items`}
              title={wishlistCount > 0 ? `Wishlist (${wishlistCount})` : 'Wishlist'}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform active:scale-75 ${
                  wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Customer Account Button */}
            <button
              onClick={() => {
                if (customer) {
                  openCustomerDrawer();
                } else {
                  openCustomerAuthModal('login');
                }
              }}
              className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl neumorphic-btn text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-all"
              aria-label={customer ? `Signed in as ${customer.fullName}` : 'Sign In / Account'}
              title={customer ? `Account: ${customer.fullName}` : 'Sign In or Track Orders'}
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600 dark:text-neutral-300" />
            </button>

            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl neumorphic-btn text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-all"
              aria-label={`Shopping Cart with ${cartCount} items`}
              title={cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600 dark:text-neutral-300" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-neutral-900 text-white dark:bg-white dark:text-black text-[9px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl neumorphic-btn text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-all active:scale-90"
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/20" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600 dark:text-neutral-300" />
              )}
            </button>

            {/* Admin Portal Button - ONLY visible when Admin is authenticated */}
            {admin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer font-bold text-xs shadow-xs"
                aria-label="Admin Management Panel"
                title={`Admin Dashboard (${admin.email})`}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden xl:inline text-[11px] font-black uppercase tracking-wider">Admin</span>
              </button>
            )}
          </div>

          {/* ============================================================ */}
          {/* 7. MOBILE 3 LINES BUTTON (< 768px / md:hidden)               */}
          {/* ============================================================ */}
          <div className="flex md:hidden items-center shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative w-8 h-8 flex items-center justify-center neumorphic-btn text-neutral-700 dark:text-neutral-200 cursor-pointer rounded-xl active:scale-90 transition-transform"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu (Account, Cart, Wishlist, Theme)'}
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {(cartCount > 0 || wishlistCount > 0) && !mobileMenuOpen && (
                <span className="absolute -top-1 -right-1 bg-neutral-900 text-white dark:bg-white dark:text-black text-[8px] font-black rounded-full min-w-3.5 h-3.5 px-0.5 flex items-center justify-center leading-none">
                  {cartCount + wishlistCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 8. MOBILE 3 LINES DRAWER MENU [ Account, Cart, Wishlist, Light ] */}
        {/* ============================================================ */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto md:hidden mt-2.5 p-3.5 rounded-2xl neumorphic-navbar-bar animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xl">
            <div className="flex flex-col space-y-1.5">
              
              {/* Primary Navigation Links */}
              <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-neutral-200/60 dark:border-neutral-700/60">
                <button
                  onClick={() => handleNav('home')}
                  className={`text-center text-xs py-2 rounded-xl transition-all ${
                    activeTab === 'home'
                      ? 'font-bold neumorphic-active-pill text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => handleNav('shop')}
                  className={`text-center text-xs py-2 rounded-xl transition-all ${
                    activeTab === 'shop'
                      ? 'font-bold neumorphic-active-pill text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Shop
                </button>
                <button
                  onClick={() => handleNav('customize')}
                  className={`text-center text-xs py-2 rounded-xl transition-all ${
                    activeTab === 'customize'
                      ? 'font-bold neumorphic-active-pill text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Customize
                </button>
                <button
                  onClick={() => handleNav('wholesale')}
                  className={`text-center text-xs py-2 rounded-xl transition-all ${
                    activeTab === 'wholesale'
                      ? 'font-bold neumorphic-active-pill text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Wholesale
                </button>
              </div>

              {/* Account Section */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (customer) {
                    openCustomerDrawer();
                  } else {
                    openCustomerAuthModal('login');
                  }
                }}
                className="w-full text-left text-xs px-3 py-2.5 rounded-xl font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  <span>
                    {customer ? `Account (${customer.fullName.split(' ')[0]})` : 'Account / Sign In / Track Order'}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {/* Cart Section */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openCart();
                }}
                className="w-full text-left text-xs px-3 py-2.5 rounded-xl font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  <span>Shopping Cart</span>
                </div>
                {cartCount > 0 ? (
                  <span className="bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                    {cartCount} items
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400 font-normal">0 items</span>
                )}
              </button>

              {/* Wishlist Section */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openWishlist();
                }}
                className="w-full text-left text-xs px-3 py-2.5 rounded-xl font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-neutral-600 dark:text-neutral-300'}`} />
                  <span>My Wishlist</span>
                </div>
                {wishlistCount > 0 ? (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {wishlistCount} items
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400 font-normal">0 items</span>
                )}
              </button>

              {/* Theme Light / Dark Mode Toggle */}
              <div className="pt-1.5 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/70">
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Appearance</span>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg neumorphic-btn text-xs font-bold text-neutral-900 dark:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Admin Dashboard / Portal - Only visible when Admin is authenticated */}
              {admin && onOpenAdmin && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-xl font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between mt-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Admin Portal ({admin.name || 'Admin'})</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
