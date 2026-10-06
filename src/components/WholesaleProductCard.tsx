import React, { useState } from 'react';
import { Product } from '../types';
import { Heart, Layers, ArrowRight, ShieldCheck, Tag, MessageCircle } from 'lucide-react';
import { GarmentMockup } from './GarmentMockup';
import { getWholesaleUnitPrice } from '../data/products';

interface WholesaleProductCardProps {
  product: Product;
  onViewProduct: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
}

export const WholesaleProductCard: React.FC<WholesaleProductCardProps> = ({
  product,
  onViewProduct,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || 'Standard');

  const activeColorObj = product.colors.find((c) => c.name === selectedColor) || product.colors[0];
  const activeColorHex = activeColorObj?.hex || '#374151';
  const garmentType = product.category === 'Hoodies' ? 'hoodie' : product.category === 'Printed T-Shirts' ? 'printed' : 'tshirt';

  const minQty = product.minWholesaleQty || 25;
  const wholesalePrice = getWholesaleUnitPrice(product, minQty);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product);
    }
  };

  return (
    <div
      onClick={() => onViewProduct(product)}
      className="group relative flex flex-col bg-white dark:bg-[#161922] rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-3 sm:p-4 transition-all duration-300 hover:shadow-xl hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer text-left"
    >
      {/* 1. Image Showcase Frame */}
      <div className="relative aspect-square w-full rounded-xl bg-[#F6F5F2] dark:bg-[#20242f] overflow-hidden flex items-center justify-center">
        <div className="w-full h-full transform transition-transform duration-500 ease-out group-hover:scale-105 will-change-transform">
          <GarmentMockup
            type={garmentType}
            colorHex={activeColorHex}
            imageFallback={product.image}
            className="w-full h-full object-cover"
          />
        </div>

        {/* MOQ Badge */}
        <div className="absolute top-2.5 left-2.5 bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1">
          <Tag className="w-3 h-3" />
          <span>MOQ {minQty} PCS</span>
        </div>

        {/* Wishlist Heart Button */}
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

        {/* Color preview dots overlay on bottom of image */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1.5 p-1.5 rounded-lg bg-white/85 dark:bg-neutral-800/85 backdrop-blur-md shadow-xs opacity-90 group-hover:opacity-100 transition-opacity"
        >
          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mr-1 hidden sm:inline">
            Colors:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedColor(c.name)}
                title={c.name}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border transition-transform cursor-pointer shrink-0 ${
                  selectedColor === c.name
                    ? 'scale-115 border-black dark:border-white ring-1 ring-black dark:ring-white'
                    : 'border-neutral-300 dark:border-neutral-600 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <span className="ml-auto text-[10px] font-bold text-neutral-500 dark:text-neutral-400 shrink-0">
            {product.colors.length}
          </span>
        </div>
      </div>

      {/* 2. Content Info */}
      <div className="pt-3 pb-1 flex flex-col flex-grow justify-between">
        <div>
          {/* Category & Fabric Spec */}
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            <span className="uppercase tracking-wider font-semibold text-neutral-700 dark:text-neutral-300">{product.category}</span>
            <span className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
              {product.gsm}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 tracking-tight line-clamp-1 group-hover:text-black dark:group-hover:text-white">
            {product.name}
          </h3>

          {/* Fabric Short Description */}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1 font-normal">
            {product.fabric}
          </p>

          {/* Available Sizes List */}
          <div className="mt-2.5 flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold mr-1">Sizes:</span>
            {product.sizes.map((sz) => (
              <span
                key={sz}
                className="text-[10px] font-bold px-1.5 py-0.5 bg-[#FAF9F5] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded"
              >
                {sz}
              </span>
            ))}
          </div>

          {/* Wholesale Pricing */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold block">Wholesale Rate</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-base sm:text-lg text-black dark:text-white tabular-nums">
                  ৳{wholesalePrice.toLocaleString('en-US')}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">/ piece</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block">Retail Value</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 line-through tabular-nums">
                ৳{product.price.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Action Button: View Product / Bulk Order on WhatsApp */}
        <div className="mt-3.5 pt-1">
          <button
            type="button"
            className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-sm group-hover:shadow-md"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Select Sizes &amp; Order on WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
