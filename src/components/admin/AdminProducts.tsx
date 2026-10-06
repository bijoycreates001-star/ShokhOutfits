import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Tag,
  Edit2,
  Archive,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  Link,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Save,
  Package,
  Sparkles,
  ChevronDown,
  Layers,
  Percent,
  Sliders,
  AlertCircle,
  Shirt
} from 'lucide-react';
import { api } from '../../services/api';

// Helper to process & compress client-uploaded image files to crisp web-ready data URLs
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (file.type.includes('svg')) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(format, 0.88);
        resolve(compressed);
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  
  // Page Mode: 'list' | 'editor'
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // File upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories list
  const [categories, setCategories] = useState<string[]>([
    'Jacket',
    'T-Shirts',
    'Printed T-Shirts',
    'Hoodies',
    'Custom T-Shirts',
    'Wholesale'
  ]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Variant addition input states
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#374151');
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);

  // Form State matching the requested design and preserving all previous data
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    shortDescription: '',
    category: 'Jacket',
    categories: ['Jacket'],
    sizes: ['S', 'M', 'L', 'XL'],
    gender: 'Unisex', // 'Men' | 'Woman' | 'Unisex'
    price: 47.55,
    originalPrice: '',
    stock: 77,
    discount: '10%',
    discountType: 'Chinese New Year Discount',
    productType: 'normal',
    productTypes: ['normal'],
    enableWholesale: false,
    wholesalePrice: '',
    minWholesaleQty: 25,
    image: '',
    images: [],
    colors: [
      { name: 'Sage Green', hex: '#a7f3d0' },
      { name: 'Charcoal Gray', hex: '#374151' },
      { name: 'Pure White', hex: '#ffffff' },
    ],
    fabric: 'Technical Fabric / 100% Combed Cotton',
    gsm: '220 GSM',
    fit: 'Relaxed Fit',
    badge: 'New Arrival',
    sku: '',
    brand: 'Shokh Outfits',
    tags: 'jacket, streetwear, outerwear',
    status: 'active',
  });

  // Available Sizes for the size picker
  const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

  // Available Genders for the gender picker
  const GENDER_OPTIONS: Array<{ id: 'Men' | 'Woman' | 'Unisex'; label: string }> = [
    { id: 'Men', label: 'Men' },
    { id: 'Woman', label: 'Woman' },
    { id: 'Unisex', label: 'Unisex' },
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetProducts({
        type: typeFilter,
        status: statusFilter,
        search,
      });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [typeFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: 'Puffer Jacket With Pocket Detail',
      description: 'Cropped puffer jacket made of technical fabric. High neck and long sleeves. Flap pocket at the chest and in-seam side pockets at the hip. Inside pocket detail. Hem with elastic interior. Zip-up front.',
      shortDescription: 'Technical outerwear with pocket detail.',
      category: 'Jacket',
      categories: ['Jacket'],
      sizes: ['S', 'M', 'XL'],
      gender: 'Unisex',
      price: 47.55,
      originalPrice: 52.99,
      stock: 77,
      discount: '10%',
      discountType: 'Chinese New Year Discount',
      productType: 'normal',
      productTypes: ['normal'],
      enableWholesale: false,
      wholesalePrice: '',
      minWholesaleQty: 25,
      image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80',
      images: [
        { url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80' },
        { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80' },
        { url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80' },
      ],
      colors: [
        { name: 'Sage Green', hex: '#a7f3d0' },
        { name: 'Pure White', hex: '#ffffff' },
      ],
      fabric: 'Technical Fabric / 100% Combed Cotton',
      gsm: '280 GSM',
      fit: 'Relaxed Fit',
      badge: 'New Arrival',
      sku: 'SKU-' + Date.now().toString().slice(-4),
      brand: 'Shokh Outfits',
      tags: 'puffer, jacket, streetwear',
      status: 'active',
    });
    setUrlInput('');
    setShowUrlInput(false);
    setIsEditorOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (prod: any) => {
    if (!prod || !prod.id) return;
    setEditingProduct(prod);
    const hasWholesale = Boolean(prod.wholesalePrice && Number(prod.wholesalePrice) > 0);
    const rawImages = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images.map((img: any) => (typeof img === 'string' ? { url: img } : img))
      : prod.image
      ? [{ url: prod.image }]
      : [];

    let initialProductTypes: string[] = ['normal'];
    if (Array.isArray(prod.productTypes) && prod.productTypes.length > 0) {
      initialProductTypes = prod.productTypes;
    } else if (prod.productType) {
      initialProductTypes = [prod.productType];
    }

    let parsedCategories: string[] = [];
    if (Array.isArray(prod.categories) && prod.categories.length > 0) {
      parsedCategories = prod.categories.map((c: any) => String(c).trim()).filter(Boolean);
    } else if (typeof prod.category === 'string' && prod.category.trim()) {
      parsedCategories = prod.category.split(',').map((c: string) => c.trim()).filter(Boolean);
    }
    if (parsedCategories.length === 0) {
      parsedCategories = [prod.category || 'Jacket'];
    }

    setFormData({
      ...prod,
      name: prod.name || '',
      description: prod.description || '',
      category: parsedCategories.join(', '),
      categories: parsedCategories,
      sizes: Array.isArray(prod.sizes) && prod.sizes.length > 0 ? prod.sizes : ['S', 'M', 'L'],
      gender: prod.gender || 'Unisex',
      price: Number(prod.price || 47.55),
      originalPrice: prod.originalPrice || '',
      stock: (prod.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0) || 77,
      discount: prod.originalPrice && prod.price ? `${Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)}%` : '10%',
      discountType: prod.discountType || 'Chinese New Year Discount',
      productType: initialProductTypes[0] || 'normal',
      productTypes: initialProductTypes,
      image: prod.image || rawImages[0]?.url || '',
      images: rawImages,
      enableWholesale: hasWholesale,
      wholesalePrice: prod.wholesalePrice || '',
      minWholesaleQty: prod.minWholesaleQty || 25,
      colors: Array.isArray(prod.colors) && prod.colors.length > 0 ? prod.colors : [{ name: 'Default', hex: '#000000' }],
      tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : (prod.tags || ''),
      status: prod.status || 'active',
    });
    setUrlInput('');
    setShowUrlInput(false);
    setIsEditorOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle size selection
  const handleToggleSize = (size: string) => {
    const currentSizes = Array.isArray(formData.sizes) ? formData.sizes : [];
    if (currentSizes.includes(size)) {
      if (currentSizes.length === 1) return; // Keep at least one size
      setFormData({ ...formData, sizes: currentSizes.filter((s: string) => s !== size) });
    } else {
      setFormData({ ...formData, sizes: [...currentSizes, size] });
    }
  };

  // Process uploaded images
  const processAndAddMultipleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      alert('Please upload valid image files (PNG, JPG, WEBP, or SVG).');
      return;
    }
    try {
      setUploadingImage(true);
      const newItems: { url: string }[] = [];
      for (const file of validFiles) {
        const dataUrl = await processImageFile(file);
        newItems.push({ url: dataUrl });
      }

      setFormData((prev: any) => {
        const existingImages = Array.isArray(prev.images)
          ? prev.images.map((img: any) => (typeof img === 'string' ? { url: img } : img))
          : prev.image
          ? [{ url: prev.image }]
          : [];
        
        const combined = [...existingImages, ...newItems];
        const primary = prev.image || combined[0]?.url || '';
        return {
          ...prev,
          image: primary,
          images: combined,
        };
      });
    } catch (err: any) {
      alert(err.message || 'Failed to process images');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndAddMultipleFiles(e.target.files);
    }
    if (e.target) e.target.value = '';
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndAddMultipleFiles(e.dataTransfer.files);
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setFormData((prev: any) => {
      const current = Array.isArray(prev.images) ? [...prev.images] : [];
      const updated = [...current, { url: trimmed }];
      return {
        ...prev,
        image: prev.image || trimmed,
        images: updated,
      };
    });
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev: any) => {
      const current = Array.isArray(prev.images) ? [...prev.images] : [];
      const updated = current.filter((_, idx) => idx !== indexToRemove);
      const removedItem = current[indexToRemove];
      const removedUrl = typeof removedItem === 'string' ? removedItem : removedItem?.url;
      let newMainImage = prev.image;
      if (prev.image === removedUrl) {
        const firstRemaining = updated[0];
        newMainImage = typeof firstRemaining === 'string' ? firstRemaining : firstRemaining?.url || '';
      }
      return {
        ...prev,
        image: newMainImage,
        images: updated,
      };
    });
  };

  const handleSetPrimaryImage = (imageUrl: string) => {
    setFormData((prev: any) => ({
      ...prev,
      image: imageUrl,
    }));
  };

  // Toggle category multi-selection
  const toggleCategory = (catName: string) => {
    setFormData((prev: any) => {
      const currentCats: string[] = Array.isArray(prev.categories) && prev.categories.length > 0
        ? [...prev.categories]
        : (prev.category ? String(prev.category).split(',').map((s: string) => s.trim()).filter(Boolean) : ['Jacket']);

      let updatedCats: string[];
      if (currentCats.includes(catName)) {
        updatedCats = currentCats.filter((c) => c !== catName);
      } else {
        updatedCats = [...currentCats, catName];
      }

      const isPrinted = updatedCats.some((c) => c.toLowerCase().includes('printed'));
      const isWholesale = updatedCats.some((c) => c.toLowerCase().includes('wholesale'));

      let newProductTypes = prev.productTypes ? [...prev.productTypes] : [prev.productType || 'normal'];
      if (isPrinted && !newProductTypes.includes('printed')) {
        newProductTypes.push('printed');
      }
      if (isWholesale && !newProductTypes.includes('wholesale')) {
        newProductTypes.push('wholesale');
      }

      return {
        ...prev,
        categories: updatedCats,
        category: updatedCats.join(', '),
        productTypes: newProductTypes,
        productType: isPrinted ? 'printed' : isWholesale ? 'wholesale' : prev.productType,
        enableWholesale: isWholesale ? true : prev.enableWholesale,
      };
    });
  };

  const handleSelectAllCategories = () => {
    setFormData((prev: any) => ({
      ...prev,
      categories: [...categories],
      category: categories.join(', '),
    }));
  };

  const handleClearCategories = () => {
    setFormData((prev: any) => ({
      ...prev,
      categories: [],
      category: '',
    }));
  };

  // Add Category Handler
  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
    }
    const currentCats = Array.isArray(formData.categories) ? formData.categories : [];
    const updatedCats = Array.from(new Set([...currentCats, trimmed]));
    setFormData({
      ...formData,
      categories: updatedCats,
      category: updatedCats.join(', '),
    });
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  // Add Color Handler
  const handleAddColor = () => {
    const trimmed = newColorName.trim();
    if (!trimmed) return;
    const currentColors = Array.isArray(formData.colors) ? formData.colors : [];
    setFormData({
      ...formData,
      colors: [...currentColors, { name: trimmed, hex: newColorHex }],
    });
    setNewColorName('');
  };

  const handleRemoveColor = (idx: number) => {
    const currentColors = Array.isArray(formData.colors) ? formData.colors : [];
    if (currentColors.length === 1) return;
    setFormData({
      ...formData,
      colors: currentColors.filter((_: any, i: number) => i !== idx),
    });
  };

  // Save product (Draft or Active)
  const handleSaveProduct = async (statusOverride?: 'active' | 'draft') => {
    if (!formData.name || !formData.price) {
      alert('Please provide product name and base price.');
      return;
    }

    try {
      setSaving(true);
      const isWholesaleActive = Boolean(
        formData.enableWholesale && formData.wholesalePrice && Number(formData.wholesalePrice) > 0
      );

      const rawImages = Array.isArray(formData.images) && formData.images.length > 0
        ? formData.images.map((img: any) => (typeof img === 'string' ? { url: img } : img))
        : formData.image
        ? [{ url: formData.image }]
        : [];

      const mainImage = formData.image || rawImages[0]?.url || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80';

      const selectedTypes: string[] = Array.isArray(formData.productTypes) && formData.productTypes.length > 0
        ? formData.productTypes.map((t: any) => String(t).trim()).filter(Boolean)
        : [formData.productType || 'normal'];

      const parsedTags: string[] = Array.isArray(formData.tags)
        ? formData.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof formData.tags === 'string'
        ? formData.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];

      const selectedCategories: string[] = Array.isArray(formData.categories) && formData.categories.length > 0
        ? formData.categories
        : (formData.category ? String(formData.category).split(',').map((s: string) => s.trim()).filter(Boolean) : ['Jacket']);

      const categoryString = selectedCategories.join(', ');

      const payload = {
        ...formData,
        category: categoryString,
        categories: selectedCategories,
        tags: parsedTags,
        status: statusOverride || formData.status || 'active',
        productType: selectedTypes[0] || 'normal',
        productTypes: selectedTypes,
        price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
        wholesalePrice: isWholesaleActive ? Number(formData.wholesalePrice) : undefined,
        minWholesaleQty: isWholesaleActive ? Number(formData.minWholesaleQty || 25) : undefined,
        image: mainImage,
        images: rawImages.length > 0 ? rawImages : [{ url: mainImage }],
      };

      if (editingProduct && editingProduct.id) {
        const res = await api.adminUpdateProduct(editingProduct.id, payload);
        if (res && res.success === false) {
          throw new Error(res.error || 'Failed to update product');
        }
        setSuccessToast(`Product "${formData.name}" updated successfully!`);
      } else {
        const res = await api.adminCreateProduct(payload);
        if (res && res.success === false) {
          throw new Error(res.error || 'Failed to create product');
        }
        setSuccessToast(`Product "${formData.name}" added successfully to the catalog!`);
      }

      setIsEditorOpen(false);
      await fetchProducts();

      // Dispatch store-wide catalog update event
      window.dispatchEvent(new CustomEvent('shokh_products_updated'));
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(`Could not save product: ${err.message || 'Database error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget || !archiveTarget.id) return;
    try {
      await api.adminArchiveProduct(archiveTarget.id);
      setSuccessToast(`Product "${archiveTarget.name || 'Product'}" archived.`);
      setArchiveTarget(null);
      await fetchProducts();
      window.dispatchEvent(new CustomEvent('shokh_products_updated'));
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to archive product');
    }
  };

  // =========================================================================
  // VIEW 1: REDESIGNED PRODUCT UPLOAD / EDIT PAGE (MATCHES USER SCREENSHOT)
  // =========================================================================
  if (isEditorOpen) {
    const rawImagesList = Array.isArray(formData.images) && formData.images.length > 0
      ? formData.images.map((img: any) => (typeof img === 'string' ? img : img?.url || ''))
      : formData.image
      ? [formData.image]
      : [];

    const activeDisplayImage = formData.image || rawImagesList[0] || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&auto=format&fit=crop&q=80';

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        
        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 1. TOP ACTION BAR (Add New Product / Save Draft / Add Product) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsEditorOpen(false)}
              className="w-9 h-9 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-2xs shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black text-neutral-900 tracking-tight truncate">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
              </div>
            </div>
          </div>

          {/* Right: Save Draft & Add Product Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveProduct('draft')}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200 text-neutral-800 text-xs font-bold hover:bg-neutral-50 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-neutral-500" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveProduct('active')}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#a7f3d0] hover:bg-[#86efac] text-neutral-900 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}</span>
            </button>
          </div>
        </div>

        {/* 2. MAIN 2-COLUMN GRID (Matching exact layout from screenshot) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ======================================================= */}
          {/* LEFT COLUMN (approx 65% width)                         */}
          {/* ======================================================= */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* CARD 1: GENERAL INFORMATION */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                General Information
              </h3>

              {/* Name Product */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  Name Product
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Puffer Jacket With Pocket Detail"
                  className="w-full px-4 py-3 bg-[#f4f6f5] border border-transparent hover:border-neutral-200 focus:border-neutral-900 rounded-xl text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Description Product */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  Description Product
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Cropped puffer jacket made of technical fabric. High neck and long sleeves. Flap pocket at the chest and in-seam side pockets at the hip. Inside pocket detail. Hem with elastic interior. Zip-up front."
                  className="w-full px-4 py-3 bg-[#f4f6f5] border border-transparent hover:border-neutral-200 focus:border-neutral-900 rounded-xl text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors leading-relaxed"
                />
              </div>

              {/* Row with Size & Gender (matching screenshot) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Size Picker */}
                <div>
                  <div className="mb-2">
                    <label className="block text-xs font-bold text-neutral-800">
                      Size
                    </label>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Pick Available Size
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVAILABLE_SIZES.map((sz) => {
                      const isSelected = Array.isArray(formData.sizes) && formData.sizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleToggleSize(sz)}
                          className={`w-10 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#a7f3d0] text-neutral-900 shadow-2xs'
                              : 'bg-[#f4f6f5] text-neutral-600 hover:bg-neutral-200/70'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gender / Fit Selector */}
                <div>
                  <div className="mb-2">
                    <label className="block text-xs font-bold text-neutral-800">
                      Gender
                    </label>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Pick Available Gender
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {GENDER_OPTIONS.map((g) => {
                      const isSelected = formData.gender === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, gender: g.id })}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? 'text-neutral-900 font-bold'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          {/* Radio circle */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-[#34d399]' : 'border-neutral-300'
                          }`}>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-[#34d399]" />
                            )}
                          </div>
                          <span>{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Collapsible Advanced Specifications (Fabric, GSM, Brand, Tags, Product Types) */}
              <div className="pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSpecs(!showAdvancedSpecs)}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{showAdvancedSpecs ? 'Hide Extra Garment Specs' : '+ More Garment Specs (Fabric, GSM, SKU, Tags)'}</span>
                </button>

                {showAdvancedSpecs && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">Fabric Details</label>
                      <input
                        type="text"
                        value={formData.fabric || ''}
                        onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                        placeholder="100% Combed Cotton"
                        className="w-full px-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">Fabric Weight (GSM)</label>
                      <input
                        type="text"
                        value={formData.gsm || ''}
                        onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                        placeholder="220 GSM"
                        className="w-full px-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">SKU</label>
                      <input
                        type="text"
                        value={formData.sku || ''}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="e.g. PUFF-001"
                        className="w-full px-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">Badge</label>
                      <input
                        type="text"
                        value={formData.badge || ''}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        placeholder="e.g. New Arrival"
                        className="w-full px-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">Search Tags (comma separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(formData.tags) ? formData.tags.join(', ') : (formData.tags || '')}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="jacket, outerwear, cotton"
                        className="w-full px-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 1.5: PRODUCT TYPE & PRINTING STYLE */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                    <span>Product Type & Style</span>
                    <span className="text-[10px] font-black tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Required
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Choose plain apparel, graphic screen printed, or wholesale bulk tier
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: Solid / Plain Apparel */}
                <div
                  onClick={() => {
                    setFormData({
                      ...formData,
                      productType: 'normal',
                      productTypes: ['normal'],
                    });
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    formData.productType === 'normal' || (!formData.productType && formData.productTypes?.includes('normal'))
                      ? 'border-[#34d399] bg-emerald-50/50 shadow-2xs'
                      : 'border-neutral-100 bg-[#f4f6f5] hover:border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-neutral-700 shadow-2xs">
                      <Shirt className="w-4 h-4 text-neutral-700" />
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.productType === 'normal' ? 'border-[#34d399]' : 'border-neutral-300'
                    }`}>
                      {formData.productType === 'normal' && <div className="w-2 h-2 rounded-full bg-[#34d399]" />}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-900">Plain / Solid</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">Solid combed cotton basics & blanks</p>
                  </div>
                </div>

                {/* Option 2: PRINTED (Prominently Featured!) */}
                <div
                  onClick={() => {
                    setFormData({
                      ...formData,
                      productType: 'printed',
                      productTypes: ['printed'],
                      category: formData.category === 'Jacket' || formData.category === 'T-Shirts' ? 'Printed T-Shirts' : formData.category,
                    });
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden select-none ${
                    formData.productType === 'printed' || formData.productTypes?.includes('printed')
                      ? 'border-[#34d399] bg-emerald-50/70 shadow-xs ring-1 ring-[#34d399]/30'
                      : 'border-neutral-100 bg-[#f4f6f5] hover:border-neutral-200'
                  }`}
                >
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#0d2822] text-[#34d399] text-[9px] font-black rounded-md">
                    POPULAR
                  </span>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.productType === 'printed' ? 'border-[#34d399]' : 'border-neutral-300'
                    }`}>
                      {formData.productType === 'printed' && <div className="w-2 h-2 rounded-full bg-[#34d399]" />}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-900 flex items-center gap-1">
                      <span>Printed</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✨</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">Screen print, DTF & streetwear graphics</p>
                  </div>
                </div>

                {/* Option 3: Wholesale B2B */}
                <div
                  onClick={() => {
                    setFormData({
                      ...formData,
                      productType: 'wholesale',
                      productTypes: ['wholesale'],
                      enableWholesale: true,
                      category: formData.category === 'Jacket' ? 'Wholesale' : formData.category,
                    });
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    formData.productType === 'wholesale' || formData.productTypes?.includes('wholesale')
                      ? 'border-[#34d399] bg-emerald-50/50 shadow-2xs'
                      : 'border-neutral-100 bg-[#f4f6f5] hover:border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-neutral-700 shadow-2xs">
                      <Layers className="w-4 h-4 text-neutral-700" />
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.productType === 'wholesale' ? 'border-[#34d399]' : 'border-neutral-300'
                    }`}>
                      {formData.productType === 'wholesale' && <div className="w-2 h-2 rounded-full bg-[#34d399]" />}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-900">Wholesale B2B</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">Factory matrix volume orders with MOQ</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: PRICING AND STOCK (Matching screenshot) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Pricing And Stock
              </h3>

              {/* Row 1: Base Pricing & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-2">
                    Base Pricing
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      min={0}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      placeholder="47.55"
                      className="w-full px-4 py-3 bg-[#f4f6f5] border border-transparent hover:border-neutral-200 focus:border-neutral-900 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Math.max(0, Number(e.target.value)) })}
                    placeholder="77"
                    className="w-full px-4 py-3 bg-[#f4f6f5] border border-transparent hover:border-neutral-200 focus:border-neutral-900 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Discount & Discount Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-2">
                    Discount
                  </label>
                  <input
                    type="text"
                    value={formData.discount || ''}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="10%"
                    className="w-full px-4 py-3 bg-[#f4f6f5] border border-transparent hover:border-neutral-200 focus:border-neutral-900 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-2">
                    Discount Type
                  </label>
                  <div className="relative">
                    <select
                      value={formData.discountType || 'Chinese New Year Discount'}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f4f6f5] border border-transparent hover:border-neutral-200 focus:border-neutral-900 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="Chinese New Year Discount">Chinese New Year Discount</option>
                      <option value="Percentage Discount">Percentage Discount</option>
                      <option value="Fixed Price Discount">Fixed Price Discount</option>
                      <option value="Seasonal Sale">Seasonal Sale</option>
                      <option value="No Discount">No Discount</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Colors & Swatches */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  Colors &amp; Swatches
                </label>
                
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {(formData.colors || []).map((col: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f4f6f5] border border-neutral-200/60 text-xs font-semibold text-neutral-800"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: col.hex }}
                      />
                      <span>{col.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(idx)}
                        className="text-neutral-400 hover:text-rose-500 cursor-pointer p-0.5 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Color row */}
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="Color Name (e.g. Navy Blue)"
                    className="flex-1 px-3 py-1.5 bg-[#f4f6f5] rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="px-3 py-1.5 bg-[#a7f3d0] hover:bg-[#86efac] text-neutral-900 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Wholesale B2B Option (Preserved) */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.enableWholesale)}
                    onChange={(e) => setFormData({ ...formData, enableWholesale: e.target.checked })}
                    className="rounded border-neutral-300 text-neutral-900 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-neutral-800">
                    Enable Wholesale / Bulk Ordering for this product
                  </span>
                </label>

                {formData.enableWholesale && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Wholesale Price per piece
                      </label>
                      <input
                        type="number"
                        value={formData.wholesalePrice || ''}
                        onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                        placeholder="e.g. 35.00"
                        className="w-full px-3 py-2 bg-white rounded-xl text-xs font-bold border border-emerald-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Minimum Order Quantity (MOQ)
                      </label>
                      <input
                        type="number"
                        value={formData.minWholesaleQty || 25}
                        onChange={(e) => setFormData({ ...formData, minWholesaleQty: e.target.value })}
                        placeholder="25"
                        className="w-full px-3 py-2 bg-white rounded-xl text-xs font-bold border border-emerald-200"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ======================================================= */}
          {/* RIGHT COLUMN (approx 35% width)                        */}
          {/* ======================================================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CARD 1: UPLOAD IMG (Matching screenshot) */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Upload Img
              </h3>

              {/* Large Product Hero Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl p-4 min-h-[300px] flex items-center justify-center cursor-pointer transition-all overflow-hidden group ${
                  isDragging
                    ? 'border-2 border-dashed border-[#34d399] bg-emerald-50'
                    : 'bg-[#f4f6f5] hover:bg-neutral-100/80 border border-transparent'
                }`}
              >
                {activeDisplayImage ? (
                  <div className="w-full h-72 flex items-center justify-center">
                    <img
                      src={activeDisplayImage}
                      alt="Product preview"
                      className="max-h-full max-w-full object-contain rounded-xl drop-shadow-sm group-hover:scale-102 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white text-neutral-400 mx-auto flex items-center justify-center shadow-2xs">
                      <Upload className="w-5 h-5 text-neutral-500" />
                    </div>
                    <p className="text-xs font-bold text-neutral-700">Drop your product image here</p>
                    <p className="text-[11px] text-neutral-400">or click to browse from device</p>
                  </div>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="px-3 py-1.5 bg-white text-neutral-900 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Change Image</span>
                  </span>
                </div>
              </div>

              {/* Thumbnail Gallery Row with (+) button */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none">
                {rawImagesList.map((imgUrl: string, idx: number) => {
                  const isPrimary = formData.image === imgUrl || (!formData.image && idx === 0);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSetPrimaryImage(imgUrl)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all p-1 bg-[#f4f6f5] ${
                        isPrimary
                          ? 'border-[#34d399] shadow-xs'
                          : 'border-transparent hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {/* Add Image (+) Button matching screenshot */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border border-dashed border-[#a7f3d0] bg-emerald-50/50 hover:bg-[#a7f3d0]/30 flex items-center justify-center cursor-pointer transition-colors shrink-0 text-emerald-600"
                  title="Upload more images"
                >
                  <div className="w-6 h-6 rounded-full bg-[#a7f3d0] text-neutral-900 flex items-center justify-center font-bold text-xs">
                    +
                  </div>
                </button>
              </div>

              {/* Paste Image URL toggle */}
              <div className="pt-1">
                {!showUrlInput ? (
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(true)}
                    className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Link className="w-3 h-3" />
                    <span>Or paste image URL</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-1.5 bg-[#f4f6f5] rounded-xl text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      className="px-3 py-1.5 bg-[#a7f3d0] hover:bg-[#86efac] text-neutral-900 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="p-1 text-neutral-400 hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: MULTI-SELECT CATEGORIES */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                    Categories
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Select multiple categories for this product
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                    {(formData.categories || []).length} Selected
                  </span>
                </div>
              </div>

              {/* Selected Categories Active Pills */}
              {(formData.categories || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#f4f6f5] rounded-xl border border-neutral-200/50">
                  {(formData.categories || []).map((cat: string) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d2822] text-[#34d399] text-xs font-bold shadow-2xs"
                    >
                      <span>{cat === 'Printed T-Shirts' ? '✨ ' + cat : cat}</span>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="hover:text-white transition-colors cursor-pointer p-0.5"
                        title={`Remove ${cat}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Category Selection List with Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-800">
                    Select Categories
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearCategories}
                      className="text-neutral-400 hover:text-rose-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {categories.map((cat) => {
                    const isSelected = (formData.categories || []).includes(cat);
                    return (
                      <div
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-50/80 border-[#34d399] text-neutral-900 shadow-2xs'
                            : 'bg-[#f4f6f5] border-transparent hover:border-neutral-200 text-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#0d2822] border-[#0d2822] text-[#34d399]'
                                : 'border-neutral-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold">
                            {cat === 'Printed T-Shirts' ? '✨ ' + cat : cat}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Category Button */}
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="w-full py-2.5 bg-[#a7f3d0] hover:bg-[#86efac] text-neutral-900 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Category</span>
              </button>
            </div>

          </div>

        </div>

        {/* Add Category Modal */}
        {showAddCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-100">
              <h4 className="text-sm font-bold text-neutral-900">Add New Category</h4>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Denim, Activewear"
                className="w-full px-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="px-4 py-1.5 bg-[#a7f3d0] hover:bg-[#86efac] text-neutral-900 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PRODUCT LIST TABLE & CATALOG MANAGEMENT
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar with + ADD PRODUCT Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">Product Catalog</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Manage your store apparel, retail pricing, images and inventory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#0d2822] hover:bg-[#123830] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#34d399]" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category/Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all', label: 'All Products' },
            { key: 'normal', label: 'Retail Products' },
            { key: 'printed', label: 'Printed' },
            { key: 'wholesale', label: 'Wholesale B2B' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === tab.key
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-black border border-neutral-200/80 hover:bg-neutral-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200/80 rounded-xl text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>
      </div>

      {/* Products List Table */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold">Loading catalog from database...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center p-8">
            <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-neutral-800">No products found</h4>
            <p className="text-xs text-neutral-400 mt-1 mb-4">
              Get started by uploading your first apparel item.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#a7f3d0] hover:bg-[#86efac] text-neutral-900 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Product</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f6f5] border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs font-medium text-neutral-800">
                {products.map((p) => {
                  const rawImg = p.image || p.images?.[0]?.url || p.images?.[0] || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&auto=format&fit=crop&q=80';
                  const totalStock = p.stock !== undefined ? p.stock : (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0);

                  return (
                    <tr key={p.id} className="hover:bg-[#fbfcfc] transition-colors group">
                      {/* Product Name & Image */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-[#f4f6f5] border border-neutral-200/60 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={rawImg}
                              alt={p.name}
                              className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as any).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80';
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              SKU: {p.sku || `SKU-${p.id.slice(0, 6)}`} {p.productType && `• ${p.productType}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[#f4f6f5] text-neutral-700 text-[11px] font-bold border border-neutral-200/60">
                          {p.category || 'Apparel'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-black text-neutral-950 tabular-nums">
                            ৳{Number(p.price || 0).toLocaleString()}
                          </p>
                          {p.originalPrice && (
                            <p className="text-[10px] text-neutral-400 line-through tabular-nums">
                              ৳{Number(p.originalPrice).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          totalStock > 10
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : totalStock > 0
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            totalStock > 10 ? 'bg-emerald-500' : totalStock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <span>{totalStock} in stock</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                          {p.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3 text-neutral-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setArchiveTarget(p)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Archive Product"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive confirmation dialog */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-900">Archive this product?</h4>
              <p className="text-xs text-neutral-500 mt-1">
                "{archiveTarget.name}" will be hidden from the active storefront.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setArchiveTarget(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
