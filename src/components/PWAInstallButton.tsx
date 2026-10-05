import React, { useState } from 'react';
import { Check, Copy, DownloadCloud, QrCode, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // If already installed as standalone app, don't show install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
        title="Install on Android phone"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Install on Android</span>
      </button>

      {/* Android Native WebAPK Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-white">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Install App on Android</h3>
                  <p className="text-[11px] text-slate-400">Official Android Chrome WebAPK</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {/* Step by step install guide for Android Chrome */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <p className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <span>📲 Direct Installation Steps (Google Chrome on Android)</span>
                </p>
                <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <p>Open this app link in <strong>Google Chrome</strong> on your Android phone.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <p>Tap the <strong>⋮ (three dots)</strong> menu in the top-right corner of Chrome.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <p>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <p>Tap <strong>Install</strong>. Android will build and add GeoStamp directly to your <strong>Apps Drawer</strong> and <strong>Home Screen</strong> with its native camera icon!</p>
                  </div>
                </div>

                {/* Copy App Link Button */}
                <button
                  onClick={handleCopyLink}
                  className="mt-2 w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm transition active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Link Copied! Paste in Chrome on Phone</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link for Phone Browser</span>
                    </>
                  )}
                </button>
              </div>

              {/* QR Code section */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <img
                  src={qrCodeUrl}
                  alt="Scan with phone"
                  className="w-20 h-20 rounded-lg bg-white p-1 shrink-0 shadow-sm"
                />
                <div className="text-[11px] leading-snug">
                  <p className="font-semibold text-white mb-0.5">Scan with Android Camera</p>
                  <p className="text-slate-400">
                    Point your Android phone camera at this QR code to open the app directly in Chrome, then tap the menu &rarr; <strong>"Install app"</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-3.5 w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition shadow-lg"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
