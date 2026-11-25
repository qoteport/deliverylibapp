import React, { useEffect, useRef, useState } from "react";
import {
  Store,
  Plus,
  ArrowLeft,
  ArrowRight,
  Truck,
  Users,
  Tag,
  Settings,
  MapPin,
  Copy,
  MessageCircle,
  Table2,
  RefreshCw,
} from "lucide-react";
import { command } from "../utils/commandApi";
import { usePlatform, go } from "./context";
import { useRemote, friendly } from "./hooks";
import { Row, money, label, imageOf, nameOf } from "./model";
import {
  Button,
  Dialog,
  Field,
  Select,
  Photo,
  Notice,
  Empty,
  Busy,
} from "./ui";
import { MediaEditor, DateTimeField } from "./EditorFields";
import { LocationDialog } from "./Location";
import { OrderDetail } from "./Commerce";
import { TablesEditor } from "./Tables";
const kinds = [
  ["restaurant", "Restaurant / kitchen"],
  ["supermarket", "Supermarket"],
  ["property", "Homes & real estate"],
  ["motors", "Motors dealer"],
  ["lifestyle", "Lifestyle seller"],
  ["driver", "Delivery rider"],
  ["rides", "Ride operator"],
];
export function BusinessCenter({
  initialId,
  initialKind,
}: {
  initialId?: string;
  initialKind?: string;
}) {
  const portals = useRemote("/v1/portals"),
    { requireLogin } = usePlatform(),
    [selected, setSelected] = useState<Row | null>(null),
    [register, setRegister] = useState(false),
    [kind, setKind] = useState(initialKind || "restaurant"),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [firstProfile, setFirstProfile] = useState(false);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    void requireLogin();
  }, []);
  useEffect(() => {
    if (initialId && portals.data && !selected) {
      const a = portals.data.associations.find(
        (a: Row) => a.merchantId === initialId,
      );
      if (a) setSelected(a);
    }
  }, [portals.data, initialId]);
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await command(
        "/v1/portals/register",
        { kind, name: name.trim() },
        key.current,
      );
      setRegister(false);
      portals.reload();
      setSelected(response.association);
      setFirstProfile(true);
      key.current = crypto.randomUUID();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (
      selected &&
      ["driver", "rides", "merchant_delivery"].includes(selected.kind)
    )
      go("/driver?mode=" + (selected.kind === "rides" ? "rides" : "delivery"));
  }, [selected]);
  if (selected) {
    if (["driver", "rides", "merchant_delivery"].includes(selected.kind))
      return null;
    const leave = () => {
      setSelected(null);
      setFirstProfile(false);
      portals.reload();
    };
    return ["restaurant", "supermarket"].includes(selected.kind) ? (
      <CommerceWorkspace
        association={selected}
        onBack={leave}
        initialProfile={firstProfile}
      />
    ) : (
      <ListingWorkspace
        association={selected}
        onBack={leave}
        initialProfile={firstProfile}
      />
    );
  }
  const links = (portals.data?.associations || []).filter(
    (a: Row) => a.kind !== "customer",
  );
  return (
    <section className="a-page">
      <span className="a-eyebrow">ONE ACCOUNT. ROOM TO GROW.</span>
      <h1>Your business workspace</h1>
      <p>
        Run your kitchen, shop or listings with the same Aura account you use
        for shopping.
      </p>
      <div className="a-row" style={{ margin: "24px 0", flexWrap: "wrap" }}>
        <Button
          onClick={() => {
            setRegister(true);
            setError(null);
          }}
        >
          <Plus size={18} />
          Register a business
        </Button>
        <Button secondary onClick={() => go("/join")}>
          Join with an invitation
        </Button>
      </div>
      <Notice error={portals.error} retry={portals.reload} />
      {portals.loading ? (
        <Busy />
      ) : links.length ? (
        <div className="a-grid">
          {links.map((a: Row) => (
            <button
              className="a-card"
              style={{ textAlign: "left" }}
              key={a.id}
              onClick={() => setSelected(a)}
            >
              <Store size={28} color="#079352" />
              <h3>{a.name}</h3>
              <p>{kinds.find((k) => k[0] === a.kind)?.[1] || label(a.kind)}</p>
              <span className={`a-status ${a.businessStatus || a.status}`}>
                {label(a.businessStatus || a.status)}
              </span>
              <span
                className="a-text-link"
                style={{ display: "flex", marginTop: 22 }}
              >
                Open workspace <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty title="Your next chapter starts here">
          <p>Register your business. Your customer account stays with you.</p>
        </Empty>
      )}
      {register && (
        <Dialog
          title="Register your business"
          onClose={() => {
            if (!busy) setRegister(false);
          }}
        >
          <Select
            label="Business type"
            value={kind}
            onChange={(v) => {
              setKind(v);
              key.current = crypto.randomUUID();
            }}
            options={kinds.map(([value, label]) => ({ value, label }))}
          />
          <Field label="Business or rider name">
            <input
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                key.current = crypto.randomUUID();
              }}
            />
          </Field>
          <p>
            New businesses start under review. Complete your profile next, then
            an administrator can approve publication.
          </p>
          <Notice error={error} />
          <Button disabled={busy || name.trim().length < 2} onClick={create}>
            {busy ? "Registering..." : "Create workspace"}
          </Button>
        </Dialog>
      )}
    </section>
  );
}
function CommerceWorkspace({
  association,
  onBack,
  initialProfile,
}: {
  association: Row;
  onBack: () => void;
  initialProfile: boolean;
}) {
  const id = association.merchantId,
    dash = useRemote(`/v1/business/${id}`, undefined, 8000),
    data = dash.data,
    { toast, confirm } = usePlatform(),
    [tab, setTab] = useState("orders"),
    [profile, setProfile] = useState(false),
    [tables, setTables] = useState(false),
    [item, setItem] = useState<Row | null>(null),
    [promotion, setPromotion] = useState<Row | null>(null),
    [rider, setRider] = useState(false),
    [invite, setInvite] = useState(false),
    [riderContact, setRiderContact] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [order, setOrder] = useState<string | null>(null);
  const asked = useRef(false),
    grocery = association.kind === "supermarket";
  useEffect(() => {
    if (data && (initialProfile || data.profileRequired) && !asked.current) {
      asked.current = true;
      setProfile(true);
    }
  }, [data]);
  const toggleOpen = async () => {
    setBusy(true);
    try {
      await command(`/v1/business/${id}/profile`, {
        isOpen: !data.restaurant.isOpen,
      });
      dash.reload();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const addRider = async () => {
    setBusy(true);
    setError(null);
    try {
      await command(`/v1/business/${id}/drivers`, { uid: riderContact.trim() });
      setRider(false);
      setRiderContact("");
      dash.reload();
      toast("Registered rider attached to your business.");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="a-page">
      <button className="a-text-link" onClick={onBack}>
        <ArrowLeft size={16} />
        Business workspaces
      </button>
      <div className="a-admin-intro">
        <div>
          <span className="a-eyebrow">
            {grocery ? "YOUR GROCERY SHOP" : "YOUR KITCHEN"}
          </span>
          <h1>{data?.restaurant?.name || association.name}</h1>
          <span
            className={`a-status ${data?.businessStatus || association.businessStatus}`}
          >
            {label(
              data?.businessStatus || association.businessStatus || "pending",
            )}
          </span>
        </div>
        <div className="a-row" style={{ flexWrap: "wrap" }}>
          <Button
            secondary
            disabled={!data || !data.canManage}
            onClick={() => setProfile(true)}
          >
            <Settings size={17} />
            Edit business details
          </Button>
          {!grocery && (
            <Button
              secondary
              disabled={!data || !data.canManage || data.profileRequired}
              onClick={() => setTables(true)}
            >
              <Table2 size={17} />
              Tables & seating zones
            </Button>
          )}
          <Button secondary onClick={dash.reload}>
            <RefreshCw size={17} />
            Refresh
          </Button>
        </div>
      </div>
      <Notice error={error || dash.error} retry={dash.reload} />
      {dash.loading ? (
        <Busy />
      ) : (
        data && (
          <>
            {data.profileRequired && (
              <div className="a-warning">
                <strong>Complete your business profile first.</strong>
                <p>
                  Add your contact details, address and map pin before creating
                  products.
                </p>
                <Button secondary onClick={() => setProfile(true)}>
                  Complete profile
                </Button>
              </div>
            )}
            <div className="a-tabs">
              {["orders", "menu", "riders", "team"].map((v) => (
                <button
                  key={v}
                  className={tab === v ? "active" : ""}
                  onClick={() => setTab(v)}
                >
                  {v === "menu" ? (grocery ? "Products" : "Menu") : label(v)}
                </button>
              ))}
              {data.canManage && (
                <Button secondary disabled={busy} onClick={toggleOpen}>
                  {data.restaurant.isOpen ? "Pause orders" : "Open for orders"}
                </Button>
              )}
            </div>
            {tab === "orders" && (
              <>
                {!data.orders?.length ? (
                  <Empty title="Orders will appear here">
                    <p>
                      New orders arrive here and trigger your notifications.
                    </p>
                  </Empty>
                ) : (
                  data.orders.map((o: Row) => (
                    <MerchantOrder
                      key={o.id}
                      order={o}
                      drivers={data.drivers || []}
                      merchantId={id}
                      onUpdated={dash.reload}
                      onDetails={() => setOrder(o.id)}
                    />
                  ))
                )}
              </>
            )}
            {tab === "menu" && (
              <>
                <div className="a-row between" style={{ marginBottom: 24 }}>
                  <h2>{grocery ? "Your products" : "Your menu"}</h2>
                  {data.canManage && (
                    <Button
                      disabled={data.profileRequired}
                      onClick={() => setItem({})}
                    >
                      <Plus size={17} />
                      {grocery ? "Add product" : "Add dish"}
                    </Button>
                  )}
                </div>
                <div className="a-grid">
                  {(data.menu || []).map((p: Row) => (
                    <article className="a-card" key={p.id}>
                      <Photo
                        src={imageOf(p)}
                        alt={p.name}
                        className="a-business-photo"
                      />
                      <h3>{p.name}</h3>
                      <p>
                        {money(p.price)} ·{" "}
                        {p.isAvailable ? "Available" : "Unavailable"}
                      </p>
                      <div className="a-order-actions">
                        {data.canManage && (
                          <>
                            <Button secondary onClick={() => setItem(p)}>
                              Edit item
                            </Button>
                            <Button secondary onClick={() => setPromotion(p)}>
                              <Tag size={15} />
                              Promotion
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {!data.menu?.length && (
                  <Empty
                    title={
                      grocery
                        ? "List your first product"
                        : "Add your first dish"
                    }
                  />
                )}
              </>
            )}
            {tab === "riders" && (
              <>
                <div className="a-row between" style={{ marginBottom: 24 }}>
                  <h2>Your delivery team</h2>
                  {data.canManage && (
                    <Button onClick={() => setRider(true)}>
                      <Plus size={17} />
                      Add platform rider
                    </Button>
                  )}
                </div>
                <p>
                  Riders must be registered on Aura. Availability reflects their
                  current location and work status.
                </p>
                {(data.drivers || []).map((d: Row) => (
                  <div className="a-list-card a-row between" key={d.uid}>
                    <div>
                      <strong>{d.name || d.uid}</strong>
                      <p>{d.phone || ""}</p>
                    </div>
                    <span
                      className={`a-status ${d.availability === "available" ? "approved" : "pending"}`}
                    >
                      {label(d.availability)}
                    </span>
                    {data.canManage && (
                      <Button
                        secondary
                        danger
                        onClick={async () => {
                          if (
                            !(await confirm(
                              "Remove this rider?",
                              "The rider will no longer receive this business’s orders.",
                              "Remove rider",
                            ))
                          )
                            return;
                          try {
                            await command(`/v1/business/${id}/remove-driver`, {
                              uid: d.uid,
                            });
                            dash.reload();
                          } catch (e) {
                            setError(friendly(e));
                          }
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
            {tab === "team" && (
              <>
                <div className="a-row between">
                  <h2>Your team</h2>
                  {data.canManage && (
                    <Button onClick={() => setInvite(true)}>
                      <Users size={17} />
                      Invite team member
                    </Button>
                  )}
                </div>
                {(data.staff || []).map((s: Row) => (
                  <div className="a-list-card a-row between" key={s.uid}>
                    <span>{s.name || s.uid}</span>
                    <span className="a-status">
                      {s.active ? "Active" : "Removed"}
                    </span>
                    {data.canManage && s.active && (
                      <Button
                        secondary
                        danger
                        onClick={async () => {
                          try {
                            await command(`/v1/business/${id}/staff`, {
                              uid: s.uid,
                              remove: true,
                            });
                            dash.reload();
                          } catch (e) {
                            setError(friendly(e));
                          }
                        }}
                      >
                        Remove access
                      </Button>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )
      )}
      {profile && data && (
        <BusinessProfile
          association={association}
          value={data.restaurant}
          onClose={() => setProfile(false)}
          onSaved={() => {
            setProfile(false);
            dash.reload();
          }}
        />
      )}
      {tables && data && (
        <TablesEditor
          merchantId={id}
          restaurant={data.restaurant}
          onClose={() => setTables(false)}
          onSaved={() => {
            setTables(false);
            dash.reload();
          }}
        />
      )}
      {item && (
        <ItemEditor
          association={association}
          item={item}
          onClose={() => setItem(null)}
          onSaved={() => {
            setItem(null);
            dash.reload();
          }}
        />
      )}
      {promotion && (
        <PromotionEditor
          association={association}
          item={promotion}
          onClose={() => setPromotion(null)}
          onSaved={() => {
            setPromotion(null);
            dash.reload();
          }}
        />
      )}
      {rider && (
        <Dialog
          title="Add a platform rider"
          onClose={() => {
            if (!busy) setRider(false);
          }}
        >
          <p>
            Use the email or phone on their registered Aura rider account. A
            rider can only belong to one business.
          </p>
          <div style={{ minHeight: 80 }} />
          <Field label="Rider email or phone">
            <input
              autoComplete="off"
              value={riderContact}
              onChange={(e) => setRiderContact(e.target.value)}
              placeholder="Email or +231 phone number"
            />
          </Field>
          <Notice error={error} />
          <Button disabled={busy || !riderContact.trim()} onClick={addRider}>
            {busy ? "Adding..." : "Add rider"}
          </Button>
        </Dialog>
      )}
      {invite && (
        <TeamInvite merchantId={id} onClose={() => setInvite(false)} />
      )}
      {order && <OrderDetail id={order} onClose={() => setOrder(null)} />}
    </section>
  );
}

export function MerchantOrder({
  order: o,
  drivers,
  merchantId,
  onUpdated,
  onDetails,
}: {
  order: Row;
  drivers: Row[];
  merchantId: string;
  onUpdated: () => void;
  onDetails: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [assign, setAssign] = useState(false),
    [driver, setDriver] = useState(""),
    [reject, setReject] = useState(false),
    [reason, setReason] = useState("");
  const grocery = o.orderType === "supermarket" || o.orderType === "lifestyle";
  const stage = o.fulfillmentStage || "awaiting_confirmation";
  const next = grocery
    ? (
        {
          awaiting_confirmation: ["accepted"],
          accepted: ["processing", "preparing"],
          processing: ["preparing"],
          preparing: [
            o.diningMode === "pickup"
              ? "ready_for_pickup"
              : "ready_for_dispatch",
          ],
          ready_for_pickup: ["delivered"],
          ready_for_dispatch: ["dispatched"],
          dispatched: ["out_for_delivery"],
          out_for_delivery: ["delivered"],
        } as Row
      )[stage] || []
    : o.status === "received"
      ? ["preparing"]
      : o.status === "preparing"
        ? ["plating"]
        : o.status === "plating" && o.diningMode !== "delivery"
          ? ["completed"]
          : [];
  const update = async (status: string) => {
    setBusy(true);
    setError(null);
    try {
      await command(
        `/v1/orders/${o.id}/${grocery ? "fulfillment" : "transition"}`,
        grocery
          ? { stage: status, expectedVersion: o.version, reason }
          : { status, expectedVersion: o.version, reason },
      );
      setReject(false);
      onUpdated();
      if (
        status === "plating" &&
        o.diningMode === "delivery" &&
        !o.assignedDriverId &&
        drivers.length
      )
        setAssign(true);
    } catch (e) {
      setError(friendly(e));
      onUpdated();
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="a-list-card">
      <div className="a-row between">
        <div>
          <span className="a-eyebrow">{label(o.diningMode)}</span>
          <h3>{o.customerName || "Customer"}</h3>
          <small>
            {o.id} ·{" "}
            {new Date(o.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </small>
        </div>
        <span className="a-status">{label(grocery ? stage : o.status)}</span>
      </div>
      {o.diningTable && (
        <p>
          {o.diningTable.area} · {o.diningTable.name}
        </p>
      )}
      <section style={{ margin: "20px 0" }}>
        {(o.items || []).map((l: Row, i: number) => (
          <div className="a-cart-line" style={{ marginBottom: 12 }} key={i}>
            <Photo src={imageOf(l.menuItem || {})} alt={l.menuItem?.name} />
            <div>
              <strong>
                {l.quantity} × {l.menuItem?.name}
              </strong>
              {l.specialInstructions && (
                <small style={{ display: "block" }}>
                  {l.specialInstructions}
                </small>
              )}
            </div>
            <strong>{money(l.itemTotal)}</strong>
          </div>
        ))}
      </section>
      <div className="a-row between">
        <strong>{money(o.total)}</strong>
        <button className="a-text-link" onClick={onDetails}>
          View full details <ArrowRight size={15} />
        </button>
      </div>
      {o.assignedDriverId && (
        <p>
          <Truck size={15} />
          {o.assignedDriverName || "Assigned courier"}{" "}
          {o.assignedDriverPhone && (
            <a href={`tel:${o.assignedDriverPhone}`} className="a-text-link">
              Call rider
            </a>
          )}
        </p>
      )}
      {!o.assignedDriverId &&
        o.diningMode === "delivery" &&
        o.status === "plating" &&
        !grocery && (
          <p>
            Finding an available rider near your kitchen. Your own team is
            checked first.
          </p>
        )}
      <div className="a-order-actions">
        {next.map((v: string) => (
          <Button key={v} disabled={busy} onClick={() => update(v)}>
            {v === "preparing" && !grocery
              ? "Accept & prepare"
              : v === "plating"
                ? "Food is ready"
                : label(v)}
          </Button>
        ))}
        {(o.status === "received" ||
          (grocery && stage === "awaiting_confirmation")) && (
          <Button
            secondary
            danger
            disabled={busy}
            onClick={() => setReject(true)}
          >
            Decline order
          </Button>
        )}
        {o.orderType !== "lifestyle" &&
          o.diningMode === "delivery" &&
          !o.assignedDriverId &&
          !["cancelled", "completed"].includes(o.status) && (
            <Button secondary disabled={busy} onClick={() => setAssign(true)}>
              Assign rider
            </Button>
          )}
        {o.assignedDriverId &&
          !grocery &&
          ["preparing", "plating"].includes(o.status) && (
            <Button
              secondary
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await command(`/v1/orders/${o.id}/delivery-reassign`, {
                    expectedVersion: o.version,
                  });
                  onUpdated();
                } catch (e) {
                  setError(friendly(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Find another rider
            </Button>
          )}
      </div>
      <Notice error={error} />
      {assign && (
        <Dialog
          title="Assign a delivery rider"
          onClose={() => setAssign(false)}
        >
          <p>
            Only available registered riders attached to this business can be
            assigned.
          </p>
          <Select
            label="Available rider"
            value={driver}
            onChange={setDriver}
            options={drivers
              .filter((d) => d.availability === "available")
              .map((d) => ({ value: d.uid, label: d.name || d.uid }))}
          />
          {!drivers.some((d) => d.availability === "available") && (
            <p>
              No attached rider is available right now. Food orders continue
              automatic matching in the background.
            </p>
          )}
          <Notice error={error} />
          <Button
            disabled={busy || !driver}
            onClick={async () => {
              setBusy(true);
              try {
                await command(`/v1/business/${merchantId}/assign`, {
                  orderId: o.id,
                  driverId: driver,
                  expectedVersion: o.version,
                });
                setAssign(false);
                onUpdated();
              } catch (e) {
                setError(friendly(e));
                onUpdated();
              } finally {
                setBusy(false);
              }
            }}
          >
            Assign rider
          </Button>
        </Dialog>
      )}
      {reject && (
        <Dialog title="Decline this order" onClose={() => setReject(false)}>
          <Field label="Reason for the customer">
            <textarea
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Button
            danger
            disabled={busy || reason.trim().length < 3}
            onClick={() => update(grocery ? "rejected" : "cancelled")}
          >
            Decline and notify customer
          </Button>
          <Notice error={error} />
        </Dialog>
      )}
    </article>
  );
}
function ListingWorkspace({
  association,
  onBack,
  initialProfile,
}: {
  association: Row;
  onBack: () => void;
  initialProfile: boolean;
}) {
  const kind = association.kind === "motors" ? "motor" : association.kind,
    id = association.merchantId,
    list = useRemote(`/v1/owner-listings/${kind}`),
    profile = useRemote(`/v1/business-profiles/${id}`),
    [editing, setEditing] = useState<Row | null>(null),
    [promotion, setPromotion] = useState<Row | null>(null),
    [editProfile, setEditProfile] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const asked = useRef(false);
  useEffect(() => {
    if (
      profile.data &&
      (initialProfile || profile.data.profileRequired) &&
      !asked.current
    ) {
      asked.current = true;
      setEditProfile(true);
    }
  }, [profile.data]);
  const rows = (list.data?.listings || [])
    .filter(
      (p: Row) =>
        p.workspaceId === id || (kind === "lifestyle" && p.vendorId === id),
    )
    .filter(
      (p: Row) =>
        (filter === "all" ||
          (filter === "published" ? p.published : !p.published)) &&
        nameOf(p).toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <section className="a-page">
      <button className="a-text-link" onClick={onBack}>
        <ArrowLeft size={16} />
        Business workspaces
      </button>
      <div className="a-admin-intro">
        <div>
          <span className="a-eyebrow">
            YOUR{" "}
            {kind === "property"
              ? "HOMES"
              : kind === "motor"
                ? "MOTORS"
                : "LIFESTYLE"}{" "}
            WORKSPACE
          </span>
          <h1>{profile.data?.profile?.name || association.name}</h1>
          <span
            className={`a-status ${association.businessStatus || association.status}`}
          >
            {label(association.businessStatus || association.status)}
          </span>
        </div>
        <Button secondary onClick={() => setEditProfile(true)}>
          <Settings size={17} />
          Edit business details
        </Button>
      </div>
      {profile.data?.profileRequired && (
        <div className="a-warning">
          Complete your business details before adding listings.
        </div>
      )}
      <Notice error={list.error || profile.error} retry={list.reload} />
      <div className="a-catalog-top">
        <input
          placeholder="Search your listings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          disabled={profile.data?.profileRequired || !profile.data}
          onClick={() => setEditing({})}
        >
          <Plus size={17} />
          Add listing
        </Button>
      </div>
      <div className="a-chips">
        {["all", "published", "drafts"].map((v) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {label(v)}
          </button>
        ))}
      </div>
      <div className="a-grid">
        {rows.map((p: Row) => (
          <article className="a-card" key={p.id}>
            <Photo
              src={imageOf(p)}
              alt={nameOf(p)}
              className="a-business-photo"
            />
            <h3>{nameOf(p)}</h3>
            <p>
              {money(p.priceUsd)} · {p.published ? "Published" : "Draft"}
            </p>
            <div className="a-order-actions">
              <Button secondary onClick={() => setEditing(p)}>
                Edit / publish
              </Button>
              <Button secondary onClick={() => setPromotion(p)}>
                <Tag size={16} />
                Promotion
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && !list.loading && (
        <Empty title="Room for your next great listing">
          <p>
            Create a listing with photos and a video, then publish after your
            business is approved.
          </p>
        </Empty>
      )}
      {editProfile && (
        <BusinessProfile
          association={association}
          value={profile.data?.profile || { name: association.name }}
          onClose={() => setEditProfile(false)}
          onSaved={() => {
            setEditProfile(false);
            profile.reload();
          }}
        />
      )}
      {editing && (
        <ItemEditor
          association={association}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
      {promotion && (
        <PromotionEditor
          association={association}
          item={promotion}
          onClose={() => setPromotion(null)}
          onSaved={() => {
            setPromotion(null);
            list.reload();
          }}
        />
      )}
    </section>
  );
}
function BusinessProfile({
  association,
  value,
  onClose,
  onSaved,
}: {
  association: Row;
  value: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Row>({ ...value }),
    [location, setLocation] = useState(false),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState<string | null>(null);
  const commerce = ["restaurant", "supermarket"].includes(association.kind),
    kind = association.kind === "motors" ? "motor" : association.kind,
    id = association.merchantId;
  const patch = (p: Row) => setData((old) => ({ ...old, ...p }));
  const fields = [
    "name",
    "neighborhood",
    "phone",
    ...(!commerce ? ["description"] : []),
  ];
  const save = async () => {
    setBusy(true);
    try {
      const body = Object.fromEntries(
        [
          "name",
          "address",
          "neighborhood",
          "phone",
          "description",
          "heroImage",
          "coords",
          ...(commerce
            ? [
                "cuisine",
                "openingTime",
                "closingTime",
                "deliveryFeeUsd",
                "minOrderUsd",
              ]
            : []),
        ]
          .filter((k) => data[k] !== undefined)
          .map((k) => [k, data[k]]),
      );
      await command(
        commerce ? `/v1/business/${id}/profile` : `/v1/business-profiles/${id}`,
        body,
      );
      onSaved();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title="Business profile"
      onClose={() => {
        if (!busy && !uploading) onClose();
      }}
    >
      <MediaEditor
        scope={
          commerce
            ? `/v1/business/${id}`
            : `/v1/listing-workspaces/${kind}/${id}`
        }
        imagesOnly
        value={{ images: data.heroImage ? [data.heroImage] : [] }}
        onChange={(v) => patch({ heroImage: v.images[0] || "" })}
        onBusy={setUploading}
      />
      {commerce && association.kind === "restaurant" && (
        <>
          <h3 style={{ marginTop: 24 }}>Cuisine</h3>
          <div className="a-chips">
            {[
              "Liberian",
              "West African",
              "Pizza",
              "Grill",
              "Seafood",
              "Vegetarian",
              "Drinks",
            ].map((c) => (
              <button
                className={
                  String(data.cuisine || "").includes(c) ? "active" : ""
                }
                key={c}
                onClick={() => {
                  const current = String(data.cuisine || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  patch({
                    cuisine: (current.includes(c)
                      ? current.filter((v) => v !== c)
                      : [...current, c]
                    ).join(", "),
                  });
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <Field label="Cuisine (you can add your own)">
            <input
              value={data.cuisine || ""}
              onChange={(e) => patch({ cuisine: e.target.value })}
            />
          </Field>
        </>
      )}
      {fields.map((f) => (
        <Field key={f} label={label(f)}>
          <input
            maxLength={f === "description" ? 500 : 150}
            value={data[f] || ""}
            onChange={(e) => patch({ [f]: e.target.value })}
          />
        </Field>
      ))}
      <section className="a-card">
        <h3>Business address</h3>
        <p>{data.address || "Choose your address and map pin."}</p>
        <Button secondary onClick={() => setLocation(true)}>
          <MapPin size={17} />
          {data.coords ? "Change business address" : "Choose business address"}
        </Button>
      </section>
      {commerce && (
        <div className="a-two">
          {["deliveryFeeUsd", "minOrderUsd"].map((f) => (
            <Field
              key={f}
              label={
                f === "deliveryFeeUsd"
                  ? "Delivery fee (USD)"
                  : "Minimum order (USD)"
              }
            >
              <input
                type="number"
                min={0}
                max={1000}
                step="0.01"
                value={data[f] ?? 0}
                onChange={(e) => patch({ [f]: Number(e.target.value) })}
              />
            </Field>
          ))}
        </div>
      )}
      {commerce && (
        <div className="a-two">
          {["openingTime", "closingTime"].map((f) => (
            <Select
              key={f}
              label={f === "openingTime" ? "Opens at" : "Closes at"}
              value={data[f] || ""}
              options={[
                "",
                ...Array.from(
                  { length: 48 },
                  (_, i) =>
                    String(Math.floor(i / 2)).padStart(2, "0") +
                    ":" +
                    (i % 2 ? "30" : "00"),
                ),
              ]}
              onChange={(v) => patch({ [f]: v })}
            />
          ))}
        </div>
      )}
      <Notice error={error} />
      <Button
        style={{ width: "100%", marginTop: 22 }}
        disabled={busy || uploading}
        onClick={save}
      >
        {busy ? "Saving..." : "Save business details"}
      </Button>
      {location && (
        <LocationDialog
          initial={data}
          title="Business address"
          onClose={() => setLocation(false)}
          onChoose={(v) => {
            patch(v);
            setLocation(false);
          }}
        />
      )}
    </Dialog>
  );
}

function ItemEditor({
  association,
  item,
  onClose,
  onSaved,
}: {
  association: Row;
  item: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const commerce = ["restaurant", "supermarket"].includes(association.kind),
    kind = association.kind === "motors" ? "motor" : association.kind,
    id = association.merchantId,
    grocery = association.kind === "supermarket";
  const [data, setData] = useState<Row>({
      name: "",
      title: "",
      description: "",
      price: 0,
      priceUsd: 0,
      category: "",
      categoryLabel: "",
      subcategory: "",
      images: [],
      videoUrl: null,
      videoPosition: null,
      isAvailable: true,
      published: false,
      dealType: "rent",
      propertyType: "apartment",
      pricePeriod: "month",
      type: "sale",
      listingType: "sale",
      department: "electronics",
      audience: "all",
      inventoryCount: commerce && !grocery ? null : 0,
      availableAddons: [],
      ...item,
    }),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState<string | null>(null);
  const pending = useRef<{ body: Row; key: string } | null>(null),
    [uncertain, setUncertain] = useState(false),
    key = useRef(crypto.randomUUID()),
    patch = (p: Row) => {
      setData((old) => ({ ...old, ...p }));
      key.current = crypto.randomUUID();
    };
  const presets = commerce
    ? grocery
      ? ["Fresh produce", "Dairy", "Pantry", "Household", "Frozen", "Drinks"]
      : [
          "Rice",
          "Pizza",
          "Grill",
          "Seafood",
          "Pasta",
          "Breakfast",
          "Dessert",
          "Drinks",
        ]
    : kind === "lifestyle"
      ? data.department === "electronics"
        ? ["Phones", "Computers", "Accessories", "Home appliances"]
        : data.department === "shoes"
          ? ["Sneakers", "Sandals", "Formal shoes", "Kids shoes"]
          : ["Dresses", "Shirts", "Trousers", "Bags"]
      : kind === "property"
        ? ["Apartment", "House", "Commercial", "Land"]
        : ["Cars", "SUVs", "Motorbikes", "Parts"];
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = commerce
        ? {
            ...(data.id ? { id: data.id } : {}),
            name: data.name,
            price: Number(data.price),
            description: data.description,
            category: data.category,
            images: data.images,
            videoUrl: data.videoUrl,
            videoPosition: data.videoPosition,
            isAvailable: data.isAvailable,
            inventoryCount: data.inventoryCount,
            availableAddons: data.availableAddons,
            prepTimeMinutes: Number(data.prepTimeMinutes || 15),
            availableSpiceLevels: data.availableSpiceLevels || [],
            unitWeight: data.unitWeight || "",
          }
        : {
            ...data,
            priceUsd: Number(data.priceUsd),
            workspaceId: id,
            ownerUid: undefined,
            ownerId: undefined,
            publicationApproved: undefined,
            rating: undefined,
            reviewsCount: undefined,
          };
      pending.current ??= { body, key: key.current };
      setUncertain(true);
      await command(
        commerce
          ? `/v1/business/${id}/menu`
          : item.id
            ? `/v1/listings/${kind}/${item.id}/manage`
            : `/v1/listings/${kind}`,
        pending.current.body,
        pending.current.key,
      );
      setUncertain(false);
      onSaved();
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
  const input = (field: string, title: string, type = "text") => (
    <Field key={field} label={title}>
      <input
        type={type}
        maxLength={160}
        min={type === "number" ? 0 : undefined}
        step={field === "price" || field === "priceUsd" ? "0.01" : undefined}
        value={data[field] ?? ""}
        onChange={(e) =>
          patch({
            [field]:
              type === "number"
                ? field === "inventoryCount" && e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
          })
        }
      />
    </Field>
  );
  return (
    <Dialog
      title={
        item.id
          ? "Edit item"
          : commerce
            ? grocery
              ? "Add a product"
              : "Add a dish"
            : "Create a listing"
      }
      onClose={() => {
        if (!busy && !uploading) onClose();
      }}
      wide
    >
      <fieldset disabled={busy || uncertain}>
        <div className="a-two">
          <div>
            <MediaEditor
              scope={
                commerce
                  ? `/v1/business/${id}`
                  : `/v1/listing-workspaces/${kind}/${id}`
              }
              value={data}
              onChange={patch}
              onBusy={setUploading}
            />
            {input(
              commerce ? "name" : "title",
              commerce ? "Item name" : "Listing title",
            )}
            {input(
              commerce ? "price" : "priceUsd",
              "Listed price (USD)",
              "number",
            )}
            <Field label="Description">
              <textarea
                rows={4}
                maxLength={2000}
                value={data.description || ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            {!commerce && (
              <label className="a-row" style={{ margin: "20px 0" }}>
                <input
                  style={{ width: 18 }}
                  type="checkbox"
                  checked={!!data.published}
                  onChange={(e) => patch({ published: e.target.checked })}
                />
                Publish this listing (approved businesses)
              </label>
            )}
          </div>
          <div>
            {kind === "lifestyle" && (
              <>
                <Select
                  label="Department"
                  value={data.department}
                  onChange={(v) => patch({ department: v, category: v })}
                  options={["electronics", "fashion", "shoes"]}
                />
                <Select
                  label="Who is it for?"
                  value={data.audience}
                  onChange={(v) => patch({ audience: v })}
                  options={[
                    { value: "all", label: "Everyone" },
                    { value: "kids", label: "Kids" },
                    { value: "men", label: "Men" },
                    { value: "women", label: "Women" },
                    { value: "unisex", label: "Unisex" },
                  ]}
                />
              </>
            )}
            <h3>Category</h3>
            <div className="a-chips">
              {presets.map((c) => (
                <button
                  key={c}
                  className={
                    (commerce ? data.category : data.categoryLabel) === c
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    patch({ [commerce ? "category" : "categoryLabel"]: c })
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            {input(
              commerce ? "category" : "categoryLabel",
              "Category (or enter your own)",
            )}
            {!commerce && input("subcategory", "Subcategory, e.g. iPhone X")}
            {commerce && (
              <>
                {input("inventoryCount", "Stock quantity", "number")}
                <label className="a-row">
                  <input
                    style={{ width: 18 }}
                    type="checkbox"
                    checked={data.isAvailable}
                    onChange={(e) => patch({ isAvailable: e.target.checked })}
                  />
                  Available to order
                </label>
                {!grocery && (
                  <>
                    {input(
                      "prepTimeMinutes",
                      "Preparation time (minutes)",
                      "number",
                    )}
                    <h3 style={{ marginTop: 24 }}>Add-ons</h3>
                    <p>Optional extras with clear names and prices.</p>
                    <div className="a-chips">
                      {(String(data.category).toLowerCase().includes("pizza")
                        ? [
                            ["Coke 1L", 2.5],
                            ["Extra cheese", 1],
                            ["Water", 1],
                          ]
                        : [
                            ["Water", 1],
                            ["Extra rice", 1.5],
                          ]
                      ).map(([name, price]) => (
                        <button
                          key={name}
                          onClick={() =>
                            patch({
                              availableAddons: [
                                ...data.availableAddons,
                                { id: crypto.randomUUID(), name, price },
                              ],
                            })
                          }
                        >
                          + {name} · {money(Number(price))}
                        </button>
                      ))}
                    </div>
                    {(data.availableAddons || []).map((a: Row, i: number) => (
                      <div
                        className="a-row"
                        key={a.id}
                        style={{ margin: "10px 0" }}
                      >
                        <input
                          aria-label="Add-on name"
                          placeholder="Name"
                          value={a.name}
                          onChange={(e) =>
                            patch({
                              availableAddons: data.availableAddons.map(
                                (x: Row, n: number) =>
                                  n === i ? { ...x, name: e.target.value } : x,
                              ),
                            })
                          }
                        />
                        <input
                          aria-label="Add-on price"
                          type="number"
                          min={0}
                          step="0.01"
                          style={{ width: 90 }}
                          value={a.price}
                          onChange={(e) =>
                            patch({
                              availableAddons: data.availableAddons.map(
                                (x: Row, n: number) =>
                                  n === i
                                    ? { ...x, price: Number(e.target.value) }
                                    : x,
                              ),
                            })
                          }
                        />
                        <button
                          aria-label="Remove add-on"
                          onClick={() =>
                            patch({
                              availableAddons: data.availableAddons.filter(
                                (_: Row, n: number) => n !== i,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <Button
                      secondary
                      onClick={() =>
                        patch({
                          availableAddons: [
                            ...data.availableAddons,
                            { id: crypto.randomUUID(), name: "", price: 0 },
                          ],
                        })
                      }
                    >
                      Add an extra
                    </Button>
                  </>
                )}
              </>
            )}
            {kind === "property" && (
              <>
                <Select
                  label="Deal type"
                  value={data.dealType}
                  options={["rent", "buy", "shortStay"]}
                  onChange={(v) =>
                    patch({
                      dealType: v,
                      pricePeriod: v === "buy" ? "total" : "month",
                    })
                  }
                />
                <Select
                  label="Property type"
                  value={data.propertyType}
                  options={["apartment", "house", "commercial", "land"]}
                  onChange={(v) => patch({ propertyType: v })}
                />
                {data.propertyType !== "land" && (
                  <div className="a-two">
                    {input("bedrooms", "Bedrooms", "number")}
                    {input("bathrooms", "Bathrooms", "number")}
                  </div>
                )}
                {input("sizeSqm", "Size (m²)", "number")}
                {input("neighborhood", "Neighborhood")}
                {input("address", "Address")}
                {input("agentName", "Contact name")}
                {input("agentPhone", "Phone (+231...)")}
                {input("agentWhatsapp", "WhatsApp (+231...)")}
                <Select
                  label="Price period"
                  value={data.pricePeriod}
                  options={["total", "month", "year", "night"]}
                  onChange={(v) => patch({ pricePeriod: v })}
                />
              </>
            )}
            {kind === "motor" && (
              <>
                <Select
                  label="Listing type"
                  value={data.type}
                  options={["sale", "rental", "parts"]}
                  onChange={(v) => patch({ type: v, listingType: v })}
                />
                {input("make", "Make / compatible make")}
                {input("model", "Model / compatible model")}
                {data.type !== "parts" && (
                  <>
                    {input("year", "Year", "number")}
                    <Select
                      label="Transmission"
                      value={data.transmission || "automatic"}
                      options={["automatic", "manual"]}
                      onChange={(v) => patch({ transmission: v })}
                    />
                    <Select
                      label="Fuel"
                      value={data.fuelType || "petrol"}
                      options={["petrol", "diesel", "hybrid", "electric"]}
                      onChange={(v) => patch({ fuelType: v })}
                    />
                    {input("mileage", "Mileage")}
                  </>
                )}
                {input("condition", "Condition")}
                {input("location", "Location")}
                {input("dealerName", "Contact name")}
                {input("dealerPhone", "Phone (+231...)")}
                {input("dealerWhatsapp", "WhatsApp (+231...)")}
              </>
            )}
            {kind === "lifestyle" && (
              <>
                {input("brand", "Brand")}
                {input("condition", "Condition")}
                {input("vendorName", "Seller name")}
                {input("vendorLocation", "Location")}
                {input("vendorPhone", "Phone (+231...)")}
                {input("vendorWhatsapp", "WhatsApp (+231...)")}
                {input("inventoryCount", "Available stock", "number")}
                <Field label="Sizes (separate with commas)">
                  <input
                    value={(data.availableSizes || []).join(", ")}
                    onChange={(e) =>
                      patch({
                        availableSizes: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <Field label="Colours (separate with commas)">
                  <input
                    value={(data.availableColors || []).join(", ")}
                    onChange={(e) =>
                      patch({
                        availableColors: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      </fieldset>
      <Notice error={error} />
      <Button
        disabled={busy || uploading}
        onClick={save}
        style={{ width: "100%", marginTop: 24 }}
      >
        {busy
          ? "Saving..."
          : uncertain
            ? "Retry save confirmation"
            : data.published && !commerce
              ? "Save & publish"
              : "Save item"}
      </Button>
    </Dialog>
  );
}
export function PromotionEditor({
  association,
  item,
  onClose,
  onSaved,
}: {
  association: Row;
  item: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(item.promotion?.type || "sale"),
    [price, setPrice] = useState(String(item.promotion?.salePriceUsd ?? "")),
    [title, setTitle] = useState(item.promotion?.label || ""),
    [starts, setStarts] = useState(item.promotion?.startsAt || Date.now()),
    [ends, setEnds] = useState(
      item.promotion?.endsAt || Date.now() + 7 * 86400000,
    ),
    [year, setYear] = useState(String(new Date().getFullYear())),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const key = useRef(crypto.randomUUID()),
    kind = association.kind === "motors" ? "motor" : association.kind,
    commerce = ["restaurant", "supermarket"].includes(kind);
  const save = async (cancel = false) => {
    setBusy(true);
    try {
      await command(
        commerce
          ? `/v1/business/${association.merchantId}/menu/${item.id}/promotion`
          : `/v1/listings/${kind}/${item.id}/promotion`,
        cancel
          ? { cancel: true }
          : {
              type,
              salePriceUsd: Number(price),
              label: title || undefined,
              startsAt: starts,
              endsAt: ends,
              year: Number(year),
              expectedPriceUsd: Number(item.priceUsd ?? item.price),
            },
        key.current,
      );
      onSaved();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title="A little more value"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h3>{nameOf(item)}</h3>
      <p>
        Regular price {money(item.priceUsd ?? item.price)}. Offers become
        visible only while active.
      </p>
      <Select
        label="Offer type"
        value={type}
        onChange={setType}
        options={[
          { value: "sale", label: "On sale" },
          { value: "black_friday", label: "Black Friday" },
        ]}
      />
      <Field label="Sale price (USD)">
        <input
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </Field>
      <Field label="Offer label">
        <input
          maxLength={60}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A good find, for less"
        />
      </Field>
      {type === "black_friday" ? (
        <>
          <Select
            label="Black Friday year"
            value={year}
            onChange={setYear}
            options={[0, 1, 2].map((n) => String(new Date().getFullYear() + n))}
          />
          <p>
            The offer runs from Black Friday through Cyber Monday. The server
            sets the exact dates.
          </p>
        </>
      ) : (
        <>
          <DateTimeField label="Starts" value={starts} onChange={setStarts} />
          <DateTimeField label="Ends" value={ends} onChange={setEnds} />
        </>
      )}
      <Notice error={error} />
      <div className="a-row">
        <Button disabled={busy || price === ""} onClick={() => save()}>
          {busy ? "Saving..." : "Save offer"}
        </Button>
        {item.promotion && (
          <Button secondary danger disabled={busy} onClick={() => save(true)}>
            End offer
          </Button>
        )}
      </div>
    </Dialog>
  );
}

function TeamInvite({
  merchantId,
  onClose,
}: {
  merchantId: string;
  onClose: () => void;
}) {
  const [contact, setContact] = useState(""),
    [invite, setInvite] = useState<Row | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    { toast } = usePlatform();
  const list = useRemote(`/v1/business/${merchantId}/invitations`),
    url = invite
      ? `${location.origin}/join?token=${encodeURIComponent(invite.token)}`
      : "";
  return (
    <Dialog title="Invite a team member" onClose={onClose}>
      <p>
        Enter their email or verified phone. They can register or sign in with
        that same identity to join.
      </p>
      <Field label="Email or phone">
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="name@example.com or +231..."
        />
      </Field>
      <Button
        disabled={busy || !contact.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await command(`/v1/business/${merchantId}/invitations`, {
              contact: contact.trim(),
            });
            setInvite(r.invitation);
            list.reload();
          } catch (e) {
            setError(friendly(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Creating invitation..." : "Create join link"}
      </Button>
      {invite && (
        <section className="a-card" style={{ marginTop: 18 }}>
          <h3>Ready to share</h3>
          <p style={{ overflowWrap: "anywhere" }}>{url}</p>
          <div className="a-row">
            <Button
              secondary
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                toast("Invitation link copied.");
              }}
            >
              <Copy size={16} />
              Copy link
            </Button>
            <a
              className="a-button"
              href={`https://wa.me/?text=${encodeURIComponent("Join our team on Aura: " + url)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          </div>
          <small>Expires {new Date(invite.expiresAt).toLocaleString()}</small>
        </section>
      )}
      <Notice error={error || list.error} />
      {(list.data?.invitations || []).map((i: Row) => (
        <div key={i.id} className="a-list-card">
          <strong>{i.contact}</strong>
          <p>{label(i.status)}</p>
          {i.status === "pending" && (
            <Button
              secondary
              danger
              onClick={async () => {
                try {
                  await command(
                    `/v1/business/${merchantId}/invitations/${i.id}/revoke`,
                    {},
                  );
                  list.reload();
                } catch (e) {
                  setError(friendly(e));
                }
              }}
            >
              Revoke invitation
            </Button>
          )}
        </div>
      ))}
    </Dialog>
  );
}
export function JoinTeam() {
  const token = new URLSearchParams(location.search).get("token") || "",
    [value, setValue] = useState(token),
    [preview, setPreview] = useState<Row | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    { requireLogin, toast } = usePlatform();
  return (
    <section className="a-page narrow">
      <h1>A place on the team.</h1>
      <p>Use the same verified email or phone that received this invitation.</p>
      <Field label="Invitation link or token">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setPreview(null);
          }}
        />
      </Field>
      <Notice error={error} />
      <Button
        disabled={busy}
        onClick={async () => {
          if (!(await requireLogin())) return;
          setBusy(true);
          try {
            const t = value.includes("?")
              ? new URL(value).searchParams.get("token")
              : value;
            const r = await command(
              preview
                ? "/v1/team-invitations/accept"
                : "/v1/team-invitations/preview",
              { token: t },
            );
            if (preview) {
              toast("You joined " + r.businessName);
              go("/portal");
            } else setPreview(r.invitation);
          } catch (e) {
            setError(friendly(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Please wait..."
          : preview
            ? "Accept invitation"
            : "Review invitation"}
      </Button>
      {preview && (
        <div className="a-card">
          <h2>{preview.businessName}</h2>
          <p>Invitation {label(preview.status)}</p>
        </div>
      )}
    </section>
  );
}
