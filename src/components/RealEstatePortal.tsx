import React, { useState, useEffect } from 'react';
import {
  Building2,
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
  Eye,
  Check,
  X,
  ShieldCheck,
  Home,
  Tag
} from 'lucide-react';
import {
  RealEstateProperty,
  PropertyDealType,
  PropertyType,
  PropertyInquiry
} from '../types';
import { INITIAL_PROPERTIES } from '../data/realEstateData';
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

interface RealEstatePortalProps {
  onExitPortal: () => void;
  currency: 'USD' | 'LRD';
  onToggleCurrency: () => void;
}

export const RealEstatePortal: React.FC<RealEstatePortalProps> = ({
  onExitPortal,
  currency,
  onToggleCurrency
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries'>('listings');
  const [properties, setProperties] = useState<RealEstateProperty[]>(INITIAL_PROPERTIES);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeal, setFilterDeal] = useState<PropertyDealType | 'all'>('all');

  // Add Property Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDealType, setNewDealType] = useState<PropertyDealType>('rent');
  const [newPropType, setNewPropType] = useState<PropertyType>('apartment');
  const [newPriceUsd, setNewPriceUsd] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('Sinkor');
  const [newAddress, setNewAddress] = useState('');
  const [newBedrooms, setNewBedrooms] = useState('2');
  const [newBathrooms, setNewBathrooms] = useState('2');
  const [newDeedStatus, setNewDeedStatus] = useState('Verified Mother Deed');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('+231 77 123 4567');
  const [isSaving, setIsSaving] = useState(false);

  // Firestore sync for properties
  useEffect(() => {
    try {
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const fetched: RealEstateProperty[] = snap.docs.map((d) => ({
              ...(d.data() as any),
              id: d.id
            }));
            setProperties(fetched);
          }
        },
        () => setProperties(INITIAL_PROPERTIES)
      );
      return () => unsub();
    } catch {
      setProperties(INITIAL_PROPERTIES);
    }
  }, []);

  // Firestore sync for property_inquiries
  useEffect(() => {
    try {
      const q = query(collection(db, 'property_inquiries'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const list: PropertyInquiry[] = snap.docs.map((d) => ({
            ...(d.data() as any),
            id: d.id
          }));
          setInquiries(list);
        } else {
          setInquiries([
            {
              id: 'inq-demo-1',
              propertyId: 'prop-1',
              propertyTitle: 'Mamba Point Ocean-View 3-Bedroom Luxury Apartment',
              customerName: 'Ambassador Samuel Kollie',
              customerPhone: '+231 77 555 4321',
              preferredDate: 'Tomorrow at 11:00 AM',
              message: 'Looking to inspect for an embassy staff member relocating to Monrovia next week.',
              status: 'pending',
              createdAt: new Date().toISOString()
            },
            {
              id: 'inq-demo-2',
              propertyId: 'prop-4',
              propertyTitle: 'Paynesville Rehab — 2 Titled Town Lots',
              customerName: 'Marie Barclay',
              customerPhone: '+231 88 123 9876',
              preferredDate: 'Saturday morning',
              message: 'Need to review probate court mother deed verification before cash deposit.',
              status: 'confirmed',
              createdAt: new Date(Date.now() - 86400000).toISOString()
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
  const formatPrice = (usd: number, lrd?: number) => {
    if (currency === 'LRD') {
      const value = lrd || Math.round(usd * 198);
      return `L$${value.toLocaleString()}`;
    }
    return `$${usd.toLocaleString()}`;
  };

  // Toggle Property status (available -> rented/sold)
  const handleToggleStatus = async (prop: RealEstateProperty) => {
    const nextStatus =
      prop.status === 'available'
        ? prop.dealType === 'sale'
          ? 'sold'
          : 'rented'
        : 'available';

    setProperties((prev) =>
      prev.map((p) => (p.id === prop.id ? { ...p, status: nextStatus } : p))
    );

    try {
      await updateDoc(doc(db, 'properties', prop.id), {
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore update fallback:', e);
    }
  };

  // Delete property
  const handleDeleteProperty = async (propId: string) => {
    if (!window.confirm('Are you sure you want to remove this property listing?')) return;
    setProperties((prev) => prev.filter((p) => p.id !== propId));
    try {
      await deleteDoc(doc(db, 'properties', propId));
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
      await updateDoc(doc(db, 'property_inquiries', inqId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore inquiry update notice:', e);
    }
  };

  // Save new property
  const handleAddPropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPriceUsd) return;

    setIsSaving(true);
    const usd = Number(newPriceUsd) || 0;
    const lrd = Math.round(usd * 198);

    const propData: Omit<RealEstateProperty, 'id'> = {
      title: newTitle,
      dealType: newDealType,
      propertyType: newPropType,
      priceUsd: usd,
      priceLrd: lrd,
      pricePeriod: newDealType === 'rent' ? '/month' : newDealType === 'short-stay' ? '/night' : undefined,
      neighborhood: newNeighborhood,
      address: newAddress || `${newNeighborhood}, Monrovia, Liberia`,
      bedrooms: Number(newBedrooms) || undefined,
      bathrooms: Number(newBathrooms) || undefined,
      deedStatus: newDeedStatus,
      imageUrl:
        newImageUrl ||
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      description: newDescription || `${newTitle} located in ${newNeighborhood}, Monrovia.`,
      features: ['24/7 Security', 'Running Water', 'Backup Generator Available'],
      agentName: 'Aura Premier Properties',
      agentPhone: newAgentPhone,
      agentWhatsApp: newAgentPhone,
      status: 'available',
      verified: true
    };

    try {
      const docRef = await addDoc(collection(db, 'properties'), {
        ...propData,
        createdAt: serverTimestamp()
      });
      setProperties((prev) => [{ ...propData, id: docRef.id }, ...prev]);
    } catch (err) {
      setProperties((prev) => [
        { ...propData, id: 'prop-local-' + Date.now() },
        ...prev
      ]);
    } finally {
      setIsSaving(false);
      setIsAddOpen(false);
      setNewTitle('');
      setNewPriceUsd('');
      setNewAddress('');
      setNewDescription('');
    }
  };

  const filteredProperties = properties.filter((p) => {
    if (filterDeal !== 'all' && p.dealType !== filterDeal) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.propertyType.toLowerCase().includes(q)
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 leading-none">
                  Aura Real Estate Portal
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Property listings, lease contracts & viewing appointments</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency Toggle */}
            <button
              onClick={onToggleCurrency}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-sky-600" />
              <span>{currency}</span>
            </button>

            {/* Add Property Button */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Property</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-5">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'listings'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Properties Inventory ({properties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'inquiries'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Customer Viewing Requests ({inquiries.length})</span>
            {pendingInquiriesCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingInquiriesCount} new
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: PROPERTIES INVENTORY */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title, Sinkor, Paynesville..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'All Listings' },
                  { id: 'rent', label: 'Rentals' },
                  { id: 'sale', label: 'For Sale' },
                  { id: 'short-stay', label: 'Short Stay' }
                ].map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => setFilterDeal(deal.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors shrink-0 ${
                      filterDeal === deal.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {deal.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-gray-100 overflow-hidden">
                      <img
                        src={prop.imageUrl}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {prop.dealType}
                      </div>
                      <div
                        className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          prop.status === 'available'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-800 text-white'
                        }`}
                      >
                        {prop.status}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
                        {prop.neighborhood} • {prop.propertyType}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">{prop.title}</h3>
                      <div className="text-base font-black text-gray-900 mt-2">
                        {formatPrice(prop.priceUsd, prop.priceLrd)}{' '}
                        <span className="text-xs font-normal text-gray-500">{prop.pricePeriod}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        {prop.bedrooms && <span>{prop.bedrooms} Beds</span>}
                        {prop.bathrooms && <span>• {prop.bathrooms} Baths</span>}
                        {prop.deedStatus && (
                          <span className="text-emerald-700 font-medium">• {prop.deedStatus}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleStatus(prop)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                        prop.status === 'available'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {prop.status === 'available' ? 'Mark Rented / Sold' : 'Mark Available'}
                    </button>

                    <button
                      onClick={() => handleDeleteProperty(prop.id)}
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

        {/* TAB 2: INQUIRIES & VIEWING APPOINTMENTS */}
        {activeTab === 'inquiries' && (
          <div className="space-y-3">
            {inquiries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-900">No viewing requests yet</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Customer inspection appointments from the app will appear here in realtime.
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
                    </div>

                    <div className="text-xs font-semibold text-sky-700">{inq.propertyTitle}</div>

                    {inq.preferredDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Requested Time: {inq.preferredDate}</span>
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
                          Confirm Viewing
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

      {/* Add Property Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">List New Monrovia Property</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPropertySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Property Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 15th Street Sinkor Modern 2-Bedroom Apartment"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Deal Type</label>
                  <select
                    value={newDealType}
                    onChange={(e) => setNewDealType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-600"
                  >
                    <option value="rent">For Rent</option>
                    <option value="sale">For Sale</option>
                    <option value="short-stay">Short Stay (Airbnb)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Property Type</label>
                  <select
                    value={newPropType}
                    onChange={(e) => setNewPropType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-600"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House / Villa</option>
                    <option value="land">Titled Land / Lots</option>
                    <option value="commercial">Commercial Storefront</option>
                  </select>
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
                    placeholder="e.g. 600"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Neighborhood</label>
                  <select
                    value={newNeighborhood}
                    onChange={(e) => setNewNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-600"
                  >
                    <option value="Sinkor">Sinkor</option>
                    <option value="Mamba Point">Mamba Point</option>
                    <option value="Oldest Congo Town">Oldest Congo Town</option>
                    <option value="Paynesville">Paynesville</option>
                    <option value="ELWA">ELWA</option>
                    <option value="Central Monrovia">Central Monrovia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Bedrooms / Baths</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newBedrooms}
                      onChange={(e) => setNewBedrooms(e.target.value)}
                      placeholder="Beds"
                      className="w-1/2 px-2 py-2 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="number"
                      value={newBathrooms}
                      onChange={(e) => setNewBathrooms(e.target.value)}
                      placeholder="Baths"
                      className="w-1/2 px-2 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Deed / Verification</label>
                  <input
                    type="text"
                    value={newDeedStatus}
                    onChange={(e) => setNewDeedStatus(e.target.value)}
                    placeholder="e.g. Mother Deed Verified"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Property highlights, generator schedule, security..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
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
