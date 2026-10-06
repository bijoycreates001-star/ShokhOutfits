import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductImageItem, WholesaleMatrixEntry, CartItem } from '../types';
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ShoppingCart,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  FileText,
  Tag,
  ArrowRight,
  ArrowLeft,
  Share2,
  Heart,
  Star,
  Check,
  Package,
  Award,
  ZoomIn,
} from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';
import { GarmentMockup } from './GarmentMockup';
import { getWholesaleUnitPrice } from '../data/products';
import { metaPixel } from '../services/metaPixel';

interface WholesaleProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    totalQty: number,
    matrix: WholesaleMatrixEntry[],
    note: string,
    unitPrice: number
  ) => void;
  onBuyNow: (
    product: Product,
    totalQty: number,
    matrix: WholesaleMatrixEntry[],
    note: string,
    unitPrice: number
  ) => void;
  editingCartItem?: CartItem | null;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
}

const WHATSAPP_PHONE = '8801346068854';
const WHATSAPP_DISPLAY = '+880 1346-068854';
const MIN_WHOLESALE_QTY = 25;

export const WholesaleProductDetailModal: React.FC<WholesaleProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  editingCartItem,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [previewColor, setPreviewColor] = useState(product.colors[0]?.name || 'Standard');
  const [copiedShare, setCopiedShare] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Matrix state: Record<colorName, Record<sizeName, number>>
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>(() => {
    // If editing existing cart item, pre-fill from breakdown
    if (editingCartItem?.wholesaleBreakdown) {
      const initial: Record<string, Record<string, number>> = {};
      product.colors.forEach((c) => {
        initial[c.name] = {};
        product.sizes.forEach((s) => {
          initial[c.name][s] = 0;
        });
      });
      editingCartItem.wholesaleBreakdown.forEach((entry) => {
        if (initial[entry.color]) {
          initial[entry.color][entry.size] = entry.quantity;
        }
      });
      return initial;
    }

    // Default: initialize empty grid, then pre-fill 25 pieces distributed evenly across sizes for first color
    const initial: Record<string, Record<string, number>> = {};
    product.colors.forEach((c) => {
      initial[c.name] = {};
      product.sizes.forEach((s) => {
        initial[c.name][s] = 0;
      });
    });

    // Provide friendly starter default: 25 pieces evenly distributed across available sizes of first color
    const firstColor = product.colors[0]?.name;
    if (firstColor && product.sizes.length > 0) {
      const basePerSize = Math.floor(MIN_WHOLESALE_QTY / product.sizes.length);
      const remainder = MIN_WHOLESALE_QTY % product.sizes.length;
      product.sizes.forEach((s, sIdx) => {
        initial[firstColor][s] = basePerSize + (sIdx < remainder ? 1 : 0);
      });
    }

    return initial;
  });

  const [note, setNote] = useState(editingCartItem?.wholesaleNote || '');
  const [activeMobileColor, setActiveMobileColor] = useState<string>(product.colors[0]?.name || '');
  const [justAdded, setJustAdded] = useState(false);

  // Prevent background scroll and track Meta Pixel ViewContent
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (product && product.id) {
      metaPixel.trackViewContent({
        id: product.id,
        name: product.name,
        category: product.category || 'Wholesale Apparel',
        price: product.wholesalePrice || product.price,
        currency: 'BDT',
      });
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [product?.id]);

  // Compute image gallery (deduplicated by URL)
  const imageGallery: { url: string }[] = useMemo(() => {
    if (!product) return [];
    const rawUrls: string[] = [];
    if (product.image) rawUrls.push(product.image);

    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url) rawUrls.push(url);
      });
    }

    const uniqueUrls = Array.from(new Set(rawUrls.map((u) => u.trim()).filter(Boolean)));

    if (uniqueUrls.length === 0) {
      return [{ url: product.image || '' }];
    }

    return uniqueUrls.map((url) => ({ url }));
  }, [product]);

  // Total Quantity Calculation from Matrix
  const { totalQuantity, sizeBreakdown, colorBreakdown, matrixList } = useMemo(() => {
    let total = 0;
    const sizes: Record<string, number> = {};
    const colors: Record<string, number> = {};
    const list: WholesaleMatrixEntry[] = [];

    product.sizes.forEach((s) => (sizes[s] = 0));
    product.colors.forEach((c) => (colors[c.name] = 0));

    Object.entries(matrix).forEach(([colorName, sizeObj]) => {
      Object.entries(sizeObj).forEach(([sizeName, qty]) => {
        if (qty > 0) {
          total += qty;
          sizes[sizeName] = (sizes[sizeName] || 0) + qty;
          colors[colorName] = (colors[colorName] || 0) + qty;
          list.push({ color: colorName, size: sizeName, quantity: qty });
        }
      });
    });

    return {
      totalQuantity: total,
      sizeBreakdown: sizes,
      colorBreakdown: colors,
      matrixList: list,
    };
  }, [matrix, product.sizes, product.colors]);

  // Pricing based on tiers
  const unitPrice = getWholesaleUnitPrice(product, Math.max(totalQuantity, MIN_WHOLESALE_QTY));
  const subtotal = totalQuantity * unitPrice;

  // Validation
  const isValidMinimum = totalQuantity >= MIN_WHOLESALE_QTY;
  const missingPieces = MIN_WHOLESALE_QTY - totalQuantity;

  // Handlers for adjusting matrix values
  const handleUpdateQty = (colorName: string, sizeName: string, delta: number) => {
    setMatrix((prev) => {
      const current = prev[colorName]?.[sizeName] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [colorName]: {
          ...prev[colorName],
          [sizeName]: next,
        },
      };
    });
  };

  const handleSetDirectQty = (colorName: string, sizeName: string, value: string) => {
    const parsed = parseInt(value, 10);
    const validNum = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setMatrix((prev) => ({
      ...prev,
      [colorName]: {
        ...prev[colorName],
        [sizeName]: validNum,
      },
    }));
  };

  // Quick Preset Handlers
  const handleQuickPreset = (mode: 'preset-25' | 'preset-50' | 'add-5-all' | 'clear') => {
    if (mode === 'clear') {
      const cleared: Record<string, Record<string, number>> = {};
      product.colors.forEach((c) => {
        cleared[c.name] = {};
        product.sizes.forEach((s) => {
          cleared[c.name][s] = 0;
        });
      });
      setMatrix(cleared);
      return;
    }

    if (mode === 'add-5-all') {
      setMatrix((prev) => {
        const next: Record<string, Record<string, number>> = {};
        product.colors.forEach((c) => {
          next[c.name] = {};
          product.sizes.forEach((s) => {
            next[c.name][s] = (prev[c.name]?.[s] || 0) + 1;
          });
        });
        return next;
      });
      return;
    }

    const targetPieces = mode === 'preset-25' ? 25 : 50;
    const totalSlots = product.colors.length * product.sizes.length;
    const basePerSlot = Math.floor(targetPieces / totalSlots);
    let remainder = targetPieces % totalSlots;

    const distributed: Record<string, Record<string, number>> = {};
    product.colors.forEach((c) => {
      distributed[c.name] = {};
      product.sizes.forEach((s) => {
        let val = basePerSlot;
        if (remainder > 0) {
          val += 1;
          remainder -= 1;
        }
        distributed[c.name][s] = val;
      });
    });
    setMatrix(distributed);
  };

  // Select volume tier directly and apply its target quantity across sizes & colors
  const handleSelectTier = (targetQty: number) => {
    const activeColorNames = product.colors
      .filter((c) => {
        const sum = Object.values(matrix[c.name] || {}).reduce((a, b) => a + b, 0);
        return sum > 0;
      })
      .map((c) => c.name);

    const targetColors =
      activeColorNames.length > 0 ? activeColorNames : [previewColor || product.colors[0]?.name];

    const totalSlots = targetColors.length * product.sizes.length;
    const basePerSlot = Math.floor(targetQty / totalSlots);
    let remainder = targetQty % totalSlots;

    const distributed: Record<string, Record<string, number>> = {};
    product.colors.forEach((c) => {
      distributed[c.name] = {};
      const isTarget = targetColors.includes(c.name);
      product.sizes.forEach((s) => {
        if (!isTarget) {
          distributed[c.name][s] = 0;
        } else {
          let val = basePerSlot;
          if (remainder > 0) {
            val += 1;
            remainder -= 1;
          }
          distributed[c.name][s] = val;
        }
      });
    });
    setMatrix(distributed);
  };

  // Compute display tiers (ensure every product has interactive tiers)
  const displayTiers = useMemo(() => {
    if (product.wholesaleTiers && product.wholesaleTiers.length > 0) {
      return product.wholesaleTiers;
    }
    const baseRate = product.wholesalePrice || Math.round(product.price * 0.58);
    return [
      { minQty: 25, maxQty: 49, price: baseRate },
      { minQty: 50, maxQty: 99, price: Math.round(baseRate * 0.92) },
      { minQty: 100, price: Math.round(baseRate * 0.85) },
    ];
  }, [product]);

  // Dynamic WhatsApp Message Generator
  const generateWhatsAppUrl = () => {
    const lines: string[] = [];
    lines.push('Hello! I want to discuss a wholesale order.');
    lines.push('');
    lines.push(`*Product:* ${product.name}`);
    lines.push(`*Total Quantity:* ${totalQuantity} pieces`);
    lines.push(`*Wholesale Rate:* ৳${unitPrice}/piece`);
    lines.push(`*Estimated Subtotal:* ৳${subtotal.toLocaleString('en-US')}`);
    lines.push('');

    // Size Breakdown (only include quantities > 0)
    lines.push('*Size Breakdown:*');
    let hasSizes = false;
    product.sizes.forEach((s) => {
      const q = sizeBreakdown[s] || 0;
      if (q > 0) {
        lines.push(`${s} — ${q}`);
        hasSizes = true;
      }
    });
    if (!hasSizes) lines.push('Not specified yet');
    lines.push('');

    // Color Breakdown (only include quantities > 0)
    lines.push('*Color Breakdown:*');
    let hasColors = false;
    product.colors.forEach((c) => {
      const q = colorBreakdown[c.name] || 0;
      if (q > 0) {
        lines.push(`${c.name} — ${q}`);
        hasColors = true;
      }
    });
    if (!hasColors) lines.push('Not specified yet');
    lines.push('');

    // Detailed Color + Size breakdown if multiple combinations
    if (matrixList.length > 0) {
      lines.push('*Color & Size Matrix:*');
      product.colors.forEach((c) => {
        const activeSizes = product.sizes
          .map((s) => ({ size: s, qty: matrix[c.name]?.[s] || 0 }))
          .filter((item) => item.qty > 0);

        if (activeSizes.length > 0) {
          const sizeStr = activeSizes.map((it) => `${it.size}: ${it.qty}`).join(', ');
          lines.push(`• ${c.name}: [ ${sizeStr} ]`);
        }
      });
      lines.push('');
    }

    // Customer note (if provided)
    if (note.trim()) {
      lines.push('*Note:*');
      lines.push(note.trim());
      lines.push('');
    }

    lines.push('*Product Page:*');
    lines.push(typeof window !== 'undefined' ? window.location.href : 'https://shokhoutfis.ai.studio');
    lines.push('');
    lines.push('Please let me know about the wholesale order.');

    const encoded = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product.name} (Wholesale)`,
        text: `Check out wholesale pricing for ${product.name} on Shokh Outfits`,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2000);
        })
        .catch(() => {
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2000);
        });
    } else {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleAddToCartClick = () => {
    if (!isValidMinimum) return;
    onAddToCart(product, totalQuantity, matrixList, note, unitPrice);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 900);
  };

  const handleBuyNowClick = () => {
    if (!isValidMinimum) return;
    onBuyNow(product, totalQuantity, matrixList, note, unitPrice);
    onClose();
  };

  const previewColorObj = product.colors.find((c) => c.name === previewColor) || product.colors[0];
  const garmentType = product.category === 'Hoodies' ? 'hoodie' : product.category === 'Printed T-Shirts' ? 'printed' : 'tshirt';
  const discountAmount = product.price - unitPrice;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white flex flex-col min-h-screen selection:bg-neutral-900 selection:text-white">
      
      {/* 1. Full-screen Top Header Bar (matches ProductDetailModal layout) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 -ml-1.5 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            aria-label="Back to wholesale catalog"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold uppercase hidden sm:inline">Back</span>
          </button>

          <div className="h-4 w-px bg-neutral-200" />

          <div className="flex items-center gap-2 truncate">
            <span className="text-xs uppercase tracking-widest font-black text-black">
              SHOKH WHOLESALE
            </span>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
              {product.category}
            </span>
            <span className="text-neutral-300 hidden md:inline">/</span>
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider truncate hidden md:inline max-w-[180px]">
              {product.name}
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* WhatsApp Quick Link */}
          <a
            href={generateWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-bold text-xs transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" />
            <span>Hotline: {WHATSAPP_DISPLAY}</span>
          </a>

          {/* Wishlist Button */}
          {onToggleWishlist && (
            <button
              onClick={() => onToggleWishlist(product)}
              className={`p-2 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                isWishlisted
                  ? 'bg-rose-50 border-rose-200 text-rose-500'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-rose-500 hover:bg-rose-50/50'
              }`}
              title={isWishlisted ? "Remove from Favorites" : "Add to Favorites"}
              aria-label="Wishlist toggle"
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform active:scale-75 ${
                  isWishlisted ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              <span className="text-xs font-bold hidden md:inline">
                {isWishlisted ? 'Saved' : 'Save'}
              </span>
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-black transition-colors cursor-pointer relative"
            title="Share this product"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            {copiedShare && (
              <span className="absolute top-full right-0 mt-1 text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded shadow-md whitespace-nowrap z-50">
                Link Copied!
              </span>
            )}
          </button>

          {/* Close X Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-100 hover:bg-black hover:text-white transition-all text-neutral-800 cursor-pointer ml-1"
            aria-label="Close wholesale page"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* 2. Full-Screen Page Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-36 md:pb-20 space-y-10 sm:space-y-12 text-left">
        
        {/* Top Product Information & Gallery Showcase */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Image Showcase (lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {/* Main Image Frame with hover depth and badges */}
            <div
              onClick={() => setIsZoomOpen(true)}
              className="relative aspect-square w-full max-w-xl rounded-2xl sm:rounded-3xl bg-[#F6F5F2] overflow-hidden border border-neutral-200/90 shadow-sm flex items-center justify-center group cursor-zoom-in"
              title="Click to Zoom Image"
            >
              {selectedImageIndex === 0 ? (
                <div className="w-full h-full transform transition-transform duration-500 ease-out group-hover:scale-103">
                  <GarmentMockup
                    type={garmentType}
                    colorHex={previewColorObj?.hex || '#374151'}
                    imageFallback={product.image}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src={imageGallery[selectedImageIndex]?.url || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
                />
              )}

              {/* Badges on Image */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                <span className="bg-black text-white text-[11px] font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  <span>MOQ {MIN_WHOLESALE_QTY} PCS</span>
                </span>
                <span className="bg-white/95 backdrop-blur-md text-neutral-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                  {previewColor}
                </span>
              </div>

              {/* Click to Zoom Badge */}
              <div className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 transition-all shadow-md group-hover:scale-105 z-10">
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Click to Zoom</span>
              </div>
            </div>

            {/* Thumbnail Navigation Row */}
            {imageGallery.length > 1 && (
              <div className="w-full max-w-xl mt-4 grid grid-cols-4 sm:grid-cols-5 gap-2.5 sm:gap-3">
                {imageGallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-xl sm:rounded-2xl overflow-hidden border-2 bg-neutral-100 dark:bg-neutral-800 transition-all cursor-pointer relative shadow-2xs ${
                      selectedImageIndex === idx
                        ? 'border-black dark:border-white ring-2 ring-black/20 dark:ring-white/20 scale-[1.02]'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Color Switcher Pills */}
            <div className="w-full max-w-xl mt-5 p-4 rounded-2xl bg-[#FAF9F5] border border-neutral-200">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block mb-2">
                Preview In Available Colors ({product.colors.length}):
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setPreviewColor(c.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      previewColor === c.name
                        ? 'border-black bg-neutral-900 text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-black'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Product Specs & Wholesale Pricing (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              {/* Category & Status */}
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-black uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready Stock &amp; Custom Make</span>
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight uppercase leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-neutral-800">4.9</span>
                <span className="text-xs text-neutral-500">
                  (240+ bulk orders fulfilled)
                </span>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-neutral-600 mt-3 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Material & Garment Specification Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 py-3 border-y border-neutral-200">
              <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-neutral-200/90 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Material</span>
                <span className="text-xs font-bold text-black line-clamp-1">{product.fabric}</span>
              </div>
              <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-neutral-200/90 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Density / Weight</span>
                <span className="text-xs font-bold text-black">{product.gsm}</span>
              </div>
              <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-neutral-200/90 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Silhouette Fit</span>
                <span className="text-xs font-bold text-black">{product.fit}</span>
              </div>
            </div>

            {/* Wholesale Pricing Tier Showcase */}
            <div className="bg-[#FAF9F5] rounded-3xl p-5 sm:p-6 border border-neutral-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                    Active Wholesale Rate
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-black text-black tabular-nums">
                      ৳{unitPrice.toLocaleString('en-US')}
                    </span>
                    <span className="text-xs font-semibold text-neutral-500 uppercase">/ piece</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-neutral-400 block">Retail Value</span>
                  <div className="flex sm:justify-end items-center gap-1.5">
                    <span className="text-sm text-neutral-400 line-through tabular-nums">
                      ৳{product.price.toLocaleString('en-US')}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Save ৳{discountAmount}/pc
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume Price Tiers */}
              <div className="pt-3.5 border-t border-neutral-200/90">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                    Tiered Volume Pricing:
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Click any tier to auto-select
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {displayTiers.map((tier, idx) => {
                    const isTierActive =
                      totalQuantity >= tier.minQty && (!tier.maxQty || totalQuantity <= tier.maxQty);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectTier(tier.minQty)}
                        className={`group relative p-3 rounded-2xl text-center border transition-all duration-200 cursor-pointer text-left sm:text-center flex flex-col items-center justify-between ${
                          isTierActive
                            ? 'bg-black text-white border-black shadow-lg scale-[1.03] ring-2 ring-black/20'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:border-black hover:bg-neutral-50 hover:shadow-sm active:scale-95'
                        }`}
                        title={`Select ${tier.maxQty ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`} pieces tier at ৳${tier.price}/pc`}
                      >
                        <div className="w-full">
                          <span
                            className={`text-[10px] uppercase font-bold block tracking-wider ${
                              isTierActive ? 'text-neutral-300' : 'text-neutral-500 group-hover:text-neutral-700'
                            }`}
                          >
                            {tier.maxQty ? `${tier.minQty}–${tier.maxQty} pcs` : `${tier.minQty}+ pcs`}
                          </span>
                          <span className="text-sm sm:text-base font-black tabular-nums block mt-0.5">
                            ৳{tier.price} <span className="text-[10px] font-normal">/pc</span>
                          </span>
                        </div>

                        <div className="mt-1.5 pt-1 w-full border-t border-neutral-200/40">
                          {isTierActive ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-white text-black px-2 py-0.5 rounded-full shadow-2xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              Selected
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-neutral-400 group-hover:text-black transition-colors block">
                              Select Tier →
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Wholesale Guarantees Bar */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-neutral-200 text-xs">
                <Truck className="w-4 h-4 text-neutral-800 shrink-0" />
                <span className="text-neutral-700 font-medium">Nationwide 64 districts delivery</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-neutral-200 text-xs">
                <ShieldCheck className="w-4 h-4 text-neutral-800 shrink-0" />
                <span className="text-neutral-700 font-medium">100% Pre-shrunk colorfast guarantee</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Prominent BULK ORDER Requirement Banner */}
        <section className="bg-neutral-950 text-white rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                BULK ORDER SPECIFICATION
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1.5 max-w-2xl leading-relaxed">
              <strong>Minimum Order Quantity: {MIN_WHOLESALE_QTY} Pieces.</strong> You are never restricted to a single size or color. Distribute your total quantity freely across any combination below.
            </p>
          </div>

          {/* Live Progress Pill */}
          <div className="shrink-0 flex items-center gap-4 bg-neutral-900 px-5 py-3 rounded-2xl border border-neutral-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                Total Pieces Selected
              </span>
              <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {totalQuantity} <span className="text-xs font-normal text-neutral-400">/ {MIN_WHOLESALE_QTY} min</span>
              </span>
            </div>
            {isValidMinimum ? (
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}
          </div>
        </section>

        {/* Section 3 & 4 & 5 & 6: ADVANCED SIZE + COLOR COMBINATION MATRIX */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
                DISTRIBUTE SIZES &amp; COLORS
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                Customize how many pieces of each size and color you want in your batch.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-neutral-400 uppercase mr-1 hidden sm:inline">Presets:</span>
              <button
                type="button"
                onClick={() => handleQuickPreset('preset-25')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-neutral-800 transition-colors cursor-pointer shadow-2xs"
              >
                Even 25 Pcs
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('preset-50')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-neutral-800 transition-colors cursor-pointer shadow-2xs"
              >
                Even 50 Pcs
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('clear')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-200 hover:border-rose-400 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer shadow-2xs"
              >
                Reset Grid
              </button>
            </div>
          </div>

          {/* Desktop Matrix Table (visible on md+) */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-neutral-200 text-xs font-black uppercase tracking-wider text-neutral-700">
                  <th className="py-4 px-5 w-48">Fabric Color</th>
                  {product.sizes.map((sz) => (
                    <th key={sz} className="py-4 px-3 text-center">
                      Size {sz}
                    </th>
                  ))}
                  <th className="py-4 px-5 text-right">Color Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {product.colors.map((c) => {
                  const colorSum = Object.values(matrix[c.name] || {}).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={c.name} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Color Label */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="font-bold text-neutral-900">{c.name}</span>
                        </div>
                      </td>

                      {/* Size Columns */}
                      {product.sizes.map((sz) => {
                        const currentVal = matrix[c.name]?.[sz] || 0;
                        return (
                          <td key={sz} className="py-3 px-2 text-center">
                            <div className="inline-flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-white shadow-2xs hover:border-neutral-400 transition-colors">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(c.name, sz, -1)}
                                className="w-8 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 font-bold active:bg-neutral-200 cursor-pointer"
                                aria-label={`Decrease ${c.name} ${sz}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={currentVal === 0 ? '' : currentVal}
                                onChange={(e) => handleSetDirectQty(c.name, sz, e.target.value)}
                                placeholder="0"
                                className="w-12 h-9 text-center text-xs font-black text-black focus:outline-none focus:bg-amber-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(c.name, sz, 1)}
                                className="w-8 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 font-bold active:bg-neutral-200 cursor-pointer"
                                aria-label={`Increase ${c.name} ${sz}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Row Subtotal */}
                      <td className="py-4 px-5 text-right">
                        <span
                          className={`font-black text-xs sm:text-sm px-3 py-1 rounded-lg ${
                            colorSum > 0 ? 'bg-neutral-900 text-white' : 'text-neutral-400 bg-neutral-100'
                          }`}
                        >
                          {colorSum} pcs
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAF9F5] border-t-2 border-neutral-300 text-xs font-black text-neutral-900">
                  <td className="py-4 px-5 uppercase tracking-wider">Size Totals:</td>
                  {product.sizes.map((sz) => (
                    <td key={sz} className="py-4 px-3 text-center">
                      <span className="font-black text-sm text-black">
                        {sizeBreakdown[sz] || 0} pcs
                      </span>
                    </td>
                  ))}
                  <td className="py-4 px-5 text-right">
                    <span className="text-base font-black text-black">
                      {totalQuantity} Pieces
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Touch-Friendly Accordion Cards (Requirement 14) */}
          <div className="md:hidden space-y-3">
            {product.colors.map((c) => {
              const isExpanded = activeMobileColor === c.name;
              const colorSum = Object.values(matrix[c.name] || {}).reduce((a, b) => a + b, 0);

              return (
                <div
                  key={c.name}
                  className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs"
                >
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => setActiveMobileColor(isExpanded ? '' : c.name)}
                    className="w-full p-4 flex items-center justify-between bg-neutral-50/70 hover:bg-neutral-100 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="font-bold text-sm text-black">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          colorSum > 0 ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {colorSum} pcs
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="p-4 divide-y divide-neutral-100 bg-white space-y-2.5">
                      {product.sizes.map((sz) => {
                        const currentVal = matrix[c.name]?.[sz] || 0;
                        return (
                          <div key={sz} className="pt-2.5 first:pt-0 flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-700 uppercase">
                              Size {sz}
                            </span>
                            <div className="flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(c.name, sz, -1)}
                                className="w-10 h-10 flex items-center justify-center text-neutral-700 active:bg-neutral-200 text-sm font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={currentVal === 0 ? '' : currentVal}
                                onChange={(e) => handleSetDirectQty(c.name, sz, e.target.value)}
                                placeholder="0"
                                className="w-14 h-10 text-center text-sm font-black text-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(c.name, sz, 1)}
                                className="w-10 h-10 flex items-center justify-center text-neutral-700 active:bg-neutral-200 text-sm font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 7: Live Validation Alert Banner */}
        <section>
          {isValidMinimum ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 text-emerald-900 text-sm font-semibold shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                ✓ <strong>Minimum quantity reached:</strong> You have selected {totalQuantity} pieces across your custom size and color distribution.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-3 text-amber-900 text-sm font-medium shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                {missingPieces === 1 ? (
                  <>You need <strong>1 more piece</strong> to meet the minimum wholesale quantity of 25.</>
                ) : (
                  <>Minimum wholesale order is 25 pieces. Please add <strong>{missingPieces} more pieces</strong>.</>
                )}
              </span>
            </div>
          )}
        </section>

        {/* Section 8: Custom Note Field */}
        <section className="space-y-2">
          <label className="block text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-700" />
            <span>ADD A NOTE (OPTIONAL)</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any special requirements, printing instructions, packaging requests, delivery instructions, or other notes..."
            className="w-full p-4 text-sm border border-neutral-300 rounded-2xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-white transition-all placeholder:text-neutral-400 shadow-2xs"
          />
        </section>

        {/* Section 9: Live Price Calculation Summary */}
        <section className="p-6 rounded-3xl bg-[#FAF9F5] border border-neutral-200 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 font-medium">Wholesale Rate per Piece</span>
            <span className="font-bold text-black tabular-nums">৳{unitPrice.toLocaleString('en-US')} / piece</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 font-medium">Total Quantity Selected</span>
            <span className="font-bold text-black tabular-nums">{totalQuantity} Pieces</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 font-medium">Delivery Charges</span>
            <span className="font-semibold text-neutral-500">Calculated at checkout (Doorstep delivery across Bangladesh)</span>
          </div>
          <div className="pt-3 border-t border-neutral-300 flex items-center justify-between text-base sm:text-lg">
            <span className="font-extrabold text-black uppercase tracking-tight">Estimated Total</span>
            <span className="text-2xl sm:text-3xl font-black text-black tabular-nums">
              ৳{subtotal.toLocaleString('en-US')}
            </span>
          </div>
        </section>

        {/* Section 10 & 11: Main WhatsApp Ordering Action */}
        <section className="space-y-3 pt-2">
          {isValidMinimum ? (
            <a
              href={generateWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-[0.99] text-white font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer"
            >
              <MessageCircle className="w-6 h-6 fill-white" />
              <span>ORDER ON WHATSAPP ({WHATSAPP_DISPLAY})</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                alert(`Wholesale MOQ is ${MIN_WHOLESALE_QTY} pieces. Please select at least ${missingPieces} more piece(s) to order on WhatsApp.`);
              }}
              className="w-full py-4 px-6 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-neutral-400" />
              <span>MINIMUM ORDER IS 25 PIECES (NEED {missingPieces} MORE)</span>
            </button>
          )}

          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 font-medium">
            Clicking opens WhatsApp directly with your exact breakdown of sizes, colors, quantities, and notes formatted and ready to send.
          </p>
        </section>

      </main>

      {/* 3. Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141720]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 p-3.5 px-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase">
            {totalQuantity} Pcs · Rate ৳{unitPrice}/pc
          </span>
          <span className="text-base font-black text-black dark:text-white tabular-nums">
            ৳{subtotal.toLocaleString('en-US')}
          </span>
        </div>

        <div>
          {isValidMinimum ? (
            <a
              href={generateWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-5 rounded-xl bg-[#25D366] text-white font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Order on WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                alert(`Wholesale MOQ is ${MIN_WHOLESALE_QTY} pieces. Please select at least ${missingPieces} more piece(s).`);
              }}
              className="py-3 px-4 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[11px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Need {missingPieces} more</span>
            </button>
          )}
        </div>
      </div>

      {/* Image Zoom Lightbox Modal */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        images={imageGallery.map((i) => i.url)}
        currentIndex={selectedImageIndex}
        onSelectIndex={(idx) => setSelectedImageIndex(idx)}
        productName={product.name}
        colorHex={previewColorObj?.hex}
        garmentType={garmentType}
      />

    </div>
  );
};
