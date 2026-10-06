import React from 'react';

interface GarmentMockupProps {
  type: 'tshirt' | 'hoodie' | 'printed' | 'drop-shoulder';
  colorHex: string;
  graphicUrl?: string | null;
  graphicPlacement?: 'center' | 'pocket' | 'full' | 'back';
  className?: string;
  imageFallback?: string;
}

export const GarmentMockup: React.FC<GarmentMockupProps> = ({
  type,
  colorHex,
  graphicUrl,
  graphicPlacement = 'center',
  className = '',
  imageFallback,
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  // If an image fallback is provided and no custom graphic is active, we can show the image
  // with fallback to the SVG garment
  const isLight = colorHex.toLowerCase() === '#ffffff' || colorHex.toLowerCase() === '#f5f0ea' || colorHex.toLowerCase() === '#f8fafc' || colorHex.toLowerCase() === '#fefce8';
  const strokeColor = isLight ? '#000000' : '#ffffff';

  // Real 3D Drop Shoulder T-shirt Model URL requested by user
  const dropShoulder3DModelUrl = 'https://i.pinimg.com/736x/77/e0/98/77e098fcb1dbab80ddeb856d5e7cfc48.jpg';

  if (type === 'drop-shoulder' && !imageFailed) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-[#F5F5F5] ${className}`}>
        {/* Real 3D Drop Shoulder T-Shirt Model Photo */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={dropShoulder3DModelUrl}
            alt="3D Drop Shoulder T-Shirt Model"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-contain object-center drop-shadow-md transition-all duration-300"
          />

          {/* Color Tint Blend Layer (subtle tint to reflect chosen color without washing out 3D cotton textures & folds) */}
          {colorHex.toLowerCase() !== '#ffffff' && (
            <div
              className="absolute inset-0 pointer-events-none transition-colors duration-300 mix-blend-multiply opacity-75"
              style={{
                backgroundColor: colorHex,
                maskImage: `url(${dropShoulder3DModelUrl})`,
                WebkitMaskImage: `url(${dropShoulder3DModelUrl})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          )}

          {/* Graphic Artwork Overlay with natural perspective blend */}
          {graphicUrl && (
            <div
              className={`absolute pointer-events-none transition-all duration-200 flex items-center justify-center z-10 ${
                graphicPlacement === 'pocket'
                  ? 'top-[36%] left-[40%] w-12 h-12'
                  : graphicPlacement === 'full'
                  ? 'top-[30%] w-36 h-48'
                  : graphicPlacement === 'back'
                  ? 'top-[30%] w-32 h-44'
                  : 'top-[33%] w-28 h-28'
              }`}
            >
              <img
                src={graphicUrl}
                alt="Custom Graphic on 3D Drop Shoulder"
                className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] mix-blend-multiply"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-[#F5F5F5] ${className}`}>
      {imageFallback && !graphicUrl && !imageFailed ? (
        <img
          src={imageFallback}
          alt="Product preview"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <div className="relative w-full h-full p-4 flex items-center justify-center">
          {type === 'hoodie' ? (
            /* Hoodie SVG silhouette */
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full max-h-64 drop-shadow-md transition-all duration-300"
              fill={colorHex}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {/* Hood */}
              <path
                d="M65,55 C65,22 135,22 135,55 C135,68 120,72 100,72 C80,72 65,68 65,55 Z"
                fill={colorHex}
              />
              {/* Hood inner fold shadow */}
              <path
                d="M80,48 C85,32 115,32 120,48 C120,62 100,66 100,66 C100,66 80,62 80,48 Z"
                fill={isLight ? '#e5e7eb' : '#1f2937'}
                opacity="0.3"
              />
              {/* Drawstrings */}
              <line x1="92" y1="68" x2="90" y2="105" stroke={strokeColor} strokeWidth="2" />
              <line x1="108" y1="68" x2="110" y2="105" stroke={strokeColor} strokeWidth="2" />
              {/* Body */}
              <path
                d="M48,65 L20,115 L40,125 L54,95 L54,210 L146,210 L146,95 L160,125 L180,115 L152,65 C138,62 128,60 100,60 C72,60 62,62 48,65 Z"
              />
              {/* Kangaroo Pocket */}
              <path
                d="M68,145 L132,145 L138,185 L62,185 Z"
                fill={colorHex}
                opacity="0.9"
              />
              <path
                d="M62,185 L68,145"
                stroke={strokeColor}
                strokeWidth="2"
              />
              <path
                d="M138,185 L132,145"
                stroke={strokeColor}
                strokeWidth="2"
              />
              {/* Bottom hem ribbing */}
              <line x1="54" y1="202" x2="146" y2="202" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
          ) : (
            /* T-Shirt SVG silhouette */
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full max-h-64 drop-shadow-md transition-all duration-300"
              fill={colorHex}
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {/* Sleeves & Body */}
              <path
                d="M65,42 L25,75 L45,100 L62,82 L62,215 L138,215 L138,82 L155,100 L175,75 L135,42 C125,48 115,52 100,52 C85,52 75,48 65,42 Z"
              />
              {/* Collar Line */}
              <path
                d="M75,42 C82,54 118,54 125,42"
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
              />
              {/* Sleeve Hem stitching */}
              <line x1="28" y1="78" x2="42" y2="95" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="2 2" />
              <line x1="172" y1="78" x2="158" y2="95" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="2 2" />
              {/* Bottom Hem stitching */}
              <line x1="62" y1="207" x2="138" y2="207" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
          )}

          {/* Graphic Artwork Overlay */}
          {graphicUrl && (
            <div
              className={`absolute pointer-events-none transition-all duration-200 flex items-center justify-center ${
                graphicPlacement === 'pocket'
                  ? 'top-[36%] left-[42%] w-10 h-10'
                  : graphicPlacement === 'full'
                  ? 'top-[34%] w-28 h-36'
                  : graphicPlacement === 'back'
                  ? 'top-[32%] w-24 h-32'
                  : 'top-[36%] w-20 h-20'
              }`}
            >
              <img
                src={graphicUrl}
                alt="Custom Graphic"
                className="max-w-full max-h-full object-contain filter drop-shadow"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
