import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ArrowRight } from 'lucide-react';

interface HomeProductSectionProps {
  products: Product[];
  onAddToCart: (product: Product, color: string, size: string) => void;
  onViewProduct: (product: Product) => void;
  onViewAllProducts: () => void;
  isWishlisted?: (productId: string) => boolean;
  onToggleWishlist?: (product: Product) => void;
}

export const HomeProductSection: React.FC<HomeProductSectionProps> = ({
  products,
  onAddToCart,
  onViewProduct,
  onViewAllProducts,
  isWishlisted,
  onToggleWishlist,
}) => {
  // Display 12-14 products directly on the homepage
  const homeProducts = (products || []).filter((p) => p && p.id).slice(0, 14);

  return (
    <section className="py-6 sm:py-12 md:py-16 bg-white dark:bg-[#12141a] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="mb-4 sm:mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-black dark:text-white">
              All Products
            </h2>
            <p className="hidden sm:block text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Top quality combed cotton garments, designed &amp; crafted in Bangladesh.
            </p>
          </div>
          <button
            onClick={onViewAllProducts}
            className="group flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>See More</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Clean Product Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */}
        {homeProducts.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-[#181b24] p-6">
            <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">No products available yet</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              Our store catalog is ready for products! Add products through the Admin Panel to display them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {homeProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onViewProduct={onViewProduct}
                isWishlisted={isWishlisted ? isWishlisted(product.id) : false}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        )}

        {/* 4. See More Products Section */}
        <div className="mt-16 pt-10 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <p className="text-lg sm:text-xl font-medium text-neutral-700 dark:text-neutral-300 mb-4">
            Want to see more?
          </p>
          <button
            onClick={onViewAllProducts}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-black dark:bg-white text-white dark:text-black text-sm sm:text-base font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <span>VIEW ALL PRODUCTS</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </section>
  );
};
