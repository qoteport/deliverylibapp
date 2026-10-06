import React, { useState } from 'react';
import { X, Store, Check, Plus, MapPin, Phone, DollarSign, Clock, ShieldCheck, Users, Info, Navigation, Trash2 } from 'lucide-react';
import { Restaurant, MenuItem, MONROVIA_NEIGHBORHOODS, LocationCoords, MONROVIA_NEIGHBORHOOD_COORDS } from '../types';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { LocationPickerModal } from './LocationPickerModal';

interface RestaurantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestaurantCreated: (newRestaurant: Restaurant, initialDish?: MenuItem) => void;
  onOpenKitchenPortal?: (restaurantId: string) => void;
  isSuperAdminMode?: boolean;
}

export const RestaurantOnboardingModal: React.FC<RestaurantOnboardingModalProps> = ({
  isOpen,
  onClose,
  onRestaurantCreated,
  onOpenKitchenPortal,
  isSuperAdminMode = false,
}) => {
  if (!isOpen) return null;

  // Form State
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState(MONROVIA_NEIGHBORHOODS[0]);
  const [address, setAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [cuisine, setCuisine] = useState('Liberian Local Food & Grill');
  const [phone, setPhone] = useState('+231 ');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'orange' | 'both'>('mtn');
  const [kitchenPin, setKitchenPin] = useState('');
  const [deliveryTimeMinutes, setDeliveryTimeMinutes] = useState(25);
  const [deliveryFeeUsd, setDeliveryFeeUsd] = useState(2.00);
  const [minOrderUsd, setMinOrderUsd] = useState(5.00);
  const [tagline, setTagline] = useState('');

  // Auto-detect Liberian MoMo provider from phone number
  const detectMomoNetwork = (phoneStr: string): 'mtn' | 'orange' | null => {
    const digits = phoneStr.replace(/[^0-9]/g, '');
    if (
      digits.startsWith('23188') || digits.startsWith('23155') ||
      digits.startsWith('088') || digits.startsWith('055') ||
      digits.startsWith('88') || digits.startsWith('55')
    ) {
      return 'mtn';
    }
    if (
      digits.startsWith('23177') || digits.startsWith('077') || digits.startsWith('77')
    ) {
      return 'orange';
    }
    return null;
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setMomoNumber(val);
    const network = detectMomoNetwork(val);
    if (network) {
      setMomoProvider(network);
    }
  };

  // Authorized Phone Numbers (One by one)
  const [allowedPhonesList, setAllowedPhonesList] = useState<string[]>([]);
  const [currentStaffPhoneInput, setCurrentStaffPhoneInput] = useState('');
  const [staffPhoneError, setStaffPhoneError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRestaurant, setCreatedRestaurant] = useState<Restaurant | null>(null);

  const handleAddStaffPhone = () => {
    const raw = currentStaffPhoneInput.trim();
    if (!raw) return;
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length < 6) {
      setStaffPhoneError('Please enter a valid phone number (e.g. 0886 554 321)');
      return;
    }
    if (allowedPhonesList.includes(raw)) {
      setStaffPhoneError('This phone number has already been added');
      return;
    }
    setAllowedPhonesList((prev) => [...prev, raw]);
    setCurrentStaffPhoneInput('');
    setStaffPhoneError('');
  };

  const handleRemoveStaffPhone = (phoneToRemove: string) => {
    setAllowedPhonesList((prev) => prev.filter((p) => p !== phoneToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (kitchenPin && kitchenPin.replace(/[^0-9]/g, '').length !== 6) {
      alert('Please enter a 6-digit PIN for kitchen login security.');
      return;
    }

    setIsSubmitting(true);
    const restaurantId = `rest-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}-${Date.now().toString().slice(-4)}`;

    // Parse allowed phone numbers
    const cleanPhone = phone.trim();
    const parsedAllowedPhones: string[] = [cleanPhone];
    if (momoNumber.trim() && !parsedAllowedPhones.includes(momoNumber.trim())) {
      parsedAllowedPhones.push(momoNumber.trim());
    }

    allowedPhonesList.forEach((p) => {
      const clean = p.trim();
      if (clean && !parsedAllowedPhones.includes(clean)) {
        parsedAllowedPhones.push(clean);
      }
    });

    const isVerified = isSuperAdminMode ? true : false;
    const verificationStatus: 'verified' | 'pending' = isSuperAdminMode ? 'verified' : 'pending';
    const finalLocationCoords = locationCoords || MONROVIA_NEIGHBORHOOD_COORDS[neighborhood] || { lat: 6.2907, lng: -10.7818 };

    const cleanPin = kitchenPin.replace(/[^0-9]/g, '').slice(0, 6) || '123456';

    const newRestaurant: Restaurant = {
      id: restaurantId,
      name: name.trim(),
      neighborhood,
      address: address.trim() || `${neighborhood}, Monrovia`,
      cuisine: cuisine.trim(),
      phone: cleanPhone,
      momoNumber: momoNumber.trim() || cleanPhone,
      momoProvider,
      kitchenPin: cleanPin,
      rating: 5.0,
      reviewCount: 1,
      deliveryTimeMinutes: Number(deliveryTimeMinutes) || 25,
      deliveryFeeUsd: Number(deliveryFeeUsd) || 2.0,
      minOrderUsd: Number(minOrderUsd) || 5.0,
      isOpen: true,
      isVerified,
      verificationStatus,
      allowedPhoneNumbers: parsedAllowedPhones,
      tagline: tagline.trim() || `Authentic ${cuisine} in ${neighborhood}`,
      location: finalLocationCoords,
      createdAt: new Date().toISOString(),
    };

    let initialDish: MenuItem | undefined;

    try {
      // Save restaurant document
      await setDoc(doc(db, 'restaurants', newRestaurant.id), {
        id: newRestaurant.id,
        name: newRestaurant.name,
        neighborhood: newRestaurant.neighborhood,
        address: newRestaurant.address,
        cuisine: newRestaurant.cuisine,
        phone: newRestaurant.phone,
        momoNumber: newRestaurant.momoNumber,
        momoProvider: newRestaurant.momoProvider,
        kitchenPin: newRestaurant.kitchenPin,
        rating: newRestaurant.rating,
        reviewCount: newRestaurant.reviewCount,
        deliveryTimeMinutes: newRestaurant.deliveryTimeMinutes,
        deliveryFeeUsd: newRestaurant.deliveryFeeUsd,
        minOrderUsd: newRestaurant.minOrderUsd,
        isOpen: newRestaurant.isOpen,
        isVerified: newRestaurant.isVerified,
        verificationStatus: newRestaurant.verificationStatus,
        allowedPhoneNumbers: newRestaurant.allowedPhoneNumbers,
        tagline: newRestaurant.tagline,
        location: newRestaurant.location,
        createdAt: newRestaurant.createdAt,
      });
    } catch (error) {
      console.warn('Restaurant creation notice:', error);
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    setCreatedRestaurant(newRestaurant);
    onRestaurantCreated(newRestaurant, initialDish);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end p-0 animate-overlay-fade"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-l border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-full sm:h-full animate-modal-sheet sm:animate-drawer-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 sm:hidden shrink-0 cursor-pointer hover:bg-gray-300 transition-colors" onClick={onClose} title="Swipe down or tap to minimize" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] text-white flex items-center justify-center shadow-md shadow-[#FF4B26]/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#111827]">
                {isSuperAdminMode ? 'Super Admin: Onboard Kitchen' : 'Register Your Restaurant'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {isSuperAdminMode ? 'Directly verify & configure kitchen access' : 'Join Monrovia’s food delivery network'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {isSuccess && createdRestaurant ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
              createdRestaurant.isVerified 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#111827]">
              {createdRestaurant.name} Registered!
            </h3>
            
            {createdRestaurant.isVerified ? (
              <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                Your restaurant is <strong>Verified &amp; Live</strong> in <strong>{createdRestaurant.neighborhood}</strong>. Customers across Monrovia can now browse and place orders!
              </p>
            ) : (
              <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl text-left text-xs space-y-1.5 max-w-sm mx-auto">
                <div className="font-extrabold text-[#FF4B26] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pending Account Verification</span>
                </div>
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  Your kitchen is registered in the system and will undergo verification before appearing on the public customer storefront.
                </p>
              </div>
            )}

            {/* Allowed Phone Numbers Summary */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left text-xs space-y-1.5 max-w-sm mx-auto">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF4B26] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Authorized Staff Phone Numbers:</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {createdRestaurant.allowedPhoneNumbers?.map((p, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg font-mono text-[11px] font-bold text-gray-800">
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 pt-1">
                Staff can log into the Kitchen Orders Display by entering any of the authorized phone numbers above.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              {onOpenKitchenPortal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenKitchenPortal(createdRestaurant.id);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#FF4722] to-[#FF7A00] text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-lg shadow-[#FF4B26]/20 hover:shadow-xl transition-all cursor-pointer"
                >
                  Open Kitchen Orders Display &rarr;
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-2xl hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            
            {/* 1. Restaurant Basics */}
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#FF4B26]" />
                <span>1. Restaurant Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-gray-600 font-bold">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mama Liberia Kitchen & Grill"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Monrovia Neighborhood *</label>
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] font-semibold focus:outline-none focus:border-[#FF4B26]"
                  >
                    {MONROVIA_NEIGHBORHOODS.map((nh) => (
                      <option key={nh} value={nh}>
                        {nh}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Cuisine Specialty *</label>
                  <input
                    type="text"
                    required
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder="e.g. Jollof, Pepper Soup & Suya"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-gray-600 font-bold">Street Address / Landmark</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 17th Street, Tubman Blvd, Opposite Total Station"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>

                {/* Map Pinpoint Location Selector */}
                <div className="sm:col-span-2 space-y-1.5 pt-1">
                  <label className="text-gray-600 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#06C167]" />
                      <span>Exact GPS Pinpoint on Map</span>
                    </span>
                    {locationCoords && (
                      <span className="text-[10px] font-mono font-bold text-[#048747] bg-[#E8F8EE] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                        ✓ Coordinates Captured ({locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)})
                      </span>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      locationCoords
                        ? 'border-[#06C167] bg-[#E8F8EE]/60 text-gray-900 shadow-2xs'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        locationCoords ? 'bg-[#06C167] text-white shadow-xs' : 'bg-white text-gray-500 border border-gray-200'
                      }`}>
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-gray-900">
                          {locationCoords ? 'Kitchen Pinpoint Active' : 'Pin Kitchen Location on Map'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {locationCoords
                            ? `Lat: ${locationCoords.lat.toFixed(5)}, Lng: ${locationCoords.lng.toFixed(5)}`
                            : 'Click to drag marker & capture exact longitude and latitude'}
                        </div>
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                      locationCoords ? 'bg-white border border-emerald-300 text-[#048747]' : 'bg-gray-900 text-white'
                    }`}>
                      {locationCoords ? 'Update Location' : 'Set Location'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Contact & Authorized Staff Phone Numbers */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="text-xs font-extrabold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FF4B26]" />
                <span>2. Contact &amp; Authorized Staff Phone Numbers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Main Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+231 77 / 88 ..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Mobile Money Payout Number *</label>
                  <input
                    type="tel"
                    required
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    placeholder="e.g. 0886 123 456"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>

                {/* 6-Digit Kitchen Security PIN */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-gray-600 font-bold flex items-center justify-between">
                    <span>6-Digit Kitchen Security PIN *</span>
                    <span className="text-[10px] text-gray-400 font-normal">Used along with authorized staff phone numbers to log in</span>
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={kitchenPin}
                    onChange={(e) => setKitchenPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit PIN (e.g. 231001)"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold tracking-widest text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                  />
                </div>

                {/* Authorized Staff Phone Numbers (Add one at a time) */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-600 font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#FF4B26]" />
                      <span>Authorized Staff Phone Numbers for Kitchen Login</span>
                    </label>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {allowedPhonesList.length + 1} staff {allowedPhonesList.length === 0 ? 'number' : 'numbers'}
                    </span>
                  </div>

                  {/* Add Input Row */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={currentStaffPhoneInput}
                        onChange={(e) => {
                          setCurrentStaffPhoneInput(e.target.value);
                          if (staffPhoneError) setStaffPhoneError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddStaffPhone();
                          }
                        }}
                        placeholder="Enter phone (e.g. 0886 554 321)"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#FF4B26]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStaffPhone}
                      className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Staff</span>
                    </button>
                  </div>

                  {staffPhoneError && (
                    <p className="text-[11px] text-red-500 font-semibold">{staffPhoneError}</p>
                  )}

                  {/* Badges / Chips list of added phone numbers */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {phone.trim().length > 4 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span>{phone} (Main)</span>
                      </div>
                    )}
                    {allowedPhonesList.map((p) => (
                      <div
                        key={p}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E8F8EE] border border-emerald-200 rounded-xl text-xs font-mono font-bold text-[#048747] shadow-2xs animate-in fade-in duration-150"
                      >
                        <Phone className="w-3 h-3 text-[#06C167]" />
                        <span>{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStaffPhone(p)}
                          className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title={`Remove ${p}`}
                          aria-label={`Remove phone ${p}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-500">
                    Staff and kitchen chefs with these numbers can log into this kitchen's display portal using the 6-digit PIN.
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1.5 pb-2 mt-3">
                  <label className="text-gray-600 font-bold">Supported MoMo Network</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMomoProvider('mtn')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        momoProvider === 'mtn' ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-xs' : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      MTN MoMo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMomoProvider('orange')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        momoProvider === 'orange' ? 'bg-[#FF6600] text-white border-[#FF6600] shadow-xs' : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      Orange Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setMomoProvider('both')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        momoProvider === 'both' ? 'bg-gray-900 text-white border-gray-900 shadow-xs' : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      Both Networks
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 pt-1">
                    Customer order payouts and settlements will be deposited directly to your chosen network in USD or LRD.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Delivery Times & Fees (Optional) */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>3. Delivery Settings</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Optional (Defaults Applied)
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                You can keep these defaults or adjust your prep time, delivery fee, and minimum order.
              </p>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Prep Time (mins)</label>
                  <input
                    type="number"
                    value={deliveryTimeMinutes}
                    onChange={(e) => setDeliveryTimeMinutes(Number(e.target.value))}
                    placeholder="25"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#06C167]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Delivery Fee ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={deliveryFeeUsd}
                    onChange={(e) => setDeliveryFeeUsd(Number(e.target.value))}
                    placeholder="2.00"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#06C167]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Min Order ($)</label>
                  <input
                    type="number"
                    value={minOrderUsd}
                    onChange={(e) => setMinOrderUsd(Number(e.target.value))}
                    placeholder="5.00"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#06C167]"
                  />
                </div>
              </div>
            </div>

            {/* Verification Notice */}
            {!isSuperAdminMode && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Verification Notice:</strong> After submitting, your restaurant will be reviewed and approved before going live on the customer app.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-5 bg-gradient-to-r from-[#06C167] via-[#05A357] to-[#048747] text-white text-xs uppercase tracking-wider font-extrabold rounded-2xl shadow-xl shadow-[#06C167]/20 hover:shadow-2xl transition-all flex items-center justify-center gap-2 min-h-[50px] cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving restaurant profile...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSuperAdminMode ? 'Verify & Onboard Kitchen' : 'Submit Restaurant Registration'}</span>
                  </span>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Interactive Monrovia Map Pinpoint Picker Modal */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={locationCoords || MONROVIA_NEIGHBORHOOD_COORDS[neighborhood]}
        initialArea={neighborhood}
        initialAddress={address}
        onConfirmLocation={(data) => {
          setLocationCoords(data.coords);
          if (data.address) setAddress(data.address);
          if (data.area && MONROVIA_NEIGHBORHOODS.includes(data.area)) {
            setNeighborhood(data.area);
          }
          setIsMapPickerOpen(false);
        }}
      />
    </div>
  );
};
