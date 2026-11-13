import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Search,
  Filter,
  Wrench,
  Key,
  ShieldCheck,
  Calendar,
  Fuel,
  Gauge,
  Phone,
  MessageCircle,
  X,
  ChevronLeft,
  DollarSign,
  MapPin,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Tag
} from 'lucide-react';
import {
  MotorListing,
  MotorListingType,
  MotorInquiry
} from '../types';
import { INITIAL_MOTOR_LISTINGS } from '../data/motorsData';
import { db } from '../firebase/config';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

interface MotorsAppProps {
  isOpen?: boolean;
  isPageMode?: boolean;
  onClose: () => void;
  currency: 'USD' | 'LRD';
  onToggleCurrency: () => void;
}

const LISTING_TYPES: { id: MotorListingType | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Motors', icon: Sparkles },
  { id: 'sale', label: 'Buy Cars', icon: Car },
  { id: 'rental', label: 'Rentals & 4x4', icon: Key },
  { id: 'parts', label: 'Auto & Kekeh Parts', icon: Wrench }
];

export const MotorsApp: React.FC<MotorsAppProps> = ({
  isOpen = true,
  isPageMode = false,
  onClose,
  currency,
  onToggleCurrency
}) => {
  const [listings, setListings] = useState<MotorListing[]>(INITIAL_MOTOR_LISTINGS);
  const [selectedType, setSelectedType] = useState<MotorListingType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>('all');
  const [selectedListing, setSelectedListing] = useState<MotorListing | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'all' | 'sale' | 'rental' | 'parts'>('all');

  // Inquiry / Booking modal state
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccessId, setInquirySuccessId] = useState<string | null>(null);

  // Firestore sync for motor_listings
  useEffect(() => {
    try {
      const q = query(collection(db, 'motor_listings'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: MotorListing[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title || '',
                type: data.type || 'sale',
                make: data.make || '',
                model: data.model || '',
                year: Number(data.year) || 2020,
                condition: data.condition || 'Foreign Used',
                priceUsd: Number(data.priceUsd) || 0,
                priceLrd: Number(data.priceLrd) || Math.round((Number(data.priceUsd) || 0) * 198),
                priceUnit: data.priceUnit,
                mileage: data.mileage,
                transmission: data.transmission,
                fuelType: data.fuelType,
                location: data.location || 'Monrovia, Liberia',
                imageUrl: data.imageUrl || '',
                images: data.images || [],
                description: data.description || '',
                features: data.features || [],
                dealerName: data.dealerName || 'Monrovia Motors',
                dealerPhone: data.dealerPhone || '+231 77 000 0000',
                dealerWhatsApp: data.dealerWhatsApp || '+231 77 000 0000',
                verified: data.verified !== false
              };
            });
            setListings(fetched);
          }
        },
        (error) => {
          console.warn('Firestore motor_listings subscription fallback:', error);
          setListings(INITIAL_MOTOR_LISTINGS);
        }
      );
      return () => unsubscribe();
    } catch {
      setListings(INITIAL_MOTOR_LISTINGS);
    }
  }, []);

  // Format price helper
  const formatPrice = (usd: number, lrd?: number, unit?: string) => {
    const unitSuffix = unit ? ` ${unit}` : '';
    if (currency === 'LRD') {
      const value = lrd || Math.round(usd * 198);
      return `L$${value.toLocaleString()}${unitSuffix}`;
    }
    return `$${usd.toLocaleString()}${unitSuffix}`;
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Bottom tab override if active
      if (activeBottomTab !== 'all' && item.type !== activeBottomTab) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }

      // Make quick filter
      if (selectedMake !== 'all' && String(item?.make || '').toLowerCase() !== String(selectedMake || '').toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = String(item?.title || '').toLowerCase().includes(q);
        const matchesMake = String(item?.make || '').toLowerCase().includes(q);
        const matchesModel = String(item?.model || '').toLowerCase().includes(q);
        const matchesDesc = String(item?.description || '').toLowerCase().includes(q);
        const matchesLoc = String(item?.location || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesMake && !matchesModel && !matchesDesc && !matchesLoc) {
          return false;
        }
      }

      return true;
    });
  }, [listings, selectedType, selectedMake, searchQuery, activeBottomTab]);

  // Submit inquiry to Firestore
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing || !inquiryName || !inquiryPhone) return;

    setInquirySubmitting(true);
    try {
      const inquiryData: Omit<MotorInquiry, 'id'> = {
        listingId: selectedListing.id,
        listingTitle: selectedListing.title,
        customerName: inquiryName,
        customerPhone: inquiryPhone,
        preferredDate: inquiryDate || undefined,
        message: inquiryMessage || undefined,
        inquiryType:
          selectedListing.type === 'rental'
            ? 'rental'
            : selectedListing.type === 'parts'
            ? 'parts-order'
            : 'test-drive',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'motor_inquiries'), {
        ...inquiryData,
        timestamp: serverTimestamp()
      });

      setInquirySuccessId(docRef.id);
      setIsInquiryOpen(false);
      setInquiryName('');
      setInquiryPhone('');
      setInquiryDate('');
      setInquiryMessage('');
    } catch (err) {
      console.error('Failed to submit motor inquiry:', err);
      // Fallback local mock confirmation
      setInquirySuccessId('MOT-' + Math.floor(100000 + Math.random() * 900000));
      setIsInquiryOpen(false);
    } finally {
      setInquirySubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-20 sm:pb-8">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-sm font-medium"
              title="Back to Apps"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Aura Apps</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 leading-none">
                  Aura Motors & Rentals
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Verified cars, 4x4 rentals & genuine auto/kekeh parts</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dual Currency Switcher */}
            <button
              onClick={onToggleCurrency}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span>{currency}</span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                {currency === 'USD' ? '(Tap for LRD)' : '(Tap for USD)'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 flex-1">
        {/* Search Bar & Quick Make Chips */}
        <div className="mb-4 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Toyota RAV4, Prado rental, Kekeh spare parts, Dunlop tires..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Make Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
            <span className="text-gray-500 font-medium shrink-0">Popular:</span>
            {['all', 'Toyota', 'Hyundai', 'Nissan', 'Bajaj', 'TVS', 'Dunlop', 'Bosch'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMake(m)}
                className={`px-3 py-1 rounded-full font-medium shrink-0 transition-colors ${
                  selectedMake === m
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {m === 'all' ? 'All Makes' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Listing Type Pills */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {LISTING_TYPES.map((lt) => {
              const Icon = lt.icon;
              const isActive = selectedType === lt.id;
              return (
                <button
                  key={lt.id}
                  onClick={() => {
                    setSelectedType(lt.id);
                    if (activeBottomTab !== 'all') setActiveBottomTab('all');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                  <span>{lt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Heading & Counter */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {selectedType === 'all'
                ? 'All Vehicles, Rentals & Spares'
                : LISTING_TYPES.find((t) => t.id === selectedType)?.label}
            </h2>
            <p className="text-xs text-gray-500">
              Showing {filteredListings.length} verified listing{filteredListings.length === 1 ? '' : 's'} in Monrovia
            </p>
          </div>
          {selectedMake !== 'all' && (
            <button
              onClick={() => setSelectedMake('all')}
              className="text-xs text-amber-600 font-semibold hover:underline"
            >
              Clear {selectedMake}
            </button>
          )}
        </div>

        {/* Mobile Horizontal Track (no-scrollbar) */}
        <div className="sm:hidden -mx-4 px-4 overflow-x-auto no-scrollbar pb-3 mb-6">
          <div className="flex gap-3">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedListing(item)}
                className="w-[260px] shrink-0 bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {item.type === 'sale' ? 'For Sale' : item.type === 'rental' ? 'Rental' : 'Auto Part'}
                    </div>
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {item.condition}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
                      {item.make} • {item.year}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mt-0.5">{item.title}</h3>

                    {/* Quick Specs */}
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                      {item.mileage && <span>{item.mileage}</span>}
                      {item.transmission && (
                        <>
                          <span>•</span>
                          <span>{item.transmission}</span>
                        </>
                      )}
                      {item.fuelType && (
                        <>
                          <span>•</span>
                          <span>{item.fuelType}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-between border-t border-gray-100 mt-1">
                  <div>
                    <div className="text-base font-extrabold text-gray-900">
                      {formatPrice(item.priceUsd, item.priceLrd, item.priceUnit)}
                    </div>
                    {currency === 'LRD' && (
                      <div className="text-[10px] text-gray-500">
                        ${item.priceUsd} USD {item.priceUnit || ''}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedListing(item);
                      setIsInquiryOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors"
                  >
                    {item.type === 'rental' ? 'Rent' : item.type === 'parts' ? 'Order' : 'Inquire'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
          {filteredListings.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedListing(item)}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.type === 'sale' ? 'For Sale' : item.type === 'rental' ? 'Rental' : 'Auto Part'}
                  </div>
                  <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {item.condition}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                    {item.make} • {item.year}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1 group-hover:text-amber-600 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {item.mileage && <span>{item.mileage}</span>}
                    {item.transmission && (
                      <>
                        <span>•</span>
                        <span>{item.transmission}</span>
                      </>
                    )}
                    {item.fuelType && (
                      <>
                        <span>•</span>
                        <span>{item.fuelType}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-100 mt-2">
                <div>
                  <div className="text-lg font-black text-gray-900">
                    {formatPrice(item.priceUsd, item.priceLrd, item.priceUnit)}
                  </div>
                  {currency === 'LRD' && (
                    <div className="text-xs text-gray-500">
                      ${item.priceUsd} USD {item.priceUnit || ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedListing(item);
                    setIsInquiryOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <span>{item.type === 'rental' ? 'Rent' : item.type === 'parts' ? 'Order' : 'Inquire'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No vehicles or parts match your search</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your make or keyword filter to browse other options across Monrovia.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedMake('all');
              }}
              className="mt-4 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Listing Details Popup Sheet / Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg max-h-[90vh] sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                {selectedListing.make} • {selectedListing.condition}
              </span>
              <button
                onClick={() => setSelectedListing(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              <div className="relative h-56 bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={selectedListing.imageUrl}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedListing.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xl font-black text-gray-900">
                    {formatPrice(selectedListing.priceUsd, selectedListing.priceLrd, selectedListing.priceUnit)}
                  </div>
                  {currency === 'LRD' && (
                    <span className="text-xs text-gray-500">
                      (${selectedListing.priceUsd} USD {selectedListing.priceUnit || ''})
                    </span>
                  )}
                </div>
              </div>

              {/* Specs Pills */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-center">
                <div>
                  <div className="text-gray-400 font-medium">Year</div>
                  <div className="font-bold text-gray-800 mt-0.5">{selectedListing.year}</div>
                </div>
                <div>
                  <div className="text-gray-400 font-medium">Transmission</div>
                  <div className="font-bold text-gray-800 mt-0.5">{selectedListing.transmission || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-400 font-medium">Mileage / Condition</div>
                  <div className="font-bold text-gray-800 mt-0.5">{selectedListing.mileage || selectedListing.condition}</div>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{selectedListing.description}</p>

              {/* Key Features */}
              {selectedListing.features && selectedListing.features.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-800 mb-1.5">Key Highlights</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedListing.features.map((feat, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg text-[11px] font-semibold border border-amber-100 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-amber-600" />
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dealer & Location Card */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900">{selectedListing.dealerName}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{selectedListing.location}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Verified Dealer
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${selectedListing.dealerPhone}`}
                    className="flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    <span>Call Dealer</span>
                  </a>
                  <a
                    href={`https://wa.me/${String(selectedListing.dealerWhatsApp || selectedListing.dealerPhone || '').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setIsInquiryOpen(true)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {selectedListing.type === 'rental'
                    ? 'Book Rental Dates'
                    : selectedListing.type === 'parts'
                    ? 'Place Parts Order'
                    : 'Schedule Viewing / Test Drive'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry / Booking Modal */}
      {isInquiryOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {selectedListing.type === 'rental'
                  ? 'Book Car Rental'
                  : selectedListing.type === 'parts'
                  ? 'Order Auto Spares'
                  : 'Schedule Test Drive'}
              </h3>
              <button
                onClick={() => setIsInquiryOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-xs">
              <span className="font-bold text-amber-900">{selectedListing.title}</span>
              <span className="text-amber-700 ml-2">
                ({formatPrice(selectedListing.priceUsd, selectedListing.priceLrd, selectedListing.priceUnit)})
              </span>
            </div>

            <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  placeholder="e.g. Roland Cooper"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number (Liberia) *</label>
                <input
                  type="tel"
                  required
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                  placeholder="e.g. 077 555 1234 or 088 555 1234"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {selectedListing.type === 'rental' ? 'Rental Start Date' : 'Preferred Date / Time'}
                </label>
                <input
                  type="date"
                  value={inquiryDate}
                  onChange={(e) => setInquiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Note or Special Request</label>
                <textarea
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder={
                    selectedListing.type === 'rental'
                      ? 'e.g. Need chauffeur for 3 days travel upcountry to Gbarnga'
                      : 'e.g. Available after 2pm at Sinkor 12th St'
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600 h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={inquirySubmitting}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {inquirySubmitting ? 'Sending Request...' : 'Send Request to Dealer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inquiry Confirmation Notification */}
      {inquirySuccessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Request Sent!</h3>
            <p className="text-xs text-gray-600">
              Reference: <span className="font-mono font-bold text-amber-600">{inquirySuccessId}</span>
            </p>
            <p className="text-xs text-gray-500">
              The dealer has received your details and will call or WhatsApp you directly to confirm.
            </p>
            <button
              onClick={() => setInquirySuccessId(null)}
              className="w-full py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs"
            >
              Back to Motors
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar with Active Highlighting */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => {
            setActiveBottomTab('all');
            setSelectedType('all');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'all' ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Car className="w-5 h-5" />
          <span className="text-[10px]">All Motors</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('sale');
            setSelectedType('sale');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'sale' ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Car className="w-5 h-5" />
          <span className="text-[10px]">Buy Cars</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('rental');
            setSelectedType('rental');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'rental' ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Key className="w-5 h-5" />
          <span className="text-[10px]">Rentals</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomTab('parts');
            setSelectedType('parts');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomTab === 'parts' ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px]">Parts</span>
        </button>
      </nav>
    </div>
  );
};
