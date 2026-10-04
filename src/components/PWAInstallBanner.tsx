import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, CheckCircle2, Monitor, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, triggerInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissedSession = sessionStorage.getItem('aura_pwa_dismissed');
    if (dismissedSession) {
      setIsDismissed(true);
    }

    // Detect iOS / iPhone / iPad
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('aura_pwa_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await triggerInstall();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // If already running in standalone PWA mode, don't show prompt
  if (isInstalled || isDismissed) return null;

  return (
    <>
      {/* Top Floating PWA Install Alert Banner */}
      <div className="bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827] text-white border-b border-orange-500/30 px-4 sm:px-8 lg:px-10 py-2.5 shadow-lg text-xs z-30 relative animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 max-w-2xl">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#FF4B26]/30">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                <span>Install AURA Food App</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full bg-[#FF4B26]/30 text-[#FF7A00] text-[10px] font-bold">
                  1-Tap Monrovia Delivery
                </span>
              </div>
              <div className="text-[11px] text-gray-300 truncate">
                Install directly to your home screen for instant ordering, faster loading &amp; offline support
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF4B26] to-[#FF7A00] hover:from-[#FF5A36] hover:to-[#FF8A10] text-white font-black text-xs rounded-xl shadow-md shadow-[#FF4B26]/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guided PWA Installation Modal (iOS, Android & Desktop) */}
      {showGuideModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowGuideModal(false)}
        >
          <div 
            className="bg-white text-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF4B26] to-[#FF7A00] text-white flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111827]">
                    Install AURA Food App
                  </h3>
                  <p className="text-xs text-gray-500">
                    Add to your device home screen
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              /* iPhone & iPad Instructions */
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF4B26] font-extrabold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    Tap the <strong className="text-gray-900">Share</strong> icon{' '}
                    <Share className="inline w-3.5 h-3.5 text-[#FF4B26] mx-0.5" /> in Safari's bottom toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF4B26] font-extrabold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    Scroll down and tap <strong className="text-gray-900">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-gray-700 mx-0.5" />.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF4B26] font-extrabold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    Tap <strong className="text-gray-900">Add</strong> in the top right corner.
                  </div>
                </div>
              </div>
            ) : (
              /* Android & Desktop Chrome / Edge Instructions */
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF4B26] font-extrabold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    Tap browser menu <strong className="text-gray-900">(⋮)</strong> or look for the <strong className="text-gray-900">Install</strong> icon in the address bar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF4B26] font-extrabold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    Select <strong className="text-gray-900">Install app</strong> or <strong className="text-gray-900">Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF4B26] font-extrabold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    Confirm <strong className="text-gray-900">Install</strong> to add AURA to your home screen with the official app icon.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-98"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
