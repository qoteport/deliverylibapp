import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { AppUser } from '../types';
import { command } from '../utils/commandApi';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string, restaurantId?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPhone: (phone: string, name?: string, location?: string, address?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUserDirectly: (user: AppUser | null) => void;
}
const AuthContext = createContext<AuthContextType>({ user: null,
  login: async () => ({ success: false }), loginWithPhone: async () => ({ success: false }),
  logout: () => {}, setUserDirectly: () => {} });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const load = async (verified: User | null) => {
    if (!verified) { setUser(null); return; }
    // A verified provider session may be a customer while the order service is offline.
    // Privileged roles are populated only from protected backend membership.
    setUser({ uid: verified.uid, email: verified.email || '', name: verified.displayName || '',
      phone: verified.phoneNumber || '', address: '', role: 'customer' });
    try {
      const profile = await command('/v1/me');
      if (auth.currentUser?.uid !== verified.uid) return;
      const membership = profile.membership;
      const role: AppUser['role'] = membership?.active === true ?
        ({ merchant: 'restaurant_owner', manager: 'restaurant_owner', supermarket_owner: 'supermarket_owner',
          driver: 'driver', admin: 'admin', super_admin: 'super_admin' } as Record<string, AppUser['role']>)[membership.role] || 'customer' : 'customer';
      setUser({ uid: verified.uid, email: verified.email || '', name: profile.name || verified.displayName || '',
        phone: profile.phone || '', address: profile.address || '', role,
        ...(role === 'restaurant_owner' ? { restaurantId: membership.merchantId } : {}),
        ...(role === 'supermarket_owner' ? { supermarketId: membership.merchantId } : {}),
        ...(role === 'driver' ? { driverId: verified.uid } : {}) });
    } catch { /* Retain verified customer identity; grant no privileged role. */ }
  };
  useEffect(() => {
    localStorage.removeItem('aura_monrovia_auth_user');
    localStorage.removeItem('aura_orders');
    sessionStorage.removeItem('aura_admin_unlocked');
    return onAuthStateChanged(auth, verified => { void load(verified); });
  }, []);
  const login: AuthContextType['login'] = async () => ({ success: false, error: 'Continue with Google or Firebase phone verification.' });
  const logout = () => { setUser(null); localStorage.removeItem('aura_orders'); void signOut(auth); };
  return <AuthContext.Provider value={{ user, login,
    loginWithPhone: async () => ({ success: false, error: 'Use Firebase phone verification.' }), logout,
    // Legacy portal callers can request refresh, but cannot choose identity or role.
    setUserDirectly: value => { if (value === null) logout(); else void load(auth.currentUser); },
  }}>{children}</AuthContext.Provider>;
};
