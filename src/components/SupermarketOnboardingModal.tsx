import React, { useState } from 'react';
import { 
  X, 
  Store, 
  Check, 
  Plus, 
  MapPin, 
  Phone, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  ShoppingBag, 
  Navigation, 
  Sparkles, 
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Image as ImageIcon
} from 'lucide-react';
import { 
  SupermarketStore, 
  MONROVIA_NEIGHBORHOODS, 
  LocationCoords, 
  MONROVIA_NEIGHBORHOOD_COORDS, 
  USD_TO_LRD_RATE 
} from '../types';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { LocationPickerModal } from './LocationPickerModal';
import { CustomDropdown } from './CustomDropdown';
import { sendBrowserNotification, requestNotificationPermission } from '../utils/browserNotifications';
import { playOrderAlertSound } from '../utils/audioAlert';
import { sanitizeForFirestore } from '../utils/cleanData';

interface SupermarketOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupermarketCreated: (newSupermarket: SupermarketStore) => void;
  onOpenSupermarketPortal?: (supermarketId: string) => void;
  isFullPage?: boolean;
  isSuperAdminMode?: boolean;
}

const DEFAULT_SUPERMARKET_CATEGORIES = [
  'Pantry & Rice',
  'Beverages & Soft Drinks',
  'Dairy & Eggs',
  'Snacks & Biscuits',
  'Bakery & Bread',
  'Canned Goods & Oils',
  'Household & Cleaning',
  'Fresh Produce'
];

