import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole, Restaurant } from '../types';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, pass: string, restaurantId?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPhone: (phone: string, name: string, location?: string, address?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUserDirectly: (u: AppUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  loginWithPhone: async () => ({ success: false }),
  logout: () => {},
  setUserDirectly: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const SUPER_ADMIN_CREDENTIALS = {
  email: 'qoteport@gmail.com',
  password: 'Admin#32)))',
};

export const DEMO_RESTAURANT_LOGINS: {
  email: string;
  password: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
}[] = [];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('aura_monrovia_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('aura_monrovia_auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('aura_monrovia_auth_user');
      }
    } catch {
      // ignore
    }
  }, [user]);

  const loginWithPhone = async (
    phoneInput: string,
    nameInput: string,
    location?: string,
    address?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = phoneInput.trim();
    const cleanName = nameInput.trim() || 'Monrovia Foodie';

    if (!cleanPhone) {
      return { success: false, error: 'Phone number is required' };
    }

    const customerUser: AppUser = {
      uid: `cust-${cleanPhone.replace(/[^0-9]/g, '') || Date.now().toString().slice(-6)}`,
      email: `${cleanPhone.replace(/[^0-9]/g, '')}@monrovia.aura`,
      phone: cleanPhone,
      name: cleanName,
      role: 'customer',
      location: location || 'Sinkor (Tubman Blvd)',
      address: address || '',
    };

    setUser(customerUser);

    // Sync user profile to Firestore
    try {
      await setDoc(
        doc(db, 'users', customerUser.uid),
        {
          uid: customerUser.uid,
          phone: customerUser.phone,
          name: customerUser.name,
          role: 'customer',
          location: customerUser.location,
          address: customerUser.address,
          lastActiveAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore customer sync notice:', e);
    }

    return { success: true };
  };

  const login = async (
    emailInput: string,
    passInput: string,
    restaurantId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const email = emailInput.trim().toLowerCase();
    const pass = passInput.trim();

    // 1. Check Super Admin credentials
    if (email === SUPER_ADMIN_CREDENTIALS.email.toLowerCase() && pass === SUPER_ADMIN_CREDENTIALS.password) {
      const adminUser: AppUser = {
        uid: 'super-admin-qoteport',
        email: 'qoteport@gmail.com',
        name: 'Super User (qoteport)',
        role: 'super_admin',
      };
      setUser(adminUser);

      try {
        await setDoc(doc(db, 'users', adminUser.uid), {
          uid: adminUser.uid,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore admin doc sync notice:', e);
      }

      return { success: true };
    }

    // 2. Check Demo Restaurant Owner logins
    const foundDemo = DEMO_RESTAURANT_LOGINS.find(
      (d) => d.email.toLowerCase() === email && d.password === pass
    );

    if (foundDemo) {
      const restOwnerUser: AppUser = {
        uid: `owner-${foundDemo.restaurantId}`,
        email: foundDemo.email,
        name: foundDemo.name,
        role: 'restaurant_owner',
        restaurantId: foundDemo.restaurantId,
        restaurantName: foundDemo.restaurantName,
      };
      setUser(restOwnerUser);
      return { success: true };
    }

    // 3. Restaurant owner login by selecting a restaurant
    if (restaurantId) {
      const restOwnerUser: AppUser = {
        uid: `owner-${restaurantId}`,
        email: email || `${restaurantId}@monrovia.lr`,
        name: 'Restaurant Manager',
        role: 'restaurant_owner',
        restaurantId,
      };
      setUser(restOwnerUser);
      return { success: true };
    }

    // 4. Try Firebase Auth
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const customUser: AppUser = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        name: cred.user.displayName || email.split('@')[0],
        role: 'customer',
      };
      setUser(customUser);
      return { success: true };
    } catch {
      // Fallback
      if (pass.length >= 4) {
        const fallbackUser: AppUser = {
          uid: `user-${Date.now().toString().slice(-6)}`,
          email,
          name: email.split('@')[0],
          role: 'customer',
        };
        setUser(fallbackUser);
        return { success: true };
      }
      return { success: false, error: 'Invalid login credentials' };
    }
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithPhone, logout, setUserDirectly: setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
