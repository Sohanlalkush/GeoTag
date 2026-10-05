import React, { useEffect, useState } from 'react';
import {
  Camera,
  Compass,
  Download,
  Edit3,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Map as MapIcon,
  MapPin,
  Sparkles,
  Upload,
} from 'lucide-react';
import { CameraViewfinder } from './components/CameraViewfinder';
import { GalleryModal } from './components/GalleryModal';
import { GeotagEditorModal } from './components/GeotagEditorModal';
import { InteractiveMapModal } from './components/InteractiveMapModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PhotoReviewModal } from './components/PhotoReviewModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useCamera } from './hooks/useCamera';
import { useGeolocation } from './hooks/useGeolocation';
import { GeotagSettings } from './types';
import { playShutterSound } from './utils/sound';
import { getAllSavedPhotos } from './utils/storage';

export default function App() {
  const {
    videoRef,
    isStreaming,
    facingMode,
    hasTorch,
    torchOn,
    cameraError,
    toggleFacingMode,
    toggleTorch,
    captureFrame,
    startCamera,
  } = useCamera();

  const {
    location,
    gpsStatus,
    isManualOverride,
    updateManualLocation,
    resetToLiveGps,
  } = useGeolocation();

  // Settings
  const [settings, setSettings] = useState<GeotagSettings>({
    theme: 'gps-classic',
    mapType: 'google-satellite',
    stampSize: 'large',
    showMap: true,
    showCoordinates: true,
    showPlusCode: true,
    showTimestamp: true,
    showWatermark: true,
    watermarkText: 'GPS Map Camera',
    mapZoom: 16,
    position: 'bottom-center',
    photoQuality: 0.92,
    addBorder: false,
  });

  // Modals & review state
  const [editorOpen, setEditorOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number>(0);

  // Load saved count
  const refreshSavedCount = async () => {
    const list = await getAllSavedPhotos();
    setSavedCount(list.length);
  };

  useEffect(() => {
    refreshSavedCount();
  }, []);

  // Handle Shutter Capture
  const handleCapture = async () => {
    playShutterSound();

    let canvas = await captureFrame();

    // If camera is not streaming (e.g., PC with blocked camera), create high-res scenic canvas
    if (!canvas) {
      canvas = createScenicCanvas();
    }

    setCapturedCanvas(canvas);
    setCapturedDataUrl(null);
    setReviewOpen(true);
  };

  // Handle Uploading a photo
  const handleUploadPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setCapturedDataUrl(result);
        setCapturedCanvas(null);
        setReviewOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate scenic sample canvas for instant testing
  const createScenicCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 960;
    const ctx = canvas.getContext('2d')!;

    // Draw rich outdoor background
    const grad = ctx.createLinearGradient(0, 0, 0, 960);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.4, '#bae6fd');
    grad.addColorStop(0.7, '#d97706');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 960);

    // Sun
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(1020, 240, 70, 0, Math.PI * 2);
    ctx.fill();

    // Hills
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(0, 700);
    ctx.bezierCurveTo(300, 520, 700, 780, 1280, 560);
    ctx.lineTo(1280, 960);
    ctx.lineTo(0, 960);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(0, 760);
    ctx.bezierCurveTo(450, 680, 900, 640, 1280, 740);
    ctx.lineTo(1280, 960);
    ctx.lineTo(0, 960);
    ctx.closePath();
    ctx.fill();

    return canvas;
  };

  const handleUseSamplePhoto = () => {
    const canvas = createScenicCanvas();
    setCapturedCanvas(canvas);
    setCapturedDataUrl(null);
    setReviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 h-14 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-white">GeoStamp</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                GPS Cam
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">Tap stamp to edit geodata</p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Map Preview button */}
          <button
            onClick={() => setMapModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-emerald-300 hover:text-white hover:bg-slate-800 transition"
            title="Open Interactive Map Preview"
          >
            <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Map</span>
          </button>

          {/* Quick Edit Tag Button */}
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition"
            title="Edit Geotag stamp & location"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Edit Tag</span>
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* Help Info Button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="How to use"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <div className="w-full h-[calc(100vh-3.5rem)] max-w-2xl relative shadow-2xl overflow-hidden flex flex-col">
          <CameraViewfinder
            videoRef={videoRef}
            isStreaming={isStreaming}
            facingMode={facingMode}
            hasTorch={hasTorch}
            torchOn={torchOn}
            cameraError={cameraError}
            gpsStatus={gpsStatus}
            location={location}
            settings={settings}
            onCapture={handleCapture}
            onToggleFacing={toggleFacingMode}
            onToggleTorch={toggleTorch}
            onOpenEditor={() => setEditorOpen(true)}
            onOpenGallery={() => setGalleryOpen(true)}
            onOpenMapModal={() => setMapModalOpen(true)}
            onUploadPhoto={handleUploadPhoto}
            onUseSamplePhoto={handleUseSamplePhoto}
            onStartCamera={() => startCamera()}
            savedPhotosCount={savedCount}
          />
        </div>
      </main>

      {/* Interactive Map Modal (Live Pan, Zoom, Pinpoint) */}
      {mapModalOpen && (
        <InteractiveMapModal
          isOpen={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
          location={location}
          onApplyCoordinates={(coords) => {
            updateManualLocation(coords);
          }}
          onResetGps={resetToLiveGps}
        />
      )}

      {/* Geotag Editor Modal (Click to adjust title, coordinates, map) */}
      {editorOpen && (
        <GeotagEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          location={location}
          settings={settings}
          onSaveLocation={(updated) => updateManualLocation(updated)}
          onSaveSettings={(updated) => setSettings((prev) => ({ ...prev, ...updated }))}
          onResetGps={resetToLiveGps}
          onOpenInteractiveMap={() => setMapModalOpen(true)}
        />
      )}

      {/* Captured Photo Review & High-Res Stamping Modal */}
      {reviewOpen && (capturedCanvas || capturedDataUrl) && (
        <PhotoReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          rawImageCanvas={capturedCanvas}
          rawImageDataUrl={capturedDataUrl}
          location={location}
          settings={settings}
          onOpenEditor={() => setEditorOpen(true)}
          onRetake={() => {
            setReviewOpen(false);
            setCapturedCanvas(null);
            setCapturedDataUrl(null);
          }}
          onSaved={refreshSavedCount}
        />
      )}

      {/* Saved Captures Gallery Modal */}
      {galleryOpen && (
        <GalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {/* Quick Help / Info Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">How GeoStamp Works</h3>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-white mb-1">📸 1. Open Real Camera</p>
                <p>
                  Tap <strong>"Real Camera"</strong> to launch your phone's native Android/iOS camera app with full optical resolution, or use the live in-browser viewfinder.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-white mb-1">🗺️ 2. Map API & Real Image Preview</p>
                <p>
                  High-resolution street map thumbnails with red pins are generated using global Map APIs (ArcGIS Streets, OpenStreetMap, Satellite). Tap <strong>"Map"</strong> to pan, zoom, and drag your pin anywhere!
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-white mb-1">📍 3. Tap-to-Edit Geodata</p>
                <p>
                  Tap anywhere on the stamp card to search places or manually override coordinates and titles whenever GPS is inaccurate.
                </p>
              </div>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
