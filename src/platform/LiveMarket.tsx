import React, { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, LocalVideoTrack } from "livekit-client";
import {
  Video,
  Mic,
  MicOff,
  SwitchCamera,
  Heart,
  Share2,
  ShoppingBag,
  Send,
} from "lucide-react";
import { command } from "../utils/commandApi";
import { useAuth } from "../context/AuthContext";
import { useRemote, friendly } from "./hooks";
import { usePlatform, go } from "./context";
import { Row, money, imageOf, nameOf, label } from "./model";
import {
  Button,
  Dialog,
  Field,
  Select,
  Photo,
  Busy,
  Notice,
  Empty,
} from "./ui";
import { Checkout } from "./Commerce";
import { MerchantOrder } from "./Business";
import { putFile } from "./Messages";
export function LiveMarket({ id }: { id?: string }) {
  const { user } = useAuth(),
    mine = useRemote(user ? "/v1/live/mine" : null),
    feed = useRemote("/v1/live", undefined, 10000, false),
    [studio, setStudio] = useState(false),
    { requireLogin } = usePlatform();
  if (id) return <LiveRoom key={id} id={id} />;
  return (
    <section className="a-page">
      <span className="a-eyebrow">LIVE MARKET</span>
      <div className="a-row between">
        <h1>
          Good finds.
          <br />
          Live connections.
        </h1>
        <Button
          onClick={async () => {
            if (await requireLogin()) setStudio(true);
          }}
        >
          <Video size={18} />
          Go live
        </Button>
      </div>
      <p>Meet local merchants. See the products. Ask your questions.</p>
      {(mine.data?.sessions || [])
        .filter((s: Row) => ["draft", "live"].includes(s.status))
        .map((s: Row) => (
          <div className="a-card" key={s.id} style={{ margin: "20px 0" }}>
            <h3>{s.title}</h3>
            <p>
              {s.status === "draft"
                ? "Your camera preview is ready."
                : "Your broadcast is live."}
            </p>
            <Button onClick={() => go("/live/" + s.id)}>
              Return to your studio
            </Button>
          </div>
        ))}
      <Notice error={feed.error} retry={feed.reload} />
      {feed.loading ? (
        <Busy />
      ) : (feed.data?.sessions || []).length ? (
        <div className="a-grid">
          {feed.data.sessions.map((s: Row) => (
            <button
              key={s.id}
              className="a-product"
              onClick={() => go("/live/" + s.id)}
            >
              <Photo src={s.thumbnail} alt={s.title} />
              <div className="a-product-body">
                <span className="a-status">
                  {s.status === "live" ? "LIVE" : "Replay"}
                </span>
                <h3>{s.title}</h3>
                <p>{s.merchantName}</p>
                <small>
                  {s.confirmedPayments || 0} merchant-confirmed sales
                </small>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty title="The next live find is coming">
          <p>Live broadcasts and available replays will appear here.</p>
          <Button
            secondary
            style={{ marginTop: 8 }}
            onClick={async () => {
              if (await requireLogin()) setStudio(true);
            }}
          >
            Open your merchant studio
          </Button>
        </Empty>
      )}
      {(feed.data?.sessions || []).length > 0 && (
        <div className="a-section">
          <Button
            secondary
            onClick={async () => {
              if (await requireLogin()) setStudio(true);
            }}
          >
            Open your merchant studio
          </Button>
        </div>
      )}
      {studio && <Studio onClose={() => setStudio(false)} />}
    </section>
  );
}
function Studio({ onClose }: { onClose: () => void }) {
  const portals = useRemote("/v1/portals"),
    [scope, setScope] = useState<Row | null>(null),
    [form, setForm] = useState<Row>({
      momoNumber: "",
      recipientName: "",
      network: "momo-mtn",
      title: "",
      itemIds: [],
      productLine: "",
    }),
    [items, setItems] = useState<Row[]>([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!scope) return;
    let alive = true;
    setLoaded(false);
    setError(null);
    void Promise.all([
      command("/v1/live/studio", scope),
      command("/v1/live/catalog", scope),
    ])
      .then(([s, c]) => {
        if (alive) {
          setForm({
            ...s.setup,
            momoNumber: String(s.setup.momoNumber || "").replace(/^\+231/, "0"),
          });
          setItems(c.items || []);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (alive) setError(friendly(e));
      });
    return () => {
      alive = false;
    };
  }, [scope?.merchantId]);
  const patch = (v: Row) => {
    setForm((f) => ({ ...f, ...v }));
    key.current = crypto.randomUUID();
  };
  return (
    <Dialog title="Go live" onClose={onClose} wide>
      <p>
        Broadcast from an approved merchant account. Buyers pay your MoMo number
        directly and upload a cropped receipt for you to verify.
      </p>
      <Select
        label="Your business"
        value={scope?.merchantId || ""}
        options={(portals.data?.associations || [])
          .filter(
            (a: Row) =>
              ["restaurant", "supermarket", "lifestyle"].includes(a.kind) &&
              a.status === "active",
          )
          .map((a: Row) => ({ value: a.merchantId, label: a.name }))}
        onChange={(id) => {
          const a = portals.data.associations.find(
            (a: Row) => a.merchantId === id,
          );
          setScope({
            merchantId: id,
            kind: a.kind === "restaurant" ? "food" : a.kind,
          });
        }}
      />
      {scope && !loaded && !error && <Busy text="Restoring your studio..." />}
      {loaded && (
        <>
          <Field label="Live title">
            <input
              maxLength={100}
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </Field>
          <div className="a-two">
            <Field label="Liberian MoMo number">
              <input
                type="tel"
                placeholder="077 123 4567"
                value={form.momoNumber}
                onChange={(e) => patch({ momoNumber: e.target.value })}
              />
            </Field>
            <Field label="MoMo recipient name">
              <input
                maxLength={100}
                value={form.recipientName}
                onChange={(e) => patch({ recipientName: e.target.value })}
              />
            </Field>
          </div>
          <Select
            label="Network"
            value={form.network}
            options={[
              { value: "momo-mtn", label: "MTN MoMo" },
              { value: "orange-money", label: "Orange Money" },
            ]}
            onChange={(network) => patch({ network })}
          />
          <Select
            label="Product line"
            value={form.productLine || ""}
            options={[
              "",
              ...Array.from(
                new Set(items.map((i) => String(i.category || ""))),
              ).filter(Boolean),
            ]}
            onChange={(productLine) => patch({ productLine })}
          />
          <h3>Feature up to 20 products</h3>
          {items
            .filter((i) => !form.productLine || i.category === form.productLine)
            .map((i) => (
              <label
                className="a-list-card a-row"
                key={i.id}
                style={{ gap: 16 }}
              >
                <input
                  type="checkbox"
                  checked={form.itemIds.includes(i.id)}
                  disabled={
                    !form.itemIds.includes(i.id) && form.itemIds.length >= 20
                  }
                  onChange={(e) =>
                    patch({
                      itemIds: e.target.checked
                        ? [...form.itemIds, i.id]
                        : form.itemIds.filter((id: string) => id !== i.id),
                    })
                  }
                />
                <Photo
                  src={imageOf(i)}
                  style={{ width: 60, height: 60, borderRadius: 12 }}
                />
                <span>
                  <strong>{nameOf(i)}</strong>
                  <br />
                  {money(i.priceUsd)}
                </span>
              </label>
            ))}
          <Button
            disabled={busy || !form.title.trim() || !form.itemIds.length}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await command("/v1/live/setup", {
                  ...scope,
                  ...form,
                  enabled: true,
                  commerceEnabled: true,
                });
                const r = await command(
                  "/v1/live",
                  { ...scope, title: form.title, itemIds: form.itemIds },
                  key.current,
                );
                go("/live/" + r.session.id);
                onClose();
              } catch (e) {
                setError(friendly(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Preparing your studio..." : "Open camera preview"}
          </Button>
        </>
      )}
      <Notice error={error || portals.error} />
    </Dialog>
  );
}
function LiveRoom({ id }: { id: string }) {
  const { user } = useAuth(),
    details = useRemote(`/v1/live/${id}`, undefined, 3500, !!user),
    { requireLogin, confirm, toast } = usePlatform(),
    [error, setError] = useState<string | null>(null),
    [connected, setConnected] = useState(false),
    [mic, setMic] = useState(true),
    [camera, setCamera] = useState(true),
    [facing, setFacing] = useState<"user" | "environment">("user"),
    [viewers, setViewers] = useState(0),
    [text, setText] = useState(""),
    [products, setProducts] = useState(false),
    [orders, setOrders] = useState(false),
    [buy, setBuy] = useState<Row | null>(null),
    [busy, setBusy] = useState(false);
  const stage = useRef<HTMLDivElement>(null),
    room = useRef<Room | null>(null),
    data = details.data,
    session = data?.session,
    isHost = data?.isHost === true,
    hostRef = useRef(isHost);
  hostRef.current = isHost;
  useEffect(() => {
    if (!session || session.status === "ended") return;
    let alive = true;
    const r = new Room({ adaptiveStream: true, dynacast: true });
    room.current = r;
    const attach = (track: any) => {
      if (!alive) return;
      const el = track.attach();
      if (track.kind === Track.Kind.Video) {
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.objectFit = "cover";
      }
      stage.current?.appendChild(el);
    };
    r.on(RoomEvent.TrackSubscribed, attach);
    r.on(RoomEvent.TrackUnsubscribed, (t) =>
      t.detach().forEach((e) => e.remove()),
    );
    r.on(RoomEvent.ParticipantConnected, () =>
      setViewers(r.remoteParticipants.size),
    );
    r.on(RoomEvent.ParticipantDisconnected, () =>
      setViewers(r.remoteParticipants.size),
    );
    r.on(RoomEvent.Disconnected, () => {
      if (alive) setConnected(false);
    });
    r.on(RoomEvent.LocalTrackPublished, (p) => {
      if (p.track?.kind === Track.Kind.Video) attach(p.track);
    });
    void (async () => {
      try {
        const token = isHost
          ? await command(`/v1/live/${id}/token`, { hosting: true })
          : user
            ? await command(`/v1/live/${id}/token`, { hosting: false })
            : await command(`/v1/live/${id}/watch-token`, {}, undefined, false);
        if (!alive) return;
        await r.connect(token.url, token.token);
        if (!alive) {
          await r.disconnect();
          return;
        }
        if (isHost) {
          await r.localParticipant.setCameraEnabled(true);
          await r.localParticipant.setMicrophoneEnabled(true);
        }
        setConnected(true);
        setViewers(r.remoteParticipants.size);
        await r.startAudio();
      } catch (e) {
        if (alive) setError(friendly(e));
      }
    })();
    return () => {
      alive = false;
      void r.disconnect();
      stage.current?.replaceChildren();
    };
  }, [id, !!session, isHost, session?.status === "ended", user?.uid]);
  const action = async (action: string, itemId?: string) => {
    setBusy(true);
    try {
      await command(`/v1/live/${id}/action`, {
        action,
        ...(itemId ? { itemId } : {}),
      });
      details.reload();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    if (isHost && session?.status === "live") {
      if (
        !(await confirm(
          "End your live?",
          "This ends the broadcast for everyone. The replay stays available for 12 hours when recording is configured.",
          "End live",
        ))
      )
        return;
      setBusy(true);
      try {
        await command(`/v1/live/${id}/action`, { action: "end" });
      } catch (e) {
        setError(friendly(e));
        setBusy(false);
        return;
      }
    }
    go("/live");
  };
  if (!data)
    return (
      <section className="a-page">
        <Busy text="Opening live..." />
        <Notice error={details.error} retry={details.reload} />
        <Button secondary onClick={() => go("/live")}>
          Back to Live Market
        </Button>
      </section>
    );
  const pinned =
    data.items?.find((i: Row) => i.id === session.pinnedId) || data.items?.[0];
  return (
    <section
      className="a-live-stage"
      style={{
        position: "relative",
        height: "calc(100dvh - 120px)",
        minHeight: 620,
        maxWidth: 900,
        margin: "0 auto",
        background: "#08140e",
        color: "white",
        overflow: "hidden",
        borderRadius: 24,
      }}
    >
      <div ref={stage} style={{ position: "absolute", inset: 0 }} />
      {session.status === "ended" && <Replay id={id} />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(0deg,rgba(0,0,0,.85),transparent 65%,rgba(0,0,0,.55))",
        }}
      />
      <div
        style={{
          position: "relative",
          padding: 20,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div className="a-row">
          <Photo
            src={data.merchantImage}
            style={{ width: 44, height: 44, borderRadius: "50%" }}
          />
          <div>
            <strong>{session.merchantName}</strong>
            <br />
            <small>
              {session.status === "live"
                ? "LIVE"
                : session.status === "draft"
                  ? "CAMERA PREVIEW"
                  : "REPLAY"}{" "}
              · {viewers} connected · {session.confirmedPayments || 0} confirmed
              sales
            </small>
          </div>
        </div>
        <button
          className="a-icon"
          style={{ color: "white" }}
          onClick={leave}
          aria-label="Leave live"
        >
          ✕
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          right: 18,
          top: "35%",
          display: "grid",
          gap: 15,
        }}
      >
        <button
          className="a-icon"
          style={{ color: "white" }}
          onClick={async () => {
            try {
              const url = location.href;
              if (navigator.share)
                await navigator.share({ title: session.title, url });
              else {
                await navigator.clipboard.writeText(url);
                toast("Invitation link copied");
              }
            } catch {}
          }}
          aria-label="Invite viewers"
        >
          <Share2 />
        </button>
        <button
          className="a-icon"
          style={{ color: "white" }}
          onClick={() => setProducts(true)}
          aria-label="View products"
        >
          <ShoppingBag />
        </button>
        <button
          className="a-icon"
          style={{ color: "white" }}
          onClick={async () => {
            if (await requireLogin())
              try {
                await command(
                  `/v1/live/${id}/interact`,
                  { type: "like" },
                  crypto.randomUUID(),
                );
                details.reload();
              } catch (e) {
                setError(friendly(e));
              }
          }}
          aria-label="Like"
        >
          <Heart />
          {session.likes || 0}
        </button>
        {isHost && (
          <>
            <button
              className="a-icon"
              style={{ color: "white" }}
              aria-label="Switch camera"
              onClick={async () => {
                try {
                  const next = facing === "user" ? "environment" : "user",
                    track = room.current?.localParticipant.getTrackPublication(
                      Track.Source.Camera,
                    )?.track as LocalVideoTrack | undefined;
                  await track?.restartTrack({ facingMode: next });
                  setFacing(next);
                } catch (e) {
                  setError(friendly(e));
                }
              }}
            >
              <SwitchCamera />
            </button>
            <button
              className="a-icon"
              style={{ color: "white" }}
              aria-label="Toggle microphone"
              onClick={async () => {
                try {
                  await room.current?.localParticipant.setMicrophoneEnabled(
                    !mic,
                  );
                  setMic(!mic);
                } catch (e) {
                  setError(friendly(e));
                }
              }}
            >
              {mic ? <Mic /> : <MicOff />}
            </button>
            <button
              className="a-icon"
              style={{ color: "white" }}
              aria-label="Toggle camera"
              onClick={async () => {
                try {
                  await room.current?.localParticipant.setCameraEnabled(
                    !camera,
                  );
                  setCamera(!camera);
                } catch (e) {
                  setError(friendly(e));
                }
              }}
            >
              <Video />
            </button>
          </>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
        }}
      >
        <Notice error={error || details.error} />
        {!connected && session.status !== "ended" && (
          <Busy text="Connecting to the live room..." />
        )}
        {isHost && (
          <div className="a-row" style={{ gap: 12, marginBottom: 16 }}>
            {session.status === "draft" && (
              <Button
                disabled={!connected || busy || !camera}
                onClick={() => action("start")}
              >
                Go live
              </Button>
            )}
            <Button secondary onClick={() => setOrders(true)}>
              Orders & receipts{" "}
              {data.pendingReceiptsCount
                ? `(${data.pendingReceiptsCount})`
                : ""}
            </Button>
          </div>
        )}
        <div
          aria-live="polite"
          style={{ maxHeight: 160, overflowY: "auto", paddingRight: 48 }}
        >
          {(data.comments || []).map((c: Row) => (
            <p
              key={c.id}
              style={{
                margin: "8px 0",
                color: c.type === "payment" ? "#9bffc6" : "white",
              }}
            >
              <strong>{c.name}</strong> {c.text}
            </p>
          ))}
        </div>
        {pinned && (
          <div
            className="a-row"
            style={{
              gap: 12,
              padding: 12,
              background: "rgba(255,255,255,.95)",
              color: "#15251b",
              borderRadius: 18,
              margin: "14px 0",
            }}
          >
            <Photo
              src={imageOf(pinned)}
              style={{ width: 58, height: 58, borderRadius: 12 }}
            />
            <div style={{ flex: 1 }}>
              <strong>{nameOf(pinned)}</strong>
              <br />
              {money(pinned.priceUsd)}
            </div>
            {!isHost && (
              <Button
                onClick={async () => {
                  if (await requireLogin()) setBuy(pinned);
                }}
              >
                Order
              </Button>
            )}
          </div>
        )}
        <div className="a-row" style={{ gap: 10 }}>
          <input
            style={{
              background: "rgba(255,255,255,.15)",
              color: "white",
              border: "1px solid #65766b",
            }}
            maxLength={500}
            placeholder="Ask a question..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="a-icon"
            style={{ color: "white" }}
            aria-label="Send comment"
            disabled={!text.trim() || busy}
            onClick={async () => {
              if (!(await requireLogin())) return;
              setBusy(true);
              try {
                await command(
                  `/v1/live/${id}/interact`,
                  { type: "comment", text: text.trim() },
                  crypto.randomUUID(),
                );
                setText("");
                details.reload();
              } catch (e) {
                setError(friendly(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send />
          </button>
        </div>
      </div>
      {products && (
        <Dialog title="Featured products" onClose={() => setProducts(false)}>
          {data.items.map((i: Row) => (
            <div className="a-list-card a-row" key={i.id} style={{ gap: 14 }}>
              <Photo
                src={imageOf(i)}
                style={{ width: 66, height: 66, borderRadius: 12 }}
              />
              <div style={{ flex: 1 }}>
                <strong>{nameOf(i)}</strong>
                <p>{money(i.priceUsd)}</p>
              </div>
              <Button
                onClick={async () => {
                  if (isHost) await action("pin", i.id);
                  else if (await requireLogin()) {
                    setBuy(i);
                    setProducts(false);
                  }
                }}
              >
                {isHost ? "Pin" : "Order"}
              </Button>
            </div>
          ))}
        </Dialog>
      )}
      {buy && (
        <Checkout
          liveId={id}
          network={data.paymentNetwork}
          lines={[
            {
              kind: session.kind === "supermarket" ? "grocery" : session.kind,
              quantity: 1,
              item: buy,
            },
          ]}
          merchant={{ id: session.merchantId, name: session.merchantName }}
          onClose={() => setBuy(null)}
          onPlaced={() => setBuy(null)}
        />
      )}{" "}
      {orders && <HostOrders id={id} onClose={() => setOrders(false)} />}
    </section>
  );
}

function Replay({ id }: { id: string }) {
  const lease = useRemote(`/v1/live/${id}/playback`, undefined, 60000, false),
    [valid, setValid] = useState(true);
  const position = useRef(0);
  useEffect(() => {
    if (!lease.data) return;
    const remaining =
      Number(lease.data.publicUntil) -
      Number(lease.data.serverNow || Date.now());
    const t = setTimeout(() => setValid(false), Math.max(0, remaining));
    return () => clearTimeout(t);
  }, [lease.data]);
  return lease.data?.url && valid ? (
    <video
      key={lease.data.url}
      src={lease.data.url}
      onTimeUpdate={(e) => (position.current = e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = position.current;
      }}
      autoPlay
      playsInline
      controls
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  ) : (
    <div style={{ padding: 100, textAlign: "center" }}>
      <p>
        {lease.error ||
          "The replay is being prepared or is no longer available."}
      </p>
    </div>
  );
}
export function LivePayment({ id }: { id: string }) {
  const order = useRemote(`/v1/live-orders/${id}`, undefined, 5000),
    [file, setFile] = useState<File | null>(null),
    [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const key = useRef(crypto.randomUUID()),
    o = order.data?.order || order.data;
  return (
    <section className="a-page narrow">
      <h1>Your live order</h1>
      <Notice error={error || order.error} retry={order.reload} />
      {!o ? (
        <Busy />
      ) : (
        <>
          <div className="a-card">
            <h2>{o.restaurantName}</h2>
            <p>
              Pay the merchant directly, using the details below. Aura does not
              collect this payment.
            </p>
            <h3>{money(o.total)}</h3>
            <p>
              Reference: <strong>{o.paymentReference}</strong>
            </p>
            <p>{o.manualPayment?.recipientName}</p>
            <h3>{o.manualPayment?.number}</h3>
            <p>{label(o.paymentMethod)}</p>
            <span className="a-status">{label(o.paymentStatus)}</span>
          </div>
          <p>
            After paying, crop your screenshot to show only the payment message.
            The merchant checks their account before confirming.
          </p>
          {o.paymentStatus !== "confirmed_manual" && (
            <Field label="Payment screenshot">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  key.current = crypto.randomUUID();
                }}
              />
            </Field>
          )}
          {busy && <Busy text={`Uploading receipt ${progress}%...`} />}
          <Button secondary onClick={() => go("/orders")}>
            View your orders
          </Button>
          {file && (
            <ReceiptCrop
              file={file}
              onClose={() => setFile(null)}
              onCropped={async (blob) => {
                setBusy(true);
                setError(null);
                try {
                  const r = await command(
                    `/v1/live-orders/${id}/receipts`,
                    { type: "image/png", size: blob.size, cropped: true },
                    key.current,
                  );
                  await putFile(r.uploadUrl, blob, "image/png", setProgress);
                  await command(
                    `/v1/live-orders/${id}/receipts/${r.receiptId}/complete`,
                    {},
                  );
                  setFile(null);
                  order.reload();
                } catch (e) {
                  setError(friendly(e));
                } finally {
                  setBusy(false);
                }
              }}
              busy={busy}
            />
          )}
        </>
      )}
    </section>
  );
}
function ReceiptCrop({
  file,
  onClose,
  onCropped,
  busy,
}: {
  file: File;
  onClose: () => void;
  onCropped: (b: Blob) => Promise<void>;
  busy: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    image = useRef<HTMLImageElement | null>(null),
    start = useRef<{ x: number; y: number } | null>(null),
    [crop, setCrop] = useState<Row | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      image.current = img;
      const c = canvas.current;
      if (!c) return;
      c.width = Math.min(900, img.naturalWidth);
      c.height = Math.round((img.naturalHeight * c.width) / img.naturalWidth);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget,
      r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  };
  return (
    <Dialog
      title="Crop to the payment message"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        Drag over only the payment message. Remove account balances and
        unrelated messages.
      </p>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvas}
          aria-label="Drag to select payment area"
          style={{ width: "100%", touchAction: "none" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            start.current = point(e);
            setCrop(null);
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            const p = point(e);
            setCrop({
              x: Math.min(p.x, start.current.x),
              y: Math.min(p.y, start.current.y),
              w: Math.abs(p.x - start.current.x),
              h: Math.abs(p.y - start.current.y),
            });
          }}
          onPointerUp={() => {
            start.current = null;
          }}
        />
        {crop && canvas.current && (
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              border: "3px solid #00a65b",
              background: "#00a65b22",
              left: `${(crop.x / canvas.current.width) * 100}%`,
              top: `${(crop.y / canvas.current.height) * 100}%`,
              width: `${(crop.w / canvas.current.width) * 100}%`,
              height: `${(crop.h / canvas.current.height) * 100}%`,
            }}
          />
        )}
      </div>
      <Notice error={error} />
      <Button
        disabled={busy || !crop || crop.w < 40 || crop.h < 30}
        onClick={async () => {
          if (!crop || !canvas.current) return;
          const output = document.createElement("canvas");
          output.width = Math.floor(crop.w);
          output.height = Math.floor(crop.h);
          output
            .getContext("2d")!
            .drawImage(
              canvas.current,
              crop.x,
              crop.y,
              crop.w,
              crop.h,
              0,
              0,
              output.width,
              output.height,
            );
          const blob = await new Promise<Blob | null>((resolve) =>
            output.toBlob(resolve, "image/png"),
          );
          if (!blob || blob.size > 4 * 1024 * 1024) {
            setError("Choose a smaller payment area, under 4 MB.");
            return;
          }
          await onCropped(blob);
        }}
      >
        {busy ? "Uploading..." : "Upload cropped receipt"}
      </Button>
    </Dialog>
  );
}
function HostOrders({ id, onClose }: { id: string; onClose: () => void }) {
  const orders = useRemote(`/v1/live/${id}/orders`, undefined, 5000),
    [selected, setSelected] = useState<Row | null>(null),
    [receipt, setReceipt] = useState(""),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const review = async (action: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await command(`/v1/live-orders/${selected.id}/review`, {
        action,
        expectedVersion: selected.version,
        receiptId: selected.receiptId,
      });
      setSelected(null);
      setReceipt("");
      orders.reload();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Orders & receipts" onClose={onClose}>
      <p>
        Verify money arrived in your MoMo account before confirming a receipt.
        Announce the buyer's name only with their consent.
      </p>
      <Notice error={error || orders.error} />
      {(orders.data?.orders || []).map((o: Row) => (
        <div className="a-card" key={o.id}>
          <h3>
            {o.customerName} · {money(o.total)}
          </h3>
          <p>{o.paymentReference}</p>
          <p>{label(o.paymentStatus)}</p>
          {o.paymentStatus === "confirmed_manual" && (
            <MerchantOrder
              order={o}
              drivers={[]}
              merchantId={o.restaurantId}
              onUpdated={orders.reload}
              onDetails={() => go("/orders?order=" + o.id)}
            />
          )}{" "}
          {o.paymentStatus === "receipt_uploaded" && (
            <Button
              secondary
              onClick={async () => {
                setError(null);
                try {
                  const r = await command(`/v1/live-orders/${o.id}/receipt`);
                  setSelected(o);
                  setReceipt(r.url);
                } catch (e) {
                  setError(friendly(e));
                }
              }}
            >
              Review receipt
            </Button>
          )}
        </div>
      ))}
      {selected && (
        <Dialog
          title="Verify payment receipt"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <img
            src={receipt}
            alt="Buyer payment receipt"
            style={{ maxWidth: "100%" }}
          />
          <p>
            Compare the reference, recipient and amount with your MoMo account.
          </p>
          <div className="a-row" style={{ gap: 12 }}>
            <Button disabled={busy} onClick={() => review("confirm")}>
              Payment received
            </Button>
            <Button danger disabled={busy} onClick={() => review("reject")}>
              Could not verify
            </Button>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}
