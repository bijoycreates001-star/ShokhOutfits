import React, { useState } from 'react';
import { X, Ruler, Info, Check, Sparkles } from 'lucide-react';

export type GarmentCategoryType = 'T-Shirts' | 'Drop Shoulder' | 'Hoodies' | 'Printed T-Shirts' | 'All';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  onSelectSize?: (size: string) => void;
  currentSelectedSize?: string;
}

interface SizeRow {
  size: string;
  chestInches: string;
  chestCm: string;
  lengthInches: string;
  lengthCm: string;
  sleeveInches: string;
  sleeveCm: string;
  shoulderInches: string;
  shoulderCm: string;
  recommendedWeight: string;
  recommendedHeight: string;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'T-Shirts',
  onSelectSize,
  currentSelectedSize,
}) => {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  
  // Categorize
  const getInitialTab = (): 'tshirt' | 'drop-shoulder' | 'hoodie' => {
    const lower = defaultCategory.toLowerCase();
    if (lower.includes('hoodie')) return 'hoodie';
    if (lower.includes('drop') || lower.includes('oversized') || lower.includes('box')) return 'drop-shoulder';
    return 'tshirt';
  };

  const [activeTab, setActiveTab] = useState<'tshirt' | 'drop-shoulder' | 'hoodie'>(getInitialTab);

  if (!isOpen) return null;

  // Measurement charts
  const tshirtMeasurements: SizeRow[] = [
    {
      size: 'S',
      chestInches: '38"',
      chestCm: '96.5 cm',
      lengthInches: '27"',
      lengthCm: '68.5 cm',
      shoulderInches: '17.5"',
      shoulderCm: '44.5 cm',
      sleeveInches: '8"',
      sleeveCm: '20.3 cm',
      recommendedWeight: '50 - 62 kg',
      recommendedHeight: "5'3\" - 5'6\"",
    },
    {
      size: 'M',
      chestInches: '40"',
      chestCm: '101.6 cm',
      lengthInches: '28"',
      lengthCm: '71.1 cm',
      shoulderInches: '18.5"',
      shoulderCm: '47.0 cm',
      sleeveInches: '8.5"',
      sleeveCm: '21.5 cm',
      recommendedWeight: '62 - 72 kg',
      recommendedHeight: "5'6\" - 5'9\"",
    },
    {
      size: 'L',
      chestInches: '42"',
      chestCm: '106.7 cm',
      lengthInches: '29"',
      lengthCm: '73.7 cm',
      shoulderInches: '19.5"',
      shoulderCm: '49.5 cm',
      sleeveInches: '9"',
      sleeveCm: '22.8 cm',
      recommendedWeight: '72 - 82 kg',
      recommendedHeight: "5'8\" - 6'0\"",
    },
    {
      size: 'XL',
      chestInches: '44"',
      chestCm: '111.8 cm',
      lengthInches: '30"',
      lengthCm: '76.2 cm',
      shoulderInches: '20.5"',
      shoulderCm: '52.0 cm',
      sleeveInches: '9.5"',
      sleeveCm: '24.1 cm',
      recommendedWeight: '82 - 94 kg',
      recommendedHeight: "5'10\" - 6'2\"",
    },
    {
      size: 'XXL',
      chestInches: '46"',
      chestCm: '116.8 cm',
      lengthInches: '31"',
      lengthCm: '78.7 cm',
      shoulderInches: '21.5"',
      shoulderCm: '54.6 cm',
      sleeveInches: '10"',
      sleeveCm: '25.4 cm',
      recommendedWeight: '94 - 105+ kg',
      recommendedHeight: "6'0\" - 6'4\"",
    },
  ];

  const dropShoulderMeasurements: SizeRow[] = [
    {
      size: 'S',
      chestInches: '42"',
      chestCm: '106.7 cm',
      lengthInches: '27.5"',
      lengthCm: '69.8 cm',
      shoulderInches: '21"',
      shoulderCm: '53.3 cm',
      sleeveInches: '9"',
      sleeveCm: '22.8 cm',
      recommendedWeight: '50 - 64 kg',
      recommendedHeight: "5'3\" - 5'7\"",
    },
    {
      size: 'M',
      chestInches: '44"',
      chestCm: '111.8 cm',
      lengthInches: '28.5"',
      lengthCm: '72.4 cm',
      shoulderInches: '22"',
      shoulderCm: '55.8 cm',
      sleeveInches: '9.5"',
      sleeveCm: '24.1 cm',
      recommendedWeight: '64 - 75 kg',
      recommendedHeight: "5'6\" - 5'10\"",
    },
    {
      size: 'L',
      chestInches: '46"',
      chestCm: '116.8 cm',
      lengthInches: '29.5"',
      lengthCm: '74.9 cm',
      shoulderInches: '23"',
      shoulderCm: '58.4 cm',
      sleeveInches: '10"',
      sleeveCm: '25.4 cm',
      recommendedWeight: '75 - 86 kg',
      recommendedHeight: "5'9\" - 6'1\"",
    },
    {
      size: 'XL',
      chestInches: '48"',
      chestCm: '121.9 cm',
      lengthInches: '30.5"',
      lengthCm: '77.5 cm',
      shoulderInches: '24"',
      shoulderCm: '61.0 cm',
      sleeveInches: '10.5"',
      sleeveCm: '26.7 cm',
      recommendedWeight: '86 - 98 kg',
      recommendedHeight: "5'11\" - 6'3\"",
    },
    {
      size: 'XXL',
      chestInches: '50"',
      chestCm: '127.0 cm',
      lengthInches: '31.5"',
      lengthCm: '80.0 cm',
      shoulderInches: '25"',
      shoulderCm: '63.5 cm',
      sleeveInches: '11"',
      sleeveCm: '28.0 cm',
      recommendedWeight: '98 - 110+ kg',
      recommendedHeight: "6'0\" - 6'5\"",
    },
  ];

  const hoodieMeasurements: SizeRow[] = [
    {
      size: 'M',
      chestInches: '42"',
      chestCm: '106.7 cm',
      lengthInches: '28"',
      lengthCm: '71.1 cm',
      shoulderInches: '19.5"',
      shoulderCm: '49.5 cm',
      sleeveInches: '25.5"',
      sleeveCm: '64.8 cm',
      recommendedWeight: '58 - 72 kg',
      recommendedHeight: "5'5\" - 5'9\"",
    },
    {
      size: 'L',
      chestInches: '44"',
      chestCm: '111.8 cm',
      lengthInches: '29"',
      lengthCm: '73.7 cm',
      shoulderInches: '20.5"',
      shoulderCm: '52.0 cm',
      sleeveInches: '26"',
      sleeveCm: '66.0 cm',
      recommendedWeight: '72 - 84 kg',
      recommendedHeight: "5'8\" - 6'0\"",
    },
    {
      size: 'XL',
      chestInches: '46"',
      chestCm: '116.8 cm',
      lengthInches: '30"',
      lengthCm: '76.2 cm',
      shoulderInches: '21.5"',
      shoulderCm: '54.6 cm',
      sleeveInches: '26.5"',
      sleeveCm: '67.3 cm',
      recommendedWeight: '84 - 96 kg',
      recommendedHeight: "5'10\" - 6'2\"",
    },
    {
      size: 'XXL',
      chestInches: '48"',
      chestCm: '121.9 cm',
      lengthInches: '31"',
      lengthCm: '78.7 cm',
      shoulderInches: '22.5"',
      shoulderCm: '57.2 cm',
      sleeveInches: '27"',
      sleeveCm: '68.6 cm',
      recommendedWeight: '96 - 110+ kg',
      recommendedHeight: "6'0\" - 6'4\"",
    },
  ];

  const activeData =
    activeTab === 'drop-shoulder'
      ? dropShoulderMeasurements
      : activeTab === 'hoodie'
      ? hoodieMeasurements
      : tshirtMeasurements;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative w-full max-w-2xl bg-white border border-neutral-200 shadow-2xl rounded-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Ruler className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight uppercase">Size &amp; Fit Guide</h2>
              <p className="text-[11px] text-neutral-400">Garment measurements &amp; body sizing guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close size guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Unit Controls */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-neutral-50/70">
          {/* Garment Silhouette Selector */}
          <div className="inline-flex rounded-xl bg-neutral-200/70 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('tshirt')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'tshirt'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Classic Tee
            </button>
            <button
              onClick={() => setActiveTab('drop-shoulder')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'drop-shoulder'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Drop Shoulder
            </button>
            <button
              onClick={() => setActiveTab('hoodie')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'hoodie'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Fleece Hoodie
            </button>
          </div>

          {/* Unit Toggle (Inches vs CM) */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold text-neutral-500">Unit:</span>
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 text-xs font-bold">
              <button
                onClick={() => setUnit('in')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  unit === 'in'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Inches (in)
              </button>
              <button
                onClick={() => setUnit('cm')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  unit === 'cm'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Centimeters (cm)
              </button>
            </div>
          </div>
        </div>

        {/* Measurements Table */}
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px] font-bold">
                <th className="pb-3 pl-2">Size</th>
                <th className="pb-3 px-3">Chest / Width</th>
                <th className="pb-3 px-3">Length</th>
                <th className="pb-3 px-3">Shoulder</th>
                <th className="pb-3 px-3">Sleeve</th>
                <th className="pb-3 px-3 hidden sm:table-cell">Body Weight</th>
                <th className="pb-3 pr-2 hidden md:table-cell">Height Guide</th>
                {onSelectSize && <th className="pb-3 text-right pr-2">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {activeData.map((row) => {
                const isCurrent = currentSelectedSize === row.size;
                return (
                  <tr
                    key={row.size}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-emerald-50/70 font-semibold text-neutral-900'
                        : 'hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <td className="py-3 pl-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-100 text-black font-extrabold text-xs border border-neutral-200">
                        {row.size}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">
                      {unit === 'in' ? row.chestInches : row.chestCm}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">
                      {unit === 'in' ? row.lengthInches : row.lengthCm}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">
                      {unit === 'in' ? row.shoulderInches : row.shoulderCm}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">
                      {unit === 'in' ? row.sleeveInches : row.sleeveCm}
                    </td>
                    <td className="py-3 px-3 text-neutral-600 hidden sm:table-cell">
                      {row.recommendedWeight}
                    </td>
                    <td className="py-3 pr-2 text-neutral-600 hidden md:table-cell">
                      {row.recommendedHeight}
                    </td>
                    {onSelectSize && (
                      <td className="py-3 text-right pr-2">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectSize(row.size);
                              onClose();
                            }}
                            className="text-[11px] font-bold uppercase tracking-wider text-black hover:text-emerald-700 border border-neutral-300 hover:border-black px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Choose
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* How to Measure Tip Box */}
        <div className="mx-4 sm:mx-5 mb-5 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-neutral-800">
            <Info className="w-4 h-4 text-neutral-700 shrink-0" />
            <span>How to Measure Your Best Fit:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-600">
            <li><strong>Chest:</strong> Measure across the fullest part from armpit to armpit, then double the measurement.</li>
            <li><strong>Length:</strong> Measure straight down from the highest collar point to the bottom hem.</li>
            <li><strong>Drop Shoulder Note:</strong> Features relaxed dropped shoulders and a boxy chest for modern oversized streetwear styling. Size down if you want a classic slim fit.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            All garments pre-shrunk. Tolerance ±0.5 inch.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 rounded-lg cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
