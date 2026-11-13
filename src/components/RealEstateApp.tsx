import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Home, 
  Building2, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize2, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  X, 
  SlidersHorizontal, 
  Sparkles, 
  Heart, 
  Check, 
  Share2, 
  DollarSign, 
  ExternalLink,
  Zap,
  Droplets,
  Layers
} from 'lucide-react';
import { 
  RealEstateProperty, 
  PropertyDealType, 
  PropertyType, 
  PropertyInquiry, 
  Currency, 
  USD_TO_LRD_RATE 
} from '../types';
import { INITIAL_PROPERTIES } from '../data/realEstateData';
import { CustomSelect } from './common/CustomSelect';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

interface RealEstateAppProps {
  isOpen?: boolean;
  isPageMode?: boolean;
  onClose: () => void;
  currency: Currency;
  onToggleCurrency?: () => void;
}

const MONROVIA_NEIGHBORHOOD_FILTERS = [
  'All Monrovia',
  'Mamba Point',
  'Sinkor',
  'Oldest Congo Town',
  'Paynesville',
  'Central Monrovia',
  'ELWA / Paynesville'
];

export const RealEstateApp: React.FC<RealEstateAppProps> = ({
  isOpen = true,
  isPageMode = true,
  onClose,
  currency,
  onToggleCurrency,
}) => {
  const [properties, setProperties] = useState<RealEstateProperty[]>(INITIAL_PROPERTIES);
  const [selectedDealType, setSelectedDealType] = useState<string>('all');
  const [selectedPropType, setSelectedPropType] = useState<string>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All Monrovia');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState<RealEstateProperty | null>(null);
  
  // Viewing Schedule / Inquiry Form State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [viewingDate, setViewingDate] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Saved Favorites State
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aura_saved_properties');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Mobile Bottom Navigation Tab
  const [activeNavTab, setActiveNavTab] = useState<'all' | 'rent' | 'buy' | 'saved'>('all');

  const listingsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Realtime Firestore listener for properties
  useEffect(() => {
    if (!db) return;
    try {
      const unsub = onSnapshot(collection(db, 'properties'), (snapshot) => {
        if (!snapshot.empty) {
          const list: RealEstateProperty[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as RealEstateProperty);
          });
          setProperties(list);
        }
      }, (err) => {
        console.warn('Properties snapshot notice:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Properties listener init error:', e);
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aura_saved_properties', JSON.stringify(savedPropertyIds));
    } catch {}
  }, [savedPropertyIds]);

  const toggleSaveProperty = (propId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedPropertyIds((prev) => {
      const exists = prev.includes(propId);
      const next = exists ? prev.filter((id) => id !== propId) : [...prev, propId];
      showToast(exists ? 'Removed from saved properties' : 'Saved to your properties list');
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3000);
  };

  const formatPrice = (usd: number, period?: string) => {
    const periodLabel = period === 'day' ? '/day' : period === 'month' ? '/mo' : period === 'year' ? '/yr' : '';
    if (currency === 'LRD') {
      const lrd = Math.round(usd * USD_TO_LRD_RATE);
      return `L$${lrd.toLocaleString()}${periodLabel}`;
    }
    return `$${usd.toLocaleString()}${periodLabel}`;
  };

  // Submit Schedule / Inquiry to Firestore
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyDetails || !clientName.trim() || !clientPhone.trim()) return;

    setIsSubmittingInquiry(true);
    const newInquiry: PropertyInquiry = {
      id: `inq-${Date.now()}`,
      propertyId: selectedPropertyDetails.id,
      propertyTitle: selectedPropertyDetails.title,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      inquiryType: 'viewing',
      preferredDate: viewingDate || undefined,
      notes: inquiryNotes.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      if (db) {
        await addDoc(collection(db, 'property_inquiries'), newInquiry);
      }
    } catch (err) {
      console.warn('Inquiry write notice:', err);
    }

    setIsSubmittingInquiry(false);
    setIsScheduleOpen(false);
    setClientName('');
    setClientPhone('');
    setViewingDate('');
    setInquiryNotes('');
    showToast(`Viewing request submitted for ${selectedPropertyDetails.title}! Agent will call ${clientPhone}.`);
  };

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      if (activeNavTab === 'saved') {
        if (!savedPropertyIds.includes(prop.id)) return false;
      } else if (activeNavTab === 'rent') {
        if (prop.dealType !== 'rent' && prop.dealType !== 'short_stay') return false;
      } else if (activeNavTab === 'buy') {
        if (prop.dealType !== 'buy') return false;
      }

      if (selectedDealType !== 'all' && prop.dealType !== selectedDealType) return false;
      if (selectedPropType !== 'all' && prop.propertyType !== selectedPropType) return false;
      if (selectedNeighborhood !== 'All Monrovia' && !prop.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase())) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          prop.title.toLowerCase().includes(q) ||
          prop.neighborhood.toLowerCase().includes(q) ||
          prop.address.toLowerCase().includes(q) ||
          prop.description.toLowerCase().includes(q) ||
          prop.features.some((f) => f.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceUsd - b.priceUsd;
      if (sortBy === 'price-desc') return b.priceUsd - a.priceUsd;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [properties, selectedDealType, selectedPropType, selectedNeighborhood, searchQuery, sortBy, activeNavTab, savedPropertyIds]);

  if (!isOpen && !isPageMode) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#06C167]/20 selection:text-[#06C167]">
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 border border-white/10 max-w-sm text-center">
          <CheckCircle2 className="w-4 h-4 text-[#06C167] shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-gray-900 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
            title="Back to Apps"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Aura Apps</span>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-xs sm:text-base text-gray-900 tracking-tight truncate">
                  AURA Real Estate
                </h1>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 shrink-0">
                  Rent &amp; Buy
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                Verified Monrovia Homes, Apartments &amp; Land
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onToggleCurrency && (
            <button
              type="button"
              onClick={onToggleCurrency}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
              title="Switch Currency USD / LRD"
            >
              <span className={currency === 'USD' ? 'text-sky-600 font-black' : 'text-gray-400'}>USD</span>
              <span className="text-gray-300">/</span>
              <span className={currency === 'LRD' ? 'text-sky-600 font-black' : 'text-gray-400'}>LRD</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveNavTab('saved');
              listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-2 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer relative"
            title="Saved Properties"
          >
            <Heart className={`w-4 h-4 ${savedPropertyIds.length > 0 ? 'fill-rose-500 text-rose-500' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">Saved ({savedPropertyIds.length})</span>
          </button>
        </div>
      </header>

      {/* Main Page Content - Flat Container without outer raised card */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 pb-28 sm:pb-12 flex flex-col space-y-6">
        
        {/* Page Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200/80">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              Monrovia Properties &amp; Rentals
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Browse apartments for rent, houses for purchase, and prime titled land across Liberia
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              100% Verified Deeds &amp; Agents
            </span>
          </div>
        </div>

        {/* 1. Search Bar & Sort Grid */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Mamba Point, 3-bedroom, furnished, generator, land..."
                className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200/90 rounded-2xl text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48">
              <CustomSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-2xl py-3 font-bold"
                icon={<SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />}
              >
                <option value="featured">Featured First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </CustomSelect>
            </div>
          </div>

          {/* Quick Neighborhood Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            <span className="text-gray-400 font-bold shrink-0 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-sky-600" />
              <span>Location:</span>
            </span>
            {MONROVIA_NEIGHBORHOOD_FILTERS.map((nh) => (
              <button
                key={nh}
                type="button"
                onClick={() => setSelectedNeighborhood(nh)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  selectedNeighborhood === nh
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {nh}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Deal Type & Property Type Filter Pills */}
        <div className="space-y-2">
          {/* Deal Mode: Rent / Buy / Short Stay */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Deals' },
              { id: 'rent', label: '🔑 For Rent (Monthly)' },
              { id: 'buy', label: '🏡 For Sale (Purchase)' },
              { id: 'short_stay', label: '🏖️ Short Stay / Airbnb' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDealType(d.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                  selectedDealType === d.id
                    ? 'bg-gray-900 text-white shadow-sm ring-2 ring-gray-900/20'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Property Category: Apartment / House / Land / Commercial */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'apartment', label: 'Apartments' },
              { id: 'house', label: 'Houses & Villas' },
              { id: 'land', label: 'Land & Plots' },
              { id: 'commercial', label: 'Commercial & Storefronts' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPropType(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedPropType === p.id
                    ? 'bg-sky-50 text-sky-800 border border-sky-300 font-black'
                    : 'bg-white/80 border border-gray-200/80 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Property Listings Grid */}
        <div ref={listingsRef} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-gray-900">
              {filteredProperties.length} Properties Available
            </span>
            <span className="text-xs text-gray-400 font-medium">Dual Currency USD &amp; LRD</span>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-gray-200 shadow-xs">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
              <div className="text-sm font-bold text-gray-800">No properties match your filter</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try selecting a different neighborhood, resetting search keywords, or switching deal types.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDealType('all');
                  setSelectedPropType('all');
                  setSelectedNeighborhood('All Monrovia');
                  setSearchQuery('');
                  setActiveNavTab('all');
                }}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map((prop) => {
                const isSaved = savedPropertyIds.includes(prop.id);
                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedPropertyDetails(prop)}
                    className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden hover:shadow-lg hover:border-sky-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Image Preview with Badges */}
                      <div className="relative aspect-16/10 bg-gray-100 overflow-hidden">
                        <img
                          src={prop.images[0]}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                            prop.dealType === 'buy' ? 'bg-amber-600' : prop.dealType === 'short_stay' ? 'bg-purple-600' : 'bg-sky-600'
                          }`}>
                            {prop.dealType === 'buy' ? 'For Sale' : prop.dealType === 'short_stay' ? 'Short Stay' : 'For Rent'}
                          </span>
                          {prop.isVerified && (
                            <span className="px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Save Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleSaveProperty(prop.id, e)}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-700 hover:text-rose-500 shadow-sm cursor-pointer transition active:scale-90"
                          title="Save Property"
                        >
                          <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>

                        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-xl text-white font-mono font-black text-xs">
                          {formatPrice(prop.priceUsd, prop.pricePeriod)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-sky-700">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prop.neighborhood}</span>
                        </div>

                        <h3 className="font-extrabold text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
                          {prop.title}
                        </h3>

                        {/* Specs Pill Bar */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold pt-1 border-t border-gray-100">
                          {prop.bedrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5 text-gray-400" />
                              <span>{prop.bedrooms} Beds</span>
                            </div>
                          )}
                          {prop.bathrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bath className="w-3.5 h-3.5 text-gray-400" />
                              <span>{prop.bathrooms} Baths</span>
                            </div>
                          )}
                          {prop.sizeSqm && (
                            <div className="flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                              <span>{prop.sizeSqm}m²</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-gray-500 truncate">
                        Agent: <span className="font-bold text-gray-800">{prop.agentName}</span>
                      </div>
                      <span className="text-sky-600 font-extrabold hover:underline">
                        View Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* =================================================================== */}
      {/* PROPERTY DETAILS POPUP SHEET / MODAL                                */}
      {/* =================================================================== */}
      {selectedPropertyDetails && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setSelectedPropertyDetails(null)}
        >
          <div 
            className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => toggleSaveProperty(selectedPropertyDetails.id, e)}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-gray-700 hover:text-rose-500 flex items-center justify-center shadow-md transition cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${savedPropertyIds.includes(selectedPropertyDetails.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPropertyDetails(null)}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-gray-600 hover:text-black flex items-center justify-center shadow-md transition cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Image Preview */}
              <div className="relative aspect-16/10 bg-gray-100 overflow-hidden">
                <img
                  src={selectedPropertyDetails.images[0]}
                  alt={selectedPropertyDetails.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider text-white ${
                    selectedPropertyDetails.dealType === 'buy' ? 'bg-amber-600' : selectedPropertyDetails.dealType === 'short_stay' ? 'bg-purple-600' : 'bg-sky-600'
                  }`}>
                    {selectedPropertyDetails.dealType === 'buy' ? 'For Sale' : selectedPropertyDetails.dealType === 'short_stay' ? 'Short Stay' : 'For Rent'}
                  </span>
                  <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-xl text-white text-xs font-bold">
                    {selectedPropertyDetails.propertyType.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Details Body */}
              <div className="p-5 sm:p-6 space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-700">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedPropertyDetails.address}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
                    {selectedPropertyDetails.title}
                  </h2>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black font-mono text-gray-900">
                      {formatPrice(selectedPropertyDetails.priceUsd, selectedPropertyDetails.pricePeriod)}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {currency === 'USD' 
                        ? `≈ L$${Math.round(selectedPropertyDetails.priceUsd * USD_TO_LRD_RATE).toLocaleString()}${selectedPropertyDetails.pricePeriod ? `/${selectedPropertyDetails.pricePeriod}` : ''}`
                        : `$${selectedPropertyDetails.priceUsd.toLocaleString()} USD`}
                    </span>
                  </div>
                </div>

                {/* Specs Bar */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Bedrooms</div>
                    <div className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                      <Bed className="w-4 h-4 text-sky-600" />
                      <span>{selectedPropertyDetails.bedrooms || 'Studio'}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Bathrooms</div>
                    <div className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                      <Bath className="w-4 h-4 text-sky-600" />
                      <span>{selectedPropertyDetails.bathrooms || '1'}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Floor Area</div>
                    <div className="text-sm font-black text-gray-900 flex items-center justify-center gap-1">
                      <Maximize2 className="w-4 h-4 text-sky-600" />
                      <span>{selectedPropertyDetails.sizeSqm ? `${selectedPropertyDetails.sizeSqm}m²` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Key Features */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Property Features &amp; Utilities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedPropertyDetails.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-100 rounded-xl text-emerald-950 font-semibold">
                        <Check className="w-3.5 h-3.5 text-[#06C167] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Detailed Overview
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                    {selectedPropertyDetails.description}
                  </p>
                </div>

                {/* Verified Agent Card */}
                <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {selectedPropertyDetails.agentName[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-900 flex items-center gap-1">
                        <span>{selectedPropertyDetails.agentName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      </div>
                      <div className="text-[11px] text-gray-500">Authorized Monrovia Agent</div>
                    </div>
                  </div>

                  <a 
                    href={`tel:${selectedPropertyDetails.agentPhone}`}
                    className="px-3 py-1.5 bg-white border border-sky-200 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:brightness-105 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule a Viewing</span>
              </button>

              {selectedPropertyDetails.agentWhatsapp && (
                <a
                  href={`https://wa.me/${selectedPropertyDetails.agentWhatsapp.replace(/\+/g, '')}?text=${encodeURIComponent(`Hello, I saw your property "${selectedPropertyDetails.title}" on Aura Real Estate. Is it still available?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SCHEDULE VIEWING FORM MODAL                                         */}
      {/* =================================================================== */}
      {isScheduleOpen && selectedPropertyDetails && (
        <div 
          className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsScheduleOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Schedule In-Person Viewing</h3>
                  <p className="text-[10px] text-gray-400">Agent will meet you on site</p>
                </div>
              </div>
              <button 
                onClick={() => setIsScheduleOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInquiry} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Samuel Doe"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Phone Number (MTN / Orange) *</label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="0886... or 077..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Preferred Date / Time</label>
                <input
                  type="datetime-local"
                  value={viewingDate}
                  onChange={(e) => setViewingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Special Notes / Questions</label>
                <textarea
                  rows={2}
                  value={inquiryNotes}
                  onChange={(e) => setInquiryNotes(e.target.value)}
                  placeholder="e.g. Interested in lease terms, generator backup, water supply..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmittingInquiry}
                  className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:brightness-105 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  {isSubmittingInquiry ? 'Sending...' : 'Confirm Viewing Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar with Active Highlighting */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-2xl safe-area-pb">
        <div className="grid grid-cols-4 py-1.5 px-2 text-center">
          <button
            type="button"
            onClick={() => {
              setActiveNavTab('all');
              setSelectedDealType('all');
              listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer relative ${
              activeNavTab === 'all' ? 'text-sky-600 font-black' : 'text-gray-400 font-semibold'
            }`}
          >
            {activeNavTab === 'all' && (
              <span className="absolute -top-1.5 w-8 h-1 bg-sky-600 rounded-full" />
            )}
            <Building2 className={`w-4 h-4 ${activeNavTab === 'all' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">All</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNavTab('rent');
              setSelectedDealType('rent');
              listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer relative ${
              activeNavTab === 'rent' ? 'text-sky-600 font-black' : 'text-gray-400 font-semibold'
            }`}
          >
            {activeNavTab === 'rent' && (
              <span className="absolute -top-1.5 w-8 h-1 bg-sky-600 rounded-full" />
            )}
            <Home className={`w-4 h-4 ${activeNavTab === 'rent' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Rent</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNavTab('buy');
              setSelectedDealType('buy');
              listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer relative ${
              activeNavTab === 'buy' ? 'text-sky-600 font-black' : 'text-gray-400 font-semibold'
            }`}
          >
            {activeNavTab === 'buy' && (
              <span className="absolute -top-1.5 w-8 h-1 bg-sky-600 rounded-full" />
            )}
            <DollarSign className={`w-4 h-4 ${activeNavTab === 'buy' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Buy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNavTab('saved');
              listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`py-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition cursor-pointer relative ${
              activeNavTab === 'saved' ? 'text-sky-600 font-black' : 'text-gray-400 font-semibold'
            }`}
          >
            {activeNavTab === 'saved' && (
              <span className="absolute -top-1.5 w-8 h-1 bg-sky-600 rounded-full" />
            )}
            <div className="relative">
              <Heart className={`w-4 h-4 ${activeNavTab === 'saved' ? 'fill-sky-600 stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {savedPropertyIds.length > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center ring-1 ring-white">
                  {savedPropertyIds.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Saved</span>
          </button>
        </div>
      </div>
    </div>
  );
};
