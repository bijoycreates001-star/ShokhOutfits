import React from 'react';
import logoImg from '../assets/images/shokh_logo_original.png';

interface ShokhLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
}

export const ShokhLogo: React.FC<ShokhLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  light = false,
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizeMap = {
    sm: 'text-base font-extrabold tracking-tight',
    md: 'text-xl sm:text-2xl font-black tracking-tight',
    lg: 'text-2xl sm:text-3xl font-black tracking-tight',
    xl: 'text-3xl sm:text-4xl font-black tracking-tight',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Exact Circular S Monogram Logo */}
      <div className={`relative ${sizeMap[size]} shrink-0 rounded-full overflow-hidden flex items-center justify-center ${light ? 'bg-white p-0.5' : 'bg-transparent'} transition-transform group-hover:scale-105`}>
        <img
          src={logoImg}
          alt="Shokh Logo"
          className="w-full h-full object-contain rounded-full"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span
            className={`uppercase font-sans font-black tracking-tight ${textSizeMap[size]} leading-none`}
            style={{ color: light ? '#ffffff' : '#000000' }}
          >
            SHOKH
          </span>
          <span
            className="text-[10px] sm:text-[11px] tracking-[0.24em] uppercase font-extrabold -mt-0.5 block leading-tight"
            style={{ color: light ? '#d1d5db' : '#000000' }}
          >
            OUTFITS
          </span>
        </div>
      )}
    </div>
  );
};
