import React, { useRef, useState } from 'react';
import {
  Aperture,
  Camera,
  Compass,
  Flashlight,
  Grid,
  Image as ImageIcon,
  Map as MapIcon,
  MapPin,
  Play,
  RefreshCw,
  Sliders,
  Sparkles,
  SwitchCamera,
  Upload,
} from 'lucide-react';
import { GeotagSettings, LocationData } from '../types';
import { FacingMode } from '../hooks/useCamera';
import { GPSStatus } from '../hooks/useGeolocation';
import { GeotagOverlay } from './GeotagOverlay';

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  facingMode: FacingMode;
  hasTorch: boolean;
  torchOn: boolean;
  cameraError: string | null;
  gpsStatus: GPSStatus;
  location: LocationData;
  settings: GeotagSettings;
  onCapture: () => void;
  onToggleFacing: () => void;
  onToggleTorch: () => void;
  onOpenEditor: () => void;
  onOpenGallery: () => void;
  onOpenMapModal: () => void;
  onUploadPhoto: (file: File) => void;
  onUseSamplePhoto: () => void;
  onStartCamera: () => void;
  savedPhotosCount: number;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  videoRef,
  isStreaming,
  facingMode,
  hasTorch,
  torchOn,
  cameraError,
  gpsStatus,
  location,
  settings,
  onCapture,
  onToggleFacing,
  onToggleTorch,
  onOpenEditor,
  onOpenGallery,
  onOpenMapModal,
  onUploadPhoto,
  onUseSamplePhoto,
  onStartCamera,
  savedPhotosCount,
}) => {
  const [showGrid, setShowGrid] = useState(false);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
      e.target.value = '';
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
      e.target.value = '';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* Hidden Native Camera Input (Opens Android/iOS hardware camera directly) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraCapture}
        className="hidden"
      />

      {/* Hidden File Picker Input (Gallery/Storage upload) */}
      <input
        ref={uploadFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadFile}
        className="hidden"
      />

      {/* Camera Video Stream Layer - ALWAYS IN THE DOM to ensure stream binds immediately */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-950 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          } ${isStreaming ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Standby & Permission Prompt Card (Shown only when stream is not active) */}
        {!isStreaming && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-sm">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-blue-400 mb-3 shadow-xl">
              <Camera className="w-12 h-12 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Live Camera Feed</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {cameraError || 'Tap "Start Live Camera" to view your live camera feed directly in this app.'}
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              {/* Primary: Start in-app live camera feed */}
              <button
                onClick={onStartCamera}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Live Camera (In-App)</span>
              </button>

              {/* Secondary: Open Native Device Camera app */}
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md transition active:scale-95"
              >
                <Aperture className="w-4 h-4" />
                <span>Open Device Camera (Full Res)</span>
              </button>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => uploadFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Photo</span>
                </button>
                <button
                  onClick={onUseSamplePhoto}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sample</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rule of Thirds Grid Overlay */}
        {showGrid && (
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 z-10">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div />
          </div>
        )}

        {/* Live Geotag Stamp Overlay directly on the Viewfinder! */}
        <div className="z-20 absolute inset-0">
          <GeotagOverlay
            location={location}
            settings={settings}
            onEditClick={onOpenEditor}
            interactive={true}
          />
        </div>
      </div>

      {/* Top Floating Controls Overlay */}
      <div className="relative z-30 flex items-center justify-between p-3.5 bg-gradient-to-b from-black/75 via-black/35 to-transparent">
        {/* GPS Status Badge */}
        <button
          onClick={onOpenEditor}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-xs font-medium shadow-md transition hover:bg-slate-800"
        >
          {gpsStatus === 'active' && (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-[11px]">
                GPS Locked {location.accuracy ? `(±${Math.round(location.accuracy)}m)` : ''}
              </span>
            </>
          )}
          {gpsStatus === 'manual' && (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-blue-300 text-[11px] font-semibold">Custom Location</span>
            </>
          )}
          {gpsStatus === 'acquiring' && (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 text-[11px]">Acquiring GPS...</span>
            </>
          )}
          {gpsStatus === 'denied' && (
            <>
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-300 text-[11px]">Tap to Set Location</span>
            </>
          )}
        </button>

        {/* Viewfinder Utilities */}
        <div className="flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md border border-white/15 rounded-full p-1">
          {/* Map Preview Modal Trigger */}
          <button
            onClick={onOpenMapModal}
            className="p-2 rounded-full text-emerald-400 hover:bg-white/15 transition"
            title="Open Interactive Map Preview"
          >
            <MapIcon className="w-4 h-4" />
          </button>

          {/* Torch Toggle */}
          {hasTorch && (
            <button
              onClick={onToggleTorch}
              className={`p-2 rounded-full transition ${
                torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'text-white hover:bg-white/15'
              }`}
              title="Toggle Torch"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-full transition ${
              showGrid ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/15'
            }`}
            title="Toggle Alignment Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Flip Camera */}
          <button
            onClick={onToggleFacing}
            className="p-2 rounded-full text-white hover:bg-white/15 transition active:rotate-180"
            title="Switch Camera (Front/Rear)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Edit Stamp Settings */}
          <button
            onClick={onOpenEditor}
            className="p-2 rounded-full text-white hover:bg-white/15 transition"
            title="Edit Geotag & Coordinates"
          >
            <Sliders className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Bottom Shutter Action Bar */}
      <div className="relative z-30 pt-4 pb-6 px-4 sm:px-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between">
        {/* Left: Gallery Browser */}
        <button
          onClick={onOpenGallery}
          className="relative p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/20 text-white hover:bg-slate-800 transition active:scale-95"
          title="Open Saved Photos Gallery"
        >
          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          {savedPhotosCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md">
              {savedPhotosCount}
            </span>
          )}
        </button>

        {/* Center: Live Viewfinder Shutter Button */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={isStreaming ? onCapture : onStartCamera}
            className="group relative w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white/80 p-1 flex items-center justify-center transition active:scale-90 hover:scale-105 shadow-2xl"
            title={isStreaming ? 'Snap Photo from Live Feed' : 'Start Live Camera'}
          >
            <div className="w-full h-full rounded-full bg-white group-hover:bg-slate-200 transition shadow-inner flex items-center justify-center">
              {!isStreaming && <Camera className="w-6 h-6 text-slate-800" />}
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-blue-400 transition" />
          </button>
        </div>

        {/* Right: Direct Real Native Camera Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => nativeCameraInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95"
            title="Open Native Device Camera"
          >
            <Aperture className="w-4 h-4" />
            <span className="hidden sm:inline">Device Cam</span>
          </button>
        </div>
      </div>
    </div>
  );
};
