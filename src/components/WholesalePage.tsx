import React, { useState, useMemo, useRef } from 'react';
import { Product, CategoryType, WholesaleMatrixEntry, CartItem } from '../types';
import { WholesaleProductCard } from './WholesaleProductCard';
import { WholesaleProductDetailModal } from './WholesaleProductDetailModal';
import { metaPixel } from '../services/metaPixel';
import {
  Search,
  SlidersHorizontal,
  X,
  Package,
  Layers,
  Palette,
  CheckCircle2,
  Building2,
  MessageCircle,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface WholesalePageProps {
  products: Product[];
  onAddWholesaleToCart: (
    product: Product,
    totalQty: number,
    matrix: WholesaleMatrixEntry[],
    note: string,
    unitPrice: number
  ) => void;
  onWholesaleBuyNow: (
    product: Product,
    totalQty: number,
    matrix: WholesaleMatrixEntry[],
    note: string,
    unitPrice: number
  ) => void;
  isWishlisted?: (productId: string) => boolean;
  onToggleWishlist?: (product: Product) => void;
  editingCartItem?: CartItem | null;
  onFinishEditingCartItem?: () => void;
}

const WHATSAPP_PHONE = '8801346068854';
const WHATSAPP_DISPLAY = '+880 1346-068854';

export const WholesalePage: React.FC<WholesalePageProps> = ({
  products,
  onAddWholesaleToCart,
  onWholesaleBuyNow,
  isWishlisted,
  onToggleWishlist,
  editingCartItem,
  onFinishEditingCartItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [viewingWholesaleProduct, setViewingWholesaleProduct] = useState<Product | null>(
    editingCartItem ? editingCartItem.product : null
  );

  const categories: CategoryType[] = ['All', 'T-Shirts', 'Printed T-Shirts', 'Hoodies'];

  // Filter & sort products for wholesale
  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((item) => {
        if (!item || !item.id) return false;

        // Strictly check if explicitly tagged as wholesale
        const types: string[] = Array.isArray(item.productTypes) && item.productTypes.length > 0
          ? item.productTypes
          : [item.productType || 'normal'];

        const isWholesaleType = types.includes('wholesale') || item.productType === 'wholesale';
        const hasWholesalePrice = Boolean(item.wholesalePrice && Number(item.wholesalePrice) > 0);
        const isWholesaleCategory = (item.category || '').toLowerCase().includes('wholesale');

        if (!isWholesaleType && !hasWholesalePrice && !isWholesaleCategory) {
          return false;
        }

        const matchesCategory =
          selectedCategory === 'All' ? true : item.category === selectedCategory;
        const matchesSearch =
          searchQuery.trim() === ''
            ? true
            : (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.fabric || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const priceA = a.wholesalePrice || a.price;
        const priceB = b.wholesalePrice || b.price;
        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const wholesaleHighlights = [
    {
      title: 'MOQ 25 Pieces Only',
      desc: 'Start with just 25 pieces. Accessible for clothing startups & boutique brands.',
      icon: Package,
    },
    {
      title: 'Free Size & Color Splitting',
      desc: 'Mix sizes and colors in any ratio you need. No single-color restrictions.',
      icon: Layers,
    },
    {
      title: 'Direct Factory Tiers',
      desc: 'Transparent tiered pricing from 25 to 1,000+ pieces with maximum savings.',
      icon: Building2,
    },
    {
      title: 'Custom Printing & Tags',
      desc: 'DTF, Silk screen, high-density rubber print, embroidery and custom tags.',
      icon: Palette,
    },
  ];

  const handleModalClose = () => {
    setViewingWholesaleProduct(null);
    if (onFinishEditingCartItem) {
      onFinishEditingCartItem();
    }
  };

  return (
    <div className="bg-[#FAF9F5] dark:bg-[#0f1115] min-h-screen py-6 sm:py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Header & Hero Intro */}
        <div className="mb-8 text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-bold block mb-1">
                B2B Bulk Garments &amp; Supply
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-black dark:text-white tracking-tight">
                WHOLESALE SHOP
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-2 max-w-2xl leading-relaxed">
                Premium blank apparel &amp; printed garments ready for bulk orders. Minimum order is only <strong>25 pieces</strong> with complete flexibility to distribute sizes and colors.
              </p>
            </div>

            {/* Direct WhatsApp Callout Pill */}
            <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                  'Hello! I would like to inquire about wholesale clothing supply.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  metaPixel.trackLead({
                    content_name: 'Wholesale WhatsApp Inquiry',
                    category: 'Wholesale B2B Supply',
                    currency: 'BDT',
                  });
                  metaPixel.trackContact({
                    channel: 'WhatsApp',
                    content_name: 'Wholesale Inquiry Click',
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp: {WHATSAPP_DISPLAY}</span>
              </a>
            </div>
          </div>

          {/* 4 Feature Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
            {wholesaleHighlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#161922] border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4 text-left shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mb-2.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="font-extrabold text-xs sm:text-sm text-black dark:text-white uppercase tracking-tight">
                    {item.title}
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal font-normal">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Filters & Search Bar (Matches normal Shop page UX) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-[#151820] p-3 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                    : 'bg-[#FAF9F5] dark:bg-[#1f232d] text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-grow md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    metaPixel.trackSearch(searchQuery.trim());
                  }
                }}
                placeholder="Search wholesale styles..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-[#FAF9F5] dark:bg-[#1a1d26] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-2 pl-3 pr-8 text-xs sm:text-sm bg-[#FAF9F5] border border-neutral-200 rounded-xl font-bold uppercase tracking-wider text-neutral-800 focus:outline-none focus:border-black cursor-pointer appearance-none"
              >
                <option value="default">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 3. Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#161922] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 sm:p-12 shadow-2xs">
            <Building2 className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-lg sm:text-xl font-black text-black dark:text-white uppercase tracking-tight">
              NO WHOLESALE PRODUCTS LISTED CURRENTLY
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed font-medium">
              {searchQuery
                ? `We couldn't find any wholesale items matching "${searchQuery}".`
                : 'No products are explicitly set for wholesale supply right now. Add wholesale items from the Admin Panel or contact us for direct B2B quotes.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <a
                href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                  'Hello! I would like to inquire about wholesale bulk clothing supply.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact B2B WhatsApp ({WHATSAPP_DISPLAY})</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((prod) => (
              <WholesaleProductCard
                key={prod.id}
                product={prod}
                onViewProduct={(product) => setViewingWholesaleProduct(product)}
                isWishlisted={isWishlisted ? isWishlisted(prod.id) : false}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        )}

        {/* 4. Wholesale FAQ / Information Section */}
        <div className="mt-16 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-10 text-left">
          <div className="max-w-3xl">
            <span className="text-xs uppercase font-extrabold tracking-widest text-neutral-500">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mt-1 mb-6">
              HOW WHOLESALE ORDERING WORKS
            </h2>

            <div className="space-y-4">
              <div className="border-b border-neutral-200 pb-4">
                <h4 className="text-sm sm:text-base font-bold text-black">
                  Can I mix different sizes and colors in a single wholesale order?
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                  Yes! Unlike rigid factories that require 100 pieces of one size/color, you can distribute your 25+ pieces across any available sizes (S to XXL) and colors with our matrix selector.
                </p>
              </div>

              <div className="border-b border-neutral-200 pb-4">
                <h4 className="text-sm sm:text-base font-bold text-black">
                  How does payment and delivery work for wholesale?
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                  You can checkout directly on the website with bKash or Cash on Delivery (COD deposit), or talk directly to our wholesale account manager on WhatsApp (+880 1346-068854). We ship nationwide across Bangladesh via RedX, Steadfast, and SA Paribahan.
                </p>
              </div>

              <div className="border-b border-neutral-200 pb-4">
                <h4 className="text-sm sm:text-base font-bold text-black">
                  Do you provide custom branding, woven labels &amp; packaging?
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                  Yes. For orders over 50 pieces, we can add your custom brand neck tags, barcode stickers, individual polybag packaging, and custom silkscreen or DTF prints. Leave a note in the order or reach out via WhatsApp.
                </p>
              </div>

              <div className="pt-2">
                <h4 className="text-sm sm:text-base font-bold text-black">
                  What is the production and dispatch turnaround time?
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                  Blank in-stock tees and hoodies dispatch within 24–48 hours. Custom printed wholesale orders are completed in 3–5 working days from Dhaka.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Wholesale Product Detail Modal */}
      {viewingWholesaleProduct && (
        <WholesaleProductDetailModal
          product={viewingWholesaleProduct}
          onClose={handleModalClose}
          onAddToCart={onAddWholesaleToCart}
          onBuyNow={onWholesaleBuyNow}
          editingCartItem={editingCartItem}
          isWishlisted={isWishlisted && viewingWholesaleProduct?.id ? isWishlisted(viewingWholesaleProduct.id) : false}
          onToggleWishlist={onToggleWishlist}
        />
      )}
    </div>
  );
};
