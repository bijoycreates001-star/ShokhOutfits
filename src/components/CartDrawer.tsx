import React from 'react';
import { CartItem } from '../types';
import { X, Trash2, ArrowRight, ShoppingBag, Tag, Edit3, FileText } from 'lucide-react';
import { GarmentMockup } from './GarmentMockup';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onProceedToCheckout: () => void;
  onEditWholesaleItem?: (item: CartItem) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onEditWholesaleItem,
}) => {
  if (!isOpen) return null;

  const getItemUnitPrice = (item: CartItem) => {
    return item.isWholesale && item.wholesaleUnitPrice
      ? item.wholesaleUnitPrice
      : item.product.price;
  };

  const subtotal = items.reduce((acc, item) => acc + getItemUnitPrice(item) * item.quantity, 0);
  const totalPiecesCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-md bg-white dark:bg-[#141720] text-neutral-900 dark:text-neutral-100 h-full flex flex-col shadow-2xl border-l border-neutral-200 dark:border-neutral-800 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#141720]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-black dark:text-white" />
            <h2 className="text-lg font-extrabold uppercase text-black dark:text-white tracking-tight">
              Your Cart ({totalPiecesCount} {totalPiecesCount === 1 ? 'pc' : 'pcs'})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-full"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-neutral-300 dark:text-neutral-600 stroke-[1.5] mb-3" />
              <p className="text-base font-bold text-black dark:text-white uppercase">Your cart is empty</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                Browse our retail collection or wholesale bulk catalog to add items.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items
              .filter((item) => item && item.id && item.product)
              .map((item) => {
                const activeColorObj =
                  item.product.colors?.find((c) => c.name === item.selectedColor) ||
                  item.product.colors?.[0];
              const colorHex = activeColorObj?.hex || '#374151';
              const garmentType = item.product.category === 'Hoodies' ? 'hoodie' : 'tshirt';
              const unitPrice = getItemUnitPrice(item);
              const itemTotal = unitPrice * item.quantity;

              // Wholesale Item Presentation
              if (item.isWholesale) {
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-[#FAF9F5] dark:bg-[#1c202a] shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>Wholesale Bulk</span>
                        </span>
                        <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 tabular-nums">
                          {item.quantity} Pieces
                        </span>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        aria-label="Remove wholesale item"
                        title="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-white border border-neutral-200 shrink-0 overflow-hidden relative">
                        <GarmentMockup
                          type={garmentType}
                          colorHex={colorHex}
                          imageFallback={item.product.image}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info & Breakdown */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-black leading-tight line-clamp-1">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Rate: ৳{unitPrice.toLocaleString('en-US')} / piece
                        </div>

                        {/* Sizes Breakdown */}
                        {item.sizeDistribution && (
                          <div className="text-[11px] text-neutral-700 mt-1.5 flex items-start gap-1">
                            <span className="font-bold text-neutral-900 shrink-0">Sizes:</span>
                            <span className="flex-wrap">
                              {Object.entries(item.sizeDistribution)
                                .filter(([_, q]) => q > 0)
                                .map(([sz, q]) => `${sz} × ${q}`)
                                .join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Colors Breakdown */}
                        {item.colorDistribution && (
                          <div className="text-[11px] text-neutral-700 mt-0.5 flex items-start gap-1">
                            <span className="font-bold text-neutral-900 shrink-0">Colors:</span>
                            <span className="flex-wrap">
                              {Object.entries(item.colorDistribution)
                                .filter(([_, q]) => q > 0)
                                .map(([col, q]) => `${col} × ${q}`)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Note if customer provided one */}
                    {item.wholesaleNote && (
                      <div className="p-2 rounded-xl bg-white border border-neutral-200 text-[11px] text-neutral-600 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 italic">"{item.wholesaleNote}"</span>
                      </div>
                    )}

                    {/* Footer Row: Edit Configuration & Price */}
                    <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between">
                      {onEditWholesaleItem ? (
                        <button
                          type="button"
                          onClick={() => onEditWholesaleItem(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 hover:text-black underline underline-offset-2 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Configuration</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-500 font-medium">Wholesale Batch</span>
                      )}

                      <span className="font-black text-sm text-black tabular-nums">
                        ৳{itemTotal.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                );
              }

              // Normal Retail Item Presentation
              return (
                <div
                  key={item.id}
                  className="flex gap-3.5 pb-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141720]"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-[#F5F5F5] dark:bg-[#1c202a] border border-neutral-200 dark:border-neutral-700 shrink-0 overflow-hidden relative">
                    <GarmentMockup
                      type={garmentType}
                      colorHex={colorHex}
                      imageFallback={item.product.image}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-neutral-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>Color: {item.selectedColor}</span>
                        <span>·</span>
                        <span>Size: {item.selectedSize}</span>
                        {item.isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white uppercase">
                            Custom Print
                          </span>
                        )}
                      </div>

                      {item.customNote && (
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 italic line-clamp-1">
                          "{item.customNote}"
                        </p>
                      )}

                      {item.customDesignUrl && (
                        <a
                          href={item.customDesignUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline mt-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Uploaded Artwork</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-[#1a1e28]">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-[#F5F5F5] dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold tabular-nums text-black dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-[#F5F5F5] dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <span className="font-extrabold text-sm text-black dark:text-white tabular-nums">
                        ৳{itemTotal.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Subtotal & Checkout Trigger */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-[#F5F5F5] dark:bg-[#181b24] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400 font-medium">Subtotal ({totalPiecesCount} pcs)</span>
              <span className="text-lg font-extrabold text-black dark:text-white tabular-nums">
                ৳{subtotal.toLocaleString('en-US')}
              </span>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3.5 px-4 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
