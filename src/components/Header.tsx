import { 
  ShoppingBag, 
  Heart, 
  MapPin, 
  Clock, 
  ChevronDown, 
  Bike, 
  UtensilsCrossed, 
  User, 
  LogOut, 
  Utensils 
} from 'lucide-react';
import { DiningMode, Currency, USD_TO_LRD_RATE } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  diningMode: DiningMode;
  onOpenDiningModeSelect: () => void;
  currency: Currency;
  onToggleCurrency: () => void;
  cartCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
  favoritesCount: number;
  onOpenFavorites: () => void;
  activeOrderCount: number;
  onOpenOrderTracker: () => void;
  onOpenLogin: () => void;
  onOpenAccount?: () => void;
  onOpenRegister?: () => void;
  onOpenAdminPortal: () => void;
  onOpenRestaurantPortal: (restaurantId: string) => void;
  onOpenDriverPortal: () => void;
  onOpenDriverJoin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  diningMode,
  onOpenDiningModeSelect,
  currency,
  onToggleCurrency,
  cartCount,
  cartSubtotal,
  onOpenCart,
  favoritesCount,
  onOpenFavorites,
  activeOrderCount,
  onOpenOrderTracker,
  onOpenLogin,
  onOpenAccount,
  onOpenRegister,
  onOpenAdminPortal,
  onOpenRestaurantPortal,
  onOpenDriverPortal,
}) => {
  const { user } = useAuth();

  const modeIcon = {
    delivery: Bike,
    pickup: ShoppingBag,
    'dine-in': UtensilsCrossed,
  };

  const ModeIcon = modeIcon[diningMode];

  const modeShort = {
    delivery: 'Delivery',
    pickup: 'Pickup',
    'dine-in': 'Dine-In',
  };

  const formattedSubtotal = currency === 'LRD' 
    ? `L$${Math.round(cartSubtotal * USD_TO_LRD_RATE).toLocaleString()}`
    : `$${cartSubtotal.toFixed(2)}`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] h-14 sm:h-16 flex items-center">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-2">
        
        {/* Brand & Location (Clean, uncluttered on mobile) */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <a 
            href="/" 
            className="flex items-center gap-1.5 shrink-0 group"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#06C167] flex items-center justify-center text-white shadow-md shadow-[#06C167]/25">
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-lg sm:text-2xl tracking-tight text-[#111827]">
              AURA<span className="text-[#06C167]">.</span>
            </span>
          </a>

          {/* Location Delivery Dropdown Pill */}
          <button
            onClick={onOpenDiningModeSelect}
            className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-full text-[11px] sm:text-xs text-[#1F2937] font-semibold transition-all shadow-xs"
            title="Choose Delivery Location"
          >
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#06C167] shrink-0" />
            <span className="truncate max-w-[85px] sm:max-w-[130px]">Monrovia</span>
            <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
          </button>

          {/* Dining Mode Quick Pill */}
          <button
            onClick={onOpenDiningModeSelect}
            className="hidden xs:flex items-center gap-1 px-2.5 py-1 bg-[#E8F8EE] hover:bg-[#D4F4E0] text-[#06C167] font-bold rounded-full text-[11px] transition-colors"
            title="Change Dining Preference"
          >
            <ModeIcon className="w-3 h-3 stroke-[2.5]" />
            <span>{modeShort[diningMode]}</span>
          </button>
        </div>

        {/* Right Actions (Decluttered & Streamlined) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Dual Currency Switcher Pill */}
          <button
            onClick={onToggleCurrency}
            className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-[#374151] rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs flex items-center gap-0.5 sm:gap-1"
            title="Toggle USD / LRD"
          >
            <span className="text-[#06C167] font-mono font-bold">{currency === 'USD' ? '$' : 'L$'}</span>
            <span>{currency}</span>
          </button>

          {/* User Account or Sign In */}
          <div className="hidden sm:flex items-center gap-1.5">
            {user ? (
              <button
                type="button"
                onClick={onOpenAccount}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#111827] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="View My Account"
              >
                <User className="w-3.5 h-3.5 text-[#06C167]" />
                <span>Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-[#111827] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Sign In"
              >
                <User className="w-3.5 h-3.5 text-[#06C167]" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Active order badge */}
          {activeOrderCount > 0 && (
            <button
              onClick={onOpenOrderTracker}
              className="flex items-center gap-1 px-2 py-1 bg-[#E8F8EE] border border-[#A7F3D0] text-[#059669] text-[11px] font-bold rounded-xl transition-all animate-pulse"
              title="Track Active Order"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">1 Active</span>
            </button>
          )}

          {/* Saved / Favorites (Desktop/Tablet) */}
          <button
            onClick={onOpenFavorites}
            className="hidden sm:flex items-center gap-1 p-2 text-gray-600 hover:text-[#06C167] hover:bg-green-50 rounded-xl transition-colors relative"
            title="Saved Favorites"
          >
            <Heart className="w-4 h-4" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#06C167] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Modern Cart Button */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-3.5 bg-gradient-to-r from-[#06C167] to-[#048747] text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-[#06C167]/25 hover:shadow-lg active:scale-95"
            title="Shopping Basket"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-white text-[#06C167] text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden xs:inline font-mono font-bold">
              {cartCount > 0 ? formattedSubtotal : 'Bag'}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
