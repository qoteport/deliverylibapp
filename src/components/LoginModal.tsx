import React, { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean; onClose: () => void; initialMode?: 'login' | 'register';
  restaurants: unknown[]; drivers?: unknown[]; supermarkets?: unknown[];
  onOpenRestaurantPortal: (restaurantId: string) => void;
  onOpenDriverPortal?: (driverId?: string) => void; onOpenAdminPortal?: () => void;
  onOpenRestaurantOnboarding?: () => void; onOpenDriverJoin?: () => void;
  onOpenSupermarketPortal?: (supermarketId: string) => void; onOpenSupermarketOnboarding?: () => void;
}
export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { setUserDirectly } = useAuth();
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) { verifier.current?.clear(); verifier.current = null; setConfirmation(null); setCode(''); setError(''); }
    return () => { verifier.current?.clear(); verifier.current = null; };
  }, [isOpen]);
  if (!isOpen) return null;
  const finish = () => { setUserDirectly({} as any); onClose(); };
  const failure = (value: unknown) => {
    const code = (value as { code?: string })?.code;
    const messages: Record<string, string> = {
      'auth/unauthorized-domain': 'This domain needs authorization in Firebase Authentication.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
      'auth/popup-closed-by-user': 'Google sign-in was closed. Try again when ready.',
      'auth/invalid-verification-code': 'The SMS code is incorrect.',
      'auth/code-expired': 'The code expired. Request a new code.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    };
    setError(code && messages[code] || 'Sign-in could not be completed. Please try again.');
  };
  const google = async () => {
    if (busy) return; setBusy(true); setError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); finish(); }
    catch (value) { failure(value); } finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      if (confirmation) {
        if (!/^\d{6}$/.test(code.trim())) { setError('Enter the six-digit SMS code.'); return; }
        await confirmation.confirm(code.trim()); finish();
      } else {
        if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) { setError('Enter a phone number with its country code, such as +231…'); return; }
        if (!container.current) throw new Error('Verification control unavailable');
        verifier.current?.clear();
        verifier.current = new RecaptchaVerifier(auth, container.current, { size: 'normal' });
        setConfirmation(await signInWithPhoneNumber(auth, phone.trim(), verifier.current));
      }
    } catch (value) { failure(value); verifier.current?.clear(); verifier.current = null; }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[500] bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sign in to Aura">
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center"><h2 className="font-bold text-xl">Sign in to Aura</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close">✕</button></div>
      <button type="button" disabled={busy} onClick={google} className="w-full border rounded-xl p-3 font-semibold">Continue with Google</button>
      <button type="button" disabled={busy || !!confirmation} onClick={() => setPhoneMode(!phoneMode)} className="w-full p-2">Continue with phone</button>
      {phoneMode && <>
        <label className="block">Phone number<input required type="tel" autoComplete="tel" placeholder="+231…" disabled={busy || !!confirmation} value={phone} onChange={e => setPhone(e.target.value)} className="border rounded-xl p-3 w-full" /></label>
        {confirmation && <label className="block">SMS verification code<input required autoComplete="one-time-code" inputMode="numeric" value={code} disabled={busy} onChange={e => setCode(e.target.value)} className="border rounded-xl p-3 w-full" /></label>}
        <p className="text-sm text-gray-600">Firebase sends an SMS to verify your number. Message rates may apply. Google uses phone numbers for abuse prevention.</p>
        <button disabled={busy} className="w-full rounded-xl bg-[#06C167] text-white font-bold p-3">{busy ? 'Please wait…' : confirmation ? 'Verify code' : 'Send SMS code'}</button>
        {confirmation && <button type="button" disabled={busy} onClick={() => { setConfirmation(null); setCode(''); }} className="w-full p-2">Use a different number</button>}
      </>}
      <p className="text-xs text-gray-600 leading-relaxed">Read our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms &amp; Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.</p>
      <div ref={container} />
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </form>
  </div>;
};
