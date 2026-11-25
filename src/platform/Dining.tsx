import React, { useEffect, useState } from "react";
import { useRemote, friendly } from "./hooks";
import { usePlatform } from "./context";
import { command } from "../utils/commandApi";
import { Row } from "./model";
import { Button, Busy, Notice, Photo, Dialog } from "./ui";
import { ProductCard, ItemDetail } from "./Catalog";
import { CartSheet } from "./Commerce";
import { rememberTable } from "./dining-session";
export { rememberedTable } from "./dining-session";
import { TableQr } from "./TableQr";
export function Dining({
  merchantId,
  tableId,
}: {
  merchantId: string;
  tableId: string;
}) {
  const entry = useRemote(
      `/v1/dining/${encodeURIComponent(merchantId)}/${encodeURIComponent(tableId)}`,
      undefined,
      0,
      false,
    ),
    { cart } = usePlatform();
  const [extra, setExtra] = useState<Row[]>([]),
    [next, setNext] = useState<string | null>(null),
    [category, setCategory] = useState(""),
    [detail, setDetail] = useState<Row | null>(null),
    [basket, setBasket] = useState(false),
    [qrOpen, setQrOpen] = useState(
      new URLSearchParams(location.search).get("qr") === "1",
    ),
    [error, setError] = useState<string | null>(null),
    [paging, setPaging] = useState(false);
  useEffect(() => {
    if (entry.data) {
      rememberTable(merchantId, tableId);
      setExtra([]);
      setNext(entry.data.nextPageToken ?? null);
    }
  }, [entry.data, merchantId, tableId]);
  if (entry.loading)
    return (
      <section className="a-page">
        <Busy />
      </section>
    );
  if (!entry.data)
    return (
      <section className="a-page">
        <h1>Welcome to your table</h1>
        <Notice error={entry.error} retry={entry.reload} />
        <p>Ask the kitchen for a new table code if this one is unavailable.</p>
      </section>
    );
  const { restaurant, table } = entry.data,
    items = [...entry.data.items, ...extra].filter(
      (i) => i.isAvailable !== false,
    ),
    categories = [
      ...new Set<string>(items.map((i) => i.category?.trim()).filter(Boolean)),
    ],
    count = cart
      .filter((l) => l.kind === "food" && l.item.restaurantId === merchantId)
      .reduce((n, l) => n + l.quantity, 0);
  return (
    <section className="a-page">
      <div
        className="a-card"
        style={{ background: "#e8f8ee", marginBottom: 20 }}
      >
        <strong>
          Dining in · {table.area} · {table.name}
        </strong>
        <p>
          Your table is included automatically. Choose food, then send your
          order to the kitchen.
        </p>
        <a
          className="a-text-link"
          href={`aura://dine/${merchantId}/${tableId}`}
        >
          Open in the Aura app ↗
        </a>
      </div>
      <Photo
        src={restaurant.heroImage}
        style={{
          width: "100%",
          maxHeight: 280,
          objectFit: "cover",
          borderRadius: 24,
        }}
      />
      <h1>{restaurant.name}</h1>
      <p>{restaurant.cuisine}</p>
      {restaurant.isOpen === false && (
        <p className="a-warning">
          The kitchen is currently closed. You can browse its menu.
        </p>
      )}
      <div className="a-row between">
        <h2>Menu</h2>
        <Button onClick={() => setBasket(true)} disabled={!count}>
          Your order · {count}
        </Button>
      </div>
      <div className="a-tabs" style={{ overflowX: "auto" }}>
        {["", ...categories].map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c || "All"}
          </button>
        ))}
      </div>
      <Notice error={error} />
      <div className="a-grid">
        {items
          .filter((i) => !category || i.category?.trim() === category)
          .map((i) => (
            <ProductCard
              key={i.id}
              kind="food"
              item={i}
              onOpen={() => setDetail(i)}
            />
          ))}
      </div>
      {!items.length && (
        <p>No dishes are available yet. Ask the kitchen for help.</p>
      )}
      {next && (
        <Button
          secondary
          disabled={paging}
          onClick={async () => {
            setPaging(true);
            try {
              const page = await command(
                `/v1/dining/${merchantId}/${tableId}?after=${encodeURIComponent(next)}`,
                undefined,
                undefined,
                false,
              );
              setExtra((old) => [...old, ...page.items]);
              setNext(page.nextPageToken ?? null);
            } catch (e) {
              setError(friendly(e));
            } finally {
              setPaging(false);
            }
          }}
        >
          Load more dishes
        </Button>
      )}
      {detail && (
        <ItemDetail
          key={detail.id}
          item={detail}
          kind="food"
          items={items}
          shops={[restaurant]}
          onClose={() => setDetail(null)}
          onSelect={setDetail}
        />
      )}
      {qrOpen && (
        <TableQr
          merchantId={merchantId}
          tableId={tableId}
          onClose={() => setQrOpen(false)}
        />
      )}
      {basket && (
        <CartSheet
          kind="food"
          merchants={[restaurant]}
          onClose={() => setBasket(false)}
        />
      )}
    </section>
  );
}
