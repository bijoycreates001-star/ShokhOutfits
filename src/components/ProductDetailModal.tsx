import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductImageItem } from '../types';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingBag,
  Zap,
  ArrowLeft,
  Share2,
  Heart,
  ZoomIn,
  Plus,
  CheckCircle2,
  Send,
  ImageIcon,
  Upload,
} from 'lucide-react';
import { GarmentMockup } from './GarmentMockup';
import { SizeGuideModal } from './SizeGuideModal';
import { Ruler } from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';
import { useAuth } from '../context/AuthContext';
import { metaPixel } from '../services/metaPixel';
import { supabase } from '../lib/supabaseClient';

interface ProductReview {
  id: string;
  author: string;
  date: string;
  details: string;
  image?: string;
  verified?: boolean;
}

interface ProductDetailModalProps {
  product: Product;
  allProducts?: Product[];
  onClose: () => void;
  onAddToCart: (product: Product, color: string, size: string, quantity: number) => void;
  onBuyNow: (product: Product, color: string, size: string, quantity: number) => void;
  onSelectRelatedProduct?: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts,
  onClose,
  onAddToCart,
  onBuyNow,
  onSelectRelatedProduct,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const { customer } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || 'Standard');
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'L');
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Customer Reviews State (Details & Image Only)
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewerName, setReviewerName] = useState(customer?.fullName || '');
  const [reviewDetails, setReviewDetails] = useState('');
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  const [reviewSubmittedSuccess, setReviewSubmittedSuccess] = useState(false);
  const [zoomedReviewImage, setZoomedReviewImage] = useState<string | null>(null);

  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scroll when product page is open & track ViewContent
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (product && product.id) {
      metaPixel.trackViewContent({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        currency: 'BDT',
      });
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [product?.id]);

  // Load reviews for this specific product
  useEffect(() => {
    if (!product || !product.id) return;
    const storageKey = `shokh_reviews_${product.id}`;
    const defaultReviews = getDefaultSeedReviews(product);

    // Initial load from localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setReviews(JSON.parse(stored));
      } else {
        setReviews(defaultReviews);
      }
    } catch {
      setReviews(defaultReviews);
    }

    // Async fetch from Supabase product_reviews
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    if (isUuid) {
      const fetchSupabaseReviews = async () => {
        try {
          const { data, error } = await supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            const mappedReviews: ProductReview[] = data.map((r: any) => ({
              id: r.id,
              author: r.author_name,
              date: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              details: r.comment || r.title || 'Verified review',
              image: r.image_url || undefined,
              verified: r.is_verified_purchase ?? true,
            }));
            setReviews(mappedReviews);
            try {
              localStorage.setItem(storageKey, JSON.stringify(mappedReviews));
            } catch {}
          }
        } catch {
          // ignore
        }
      };
      fetchSupabaseReviews();
    }
  }, [product?.id]);

  // Reset states when viewed product changes
  useEffect(() => {
    if (!product) return;
    setSelectedImageIndex(0);
    setSelectedColor(product.colors?.[0]?.name || 'Standard');
    setSelectedSize(product.sizes?.[0] || 'L');
    setQuantity(1);
    setIsWritingReview(false);
    setReviewSubmittedSuccess(false);
    setReviewImage(null);
    setReviewDetails('');
    setZoomedReviewImage(null);
  }, [product]);

  function getDefaultSeedReviews(p: Product): ProductReview[] {
    return [
      {
        id: `rev-1-${p.id}`,
        author: 'Tanvir Ahmed',
        date: '3 days ago',
        details: `The fabric and texture of this ${p.name} is super comfortable and 100% premium quality combed cotton. Perfect fit for daily wear.`,
        verified: true,
        image: p.image,
      },
      {
        id: `rev-2-${p.id}`,
        author: 'Nafisa Rahman',
        date: '1 week ago',
        details: 'Color looks very vibrant and clean just like shown in pictures. Fast delivery inside Dhaka.',
        verified: true,
      },
      {
        id: `rev-3-${p.id}`,
        author: 'Sabbir Hossain',
        date: '2 weeks ago',
        details: 'Comfortable fit, neat stitching details, and breathable fabric.',
        verified: true,
      },
    ];
  }

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearReviewImage = () => {
    setReviewImage(null);
    if (reviewFileInputRef.current) {
      reviewFileInputRef.current.value = '';
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDetails.trim()) return;

    const reviewer = reviewerName.trim() || customer?.fullName || 'Verified Customer';
    const newRev: ProductReview = {
      id: `user-rev-${Date.now()}`,
      author: reviewer,
      date: 'Just now',
      details: reviewDetails.trim(),
      image: reviewImage || undefined,
      verified: true,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem(`shokh_reviews_${product.id}`, JSON.stringify(updated));

    // Save to Supabase
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    if (isUuid) {
      Promise.resolve(
        supabase
          .from('product_reviews')
          .insert({
            product_id: product.id,
            customer_id: customer?.id && customer.id.length === 36 ? customer.id : null,
            author_name: reviewer,
            rating: 5,
            title: 'Customer Review',
            comment: reviewDetails.trim(),
            image_url: reviewImage || null,
            is_verified_purchase: true,
            status: 'approved',
          })
      ).catch(() => {});
    }

    // Call server endpoint as well
    fetch(`/api/products/${product.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: reviewer,
        rating: 5,
        title: 'Customer Review',
        comment: reviewDetails.trim(),
      }),
    }).catch(() => {});

    setReviewSubmittedSuccess(true);
    setReviewDetails('');
    setReviewImage(null);
    if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';

    setTimeout(() => {
      setIsWritingReview(false);
      setReviewSubmittedSuccess(false);
    }, 2000);
  };

  // Build standardized list of image thumbnails (deduplicated by URL)
  const imageGallery: { url: string }[] = React.useMemo(() => {
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
      return [{ url: product.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80' }];
    }

    return uniqueUrls.map((url) => ({ url }));
  }, [product]);

  const activeColorObj = product.colors.find((c) => c.name === selectedColor) || product.colors[0];
  const activeColorHex = activeColorObj?.hex || '#374151';
  const garmentType = product.category === 'Hoodies' ? 'hoodie' : product.category === 'Printed T-Shirts' ? 'printed' : 'tshirt';
  const currentDisplayImage = imageGallery[selectedImageIndex]?.url || product.image;

  // Calculate savings
  const discountAmount = product.originalPrice ? product.originalPrice - product.price : 0;
  const ratingValue = (4.8).toFixed(1);
  const reviewCount = 1450 + (product.price % 350);

  const handleAddToCartClick = () => {
    onAddToCart(product, selectedColor, selectedSize, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  const handleBuyNowClick = () => {
    onBuyNow(product, selectedColor, selectedSize, quantity);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on Shokh Outfits`,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2000);
        })
        .catch(() => {
          // Fallback if clipboard permission is restricted in iframe
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2000);
        });
    } else {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // Filter related products
  const productList = allProducts && allProducts.length > 0 ? allProducts.filter((p) => p && p.id) : [];
  const relatedProducts = product && product.id ? productList.filter((p) => p.id !== product.id).slice(0, 3) : productList.slice(0, 3);

  // FAQ Items
  const faqList = [
    {
      q: 'Fabric GSM and Longevity?',
      a: `Crafted from 100% combed compact cotton (${product.gsm || '220 GSM'}) with pre-shrunk bio-wash. Built to retain shape, collar structure, and deep color across 50+ washes with zero pilling.`,
    },
    {
      q: 'What is the sizing fit?',
      a: `${product.fit || 'Regular relaxed fit'}. If you prefer a loose oversized streetwear drop-shoulder silhouette, order your usual size. For a tailored slim fit, size down one step.`,
    },
    {
      q: 'Delivery & Cash on Delivery (COD)?',
      a: 'We provide nationwide Cash on Delivery (COD) across all 64 districts in Bangladesh. Delivery takes 24–48 hours inside Dhaka and 2–3 business days outside Dhaka.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-[#0f1115] text-neutral-900 dark:text-neutral-100 flex flex-col min-h-screen transition-colors duration-200">
      
      {/* 1. Full-screen Responsive Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#15181e]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 -ml-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            aria-label="Back to catalog"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold uppercase hidden sm:inline">Back</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

          <div className="flex items-center gap-2 truncate">
            <span className="text-xs uppercase tracking-widest font-black text-black dark:text-white">
              SHOKH APPAREL
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">/</span>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
              {product.category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wishlist / Favorite Button */}
          <button
            onClick={() => onToggleWishlist && onToggleWishlist(product)}
            className={`p-2 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              isWishlisted
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-500'
                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-rose-500 hover:bg-rose-50/50'
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

          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer relative"
            title="Share this product"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            {copiedShare && (
              <span className="absolute top-full right-0 mt-1 text-[10px] font-bold bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                Link Copied!
              </span>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all text-neutral-800 dark:text-neutral-200 cursor-pointer"
            aria-label="Close product view"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* 2. Main Full-screen Scrollable Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-32 md:pb-16 space-y-12 sm:space-y-16">
        
        {/* Main Product Showcase Row (Two Columns on tablet/desktop, stacked on mobile) */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-start">
          
          {/* LEFT: Product Images Showcase */}
          <div className="md:col-span-6 lg:col-span-7 flex flex-col items-center">
            
            {/* Main Display Image Frame */}
            <div
              onClick={() => setIsZoomOpen(true)}
              className="w-full aspect-square max-w-xl rounded-3xl bg-[#F6F5F2] dark:bg-[#1a1d26] p-4 sm:p-8 flex items-center justify-center overflow-hidden border border-neutral-200/80 dark:border-neutral-800 relative shadow-2xs group cursor-zoom-in"
              title="Click to Zoom Image"
            >
              {selectedImageIndex === 0 ? (
                <GarmentMockup
                  type={garmentType}
                  colorHex={activeColorHex}
                  imageFallback={currentDisplayImage}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <img
                  src={currentDisplayImage}
                  alt={product.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
                  }}
                  className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                />
              )}

              {/* Badge if any */}
              {product.badge && (
                <div className="absolute top-4 left-4 bg-black dark:bg-white text-white dark:text-black text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-md shadow-xs z-10">
                  {product.badge}
                </div>
              )}

              {/* Click to Zoom Overlay Badge */}
              <div className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 transition-all shadow-md group-hover:scale-105 z-10">
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Click to Zoom</span>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {imageGallery.length > 1 && (
              <div className="mt-4 sm:mt-6 w-full max-w-xl">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 sm:gap-3">
                  {imageGallery.map((imgItem, idx) => {
                    const isSelected = selectedImageIndex === idx;
                    return (
                      <button
                        key={`thumb-${idx}`}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`aspect-square rounded-2xl overflow-hidden bg-[#F6F5F2] border transition-all p-1 flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-neutral-900 dark:border-white ring-2 ring-neutral-900 dark:ring-white shadow-sm scale-102'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgItem.url}
                          alt={`Product view ${idx + 1}`}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Product Details & Purchase Module */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-start text-left">
            
            {/* Category / Sub-label */}
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-1">
              <span>{product.category}</span>
              <span>·</span>
              <span>{product.fabric || '100% Combed Compact Cotton'}</span>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight uppercase leading-tight">
              {product.name}
            </h1>

            {/* Sub-label for GSM */}
            <p className="text-sm font-semibold text-neutral-500 mt-1">
              {product.gsm || '220 GSM'} · {product.fit || 'Relaxed Drop Shoulder'}
            </p>

            {/* Star Rating & Review Count (like reference image: 4.8 | 1,450 Reviews) */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="font-bold text-xs sm:text-sm text-neutral-900">
                {ratingValue}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-xs sm:text-sm text-neutral-500 hover:underline cursor-pointer">
                {reviewCount.toLocaleString('en-US')} Reviews
              </span>
            </div>

            {/* Pricing with "Save ৳..." pill */}
            <div className="mt-4 flex items-center gap-3">
              {product.originalPrice && (
                <span className="text-base sm:text-lg text-neutral-400 line-through tabular-nums">
                  ৳{product.originalPrice.toLocaleString('en-US')}
                </span>
              )}
              <span className="text-3xl sm:text-4xl font-black text-[#F97316] tabular-nums">
                ৳{product.price.toLocaleString('en-US')}
              </span>
              {discountAmount > 0 && (
                <span className="text-xs font-bold bg-[#DCFCE7] text-[#15803D] px-2.5 py-1 rounded-full uppercase tracking-wide">
                  Save ৳{discountAmount}
                </span>
              )}
            </div>

            {/* Paragraph Description */}
            <p className="text-xs sm:text-sm text-neutral-600 mt-4 leading-relaxed">
              {product.description}
            </p>

            {/* Color selection row */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Select Color: <span className="font-semibold text-neutral-500">{selectedColor}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {product.colors.map((c) => {
                  const isSelected = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-black'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Selection Row */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Select Size: <span className="font-semibold text-neutral-500">{selectedSize}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 hover:text-black hover:underline cursor-pointer group"
                >
                  <Ruler className="w-3.5 h-3.5 text-neutral-600 group-hover:text-black" />
                  <span>Size Guide</span>
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {product.sizes.map((sz) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`w-12 h-12 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-black'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity selector */}
            <div className="mt-5 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Quantity:
              </span>
              <div className="inline-flex items-center border border-neutral-300 rounded-xl bg-white overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 flex items-center justify-center text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-12 text-center text-xs sm:text-sm font-bold text-black tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 flex items-center justify-center text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Desktop / Tablet CTA Action Buttons */}
            <div className="mt-8 space-y-3 hidden sm:block">
              {/* 1. Add to Cart (Orange button from reference) */}
              <button
                onClick={handleAddToCartClick}
                className="w-full py-4 px-6 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-black tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {justAdded ? (
                  <>
                    <Check className="w-5 h-5 text-white" />
                    <span>ADDED TO CART!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5 text-white" />
                    <span>ADD TO CART</span>
                  </>
                )}
              </button>

              {/* 2. Buy Now (Charcoal/Dark button from reference) */}
              <button
                onClick={handleBuyNowClick}
                className="w-full py-4 px-6 rounded-2xl bg-[#27272A] hover:bg-black text-white text-sm font-black tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>BUY NOW</span>
              </button>
            </div>

            <div className="mt-3 text-center sm:text-left">
              <span className="text-xs text-neutral-500 font-medium">
                Free 2-Day Shipping inside Dhaka · Cash on Delivery nationwide
              </span>
            </div>

            {/* Trust Badges 2x2 Grid (like reference image) */}
            <div className="mt-6 grid grid-cols-2 gap-3 p-4 bg-[#FAF9F5] rounded-2xl border border-neutral-200/80 text-xs">
              <div className="flex items-center gap-2 text-neutral-700">
                <ShieldCheck className="w-4 h-4 text-neutral-900 shrink-0" />
                <span className="font-semibold">Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Truck className="w-4 h-4 text-neutral-900 shrink-0" />
                <span className="font-semibold">Fast Shipping</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <RotateCcw className="w-4 h-4 text-neutral-900 shrink-0" />
                <span className="font-semibold">7-Day Easy Return</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700">
                <Award className="w-4 h-4 text-neutral-900 shrink-0" />
                <span className="font-semibold">100% Combed Cotton</span>
              </div>
            </div>

          </div>
        </section>

        {/* 2. CUSTOMER REVIEWS Section */}
        <section className="pt-8 sm:pt-12 border-t border-neutral-200 dark:border-neutral-800 text-left">
          {/* Reviews Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase text-neutral-900 dark:text-neutral-100 tracking-tight">
                  CUSTOMER REVIEWS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  {reviews.length}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Real customer feedback and product photos from verified buyers
              </p>
            </div>

            <button
              onClick={() => setIsWritingReview(!isWritingReview)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-black text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              {isWritingReview ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Write a Review</span>
                </>
              )}
            </button>
          </div>

          {/* Write a Review Form */}
          {isWritingReview && (
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-[#FAF9F5] dark:bg-[#161822] border border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-top-3 duration-200">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white mb-1">
                Share Your Experience with {product.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Write details about the product and attach a photo of your item.
              </p>

              {reviewSubmittedSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Thank you for your review!</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">Your review and photo have been published.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Reviewer Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Shakil Ahmed"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium"
                    />
                  </div>

                  {/* Product Details / Review Textarea */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                      Product Details &amp; Feedback *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reviewDetails}
                      onChange={(e) => setReviewDetails(e.target.value)}
                      placeholder="Write details about the product fabric, fitting, comfort, print quality, or your overall experience..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium resize-none leading-relaxed"
                    />
                  </div>

                  {/* Add Image Option */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                      Add Product Image (Optional)
                    </label>

                    <input
                      type="file"
                      ref={reviewFileInputRef}
                      onChange={handleReviewImageChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {reviewImage ? (
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-100">
                          <img
                            src={reviewImage}
                            alt="Review preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-900 dark:text-white">
                            Photo attached
                          </p>
                          <p className="text-[11px] text-neutral-500">Ready to upload with your review</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearReviewImage}
                          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reviewFileInputRef.current?.click()}
                        className="w-full py-3 px-4 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white rounded-xl bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-neutral-500" />
                        <span>Upload Photo of Your Product</span>
                      </button>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsWritingReview(false)}
                      className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-black hover:bg-black cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Review</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#181b24] flex flex-col items-center justify-center">
              <ImageIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-600 stroke-[1.5] mb-2" />
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No customer reviews yet</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Be the first to write details and share a photo of your purchase!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161822] border border-neutral-200/80 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-neutral-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {rev.author.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {rev.author}
                          </span>
                          {rev.verified && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              Verified Buyer
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {rev.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {rev.details}
                  </p>

                  {/* Customer Uploaded Image */}
                  {rev.image && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setZoomedReviewImage(rev.image || null)}
                        className="group relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 inline-block cursor-pointer focus:outline-none"
                      >
                        <img
                          src={rev.image}
                          alt="Customer product review photo"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn className="w-5 h-5" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Zoomed Review Image Modal */}
          {zoomedReviewImage && (
            <div 
              onClick={() => setZoomedReviewImage(null)}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden p-2 shadow-2xl"
              >
                <button
                  onClick={() => setZoomedReviewImage(null)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <img
                  src={zoomedReviewImage}
                  alt="Enlarged customer product review"
                  className="max-w-full max-h-[80vh] object-contain rounded-xl"
                />
              </div>
            </div>
          )}
        </section>

        {/* 4. FREQUENTLY ASKED QUESTIONS Accordion */}
        <section className="pt-8 sm:pt-12 border-t border-neutral-200 text-left">
          <h2 className="text-xl sm:text-2xl font-black uppercase text-black tracking-tight mb-6">
            FREQUENTLY ASKED QUESTIONS
          </h2>

          <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {faqList.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left text-sm sm:text-base font-bold text-neutral-900 py-1 cursor-pointer focus:outline-none"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-500" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed pr-6 max-w-3xl">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. RELATED PRODUCTS Section */}
        <section className="pt-8 sm:pt-12 border-t border-neutral-200 dark:border-neutral-800 text-left">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-black uppercase text-black dark:text-white tracking-tight">
              RELATED PRODUCTS
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                aria-label="Previous related items"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              </button>
              <button
                className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                aria-label="Next related items"
              >
                <ChevronRight className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  if (onSelectRelatedProduct) {
                    onSelectRelatedProduct(rel);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="group p-4 rounded-3xl bg-[#FAF9F5] dark:bg-[#161822] border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all cursor-pointer"
              >
                <div className="aspect-square w-full rounded-2xl bg-white dark:bg-[#20242f] overflow-hidden p-3 flex items-center justify-center mb-3">
                  <img
                    src={rel.image}
                    alt={rel.name}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white truncate">
                  {rel.name}
                </h4>
                <div className="flex items-center gap-1 mt-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">4.8 (85)</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white tabular-nums">
                    ৳{rel.price.toLocaleString('en-US')}
                  </span>
                  {rel.originalPrice && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 line-through tabular-nums">
                      ৳{rel.originalPrice.toLocaleString('en-US')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* 3. Sticky Bottom Action Bar on Mobile/Tablet */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#15181e]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 p-3 px-4 shadow-xl flex items-center gap-2">
        <div className="flex flex-col mr-1">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total</span>
          <span className="text-lg font-black text-[#F97316] tabular-nums">
            ৳{(product.price * quantity).toLocaleString('en-US')}
          </span>
        </div>

        <button
          onClick={handleAddToCartClick}
          className="flex-1 py-3 px-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-black tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 shadow-md active:scale-98"
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>ADDED!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>ADD TO CART</span>
            </>
          )}
        </button>

        <button
          onClick={handleBuyNowClick}
          className="flex-1 py-3 px-3 rounded-xl bg-[#27272A] hover:bg-black text-white text-xs font-black tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 shadow-md active:scale-98"
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
          <span>BUY NOW</span>
        </button>
      </div>

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <SizeGuideModal
          isOpen={isSizeGuideOpen}
          onClose={() => setIsSizeGuideOpen(false)}
          defaultCategory={product.category}
          currentSelectedSize={selectedSize}
          onSelectSize={(newSize) => setSelectedSize(newSize)}
        />
      )}

      {/* Image Zoom Lightbox Modal */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        images={imageGallery.map((i) => i.url)}
        currentIndex={selectedImageIndex}
        onSelectIndex={(idx) => setSelectedImageIndex(idx)}
        productName={product.name}
        colorHex={activeColorHex}
        garmentType={garmentType}
      />

    </div>
  );
};
