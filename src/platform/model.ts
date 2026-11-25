export type Row = Record<string, any>;
export const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export const imageOf = (item: Row) =>
  item.images?.[0] || item.image || item.heroImage || "";
export const nameOf = (item: Row) => String(item.title || item.name || "Item");
export const label = (value: unknown) =>
  String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export function deal(item: Row, now = Date.now()) {
  const original = Number(item.priceUsd ?? item.price ?? 0),
    p = item.promotion;
  const active =
    p &&
    p.enabled === true &&
    Math.round(Number(p.referencePriceUsd) * 100) ===
      Math.round(original * 100) &&
    Number(p.startsAt) <= now &&
    Number(p.endsAt) > now &&
    Number(p.salePriceUsd) >= 0 &&
    Number(p.salePriceUsd) < original;
  return {
    original,
    price: active ? Number(p.salePriceUsd) : original,
    active: !!active,
    blackFriday: !!active && p.type === "black_friday",
    saving: active ? original - Number(p.salePriceUsd) : 0,
  };
}
export function recommend(items: Row[], source: Row) {
  const text = (r: Row) =>
    new Set(
      (
        nameOf(r) +
        " " +
        (r.categoryLabel || r.category || "") +
        " " +
        (r.subcategory || "")
      )
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 2),
    );
  const words = text(source),
    vendor =
      source.vendorId ||
      source.workspaceId ||
      source.restaurantId ||
      source.supermarketId;
  return items
    .filter((r) => r.id !== source.id)
    .map((r) => ({
      item: r,
      score:
        (r.category === source.category ? 4 : 0) +
        (r.subcategory && r.subcategory === source.subcategory ? 5 : 0) +
        (vendor &&
        (r.vendorId || r.workspaceId || r.restaurantId || r.supermarketId) ===
          vendor
          ? 3
          : 0) +
        [...text(r)].filter((t) => words.has(t)).length +
        Math.max(
          0,
          2 -
            Math.abs(deal(r).price - deal(source).price) /
              Math.max(1, deal(source).price),
        ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)),
    )
    .slice(0, 6)
    .map((r) => r.item);
}
export const catalogs = {
  food: "menu",
  grocery: "supermarket_items",
  property: "properties",
  motor: "motor_listings",
  lifestyle: "lifestyle_items",
} as const;
export const titles = {
  food: "Shopping",
  grocery: "Groceries",
  property: "Homes",
  motor: "Motors",
  lifestyle: "Lifestyle",
};
export type Kind = keyof typeof catalogs;
