import { useState, useEffect } from 'react';
import { Product } from '../types';

const WISHLIST_STORAGE_KEY = 'shokh_wishlist_ids';

export function useWishlist(catalog?: Product[]) {
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage', e);
    }
  }, [wishlistIds]);

  const toggleWishlist = (productId: string): boolean => {
    let isNowWishlisted = false;
    setWishlistIds((prev) => {
      if (prev.includes(productId)) {
        isNowWishlisted = false;
        return prev.filter((id) => id !== productId);
      } else {
        isNowWishlisted = true;
        return [...prev, productId];
      }
    });
    return isNowWishlisted;
  };

  const isWishlisted = (productId: string): boolean => {
    return wishlistIds.includes(productId);
  };

  const clearWishlist = () => {
    setWishlistIds([]);
  };

  // Resolve product objects from provided catalog
  const activeCatalog = catalog && catalog.length > 0 ? catalog.filter((p) => p && p.id) : [];
  const wishlistProducts: Product[] = wishlistIds
    .map((id) => activeCatalog.find((p) => p && p.id === id))
    .filter(Boolean) as Product[];

  return {
    wishlistIds,
    wishlistProducts,
    wishlistCount: wishlistIds.length,
    toggleWishlist,
    isWishlisted,
    clearWishlist,
  };
}
