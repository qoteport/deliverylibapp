import React, { useState } from 'react';
import { X, Heart, Plus, RotateCcw, Clock, ShoppingBag } from 'lucide-react';
import { MenuItem, Order, Currency, USD_TO_LRD_RATE } from '../types';
import { DishIllustration } from './DishIllustration';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: MenuItem[];
  onRemoveFavorite: (dishId: string) => void;
  onAddToCart: (dish: MenuItem) => void;
  pastOrders: Order[];
  onSelectOrderToTrack: (order: Order) => void;
  onReorder: (order: Order) => void;
  currency: Currency;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onAddToCart,
  pastOrders,
  onSelectOrderToTrack,
  onReorder,
  currency,
}) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');

  if (!isOpen) return null;

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      return `L$${Math.round(usd * USD_TO_LRD_RATE).toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end animate-overlay-fade" onClick={onClose}>
      <div 
        className="w-full sm:max-w-md bg-white max-h-[92vh] sm:max-h-full rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col border-t sm:border-l border-gray-100 animate-modal-sheet sm:animate-drawer-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          onClick={onClose}
          className="w-full py-2.5 flex items-center justify-center sm:hidden shrink-0 cursor-pointer active:scale-95"
          title="Tap to close"
          role="button"
          aria-label="Collapse drawer"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
        </div>

        {/* Header Tabs */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'favorites' ? 'bg-white text-[#048747] shadow-sm' : 'text-gray-500 hover:text-black'
              }`}
            >
              Saved ({favorites.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'history' ? 'bg-white text-[#048747] shadow-sm' : 'text-gray-500 hover:text-black'
              }`}
            >
              Past Orders ({pastOrders.length})
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {activeTab === 'favorites' && (
            <>
              {favorites.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-[#E8F8EE] text-[#06C167] flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#111827]">No saved dishes yet</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Tap the heart icon on any Monrovia dish to save it here for 1-tap ordering.
                  </p>
                </div>
              ) : (
                favorites.map((dish) => {
                  const dishImg = dish.image || (dish.images && dish.images[0]);
                  return (
                    <div
                      key={dish.id}
                      className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex gap-3 items-center"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative border border-gray-100">
                        {dishImg ? (
                          <img
                            src={dishImg}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DishIllustration type={dish.illustrationType} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#111827] truncate">
                        {dish.name}
                      </h4>
                      <div className="font-mono text-xs font-bold text-[#06C167] mt-0.5">
                        {formatPrice(dish.price)}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {dish.provenance || 'Monrovia, LR'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => onAddToCart(dish)}
                        className="p-2 bg-gradient-to-r from-[#06C167] to-[#048747] text-white rounded-xl shadow-xs hover:shadow-md flex items-center justify-center cursor-pointer"
                        title="Add to bag"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                      <button
                        onClick={() => onRemoveFavorite(dish.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {pastOrders.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#111827]">No past orders yet</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Orders you place in Monrovia will be saved here with live tracking & 1-tap reordering.
                  </p>
                </div>
              ) : (
                pastOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <span className="font-mono text-xs font-bold text-gray-900">{order.id}</span>
                        <div className="text-[10px] text-gray-400">{order.createdAt}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          order.status === 'cancelled'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : order.status === 'completed'
                            ? 'bg-emerald-50 text-[#048747] border border-emerald-200'
                            : 'bg-emerald-50 text-[#048747] border border-emerald-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      {order.items.map((i) => (
                        <div key={i.cartItemId} className="flex justify-between">
                          <span>{i.quantity}x {i.menuItem.name}</span>
                          <span className="font-mono font-semibold">{formatPrice(i.itemTotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="font-mono text-sm font-black text-[#111827]">
                        {formatPrice(order.total)}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onSelectOrderToTrack(order)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Track
                        </button>
                        <button
                          onClick={() => onReorder(order)}
                          className="px-3 py-1.5 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
