import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause, LoaderCircle } from "lucide-react";
import { Dialog, Photo } from "./ui";
import { Row } from "./model";
export function Gallery({ item }: { item: Row }) {
  const [full, setFull] = useState<string | null>(null);
  const media = (
    item.images?.length ? item.images : item.image ? [item.image] : []
  ).map((url: string) => ({ url, video: false }));
  if (item.videoUrl)
    media.splice(
      Math.min(item.videoPosition ?? media.length, media.length),
      0,
      { url: item.videoUrl, video: true },
    );
  return (
    <>
      <div className="a-gallery">
        {media.length ? (
          media.map((m: any, i: number) =>
            m.video ? (
              <GalleryVideo key={m.url} src={m.url} />
            ) : (
              <button
                key={m.url}
                onClick={() => setFull(m.url)}
                aria-label={`View image ${i + 1} full screen`}
              >
                <Photo src={m.url} alt={item.title || item.name} />
              </button>
            ),
          )
        ) : (
          <button>
            <Photo alt="No item photos yet" />
          </button>
        )}
      </div>
      <div className="a-gallery-count">
        {media.length > 1
          ? `${media.length} ${item.videoUrl ? "photos & video" : "photos"} · Swipe to explore`
          : "Tap photo to enlarge"}
      </div>
      {full && (
        <Dialog title="Photo preview" wide onClose={() => setFull(null)}>
          <img
            src={full}
            alt={item.title || item.name}
            className="a-full-image"
          />
        </Dialog>
      )}
    </>
  );
}
function GalleryVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true),
    [playing, setPlaying] = useState(true),
    [loading, setLoading] = useState(true),
    [progress, setProgress] = useState(0);
  useEffect(() => {
    const video = ref.current!;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          void video.play().catch(() => setPlaying(false));
        else video.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 100%",
        scrollSnapAlign: "center",
        height: "min(52dvh,460px)",
      }}
    >
      <video
        ref={ref}
        src={src}
        playsInline
        autoPlay
        muted={muted}
        loop
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) =>
          setProgress(
            e.currentTarget.duration
              ? e.currentTarget.currentTime / e.currentTarget.duration
              : 0,
          )
        }
      />
      {loading && (
        <LoaderCircle
          className="spin"
          style={{
            position: "absolute",
            left: "46%",
            top: "45%",
            color: "#06c167",
          }}
        />
      )}
      <button
        className="a-icon"
        aria-label={playing ? "Pause video" : "Play video"}
        onClick={() => {
          if (playing) ref.current?.pause();
          else void ref.current?.play();
        }}
        style={{ position: "absolute", bottom: 18, left: 14 }}
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button
        className="a-icon"
        aria-label={muted ? "Unmute video" : "Mute video"}
        onClick={() => setMuted(!muted)}
        style={{ position: "absolute", bottom: 18, right: 14 }}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "#d9f4e4",
          cursor: "pointer",
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (ref.current?.duration)
            ref.current.currentTime =
              ((e.clientX - rect.left) / rect.width) * ref.current.duration;
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "#06c167",
          }}
        />
      </div>
    </div>
  );
}
