import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured, logSupabaseError } from '../lib/supabaseClient';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const CACHE_KEY = 'shokh_supabase_products_v2';

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      localStorage.removeItem('shokh_supabase_products_v1');
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p: any) => p && p.id);
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = useState(false);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.storeGetProducts();
      if (res && res.success && Array.isArray(res.products)) {
        const validList = res.products.filter((p: any) => p && p.id);
        setProducts(validList);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(validList));
        } catch {
          // ignore storage quota issues
        }
      } else if (res && !res.success) {
        logSupabaseError('refreshProducts:failed', res.error);
      }
    } catch (err: any) {
      logSupabaseError('refreshProducts:exception', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount & listen to catalog updates
  useEffect(() => {
    refreshProducts();

    const handleCatalogUpdate = () => {
      refreshProducts();
    };

    window.addEventListener('shokh_products_updated', handleCatalogUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'shokh_product_sync_signal') {
        refreshProducts();
      }
    });

    return () => {
      window.removeEventListener('shokh_products_updated', handleCatalogUpdate);
    };
  }, [refreshProducts]);

  // Real-time Supabase subscription for product changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel('public:products-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          () => {
            refreshProducts();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'product_variants' },
          () => {
            refreshProducts();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'product_images' },
          () => {
            refreshProducts();
          }
        )
        .subscribe();
    } catch (err) {
      logSupabaseError('productRealtimeSubscribe', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshProducts]);

  const getProductById = useCallback((id: string): Product | undefined => {
    return products.find((p) => p && p.id === id);
  }, [products]);

  return (
    <ProductContext.Provider value={{ products, loading, refreshProducts, getProductById }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
