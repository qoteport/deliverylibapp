import React, { useEffect, useRef, useState } from "react";
import {
  Heart,
  Search,
  SlidersHorizontal,
  Plus,
  MessageCircle,
  Phone,
  Share2,
  ShoppingBag,
  Store,
  Grid2X2,
  Bookmark,
  ShoppingBasket,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { command } from "../utils/commandApi";
import { useAuth } from "../context/AuthContext";
import { useRemote, friendly } from "./hooks";
import { usePlatform, go } from "./context";
import {
  Kind,
  Row,
  catalogs,
  titles,
  money,
  nameOf,
  imageOf,
  deal,
  recommend,
  label,
} from "./model";
import {
  Photo,
  Button,
  Dialog,
  Select,
  Field,
  Notice,
  Empty,
  Busy,
  ShoeIcon,
} from "./ui";
import { Gallery } from "./Gallery";
import { CartSheet } from "./Commerce";
const merchantOf = (r: Row, k: Kind) =>
  k === "food"
    ? r.restaurantId
    : k === "grocery"
      ? r.supermarketId
      : r.vendorId || r.workspaceId;
export function Catalog({ kind }: { kind: Kind }) {
  const { user } = useAuth();
  const { saved, toggleSaved, cart, requireLogin } = usePlatform(),
    feed = useRemote(`/v1/catalog/${catalogs[kind]}`, undefined, 0, false),
    shops = useRemote(
      ["food", "grocery"].includes(kind)
        ? `/v1/catalog/${kind === "food" ? "restaurants" : "supermarkets"}`
        : null,
      undefined,
      0,
      false,
    );
  const [items, setItems] = useState<Row[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [merchant, setMerchant] = useState(""),
    [tab, setTab] = useState(
      new URLSearchParams(location.search).get("tab") === "saved"
        ? "saved"
        : "shopping",
    ),
    [department, setDepartment] = useState(""),
    [category, setCategory] = useState(""),
    [filters, setFilters] = useState<Row>({}),
    [filterOpen, setFilterOpen] = useState(false),
    [detail, setDetail] = useState<Row | null>(null),
    [basket, setBasket] = useState(false),
    [nearby, setNearby] = useState("");
  const manual = useRef(false);
  const familiar = useRemote(
    kind === "food" && merchant && user
      ? "/v1/food-recommendations?restaurantId=" + encodeURIComponent(merchant)
      : null,
  );
  useEffect(() => {
    if (new URLSearchParams(location.search).get("tab") === "saved")
      void requireLogin().then((ok) => {
        if (ok) setTab("saved");
      });
  }, [location.search]);
  useEffect(() => {
    if (feed.data) {
      setItems(feed.data.items || []);
      setCursor(feed.data.nextPageToken || null);
    }
  }, [feed.data]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("item");
    if (!id) return;
    const found = items.find((i) => i.id === id);
    if (found) {
      setDetail(found);
      return;
    }
    if (["property", "motor", "lifestyle"].includes(kind)) {
      let alive = true;
      void command(
        `/v1/shared-listings/${kind}/${encodeURIComponent(id)}`,
        undefined,
        undefined,
        false,
      )
        .then((r) => {
          if (alive) setDetail(r.item);
        })
        .catch((e) => {
          if (alive) setError(friendly(e));
        });
      return () => {
        alive = false;
      };
    }
  }, [items, location.search]);
  useEffect(() => {
    if (
      kind !== "food" ||
      !shops.data ||
      manual.current ||
      !navigator.geolocation
    )
      return;
    navigator.geolocation.getCurrentPosition(
      (fix) => {
        if (manual.current || fix.coords.accuracy > 25) return;
        const matches = (shops.data.items || []).filter((s: Row) => {
          if (!s.coords) return false;
          const lat = (s.coords.lat - fix.coords.latitude) * 111320,
            lng =
              (s.coords.lng - fix.coords.longitude) *
              111320 *
              Math.cos((fix.coords.latitude * Math.PI) / 180);
          return (
            Math.hypot(lat, lng) + fix.coords.accuracy <=
            Math.min(60, s.dineInRadiusMeters || 40)
          );
        });
        if (matches.length === 1) {
          setMerchant(matches[0].id);
          setNearby(matches[0].name);
          sessionStorage.setItem("aura_dining_merchant", matches[0].id);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [kind, shops.data]);
  const loadMore = async () => {
    setBusy(true);
    try {
      const next = await command(
        `/v1/catalog/${catalogs[kind]}?pageToken=${encodeURIComponent(cursor!)}`,
        undefined,
        undefined,
        false,
      );
      setItems((old) => [
        ...new Map([...old, ...next.items].map((i: Row) => [i.id, i])).values(),
      ]);
      setCursor(next.nextPageToken || null);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const dept = (r: Row) =>
    String(r.department || r.categoryLabel || r.category || "").toLowerCase();
  const filtered = items
    .filter((r) => {
      if (
        kind === "food" &&
        !merchant &&
        /drink|beverage|juice|coffee|soda/i.test(r.category || "")
      )
        return false;
      if (merchant && merchantOf(r, kind) !== merchant) return false;
      if (
        department &&
        !(
          dept(r).includes(department) ||
          (department === "electronics" &&
            /phone|computer|tablet|accessor/i.test(dept(r))) ||
          (department === "fashion" &&
            /cloth|fashion|dress|shirt/i.test(dept(r))) ||
          (department === "shoes" && /shoe|footwear|sneaker/i.test(dept(r)))
        )
      )
        return false;
      if (
        category &&
        String(r.categoryLabel || r.category || "").toLowerCase() !==
          category.toLowerCase()
      )
        return false;
      if (tab === "saved" && !saved.has(`${catalogs[kind]}:${r.id}`))
        return false;
      if (
        query &&
        !`${nameOf(r)} ${r.description || ""} ${r.categoryLabel || r.category || ""} ${r.subcategory || ""} ${r.brand || ""} ${r.make || ""} ${r.model || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      const d = deal(r);
      if (
        (filters.min && d.price < Number(filters.min)) ||
        (filters.max && d.price > Number(filters.max))
      )
        return false;
      if (
        (filters.sale && !d.active) ||
        (filters.stock && (r.inStock === false || r.isAvailable === false))
      )
        return false;
      for (const f of [
        "subcategory",
        "dealType",
        "propertyType",
        "neighborhood",
        "make",
        "condition",
        "listingType",
        "audience",
        "brand",
      ])
        if (
          filters[f] &&
          String(r[f] || "").toLowerCase() !== String(filters[f]).toLowerCase()
        )
          return false;
      if (filters.bedrooms && Number(r.bedrooms) < Number(filters.bedrooms))
        return false;
      if (filters.yearMin && Number(r.year) < Number(filters.yearMin))
        return false;
      return true;
    })
    .sort((a, b) =>
      filters.sort === "price_asc"
        ? deal(a).price - deal(b).price
        : filters.sort === "price_desc"
          ? deal(b).price - deal(a).price
          : 0,
    );
  const categories = [
    ...new Set(
      items
        .filter(
          (r) =>
            (!merchant || merchantOf(r, kind) === merchant) &&
            (!department ||
              dept(r).includes(department) ||
              (department === "electronics" &&
                /phone|computer|tablet/i.test(dept(r)))),
        )
        .map((r) => String(r.categoryLabel || r.category || "General").trim()),
    ),
  ]
    .filter(
      (c, i, a) =>
        a.findIndex((v) => v.toLowerCase() === c.toLowerCase()) === i,
    )
    .sort();
  const bf = filtered.filter((i) => deal(i).blackFriday),
    sales = filtered.filter((i) => deal(i).active && !deal(i).blackFriday);
  const spotlight = [...filtered]
    .sort(
      (a, b) =>
        Number(b.isPopular || b.isChefSpecial || 0) * 3 +
        Number(b.rating || 0) -
        Number(a.isPopular || a.isChefSpecial || 0) * 3 -
        Number(a.rating || 0),
    )
    .slice(0, 10);
  const count = cart
    .filter((l) => l.kind === kind)
    .reduce((n, l) => n + l.quantity, 0);
  const shopRows = shops.data?.items || [];
  const row = (data: Row[], heading: string, eyebrow: string) => (
    <section className="a-section">
      <div className="a-section-heading">
        <div>
          <span className="a-eyebrow">{eyebrow}</span>
          <h2>{heading}</h2>
        </div>
      </div>
      <div className="a-feature-row">
        {data.map((r) => (
          <button key={r.id} className="a-feature" onClick={() => setDetail(r)}>
            <Photo src={imageOf(r)} alt={nameOf(r)} />
            <div>
              <small>
                {deal(r).active
                  ? `SAVE ${money(deal(r).saving)}`
                  : "PICKED FOR YOUR DAY"}
              </small>
              <h3>{nameOf(r)}</h3>
              <strong>
                {money(deal(r).price)}
                {period(r)}
              </strong>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
  return (
    <>
      <section className="a-page">
        <span className="a-eyebrow">{titles[kind]} · AURA LIBERIA</span>
        <h1>
          {kind === "food"
            ? "A good day starts with good food."
            : kind === "grocery"
              ? "Good things, delivered."
              : kind === "property"
                ? "A place to call yours."
                : kind === "motor"
                  ? "Your next move starts here."
                  : "Good finds. Your way."}
        </h1>
        <p>
          {kind === "food"
            ? "Your city. Your kitchens. Your favourites."
            : kind === "grocery"
              ? "Your neighbourhood stores. Fresh finds for every day."
              : "Local people. Thoughtful finds. Explore what’s around you."}
        </p>
        {nearby && (
          <div className="a-card a-row between">
            <span>
              <MapPin size={16} />
              You’re near {nearby}. Dine-in is ready.
            </span>
            <button
              onClick={() => {
                manual.current = true;
                setMerchant("");
                setNearby("");
                sessionStorage.removeItem("aura_dining_merchant");
              }}
            >
              Show all kitchens
            </button>
          </div>
        )}
        {tab === "shopping" &&
          familiar.data?.items?.length > 0 &&
          row(
            familiar.data.items
              .map((p: Row) => items.find((i) => i.id === p.itemId))
              .filter(Boolean),
            "Your kind of meal",
            "INSPIRED BY YOUR PAST PICKS",
          )}
        {tab === "shopping" &&
          spotlight.length > 0 &&
          row(
            bf.length ? bf : spotlight,
            bf.length ? "Black Friday finds" : "In the spotlight",
            bf.length ? "LIMITED-TIME PRICES" : "SOMETHING WORTH A LOOK",
          )}
        {bf.length > 0 &&
          sales.length > 0 &&
          row(sales, "On sale today", "A LITTLE MORE VALUE")}
        {!bf.length &&
          sales.length > 0 &&
          row(sales, "On sale today", "A LITTLE MORE VALUE")}
        <div className="a-catalog-top">
          <div className="a-search">
            <Search size={20} />
            <input
              aria-label={`Search ${titles[kind]}`}
              placeholder={`Search ${kind === "grocery" ? "groceries and stores" : titles[kind].toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="a-icon"
            aria-label="Advanced filters"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal size={21} />
            {Object.values(filters).some(Boolean) && (
              <span className="a-count">•</span>
            )}
          </button>
        </div>
        <div className="a-chips">
          <button
            className={!category ? "active" : ""}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {label(c)}
            </button>
          ))}
        </div>
        {["food", "grocery"].includes(kind) && (
          <div className="a-chips">
            <button
              className={!merchant ? "active" : ""}
              onClick={() => {
                manual.current = true;
                setMerchant("");
                setNearby("");
              }}
            >
              All {kind === "food" ? "kitchens" : "shops"}
            </button>
            {shopRows.map((s: Row) => (
              <button
                key={s.id}
                className={merchant === s.id ? "active" : ""}
                onClick={() => {
                  manual.current = true;
                  setMerchant(s.id);
                  setCategory("");
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <Notice
          error={error || feed.error || shops.error}
          retry={feed.reload}
        />
        {feed.loading ? (
          <Busy />
        ) : tab === "shops" ? (
          <div className="a-grid">
            {shopRows.map((s: Row) => (
              <button
                key={s.id}
                className="a-card"
                onClick={() => {
                  setMerchant(s.id);
                  setTab("shopping");
                }}
              >
                <Photo
                  src={imageOf(s)}
                  alt={s.name}
                  className="a-business-photo"
                />
                <h3>{s.name}</h3>
                <p>{s.neighborhood}</p>
                <span className="a-text-link">
                  Explore items <ArrowRight size={16} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="a-section-heading">
              <h2>{filtered.length} finds for you</h2>
              {tab === "saved" && <span>Saved across your devices</span>}
            </div>
            {!filtered.length && (
              <Empty title="No items match">
                <p>Try a different category or reset the filters.</p>
                <Button
                  secondary
                  onClick={() => {
                    setFilters({});
                    setQuery("");
                    setCategory("");
                    setDepartment("");
                  }}
                >
                  Reset filters
                </Button>
              </Empty>
            )}
            <div className="a-grid">
              {filtered.slice(0, 12).map((r) => (
                <ProductCard
                  key={r.id}
                  item={r}
                  kind={kind}
                  onOpen={() => setDetail(r)}
                />
              ))}
            </div>
            {kind === "food" && !merchant && shopRows.length > 0 && (
              <section className="a-section">
                <div className="a-section-heading">
                  <h2>Meet the kitchens</h2>
                  <Button
                    secondary
                    onClick={() =>
                      setTab(tab === "shops" ? "shopping" : "shops")
                    }
                  >
                    Explore kitchens
                  </Button>
                </div>
                <div className="a-feature-row">
                  {shopRows.slice(0, 6).map((s: Row) => (
                    <button
                      key={s.id}
                      className="a-card a-row"
                      style={{ minWidth: 270 }}
                      onClick={() => {
                        setMerchant(s.id);
                        setCategory("");
                      }}
                    >
                      <Photo
                        src={imageOf(s)}
                        alt={s.name}
                        style={{ width: 50, height: 50 }}
                      />
                      <strong>{s.name}</strong>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {filtered.length > 12 && (
              <section className="a-section">
                <h2>More to explore</h2>
                <div className="a-grid">
                  {filtered.slice(12).map((r) => (
                    <ProductCard
                      key={r.id}
                      item={r}
                      kind={kind}
                      onOpen={() => setDetail(r)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {cursor && (
          <div className="a-section">
            <Button secondary disabled={busy} onClick={loadMore}>
              {busy ? "Loading more..." : "Load more items"}
            </Button>
          </div>
        )}
      </section>
      {["food", "grocery", "lifestyle"].includes(kind) && (
        <nav className="a-bottom-tabs" aria-label={`${titles[kind]} sections`}>
          {kind === "lifestyle" ? (
            <>
              {["electronics", "fashion", "shoes"].map((d) => (
                <button
                  key={d}
                  className={department === d ? "active" : ""}
                  onClick={() => {
                    setDepartment(department === d ? "" : d);
                    setCategory("");
                    setFilters({});
                    setTab("shopping");
                  }}
                >
                  {d === "shoes" ? (
                    <ShoeIcon size={18} />
                  ) : (
                    <Grid2X2 size={18} />
                  )}{" "}
                  {label(d)}
                </button>
              ))}
              <button onClick={() => setBasket(true)}>
                <ShoppingBag size={18} />
                Cart {count || ""}
              </button>
            </>
          ) : (
            <>
              <button
                className={tab === "shopping" ? "active" : ""}
                onClick={() => setTab("shopping")}
              >
                <Grid2X2 size={18} />
                Shopping
              </button>
              {kind === "grocery" && (
                <button
                  className={tab === "shops" ? "active" : ""}
                  onClick={() => setTab("shops")}
                >
                  <Store size={18} />
                  Shops
                </button>
              )}
              <button
                className={tab === "saved" ? "active" : ""}
                onClick={async () => {
                  if (await requireLogin()) setTab("saved");
                }}
              >
                <Bookmark size={18} />
                Saved
              </button>
              <button onClick={() => setBasket(true)}>
                <ShoppingBasket size={18} />
                Basket {count || ""}
              </button>
            </>
          )}
        </nav>
      )}
      {filterOpen && (
        <Filters
          kind={kind}
          items={items}
          value={filters}
          onApply={(v) => {
            setFilters(v);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
      {detail && (
        <ItemDetail
          item={detail}
          kind={kind}
          items={items}
          shops={shopRows}
          onClose={() => setDetail(null)}
          onSelect={setDetail}
        />
      )}
      {basket && (
        <CartSheet
          kind={kind}
          merchants={shopRows}
          onClose={() => setBasket(false)}
        />
      )}
    </>
  );
}
export function period(item: Row) {
  const p = String(item.pricePeriod || item.priceUnit || "");
  return p && p.toLowerCase() !== "total"
    ? p.startsWith("/")
      ? p
      : `/${p}`
    : "";
}
export function ProductCard({
  item,
  kind,
  onOpen,
}: {
  item: Row;
  kind: Kind;
  onOpen: () => void;
}) {
  const { saved, toggleSaved } = usePlatform(),
    d = deal(item),
    key = `${catalogs[kind]}:${item.id}`;
  return (
    <article className="a-product">
      <div className="a-product-media">
        <button
          onClick={onOpen}
          style={{ width: "100%", height: "100%" }}
          aria-label={`View ${nameOf(item)}`}
        >
          <Photo src={imageOf(item)} alt={nameOf(item)} />
        </button>
        <button
          className="a-icon"
          aria-label={saved.has(key) ? "Remove saved item" : "Save item"}
          onClick={() => toggleSaved(catalogs[kind], item.id)}
        >
          <Heart
            size={19}
            fill={saved.has(key) ? "#d64467" : "none"}
            color={saved.has(key) ? "#d64467" : "#405648"}
          />
        </button>
        {d.active && (
          <span className="a-badge">
            {d.blackFriday ? "Black Friday" : `Save ${money(d.saving)}`}
          </span>
        )}
      </div>
      <div className="a-product-body">
        <small>
          {item.businessName ||
            item.vendorName ||
            item.supermarketName ||
            item.neighborhood ||
            item.categoryLabel ||
            item.category}
        </small>
        <button onClick={onOpen} style={{ textAlign: "left" }}>
          <h3>{nameOf(item)}</h3>
        </button>
        <div className="a-product-bottom">
          <div className="a-price">
            {money(d.price)}
            {period(item)}
            {d.active && <del>{money(d.original)}</del>}
          </div>
          <button
            className="a-add"
            onClick={onOpen}
            aria-label={
              ["food", "grocery", "lifestyle"].includes(kind)
                ? "Choose item options"
                : "Contact owner"
            }
          >
            {["food", "grocery", "lifestyle"].includes(kind) ? (
              <Plus size={19} />
            ) : (
              <MessageCircle size={18} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
export function ItemDetail({
  item,
  kind,
  items,
  shops = [],
  onClose,
  onSelect,
}: {
  item: Row;
  kind: Kind;
  items: Row[];
  shops?: Row[];
  onClose: () => void;
  onSelect: (item: Row) => void;
}) {
  const { add, toggleSaved, saved, openChat, toast } = usePlatform(),
    [qty, setQty] = useState(1),
    [addons, setAddons] = useState<string[]>([]),
    [spice, setSpice] = useState(item.availableSpiceLevels?.[0] || "No Pepper"),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [notes, setNotes] = useState("");
  const contact = useRemote(
      ["property", "motor", "lifestyle"].includes(kind)
        ? `/v1/listings/${kind}/${item.id}/contact`
        : null,
      undefined,
      0,
      false,
    ),
    shop = shops.find((s) => s.id === merchantOf(item, kind)),
    d = deal(item);
  useEffect(() => {
    setQty(1);
    setAddons([]);
    setSize("");
    setColor("");
    setNotes("");
    setSpice(item.availableSpiceLevels?.[0] || "No Pepper");
  }, [item.id]);
  const share = async () => {
    const paths = {
      food: "/",
      grocery: "/groceries",
      property: "/homes",
      motor: "/motors",
      lifestyle: "/lifestyle",
    };
    const url =
      location.origin + paths[kind] + "?item=" + encodeURIComponent(item.id);
    try {
      if (navigator.share) await navigator.share({ title: nameOf(item), url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Item link copied.");
      }
    } catch (e) {
      if ((e as any).name !== "AbortError") toast("Could not share this item.");
    }
  };
  const addItem = async () => {
    if (
      (item.availableSizes?.length && !size) ||
      (item.availableColors?.length && !color)
    ) {
      toast("Choose your item options first.");
      return;
    }
    await add({
      item,
      kind,
      quantity: qty,
      addons,
      spiceLevel: spice,
      notes,
      size: size || undefined,
      color: color || undefined,
    });
    onClose();
  };
  const related = recommend(items, item);
  return (
    <Dialog title={nameOf(item)} onClose={onClose} wide>
      <Gallery item={item} />
      <div className="a-detail-title">
        <div>
          <h2>{nameOf(item)}</h2>
          <div className="a-price">
            {money(d.price)}
            {period(item)}
            {d.active && <del>{money(d.original)}</del>}
          </div>
        </div>
        <div className="a-row">
          <button className="a-icon" aria-label="Share item" onClick={share}>
            <Share2 size={20} />
          </button>
          <button
            className="a-icon"
            aria-label="Save item"
            onClick={() => toggleSaved(catalogs[kind], item.id)}
          >
            <Heart
              size={20}
              fill={
                saved.has(`${catalogs[kind]}:${item.id}`) ? "#d64467" : "none"
              }
            />
          </button>
        </div>
      </div>
      {d.active && (
        <div className="a-card">
          <span className="a-badge">{item.promotion?.label || "On sale"}</span>
          <h3>You save {money(d.saving)}</h3>
          <p>{item.promotion?.terms || "Offer applies while available."}</p>
          <small>
            Ends{" "}
            {new Date(item.promotion.endsAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </small>
        </div>
      )}
      <p>{item.description}</p>
      <dl className="a-definition">
        {[
          "dealType",
          "propertyType",
          "bedrooms",
          "bathrooms",
          "sizeSqm",
          "make",
          "model",
          "year",
          "condition",
          "transmission",
          "mileage",
          "brand",
          "audience",
        ]
          .filter((k) => item[k] != null && item[k] !== "")
          .map((k) => (
            <React.Fragment key={k}>
              <dt>{label(k)}</dt>
              <dd>{label(item[k])}</dd>
            </React.Fragment>
          ))}
      </dl>
      {["food", "grocery", "lifestyle"].includes(kind) && (
        <>
          <div className="a-two">
            {item.availableSizes?.length > 0 && (
              <Select
                label="Size"
                value={size}
                onChange={setSize}
                options={item.availableSizes}
              />
            )}{" "}
            {item.availableColors?.length > 0 && (
              <Select
                label="Colour"
                value={color}
                onChange={setColor}
                options={item.availableColors}
              />
            )}
          </div>
          {item.availableSpiceLevels?.length > 0 && (
            <Select
              label="Spice preference"
              value={spice}
              onChange={setSpice}
              options={item.availableSpiceLevels}
            />
          )}{" "}
          {item.availableAddons?.length > 0 && (
            <div>
              <h3>Make it yours</h3>
              {item.availableAddons.map((a: Row) => (
                <label
                  key={a.id}
                  className="a-row"
                  style={{ margin: "12px 0" }}
                >
                  <input
                    type="checkbox"
                    style={{ width: 18 }}
                    checked={addons.includes(a.id)}
                    onChange={(e) =>
                      setAddons((old) =>
                        e.target.checked
                          ? [...old, a.id]
                          : old.filter((id) => id !== a.id),
                      )
                    }
                  />
                  <span>{a.name}</span>
                  <strong>{money(a.price)}</strong>
                </label>
              ))}
            </div>
          )}
          <Field label="Notes for the seller (optional)">
            <textarea
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="a-row between">
            <div className="a-stepper">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Fewer items"
              >
                −
              </button>
              <strong>{qty}</strong>
              <button
                onClick={() => setQty(Math.min(99, qty + 1))}
                aria-label="More items"
              >
                +
              </button>
            </div>
            <Button
              onClick={addItem}
              disabled={item.isAvailable === false || item.inStock === false}
            >
              Add to {kind === "lifestyle" ? "cart" : "basket"}
            </Button>
          </div>
        </>
      )}
      {["property", "motor", "lifestyle"].includes(kind) && (
        <>
          <Notice error={contact.error} retry={contact.reload} />
          <div className="a-detail-actions">
            {contact.data?.phone && (
              <a
                className="a-button secondary"
                href={`tel:${contact.data.phone}`}
              >
                <Phone size={16} />
                Call
              </a>
            )}
            {contact.data?.whatsapp && (
              <a
                className="a-button secondary"
                href={`https://wa.me/${contact.data.whatsapp.replace("+", "")}?text=${encodeURIComponent("Hi, I’m interested in " + nameOf(item) + ".")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            )}
            {contact.data?.canChat && (
              <Button secondary onClick={() => openChat(kind, item.id)}>
                <MessageCircle size={16} />
                Message owner
              </Button>
            )}
          </div>
          {contact.data &&
            !contact.data.phone &&
            !contact.data.whatsapp &&
            !contact.data.canChat && (
              <p>This owner has not added contact details yet.</p>
            )}
        </>
      )}
      <div className="a-detail-vendor">
        <Photo
          src={item.businessImage || shop?.heroImage || ""}
          alt="Business profile"
        />
        <div>
          <small>
            FROM YOUR LOCAL {kind === "food" ? "KITCHEN" : "SELLER"}
          </small>
          <strong>
            {item.businessName ||
              shop?.name ||
              item.vendorName ||
              item.agentName ||
              item.dealerName ||
              "Independent seller"}
          </strong>
          <small>
            {shop?.neighborhood ||
              item.vendorLocation ||
              item.neighborhood ||
              item.location ||
              ""}
          </small>
        </div>
      </div>
      {related.length > 0 && (
        <section className="a-section">
          <h2>Worth a look, too</h2>
          <p>Related by category, seller and price.</p>
          <div
            className="a-grid"
            style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
          >
            {related.map((r) => (
              <ProductCard
                key={r.id}
                item={r}
                kind={kind}
                onOpen={() => onSelect(r)}
              />
            ))}
          </div>
        </section>
      )}
    </Dialog>
  );
}
function Filters({
  kind,
  items,
  value,
  onApply,
  onClose,
}: {
  kind: Kind;
  items: Row[];
  value: Row;
  onApply: (r: Row) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Row>({ ...value });
  const set = (k: string, v: any) => setDraft((old) => ({ ...old, [k]: v }));
  const option = (key: string, title: string) => (
    <Select
      key={key}
      label={title}
      value={draft[key] || ""}
      onChange={(v) => set(key, v)}
      options={[
        { value: "", label: "Any" },
        ...[...new Set(items.map((r) => String(r[key] || "")).filter(Boolean))]
          .sort()
          .map((v) => ({ value: v, label: label(v) })),
      ]}
    />
  );
  return (
    <Dialog title="Find your kind of good" onClose={onClose}>
      <div style={{ paddingTop: 12 }}>
        {kind === "property" && (
          <>
            {option("dealType", "Deal type")}
            {option("propertyType", "Property type")}
            {option("neighborhood", "Neighborhood")}
          </>
        )}
        {option("subcategory", "Subcategory")}
        {kind === "motor" && (
          <>
            {option("listingType", "Vehicles or parts")}
            {option("make", "Make")}
            {option("condition", "Condition")}
          </>
        )}
        {kind === "lifestyle" && (
          <>
            {option("audience", "For men, women or kids")}
            {option("brand", "Brand")}
          </>
        )}
        <Select
          label="Sort by"
          value={draft.sort || ""}
          options={[
            { value: "", label: "Recommended" },
            { value: "price_asc", label: "Price: low to high" },
            { value: "price_desc", label: "Price: high to low" },
          ]}
          onChange={(v) => set("sort", v)}
        />
        <details>
          <summary>More filters</summary>
          <div className="a-two">
            <Field label="Minimum price">
              <input
                type="number"
                min={0}
                value={draft.min || ""}
                onChange={(e) => set("min", e.target.value)}
              />
            </Field>
            <Field label="Maximum price">
              <input
                type="number"
                min={0}
                value={draft.max || ""}
                onChange={(e) => set("max", e.target.value)}
              />
            </Field>
          </div>
          {kind === "property" && (
            <Field label="Minimum bedrooms">
              <input
                type="number"
                min={0}
                value={draft.bedrooms || ""}
                onChange={(e) => set("bedrooms", e.target.value)}
              />
            </Field>
          )}
          {kind === "motor" && (
            <Field label="From year">
              <input
                type="number"
                min={1900}
                max={2100}
                value={draft.yearMin || ""}
                onChange={(e) => set("yearMin", e.target.value)}
              />
            </Field>
          )}
          {!["property"].includes(kind) &&
            option("neighborhood", "Neighborhood")}
        </details>
        <label className="a-row" style={{ margin: "20px 0" }}>
          <input
            style={{ width: 18 }}
            type="checkbox"
            checked={!!draft.sale}
            onChange={(e) => set("sale", e.target.checked)}
          />
          On sale only
        </label>
        <label className="a-row" style={{ margin: "20px 0" }}>
          <input
            style={{ width: 18 }}
            type="checkbox"
            checked={!!draft.stock}
            onChange={(e) => set("stock", e.target.checked)}
          />
          Available now
        </label>
        <div className="a-row">
          <Button secondary danger onClick={() => setDraft({})}>
            Reset all
          </Button>
          <Button onClick={() => onApply(draft)}>Apply filters</Button>
        </div>
      </div>
    </Dialog>
  );
}
