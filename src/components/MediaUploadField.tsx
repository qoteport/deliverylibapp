import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Plus,
  Play,
  Film,
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface MediaUploadFieldProps {
  images: string[];
  onChangeImages: (images: string[]) => void;
  videoUrl?: string;
  onChangeVideoUrl: (videoUrl: string) => void;
  label?: string;
}

export const MediaUploadField: React.FC<MediaUploadFieldProps> = ({
  images = [],
  onChangeImages,
  videoUrl = '',
  onChangeVideoUrl,
  label = 'Media (Photos & Video)'
}) => {
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'video'>('images');

  const fileImageRef = useRef<HTMLInputElement | null>(null);
  const fileVideoRef = useRef<HTMLInputElement | null>(null);

  // Handle local image file selections
  const handleImageFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newImgs: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      // Validate file size (under 10MB per image)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 10MB. Please select smaller photos.`);
        processed++;
        if (processed === files.length) setIsProcessing(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        if (result) {
          newImgs.push(result);
        }
        processed++;
        if (processed === files.length) {
          onChangeImages([...images, ...newImgs]);
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Add image by URL
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    onChangeImages([...images, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  // Remove individual image
  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChangeImages(updated);
  };

  // Set image as primary cover
  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const item = images[index];
    const filtered = images.filter((_, i) => i !== index);
    onChangeImages([item, ...filtered]);
  };

  // Handle local video file selection (1 video limit)
  const handleVideoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (under 25MB for direct upload)
    if (file.size > 25 * 1024 * 1024) {
      alert('Video file is over 25MB. For large videos, please upload to YouTube or Vimeo and paste the link below.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      if (result) {
        onChangeVideoUrl(result);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add video by URL
  const handleAddVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    onChangeVideoUrl(videoUrlInput.trim());
    setVideoUrlInput('');
  };

  const handleRemoveVideo = () => {
    onChangeVideoUrl('');
    setVideoUrlInput('');
  };

  return (
    <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/90 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <label className="font-bold text-gray-900 block">{label}</label>
          <span className="text-[11px] text-gray-500">
            Upload multiple photos + 1 walkthrough/demo video
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-200/70 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
              activeTab === 'images'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos ({images.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
              activeTab === 'video'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video {videoUrl ? '(1)' : '(0)'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MULTIPLE IMAGES UPLOAD */}
      {activeTab === 'images' && (
        <div className="space-y-3">
          {/* Action buttons to upload or paste URL */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileImageRef.current?.click()}
              className="flex-1 py-2.5 px-3 bg-white border-2 border-dashed border-gray-300 hover:border-gray-900 rounded-xl font-bold text-gray-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-gray-600" />
              <span>Upload Photos from Device (Multiple)</span>
            </button>
            <input
              ref={fileImageRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageFilesSelected}
            />

            <div className="flex gap-1.5 flex-1">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste photo URL..."
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-xs"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Uploaded Photos Preview Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
              {images.map((imgUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white group shadow-2xs"
                >
                  <img
                    src={imgUrl}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Badge */}
                  {index === 0 ? (
                    <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                      Main Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      className="absolute bottom-1 left-1 bg-black/60 hover:bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set Main
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-white/50">
              <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
              <p className="text-gray-500 font-medium">No photos added yet</p>
              <p className="text-[10px] text-gray-400">Select multiple photos to showcase different angles</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ONE VIDEO UPLOAD */}
      {activeTab === 'video' && (
        <div className="space-y-3">
          {videoUrl ? (
            /* Video Attached Preview */
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1 Video Attached</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Video</span>
                </button>
              </div>

              {/* Preview Player */}
              <div className="h-44 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={videoUrl.replace('watch?v=', 'embed/')}
                    title="Video Preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                ) : (
                  <video src={videoUrl} controls className="w-full h-full object-contain" />
                )}
              </div>
            </div>
          ) : (
            /* Upload Video UI */
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => fileVideoRef.current?.click()}
                  className="flex-1 py-2.5 px-3 bg-white border-2 border-dashed border-gray-300 hover:border-gray-900 rounded-xl font-bold text-gray-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Film className="w-4 h-4 text-gray-600" />
                  <span>Upload Video Clip (MP4 / WebM / MOV)</span>
                </button>
                <input
                  ref={fileVideoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoFileSelected}
                />

                <div className="flex gap-1.5 flex-1">
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Or paste YouTube / MP4 video link..."
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddVideoUrl}
                    className="px-3 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                  >
                    Attach
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> 1 video allowed per listing. Add an interior property walkthrough, engine sound clip, or product demonstration.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
