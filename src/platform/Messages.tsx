import React, { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Mic,
  Square,
  Send,
  Store,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { command } from "../utils/commandApi";
import { usePlatform, go } from "./context";
import { useRemote, friendly } from "./hooks";
import { Row, money, label } from "./model";
import { Button, Dialog, Photo, Empty, Notice, Busy } from "./ui";
export async function putFile(
  url: string,
  file: Blob,
  type: string,
  onProgress: (p: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload could not be completed. Please try again."));
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and try again."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Please try again."));
    xhr.send(file);
  });
}
async function voiceWav(blob: Blob) {
  const audio = new AudioContext();
  try {
    const data = await audio.decodeAudioData(await blob.arrayBuffer()),
      length = Math.floor(data.duration * 16000),
      result = new ArrayBuffer(44 + length * 2),
      view = new DataView(result);
    const text = (at: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
    };
    text(0, "RIFF");
    view.setUint32(4, result.byteLength - 8, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, length * 2, true);
    for (let i = 0; i < length; i++) {
      const p = (i * data.sampleRate) / 16000,
        j = Math.floor(p),
        next = Math.min(j + 1, data.length - 1);
      let value = 0;
      for (let c = 0; c < data.numberOfChannels; c++) {
        const samples = data.getChannelData(c);
        value += samples[j] * (1 - (p - j)) + samples[next] * (p - j);
      }
      value = Math.max(-1, Math.min(1, value / data.numberOfChannels));
      view.setInt16(
        44 + i * 2,
        value < 0 ? value * 32768 : value * 32767,
        true,
      );
    }
    return new File([result], "voice-note.wav", { type: "audio/wav" });
  } finally {
    void audio.close();
  }
}
export function Inbox({ initialId }: { initialId?: string }) {
  const { user } = useAuth(),
    { requireLogin } = usePlatform(),
    inbox = useRemote("/v1/conversations", undefined, 5000),
    [id, setId] = useState(initialId || "");
  useEffect(() => {
    void requireLogin();
  }, []);
  useEffect(() => setId(initialId || ""), [initialId]);
  return (
    <section className="a-page">
      <span className="a-eyebrow">YOUR CONVERSATIONS</span>
      <h1>A little hello goes a long way.</h1>
      <Notice error={inbox.error} retry={inbox.reload} />
      <div className="a-message-layout">
        <aside className="a-conversations">
          <h3>Messages</h3>
          {inbox.loading ? (
            <Busy />
          ) : (
            (inbox.data?.conversations || []).map((c: Row) => (
              <button
                key={c.id}
                className={id === c.id ? "active" : ""}
                onClick={() => {
                  setId(c.id);
                  go("/messages/" + c.id);
                }}
              >
                <strong>{c.title}</strong>
                {c.unread && <span className="a-badge">New</span>}
                <small>{c.lastMessage || "Start a conversation"}</small>
              </button>
            ))
          )}
          {!inbox.loading && !inbox.data?.conversations?.length && (
            <Empty title="No conversations yet">
              <p>Message an owner from any listing.</p>
            </Empty>
          )}
        </aside>
        {id ? (
          <Conversation
            key={id}
            id={id}
            title={
              (inbox.data?.conversations || []).find((c: Row) => c.id === id)
                ?.title || "Conversation"
            }
            onRead={inbox.reload}
          />
        ) : (
          <Empty title="Choose a conversation">
            <MessageCircle size={36} />
            <p>
              Your listing inquiries and vendor order requests stay together
              here.
            </p>
          </Empty>
        )}
      </div>
    </section>
  );
}
function Conversation({
  id,
  title,
  onRead,
}: {
  id: string;
  title: string;
  onRead: () => void;
}) {
  const { user } = useAuth(),
    messages = useRemote(`/v1/conversations/${id}/messages`, undefined, 4000),
    [older, setOlder] = useState<Row[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [catalog, setCatalog] = useState<Row[] | null>(null),
    [query, setQuery] = useState(""),
    [upload, setUpload] = useState<{ file: File; url: string } | null>(null),
    [progress, setProgress] = useState(0),
    [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0);
  const history = useRef<HTMLDivElement>(null),
    operation = useRef<{ fingerprint: string; key: string } | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    recordTimer = useRef<ReturnType<typeof setInterval> | null>(null),
    alive = useRef(true),
    uploadKey = useRef(crypto.randomUUID()),
    imageInput = useRef<HTMLInputElement>(null),
    videoInput = useRef<HTMLInputElement>(null),
    readThrough = useRef(0),
    firstHistory = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      if (recordTimer.current) clearInterval(recordTimer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(
    () => () => {
      if (upload?.url) URL.revokeObjectURL(upload.url);
    },
    [upload?.url],
  );
  useEffect(() => {
    const latest = messages.data?.messages?.at(-1);
    if (!latest) return;
    const box = history.current;
    const nearBottom =
      firstHistory.current ||
      !box ||
      box.scrollHeight - box.scrollTop - box.clientHeight < 150;
    firstHistory.current = false;
    if (nearBottom) {
      box?.scrollTo({ top: box.scrollHeight });
      if (
        document.visibilityState === "visible" &&
        latest.sequence > readThrough.current
      ) {
        readThrough.current = latest.sequence;
        void command(`/v1/conversations/${id}/read`, {
          through: latest.sequence,
        })
          .then(() => window.dispatchEvent(new Event("aura-notifications")))
          .catch(() => {});
      }
    }
  }, [messages.data]);
  const send = async (extra: Row = {}, caption = text) => {
    if (busy || (!caption.trim() && !Object.keys(extra).length)) return;
    setBusy(true);
    setError(null);
    const body = { text: caption.trim(), ...extra },
      fingerprint = JSON.stringify(body);
    if (operation.current?.fingerprint !== fingerprint)
      operation.current = { fingerprint, key: crypto.randomUUID() };
    try {
      await command(
        `/v1/conversations/${id}/messages`,
        body,
        operation.current.key,
      );
      setText("");
      setUpload(null);
      operation.current = null;
      messages.reload();
      onRead();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const chooseFile = (file?: File) => {
    if (!file) return;
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "audio/wav",
      ].includes(file.type) ||
      file.size > (file.type === "video/mp4" ? 50 : 8) * 1024 * 1024
    ) {
      setError("Choose an image under 8 MB or MP4 video under 50 MB.");
      return;
    }
    uploadKey.current = crypto.randomUUID();
    setUpload({ file, url: URL.createObjectURL(file) });
  };
  const sendAttachment = async () => {
    if (!upload || busy) return;
    setBusy(true);
    setError(null);
    try {
      const root = `/v1/conversations/${id}/uploads`,
        start = await command(
          root,
          { type: upload.file.type, size: upload.file.size },
          uploadKey.current,
        );
      if (!start.completed) {
        await putFile(start.uploadUrl, upload.file, start.type, setProgress);
        await command(`${root}/${start.attachmentId}/complete`, {});
      }
      setBusy(false);
      await send({ attachmentId: start.attachmentId }, text);
    } catch (e) {
      setBusy(false);
      setError(friendly(e));
    }
  };
  const record = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const chunks: BlobPart[] = [],
        mime = ["audio/webm;codecs=opus", "audio/mp4"].find((t) =>
          MediaRecorder.isTypeSupported(t),
        );
      const rec = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = async () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (recordTimer.current) clearInterval(recordTimer.current);
        if (!alive.current) return;
        setRecording(false);
        try {
          const file = await voiceWav(new Blob(chunks, { type: rec.mimeType }));
          if (alive.current) chooseFile(file);
        } catch {
          if (alive.current)
            setError(
              "Could not prepare that voice note. Please record it again.",
            );
        }
      };
      rec.start();
      setRecording(true);
      setSeconds(0);
      let elapsed = 0;
      recordTimer.current = setInterval(() => {
        elapsed++;
        setSeconds(elapsed);
        if (elapsed >= 120) rec.stop();
      }, 1000);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError("Allow microphone access to record a voice note.");
    }
  };
  const loadCatalog = async () => {
    setBusy(true);
    try {
      const result = await command(`/v1/conversations/${id}/catalog`);
      setCatalog(result.items || []);
      setQuery("");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const loadOlder = async () => {
    const first = older[0] || messages.data?.messages?.[0];
    if (!first) return;
    try {
      const result = await command(
        `/v1/conversations/${id}/messages?before=${first.sequence}`,
      );
      setOlder((old) => [...result.messages, ...old]);
    } catch (e) {
      setError(friendly(e));
    }
  };
  return (
    <div className="a-chat">
      <header>{title}</header>
      <div className="a-chat-history" ref={history}>
        {messages.data?.hasMore && (
          <Button secondary onClick={loadOlder}>
            Earlier messages
          </Button>
        )}
        {[...older, ...(messages.data?.messages || [])]
          .filter((m, i, a) => a.findIndex((v) => v.id === m.id) === i)
          .map((m: Row) => (
            <article
              key={m.id}
              className={`a-bubble ${m.senderId === user?.uid ? "mine" : ""}`}
            >
              {m.attachment && (
                <ChatAttachment id={id} attachment={m.attachment} />
              )}{" "}
              {m.catalogItem && (
                <button
                  className="a-row"
                  onClick={() =>
                    go(
                      `/${m.catalogItem.kind === "property" ? "real-estate" : m.catalogItem.kind === "motor" ? "motors" : "lifestyle"}?item=${m.catalogItem.id}`,
                    )
                  }
                >
                  <Photo
                    src={m.catalogItem.thumbnail}
                    alt={m.catalogItem.title}
                    style={{ width: 54, height: 54, borderRadius: 12 }}
                  />
                  <span>
                    {m.catalogItem.title}
                    <strong style={{ display: "block" }}>
                      {money(m.catalogItem.priceUsd)}
                    </strong>
                  </span>
                </button>
              )}
              {m.orderRequest && (
                <div>
                  <strong>Order request {m.orderRequest.reference}</strong>
                  {m.orderRequest.items.map((i: Row) => (
                    <div
                      className="a-row"
                      key={i.itemId}
                      style={{ margin: "10px 0" }}
                    >
                      <Photo
                        src={i.image}
                        alt={i.name}
                        style={{ width: 44, height: 44, borderRadius: 10 }}
                      />
                      <span>
                        {i.quantity} × {i.name}
                        <small>
                          {i.size || ""} {i.color || ""}
                        </small>
                      </span>
                      <strong>{money(i.lineTotalMinor / 100)}</strong>
                    </div>
                  ))}
                  <strong>
                    Total {money(m.orderRequest.totalMinor / 100)}
                  </strong>
                </div>
              )}
              {m.text && (
                <p
                  style={{
                    color: "inherit",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </p>
              )}
              <small>{new Date(m.createdAt).toLocaleString()}</small>
            </article>
          ))}
        {messages.loading && <Busy />}
      </div>
      <Notice error={error || messages.error} />
      <form
        className="a-chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          aria-label="Your message"
          value={text}
          maxLength={2000}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your message"
        />
        <button
          className="a-icon"
          disabled={busy || !text.trim()}
          aria-label="Send message"
        >
          <Send size={19} />
        </button>
      </form>
      <div className="a-chat-attachments">
        <button
          disabled={busy || recording}
          aria-label="Attach image"
          onClick={() => imageInput.current?.click()}
        >
          <ImageIcon size={21} />
        </button>
        <button
          disabled={busy || recording}
          aria-label="Attach video"
          onClick={() => videoInput.current?.click()}
        >
          <Video size={21} />
        </button>
        <button
          disabled={busy}
          aria-label={recording ? "Stop voice note" : "Record voice note"}
          onClick={record}
        >
          {recording ? <Square size={20} color="#bd3247" /> : <Mic size={21} />}
        </button>
        {recording && <span>{seconds}s / 120s</span>}
        <button
          disabled={busy || recording}
          aria-label="Vendor catalogue"
          onClick={loadCatalog}
        >
          <Store size={21} />
        </button>
        <input
          hidden
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            chooseFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          hidden
          ref={videoInput}
          type="file"
          accept="video/mp4"
          onChange={(e) => {
            chooseFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {upload && (
        <Dialog
          title="Send an attachment"
          onClose={() => {
            if (!busy) setUpload(null);
          }}
        >
          {upload.file.type.startsWith("image") ? (
            <img
              src={upload.url}
              className="a-full-image"
              alt="Selected attachment"
            />
          ) : upload.file.type.startsWith("video") ? (
            <video
              src={upload.url}
              controls
              playsInline
              style={{ maxHeight: "50dvh", width: "100%" }}
            />
          ) : (
            <audio src={upload.url} controls style={{ width: "100%" }} />
          )}
          <p>{upload.file.name}</p>
          <Notice error={error} />
          {busy && <div className="a-progress busy">Uploading {progress}%</div>}
          <Button disabled={busy} onClick={sendAttachment}>
            {busy ? "Sending..." : "Send attachment"}
          </Button>
        </Dialog>
      )}
      {catalog && (
        <Dialog title="Vendor catalogue" onClose={() => setCatalog(null)}>
          <input
            aria-label="Search vendor items"
            placeholder="Search vendor items"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {catalog
            .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
            .map((p) => (
              <button
                className="a-list-card a-row"
                style={{ width: "100%", textAlign: "left" }}
                key={p.kind + p.id}
                onClick={() => {
                  setCatalog(null);
                  void send({ catalogItem: { kind: p.kind, id: p.id } }, "");
                }}
              >
                <Photo
                  src={p.thumbnail}
                  alt={p.title}
                  style={{ width: 58, height: 58, borderRadius: 14 }}
                />
                <span>
                  <strong>{p.title}</strong>
                  <small style={{ display: "block" }}>
                    {money(p.priceUsd)}
                    {p.period && p.period !== "total" ? "/" + p.period : ""}
                  </small>
                </span>
              </button>
            ))}
          {!catalog.length && <Empty title="No published vendor items yet" />}
        </Dialog>
      )}
    </div>
  );
}
function ChatAttachment({ id, attachment }: { id: string; attachment: Row }) {
  const data = useRemote(
      `/v1/conversations/${id}/attachments/${attachment.id}`,
      undefined,
      480000,
    ),
    [full, setFull] = useState(false);
  return (
    <>
      {data.data?.url ? (
        attachment.kind === "image" ? (
          <>
            <button
              onClick={() => setFull(true)}
              aria-label="View chat image full screen"
            >
              <img src={data.data.url} alt="Message attachment" />
            </button>
            {full && (
              <Dialog title="Photo preview" wide onClose={() => setFull(false)}>
                <img
                  className="a-full-image"
                  src={data.data.url}
                  alt="Message attachment"
                />
              </Dialog>
            )}
          </>
        ) : attachment.kind === "video" ? (
          <video src={data.data.url} controls playsInline preload="metadata" />
        ) : (
          <audio src={data.data.url} controls preload="metadata" />
        )
      ) : data.loading ? (
        <Busy text="Loading attachment..." />
      ) : (
        <Notice error={data.error} retry={data.reload} />
      )}
    </>
  );
}
