import React from 'react';
import { Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react';

export const TrustFeatureBar: React.FC = () => {
  const features = [
    {
      icon: Truck,
      title: 'Free Shipping',
      desc: 'On orders over ৳1,500',
    },
    {
      icon: ShieldCheck,
      title: 'Secure Payment',
      desc: '100% Cash on Delivery & bKash',
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      desc: '7 days hassle-free exchange',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      desc: 'Dedicated WhatsApp & Call',
    },
  ];

  return (
    <div className="hidden sm:block bg-white dark:bg-[#12141a] border-b border-neutral-200 dark:border-neutral-800 py-5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF9F5] dark:bg-[#1a1c24] border border-neutral-200/80 dark:border-neutral-800 hover:border-black dark:hover:border-neutral-600 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5 text-black dark:text-white stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
