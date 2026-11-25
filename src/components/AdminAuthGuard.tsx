import React from 'react';
import { useAuth } from '../context/AuthContext';

export const AdminAuthGuard: React.FC<{ children: React.ReactNode; onReturnHome?: () => void }> = ({ children, onReturnHome }) => {
  const { user } = useAuth();
  if (user && ['admin', 'super_admin'].includes(user.role)) return <>{children}</>;
  return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-md space-y-4">
    <h1 className="font-black text-2xl">Administrator access required</h1>
    <p>Sign in with a verified account assigned an administrator membership.</p>
    <button onClick={onReturnHome} className="bg-[#06C167] text-white rounded-xl p-3">Return home</button>
  </div></div>;
};
