import React from 'react';
import { X, Bike, ShoppingBag, UtensilsCrossed, Check } from 'lucide-react';
import { DiningMode } from '../types';

interface DiningModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: DiningMode;
  onSelectMode: (mode: DiningMode) => void;
}

export const DiningModeModal: React.FC<DiningModeModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
}) => {
  if (!isOpen) return null;

  const modes: {
    id: DiningMode;
    title: string;
    subtitle: string;
    eta: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'delivery',
      title: 'Monrovia Delivery',
      subtitle: 'Sinkor, Mamba Point, Congotown, Paynesville & Central',
      eta: '25–35 min',
      icon: Bike,
    },
    {
      id: 'pickup',
      title: 'Counter & Curbside Pickup',
      subtitle: 'Skip the wait and collect warm at the restaurant',
      eta: '15–20 min',
      icon: ShoppingBag,
    },
    {
      id: 'dine-in',
      title: 'Dine-In Table Order',
      subtitle: 'Order directly from your restaurant table or terrace',
      eta: 'Instant to Kitchen',
      icon: UtensilsCrossed,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade" onClick={onClose}>
      <div 
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl p-5 sm:p-6 pb-[calc(1.5rem+var(--sab))] sm:pb-6 space-y-4 max-h-[92vh] sm:max-h-full h-auto sm:h-full overflow-y-auto animate-modal-sheet sm:animate-drawer-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          onClick={onClose}
          className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto sm:hidden cursor-pointer" 
          title="Tap to close"
        />

        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-extrabold text-[#111827]">
              Dining Preference
            </h3>
            <p className="text-xs text-gray-500 font-medium">Serving across Monrovia, Liberia</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {modes.map((m) => {
            const isSelected = currentMode === m.id;
            const Icon = m.icon;

            return (
              <div
                key={m.id}
                onClick={() => {
                  onSelectMode(m.id);
                  onClose();
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between active:scale-[0.98] ${
                  isSelected
                    ? 'border-[#FF4B26] ring-2 ring-[#FF4B26]/15 bg-orange-50/50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#111827]">{m.title}</div>
                    <div className="text-xs text-gray-500 leading-tight mt-0.5">{m.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {m.eta}
                  </span>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#FF4B26] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
