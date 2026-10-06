import React from 'react';
import { ArrowRight } from 'lucide-react';

import catTee from '../assets/images/cat_circle_tee_1790307903437.jpg';
import catHoodie from '../assets/images/cat_circle_hoodie_1790307889157.jpg';
import catPrint from '../assets/images/cat_circle_print_1790307920392.jpg';
import catCustom from '../assets/images/cat_circle_custom_1790307945537.jpg';
import catWholesale from '../assets/images/cat_circle_wholesale_1790307985252.jpg';
import catOversized from '../assets/images/cat_circle_oversized_1790308001655.jpg';

interface CategoriesProps {
  onSelectCategory: (categoryName: string, searchQueryTerm?: string) => void;
  onSelectCustom: () => void;
  onViewAllCategories: () => void;
}

export const Categories: React.FC<CategoriesProps> = ({
  onSelectCategory,
  onSelectCustom,
  onViewAllCategories,
}) => {
  const categoryItems = [
    {
      id: 't-shirts',
      name: 'T-Shirts',
      image: catTee,
      bgTint: 'bg-emerald-50',
      action: () => onSelectCategory('T-Shirts'),
    },
    {
      id: 'printed',
      name: 'Printed Tees',
      image: catPrint,
      bgTint: 'bg-purple-50',
      action: () => onSelectCategory('Printed T-Shirts'),
    },
    {
      id: 'hoodies',
      name: 'Hoodies',
      image: catHoodie,
      bgTint: 'bg-amber-50',
      action: () => onSelectCategory('Hoodies'),
    },
    {
      id: 'oversized',
      name: 'Oversized',
      image: catOversized,
      bgTint: 'bg-rose-50',
      action: () => onSelectCategory('T-Shirts', 'Oversized'),
    },
    {
      id: 'custom',
      name: 'Custom Print',
      image: catCustom,
      bgTint: 'bg-sky-50',
      action: onSelectCustom,
    },
    {
      id: 'wholesale',
      name: 'Wholesale',
      image: catWholesale,
      bgTint: 'bg-teal-50',
      action: onViewAllCategories,
    },
  ];

  return (
    <section className="py-6 sm:py-12 bg-white dark:bg-[#12141a] border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header: Title & "View All Categories →" on right */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <h2 className="text-lg sm:text-2xl font-black text-black dark:text-white tracking-tight">
            Shop by Categories
          </h2>

          <button
            onClick={onViewAllCategories}
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Categories: One line carousel on mobile with touch-scroll snap, grid on desktop */}
        <div className="flex sm:grid sm:grid-cols-6 gap-3 sm:gap-6 lg:gap-8 overflow-x-auto pb-3 sm:pb-0 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
          {categoryItems.map((cat) => (
            <button
              key={cat.id}
              onClick={cat.action}
              className="group flex flex-col items-center text-center cursor-pointer focus:outline-none shrink-0 w-[84px] sm:w-auto snap-center"
            >
              {/* Soft Tinted Circular Icon Container */}
              <div className={`relative w-[72px] h-[72px] sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full ${cat.bgTint} dark:bg-neutral-800/80 p-1.5 sm:p-2 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-md border border-neutral-200/60 dark:border-neutral-700/60 shadow-2xs`}>
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-neutral-900 shadow-2xs">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Category Name Label */}
              <span className="mt-2 sm:mt-3 text-[11px] sm:text-sm font-bold text-neutral-900 dark:text-neutral-200 group-hover:text-black dark:group-hover:text-white transition-colors whitespace-nowrap sm:whitespace-normal">
                {cat.name}
              </span>
            </button>
          ))}
        </div>

      </div>
    </section>
  );
};
