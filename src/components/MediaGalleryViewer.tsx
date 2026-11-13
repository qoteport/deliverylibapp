import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Film,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';

interface MediaGalleryViewerProps {
  images: string[];
  videoUrl?: string;
  title: string;
  badge?: React.ReactNode;
  heightClass?: string;
}

type MediaItem = 
  | { type: 'photo'; url: string; index: number }
  | { type: 'video'; url: string; index: number };

export const MediaGalleryViewer: React.FC<MediaGalleryViewerProps> = ({
  images,
  videoUrl,
  title,
  badge,
  heightClass = 'h-64 sm:h-80'
}) => {
  // Normalize media items
  const mediaImages = Array.isArray(images) && images.length > 0 ? images.filter(Boolean) : [];
  const hasVideo = Boolean(videoUrl && videoUrl.trim());

  // Unified items list: images followed by video (user just scrolls into video)
  const allMediaItems: MediaItem[] = [
    ...mediaImages.map((img, i) => ({ type: 'photo' as const, url: img, index: i })),
    ...(hasVideo ? [{ type: 'video' as const, url: videoUrl!, index: mediaImages.length }] : [])
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  // Helper to determine YouTube embed
  const isYouTube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
  const getYouTubeEmbed = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`
      : url;
  };

  // Scroll main container to specific index
  const scrollToItem = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, allMediaItems.length - 1));
    setActiveIndex(boundedIndex);
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: width * boundedIndex,
        behavior: 'smooth'
      });
    }
  }, [allMediaItems.length]);

  // Update activeIndex based on scroll position
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      if (clientWidth > 0) {
        const newIndex = Math.round(scrollLeft / clientWidth);
        if (newIndex !== activeIndex && newIndex >= 0 && newIndex < allMediaItems.length) {
          setActiveIndex(newIndex);
        }
      }
    }
  };

  // Double tap detector (for touch screens) & Double click
  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      setIsFullScreen((prev) => !prev);
    }
    lastTapRef.current = now;
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    scrollToItem(activeIndex > 0 ? activeIndex - 1 : allMediaItems.length - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    scrollToItem(activeIndex < allMediaItems.length - 1 ? activeIndex + 1 : 0);
  };

  // Keyboard navigation & Esc in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      } else if (isFullScreen) {
        if (e.key === 'ArrowLeft') {
          scrollToItem(activeIndex > 0 ? activeIndex - 1 : allMediaItems.length - 1);
        } else if (e.key === 'ArrowRight') {
          scrollToItem(activeIndex < allMediaItems.length - 1 ? activeIndex + 1 : 0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, activeIndex, scrollToItem, allMediaItems.length]);

  if (allMediaItems.length === 0) {
    return (
      <div className={`relative ${heightClass} bg-gray-950 rounded-2xl flex items-center justify-center text-gray-500 text-xs`}>
        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
        <span>No media available</span>
      </div>
    );
  }

  const currentItem = allMediaItems[activeIndex] || allMediaItems[0];

  return (
    <div className="space-y-2.5 w-full select-none">
      {/* Main Viewport Container */}
      <div
        className={`relative ${heightClass} bg-black rounded-2xl overflow-hidden flex items-center justify-center group shadow-inner`}
      >
        {/* Badge Overlay */}
        {badge && <div className="absolute top-3 left-3 z-20 pointer-events-none">{badge}</div>}

        {/* Double-tap full screen hint & Maximize icon */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md"
            title="Double-tap media or click to view Full Screen"
            aria-label="Full screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Scroll Snap Track: User scrolls smoothly through images directly into video */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full h-full"
        >
          {allMediaItems.map((item, idx) => (
            <div
              key={idx}
              onTouchEnd={handleMediaTap}
              onDoubleClick={() => setIsFullScreen(true)}
              className="w-full h-full shrink-0 snap-center relative flex items-center justify-center bg-gray-950 cursor-pointer"
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  {isYouTube(item.url) ? (
                    <iframe
                      src={getYouTubeEmbed(item.url)}
                      title={`${title} Video Tour`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={item.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support HTML video playback.
                    </video>
                  )}
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={`${title} - Slide ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>

        {/* Left/Right Navigation Arrows */}
        {allMediaItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 z-20 cursor-pointer shadow-md"
              aria-label="Previous item"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 z-20 cursor-pointer shadow-md"
              aria-label="Next item"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Position Pill & Video Indicator */}
            <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/20 z-20 flex items-center gap-1 shadow-md pointer-events-none">
              {currentItem.type === 'video' ? (
                <>
                  <Film className="w-3 h-3 text-red-400" />
                  <span>Video ({activeIndex + 1}/{allMediaItems.length})</span>
                </>
              ) : (
                <span>{activeIndex + 1} / {allMediaItems.length}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails Row (User can tap to jump to any photo or the video) */}
      {allMediaItems.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {allMediaItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToItem(idx)}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                activeIndex === idx
                  ? item.type === 'video'
                    ? 'border-red-500 ring-2 ring-red-500/40 scale-102'
                    : 'border-purple-600 ring-2 ring-purple-600/30 scale-102'
                  : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
              }`}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center">
                  <Play className="w-5 h-5 fill-red-500 text-red-500" />
                  <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Video</span>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={`Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* FULL SCREEN MODAL (Triggered by double-tap or maximize icon) */}
      {isFullScreen && (
        <div
          onTouchEnd={handleMediaTap}
          onDoubleClick={() => setIsFullScreen(false)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top Bar with Title, Counter, and Close */}
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm truncate max-w-xs sm:max-w-md">{title}</span>
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                {activeIndex + 1} of {allMediaItems.length}
                {currentItem.type === 'video' ? ' • Video' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/60 hidden sm:inline">Double-tap or Esc to exit</span>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close full screen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Center Content */}
          <div className="w-full h-full flex items-center justify-center max-w-5xl max-h-[85vh]">
            {currentItem.type === 'video' ? (
              <div className="w-full h-full flex items-center justify-center">
                {isYouTube(currentItem.url) ? (
                  <iframe
                    src={getYouTubeEmbed(currentItem.url)}
                    title={`${title} Video`}
                    className="w-full h-full max-h-[80vh] border-0 rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={currentItem.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
                  >
                    Your browser does not support HTML video playback.
                  </video>
                )}
              </div>
            ) : (
              <img
                src={currentItem.url}
                alt={`${title} - Fullscreen ${activeIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl transition-all"
              />
            )}
          </div>

          {/* Full Screen Nav Arrows */}
          {allMediaItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition active:scale-95 cursor-pointer z-50 shadow-lg"
                aria-label="Previous item"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition active:scale-95 cursor-pointer z-50 shadow-lg"
                aria-label="Next item"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
