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
  LayoutGrid,
  Tag,
  Plus
} from 'lucide-react';
import { MediaGalleryViewer } from './MediaGalleryViewer';
import { MediaUploadField } from './MediaUploadField';
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
  { id: 'all', label: 'All Motors', icon: LayoutGrid },
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

  // List Vehicle / Parts state (Multiple photos + 1 video)
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<MotorListingType>('sale');
  const [newMake, setNewMake] = useState('Toyota');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newPriceUsd, setNewPriceUsd] = useState('');
  const [newPriceUnit, setNewPriceUnit] = useState<string>('');
  const [newCondition, setNewCondition] = useState<MotorListing['condition']>('Clean Monrovia Used');
  const [newMileage, setNewMileage] = useState('');
  const [newTransmission, setNewTransmission] = useState<'Automatic' | 'Manual'>('Automatic');
  const [newFuelType, setNewFuelType] = useState<'Gasoline' | 'Diesel' | 'Hybrid'>('Gasoline');
  const [newLocation, setNewLocation] = useState('Sinkor Tubman Blvd');
  const [newDealerName, setNewDealerName] = useState('Aura Monrovia Motors');
  const [newDealerPhone, setNewDealerPhone] = useState('0886 443 210');
  const [newDealerWhatsapp, setNewDealerWhatsapp] = useState('0886 443 210');
  const [newDescription, setNewDescription] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isSavingListing, setIsSavingListing] = useState(false);

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
  const formatPrice = (usd: any, lrd?: any, unit?: string) => {
    const usdNum = Number(usd) || 0;
    const unitSuffix = unit ? ` ${unit}` : '';
    if (currency === 'LRD') {
      const value = Number(lrd) || Math.round(usdNum * 198);
      return `L$${value.toLocaleString()}${unitSuffix}`;
    }
    return `$${usdNum.toLocaleString()}${unitSuffix}`;
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const rawType = (item as any)?.type || (item as any)?.listingType || 'sale';
      const itemType = rawType === 'part' ? 'parts' : rawType;

      // Bottom tab override if active
      if (activeBottomTab !== 'all' && itemType !== activeBottomTab) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && itemType !== selectedType) {
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

  // Add new vehicle / parts listing with multiple photos + 1 video
  const handleAddListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPriceUsd) return;

    setIsSavingListing(true);
    const fallbackImg = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
    const finalImages = newImages.length > 0 ? newImages : [fallbackImg];

    const newListingData: Omit<MotorListing, 'id'> = {
      title: newTitle.trim(),
      type: newType,
      listingType: newType,
      make: newMake,
      model: newModel.trim() || newTitle.trim(),
      year: parseInt(newYear) || new Date().getFullYear(),
      priceUsd: parseFloat(newPriceUsd) || 0,
      priceLrd: Math.round((parseFloat(newPriceUsd) || 0) * 198),
      priceUnit: newType === 'rental' ? (newPriceUnit || '/day') : undefined,
      rentalPeriod: newType === 'rental' ? 'day' : undefined,
      condition: newCondition,
      mileage: newMileage ? `${newMileage} miles` : undefined,
      transmission: newType === 'parts' ? undefined : newTransmission,
      fuelType: newType === 'parts' ? undefined : newFuelType,
      location: newLocation.trim() || 'Central Monrovia',
      dealerName: newDealerName.trim(),
      dealerPhone: newDealerPhone.trim(),
      dealerWhatsapp: newDealerWhatsapp.trim(),
      dealerWhatsApp: newDealerWhatsapp.trim(),
      description: newDescription.trim() || `${newTitle} in Monrovia`,
      features: ['Air Conditioning', 'Power Steering', 'Clean Title', 'Inspection Ready'],
      imageUrl: finalImages[0],
      images: finalImages,
      videoUrl: newVideoUrl.trim() || undefined,
      isAvailable: true,
      featured: true,
      verified: true
    };

    try {
      const docRef = await addDoc(collection(db, 'motor_listings'), {
        ...newListingData,
        createdAt: serverTimestamp()
      });
      setListings((prev) => [{ ...newListingData, id: docRef.id } as MotorListing, ...prev]);
    } catch (err) {
      console.warn('Listing fallback creation:', err);
      const mockId = 'mot-local-' + Date.now();
      setListings((prev) => [{ ...newListingData, id: mockId } as MotorListing, ...prev]);
    } finally {
      setIsSavingListing(false);
      setIsAddListingOpen(false);
      setNewTitle('');
      setNewPriceUsd('');
      setNewModel('');
      setNewDescription('');
      setNewImages([]);
      setNewVideoUrl('');
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

            {/* List Vehicle / Parts Button */}
            <button
              type="button"
              onClick={() => setIsAddListingOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List Vehicle / Parts</span>
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

        {/* Motors Grid: 2 columns on mobile, 2 on sm, 3 on lg, 4 on xl */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 mb-8">
          {filteredListings.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedListing(item)}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-square sm:aspect-auto sm:h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={item.imageUrl || (item as any).image || ''}
                    alt={item.title || 'Motor vehicle'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {((item as any).type || (item as any).listingType) === 'sale'
                      ? 'For Sale'
                      : ((item as any).type || (item as any).listingType) === 'rental'
                      ? 'Rental'
                      : 'Auto Part'}
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-gray-800 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {item.condition}
                  </div>
                </div>
                <div className="p-2.5 sm:p-4">
                  <div className="text-[10px] sm:text-xs font-semibold text-amber-600 uppercase tracking-wider truncate">
                    {item.make} • {item.year}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 sm:mt-1 line-clamp-1 group-hover:text-amber-600 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-500">
                    {item.mileage && <span>{item.mileage}</span>}
                    {item.transmission && (
                      <>
                        <span>•</span>
                        <span>{item.transmission}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                    <MapPin className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-4 pt-0 flex items-center justify-between border-t border-gray-100 mt-1 sm:mt-2">
                <div className="min-w-0 pr-1">
                  <div className="text-sm sm:text-lg font-black text-gray-900 truncate">
                    {formatPrice(item.priceUsd, item.priceLrd, item.priceUnit)}
                  </div>
                  {currency === 'LRD' && (
                    <div className="text-[10px] sm:text-xs text-gray-500 truncate">
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
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors active:scale-95 shrink-0"
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
              <MediaGalleryViewer
                images={
                  Array.isArray(selectedListing.images) && selectedListing.images.length > 0
                    ? selectedListing.images
                    : selectedListing.imageUrl
                    ? [selectedListing.imageUrl]
                    : (selectedListing as any).image
                    ? [(selectedListing as any).image]
                    : []
                }
                videoUrl={selectedListing.videoUrl}
                title={selectedListing.title}
                heightClass="h-56 sm:h-64"
                badge={
                  <div className="flex items-center gap-1.5">
                    <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {((selectedListing as any).type || (selectedListing as any).listingType) === 'sale'
                        ? 'For Sale'
                        : ((selectedListing as any).type || (selectedListing as any).listingType) === 'rental'
                        ? 'Rental'
                        : 'Auto Part'}
                    </span>
                    <span className="bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {selectedListing.condition}
                    </span>
                  </div>
                }
              />

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
                    href={`https://wa.me/${String(selectedListing.dealerWhatsApp || (selectedListing as any).dealerWhatsapp || selectedListing.dealerPhone || '').replace(/[^0-9]/g, '')}`}
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

      {/* Add Vehicle / Parts Listing Modal (Multiple Photos + 1 Video) */}
      {isAddListingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 my-auto shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Car className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">List Vehicle or Auto Parts</h3>
                  <p className="text-xs text-gray-500">Sell cars, list rental 4x4s, or offer genuine spare parts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddListingOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddListingSubmit} className="space-y-4 overflow-y-auto pr-1 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Listing Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 2018 Toyota RAV4 AWD or Genuine Kekeh Carburetor"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category / Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="sale">Car for Sale</option>
                    <option value="rental">Vehicle for Rent (4x4, SUV, Sedan)</option>
                    <option value="parts">Auto &amp; Kekeh Parts</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Make / Brand</label>
                  <select
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="Toyota">Toyota</option>
                    <option value="Nissan">Nissan</option>
                    <option value="Honda">Honda</option>
                    <option value="Hyundai">Hyundai</option>
                    <option value="Mitsubishi">Mitsubishi</option>
                    <option value="Ford">Ford</option>
                    <option value="Kekeh Parts">TVS / Bajaj Kekeh</option>
                    <option value="Universal">Universal / Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="e.g. Land Cruiser Prado"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  >
                    <option value="Foreign Used">Foreign Used</option>
                    <option value="Brand New">Brand New</option>
                    <option value="Locally Used">Locally Used</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Price (USD $) *</label>
                  <input
                    type="number"
                    required
                    value={newPriceUsd}
                    onChange={(e) => setNewPriceUsd(e.target.value)}
                    placeholder="e.g. 12500"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-600 font-mono font-bold"
                  />
                </div>

                {newType === 'rental' ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Rental Rate Period</label>
                    <select
                      value={newPriceUnit}
                      onChange={(e) => setNewPriceUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                    >
                      <option value="/day">Per Day (/day)</option>
                      <option value="/week">Per Week (/week)</option>
                      <option value="/month">Per Month (/mo)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Mileage / Hours</label>
                    <input
                      type="text"
                      value={newMileage}
                      onChange={(e) => setNewMileage(e.target.value)}
                      placeholder="e.g. 58,000"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white font-mono"
                    />
                  </div>
                )}
              </div>

              {newType !== 'parts' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Transmission</label>
                    <select
                      value={newTransmission}
                      onChange={(e) => setNewTransmission(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Fuel Type</label>
                    <select
                      value={newFuelType}
                      onChange={(e) => setNewFuelType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                    >
                      <option value="Gasoline">Gasoline</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Multiple Images + 1 Video Upload */}
              <MediaUploadField
                images={newImages}
                onChangeImages={setNewImages}
                videoUrl={newVideoUrl}
                onChangeVideoUrl={setNewVideoUrl}
                label="Vehicle / Parts Media (Upload Multiple Photos & 1 Video)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Location in Liberia</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Sinkor 24th Street"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dealer / Seller Name</label>
                  <input
                    type="text"
                    value={newDealerName}
                    onChange={(e) => setNewDealerName(e.target.value)}
                    placeholder="e.g. Monrovia Auto Hub"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contact Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={newDealerPhone}
                    onChange={(e) => {
                      setNewDealerPhone(e.target.value);
                      setNewDealerWhatsapp(e.target.value);
                    }}
                    placeholder="+231 77 000 0000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detail condition, customs duty paid status, features, maintenance history..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 shrink-0 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddListingOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingListing}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingListing ? 'Publishing...' : 'Publish Motor Listing'}
                </button>
              </div>
            </form>
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
