import React, { useEffect, useState } from 'react';
import { Download, Eye, MapPin, Share2, Trash2, X } from 'lucide-react';
import { SavedPhoto } from '../types';
import { clearAllSavedPhotos, deleteSavedPhoto, getAllSavedPhotos } from '../utils/storage';

interface GalleryModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelectPhoto?: (photo: SavedPhoto) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen = true, onClose, onSelectPhoto }) => {
  const [photos, setPhotos] = useState<SavedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<SavedPhoto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPhotos = async () => {
    setLoading(true);
    const list = await getAllSavedPhotos();
    setPhotos(list);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this saved photo?')) {
      await deleteSavedPhoto(id);
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
      await loadPhotos();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all photos from gallery?')) {
      await clearAllSavedPhotos();
      setSelectedPhoto(null);
      await loadPhotos();
    }
  };

  const handleDownload = (photo: SavedPhoto) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `GPS_Photo_${new Date(photo.timestamp).toISOString().slice(0, 10)}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Saved Geotag Photos</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300">
              {photos.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {photos.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 text-xs">
              Loading gallery...
            </div>
          ) : photos.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <MapPin className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No photos saved yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Take a photo with the GPS camera and tap "Save in App" to view it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative cursor-pointer aspect-4/3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 hover:border-blue-500 transition"
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.location.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 p-2 flex flex-col justify-end">
                    <p className="text-[11px] font-bold text-white truncate">
                      {photo.location.title}
                    </p>
                    <p className="text-[9px] text-slate-300 font-mono">
                      {new Date(photo.timestamp).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(photo.id, e)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-slate-300 hover:text-red-400 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Photo Full View Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-60 bg-black/95 flex flex-col p-4">
            <div className="flex justify-between items-center pb-3">
              <span className="text-xs font-semibold text-slate-300 truncate max-w-sm">
                {selectedPhoto.location.title}
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded bg-slate-800 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.dataUrl}
                alt="Selected"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button
                onClick={() => handleDownload(selectedPhoto)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download Photo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
