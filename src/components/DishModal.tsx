import React, { useState } from 'react';
import { X, Plus, Minus, Check, Flame, Clock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { MenuItem, SelectedAddon, CartItem, Currency, USD_TO_LRD_RATE, AddonOption } from '../types';
import { DishIllustration } from './DishIllustration';
import { CustomDropdown } from './CustomDropdown';

interface DishModalProps {
  dish: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'cartItemId' | 'itemTotal'>) => void;
  currency: Currency;
}

const DEFAULT_MONROVIA_ADDONS: AddonOption[] = [
  { id: 'extra-plantains', name: 'Fried Sweet Plantains (Dodo)', price: 1.50, description: 'Golden ripe fried plantains' },
  { id: 'monrovia-pepper', name: 'Extra Monrovia Hot Pepper Sauce', price: 0.75, description: 'Authentic habanero & scotch bonnet glaze' },
  { id: 'suya-skewer', name: 'Grilled Suya Beef Skewer', price: 2.50, description: 'Spiced with traditional yaji blend' },
  { id: 'fried-kala', name: 'Fried Kala Balls (2 pcs)', price: 1.00, description: 'Crispy fried dough with pepper dip' },
  { id: 'cold-wonjo', name: 'Chilled Fresh Wonjo (Hibiscus) Juice', price: 1.50, description: 'Infused with ginger and cloves' },
];

const SPICE_OPTIONS = [
  { value: 'Mild', label: 'Mild (Low Pepper)', badge: '🌶️ Gentle' },
  { value: 'Medium', label: 'Medium (Balanced Pepper)', badge: '🌶️🌶️ Classic' },
  { value: 'Monrovia Hot', label: 'Monrovia Hot (Local Style)', badge: '🔥 Hot' },
  { value: 'Extreme Pepper', label: 'Extreme Pepper (Extra Fire)', badge: '💥 Fire' },
];

export const DishModal: React.FC<DishModalProps> = ({ dish, onClose, onAddToCart, currency }) => {
  if (!dish) return null;

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [selectedTemperature, setSelectedTemperature] = useState<string>(
    dish.cookingTemperatures ? dish.cookingTemperatures[1] || dish.cookingTemperatures[0] : ''
  );
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string>(
    dish.spiceLevel || 'Monrovia Hot'
  );
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const availableAddonsList: AddonOption[] = (dish.availableAddons && dish.availableAddons.length > 0)
    ? dish.availableAddons
    : DEFAULT_MONROVIA_ADDONS;

  const allImages = dish.images && dish.images.length > 0
    ? dish.images
    : dish.image
    ? [dish.image]
    : [];

  const toggleAddon = (addonId: string, addonName: string, price: number) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addonId);
      if (exists) {
        return prev.filter((a) => a.id !== addonId);
      } else {
        return [...prev, { id: addonId, name: addonName, price }];
      }
    });
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const itemTotalUsd = (dish.price + addonsTotal) * quantity;

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  const handleConfirm = () => {
    onAddToCart({
      menuItem: dish,
      quantity,
      selectedAddons,
      selectedTemperature: selectedTemperature || undefined,
      selectedSpiceLevel: selectedSpiceLevel || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors backdrop-blur-xs shadow-md"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Visual Top Image Gallery / Illustration */}
        <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-[#1E1A17] to-[#2E241E] shrink-0 overflow-hidden">
          {allImages.length > 0 ? (
            <div className="relative w-full h-full">
              <img
                src={allImages[activeImageIndex] || allImages[0]}
                alt={dish.name}
                className="w-full h-full object-cover"
              />
              
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full">
                    {allImages.map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === activeImageIndex ? 'bg-white w-3' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <DishIllustration type={dish.illustrationType} />
          )}
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    idx === activeImageIndex
                      ? 'border-[#FF4B26] ring-2 ring-[#FF4B26]/20'
                      : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                {dish.name}
              </h2>
              <div className="font-mono text-xl font-black text-[#FF4B26] tabular-nums shrink-0">
                {formatPrice(dish.price)}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
              {dish.description}
            </p>

            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 font-medium">
              <span className="flex items-center gap-1 bg-orange-50 text-[#FF4B26] font-bold px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5" />
                {dish.prepTimeMinutes} mins preparation
              </span>
              {dish.provenance && (
                <span className="text-gray-400">
                  {dish.provenance}
                </span>
              )}
            </div>
          </div>

          {/* SPICE PREFERENCE SECTION */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FF4B26]" />
                <span>Spice Preference</span>
              </label>
              <span className="text-[11px] font-bold text-[#FF4B26]">
                {selectedSpiceLevel}
              </span>
            </div>

            {/* Custom Segmented Buttons for Spice */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SPICE_OPTIONS.map((opt) => {
                const isSelected = selectedSpiceLevel === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedSpiceLevel(opt.value)}
                    className={`py-2 px-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-[#FF4B26] bg-[#FFF2EE] text-[#FF4B26] shadow-xs ring-1 ring-[#FF4B26]'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-400">{opt.badge}</span>
                    <span className="text-xs font-extrabold mt-0.5 truncate">{opt.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* POPULAR MONROVIA SIDES & ADD-ONS */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                Popular Monrovia Sides & Add-ons
              </label>
              {selectedAddons.length > 0 && (
                <span className="text-[11px] text-[#FF4B26] font-bold">
                  {selectedAddons.length} added (+{formatPrice(addonsTotal)})
                </span>
              )}
            </div>

            <div className="space-y-2">
              {availableAddonsList.map((addon) => {
                const isChecked = selectedAddons.some((a) => a.id === addon.id);

                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id, addon.name, addon.price)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'border-[#FF4B26] bg-[#FFF2EE]/40 text-[#111827]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'border-[#FF4B26] bg-[#FF4B26] text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{addon.name}</div>
                        {addon.description && (
                          <div className="text-[10px] text-gray-400 truncate">{addon.description}</div>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-black text-gray-900 shrink-0 ml-2">
                      +{formatPrice(addon.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Kitchen Instructions */}
          <div className="space-y-1.5 pt-3 border-t border-gray-100">
            <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
              Kitchen Instructions
            </label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Extra pepper on the side, well done meat..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#FF4B26]"
            />
          </div>

        </div>

        {/* Footer with Quantity Stepper & Add to Bag */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white shrink-0 flex items-center justify-between gap-3 safe-bottom">
          
          {/* Stepper */}
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-40 text-gray-800 shadow-xs flex items-center justify-center transition-all"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl bg-white hover:bg-gray-50 text-gray-800 shadow-xs flex items-center justify-center transition-all"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Bag CTA */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-5 bg-gradient-to-r from-[#FF4B26] via-[#FF5F2E] to-[#FF8400] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-between min-h-[46px]"
          >
            <span>Add to Basket</span>
            <span className="font-mono text-sm font-black">{formatPrice(itemTotalUsd)}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
