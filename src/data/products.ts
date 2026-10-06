import { Product } from '../types';

export const getWholesaleUnitPrice = (product: Product, quantity: number): number => {
  const baseWholesale = product.wholesalePrice || Math.round(product.price * 0.58);
  if (product.wholesaleTiers && product.wholesaleTiers.length > 0) {
    // Sort tiers descending by minQty
    const sortedTiers = [...product.wholesaleTiers].sort((a, b) => b.minQty - a.minQty);
    const matchedTier = sortedTiers.find((t) => quantity >= t.minQty);
    if (matchedTier) {
      return matchedTier.price;
    }
  }
  return baseWholesale;
};

export const PRODUCTS: Product[] = [];
export const DEFAULT_PRODUCTS: Product[] = [];
