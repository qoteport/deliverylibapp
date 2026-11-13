import React, { useState, useEffect } from 'react';
import {
  Car,
  ChevronLeft,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Trash2,
  Key,
  Wrench,
  Check,
  X,
  ShieldCheck,
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
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

interface MotorsPortalProps {
  onExitPortal: () => void;
  currency: 'USD' | 'LRD';
  onToggleCurrency: () => void;
}

export const MotorsPortal: React.FC<MotorsPortalProps> = ({
  onExitPortal,
  currency,
  onToggleCurrency
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'inquiries'>('inventory');
  const [listings, setListings] = useState<MotorListing[]>(INITIAL_MOTOR_LISTINGS);
  const [inquiries, setInquiries] = useState<MotorInquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MotorListingType | 'all'>('all');

  // Add Listing Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<MotorListingType>('sale');
  const [newMake, setNewMake] = useState('Toyota');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2021');
  const [newCondition, setNewCondition] = useState('Foreign Used');
  const [newPriceUsd, setNewPriceUsd] = useState('');
  const [newPriceUnit, setNewPriceUnit] = useState('');
  const [newMileage, setNewMileage] = useState('');
  const [newTransmission, setNewTransmission] = useState<'Automatic' | 'Manual'>('Automatic');
  const [newFuelType, setNewFuelType] = useState('Petrol');
  const [newLocation, setNewLocation] = useState('Sinkor, Tubman Blvd');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDealerPhone, setNewDealerPhone] = useState('+231 77 123 4567');
  const [isSaving, setIsSaving] = useState(false);

  // Firestore sync for motor_listings
  useEffect(() => {
    try {
      const q = query(collection(db, 'motor_listings'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const fetched: MotorListing[] = snap.docs.map((d) => ({
              ...(d.data() as any),
              id: d.id
            }));
            setListings(fetched);
          }
        },
        () => setListings(INITIAL_MOTOR_LISTINGS)
      );
      return () => unsub();
    } catch {
      setListings(INITIAL_MOTOR_LISTINGS);
    }
  }, []);

  // Firestore sync for motor_inquiries
  useEffect(() => {
    try {
      const q = query(collection(db, 'motor_inquiries'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const list: MotorInquiry[] = snap.docs.map((d) => ({
            ...(d.data() as any),
            id: d.id
          }));
          setInquiries(list);
        } else {
          setInquiries([
            {
              id: 'inq-motor-1',
              listingId: 'motor-3',
              listingTitle: 'Toyota Land Cruiser Prado 4x4 (Chauffeur & Self-Drive)',
              customerName: 'Marcus Dennis (UNDP Mission)',
              customerPhone: '+231 77 999 1122',
              preferredDate: 'Next Monday (4 days rental)',
              message: 'Require 4x4 with driver for official travel to Buchanan and Gbarnga.',
              inquiryType: 'rental',
              status: 'pending',
              createdAt: new Date().toISOString()
            },
            {
              id: 'inq-motor-2',
              listingId: 'motor-5',
              listingTitle: 'Dunlop Grandtrek All-Terrain Tires (Set of 4)',
              customerName: 'Kekeh & Fleet Transport Ltd',
              customerPhone: '+231 88 444 3322',
              preferredDate: 'Today afternoon',
              message: 'Confirming if fitting service is available at your Sinkor yard.',
              inquiryType: 'parts-order',
              status: 'confirmed',
              createdAt: new Date(Date.now() - 43200000).toISOString()
            }
          ]);
        }
      });
      return () => unsub();
    } catch {
      // offline fallback
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

  // Delete listing
  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to remove this vehicle/parts listing?')) return;
    setListings((prev) => prev.filter((item) => item.id !== listingId));
    try {
      await deleteDoc(doc(db, 'motor_listings', listingId));
    } catch (e) {
      console.warn('Firestore delete fallback:', e);
    }
  };

  // Update inquiry status
  const handleUpdateInquiryStatus = async (
    inqId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  ) => {
    setInquiries((prev) =>
      prev.map((i) => (i.id === inqId ? { ...i, status } : i))
    );
    try {
      await updateDoc(doc(db, 'motor_inquiries', inqId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore inquiry update notice:', e);
    }
  };

  // Save new listing
  const handleAddListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPriceUsd) return;

    setIsSaving(true);
    const usd = Number(newPriceUsd) || 0;
    const lrd = Math.round(usd * 198);

    const listingData: Omit<MotorListing, 'id'> = {
      title: newTitle,
      type: newType,
      make: newMake,
      model: newModel || newTitle,
      year: Number(newYear) || 2021,
      condition: newCondition as any,
      priceUsd: usd,
      priceLrd: lrd,
      priceUnit: newType === 'rental' ? (newPriceUnit || '/day') : undefined,
      mileage: newMileage || undefined,
      transmission: newTransmission,
      fuelType: newFuelType,
      location: newLocation,
      imageUrl:
        newImageUrl ||
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      description: newDescription || `${newTitle} available at Monrovia Motors.`,
      features: ['Air Conditioning', 'Clean Title', 'Monrovia Inspected'],
      dealerName: 'Monrovia Premier Motors & Spares',
      dealerPhone: newDealerPhone,
      dealerWhatsApp: newDealerPhone,
      verified: true
    };

    try {
      const docRef = await addDoc(collection(db, 'motor_listings'), {
        ...listingData,
        createdAt: serverTimestamp()
      });
      setListings((prev) => [{ ...listingData, id: docRef.id }, ...prev]);
    } catch (err) {
      setListings((prev) => [
        { ...listingData, id: 'motor-local-' + Date.now() },
        ...prev
      ]);
    } finally {
      setIsSaving(false);
      setIsAddOpen(false);
      setNewTitle('');
      setNewPriceUsd('');
      setNewModel('');
      setNewMileage('');
      setNewDescription('');
    }
  };

  const filteredListings = listings.filter((l) => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.make.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingInquiriesCount = inquiries.filter((i) => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitPortal}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-sm font-medium"
              title="Return to Management Center"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Management Hub</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 leading-none">
                  Aura Motors & Rentals Portal
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Vehicle sales, rental fleet & auto/kekeh spare parts</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency Toggle */}
            <button
              onClick={onToggleCurrency}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span>{currency}</span>
            </button>

            {/* Add Listing Button */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle / Parts</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-5">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Vehicles & Parts ({listings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'inquiries'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Bookings & Orders ({inquiries.length})</span>
            {pendingInquiriesCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingInquiriesCount} new
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: INVENTORY & FLEET */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by make, model, parts..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'All Inventory' },
                  { id: 'sale', label: 'Car Sales' },
                  { id: 'rental', label: 'Rentals' },
                  { id: 'parts', label: 'Auto & Kekeh Parts' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setFilterType(type.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors shrink-0 ${
                      filterType === type.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-gray-100 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {item.type}
                      </div>
                      <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {item.condition}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                        {item.make} • {item.year}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">{item.title}</h3>
                      <div className="text-base font-black text-gray-900 mt-2">
                        {formatPrice(item.priceUsd, item.priceLrd, item.priceUnit)}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        {item.mileage && <span>{item.mileage}</span>}
                        {item.transmission && <span>• {item.transmission}</span>}
                        {item.fuelType && <span>• {item.fuelType}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">{item.location}</span>
                    <button
                      onClick={() => handleDeleteListing(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: INQUIRIES & BOOKINGS */}
        {activeTab === 'inquiries' && (
          <div className="space-y-3">
            {inquiries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-900">No requests yet</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Customer test-drives, rental bookings and parts orders will appear here in realtime.
                </p>
              </div>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{inq.customerName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          inq.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inq.status === 'completed'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inq.status}
                      </span>
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        {inq.inquiryType === 'rental'
                          ? 'Car Rental'
                          : inq.inquiryType === 'parts-order'
                          ? 'Parts Order'
                          : 'Test Drive'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-amber-700">{inq.listingTitle}</div>

                    {inq.preferredDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Date / Schedule: {inq.preferredDate}</span>
                      </div>
                    )}

                    {inq.message && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        &ldquo;{inq.message}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${inq.customerPhone}`}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${inq.customerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {inq.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateInquiryStatus(inq.id, 'confirmed')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                        >
                          Confirm Booking
                        </button>
                      )}
                      {inq.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateInquiryStatus(inq.id, 'completed')}
                          className="px-3 py-1 bg-gray-800 hover:bg-black text-white rounded-lg font-bold"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Add Vehicle / Parts Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">List Vehicle or Auto/Kekeh Parts</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddListingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Listing Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 2022 Toyota RAV4 AWD or TVS Kekeh Piston Kit"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                  >
                    <option value="sale">Buy Cars (Sales)</option>
                    <option value="rental">Car Rental (Chauffeur/Self-Drive)</option>
                    <option value="parts">Auto & Kekeh Parts</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Make / Brand</label>
                  <input
                    type="text"
                    required
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    placeholder="e.g. Toyota, Hyundai, TVS, Dunlop"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Price in USD ($) *</label>
                  <input
                    type="number"
                    required
                    value={newPriceUsd}
                    onChange={(e) => setNewPriceUsd(e.target.value)}
                    placeholder="e.g. 18500 or 150"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-600"
                  >
                    <option value="Foreign Used">Foreign Used</option>
                    <option value="Monrovia Used">Monrovia Used</option>
                    <option value="Brand New">Brand New</option>
                    <option value="OEM Part">OEM Part</option>
                  </select>
                </div>
              </div>

              {newType !== 'parts' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Transmission</label>
                    <select
                      value={newTransmission}
                      onChange={(e) => setNewTransmission(e.target.value as any)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Mileage</label>
                    <input
                      type="text"
                      value={newMileage}
                      onChange={(e) => setNewMileage(e.target.value)}
                      placeholder="e.g. 38,000 mi"
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Location / Dealership Yard</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Sinkor 18th St Tubman Blvd"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Photo URL (Optional)</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description & Specs</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Engine details, AC condition, customs clearance status..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
