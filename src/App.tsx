import React, { useState, useEffect } from 'react';
import { Product, CartItem, PlacedOrder, CategoryType, WholesaleMatrixEntry } from './types';
import { useProducts } from './context/ProductContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { TrustFeatureBar } from './components/TrustFeatureBar';
import { Categories } from './components/Categories';
import { HomeProductSection } from './components/HomeProductSection';
import { ShopPage } from './components/ShopPage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CustomTshirtPage } from './components/CustomTshirtPage';
import { WholesalePage } from './components/WholesalePage';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { FavoritesModal } from './components/FavoritesModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { Footer } from './components/Footer';
import { Check, ShoppingBag, X } from 'lucide-react';
import { useWishlist } from './hooks/useWishlist';
import { AdminPanel } from './components/admin/AdminPanel';
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';
import { CustomerAccountDrawer } from './components/customer/CustomerAccountDrawer';
import { metaPixel } from './services/metaPixel';
import { api } from './services/api';

export default function App() {
  const { products, refreshProducts } = useProducts();
  const [activeTab, setActiveTab] = useState<'home' | 'shop' | 'customize' | 'wholesale'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopCategory, setSelectedShopCategory] = useState<CategoryType>('All');
  
  // Admin View State with URL sync
  const [isAdminView, setIsAdminView] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname.startsWith('/admin') ||
        window.location.search.includes('admin=true') ||
        window.location.hash.includes('admin')
      );
    }
    return false;
  });

  // Meta Pixel Global Init and Dynamic Sync
  useEffect(() => {
    // 1. Initial local config load
    metaPixel.init();

    // 2. Fetch remote store settings (from Supabase or API)
    const loadSettings = async () => {
      try {
        const res = await api.getPublicStoreSettings();
        if (res && res.success && res.settings) {
          metaPixel.syncSettings({
            metaPixelEnabled: res.settings.metaPixelEnabled !== false,
            metaPixelId: res.settings.metaPixelId || '1421849056571633',
          });
        }
      } catch {
        // ignore
      }
    };
    loadSettings();

    // 3. Listen to live updates from Admin Settings
    const handlePixelUpdated = (e: any) => {
      if (e?.detail) {
        metaPixel.syncSettings({
          metaPixelEnabled: e.detail.metaPixelEnabled,
          metaPixelId: e.detail.metaPixelId,
        });
      }
    };

    window.addEventListener('shokh_meta_pixel_updated', handlePixelUpdated);
    return () => {
      window.removeEventListener('shokh_meta_pixel_updated', handlePixelUpdated);
    };
  }, []);

  useEffect(() => {
    if (isAdminView) {
      metaPixel.trackPageView('/admin', 'Admin Dashboard - Shokh Outfits');
    } else {
      const tabPaths: Record<string, { path: string; title: string }> = {
        home: { path: '/', title: 'Home - Shokh Outfits' },
        shop: { path: '/shop', title: 'Shop - Shokh Outfits' },
        customize: { path: '/customize', title: 'Custom Garments - Shokh Outfits' },
        wholesale: { path: '/wholesale', title: 'Wholesale Orders - Shokh Outfits' },
      };
      const info = tabPaths[activeTab] || { path: `/${activeTab}`, title: `${activeTab} - Shokh Outfits` };
      metaPixel.trackPageView(info.path, info.title);
    }
  }, [activeTab, isAdminView]);

  const handleOpenAdmin = () => {
    setIsAdminView(true);
    try {
      window.history.pushState(null, '', '/admin');
    } catch {
      // fallback
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitAdmin = () => {
    setIsAdminView(false);
    refreshProducts();
    try {
      window.history.pushState(null, '', '/');
    } catch {
      // fallback
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Cart state with localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shokh_cart') || localStorage.getItem('kala_shada_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Wishlist state
  const {
    wishlistProducts,
    wishlistCount,
    toggleWishlist,
    isWishlisted,
    clearWishlist,
  } = useWishlist(products);

  // Modal states
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [globalSizeGuideOpen, setGlobalSizeGuideOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingWholesaleItem, setEditingWholesaleItem] = useState<CartItem | null>(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shokh_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  // Show brief feedback toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 2800);
  };

  const handleToggleWishlistWithFeedback = (product: Product) => {
    if (!product || !product.id) return;
    const isNowSaved = toggleWishlist(product.id);
    if (isNowSaved) {
      showToast(`Added "${product.name}" to My Favorites`);
      metaPixel.trackAddToWishlist({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        currency: 'BDT',
      });
    } else {
      showToast(`Removed "${product.name}" from My Favorites`);
    }
  };

  // Add to cart handler
  const handleAddToCart = (product: Product, color: string, size: string, quantity = 1) => {
    if (!product || !product.id) return;
    const matchedVariant = product.variants?.find(
      (v) => v.color.toLowerCase() === color.toLowerCase() && v.size.toUpperCase() === size.toUpperCase()
    ) || product.variants?.find(
      (v) => v.size.toUpperCase() === size.toUpperCase()
    );

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (it) => !it.isWholesale && it.product?.id === product.id && it.selectedColor === color && it.selectedSize === size
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        if (matchedVariant?.id) {
          updated[existingIndex].selectedVariantId = matchedVariant.id;
        }
        return updated;
      } else {
        const newItem: CartItem = {
          id: `${product.id}-${color}-${size}-${Date.now()}`,
          product,
          selectedColor: color,
          selectedSize: size,
          selectedVariantId: matchedVariant?.id,
          quantity,
        };
        return [...prevItems, newItem];
      }
    });

    showToast(`Added ${quantity}x ${product.name} to cart`);

    // Track Meta Pixel AddToCart event
    metaPixel.trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity,
      currency: 'BDT',
    });
  };

  // Wholesale Add to Cart handler
  const handleAddWholesaleToCart = (
    product: Product,
    totalQty: number,
    matrix: WholesaleMatrixEntry[],
    note: string,
    unitPrice: number
  ) => {
    const sizeDist: Record<string, number> = {};
    const colorDist: Record<string, number> = {};
    matrix.forEach((entry) => {
      sizeDist[entry.size] = (sizeDist[entry.size] || 0) + entry.quantity;
      colorDist[entry.color] = (colorDist[entry.color] || 0) + entry.quantity;
    });

    setCartItems((prevItems) => {
      if (editingWholesaleItem) {
        return prevItems.map((it) => {
          if (it.id === editingWholesaleItem.id) {
            return {
              ...it,
              quantity: totalQty,
              wholesaleUnitPrice: unitPrice,
              wholesaleBreakdown: matrix,
              wholesaleNote: note,
              sizeDistribution: sizeDist,
              colorDistribution: colorDist,
            };
          }
          return it;
        });
      }

      const existingIdx = prevItems.findIndex(
        (it) => it.isWholesale && it.product?.id === product.id
      );

      const newItem: CartItem = {
        id: `wholesale-${product.id}-${Date.now()}`,
        product,
        selectedColor: Object.keys(colorDist)[0] || 'Mixed Colors',
        selectedSize: Object.keys(sizeDist)[0] || 'Mixed Sizes',
        quantity: totalQty,
        isWholesale: true,
        wholesaleUnitPrice: unitPrice,
        wholesaleBreakdown: matrix,
        wholesaleNote: note,
        sizeDistribution: sizeDist,
        colorDistribution: colorDist,
      };

      if (existingIdx > -1) {
        const copy = [...prevItems];
        copy[existingIdx] = newItem;
        return copy;
      }

      return [...prevItems, newItem];
    });

    setEditingWholesaleItem(null);
    showToast(`Added Wholesale Order (${totalQty} pcs) to cart`);

    // Track Meta Pixel AddToCart event for Wholesale
    metaPixel.trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.category || 'Wholesale Apparel',
      price: unitPrice || product.wholesalePrice || product.price,
      quantity: totalQty,
      currency: 'BDT',
    });
  };

  // Custom Garment Website Order handler
  const handleCustomOrderFromWebsite = (customItems: CartItem[]) => {
    setCartItems((prevItems) => {
      return [...prevItems, ...customItems];
    });
    setCheckoutModalOpen(true);
    showToast(`Added ${customItems.length} custom garment(s) to order! Proceeding to Checkout`);
  };

  // Wholesale Buy Now handler
  const handleWholesaleBuyNow = (
    product: Product,
    totalQty: number,
    matrix: WholesaleMatrixEntry[],
    note: string,
    unitPrice: number
  ) => {
    handleAddWholesaleToCart(product, totalQty, matrix, note, unitPrice);
    setCheckoutModalOpen(true);
  };

  // Edit Wholesale Item from Cart
  const handleEditWholesaleItem = (item: CartItem) => {
    setEditingWholesaleItem(item);
    setCartDrawerOpen(false);
    setActiveTab('wholesale');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Buy Now handler (add to cart and directly open checkout)
  const handleBuyNow = (product: Product, color: string, size: string, quantity = 1) => {
    handleAddToCart(product, color, size, quantity);
    setViewingProduct(null);
    setCheckoutModalOpen(true);
  };

  // Cart quantity update
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === itemId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove single item from cart
  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Clear entire cart after successful order
  const handleClearCart = () => {
    setCartItems([]);
  };

  // Switch category and navigate to Shop
  const handleSelectCategory = (catName: string, searchQueryTerm = '') => {
    // Map category name to valid CategoryType
    if (catName === 'Hoodies') {
      setSelectedShopCategory('Hoodies');
    } else if (catName === 'Printed T-Shirts') {
      setSelectedShopCategory('Printed T-Shirts');
    } else if (catName === 'T-Shirts') {
      setSelectedShopCategory('T-Shirts');
    } else {
      setSelectedShopCategory('All');
    }

    if (searchQueryTerm) {
      setSearchQuery(searchQueryTerm);
    } else if (catName === 'Oversized') {
      setSelectedShopCategory('T-Shirts');
      setSearchQuery('Oversized');
    }

    setActiveTab('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  // If in admin mode, render the Admin Panel
  if (isAdminView) {
    return <AdminPanel onExitToStore={handleExitAdmin} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#0f1115] text-black dark:text-neutral-100 flex flex-col font-sans selection:bg-black dark:selection:bg-neutral-100 selection:text-white dark:selection:text-black transition-colors duration-200">
      
      {/* 1. Sticky Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={totalCartCount}
        openCart={() => setCartDrawerOpen(true)}
        wishlistCount={wishlistCount}
        openWishlist={() => setFavoritesModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={() => {
          setActiveTab('shop');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <>
            {/* 1. Hero Banner */}
            <Hero
              onShopNow={() => {
                setActiveTab('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onCustomize={() => {
                setActiveTab('customize');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 4-Item Trust Feature Bar (from reference) */}
            <TrustFeatureBar />

            {/* 2. Categories (Circular layout from reference) */}
            <Categories
              onSelectCategory={handleSelectCategory}
              onSelectCustom={() => {
                setActiveTab('customize');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onViewAllCategories={() => {
                setSelectedShopCategory('All');
                setSearchQuery('');
                setActiveTab('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 3. All Products & 4. See More Products */}
            <HomeProductSection
              products={products}
              onAddToCart={(prod, col, sz) => handleAddToCart(prod, col, sz, 1)}
              onViewProduct={(prod) => setViewingProduct(prod)}
              onViewAllProducts={() => {
                setActiveTab('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isWishlisted={isWishlisted}
              onToggleWishlist={handleToggleWishlistWithFeedback}
            />
          </>
        )}

        {activeTab === 'shop' && (
          <ShopPage
            products={products}
            selectedCategory={selectedShopCategory}
            onSelectCategory={(cat) => setSelectedShopCategory(cat)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onAddToCart={(prod, col, sz) => handleAddToCart(prod, col, sz, 1)}
            onViewProduct={(prod) => setViewingProduct(prod)}
            isWishlisted={isWishlisted}
            onToggleWishlist={handleToggleWishlistWithFeedback}
          />
        )}

        {activeTab === 'customize' && (
          <CustomTshirtPage onCustomOrderFromWebsite={handleCustomOrderFromWebsite} />
        )}

        {activeTab === 'wholesale' && (
          <WholesalePage
            products={products}
            onAddWholesaleToCart={handleAddWholesaleToCart}
            onWholesaleBuyNow={handleWholesaleBuyNow}
            isWishlisted={isWishlisted}
            onToggleWishlist={handleToggleWishlistWithFeedback}
            editingCartItem={editingWholesaleItem}
            onFinishEditingCartItem={() => setEditingWholesaleItem(null)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNav={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSizeGuide={() => setGlobalSizeGuideOpen(true)}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Product Detail Modal / Page View */}
      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          allProducts={products}
          onClose={() => setViewingProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onSelectRelatedProduct={(rel) => setViewingProduct(rel)}
          isWishlisted={viewingProduct && viewingProduct.id ? isWishlisted(viewingProduct.id) : false}
          onToggleWishlist={handleToggleWishlistWithFeedback}
        />
      )}

      {/* My Favorites Modal */}
      {favoritesModalOpen && (
        <FavoritesModal
          isOpen={favoritesModalOpen}
          onClose={() => setFavoritesModalOpen(false)}
          favorites={wishlistProducts}
          onRemoveFavorite={(productId) => {
            const prod = products.find((p) => p.id === productId);
            toggleWishlist(productId);
            if (prod) showToast(`Removed "${prod.name}" from My Favorites`);
          }}
          onClearAll={() => {
            clearWishlist();
            showToast('Cleared all favorites');
          }}
          onAddToCart={(prod, col, sz) => {
            handleAddToCart(prod, col, sz, 1);
          }}
          onViewProduct={(prod) => {
            setFavoritesModalOpen(false);
            setViewingProduct(prod);
          }}
          onExploreShop={() => {
            setFavoritesModalOpen(false);
            setActiveTab('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Slide-over Cart Drawer */}
      {cartDrawerOpen && (
        <CartDrawer
          isOpen={cartDrawerOpen}
          onClose={() => setCartDrawerOpen(false)}
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onProceedToCheckout={() => {
            setCartDrawerOpen(false);
            setCheckoutModalOpen(true);
          }}
          onEditWholesaleItem={handleEditWholesaleItem}
        />
      )}

      {/* Fast Checkout Modal */}
      {checkoutModalOpen && (
        <CheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          items={cartItems}
          onClearCart={handleClearCart}
          onOrderSuccess={(order: PlacedOrder) => {
            console.log('Order successfully placed:', order);
          }}
        />
      )}

      {/* Global Size & Fit Guide Modal (from Footer or Quick Links) */}
      {globalSizeGuideOpen && (
        <SizeGuideModal
          isOpen={globalSizeGuideOpen}
          onClose={() => setGlobalSizeGuideOpen(false)}
          defaultCategory="T-Shirts"
        />
      )}

      {/* Instant Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-4 py-3 border border-neutral-700 shadow-xl flex items-center gap-3 animate-fade-in text-xs sm:text-sm">
          <Check className="w-4 h-4 text-white shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
          <button
            onClick={() => {
              setToastMessage(null);
              setCartDrawerOpen(true);
            }}
            className="ml-2 underline font-bold uppercase text-[11px] hover:text-neutral-300 cursor-pointer"
          >
            View Cart
          </button>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white p-0.5 ml-1"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Customer Authentication Modal (Login / Register / Track Order) */}
      <CustomerAuthModal />

      {/* Customer Account & Order History Drawer */}
      <CustomerAccountDrawer
        onOpenAdmin={handleOpenAdmin}
        onReorder={(orderedItems: any[]) => {
          orderedItems.forEach((it) => {
            const product = products.find((p) => p.id === it.productId) || products[0];
            const color = it.variant?.color || product.colors[0]?.name || 'Charcoal Gray';
            const size = it.variant?.size || product.sizes[0] || 'L';
            const qty = it.quantity || 1;
            handleAddToCart(product, color, size, qty);
          });
          setCartDrawerOpen(true);
          showToast(`Added ${orderedItems.length} items to cart from previous order`);
        }}
      />

    </div>
  );
}
