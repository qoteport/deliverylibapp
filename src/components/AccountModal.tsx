import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Navigation, LogOut, Check, Edit2, Save, ShoppingBag, Heart, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MONROVIA_NEIGHBORHOODS, MONROVIA_NEIGHBORHOOD_COORDS, LocationCoords } from '../types';
import { db } from '../firebase/config';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { LocationPickerModal } from './LocationPickerModal';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrders?: () => void;
  onOpenFavorites?: () => void;
  favoritesCount?: number;
  activeOrderCount?: number;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenOrders,
  onOpenFavorites,
  favoritesCount = 0,
  activeOrderCount = 0,
}) => {
  const { user, logout, setUserDirectly } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(user?.location || MONROVIA_NEIGHBORHOODS[0]);
  const [addressDetails, setAddressDetails] = useState(user?.address || '');
  const [coords, setCoords] = useState<LocationCoords | null>(null);

  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSelectedNeighborhood(user.location || MONROVIA_NEIGHBORHOODS[0]);
      setAddressDetails(user.address || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedUser = {
      ...user,
      name: name.trim() || user.name || 'Monrovia Foodie',
      location: selectedNeighborhood,
      address: addressDetails.trim(),
    };

    setUserDirectly(updatedUser);

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          name: updatedUser.name,
          location: updatedUser.location,
          address: updatedUser.address,
          phone: user.phone || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore user profile update notice:', err);
    }

    setIsSaving(false);
    setIsEditingName(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const hasLocationSet = Boolean(user.location && user.location !== 'all' && (user.address || user.location));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center font-black shadow-md shadow-[#06C167]/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#111827]">
                My Account
              </h2>
              <p className="text-xs text-gray-500">
                Monrovia Food Delivery Profile
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Success Feedback */}
          {saveSuccess && (
            <div className="p-3 bg-[#E8F8EE] border border-emerald-200 rounded-2xl text-[#048747] font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Delivery location and profile updated successfully!</span>
            </div>
          )}

          {/* User Details Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                  Customer Name
                </span>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="px-3 py-1.5 bg-white border border-[#06C167] rounded-xl text-xs font-bold text-gray-900 focus:outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#111827]">
                      {name || 'Monrovia Foodie'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-gray-400 hover:text-[#06C167] p-1 cursor-pointer"
                      title="Edit Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                  Registered Phone
                </span>
                <span className="text-xs font-mono font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>{user.phone || 'Phone not set'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Location Section */}
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#111827] text-xs flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#06C167]" />
                <span>Default Delivery Location</span>
              </span>
              {!hasLocationSet && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Not Configured
                </span>
              )}
            </div>

            <div className="space-y-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
              <div className="space-y-1">
                <label className="text-gray-600 font-bold block">Monrovia Neighborhood *</label>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#111827] focus:outline-none focus:border-[#06C167]"
                >
                  {MONROVIA_NEIGHBORHOODS.map((nh) => (
                    <option key={nh} value={nh}>
                      {nh}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-600 font-bold block">Street Address / House / Landmark</label>
                <input
                  type="text"
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder="e.g. 14th Street Sinkor, Green Gate opposite Total Gas Station"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#06C167]"
                />
              </div>

              {/* Pinpoint Location on Map Button */}
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(true)}
                className="w-full py-2.5 px-3 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-800 hover:text-[#048747] font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Pinpoint Location on Map</span>
                </div>
                <span className="text-[11px] font-bold text-[#06C167]">
                  {coords ? '✓ Pin Captured' : 'Open Map'}
                </span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-[#06C167] hover:bg-[#05A357] text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Delivery Address'}</span>
              </button>
            </div>
          </form>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {onOpenOrders && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrders();
                }}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 flex items-center justify-between font-bold text-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#06C167]" />
                  <span>My Orders</span>
                </div>
                {activeOrderCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#06C167] text-white text-[10px] rounded-full font-black">
                    {activeOrderCount}
                  </span>
                )}
              </button>
            )}

            {onOpenFavorites && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFavorites();
                }}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 flex items-center justify-between font-bold text-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>Saved Dishes</span>
                </div>
                {favoritesCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-black">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-2xl border border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>

        </div>

      </div>

      {/* Location Picker Map Modal */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={coords || MONROVIA_NEIGHBORHOOD_COORDS[selectedNeighborhood]}
        initialArea={selectedNeighborhood}
        initialAddress={addressDetails}
        onConfirmLocation={(data) => {
          setCoords(data.coords);
          if (data.address) setAddressDetails(data.address);
          if (data.area) setSelectedNeighborhood(data.area);
          setIsMapPickerOpen(false);
        }}
      />
    </div>
  );
};
