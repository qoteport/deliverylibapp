import React from 'react';
import { 
  X, 
  Bike, 
  ShoppingBag, 
  Utensils, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Car,
  Package,
  Pill,
  Building2,
  Key,
  Wrench,
  Shirt,
  ExternalLink
} from 'lucide-react';

interface AppsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRides: () => void;
  onOpenSupermarket: () => void;
  onOpenFood: () => void;
  onOpenRealEstate?: () => void;
  onOpenLifestyle?: () => void;
  onOpenMotors?: () => void;
}

export const AppsHubModal: React.FC<AppsHubModalProps> = ({
  isOpen,
  onClose,
  onOpenRides,
  onOpenSupermarket,
  onOpenFood,
  onOpenRealEstate,
  onOpenLifestyle,
  onOpenMotors,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#06C167] to-emerald-400 flex items-center justify-center text-white shadow-md shadow-[#06C167]/20">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                Aura Apps Ecosystem
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-[#06C167] border border-emerald-200">
                  Monrovia
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                Everyday services for riders, food lovers & shoppers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
            title="Close Apps"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Apps Grid */}
        <div className="p-4 sm:p-6 space-y-3.5">
          
          {/* App 1: Aura Rides */}
          <div 
            onClick={() => {
              onClose();
              onOpenRides();
            }}
            className="group relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-4 sm:p-5 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#06C167] to-teal-500 text-white flex items-center justify-center shadow-md shadow-[#06C167]/30 shrink-0 group-hover:scale-105 transition-transform">
                  <Bike className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900 group-hover:text-[#06C167] transition-colors">
                      Aura Rides
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#06C167] text-white">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Motorbike & Kekeh hailing across Sinkor, Broad St, Congo Town & Bushrod. Choose pickup, call rider directly or ping to alert.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#06C167]" /> Monrovia Zones
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#06C167]" /> 3-5 min pickups
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-[#06C167] group-hover:text-white text-[#06C167] flex items-center justify-center transition-all shrink-0 mt-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* App 2: AURA Shopping */}
          <div 
            onClick={() => {
              onClose();
              onOpenSupermarket();
            }}
            className="group relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-4 sm:p-5 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#059669] to-[#10B981] text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900 group-hover:text-[#059669] transition-colors">
                      AURA Shopping
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                      Ecommerce
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Shop fresh groceries, pantry staples, beverages &amp; snacks from Stop &amp; Shop, Boulevard Supermarket, Monoprix, &amp; Abi Jaoudi.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Authentic Items
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" /> Fast Delivery
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center transition-all shrink-0 mt-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* App 3: Aura Food Delivery */}
          <div 
            onClick={() => {
              onClose();
              onOpenFood();
            }}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-gray-400 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Utensils className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                      Food & Dining
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      Restaurants
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Explore verified local kitchens and restaurants in Monrovia. Authentic Jollof, Palaver Sauce, and grilled dishes.
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-amber-500 group-hover:text-white text-gray-600 flex items-center justify-center transition-all shrink-0 mt-1">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* App 4: Real Estate */}
          {onOpenRealEstate && (
            <div 
              onClick={() => {
                onClose();
                onOpenRealEstate();
              }}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0 group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-sky-600 transition-colors">
                        Real Estate & Rentals
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                        Properties
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Find apartments to rent, houses to buy, and verified titled land across Monrovia.
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-sky-600 group-hover:text-white text-gray-600 flex items-center justify-center transition-all shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>
          )}

          {/* App 5: Lifestyle & Tech */}
          {onOpenLifestyle && (
            <div 
              onClick={() => {
                onClose();
                onOpenLifestyle();
              }}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                    <Shirt className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        Lifestyle & Tech
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        Electronics & Fashion
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Smartphones, laptops, solar kits, Liberian country cloth gowns & footwear.
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-purple-600 group-hover:text-white text-gray-600 flex items-center justify-center transition-all shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>
          )}

          {/* App 6: Motors & Rentals */}
          {onOpenMotors && (
            <div 
              onClick={() => {
                onClose();
                onOpenMotors();
              }}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                        Motors, Rentals & Spares
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        Cars & Kekeh
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Buy clean cars, rent 4x4 SUVs, and order genuine auto & kekeh spare parts.
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-amber-600 group-hover:text-white text-gray-600 flex items-center justify-center transition-all shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>
          )}

          {/* Coming Soon Apps Section */}
          <div className="pt-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1 mb-2.5">
              Coming Soon to Monrovia
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              
              <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">Aura Pharmacy</p>
                  <p className="text-[10px] text-gray-400">Prescriptions</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">Express Courier</p>
                  <p className="text-[10px] text-gray-400">Parcel Pickup</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#06C167]" /> Verified Monrovia Drivers & Merchants
          </span>
          <span className="text-[11px] font-mono text-gray-400">AURA Multi-App</span>
        </div>

      </div>
    </div>
  );
};
