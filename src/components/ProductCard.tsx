import React, { useState } from 'react';
import { Product } from '../types';
import { ShoppingCart, Check, Heart, Star } from 'lucide-react';
import { GarmentMockup } from './GarmentMockup';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onViewProduct: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewProduct,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || 'Standard');
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'L');
  const [justAdded, setJustAdded] = useState(false);

  // Determine current color hex
  const activeColorObj = product.colors.find((c) => c.name === selectedColor) || product.colors[0];
  const activeColorHex = activeColorObj?.hex || '#374151';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product, selectedColor, selectedSize);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product);
    }
  };

  const garmentType = product.category === 'Hoodies' ? 'hoodie' : product.category === 'Printed T-Shirts' ? 'printed' : 'tshirt';

  // Deterministic rating for realistic preview matching reference design
  const ratingValue = (4.5 + (product.price % 5) * 0.1).toFixed(1);
  const reviewCount = 80 + ((product.price * 3) % 120);

  return (
    <div
      onClick={() => onViewProduct(product)}
      className="group relative flex flex-col bg-white dark:bg-[#161922] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-3 sm:p-3.5 transition-all duration-300 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer text-left"
    >
      {/* 1. Rounded Product Image Frame */}
      <div className="relative aspect-square w-full rounded-xl bg-[#F6F5F2] dark:bg-[#20242f] overflow-hidden flex items-center justify-center">
        {/* Garment Mockup Image with subtle luxury hover zoom effect */}
        <div className="w-full h-full transform transition-transform duration-500 ease-out group-hover:scale-106 will-change-transform">
          <GarmentMockup
            type={garmentType}
            colorHex={activeColorHex}
            imageFallback={product.image}
            className="w-full h-full object-cover transition-transform duration-500 ease-out"
          />
        </div>

        {/* Subtle gradient vignette overlay on hover to elevate depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Favorite Heart Button in Top Right (like reference image) */}
        <button
          onClick={handleHeartClick}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-rose-500 shadow-2xs transition-transform active:scale-90 cursor-pointer"
          aria-label={isWishlisted ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-neutral-600 dark:text-neutral-300'
            }`}
          />
        </button>

        {/* Badge if any */}
        {product.badge && (
          <div className="absolute top-2.5 left-2.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
            {product.badge}
          </div>
        )}
      </div>

      {/* 2. Product Details */}
      <div className="pt-3 pb-1 flex flex-col flex-grow justify-between">
        <div>
          {/* Product Name */}
          <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 tracking-tight line-clamp-1 group-hover:text-black dark:group-hover:text-white">
            {product.name}
          </h4>

          {/* Rating (star + count like reference) */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px] sm:text-xs">
              {ratingValue}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              ({reviewCount})
            </span>
          </div>

          {/* Price */}
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-black text-sm sm:text-base text-black dark:text-white tabular-nums">
              ৳{product.price.toLocaleString('en-US')}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 line-through tabular-nums font-normal">
                ৳{product.originalPrice.toLocaleString('en-US')}
              </span>
            )}
          </div>
        </div>

        {/* 3. Rounded Add to Cart Button (matches reference style) */}
        <div className="mt-3.5 pt-1">
          <button
            onClick={handleQuickAdd}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer shadow-2xs active:scale-[0.98] ${
              justAdded
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 text-white dark:text-black" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 stroke-[2]" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
