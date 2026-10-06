import React, { useState, useEffect } from 'react';
import { Search, Globe, Image as ImageIcon, Save, CheckCircle2, AlertCircle, FileText, Sparkles, Tag, Layout } from 'lucide-react';
import { api } from '../../services/api';

export const AdminSeoManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active sub-tab: 'landing' | 'products'
  const [activeTab, setActiveTab] = useState<'landing' | 'products'>('landing');

  // Landing pages SEO state
  const [seoPages, setSeoPages] = useState<Record<string, { title: string; description: string; ogImage: string }>>({
    home: { title: '', description: '', ogImage: '' },
    shop: { title: '', description: '', ogImage: '' },
    customize: { title: '', description: '', ogImage: '' },
    wholesale: { title: '', description: '', ogImage: '' },
  });
  const [selectedLandingPage, setSelectedLandingPage] = useState<string>('home');

  // Products SEO state
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [editingProductSeo, setEditingProductSeo] = useState<any | null>(null);

  const fetchSeoData = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetSeoSettings();
      if (res.success) {
        if (res.seoPages) setSeoPages(res.seoPages);
        if (res.products) setProducts(res.products);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load SEO configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeoData();
  }, []);

  const handleSaveLandingSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.adminUpdateLandingSeo(seoPages);
      if (res.success) {
        setSuccessMsg('Landing page SEO meta tags updated successfully.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.error || 'Failed to update SEO settings.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProductSeo = async (p: any) => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.adminUpdateProductSeo(p.id, p.seoTitle, p.seoDescription, p.ogImage);
      if (res.success) {
        setSuccessMsg(`SEO tags updated for "${p.name}".`);
        setEditingProductSeo(null);
        fetchSeoData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.error || 'Failed to update product SEO.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const currentLanding = seoPages[selectedLandingPage] || { title: '', description: '', ogImage: '' };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-semibold text-neutral-500">Loading Search Engine Optimization Studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            <span>Search Engine Optimization (SEO)</span>
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Optimize meta titles, descriptions, and OpenGraph social share cards for Google and social feeds
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 bg-[#f4f6f5] p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'landing'
                ? 'bg-[#0d2822] text-white shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Landing Pages SEO
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#0d2822] text-white shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Product Pages SEO ({products.length})
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: LANDING PAGES SEO */}
      {activeTab === 'landing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Page Selector */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 px-2">
                Select Landing Page
              </h3>
              {[
                { id: 'home', label: 'Home Page', path: '/' },
                { id: 'shop', label: 'Shop Catalog', path: '/shop' },
                { id: 'customize', label: 'Custom T-Shirts Studio', path: '/customize' },
                { id: 'wholesale', label: 'Wholesale B2B Hub', path: '/wholesale' },
              ].map((pg) => {
                const isSelected = selectedLandingPage === pg.id;
                return (
                  <button
                    key={pg.id}
                    onClick={() => setSelectedLandingPage(pg.id)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#0d2822] text-white shadow-sm font-bold'
                        : 'bg-[#f4f6f5] hover:bg-neutral-100 text-neutral-800 font-semibold text-xs'
                    }`}
                  >
                    <div>
                      <p className="text-xs">{pg.label}</p>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-300' : 'text-neutral-400'}`}>
                        {pg.path}
                      </p>
                    </div>
                    <Layout className={`w-4 h-4 ${isSelected ? 'text-[#34d399]' : 'text-neutral-400'}`} />
                  </button>
                );
              })}
            </div>

            {/* Google Search Preview Card */}
            <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
              <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Search Preview</span>
              </h4>
              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-neutral-200/80 space-y-1">
                <p className="text-[11px] text-emerald-800 font-mono">https://shokhoutfits.com{selectedLandingPage === 'home' ? '' : '/' + selectedLandingPage}</p>
                <p className="text-xs font-bold text-blue-700 hover:underline cursor-pointer line-clamp-1">
                  {currentLanding.title || 'Shokh Outfits – Premium Minimalist Streetwear'}
                </p>
                <p className="text-[11px] text-neutral-600 line-clamp-2">
                  {currentLanding.description || 'Shop premium oversized t-shirts, hoodies, jackets and custom printed apparel in Bangladesh.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Meta Tag Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSaveLandingSeo} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 capitalize">
                    {selectedLandingPage} Page Meta Tags
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Configure search snippet and OpenGraph tags for social sharing
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0d2822] hover:bg-[#123830] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4 text-[#34d399]" />
                  <span>{saving ? 'Saving...' : 'Save Meta Tags'}</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-neutral-800">Meta Title (&lt;title&gt;)</label>
                    <span className={`text-[10px] font-bold ${
                      (currentLanding.title || '').length >= 30 && (currentLanding.title || '').length <= 60
                        ? 'text-emerald-600'
                        : 'text-neutral-400'
                    }`}>
                      {(currentLanding.title || '').length}/60 chars (Recommended: 30-60)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={currentLanding.title || ''}
                    onChange={(e) =>
                      setSeoPages({
                        ...seoPages,
                        [selectedLandingPage]: { ...currentLanding, title: e.target.value },
                      })
                    }
                    placeholder="e.g. Shokh Outfits – Premium Minimalist Streetwear"
                    className="w-full px-4 py-3 bg-[#f4f6f5] rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 border border-transparent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-neutral-800">Meta Description</label>
                    <span className={`text-[10px] font-bold ${
                      (currentLanding.description || '').length >= 120 && (currentLanding.description || '').length <= 160
                        ? 'text-emerald-600'
                        : 'text-neutral-400'
                    }`}>
                      {(currentLanding.description || '').length}/160 chars (Recommended: 120-160)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={currentLanding.description || ''}
                    onChange={(e) =>
                      setSeoPages({
                        ...seoPages,
                        [selectedLandingPage]: { ...currentLanding, description: e.target.value },
                      })
                    }
                    placeholder="Shop premium oversized t-shirts, hoodies, jackets and custom printed apparel in Bangladesh."
                    className="w-full px-4 py-3 bg-[#f4f6f5] rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 border border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">
                    OpenGraph Image URL (og:image)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={currentLanding.ogImage || ''}
                      onChange={(e) =>
                        setSeoPages({
                          ...seoPages,
                          [selectedLandingPage]: { ...currentLanding, ogImage: e.target.value },
                        })
                      }
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-4 py-3 bg-[#f4f6f5] rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900 border border-transparent"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Preview image displayed when link is shared on Discord, WhatsApp, Facebook, or X/Twitter.
                  </p>
                </div>

                {currentLanding.ogImage && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-neutral-700 mb-2">OG Image Preview:</p>
                    <div className="w-full h-40 rounded-2xl bg-[#f4f6f5] overflow-hidden border border-neutral-200 p-2 flex items-center justify-center">
                      <img
                        src={currentLanding.ogImage}
                        alt="OG Preview"
                        className="max-h-full max-w-full object-contain rounded-xl"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT PAGES SEO */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Individual Product SEO Meta Tags</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Customize search titles, descriptions, and share cards for specific store products
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#f4f6f5] rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                No products found in catalog.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isEditing = editingProductSeo?.id === p.id;
                return (
                  <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-[#f4f6f5] border border-neutral-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={p.image || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-neutral-900">{p.name}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Category: {p.category} {p.seoTitle ? '• Custom SEO Set' : '• Default SEO'}
                        </p>
                      </div>
                    </div>

                    {!isEditing ? (
                      <button
                        onClick={() => setEditingProductSeo({ ...p })}
                        className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        {p.seoTitle ? 'Edit SEO' : '+ Add SEO Tags'}
                      </button>
                    ) : (
                      <div className="w-full sm:w-auto flex-1 max-w-xl bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1">SEO Title</label>
                          <input
                            type="text"
                            value={editingProductSeo.seoTitle || ''}
                            onChange={(e) => setEditingProductSeo({ ...editingProductSeo, seoTitle: e.target.value })}
                            placeholder={p.name + ' – Shokh Outfits'}
                            className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-emerald-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1">SEO Description</label>
                          <textarea
                            rows={2}
                            value={editingProductSeo.seoDescription || ''}
                            onChange={(e) => setEditingProductSeo({ ...editingProductSeo, seoDescription: e.target.value })}
                            placeholder="Buy matching premium apparel..."
                            className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-emerald-300 focus:outline-none resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingProductSeo(null)}
                            className="px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-white rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveProductSeo(editingProductSeo)}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[#0d2822] text-white text-xs font-bold rounded-lg hover:bg-[#123830] cursor-pointer"
                          >
                            {saving ? 'Saving...' : 'Save Product SEO'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
