import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import oversizedBanner from '../assets/images/oversized_tee_banner_1790510363195.jpg';
import dropShoulderBanner from '../assets/images/drop_shoulder_banner_1790510634854.jpg';
import hoodieStylesBanner from '../assets/images/hoodie_styles_banner_1790510650666.jpg';

interface HeroProps {
  onShopNow: () => void;
  onCustomize: () => void;
}

const BANNERS = [
  {
    id: 'drop-shoulder',
    src: dropShoulderBanner,
    alt: "SOKH Printed Drop Shoulder - Bold Prints, Relaxed Fit, Street Vibes",
  },
  {
    id: 'hoodie-styles',
    src: hoodieStylesBanner,
    alt: "SOKH Printed & Solid Hoodie - Two Styles, Same Vibe, Street Ready",
  },
  {
    id: 'oversized-tee',
    src: oversizedBanner,
    alt: "Men's Oversized T-Shirt - Simple, Clean, Street Ready",
  }
];

export const Hero: React.FC<HeroProps> = ({ onShopNow, onCustomize }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-change banner every 3 seconds with smooth fade transition
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev === 0 ? BANNERS.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
  };

  return (
    <div className="bg-[#FAF9F5] dark:bg-[#0f1115] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10">
        
        {/* 1. Main Hero Banner - Auto-rotating in 3s timeline with smooth fade animation */}
        <div 
          className="mb-6 sm:mb-8 lg:mb-10"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div 
            onClick={onShopNow}
            className="group relative w-full aspect-[21/9] min-h-[190px] sm:min-h-[280px] md:min-h-[360px] lg:min-h-[420px] rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-950 shadow-lg border border-neutral-300/80 cursor-pointer select-none"
          >
            {/* Carousel Banner Slides with Smooth Fade Animation */}
            {BANNERS.map((banner, index) => {
              const isActive = index === currentSlide;
              return (
                <div
                  key={banner.id}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                  aria-hidden={!isActive}
                >
                  <img
                    src={banner.src}
                    alt={banner.alt}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.012]"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle vignette / hover overlay */}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              );
            })}

            {/* Left Prev Arrow Button */}
            <button
              onClick={handlePrev}
              className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 cursor-pointer shadow-md"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Right Next Arrow Button */}
            <button
              onClick={handleNext}
              className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 cursor-pointer shadow-md"
              aria-label="Next banner"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Timeline Progress Indicators / Dots */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20">
              {BANNERS.map((banner, index) => {
                const isActive = index === currentSlide;
                return (
                  <button
                    key={banner.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(index);
                    }}
                    className={`relative h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive ? 'w-6 sm:w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    {/* Animated fill indicator for the active 3s slide */}
                    {isActive && !isPaused && (
                      <span 
                        key={`${index}-${currentSlide}`}
                        className="absolute inset-0 bg-white rounded-full animate-[progress_3s_linear]" 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Main Headlines, Description & Action CTAs - Below the Banner */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8">
          <div className="max-w-2xl text-left">
            {/* Pill Tag: NEW ARRIVALS */}
            <div className="mb-2.5 sm:mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EBE9DF] text-neutral-800 text-[11px] sm:text-xs font-semibold tracking-wider rounded-full uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-pulse" />
                NEW ARRIVALS
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-black dark:text-white tracking-tight leading-[1.1] mb-0 sm:mb-4 text-balance uppercase">
              Discover The Best Apparel for You
            </h1>

            {/* Sub-paragraph (Hidden on mobile) */}
            <p className="hidden sm:block text-sm sm:text-base text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed max-w-xl">
              Explore our wide range of premium combed cotton t-shirts, heavy hoodies, and bespoke printing at affordable prices. Shop now and wear your authentic style!
            </p>
          </div>

          {/* Action CTAs & Trust Rating */}
          <div className="flex flex-col items-start lg:items-end gap-4 shrink-0">
            {/* Dual CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onShopNow}
                className="flex-1 sm:flex-none justify-center px-5 sm:px-8 py-3 sm:py-3.5 bg-black dark:bg-white text-white dark:text-black text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm group active:scale-[0.98] whitespace-nowrap"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={onCustomize}
                className="flex-1 sm:flex-none justify-center px-4 sm:px-8 py-3 sm:py-3.5 bg-white dark:bg-[#1a1c24] text-black dark:text-white border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-black dark:hover:border-neutral-500 transition-all cursor-pointer shadow-2xs active:scale-[0.98] text-center whitespace-nowrap"
              >
                Customize T-Shirt
              </button>
            </div>

            {/* Social Proof Avatars & Trust Rating */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex -space-x-2 overflow-hidden">
                <img
                  className="inline-block h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-white dark:ring-neutral-800 object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar"
                />
                <img
                  className="inline-block h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-white dark:ring-neutral-800 object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar"
                />
                <img
                  className="inline-block h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-white dark:ring-neutral-800 object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar"
                />
                <img
                  className="inline-block h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-white dark:ring-neutral-800 object-cover"
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                  alt="Customer avatar"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-black dark:text-white">4.9/5</span>
                </div>
                <span className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Trusted by 10,000+ Customers
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