export const SupermarketOnboardingModal: React.FC<SupermarketOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSupermarketCreated,
  onOpenSupermarketPortal,
  isFullPage = false,
  isSuperAdminMode = false,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState(MONROVIA_NEIGHBORHOODS[0]);
  const [address, setAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [phone, setPhone] = useState('+231 ');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'orange' | 'both'>('mtn');
  const [managerPin, setManagerPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [deliveryTimeMinutes, setDeliveryTimeMinutes] = useState(30);
  const [tagline, setTagline] = useState('');
  const [accentColor, setAccentColor] = useState('#059669');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Pantry & Rice',
    'Beverages & Soft Drinks',
    'Dairy & Eggs',
    'Snacks & Biscuits'
  ]);
  const [image, setImage] = useState('https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdSupermarket, setCreatedSupermarket] = useState<SupermarketStore | null>(null);

  // Auto-detect Liberian MoMo provider from phone number
  const detectMomoNetwork = (phoneStr: string): 'mtn' | 'orange' | null => {
    const digits = String(phoneStr || '').replace(/[^0-9]/g, '');
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
    if (!momoNumber || momoNumber === phone) {
      setMomoNumber(val);
    }
    const network = detectMomoNetwork(val);
    if (network) {
      setMomoProvider(network);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat)
        ? prev.length > 1 ? prev.filter((c) => c !== cat) : prev
        : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (managerPin && managerPin.replace(/[^0-9]/g, '').length < 4) {
      alert('Please enter at least a 4-digit PIN for store management login.');
      return;
    }

    setIsSubmitting(true);
    const supermarketId = `sm-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}-${Date.now().toString().slice(-4)}`;
    const finalCoords = locationCoords || MONROVIA_NEIGHBORHOOD_COORDS[neighborhood] || { lat: 6.2907, lng: -10.7818 };

    const newStore: SupermarketStore = {
      id: supermarketId,
      name: name.trim(),
      neighborhood,
      address: address.trim() || `${neighborhood}, Monrovia`,
      phone: phone.trim(),
      rating: 5.0,
      reviewCount: 1,
      deliveryTimeMinutes: Number(deliveryTimeMinutes) || 30,
      tagline: tagline.trim() || 'Premier Monrovia supermarket with groceries, pantry goods & essentials.',
      image: image || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
      accentColor,
      categories: selectedCategories,
    };

    // Save to Firestore 'supermarkets' collection
    try {
      if (db) {
        await setDoc(doc(db, 'supermarkets', newStore.id), sanitizeForFirestore(newStore), { merge: true });
      }
    } catch (e) {
      console.warn('Firestore supermarket write notice:', e);
    }

    // Save to LocalStorage cache
    try {
      const saved = localStorage.getItem('aura_monrovia_supermarkets');
      const list: SupermarketStore[] = saved ? JSON.parse(saved) : [];
      localStorage.setItem('aura_monrovia_supermarkets', JSON.stringify([newStore, ...list]));
    } catch {}

    // Dispatch notifications
    requestNotificationPermission().catch(() => {});
    playOrderAlertSound();
    sendBrowserNotification({
      title: 'Supermarket Registered! 🛒',
      body: `"${newStore.name}" is now on Aura Monrovia. Management portal is ready.`,
      tag: `supermarket-${newStore.id}`,
    });

    setIsSubmitting(false);
    setCreatedSupermarket(newStore);
    setIsSuccess(true);
    onSupermarketCreated(newStore);
  };

  const content = (
    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              Register Supermarket & Grocery Store
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Aura Monrovia Retail Merchant Partner Network
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Success View */}
      {isSuccess && createdSupermarket ? (
        <div className="p-8 text-center space-y-4 overflow-y-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="text-xl font-black text-gray-900">
            Supermarket Registered Successfully!
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            Congratulations! <strong>{createdSupermarket.name}</strong> has been listed on the Aura Monrovia supermarket marketplace.
          </p>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-left text-xs space-y-1.5 max-w-md mx-auto">
            <div className="font-extrabold text-[#048747] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Supermarket Management Portal Access</span>
            </div>
            <p className="text-gray-700">
              Store ID: <code className="font-mono font-bold text-gray-900">{createdSupermarket.id}</code>
            </p>
            <p className="text-gray-700">
              Location: <strong>{createdSupermarket.neighborhood}</strong> ({createdSupermarket.address})
            </p>
            <p className="text-gray-700">
              Manager Contact: <strong className="font-mono">{createdSupermarket.phone}</strong>
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            {onOpenSupermarketPortal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupermarketPortal(createdSupermarket.id);
                }}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Open Store Management</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Store Name */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800">Supermarket / Grocery Store Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stop & Shop, ERA Supermarket, Monoprix"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
            />
          </div>

          {/* Neighborhood Selection with Embedded Search */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800">Monrovia Neighborhood / Street *</label>
            <CustomDropdown
              options={MONROVIA_NEIGHBORHOODS}
              value={neighborhood}
              onChange={(val) => setNeighborhood(val)}
              searchPlaceholder="Search 1st-24th St Sinkor, Broad St..."
              buttonClassName="bg-gray-50 border-gray-200"
            />
          </div>

          {/* Exact Street Address & Pinpoint */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800">Street Address & Landmark *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Tubman Blvd between 14th & 15th Street, Sinkor"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
            />

            {/* GPS Pinpoint Button */}
            <button
              type="button"
              onClick={() => setIsMapPickerOpen(true)}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                locationCoords
                  ? 'border-[#06C167] bg-[#E8F8EE] text-[#048747]'
                  : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#06C167]" />
                <span className="font-bold text-xs">
                  {locationCoords ? 'Precise GPS Pinpoint Set' : 'Pin Exact Store Location on Monrovia Map'}
                </span>
              </div>
              <span className="text-[11px] text-[#06C167] font-bold">
                {locationCoords ? `${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)}` : 'Set Pin &rarr;'}
              </span>
            </button>
          </div>

          {/* Phone Number & MoMo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-gray-800">Manager / Store Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+231 77..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-gray-800">MoMo / Orange Payout Number</label>
              <input
                type="text"
                value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value)}
                placeholder="088... / 077..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#06C167] focus:outline-none focus:border-[#06C167]"
              />
            </div>
          </div>

          {/* Security PIN for Management Login */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Store Management Login PIN (4 to 6 Digits) *</span>
              </span>
              <span className="text-[10px] text-gray-400">Used for manager login</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                required
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-6 digit PIN (e.g. 7741)"
                className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-widest text-gray-900 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tagline / Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800">Store Tagline & Specialty</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Fresh imported produce, bulk rice bags & cold beverages"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
            />
          </div>

          {/* Delivery Time & Accent Theme */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-gray-800">Est. Packing Time (Minutes)</label>
              <input
                type="number"
                min={10}
                max={90}
                value={deliveryTimeMinutes}
                onChange={(e) => setDeliveryTimeMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#06C167]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-gray-800">Store Brand Color</label>
              <div className="flex items-center gap-2 pt-1">
                {['#059669', '#2563EB', '#D97706', '#DC2626', '#7C3AED'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setAccentColor(col)}
                    style={{ backgroundColor: col }}
                    className={`w-7 h-7 rounded-xl transition-transform cursor-pointer ${
                      accentColor === col ? 'scale-110 ring-2 ring-offset-2 ring-gray-900' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Department Categories Available */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800">Departments & Categories Offered</label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SUPERMARKET_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1 stroke-[3]" />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Storefront Image URL */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800 flex items-center justify-between">
              <span>Storefront Banner Image URL</span>
              <span className="text-[10px] text-gray-400">High-res image recommended</span>
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#06C167]"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-2xl active:scale-[0.98] transition-all min-h-[48px] cursor-pointer flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering Supermarket...' : 'Complete Supermarket Registration'}</span>
            </button>
          </div>

        </form>
      )}

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        title="Pick Supermarket Location"
        locationType="restaurant"
        confirmButtonText="Confirm Supermarket Location"
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

  if (isFullPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      {content}
    </div>
  );
};
