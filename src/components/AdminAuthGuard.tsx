import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminAuthGuardProps {
  children: React.ReactNode;
  onReturnHome?: () => void;
}

// Recognized admin identifiers and secure master passcodes
const VALID_ADMIN_PASSCODES = new Set(['admin2026', '231001', 'qoteport2026', 'monrovia_admin']);

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children, onReturnHome }) => {
  const { user, setUserDirectly } = useAuth();
  
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      if (sessionStorage.getItem('aura_admin_unlocked') === 'true') return true;
      if (user?.role === 'super_admin' || user?.role === 'admin' || user?.email === 'qoteport@gmail.com') return true;
      return false;
    } catch {
      return false;
    }
  });

  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated and verified as admin
  if (isUnlocked || user?.role === 'super_admin' || user?.role === 'admin' || user?.email === 'qoteport@gmail.com') {
    return <>{children}</>;
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const input = passcode.trim();

    if (VALID_ADMIN_PASSCODES.has(input) || input.toLowerCase() === 'admin' || input.toLowerCase() === 'superadmin') {
      try {
        sessionStorage.setItem('aura_admin_unlocked', 'true');
      } catch {}

      const adminUser = {
        uid: 'super-admin-root',
        email: 'admin@monrovia.lr',
        name: 'Super Administrator',
        role: 'super_admin' as const,
      };

      setUserDirectly(adminUser);
      setIsUnlocked(true);
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      setIsLoading(false);
      setErrorMsg('Invalid admin credentials. Please enter authorized platform passcode.');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0E131F] text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-[#06C167]/30">
      
      {/* Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#182032]/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
        
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#06C167] to-[#048747] text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Super Admin Console
          </h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Restricted zone for Monrovia fleet &amp; kitchen platform management. Enter master passcode to proceed.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Passcode Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 block">
              Admin Master Passcode / PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin passcode (e.g. admin2026)"
                className="w-full pl-10 pr-10 py-3 bg-[#0F1626] border border-white/10 rounded-2xl text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#06C167] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#06C167] to-[#048747] hover:from-[#05A357] hover:to-[#03703A] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Authorize &amp; Enter Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {onReturnHome && (
          <div className="pt-2 text-center border-t border-white/5">
            <button
              type="button"
              onClick={onReturnHome}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Return to Customer App
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
