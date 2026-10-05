import React from 'react';
import { Utensils, Search, Clock, Heart, ArrowRight, User } from 'lucide-react';
import { Currency, USD_TO_LRD_RATE } from '../types';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: 'menu' | 'favorites' | 'orders';
  onSelectTab: (tab: 'menu' | 'favorites' | 'orders') => void;
  favoritesCount: number;
  activeOrderCount: number;
  cartCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
  onFocusSearch: () => void;
  onOpenLogin: () => void;
  currency: Currency;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount,
  activeOrderCount,
  cartCount,
  cartSubtotal,
  onOpenCart,
  onFocusSearch,
  onOpenLogin,
  currency,
}) => {
  const { user } = useAuth();

  const formattedSubtotal = currency === 'LRD'
    ? `L$${Math.round(cartSubtotal * USD_TO_LRD_RATE).toLocaleString()}`
    : `$${cartSubtotal.toFixed(2)}`;

  return (
    <>
      {/* Vibrant Floating Sticky Cart Pill with iPhone Safe Area */}
      {cartCount > 0 && (
        <div className="fixed safe-cart-bottom sm:bottom-6 left-0 right-0 z-40 p-3 max-w-md mx-auto pointer-events-none animate-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={onOpenCart}
            className="w-full pointer-events-auto bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white p-3.5 rounded-2xl shadow-xl shadow-[#06C167]/30 flex items-center justify-between font-bold active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white text-[#048747] text-xs flex items-center justify-center font-extrabold shadow-sm">
                {cartCount}
              </div>
              <span className="text-sm">View Basket</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-base tabular-nums font-black">
                {formattedSubtotal}
              </span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Modern White Bottom Nav Bar with iPhone Safe Area Bottom Padding */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] safe-bottom-nav flex items-center justify-around px-2 sm:hidden">
        
        {/* Food / Menu Tab */}
        <button
          onClick={() => {
            onSelectTab('menu');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all relative ${
            activeTab === 'menu' ? 'text-[#06C167]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Utensils className={`w-5 h-5 ${activeTab === 'menu' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] font-bold mt-1">Food</span>
          {activeTab === 'menu' && (
            <span className="absolute top-0 w-8 h-1 bg-[#06C167] rounded-full" />
          )}
        </button>

        {/* Search Tab */}
        <button
          onClick={onFocusSearch}
          className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Search className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] font-bold mt-1">Search</span>
        </button>

        {/* Favorites Tab */}
        <button
          onClick={() => onSelectTab('favorites')}
          className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all ${
            activeTab === 'favorites' ? 'text-[#06C167]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Heart className={`w-5 h-5 ${activeTab === 'favorites' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          {favoritesCount > 0 && (
            <span className="absolute top-2 right-5 w-2 h-2 rounded-full bg-[#06C167]" />
          )}
          <span className="text-[10px] font-bold mt-1">Saved</span>
          {activeTab === 'favorites' && (
            <span className="absolute top-0 w-8 h-1 bg-[#06C167] rounded-full" />
          )}
        </button>

        {/* Orders Tab */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-all ${
            activeTab === 'orders' ? 'text-[#06C167]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Clock className={`w-5 h-5 ${activeTab === 'orders' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          {activeOrderCount > 0 && (
            <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-[#06C167] animate-ping" />
          )}
          <span className="text-[10px] font-bold mt-1">Orders</span>
          {activeTab === 'orders' && (
            <span className="absolute top-0 w-8 h-1 bg-[#06C167] rounded-full" />
          )}
        </button>

        {/* Profile / Account Tab */}
        <button
          onClick={onOpenLogin}
          className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <User className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] font-bold mt-1">{user ? 'Account' : 'Sign In'}</span>
        </button>

      </nav>
    </>
  );
};
