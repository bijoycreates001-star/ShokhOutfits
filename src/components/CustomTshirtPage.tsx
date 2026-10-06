import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  ImageIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Trash2, 
  Tag, 
  Package, 
  Palette, 
  Ruler,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { supabase, logSupabaseError } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { Product, CartItem } from '../types';
import { metaPixel } from '../services/metaPixel';
import { uploadCustomDesignFile, MAX_FILE_SIZE_MB, ALLOWED_IMAGE_TYPES } from '../services/customDesignService';

export interface CustomItemConfig {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  color: string;
  size: string;
  quantity: number;
  details: string;
  selectedFile: File | null;
  previewUrl: string | null;
  uploadedPermanentUrl?: string | null;
  availableColors: Array<{ name: string; hex?: string }>;
  availableSizes: string[];
}

export interface CustomTshirtPageProps {
  onCustomOrderFromWebsite?: (items: CartItem[]) => void;
}

export const CustomTshirtPage: React.FC<CustomTshirtPageProps> = ({ onCustomOrderFromWebsite }) => {
  const { customer } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  
  // WhatsApp Configuration
  const whatsappNumber = '8801346068854';
  const rawFormattedPhone = '+880 1346-068854';

  // Filter real custom products added by admin with the "custom" option
  const customProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const validProds = products.filter((p) => p && p.id);
    
    // Only return products explicitly tagged with 'custom'
    return validProds.filter((p) => {
      const types: string[] = Array.isArray(p.productTypes) && p.productTypes.length > 0
        ? p.productTypes
        : [p.productType || 'normal'];
      
      const isCustomType = types.includes('custom') || (p.productType === 'custom');
      const isCustomCategory = (p.category || '').toLowerCase().includes('custom');
      return isCustomType || isCustomCategory;
    });
  }, [products]);

  // Customer Contact Info
  const [customerName, setCustomerName] = useState(customer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');

  // Selected Product IDs
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Per-Product Configuration State Map
  const [itemsConfig, setItemsConfig] = useState<Record<string, CustomItemConfig>>({});

  // Carousel ref for scrolling cursor
  const carouselRef = useRef<HTMLDivElement>(null);

  // Submission States
  const [submittingAction, setSubmittingAction] = useState<'website' | 'whatsapp' | null>(null);
  const [loadingStepText, setLoadingStepText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);

  // Sync customer details when auth changes
  useEffect(() => {
    if (customer) {
      if (!customerName && customer.fullName) setCustomerName(customer.fullName);
      if (!customerPhone && customer.phone) setCustomerPhone(customer.phone);
    }
  }, [customer]);

  // Helper to extract colors & sizes from a real Product
  const extractProductAttributes = (product: Product) => {
    const colors: Array<{ name: string; hex?: string }> = [];
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      product.colors.forEach((c) => {
        if (typeof c === 'string') {
          colors.push({ name: c, hex: '#374151' });
        } else if (c && c.name) {
          colors.push(c);
        }
      });
    }

    if (colors.length === 0 && Array.isArray(product.variants)) {
      const colorSet = new Set<string>();
      product.variants.forEach((v: any) => {
        if (v.color && !colorSet.has(v.color)) {
          colorSet.add(v.color);
          colors.push({ name: v.color, hex: v.color_hex || '#374151' });
        }
      });
    }

    if (colors.length === 0) {
      colors.push({ name: 'Standard / Default Color', hex: '#374151' });
    }

    let sizes: string[] = [];
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      sizes = product.sizes;
    } else if (Array.isArray(product.variants)) {
      const sizeSet = new Set<string>();
      product.variants.forEach((v: any) => {
        if (v.size) sizeSet.add(v.size);
      });
      sizes = Array.from(sizeSet);
    }

    if (sizes.length === 0) {
      sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    }

    return { colors, sizes };
  };

  // Initialize selected product when customProducts load
  useEffect(() => {
    if (customProducts.length > 0 && selectedProductIds.length === 0) {
      const firstProd = customProducts.find((p) => p && p.id);
      if (!firstProd || !firstProd.id) return;
      const { colors, sizes } = extractProductAttributes(firstProd);

      setSelectedProductIds([firstProd.id]);
      setItemsConfig({
        [firstProd.id]: {
          productId: firstProd.id,
          productName: firstProd.name,
          productPrice: firstProd.price,
          productImage: firstProd.image,
          color: colors[0]?.name || 'Standard Color',
          size: sizes[0] || 'L',
          quantity: 1,
          details: '',
          selectedFile: null,
          previewUrl: null,
          availableColors: colors,
          availableSizes: sizes,
        }
      });
    }
  }, [customProducts, selectedProductIds.length]);

  // Carousel Scroll Actions
  const handleScrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 260;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Toggle Product Selection (Multi-select)
  const handleToggleProduct = (product: Product) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    setSelectedProductIds((prevIds) => {
      const isAlreadySelected = prevIds.includes(product.id);

      if (isAlreadySelected) {
        if (prevIds.length === 1) return prevIds; // keep at least 1
        return prevIds.filter((id) => id !== product.id);
      } else {
        const { colors, sizes } = extractProductAttributes(product);

        setItemsConfig((prevConfigs) => {
          if (!prevConfigs[product.id]) {
            return {
              ...prevConfigs,
              [product.id]: {
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                productImage: product.image,
                color: colors[0]?.name || 'Standard Color',
                size: sizes[0] || 'L',
                quantity: 1,
                details: '',
                selectedFile: null,
                previewUrl: null,
                availableColors: colors,
                availableSizes: sizes,
              }
            };
          }
          return prevConfigs;
        });

        return [...prevIds, product.id];
      }
    });
  };

  // Update item field
  const handleUpdateItemConfig = (productId: string, field: keyof CustomItemConfig, value: any) => {
    setItemsConfig((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  // Handle File Change for a specific product
  const handleFileChangeForProduct = (productId: string, file: File | null) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!file) {
      const current = itemsConfig[productId];
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      handleUpdateItemConfig(productId, 'selectedFile', null);
      handleUpdateItemConfig(productId, 'previewUrl', null);
      handleUpdateItemConfig(productId, 'uploadedPermanentUrl', null);
      return;
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      setErrorMessage(`File is too large (${fileSizeMb.toFixed(1)}MB). Max allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    let objectUrl: string | null = null;
    if (file.type.startsWith('image/')) {
      objectUrl = URL.createObjectURL(file);
    }

    setItemsConfig((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selectedFile: file,
        previewUrl: objectUrl,
        uploadedPermanentUrl: null, // Reset previous upload cache when a new file is chosen
      }
    }));

    // Track Meta Pixel CustomizeProduct event
    metaPixel.trackCustomizeProduct({
      content_name: itemsConfig[productId]?.productName || 'Custom Garment',
      custom_options: `File: ${file.name}, Size: ${fileSizeMb.toFixed(2)}MB`,
    });
  };

  // Helper to validate common custom order inputs
  const validateCustomInputs = (): CustomItemConfig[] | null => {
    const activeItems = selectedProductIds.map((id) => itemsConfig[id]).filter(Boolean);

    if (activeItems.length === 0) {
      setErrorMessage('Please select at least one garment from the product selector.');
      return null;
    }

    // Check that for each selected item, either notes or an artwork file is provided
    for (const item of activeItems) {
      if (!item.details.trim() && !item.selectedFile) {
        setErrorMessage(`Please provide customization notes or upload artwork for "${item.productName}".`);
        return null;
      }
    }

    return activeItems;
  };

  /**
   * Upload all attached artwork files to Supabase Storage and obtain permanent HTTPS URLs.
   */
  const uploadAllArtworkFiles = async (
    activeItems: CustomItemConfig[]
  ): Promise<Array<CustomItemConfig & { permanentHttpsUrl: string }>> => {
    setLoadingStepText('Uploading design image(s) to secure storage...');

    const uploadedList: Array<CustomItemConfig & { permanentHttpsUrl: string }> = [];

    for (const item of activeItems) {
      let permanentHttpsUrl = item.uploadedPermanentUrl || '';

      if (item.selectedFile && !permanentHttpsUrl) {
        const uploadRes = await uploadCustomDesignFile(item.selectedFile, customer?.id);
        if (!uploadRes.success || !uploadRes.publicUrl) {
          throw new Error(uploadRes.error || `Failed to upload artwork for "${item.productName}".`);
        }
        permanentHttpsUrl = uploadRes.publicUrl;
        
        // Save uploaded URL to item state so repeated button clicks don't re-upload
        handleUpdateItemConfig(item.productId, 'uploadedPermanentUrl', permanentHttpsUrl);
      }

      uploadedList.push({
        ...item,
        permanentHttpsUrl,
      });
    }

    return uploadedList;
  };

  // =========================================================================
  // OPTION 1 — ORDER FROM WEBSITE
  // =========================================================================
  const handleOrderFromWebsite = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const activeItems = validateCustomInputs();
    if (!activeItems) return;

    setSubmittingAction('website');

    try {
      // 1. Upload designs to Supabase Storage and get permanent HTTPS URLs
      const readyItems = await uploadAllArtworkFiles(activeItems);

      setLoadingStepText('Preparing website checkout...');

      // 2. Convert to CartItem[]
      const cartItemsToCreate: CartItem[] = readyItems.map((it) => {
        const matchedProd = products.find((p) => p.id === it.productId) || {
          id: it.productId,
          name: it.productName,
          category: 'Printed T-Shirts' as const,
          price: it.productPrice,
          image: it.productImage,
          colors: it.availableColors.map((c) => ({ name: c.name, hex: c.hex || '#000000' })),
          sizes: it.availableSizes,
          description: it.details || 'Custom Design Garment',
          fabric: '100% Combed Cotton',
          gsm: '190 GSM',
          fit: 'Regular Fit',
        };

        return {
          id: `custom-${it.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          product: matchedProd,
          selectedColor: it.color,
          selectedSize: it.size,
          quantity: Math.max(1, Number(it.quantity) || 1),
          isCustom: true,
          customDesignUrl: it.permanentHttpsUrl || undefined,
          customNote: it.details.trim() || undefined,
          customOrderType: 'website',
        };
      });

      // 3. Trigger website order callback or open checkout
      if (onCustomOrderFromWebsite) {
        onCustomOrderFromWebsite(cartItemsToCreate);
      }

      setSuccessNotice('Custom garment(s) ready! Proceeding to website checkout...');
    } catch (err: any) {
      console.error('Website order preparation failed:', err);
      setErrorMessage(err.message || 'Failed to prepare custom order. Please try again.');
    } finally {
      setSubmittingAction(null);
      setLoadingStepText('');
    }
  };

  // =========================================================================
  // OPTION 2 — ORDER VIA WHATSAPP
  // =========================================================================
  const handleOrderViaWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const activeItems = validateCustomInputs();
    if (!activeItems) return;

    setSubmittingAction('whatsapp');

    try {
      // 1. Upload designs to Supabase Storage and get permanent HTTPS URLs
      const readyItems = await uploadAllArtworkFiles(activeItems);

      setLoadingStepText('Saving custom order details...');

      // 2. Insert records into Supabase custom_orders table
      for (const item of readyItems) {
        const { error: insertErr } = await supabase.from('custom_orders').insert({
          customer_id: customer?.id || null,
          customer_name: customerName.trim() || customer?.fullName || 'Custom Customer',
          phone: customerPhone.trim() || customer?.phone || 'WhatsApp Inquiry',
          email: customer?.email || null,
          product_name: item.productName,
          tshirt_color: item.color,
          size: item.size,
          quantity: Math.max(1, Number(item.quantity) || 1),
          uploaded_design_url: item.permanentHttpsUrl || null,
          customer_note: item.details.trim() || null,
          status: 'new',
          whatsapp_status: 'pending',
          order_method: 'WhatsApp Order',
        });

        if (insertErr) {
          logSupabaseError('custom_orders:insert', insertErr);
        }
      }

      setLoadingStepText('Opening WhatsApp...');

      const totalPieces = readyItems.reduce((sum, it) => sum + it.quantity, 0);
      const totalEstimatedBase = readyItems.reduce((sum, it) => sum + it.productPrice * it.quantity, 0);

      // 3. Construct WhatsApp Message matching required format
      let message = '';
      if (readyItems.length === 1) {
        const single = readyItems[0];
        message = `Hello, I want to order a custom T-shirt.\n\n` +
          `Product: ${single.productName}\n` +
          `Size: ${single.size}\n` +
          `Color: ${single.color}\n` +
          `Quantity: ${single.quantity}\n` +
          `Price: ৳${(single.productPrice * single.quantity).toLocaleString('en-US')}\n\n` +
          `Customization:\n${single.details.trim() || 'Please print my uploaded design.'}\n\n` +
          `Design Image:\n${single.permanentHttpsUrl || 'No image attached (Text instructions only)'}\n\n` +
          `Customer Name: ${customerName.trim() || customer?.fullName || 'Customer'}\n` +
          (customerPhone.trim() ? `Phone: ${customerPhone.trim()}\n` : '') +
          `Notes: Please confirm the size and timeline before processing.\n\n` +
          `Please help me place this order.`;
      } else {
        // Multi-product customized message
        message = `Hello, I want to order custom apparel (${readyItems.length} items, ${totalPieces} pcs total).\n\n`;
        readyItems.forEach((it, idx) => {
          message += `--- ITEM ${idx + 1}: ${it.productName.toUpperCase()} ---\n` +
            `Product: ${it.productName}\n` +
            `Size: ${it.size}\n` +
            `Color: ${it.color}\n` +
            `Quantity: ${it.quantity}\n` +
            `Price: ৳${(it.productPrice * it.quantity).toLocaleString('en-US')}\n` +
            `Customization:\n${it.details.trim() || 'Please print uploaded artwork.'}\n` +
            `Design Image:\n${it.permanentHttpsUrl || 'No file attached'}\n\n`;
        });
        message += `Customer Name: ${customerName.trim() || customer?.fullName || 'Customer'}\n` +
          (customerPhone.trim() ? `Phone: ${customerPhone.trim()}\n` : '') +
          `Total Estimated Price: ৳${totalEstimatedBase.toLocaleString('en-US')}\n` +
          `Notes: Please confirm pricing and delivery before processing.\n\n` +
          `Please help me place this order.`;
      }

      const targetUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      setLastWhatsAppUrl(targetUrl);

      // Track Meta Pixel Lead event
      metaPixel.trackLead({
        content_name: `Custom Order (${readyItems.length} items)`,
        category: 'Custom Apparel Studio',
        value: totalEstimatedBase,
        currency: 'BDT',
      });

      // Open WhatsApp chat in new window
      window.open(targetUrl, '_blank', 'noopener,noreferrer');

      setSuccessNotice('Design uploaded and order details saved! WhatsApp chat is opening...');
    } catch (err: any) {
      console.error('WhatsApp order submission error:', err);
      setErrorMessage(err.message || 'Submission failed. Please check your image and try again.');
    } finally {
      setSubmittingAction(null);
      setLoadingStepText('');
    }
  };

  const isMultiple = selectedProductIds.length > 1;
  const totalPieces = selectedProductIds.reduce((sum, id) => sum + (itemsConfig[id]?.quantity || 1), 0);
  const totalEstimatedPrice = selectedProductIds.reduce((sum, id) => {
    const it = itemsConfig[id];
    return sum + (it ? it.productPrice * it.quantity : 0);
  }, 0);

  return (
    <div className="bg-[#FAF9F5] dark:bg-[#0f1115] min-h-screen text-black dark:text-white transition-colors duration-200 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header Title Banner */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-[#161822] border border-neutral-200 dark:border-neutral-800 rounded-full text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
            <span>Custom Apparel &amp; Printing Studio</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black uppercase text-neutral-900 dark:text-white tracking-tight">
            CUSTOM T-SHIRT &amp; GARMENT PRINTING
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-xl mx-auto leading-relaxed font-medium">
            Select your blank or printed garments below, specify your sizes, and upload your high-resolution artwork or logo.
          </p>
        </div>

        {/* Main Custom Order Card */}
        <div className="bg-white dark:bg-[#161922] border border-neutral-200/90 dark:border-neutral-800 rounded-3xl shadow-sm p-5 sm:p-8">
          
          {/* Notification / Error Alerts */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successNotice}</span>
              </div>
              {lastWhatsAppUrl && (
                <a
                  href={lastWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center gap-1.5 shrink-0 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Re-open WhatsApp</span>
                </a>
              )}
            </div>
          )}

          <div className="space-y-8">
            
            {/* 1. Customer Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#FAF9F5] dark:bg-[#141720] border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 01712-345678"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#FAF9F5] dark:bg-[#141720] border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium"
                />
              </div>
            </div>

            {/* 2. Product Cursor / Multi-Product Selector Carousel */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                    <span>Select Base Garments ({selectedProductIds.length} Selected)</span>
                  </label>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Click items below to select one or multiple products to customize
                  </p>
                </div>

                {/* Carousel Navigation Arrows */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleScrollCarousel('left')}
                    className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141720] flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer shadow-2xs transition-colors"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollCarousel('right')}
                    className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141720] flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer shadow-2xs transition-colors"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Product Cursor Horizontal Scroll Bar */}
              {productsLoading ? (
                <div className="py-12 text-center text-neutral-400 text-xs">
                  Loading custom garments...
                </div>
              ) : customProducts.length === 0 ? (
                <div className="py-10 px-6 text-center bg-neutral-50/80 dark:bg-[#141720] rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <Sparkles className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                    No Custom Base Garments Listed Currently
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto font-medium">
                    Add custom products from the Admin Panel or send your artwork directly to our design team via WhatsApp ({rawFormattedPhone}).
                  </p>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                      'Hello! I want to order custom printed t-shirts/hoodies.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Inquire via WhatsApp</span>
                  </a>
                </div>
              ) : (
                <div
                  ref={carouselRef}
                  className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x"
                >
                  {customProducts.map((prod) => {
                    const isSelected = selectedProductIds.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleToggleProduct(prod)}
                        className={`min-w-[190px] max-w-[210px] shrink-0 p-3 rounded-2xl border-2 transition-all cursor-pointer relative snap-start text-left ${
                          isSelected
                            ? 'bg-neutral-50 dark:bg-[#1a1e2a] border-black dark:border-white shadow-sm ring-2 ring-black/10 dark:ring-white/10'
                            : 'bg-white dark:bg-[#141720] border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                        }`}
                      >
                        {/* Checkbox badge */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-black dark:bg-white text-white dark:text-black font-black'
                                : 'border border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-[#141720]'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Product Image */}
                        <div className="aspect-square w-full rounded-xl bg-[#F6F5F2] dark:bg-[#1f232f] overflow-hidden mb-2.5 flex items-center justify-center p-2 border border-neutral-100 dark:border-neutral-800">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                          />
                        </div>

                        {/* Product Title & Price */}
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                          {prod.name}
                        </h4>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-extrabold text-neutral-900 dark:text-white">
                            ৳{prod.price.toLocaleString('en-US')}
                          </span>
                          <span className="text-neutral-500 dark:text-neutral-400 capitalize">
                            {prod.category}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Product Configuration Forms (Single or Multi-item sections) */}
            {selectedProductIds.length > 0 && (
              <div className="space-y-6 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-neutral-900 dark:text-white tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                    <span>
                      {isMultiple
                        ? `Customize Details (${selectedProductIds.length} Garments)`
                        : 'Customize Garment & Upload Artwork'}
                    </span>
                  </h3>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {totalPieces} {totalPieces === 1 ? 'piece' : 'pieces'} selected
                  </span>
                </div>

                {/* Per-Product Cards */}
                {selectedProductIds.map((productId, index) => {
                  const item = itemsConfig[productId];
                  if (!item) return null;

                  const fileInputId = `artwork-file-${productId}`;
                  const realColors = item.availableColors || [];
                  const realSizes = item.availableSizes || ['S', 'M', 'L', 'XL', 'XXL'];

                  return (
                    <div
                      key={productId}
                      className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] dark:bg-[#161a24] border border-neutral-200/90 dark:border-neutral-800 space-y-4"
                    >
                      {/* Product Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/70 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#141720] border border-neutral-200 dark:border-neutral-700 p-1 flex items-center justify-center shrink-0">
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                              Garment {index + 1} of {selectedProductIds.length}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                              {item.productName}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-neutral-900 dark:text-white block">
                            ৳{(item.productPrice * item.quantity).toLocaleString('en-US')}
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            (৳{item.productPrice} × {item.quantity})
                          </span>
                        </div>
                      </div>

                      {/* Options Grid: Color, Size, Qty */}
                      <div className="space-y-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* Color */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                              T-Shirt / Garment Color
                            </label>
                            <select
                              value={item.color}
                              onChange={(e) => handleUpdateItemConfig(productId, 'color', e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#141720] border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black font-semibold cursor-pointer"
                            >
                              {realColors.map((c, cIdx) => (
                                <option key={cIdx} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                              <option value="Custom Mixed Colors">Mixed / Custom Color</option>
                            </select>
                          </div>

                          {/* Size */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                              Select Size
                            </label>
                            <select
                              value={item.size}
                              onChange={(e) => handleUpdateItemConfig(productId, 'size', e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#141720] border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black font-semibold cursor-pointer"
                            >
                              {realSizes.map((sz) => (
                                <option key={sz} value={sz}>
                                  {sz}
                                </option>
                              ))}
                              <option value="Mixed Sizes">Mixed / Multiple Sizes</option>
                            </select>
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                              Quantity
                            </label>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemConfig(productId, 'quantity', Math.max(1, item.quantity - 1))}
                                className="w-9 h-10 rounded-l-xl bg-neutral-100 dark:bg-neutral-800 border border-r-0 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white font-bold flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemConfig(productId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full h-10 text-center text-xs sm:text-sm bg-white dark:bg-[#141720] border-y border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemConfig(productId, 'quantity', item.quantity + 1)}
                                className="w-9 h-10 rounded-r-xl bg-neutral-100 dark:bg-neutral-800 border border-l-0 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white font-bold flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Product Note / Custom Details */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {isMultiple ? `Custom Details for ${item.productName}` : 'Customization Details & Notes'} *
                          </label>
                          <textarea
                            rows={isMultiple ? 3 : 4}
                            required={!item.selectedFile}
                            value={item.details}
                            onChange={(e) => handleUpdateItemConfig(productId, 'details', e.target.value)}
                            placeholder={`Describe your custom artwork, print placement (chest, back, pocket, sleeve), dimensions, or special instructions for ${item.productName}...`}
                            className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#141720] border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-medium resize-none leading-relaxed"
                          />
                        </div>

                        {/* Image / Artwork Upload for this product */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {isMultiple ? `Upload Artwork for ${item.productName}` : 'Attach Artwork / Logo Design File (Optional)'}
                          </label>

                          <input
                            id={fileInputId}
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileChangeForProduct(productId, file);
                            }}
                          />

                          {item.selectedFile ? (
                            <div className="p-3.5 rounded-xl bg-white dark:bg-[#141720] border-2 border-neutral-900 dark:border-white flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {item.previewUrl ? (
                                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-neutral-200 dark:border-neutral-700 shrink-0 p-1 flex items-center justify-center">
                                    <img 
                                      src={item.previewUrl} 
                                      alt="Design preview" 
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-14 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                      {item.selectedFile.name}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                    {(item.selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for {item.productName}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <label
                                  htmlFor={fileInputId}
                                  className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                                >
                                  Change
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleFileChangeForProduct(productId, null)}
                                  className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                                  title="Remove artwork"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label
                              htmlFor={fileInputId}
                              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white rounded-xl p-5 text-center bg-white dark:bg-[#141720] hover:bg-neutral-50 dark:hover:bg-[#1a1d28] cursor-pointer transition-all block group"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Upload className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white" />
                                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                  Upload artwork / logo for {item.productName}
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-1">
                                Supports PNG, JPG, JPEG, WEBP, SVG, PDF (Up to {MAX_FILE_SIZE_MB}MB)
                              </p>
                            </label>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}

              </div>
            )}

            {/* 4. Order Summary & TWO CLEAR ORDERING OPTIONS */}
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
              
              {/* Summary Pill */}
              <div className="mb-6 p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#1a1d28] border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    Order Summary: {selectedProductIds.length} {selectedProductIds.length === 1 ? 'Garment type' : 'Garment types'} ({totalPieces} total pieces)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 dark:text-neutral-400">Base Estimate: </span>
                  <strong className="text-base font-black text-neutral-900 dark:text-white">
                    ৳{totalEstimatedPrice.toLocaleString('en-US')}
                  </strong>
                </div>
              </div>

              {/* Progress Loading Indicator */}
              {submittingAction && (
                <div className="mb-4 p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-2.5 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-900 dark:text-white" />
                  <span>{loadingStepText || 'Processing custom order...'}</span>
                </div>
              )}

              {/* TWO ORDERING OPTIONS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* OPTION 1 — ORDER FROM WEBSITE */}
                <button
                  type="button"
                  onClick={handleOrderFromWebsite}
                  disabled={submittingAction !== null || selectedProductIds.length === 0}
                  className="w-full py-4 px-5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-neutral-100 text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] flex flex-col items-center justify-center gap-1 disabled:opacity-75 disabled:cursor-not-allowed border border-neutral-900 dark:border-white"
                >
                  <div className="flex items-center gap-2">
                    {submittingAction === 'website' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-4 h-4" />
                    )}
                    <span>Order from Website</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-80 normal-case tracking-normal">
                    Continue through normal website checkout (COD &amp; bKash)
                  </span>
                </button>

                {/* OPTION 2 — ORDER VIA WHATSAPP */}
                <button
                  type="button"
                  onClick={handleOrderViaWhatsApp}
                  disabled={submittingAction !== null || selectedProductIds.length === 0}
                  className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] flex flex-col items-center justify-center gap-1 disabled:opacity-75 disabled:cursor-not-allowed border border-[#25D366]"
                >
                  <div className="flex items-center gap-2">
                    {submittingAction === 'whatsapp' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4 fill-white" />
                    )}
                    <span>Order via WhatsApp</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-90 normal-case tracking-normal">
                    Instant chat with design link to {rawFormattedPhone}
                  </span>
                </button>

              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>High-Resolution DTF &amp; Screen Printing</span>
                </span>
                <span>·</span>
                <span>Direct Helpline: <strong className="text-neutral-800 dark:text-neutral-200">{rawFormattedPhone}</strong></span>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
