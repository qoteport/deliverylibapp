import React, { useState, useMemo } from 'react';
import { 
  Store, 
  ShoppingBag, 
  DollarSign, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Phone, 
  MapPin, 
  Power, 
  Trash2, 
  Edit2, 
  Search, 
  ArrowLeft, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon,
  Tag,
  Package,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';
import { 
  SupermarketStore, 
  SupermarketItem, 
  Order, 
  Currency, 
  USD_TO_LRD_RATE, 
  MONROVIA_NEIGHBORHOODS,
  LocationCoords,
  MONROVIA_NEIGHBORHOOD_COORDS
} from '../types';
import { SUPERMARKET_ITEMS } from '../data/supermarketData';
import { CustomDropdown } from './CustomDropdown';
import { CustomSelect } from './common/CustomSelect';
import { LocationPickerModal } from './LocationPickerModal';
import { sanitizeForFirestore } from '../utils/cleanData';
import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface SupermarketPortalProps {
  supermarket: SupermarketStore;
  orders: Order[];
  onExitPortal: () => void;
  currency: Currency;
  onToggleCurrency: () => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
}

export const SupermarketPortal: React.FC<SupermarketPortalProps> = ({
  supermarket,
  orders,
  onExitPortal,
  currency,
  onToggleCurrency,
  onUpdateOrderStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'settings'>('inventory');
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { logout } = useAuth();

  // Load store items from state/localStorage or fallback to preset catalog
  const [items, setItems] = useState<SupermarketItem[]>(() => {
    try {
      const saved = localStorage.getItem(`aura_sm_items_${supermarket.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed with items matching this supermarket ID or generic items
    const storePreset = SUPERMARKET_ITEMS.filter((i) => i.supermarketId === supermarket.id);
    if (storePreset.length > 0) return storePreset;
    return SUPERMARKET_ITEMS.slice(0, 12).map((i) => ({
      ...i,
      id: `${i.id}-${supermarket.id}`,
      supermarketId: supermarket.id,
      supermarketName: supermarket.name,
    }));
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Add / Edit Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupermarketItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Pantry & Rice');
  const [itemUnit, setItemUnit] = useState('1 Unit');
  const [itemPrice, setItemPrice] = useState('5.00');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemInStock, setItemInStock] = useState(true);

  // Store Settings State
  const [storeAddress, setStoreAddress] = useState(supermarket.address);
  const [storeNeighborhood, setStoreNeighborhood] = useState(supermarket.neighborhood);
  const [storePhone, setStorePhone] = useState(supermarket.phone);
  const [storeTagline, setStoreTagline] = useState(supermarket.tagline);
  const [storeDeliveryTime, setStoreDeliveryTime] = useState(supermarket.deliveryTimeMinutes);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [storeCoords, setStoreCoords] = useState<LocationCoords>(
    MONROVIA_NEIGHBORHOOD_COORDS[supermarket.neighborhood] || { lat: 6.2907, lng: -10.7818 }
  );

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((c) => (c === msg ? null : c)), 2200);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return ['All', ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  // Orders matching this store
  const storeOrders = useMemo(() => {
    return orders.filter(
      (o) => o.restaurantId === supermarket.id || o.restaurantName === supermarket.name
    );
  }, [orders, supermarket]);

  const activeOrders = storeOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');

  const formatPrice = (usd: number) => {
    if (currency === 'LRD') {
      const lrd = Math.round(usd * USD_TO_LRD_RATE);
      return `L$${lrd.toLocaleString()}`;
    }
    return `$${usd.toFixed(2)}`;
  };

  // Toggle in-stock status
  const handleToggleStock = (itemId: string) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, inStock: !item.inStock } : item
      );
      try {
        localStorage.setItem(`aura_sm_items_${supermarket.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Inventory stock status updated');
  };

  // Open item modal for add/edit
  const handleOpenItemModal = (item?: SupermarketItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemUnit(item.unitWeight);
      setItemPrice(item.priceUsd.toString());
      setItemDesc(item.description);
      setItemImage(item.image);
      setItemInStock(item.inStock);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemCategory(categories[1] || 'Pantry & Rice');
      setItemUnit('1 Unit');
      setItemPrice('5.00');
      setItemDesc('');
      setItemImage('https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80');
      setItemInStock(true);
    }
    setIsItemModalOpen(true);
  };

  // Save or update grocery product
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const priceNum = parseFloat(itemPrice) || 3.0;

    if (editingItem) {
      const updated: SupermarketItem = {
        ...editingItem,
        name: itemName.trim(),
        category: itemCategory,
        unitWeight: itemUnit.trim() || '1 Unit',
        priceUsd: priceNum,
        description: itemDesc.trim() || `${itemName} sold fresh at ${supermarket.name}`,
        image: itemImage.trim() || editingItem.image,
        inStock: itemInStock,
      };

      setItems((prev) => {
        const next = prev.map((i) => (i.id === updated.id ? updated : i));
        try {
          localStorage.setItem(`aura_sm_items_${supermarket.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast(`Updated "${updated.name}"`);
    } else {
      const newItem: SupermarketItem = {
        id: `smi-${Date.now().toString().slice(-6)}`,
        supermarketId: supermarket.id,
        supermarketName: supermarket.name,
        name: itemName.trim(),
        category: itemCategory,
        unitWeight: itemUnit.trim() || '1 Unit',
        priceUsd: priceNum,
        description: itemDesc.trim() || `${itemName} available at ${supermarket.name}`,
        image: itemImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
        inStock: itemInStock,
      };

      setItems((prev) => {
        const next = [newItem, ...prev];
        try {
          localStorage.setItem(`aura_sm_items_${supermarket.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast(`Added "${newItem.name}" to inventory`);
    }

    setIsItemModalOpen(false);
  };

  // Delete product
  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      try {
        localStorage.setItem(`aura_sm_items_${supermarket.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Item deleted from catalog');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col text-gray-900 font-sans pb-16">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="w-4 h-4 text-[#06C167] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onExitPortal}
            className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            title="Return to Supermarket Customer Store"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Store className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-gray-900 truncate">
                {supermarket.name}
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                Supermarket Portal
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#06C167]" />
              <span>{supermarket.neighborhood}</span>
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Store Open / Closed Toggle */}
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              showToast(isOpen ? 'Store is now marked CLOSED' : 'Store is now marked OPEN');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isOpen
                ? 'bg-[#E8F8EE] text-[#048747] border border-[#A7F3D0]'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOpen ? 'Store Open' : 'Store Closed'}</span>
          </button>

          {/* Currency Toggle */}
          <button
            onClick={onToggleCurrency}
            className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {currency}
          </button>

          {/* Sign Out to Portal Hub */}
          <button
            onClick={() => {
              logout();
              navigateTo({ name: 'portal' });
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold text-gray-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Sign Out to Portal Hub"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-6 flex-1 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventory & Catalog ({items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 relative ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Live Orders</span>
              {activeOrders.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Store Settings</span>
            </button>
          </div>

          {activeTab === 'inventory' && (
            <button
              onClick={() => handleOpenItemModal()}
              className="px-4 py-2 bg-gradient-to-r from-[#06C167] to-[#048747] text-white text-xs font-extrabold rounded-2xl shadow-md shadow-[#06C167]/20 hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Grocery Item</span>
            </button>
          )}
        </div>

        {/* TAB 1: INVENTORY & CATALOG */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search grocery catalog, brand or category..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs text-gray-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-gray-200/80 p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    {/* Item Thumbnail */}
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-gray-100 mb-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          !item.inStock ? 'grayscale opacity-60' : ''
                        }`}
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-black/70 backdrop-blur-xs text-white">
                          {item.category}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          item.inStock
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {item.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Item Details */}
                    <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Pack: {item.unitWeight}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>

                  {/* Price and Stock Controls */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-gray-900">
                        {formatPrice(item.priceUsd)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleStock(item.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          item.inStock
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.inStock ? 'Active' : 'Enable'}
                      </button>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenItemModal(item)}
                        className="flex-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE GROCERY ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>Supermarket Order Fulfillment</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {activeOrders.length} active
              </span>
            </h2>

            {storeOrders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 space-y-2">
                <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="text-sm font-bold text-gray-800">No Grocery Orders Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  When Monrovia customers purchase items from {supermarket.name}, orders will appear here in real time for fulfillment and courier handover.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {storeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-gray-900">#{ord.id}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-700">
                          {ord.status}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-black text-gray-900">
                        {formatPrice(ord.total)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      Customer: <strong>{ord.customerName}</strong> ({ord.customerPhone}) &bull;{' '}
                      Destination: <strong>{ord.deliveryArea}</strong>
                    </div>

                    {/* Order Items */}
                    <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1">
                      {ord.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-gray-700">
                          <span>{item.quantity}x {item.menuItem.name}</span>
                          <span className="font-mono">{formatPrice(item.itemTotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status Advance Actions */}
                    {onUpdateOrderStatus && (
                      <div className="flex items-center gap-2 pt-1">
                        {ord.status === 'received' && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, 'preparing')}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                          >
                            Accept & Start Packing
                          </button>
                        )}
                        {ord.status === 'preparing' && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, 'plating')}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition"
                          >
                            Packed & Ready for Courier
                          </button>
                        )}
                        {ord.status === 'plating' && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, 'en-route')}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
                          >
                            Hand to Courier Rider
                          </button>
                        )}
                        {ord.status === 'en-route' && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, 'completed')}
                            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 max-w-xl">
            <h2 className="text-base font-black text-gray-900">
              Supermarket Profile & Operating Settings
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Neighborhood / Zone</label>
              <CustomDropdown
                options={MONROVIA_NEIGHBORHOODS}
                value={storeNeighborhood}
                onChange={(val) => setStoreNeighborhood(val)}
                searchPlaceholder="Search 1st-24th St Sinkor..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Street Address</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Manager Contact Phone</label>
              <input
                type="tel"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Tagline / Mission</label>
              <input
                type="text"
                value={storeTagline}
                onChange={(e) => setStoreTagline(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
              />
            </div>

            <button
              type="button"
              onClick={() => showToast('Supermarket profile settings saved')}
              className="py-3 px-5 bg-blue-600 text-white text-xs font-black uppercase rounded-2xl shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Save Store Settings
            </button>
          </div>
        )}

      </main>

      {/* Add / Edit Product Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900">
                {editingItem ? 'Edit Grocery Product' : 'Add New Grocery Product'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Akani Jasmine Rice (25kg Bag)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Department / Category</label>
                  <CustomSelect
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </CustomSelect>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Unit Weight / Size</label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    placeholder="e.g. 25kg, 500g, 1L"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Price (USD $)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900"
                />
                <span className="text-[10px] text-gray-400">
                  Approx. L${Math.round((parseFloat(itemPrice) || 0) * USD_TO_LRD_RATE).toLocaleString()} Liberian Dollars
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Short details, brand origin..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="instock-check"
                  checked={itemInStock}
                  onChange={(e) => setItemInStock(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="instock-check" className="font-bold text-gray-700 cursor-pointer">
                  Available in Stock for Instant Checkout
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase text-xs rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer mt-2"
              >
                {editingItem ? 'Save Changes' : 'Add to Catalog'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
