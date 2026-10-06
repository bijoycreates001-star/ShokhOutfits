import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { GarmentMockup } from './GarmentMockup';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  productName?: string;
  colorHex?: string;
  garmentType?: any;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onSelectIndex,
  productName = 'Product View',
  colorHex,
  garmentType,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when changing image
  useEffect(() => {
    setZoomLevel(1.0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(1.0, Number((prev - 0.5).toFixed(1)));
      if (next === 1.0) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1.0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleToggleZoomClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    if (zoomLevel > 1.0) {
      handleResetZoom();
    } else {
      setZoomLevel(2.0);
    }
  };

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    const nextIdx = (currentIndex - 1 + images.length) % images.length;
    onSelectIndex(nextIdx);
  }, [currentIndex, images.length, onSelectIndex]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    const nextIdx = (currentIndex + 1) % images.length;
    onSelectIndex(nextIdx);
  }, [currentIndex, images.length, onSelectIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Mouse drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1.0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1.0) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const currentImageUrl = images[currentIndex] || images[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200">
      
      {/* 1. TOP HEADER TOOLBAR */}
      <div className="p-4 sm:px-8 sm:py-5 flex items-center justify-between z-10 border-b border-neutral-800/80 bg-black/50">
        <div>
          <h3 className="text-white text-sm sm:text-base font-extrabold uppercase tracking-tight truncate max-w-xs sm:max-w-md">
            {productName}
          </h3>
          <p className="text-neutral-400 text-xs mt-0.5">
            Image {currentIndex + 1} of {images.length || 1} · Zoom Level {Math.round(zoomLevel * 100)}%
          </p>
        </div>

        {/* Zoom Controls & Close Button */}
        <div className="flex items-center gap-2">
          {/* Zoom Level Indicator & Controls */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1.0}
              className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-neutral-200 px-2 min-w-[45px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3.5}
              className="p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {zoomLevel > 1.0 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer ml-1 border-l border-neutral-800"
                title="Reset Zoom (0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl border border-neutral-800 transition-colors cursor-pointer ml-2"
            title="Close Zoom (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN ZOOM DISPLAY AREA */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-12 ${
          zoomLevel > 1.0
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-zoom-in'
        }`}
      >
        {/* Next / Previous Side Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-neutral-900/80 hover:bg-white hover:text-black border border-neutral-700 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-neutral-900/80 hover:bg-white hover:text-black border border-neutral-700 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Zoomable Image Container */}
        <div
          onClick={handleToggleZoomClick}
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform ease-out duration-150 will-change-transform"
          style={{
            transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
          }}
        >
          {currentIndex === 0 && garmentType && colorHex ? (
            <div className="w-[380px] h-[380px] sm:w-[550px] sm:h-[550px] aspect-square rounded-2xl bg-[#FAF9F5] overflow-hidden shadow-2xl flex items-center justify-center">
              <GarmentMockup
                type={garmentType}
                colorHex={colorHex}
                imageFallback={currentImageUrl}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <img
              src={currentImageUrl}
              alt={productName}
              draggable={false}
              className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
            />
          )}
        </div>

        {/* Hint Badge */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-neutral-900/90 border border-neutral-800 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] text-neutral-300 font-medium tracking-wide flex items-center gap-2 shadow-lg pointer-events-none">
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>Click to {zoomLevel > 1.0 ? 'reset' : 'zoom in'} · Drag or scroll to pan</span>
        </div>
      </div>

      {/* 3. BOTTOM THUMBNAIL GALLERY BAR */}
      {images.length > 1 && (
        <div className="p-4 bg-black/70 border-t border-neutral-800/80 flex items-center justify-center gap-3 overflow-x-auto z-10">
          {images.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`w-14 h-14 sm:w-16 sm:h-16 aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                currentIndex === idx
                  ? 'border-white ring-2 ring-white/30 scale-105 opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
