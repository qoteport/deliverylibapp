import { rememberedTable } from "./dining-session";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingBasket,
  MapPin,
  MessageCircle,
  Clock,
  ChevronRight,
  Store,
  Trash2,
} from "lucide-react";
import { command } from "../utils/commandApi";
import { useAuth } from "../context/AuthContext";
import { usePlatform, go, Line } from "./context";
import { useRemote, friendly } from "./hooks";
import { Kind, Row, money, nameOf, imageOf, deal, label } from "./model";
import {
  Dialog,
  Photo,
  Button,
  Field,
  Select,
  Notice,
  Empty,
  Busy,
} from "./ui";
import { LocationDialog, SmallMap } from "./Location";
import { RoomPlan } from "./Tables";
export const merchantId = (l: Line) =>
  l.kind === "food"
    ? l.item.restaurantId
    : l.kind === "grocery"
      ? l.item.supermarketId
      : l.item.vendorId || l.item.workspaceId;
export function CartSheet({
  kind,
  merchants = [],
  onClose,
}: {
  kind: Kind;
  merchants?: Row[];
  onClose: () => void;
}) {
  const { cart, setCart, requireLogin, toast } = usePlatform(),
    [checkout, setCheckout] = useState<{ lines: Line[]; merchant: Row } | null>(
      null,
    ),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const selected = cart.filter((l) => l.kind === kind),
    groups = [...new Set(selected.map(merchantId))];
  const update = (line: Line, patch: Partial<Line>) =>
    setCart((old) =>
      old.flatMap((l) =>
        l === line ? (patch.quantity === 0 ? [] : [{ ...l, ...patch }]) : [l],
      ),
    );
  const sendRequest = async (lines: Line[]) => {
    if (!(await requireLogin())) return;
    setBusy(true);
    setError(null);
    const input = {
      items: lines.map((l) => ({
        itemId: l.item.id,
        quantity: l.quantity,
        ...(l.size ? { size: l.size } : {}),
        ...(l.color ? { color: l.color } : {}),
      })),
    };
    const storageKey = "aura_lifestyle_pending_" + merchantId(lines[0]);
    try {
      const quote = (await command("/v1/lifestyle-cart/quote", input)).quote;
      const fingerprint = JSON.stringify({
        ...input,
        expectedTotalMinor: quote.totalMinor,
      });
      let operation: any;
      try {
        operation = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      } catch {}
      if (operation?.fingerprint !== fingerprint) {
        operation = { fingerprint, key: crypto.randomUUID() };
        sessionStorage.setItem(storageKey, JSON.stringify(operation));
      }
      const result = await command(
        "/v1/lifestyle-cart/requests",
        { ...input, expectedTotalMinor: quote.totalMinor },
        operation.key,
      );
      setCart((old) => old.filter((l) => !lines.includes(l)));
      sessionStorage.removeItem(storageKey);
      toast(
        "Order request sent. The vendor will confirm availability, delivery and payment.",
      );
      onClose();
      go("/messages/" + result.conversation.id);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!checkout && (
        <Dialog
          title={kind === "lifestyle" ? "Your Lifestyle cart" : "Your basket"}
          onClose={onClose}
        >
          {!selected.length ? (
            <Empty title="Your basket is waiting">
              <p>Find something you like and add it here.</p>
            </Empty>
          ) : (
            <>
              {kind === "lifestyle" && (
                <p>
                  Each vendor receives a separate order request in chat. They
                  confirm delivery, availability and payment.
                </p>
              )}
              {groups.map((id) => {
                const lines = selected.filter((l) => merchantId(l) === id),
                  shop = merchants.find((s) => s.id === id) || {
                    id,
                    name:
                      lines[0].item.supermarketName ||
                      lines[0].item.vendorName ||
                      "Your selected seller",
                  };
                return (
                  <section key={id} className="a-section">
                    <h3>{shop.name}</h3>
                    {lines.map((l, i) => (
                      <article key={i} className="a-list-card">
                        <div className="a-cart-line">
                          <Photo src={imageOf(l.item)} alt={nameOf(l.item)} />
                          <div>
                            <strong>{nameOf(l.item)}</strong>
                            <p>{money(deal(l.item).price)}</p>
                          </div>
                          <div className="a-stepper">
                            <button
                              disabled={busy}
                              aria-label="Reduce quantity"
                              onClick={() =>
                                update(l, {
                                  quantity: Math.max(0, l.quantity - 1),
                                })
                              }
                            >
                              −
                            </button>
                            <span>{l.quantity}</span>
                            <button
                              disabled={busy || l.quantity >= 99}
                              aria-label="Increase quantity"
                              onClick={() =>
                                update(l, { quantity: l.quantity + 1 })
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {l.item.availableSizes?.length > 0 && (
                          <Select
                            label="Size"
                            value={l.size || ""}
                            onChange={(v) => update(l, { size: v })}
                            options={l.item.availableSizes}
                          />
                        )}{" "}
                        {l.item.availableColors?.length > 0 && (
                          <Select
                            label="Colour"
                            value={l.color || ""}
                            onChange={(v) => update(l, { color: v })}
                            options={l.item.availableColors}
                          />
                        )}
                        <button
                          className="a-text-link"
                          style={{ marginTop: 18 }}
                          disabled={busy}
                          onClick={() => update(l, { quantity: 0 })}
                        >
                          <Trash2 size={15} />
                          Remove item
                        </button>
                      </article>
                    ))}
                    <div className="a-row between" style={{ margin: "20px 0" }}>
                      <span>Items subtotal</span>
                      <strong>
                        {money(
                          lines.reduce(
                            (n, l) => n + deal(l.item).price * l.quantity,
                            0,
                          ),
                        )}
                      </strong>
                    </div>
                    <Button
                      disabled={busy}
                      style={{ width: "100%" }}
                      onClick={async () => {
                        if (kind === "lifestyle") await sendRequest(lines);
                        else if (await requireLogin())
                          setCheckout({ lines, merchant: shop });
                      }}
                    >
                      {busy ? (
                        "Please wait..."
                      ) : kind === "lifestyle" ? (
                        <>
                          <MessageCircle size={18} />
                          Checkout with this vendor
                        </>
                      ) : (
                        "Continue to checkout"
                      )}
                    </Button>
                  </section>
                );
              })}
              <Notice error={error} />
            </>
          )}
        </Dialog>
      )}
      {checkout && (
        <Checkout
          lines={checkout.lines}
          merchant={checkout.merchant}
          onClose={() => setCheckout(null)}
          onPlaced={() => {
            setCart((old) => old.filter((l) => !checkout.lines.includes(l)));
            setCheckout(null);
            onClose();
            go("/orders");
          }}
        />
      )}
    </>
  );
}
export function Checkout({
  lines,
  merchant,
  onClose,
  onPlaced,
  liveId,
  network,
}: {
  lines: Line[];
  merchant: Row;
  onClose: () => void;
  onPlaced: () => void;
  liveId?: string;
  network?: string;
}) {
  const { user } = useAuth(),
    saved = useRemote("/v1/me/delivery"),
    { toast } = usePlatform();
  const kind = lines[0].kind;
  const [details, setDetails] = useState<Row>({
      name: user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
      area: "",
      coords: null,
    }),
    [mode, setMode] = useState(
      kind === "food" &&
        sessionStorage.getItem("aura_dining_merchant") === merchant.id
        ? "dine-in"
        : "delivery",
    ),
    [payment, setPayment] = useState(network || "cod-usd"),
    [table, setTable] = useState(() =>
      kind === "food" ? rememberedTable(merchant.id) : "",
    ),
    [location, setLocation] = useState(false),
    [quote, setQuote] = useState<Row | null>(null),
    [error, setError] = useState<string | null>(null),
    [quoting, setQuoting] = useState(true),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef<{ key: string; body: Row } | null>(null),
    edited = useRef(false);
  useEffect(() => {
    if (saved.data?.details && !edited.current)
      setDetails({ ...details, ...saved.data.details });
  }, [saved.data]);
  const input = {
    orderType:
      kind === "grocery"
        ? "supermarket"
        : kind === "lifestyle"
          ? "lifestyle"
          : "food",
    merchantId: merchant.id,
    items: lines.map((l) => ({
      itemId: l.item.id,
      quantity: l.quantity,
      ...(l.addons?.length ? { addons: l.addons } : {}),
      ...(l.spiceLevel ? { spiceLevel: l.spiceLevel } : {}),
      notes: l.notes || "",
      ...(l.size ? { size: l.size } : {}),
      ...(l.color ? { color: l.color } : {}),
    })),
    diningMode: mode,
    paymentMethod: payment,
    tipMinor: 0,
    ...(mode === "dine-in" && table ? { diningTableId: table } : {}),
  };
  const quoteFingerprint = JSON.stringify(input);
  useEffect(() => {
    let alive = true;
    setQuote(null);
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const response = await command(
          liveId ? `/v1/live/${liveId}/quote` : "/v1/order-quotes",
          input,
        );
        if (alive) {
          setQuote(response.quote ?? response);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(friendly(e));
      } finally {
        if (alive) setQuoting(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [quoteFingerprint]);
  const tables = (merchant.diningTables || []).filter((t: Row) => t.active);
  const submit = async () => {
    if (!quote || busy) return;
    if (mode === "delivery" && !details.coords) {
      setError("Choose your delivery location on the map.");
      return;
    }
    if (mode === "dine-in" && tables.length && !table) {
      setError("Choose your table before placing the order.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await command("/v1/me/delivery", details);
      pending.current ??= {
        key: crypto.randomUUID(),
        body: {
          ...input,
          customerName: details.name.trim(),
          customerPhone: /^0[1-9]\d{8}$/.test(details.phone.replace(/\D/g, ""))
            ? "+231" + details.phone.replace(/\D/g, "").slice(1)
            : details.phone.trim(),
          deliveryAddress: details.address.trim(),
          deliveryArea: details.area || "",
          deliveryCoords: details.coords,
          expectedTotalMinor: quote.amountMinor,
        },
      };
      setUncertain(true);
      const result = await command(
        liveId ? `/v1/live/${liveId}/orders` : "/v1/orders",
        pending.current.body,
        pending.current.key,
      );
      pending.current = null;
      setUncertain(false);
      toast("Order submitted. You can track it in Orders.");
      if (liveId) go("/live-payments/" + (result.order?.id ?? result.id));
      onPlaced();
    } catch (e: any) {
      setError(friendly(e));
      if (e.status && e.status < 500) {
        pending.current = null;
        setUncertain(false);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title="The final details."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>Check your summary and place your order here.</p>
      <section className="a-card">
        <h3>Order summary</h3>
        {lines.map((l, i) => (
          <div className="a-row between" key={i}>
            <span>
              {l.quantity} × {nameOf(l.item)}
            </span>
          </div>
        ))}
        {quoting ? (
          <Busy text="Updating your total..." />
        ) : quote ? (
          <>
            <hr style={{ margin: "15px 0", borderColor: "#e5ebe6" }} />
            {[
              ["Items", quote.subtotal],
              ["Delivery", quote.deliveryFee],
              ["Tax", quote.tax],
              ["Total", quote.total],
            ].map(([key, value]) => (
              <div
                className="a-row between"
                style={{ margin: "10px 0" }}
                key={key}
              >
                <span>{key}</span>
                <strong>{money(Number(value))}</strong>
              </div>
            ))}
          </>
        ) : null}
      </section>
      <fieldset disabled={busy || uncertain || saved.loading}>
        <Select
          label="How are we serving you?"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setTable("");
          }}
          options={[
            { value: "delivery", label: "Delivery" },
            { value: "pickup", label: "Pickup" },
            ...(kind === "food"
              ? [{ value: "dine-in", label: "Dine in" }]
              : []),
          ]}
        />
        <div className="a-two">
          <Field label="Full name">
            <input
              required
              maxLength={100}
              value={details.name}
              onChange={(e) => {
                edited.current = true;
                setDetails({ ...details, name: e.target.value });
              }}
            />
          </Field>
          <Field label="Phone number">
            <input
              type="tel"
              required
              maxLength={25}
              value={details.phone}
              onChange={(e) => {
                edited.current = true;
                setDetails({ ...details, phone: e.target.value });
              }}
            />
          </Field>
        </div>
        {mode === "delivery" && (
          <section className="a-card">
            <h3>Delivery details</h3>
            <p>
              {details.address || "Choose your delivery address and map pin."}
            </p>
            <Button secondary onClick={() => setLocation(true)}>
              <MapPin size={17} />
              {details.coords ? "Change delivery spot" : "Choose delivery spot"}
            </Button>
          </section>
        )}
        {mode === "dine-in" && tables.length > 0 && (
          <GuestTables tables={tables} value={table} onChange={setTable} />
        )}
        <Select
          label="Payment preference"
          value={payment}
          onChange={setPayment}
          options={
            liveId
              ? [
                  {
                    value: network!,
                    label:
                      network === "orange-money" ? "Orange Money" : "MTN MoMo",
                  },
                ]
              : [
                  { value: "cod-usd", label: "Cash USD" },
                  { value: "cod-lrd", label: "Cash LRD" },
                  { value: "momo-mtn", label: "MTN MoMo" },
                  { value: "orange-money", label: "Orange Money" },
                ]
          }
        />
      </fieldset>
      <Notice error={error || saved.error} />
      <Button
        style={{ width: "100%", marginTop: 18 }}
        disabled={
          busy ||
          quoting ||
          !quote ||
          !details.name?.trim() ||
          !details.phone?.trim()
        }
        onClick={submit}
      >
        {busy
          ? "Placing order..."
          : uncertain
            ? "Retry order confirmation"
            : quote
              ? `Place order · ${money(quote.total)}`
              : "Total unavailable"}
      </Button>
      {uncertain && (
        <p className="a-warning">
          Confirmation is pending. Retry here to recover the same order.
        </p>
      )}
      {location && (
        <LocationDialog
          initial={details}
          onClose={() => setLocation(false)}
          onChoose={(v) => {
            edited.current = true;
            setDetails({ ...details, ...v });
            setLocation(false);
          }}
        />
      )}
    </Dialog>
  );
}
function GuestTables({
  tables,
  value,
  onChange,
}: {
  tables: Row[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [area, setArea] = useState(
      tables.find((t) => t.id === value)?.area ||
        tables[0]?.area ||
        "Main room",
    ),
    [note, setNote] = useState(
      value
        ? "Your table is already selected. Change it only if you move seats."
        : "Choose your table. Location is a suggestion, not proof of where you are seated.",
    );
  const manual = useRef(false);
  useEffect(() => {
    if (value || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (fix) => {
        if (manual.current || fix.coords.accuracy > 20) return;
        const distance = (t: Row) =>
          Math.hypot(
            (t.lat - fix.coords.latitude) * 111320,
            (t.lng - fix.coords.longitude) *
              111320 *
              Math.cos((t.lat * Math.PI) / 180),
          );
        const certain = tables.filter(
          (t) => distance(t) + fix.coords.accuracy <= t.radiusMeters,
        );
        if (
          certain.length === 1 &&
          !tables.some(
            (t) =>
              t.id !== certain[0].id &&
              distance(t) <= t.radiusMeters + fix.coords.accuracy,
          )
        ) {
          onChange(certain[0].id);
          setArea(certain[0].area);
          setNote(
            "Suggested from your location. Please confirm this is your table.",
          );
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  }, []);
  return (
    <section className="a-card">
      <h3>Where are you seated?</h3>
      <p>{note}</p>
      <Select
        label="Dining area"
        value={area}
        onChange={setArea}
        options={[...new Set(tables.map((t) => t.area || "Main room"))]}
      />
      <RoomPlan
        tables={tables.filter((t) => (t.area || "Main room") === area)}
        selected={value}
        onSelect={(id) => {
          manual.current = true;
          onChange(id);
        }}
      />
      <div className="a-chips">
        {tables
          .filter((t) => (t.area || "Main room") === area)
          .map((t) => (
            <button
              key={t.id}
              className={value === t.id ? "active" : ""}
              onClick={() => {
                manual.current = true;
                onChange(t.id);
              }}
            >
              {t.name} · {t.seats || 4} seats
            </button>
          ))}
      </div>
    </section>
  );
}
export function OrdersPage() {
  const { requireLogin } = usePlatform(),
    orders = useRemote("/v1/orders", undefined, 5000),
    [selected, setSelected] = useState<string | null>(
      new URLSearchParams(location.search).get("order"),
    );
  useEffect(() => {
    void requireLogin();
  }, []);
  return (
    <section className="a-page narrow">
      <span className="a-eyebrow">AT EVERY STEP</span>
      <h1>Your orders</h1>
      <Notice error={orders.error} retry={orders.reload} />
      {orders.loading ? (
        <Busy />
      ) : !(orders.data?.orders || []).length ? (
        <Empty title="Your orders will appear here" />
      ) : (
        (orders.data?.orders || []).map((o: Row) => (
          <button
            className="a-list-card"
            style={{ width: "100%", textAlign: "left" }}
            key={o.id}
            onClick={() => setSelected(o.id)}
          >
            <div className="a-row between">
              <strong>{o.restaurantName}</strong>
              <span className="a-status">
                {label(o.fulfillmentStage || o.status)}
              </span>
            </div>
            <p>
              {o.items?.length || 0} items · {money(o.total)}
            </p>
            <small>{new Date(o.createdAt).toLocaleString()}</small>
          </button>
        ))
      )}
      {selected && (
        <OrderDetail id={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
export function OrderDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const order = useRemote(`/v1/orders/${id}`, undefined, 5000),
    events = useRemote(`/v1/orders/${id}/events`, undefined, 5000),
    route = useRemote(
      order.data?.order?.diningMode === "delivery" &&
        order.data?.order?.deliveryCoords
        ? `/v1/orders/${id}/route`
        : null,
      {},
      30000,
    );
  const o = order.data?.order,
    { confirm, toast } = usePlatform(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const cancel = async () => {
    if (
      !(await confirm(
        "Cancel this order?",
        "The kitchen or shop will receive the cancellation.",
        "Cancel order",
      ))
    )
      return;
    setBusy(true);
    try {
      await command(`/v1/orders/${id}/transition`, {
        status: "cancelled",
        expectedVersion: o.version,
        reason: "Customer cancelled from web",
      });
      order.reload();
      toast("Order cancelled.");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Order details" onClose={onClose}>
      {o ? (
        <>
          <span className="a-eyebrow">
            {o.orderType === "food" ? "YOUR KITCHEN" : "YOUR SHOP"}
          </span>
          <h2>{o.restaurantName}</h2>
          <div className="a-card">
            <h3>
              {o.status === "received"
                ? `Waiting for ${o.orderType === "food" ? "kitchen" : "shop"} confirmation`
                : o.diningMode === "dine-in"
                  ? (
                      {
                        preparing: "Kitchen confirmed · Preparing",
                        plating: "Ready to serve at your table",
                        completed: "Served · Enjoy your meal",
                      } as Record<string, string>
                    )[o.status] || label(o.status)
                  : label(o.fulfillmentStage || o.status)}
            </h3>
            <small>{o.id}</small>
            {o.diningTable && (
              <p>
                {o.diningTable.area} · {o.diningTable.name}
              </p>
            )}
          </div>
          <h3 style={{ marginTop: 24 }}>Order progress</h3>
          <div className="a-timeline">
            {(events.data?.events || []).map((e: Row, i: number) => (
              <article key={e.id || i}>
                <strong>{label(e.stage || e.status || e.type)}</strong>
                <small>
                  {new Date(
                    e.at || e.createdAt || o.createdAt,
                  ).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
          {o.diningMode === "delivery" && (
            <>
              {" "}
              <h3>Delivery tracking</h3>
              <SmallMap
                markers={[
                  o.restaurantCoords && {
                    id: "kitchen",
                    type: "kitchen",
                    name: o.restaurantName,
                    coords: o.restaurantCoords,
                  },
                  o.deliveryCoords && {
                    id: "delivery",
                    name: o.deliveryAddress,
                    coords: o.deliveryCoords,
                  },
                  o.driverLocation && {
                    id: "driver",
                    type: "driver",
                    name: o.assignedDriverName || "Your courier",
                    coords: o.driverLocation,
                  },
                ].filter(Boolean)}
                route={route.data?.route?.polyline?.encodedPolyline}
              />
              {route.data?.route?.duration && (
                <p>
                  Estimated travel:{" "}
                  {Math.ceil(parseInt(route.data.route.duration) / 60)} minutes{" "}
                  {o.status === "received" || o.status === "preparing"
                    ? "after preparation"
                    : ""}
                </p>
              )}
              {!o.driverLocation && (
                <p>
                  The assigned courier’s location will appear when they share
                  GPS.
                </p>
              )}
              {o.assignedDriverPhone && (
                <a
                  className="a-button secondary"
                  href={`tel:${o.assignedDriverPhone}`}
                >
                  Call your courier
                </a>
              )}
            </>
          )}
          {o.diningMode === "dine-in" && o.status === "preparing" && (
            <p>
              Estimated preparation: about {o.estimatedPreparationMinutes || 15}{" "}
              minutes.
            </p>
          )}
          <section className="a-section">
            {(o.items || []).map((l: Row, i: number) => (
              <div className="a-cart-line" key={i}>
                <Photo src={imageOf(l.menuItem || {})} alt={l.menuItem?.name} />
                <span>
                  {l.quantity} × {l.menuItem?.name}
                </span>
                <strong>{money(l.itemTotal)}</strong>
              </div>
            ))}
          </section>
          <div className="a-row between">
            <strong>Total</strong>
            <strong>{money(o.total)}</strong>
          </div>
          {["received", "accepted"].includes(o.status) && (
            <Button secondary danger disabled={busy} onClick={cancel}>
              Cancel order
            </Button>
          )}
        </>
      ) : order.loading ? (
        <Busy />
      ) : null}
      <Notice
        error={error || order.error || events.error}
        retry={order.reload}
      />
    </Dialog>
  );
}
export function ActiveOrders() {
  const { user } = useAuth(),
    orders = useRemote(user ? "/v1/orders" : null, undefined, 10000);
  const active = (orders.data?.orders || []).filter(
    (o: Row) =>
      !["completed", "cancelled", "rejected", "delivered"].includes(o.status) &&
      !["delivered", "rejected"].includes(o.fulfillmentStage),
  );
  return active.length ? (
    <button className="a-activity" onClick={() => go("/orders")}>
      <Clock size={19} />
      <span>
        {active.length} active order{active.length > 1 ? "s" : ""} · Tap to
        track
      </span>
      <ChevronRight size={17} />
    </button>
  ) : null;
}
