// Isolated browser-review fixtures. Never imported by the application or deployed.
import { createServer } from "node:http";
const now = Date.now(),
  sale = {
    enabled: true,
    type: "sale",
    label: "Weekend savings",
    referencePriceUsd: 10,
    salePriceUsd: 8,
    startsAt: now - 10000,
    endsAt: now + 86400000,
  };
const image =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600";
const shops = [
  {
    id: "preview-kitchen",
    name: "Preview Kitchen",
    heroImage: image,
    published: true,
    coords: { lat: 6.288, lng: -10.776 },
  },
];
const items = Array.from({ length: 16 }, (_, i) => ({
  id: "preview-" + i,
  name: [
    "Fresh garden bowl",
    "Seasonal fruit cup",
    "House pizza",
    "Grilled vegetables",
  ][i % 4],
  title: [
    "Fresh garden bowl",
    "Seasonal fruit cup",
    "House pizza",
    "Grilled vegetables",
  ][i % 4],
  description: "Isolated preview fixture. No real order will be created.",
  category: ["Salads", "Fruit", "Pizza", "Grill"][i % 4],
  restaurantId: "preview-kitchen",
  supermarketId: "preview-kitchen",
  workspaceId: "preview-vendor",
  vendorId: "preview-vendor",
  businessName: "Preview Vendor",
  restaurantName: "Preview Kitchen",
  supermarketName: "Preview Market",
  priceUsd: 10,
  price: 10,
  images: [
    image,
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
  ],
  published: true,
  isAvailable: true,
  inventoryCount: 20,
  bedrooms: 2,
  dealType: "rent",
  propertyType: "apartment",
  pricePeriod: "month",
  neighborhood: "Sinkor",
  department: "electronics",
  audience: "all",
  ...(i < 4
    ? {
        promotion: {
          ...sale,
          ...(i === 0
            ? { type: "black_friday", label: "Black Friday preview" }
            : {}),
        },
      }
    : {}),
}));
createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:8124");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Idempotency-Key",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const path = new URL(req.url, "http://local").pathname;
  let data;
  if (path.startsWith("/v1/catalog/"))
    data = {
      items: /restaurants|supermarkets$/.test(path) ? shops : items,
      nextPageToken: null,
    };
  else if (path === "/v1/live") data = { sessions: [] };
  else if (path.includes("/contact"))
    data = { phone: "+231770000000", whatsapp: "+231770000000", canChat: true };
  else {
    res.writeHead(401);
    res.end(
      JSON.stringify({
        code: "UNAUTHENTICATED",
        message: "Sign in to continue.",
      }),
    );
    return;
  }
  res.end(JSON.stringify(data));
}).listen(8787, "127.0.0.1", () =>
  console.log("Isolated preview API: http://127.0.0.1:8787 (no writes)"),
);
