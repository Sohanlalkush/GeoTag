import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  Edit3,
  MapPin,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react';
import { GeotagSettings, LocationData, SavedPhoto } from '../types';
import { renderGeotaggedImage } from '../utils/canvasRenderer';
import { savePhotoToStorage } from '../utils/storage';

interface PhotoReviewModalProps {
  isOpen?: boolean;
  onClose: () => void;
  rawImageCanvas: HTMLCanvasElement | null;
  rawImageDataUrl: string | null;
  location: LocationData;
  settings: GeotagSettings;
  onOpenEditor: () => void;
  onRetake: () => void;
  onSaved?: () => void;
}

export const PhotoReviewModal: React.FC<PhotoReviewModalProps> = ({
  isOpen = true,
  onClose,
  rawImageCanvas,
  rawImageDataUrl,
  location,
  settings,
  onOpenEditor,
  onRetake,
  onSaved,
}) => {
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Re-render final image whenever location or settings change
  useEffect(() => {
    if (!isOpen || (!rawImageCanvas && !rawImageDataUrl)) {
      return;
    }

    let isCancelled = false;
    setIsRendering(true);

    const generate = async () => {
      try {
        let source: HTMLImageElement | HTMLCanvasElement;
        if (rawImageCanvas) {
          source = rawImageCanvas;
        } else {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = rawImageDataUrl!;
          });
          source = img;
        }

        const finalUrl = await renderGeotaggedImage(source, location, settings);
        if (!isCancelled) {
          setRenderedImageUrl(finalUrl);
          setIsRendering(false);
        }
      } catch (err) {
        console.warn('Failed to render final geotag image:', err);
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    generate();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, rawImageCanvas, rawImageDataUrl, location, settings]);

  if (!isOpen || (!rawImageCanvas && !rawImageDataUrl)) {
    return null;
  }

  // Download stamped photo
  const handleDownload = () => {
    if (!renderedImageUrl) return;
    const a = document.createElement('a');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = renderedImageUrl;
    a.download = `GPS_Map_Camera_${timestampStr}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Web Share API
  const handleShare = async () => {
    if (!renderedImageUrl) return;
    try {
      const response = await fetch(renderedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `geostamp_${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: location.title,
          text: `Captured with GPS Map Camera at ${location.title} (Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)})`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: location.title,
          text: `${location.title} - Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}`,
          url: window.location.href,
        });
      } else {
        handleDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleDownload();
      }
    }
  };

  // Save to persistent IndexedDB
  const handleSaveToGallery = async () => {
    if (!renderedImageUrl || isSaved) return;

    try {
      const id = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const savedItem: SavedPhoto = {
        id,
        dataUrl: renderedImageUrl,
        thumbnailUrl: renderedImageUrl,
        timestamp: Date.now(),
        location,
        settings,
        width: rawImageCanvas ? rawImageCanvas.width : 1280,
        height: rawImageCanvas ? rawImageCanvas.height : 720,
      };

      await savePhotoToStorage(savedItem);
      setIsSaved(true);
      setSaveSuccessMsg('Saved to app gallery!');
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Failed to save to gallery:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fade-in select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shrink-0">
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retake</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Geotag</span>
          </button>
        </div>
      </div>

      {/* Main Preview Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-black">
        {isRendering ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Applying high-resolution geotag stamp...</p>
          </div>
        ) : renderedImageUrl ? (
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <img
              src={renderedImageUrl}
              alt="Geotagged Photo"
              className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
            />

            {/* Quick banner overlay informing user they can click edit tag */}
            <div
              onClick={onOpenEditor}
              className="absolute bottom-4 cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/20 text-xs text-white hover:bg-slate-800 shadow-xl transition"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Location incorrect? Tap here to adjust</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Save feedback toast */}
      {saveSuccessMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-xl animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Bottom Action Sheet */}
      <div className="px-4 py-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shrink-0">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2 sm:gap-3">
          {/* Save to Gallery */}
          <button
            onClick={handleSaveToGallery}
            disabled={isSaved || isRendering}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition ${
              isSaved
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isSaved ? <Check className="w-5 h-5 text-emerald-400" /> : <RotateCcw className="w-5 h-5" />}
            <span>{isSaved ? 'Saved in App' : 'Save in App'}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={isRendering}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Share2 className="w-5 h-5 text-blue-400" />
            <span>Share</span>
          </button>

          {/* Download JPEG */}
          <button
            onClick={handleDownload}
            disabled={isRendering}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
