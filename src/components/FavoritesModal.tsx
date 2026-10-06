import React from 'react';
import { Product } from '../types';
import { X, Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { GarmentMockup } from './GarmentMockup';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Product[];
  onRemoveFavorite: (productId: string) => void;
  onClearAll: () => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onViewProduct: (product: Product) => void;
  onExploreShop: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onClearAll,
  onAddToCart,
  onViewProduct,
  onExploreShop,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs">
      <div
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                My Favorites
                <span className="text-xs font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              </h2>
              <p className="text-[11px] text-neutral-500">
                Saved items for quick shopping and easy access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-neutral-400 hover:text-rose-600 transition-colors font-semibold px-2 py-1 cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-100 hover:bg-black hover:text-white transition-all text-neutral-700 cursor-pointer"
              aria-label="Close favorites list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {favorites.length === 0 ? (
            <div className="py-12 sm:py-16 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1">
                Your Favorites list is empty
              </h3>
              <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                Tap the heart icon on any garment to save your favorite t-shirts and hoodies here for faster shopping!
              </p>
              <button
                onClick={() => {
                  onClose();
                  onExploreShop();
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {favorites.map((product) => {
                const defaultColor = product.colors[0]?.name || 'Standard';
                const defaultSize = product.sizes[0] || 'L';
                const colorHex = product.colors[0]?.hex || '#0a0a0a';
                const garmentType = product.category === 'Hoodies' ? 'hoodie' : product.category === 'Printed T-Shirts' ? 'printed' : 'tshirt';

                return (
                  <div
                    key={product.id}
                    className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Thumbnail & Info */}
                    <div
                      onClick={() => {
                        onClose();
                        onViewProduct(product);
                      }}
                      className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#F6F5F2] overflow-hidden p-1.5 flex items-center justify-center shrink-0 border border-neutral-200/80 group-hover:border-neutral-400 transition-colors">
                        <GarmentMockup
                          type={garmentType}
                          colorHex={colorHex}
                          imageFallback={product.image}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {product.category}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-900 truncate group-hover:text-black">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {product.gsm} · {product.fabric}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-black text-[#F97316] tabular-nums">
                            ৳{product.price.toLocaleString('en-US')}
                          </span>
                          {product.originalPrice && (
                            <span className="text-xs text-neutral-400 line-through tabular-nums">
                              ৳{product.originalPrice.toLocaleString('en-US')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                      <button
                        onClick={() => {
                          onAddToCart(product, defaultColor, defaultSize);
                        }}
                        className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>

                      <button
                        onClick={() => onRemoveFavorite(product.id)}
                        className="p-2.5 rounded-xl border border-neutral-200 hover:border-rose-300 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove from favorites"
                        aria-label={`Remove ${product.name} from favorites`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {favorites.length > 0 && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 px-6 flex items-center justify-between text-xs text-neutral-500">
            <span>Free 2-day delivery inside Dhaka</span>
            <button
              onClick={() => {
                onClose();
                onExploreShop();
              }}
              className="font-bold text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore full catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
