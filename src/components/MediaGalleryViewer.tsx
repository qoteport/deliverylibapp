import React, { useState } from 'react';
import {
  Play,
  Film,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface MediaGalleryViewerProps {
  images: string[];
  videoUrl?: string;
  title: string;
  badge?: React.ReactNode;
  heightClass?: string;
}

export const MediaGalleryViewer: React.FC<MediaGalleryViewerProps> = ({
  images,
  videoUrl,
  title,
  badge,
  heightClass = 'h-64 sm:h-80'
}) => {
  // Normalize images
  const mediaImages = Array.isArray(images) && images.length > 0 ? images.filter(Boolean) : [];
  const hasVideo = Boolean(videoUrl && videoUrl.trim());

  // View state: 'photo' or 'video'
  const [activeMode, setActiveMode] = useState<'photo' | 'video'>('photo');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // If no images provided, fallback
  const currentPhoto = mediaImages[selectedPhotoIndex] || mediaImages[0] || '';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : mediaImages.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIndex((prev) => (prev < mediaImages.length - 1 ? prev + 1 : 0));
  };

  // Helper to determine if video is YouTube or direct MP4/stream
  const isYouTube = hasVideo && (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be'));
  const getYouTubeEmbed = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`
      : url;
  };

  return (
    <div className="space-y-2.5 w-full">
      {/* Main Viewport Container */}
      <div className={`relative ${heightClass} bg-black rounded-2xl overflow-hidden flex items-center justify-center group`}>
        {/* Badge Overlay */}
        {badge && <div className="absolute top-3 left-3 z-20 pointer-events-none">{badge}</div>}

        {/* Mode Switcher Pill (if video exists) */}
        {hasVideo && (
          <div className="absolute top-3 right-3 z-20 flex items-center bg-black/70 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-md">
            <button
              type="button"
              onClick={() => setActiveMode('photo')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                activeMode === 'photo'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos ({mediaImages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('video')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                activeMode === 'video'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>
        )}

        {/* DISPLAY: VIDEO */}
        {activeMode === 'video' && hasVideo ? (
          <div className="w-full h-full bg-black flex items-center justify-center">
            {isYouTube ? (
              <iframe
                src={getYouTubeEmbed(videoUrl!)}
                title={`${title} Video Tour`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML video playback.
              </video>
            )}
          </div>
        ) : (
          /* DISPLAY: PHOTO */
          <div className="relative w-full h-full flex items-center justify-center bg-gray-950">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={`${title} - Photo ${selectedPhotoIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-200"
              />
            ) : (
              <div className="text-gray-500 text-xs flex flex-col items-center gap-2">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span>No photos available</span>
              </div>
            )}

            {/* Left/Right Navigation Arrows if multiple photos */}
            {mediaImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Photo Counter Pill */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/20">
                  {selectedPhotoIndex + 1} / {mediaImages.length}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails Row (Images + Video Button) */}
      {(mediaImages.length > 1 || hasVideo) && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {mediaImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveMode('photo');
                setSelectedPhotoIndex(idx);
              }}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                activeMode === 'photo' && selectedPhotoIndex === idx
                  ? 'border-sky-500 ring-2 ring-sky-500/30 scale-102'
                  : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-400'
              }`}
            >
              <img
                src={imgUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}

          {/* Video Thumbnail Button */}
          {hasVideo && (
            <button
              type="button"
              onClick={() => setActiveMode('video')}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all flex flex-col items-center justify-center ${
                activeMode === 'video'
                  ? 'border-red-500 bg-red-950 text-white ring-2 ring-red-500/30 scale-102'
                  : 'border-gray-300 bg-gray-900 text-white/80 hover:border-red-400 hover:text-white'
              }`}
            >
              <Play className="w-5 h-5 fill-red-500 text-red-500" />
              <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Video</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
