import React, { useState, useRef } from 'react';
import { CartItem, DiningMode, Order, Currency, AppUser, Restaurant } from '../types';
import { command } from '../utils/commandApi';

interface Props {
  isOpen: boolean; onClose: () => void; items: CartItem[]; diningMode: DiningMode; currency: Currency;
  currentUser?: AppUser | null; restaurants?: Restaurant[];
  cartTotals: { subtotal: number; discount: number; serviceFee: number; deliveryFee: number; tax: number; tip: number; total: number; promoCode: string };
  onOrderPlaced: (order: Order) => void;
}
export const CheckoutModal: React.FC<Props> = ({ isOpen, onClose, items, diningMode, currentUser, onOrderPlaced, cartTotals }) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [payment, setPayment] = useState('cod-usd');
  const [quote, setQuote] = useState<any>(null); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [submitted, setSubmitted] = useState(false);
  const pending = useRef<any>(null); const key = useRef(crypto.randomUUID());
  if (!isOpen) return null;
  const change = (setter: (value: string) => void, value: string) => { setter(value); setQuote(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      if (!currentUser) throw new Error('Sign in before checking out.');
      const merchantIds = new Set(items.map(item => item.menuItem.restaurantId));
      if (merchantIds.size !== 1 || !items.length || !items[0].menuItem.restaurantId) throw new Error('Order from one merchant at a time.');
      const input = { orderType: 'food', merchantId: items[0].menuItem.restaurantId,
        items: items.map(line => ({ itemId: line.menuItem.id, quantity: line.quantity,
          addons: line.selectedAddons.map(addon => addon.id), spiceLevel: line.selectedSpiceLevel || 'No Pepper',
          notes: line.specialInstructions || '' })), diningMode, customerName: name.trim(),
        customerPhone: phone.trim(), deliveryAddress: address.trim(), deliveryArea: '', paymentMethod: payment,
        tipMinor: Math.round((cartTotals.tip || 0) * 100) };
      if (!quote) { setQuote((await command('/v1/order-quotes', input)).quote); }
      else {
        setSubmitted(true);
        pending.current ??= { ...input, expectedTotalMinor: quote.amountMinor };
        const result = await command('/v1/orders', pending.current, key.current);
        onOrderPlaced(result.order); setQuote(null); pending.current = null;
        setSubmitted(false); key.current = crypto.randomUUID();
      }
    } catch (failure: any) {
      setError(failure.message || 'Could not confirm. Retry uses the same order key.');
      if (failure.status && failure.status < 500) { setSubmitted(false); pending.current = null; setQuote(null); }
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[180] bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Checkout">
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
      <div className="flex justify-between"><h2 className="font-black text-xl">Checkout</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Close checkout">✕</button></div>
      <fieldset disabled={busy || submitted} className="space-y-3">
        <label className="block">Your name<input required value={name} onChange={event => change(setName, event.target.value)} className="w-full border p-3 rounded-xl" /></label>
        <label className="block">Phone (+231…)<input required type="tel" value={phone} onChange={event => change(setPhone, event.target.value)} className="w-full border p-3 rounded-xl" /></label>
        <label className="block">Address / landmark<input required={diningMode === 'delivery'} value={address} onChange={event => change(setAddress, event.target.value)} className="w-full border p-3 rounded-xl" /></label>
        <label className="block">Payment preference<select value={payment} onChange={event => change(setPayment, event.target.value)} className="w-full border p-3 rounded-xl">
          <option value="cod-usd">Cash USD</option><option value="cod-lrd">Cash LRD</option><option value="momo-mtn">MTN MoMo</option><option value="orange-money">Orange Money</option>
        </select></label>
      </fieldset>
      {quote && <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        {['subtotal', 'deliveryFee', 'tax', 'tip', 'total'].map(field => <div className="flex justify-between" key={field}><span>{field}</span><strong>USD ${Number(quote[field]).toFixed(2)}</strong></div>)}
        <p className="text-sm text-gray-600">Calculated by the merchant service. Payment remains pending.</p>
      </div>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy} className="w-full bg-[#06C167] rounded-xl p-3 text-white font-bold">{busy ? 'Please wait…' : quote ? 'Place order' : 'Review server total'}</button>
      {submitted && <p className="text-sm">If confirmation was interrupted, retry before closing to recover the same order.</p>}
    </form>
  </div>;
};
