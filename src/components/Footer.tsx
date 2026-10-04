import React from 'react';
import { Utensils, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-gray-500 py-10 pb-28 sm:pb-10 border-t border-gray-100 text-center text-xs">
      <div className="max-w-6xl mx-auto px-4 space-y-3">
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] flex items-center justify-center text-white">
            <Utensils className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#111827]">
            AURA<span className="text-[#FF4B26]">.</span> Monrovia
          </span>
        </div>

        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Order Monrovia's best food with lightning-fast delivery across Sinkor, Mamba Point, Congotown, Paynesville, and Central Monrovia.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-gray-700 pt-1">
          <span className="px-2 py-0.5 rounded-md bg-[#FFCC00]/20 text-black">
            Lonestar MTN MoMo
          </span>
          <span className="text-gray-300">•</span>
          <span className="px-2 py-0.5 rounded-md bg-[#FF6600]/15 text-[#B84A00]">
            Orange Money
          </span>
          <span className="text-gray-300">•</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
            Cash on Delivery (USD / LRD)
          </span>
        </div>

        <div className="text-[11px] text-gray-400 pt-2 flex items-center justify-center gap-1">
          <span>&copy; {new Date().getFullYear()} AURA Monrovia. Built for Liberia with</span>
          <Heart className="w-3 h-3 text-[#FF4B26] fill-[#FF4B26]" />
        </div>
      </div>
    </footer>
  );
};
