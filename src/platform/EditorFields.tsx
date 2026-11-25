import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { command } from "../utils/commandApi";
import { Button, Dialog, Field, Photo, Select, Notice } from "./ui";
import { Row } from "./model";
import { putFile } from "./Messages";
import { friendly } from "./hooks";
export function MediaEditor({
  scope,
  value,
  onChange,
  onBusy,
  imagesOnly = false,
}: {
  scope: string;
  value: Row;
  onChange: (patch: Row) => void;
  onBusy?: (busy: boolean) => void;
  imagesOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [preview, setPreview] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [video, setVideo] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    alive = useRef(true),
    drag = useRef<number | null>(null);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const images = value.images || [],
    list = images.map((url: string) => ({ url, video: false }));
  if (value.videoUrl)
    list.splice(Math.min(value.videoPosition ?? list.length, list.length), 0, {
      url: value.videoUrl,
      video: true,
    });
  const apply = (items: { url: string; video: boolean }[]) =>
    onChange({
      images: items.filter((i) => !i.video).map((i) => i.url),
      videoUrl: items.find((i) => i.video)?.url || null,
      videoPosition: items.some((i) => i.video)
        ? items.findIndex((i) => i.video)
        : null,
    });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const updated = [...list],
      m = updated.splice(from, 1)[0];
    updated.splice(to, 0, m);
    apply(updated);
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (
      images.length +
        selected.filter((f) => f.type.startsWith("image/")).length >
        (imagesOnly ? 1 : 8) ||
      selected.filter((f) => f.type.startsWith("video/")).length +
        (value.videoUrl ? 1 : 0) >
        1
    ) {
      setError(
        imagesOnly
          ? "Choose one profile photo."
          : "Use up to eight images and one video.",
      );
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setError(null);
    const updated = [...list];
    try {
      for (const file of selected) {
        setVideo(file.type.startsWith("video/"));
        setPreview(URL.createObjectURL(file));
        setProgress(0);
        const key = crypto.randomUUID(),
          start = await command(
            scope + "/media/uploads",
            { type: file.type, size: file.size },
            key,
          );
        await putFile(start.uploadUrl, file, start.type, setProgress);
        const result = await command(
          scope + "/media/uploads/" + start.id + "/complete",
          {},
        );
        updated.push({
          url: result.url,
          video: file.type.startsWith("video/"),
        });
        if (alive.current) apply(updated);
      }
    } catch (e) {
      if (alive.current) setError(friendly(e));
    } finally {
      if (alive.current) {
        setBusy(false);
        setPreview(null);
      }
      onBusy?.(false);
    }
  };
  return (
    <section className={`a-progress ${busy ? "busy" : ""}`}>
      <h3>{imagesOnly ? "Business photo" : "Photos & video"}</h3>
      <p style={{ fontSize: 12 }}>
        {imagesOnly
          ? "Upload a clear photo for your profile."
          : "Up to eight photos and one video. Drag to reorder, or use Move earlier / Move later."}
      </p>
      <div className="a-upload-grid">
        {list.map((m: any, i: number) => (
          <div
            className="a-upload-tile"
            key={m.url}
            draggable={!busy}
            onDragStart={() => (drag.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag.current != null) move(drag.current, i);
              drag.current = null;
            }}
          >
            {m.video ? (
              <video src={m.url} muted playsInline />
            ) : (
              <Photo src={m.url} alt={`Media ${i + 1}`} />
            )}
            <button
              type="button"
              disabled={busy}
              aria-label={`Remove media ${i + 1}`}
              onClick={() => apply(list.filter((_: any, n: number) => n !== i))}
            >
              <X size={14} />
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 4,
                left: 4,
                right: 4,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                style={{ position: "static" }}
                disabled={busy || i === 0}
                aria-label="Move earlier"
                onClick={() => move(i, i - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                style={{ position: "static" }}
                disabled={busy || i === list.length - 1}
                aria-label="Move later"
                onClick={() => move(i, i + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {preview && (
          <div className="a-upload-tile">
            {video ? (
              <video src={preview} autoPlay muted playsInline />
            ) : (
              <img src={preview} alt="Upload preview" />
            )}
            <span
              style={{
                position: "absolute",
                bottom: 6,
                left: 8,
                background: "#fff",
                padding: 5,
                borderRadius: 8,
                fontSize: 10,
              }}
            >
              Uploading {progress}%
            </span>
          </div>
        )}
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept={
          imagesOnly
            ? "image/jpeg,image/png,image/webp"
            : "image/jpeg,image/png,image/webp,video/mp4"
        }
        multiple={!imagesOnly}
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        secondary
        disabled={busy || (imagesOnly && images.length >= 1)}
        onClick={() => input.current?.click()}
        style={{ marginTop: 14 }}
      >
        <Upload size={17} />
        {busy
          ? "Uploading..."
          : imagesOnly
            ? "Upload photo"
            : "Upload photos or video"}
      </Button>
      <Notice error={error} />
    </section>
  );
}
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(new Date(value)),
    [date, setDate] = useState(new Date(value));
  const start = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = start.getDay(),
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <>
      <Field label={label}>
        <button
          type="button"
          className="a-select"
          onClick={() => {
            setDate(new Date(value));
            setMonth(new Date(value));
            setOpen(true);
          }}
        >
          <span>
            {new Date(value).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <CalendarDays size={18} />
        </button>
      </Field>
      {open && (
        <Dialog title={label} onClose={() => setOpen(false)}>
          <div className="a-row between">
            <button
              className="a-icon"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft />
            </button>
            <strong>
              {month.toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              className="a-icon"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              aria-label="Next month"
            >
              <ChevronRight />
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 5,
              margin: "20px 0",
            }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <small key={d} style={{ textAlign: "center" }}>
                {d}
              </small>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"s" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => (
              <button
                key={i}
                type="button"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    date.getDate() === i + 1 &&
                    date.getMonth() === month.getMonth()
                      ? "#17231c"
                      : "#eef3ee",
                  color:
                    date.getDate() === i + 1 &&
                    date.getMonth() === month.getMonth()
                      ? "white"
                      : "#17231c",
                }}
                onClick={() =>
                  setDate(
                    new Date(
                      month.getFullYear(),
                      month.getMonth(),
                      i + 1,
                      date.getHours(),
                      date.getMinutes(),
                    ),
                  )
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="a-two">
            <Select
              label="Hour"
              value={String(date.getHours())}
              options={Array.from({ length: 24 }, (_, i) => ({
                value: String(i),
                label: String(i).padStart(2, "0"),
              }))}
              onChange={(v) => {
                const d = new Date(date);
                d.setHours(Number(v));
                setDate(d);
              }}
            />
            <Select
              label="Minute"
              value={String(date.getMinutes())}
              options={Array.from({ length: 60 }, (_, i) => ({
                value: String(i),
                label: String(i).padStart(2, "0"),
              }))}
              onChange={(v) => {
                const d = new Date(date);
                d.setMinutes(Number(v));
                setDate(d);
              }}
            />
          </div>
          <p style={{ fontSize: 11 }}>
            Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
          <Button
            onClick={() => {
              onChange(date.getTime());
              setOpen(false);
            }}
          >
            Use this date & time
          </Button>
        </Dialog>
      )}
    </>
  );
}
