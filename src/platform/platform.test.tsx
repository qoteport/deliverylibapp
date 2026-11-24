import { Dining, rememberedTable } from "./Dining";
import { Social } from "./Social";
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const fixture = vi.hoisted(() => ({
  user: {
    uid: "tester",
    name: "Test Buyer",
    phone: "+231770000000",
    role: "customer",
  } as any,
  auth: { currentUser: { uid: "tester" } } as any,
  command: vi.fn(),
  put: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: fixture.user, logout: vi.fn() }),
}));
vi.mock("../firebase/config", () => ({ auth: fixture.auth, app: {} }));
vi.mock("../utils/commandApi", () => ({ command: fixture.command }));
vi.mock("./Location", () => ({
  mapsKey: "",
  SmallMap: () => null,
  LocationDialog: () => null,
}));
vi.mock("./Messages", () => ({ Inbox: () => null, putFile: fixture.put }));
vi.mock("./Notifications", () => ({
  NotificationPage: () => null,
  setPushAccount: vi.fn().mockResolvedValue(undefined),
  disablePush: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../components/LoginModal", () => ({
  LoginModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div role="dialog" aria-label="Test sign in">
        <button
          onClick={() => {
            fixture.auth.currentUser = { uid: "tester" };
            fixture.user = {
              uid: "tester",
              name: "Test Buyer",
              phone: "+231770000000",
              role: "customer",
            };
            onClose();
          }}
        >
          Verify test account
        </button>
        <button onClick={onClose}>Close sign in</button>
      </div>
    ) : null,
}));
import { Platform } from "./context";
import { AdminConsole } from "./AdminConsole";
import { Checkout } from "./Commerce";
import { MediaEditor } from "./EditorFields";
import WebPlatform from "./WebPlatform";
import { deal, recommend, money } from "./model";
const apiState = {
  requireLogin: vi.fn().mockResolvedValue(true),
  toast: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  cart: [],
  setCart: vi.fn(),
  add: vi.fn(),
  saved: new Set<string>(),
  toggleSaved: vi.fn(),
  openChat: vi.fn(),
};
const wrap = (node: React.ReactNode) =>
  render(<Platform.Provider value={apiState}>{node}</Platform.Provider>);
const item = {
  id: "meal",
  name: "Meal",
  restaurantId: "kitchen",
  price: 10,
  isAvailable: true,
  images: [],
};
const shop = { id: "kitchen", name: "Kitchen", isOpen: true };
beforeEach(() => {
  fixture.user = {
    uid: "tester",
    name: "Test Buyer",
    phone: "+231770000000",
    role: "customer",
  };
  fixture.auth.currentUser = { uid: "tester" };
  fixture.command.mockReset();
  fixture.put.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
  history.replaceState({}, "", "/");
  fixture.command.mockImplementation(async (path: string) => {
    if (path === "/v1/me/delivery")
      return {
        details: {
          name: "Test Buyer",
          phone: "+231770000000",
          address: "Test address",
          area: "Sinkor",
          coords: { lat: 6.29, lng: -10.78 },
        },
      };
    if (path === "/v1/order-quotes")
      return {
        quote: {
          subtotal: 10,
          deliveryFee: 0,
          tax: 0,
          total: 10,
          amountMinor: 1000,
        },
      };
    if (path.includes("/catalog/restaurants")) return { items: [shop] };
    if (path.startsWith("/v1/catalog/")) return { items: [item] };
    if (path === "/v1/saved") return { items: [] };
    if (path === "/v1/orders") return { orders: [] };
    if (path === "/v1/conversations") return { conversations: [] };
    if (path === "/v1/notifications") return { notifications: [] };
    return {};
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("disabled, future, expired and stale-reference promotions never advertise savings", () => {
  const now = 10000,
    p = {
      enabled: true,
      type: "sale",
      startsAt: 9000,
      endsAt: 11000,
      referencePriceUsd: 10,
      salePriceUsd: 7,
    };
  expect(deal({ price: 10, promotion: p }, now).price).toBe(7);
  for (const change of [
    { enabled: false },
    { startsAt: 11000 },
    { endsAt: 10000 },
    { referencePriceUsd: 12 },
  ])
    expect(deal({ price: 10, promotion: { ...p, ...change } }, now).price).toBe(
      10,
    );
  expect(money(10)).toBe("$10");
  expect(money(10.5)).toBe("$10.50");
});
it("related items prefer category and vendor without returning the source", () => {
  const source = {
    id: "source",
    name: "Garden pizza",
    category: "Pizza",
    vendorId: "k",
    priceUsd: 10,
  };
  expect(
    recommend(
      [
        { ...source },
        {
          id: "near",
          name: "Cheese pizza",
          category: "Pizza",
          vendorId: "k",
          priceUsd: 11,
        },
        { id: "far", name: "Boot", category: "Shoes", priceUsd: 90 },
      ],
      source,
    )[0].id,
  ).toBe("near");
});
it("customer membership cannot load the application queue", async () => {
  fixture.command.mockRejectedValue(
    Object.assign(new Error("Administrator access required."), { status: 403 }),
  );
  wrap(<AdminConsole />);
  await screen.findByRole("heading", { name: "Administrator access" });
  expect(
    fixture.command.mock.calls.some(([p]) => p === "/v1/admin/applications"),
  ).toBe(false);
});
it("admin approval sends the reviewed version and an idempotency key", async () => {
  fixture.command.mockImplementation(async (path: string, body: any) => {
    if (path === "/v1/admin/session") return { role: "admin" };
    if (path === "/v1/admin/applications")
      return {
        items: [
          {
            id: "shop",
            name: "Review Kitchen",
            kind: "restaurant",
            reviewStatus: "pending",
          },
        ],
      };
    if (path === "/v1/admin/applications/shop")
      return {
        application: {
          id: "shop",
          name: "Review Kitchen",
          kind: "restaurant",
          version: 4,
          profileComplete: true,
        },
        profile: { name: "Review Kitchen" },
        owner: { uid: "owner" },
      };
    if (path.endsWith("/review")) return { saved: true };
    return {};
  });
  wrap(<AdminConsole />);
  await userEvent.click(
    await screen.findByRole("button", { name: /Review Kitchen/ }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Save decision" }),
  );
  await waitFor(() =>
    expect(
      fixture.command.mock.calls.some(
        ([p, b, k]) =>
          p.endsWith("/review") &&
          b.expectedVersion === 4 &&
          b.action === "approve" &&
          typeof k === "string" &&
          k.length > 16,
      ),
    ).toBe(true),
  );
});
it("checkout shows the canonical summary immediately and submits that reviewed total", async () => {
  const done = vi.fn();
  fixture.command.mockImplementation(async (path: string, body: any) => {
    if (path === "/v1/me/delivery")
      return body
        ? { details: body }
        : {
            details: {
              name: "Test Buyer",
              phone: "+231770000000",
              address: "Test address",
              area: "Sinkor",
              coords: { lat: 6.29, lng: -10.78 },
            },
          };
    if (path === "/v1/order-quotes")
      return {
        quote: {
          subtotal: 10,
          deliveryFee: 0,
          tax: 0,
          total: 10,
          amountMinor: 1000,
        },
      };
    if (path === "/v1/orders") return { order: { id: "new-order" } };
    return {};
  });
  wrap(
    <Checkout
      lines={[{ kind: "food", item, quantity: 1 }]}
      merchant={shop}
      onClose={() => {}}
      onPlaced={done}
    />,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Place order · $10" }),
  );
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  const call = fixture.command.mock.calls.find(([p]) => p === "/v1/orders");
  expect(call?.[1].expectedTotalMinor).toBe(1000);
  expect(call?.[2]).toBeTruthy();
});
it("catalog media uploads preview and finish through the scoped signed URL flow", async () => {
  const change = vi.fn();
  fixture.command.mockImplementation(async (path: string) =>
    path.endsWith("/complete")
      ? { url: "https://storage.invalid/final.webp" }
      : {
          id: "upload-1",
          uploadUrl: "https://storage.invalid/staging",
          type: "image/png",
        },
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: () => "blob:test",
      revokeObjectURL: vi.fn(),
    }),
  );
  const result = wrap(
    <MediaEditor
      scope="/v1/listing-workspaces/property/homes"
      value={{ images: [] }}
      onChange={change}
    />,
  );
  const input = result.container.querySelector("input[type=file]")!;
  fireEvent.change(input, {
    target: { files: [new File(["png"], "photo.png", { type: "image/png" })] },
  });
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ["https://storage.invalid/final.webp"],
      }),
    ),
  );
  expect(fixture.put).toHaveBeenCalledOnce();
  expect(fixture.command.mock.calls[0][0]).toBe(
    "/v1/listing-workspaces/property/homes/media/uploads",
  );
});
it("a guest checkout resumes after verified login rather than showing an unauthenticated summary", async () => {
  fixture.user = null;
  fixture.auth.currentUser = null;
  localStorage.setItem(
    "aura_shared_cart",
    JSON.stringify([{ kind: "food", item, quantity: 1 }]),
  );
  const root = render(<WebPlatform />);
  await userEvent.click(
    await screen.findByRole("button", { name: /Basket 1/ }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Continue to checkout" }),
  );
  expect(screen.queryByRole("heading", { name: "Order summary" })).toBeNull();
  await userEvent.click(
    await screen.findByRole("button", { name: "Verify test account" }),
  );
  root.rerender(<WebPlatform />);
  await screen.findByRole("heading", { name: "Order summary" });
  expect(screen.queryByRole("dialog", { name: "Test sign in" })).toBeNull();
});

it("nested custom dropdowns close independently with Escape and release body scrolling", async () => {
  const { Dialog, Select } = await import("./ui");
  function Example() {
    const [open, setOpen] = React.useState(true);
    return open ? (
      <Dialog title="Parent dialog" onClose={() => setOpen(false)}>
        <Select
          label="Choose category"
          value=""
          options={["Pizza", "Grill"]}
          onChange={() => {}}
        />
      </Dialog>
    ) : null;
  }
  render(<Example />);
  await userEvent.click(
    screen.getByRole("button", { name: "Choose category" }),
  );
  expect(screen.getAllByRole("dialog").length).toBe(2);
  await userEvent.keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "Parent dialog" })).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "Choose category" })).toBeNull();
  expect(document.body.style.overflow).toBe("hidden");
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).not.toBe("hidden");
});

it("service worker bypasses private and cross-origin requests and keeps the push identity guard", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const handlers: Record<string, any> = {},
    deleted: string[] = [];
  const cachesMock = {
    keys: async () => [
      "aura-monrovia-v4",
      "aura-web-push",
      "another-app-cache",
    ],
    delete: async (key: string) => {
      deleted.push(key);
      return true;
    },
    open: async () => ({ addAll: async () => {}, put: async () => {} }),
    match: async () => null,
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    Response,
    console,
    caches: cachesMock,
    fetch: vi.fn(),
    self: {
      location: { origin: "https://web.invalid" },
      addEventListener: (name: string, fn: any) => (handlers[name] = fn),
      skipWaiting: () => {},
      clients: { claim: () => {} },
    },
  });
  for (const [url, authenticated] of [
    ["https://web.invalid/v1/conversations", true],
    ["https://api.invalid/v1/orders", true],
    ["https://storage.invalid/private-receipt?signature=test", false],
  ]) {
    const respondWith = vi.fn();
    handlers.fetch({
      request: {
        url,
        method: "GET",
        headers: new Headers(
          authenticated ? { Authorization: "Bearer test" } : {},
        ),
        mode: "cors",
      },
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  }
  let activation: Promise<any> | undefined;
  handlers.activate({
    waitUntil: (value: Promise<any>) => (activation = value),
  });
  await activation;
  expect(deleted).toEqual(["aura-monrovia-v4"]);
});

it("driver availability preserves saved vehicle and contact details with fresh GPS", async () => {
  history.replaceState({}, "", "/driver?mode=rides");
  const { Driver } = await import("./Rides");
  const presence = {
    vehicleType: "taxi",
    phone: "+231770000000",
    vehicleDetails: {
      make: "Toyota",
      model: "Corolla",
      color: "White",
      plate: "TEST",
    },
    pricing: { baseMinor: 100, perKmMinor: 50, minimumMinor: 200 },
    online: false,
  };
  fixture.command.mockImplementation(async () => ({ presence, ride: null }));
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: any) =>
        success({
          coords: { latitude: 6.29, longitude: -10.78, accuracy: 5 },
          timestamp: Date.now(),
        }),
      watchPosition: () => 1,
      clearWatch: vi.fn(),
    },
  });
  wrap(<Driver />);
  await waitFor(() =>
    expect(
      (
        screen.getByLabelText(
          "Driver contact phone (+231...)",
        ) as HTMLInputElement
      ).value,
    ).toBe("+231770000000"),
  );
  await userEvent.click(screen.getByRole("button", { name: /^Available$/ }));
  await waitFor(() =>
    expect(
      fixture.command.mock.calls.some(
        ([path, body]) =>
          path === "/v1/ride-driver/presence" &&
          body.online &&
          body.available &&
          body.contactPhone === presence.phone &&
          body.vehicleDetails.plate === "TEST" &&
          body.location.accuracy === 5,
      ),
    ).toBe(true),
  );
});

it("footer legal links resolve to public policy pages without requiring sign in", async () => {
  fixture.user = null;
  fixture.auth.currentUser = null;
  history.replaceState({}, "", "/privacy");
  const root = render(<WebPlatform />);
  expect(
    await screen.findByRole("heading", { name: "Privacy Policy", level: 1 }),
  ).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "Test sign in" })).toBeNull();
  expect(
    screen
      .getAllByRole("link", { name: "Terms & Conditions" })
      .every((link) => link.getAttribute("href") === "/terms"),
  ).toBe(true);
  root.unmount();
  history.replaceState({}, "", "/terms");
  render(<WebPlatform />);
  expect(
    await screen.findByRole("heading", {
      name: "Terms & Conditions",
      level: 1,
    }),
  ).toBeTruthy();
  expect(
    screen
      .getAllByRole("link", { name: "Privacy Policy" })
      .every((link) => link.getAttribute("href") === "/privacy"),
  ).toBe(true);
  expect(screen.queryByRole("dialog", { name: "Test sign in" })).toBeNull();
});

it("anonymous event detail hides organiser controls and gates registration", async () => {
  fixture.user = null;
  apiState.requireLogin.mockResolvedValueOnce(false);
  const event = {
    id: "e",
    title: "Sinkor weekend",
    description: "Meet our neighbours",
    organizerName: "Host",
    status: "approved",
    images: [],
    startsAt: 1800000000000,
    endsAt: 1800007200000,
    registrationMode: "form",
    fields: [],
  };
  fixture.command.mockImplementation(async (path: string) =>
    path === "/v1/events/e" ? { item: event } : { items: [] },
  );
  wrap(<Social events id="e" />);
  expect(
    await screen.findByRole("heading", { name: "Sinkor weekend" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Attendees" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Edit details" })).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Register for this event" }),
  );
  expect(apiState.requireLogin).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("community discovery searches posts and lists only matching conversations", async () => {
  fixture.command.mockResolvedValue({
    items: [
      {
        id: "one",
        title: "Best local bakery?",
        description: "Looking for bread",
        category: "Question",
      },
      {
        id: "two",
        title: "Weekend football",
        description: "Join us",
        category: "Activity",
      },
    ],
  });
  wrap(<Social events={false} />);
  await screen.findByText("Best local bakery?");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search" }),
    "bakery",
  );
  expect(screen.getByText("Best local bakery?")).toBeTruthy();
  expect(screen.queryByText("Weekend football")).toBeNull();
});

it("table QR entry preserves the exact table for checkout without requesting GPS", async () => {
  const restaurant = {
    id: "k",
    name: "Garden Kitchen",
    isOpen: true,
    diningTables: [{ id: "t1", name: "Table 4", area: "Garden", active: true }],
  };
  fixture.command.mockImplementation(async (path: string) =>
    path === "/v1/dining/k/t1"
      ? {
          restaurant,
          table: { id: "t1", name: "Table 4", area: "Garden" },
          items: [],
        }
      : { items: [] },
  );
  wrap(<Dining merchantId="k" tableId="t1" />);
  expect(
    await screen.findByRole("heading", { name: "Garden Kitchen" }),
  ).toBeTruthy();
  await waitFor(() => expect(rememberedTable("k")).toBe("t1"));
  cleanup();
  fixture.command.mockImplementation(async (path: string) =>
    path === "/v1/order-quotes"
      ? {
          quote: {
            amountMinor: 500,
            total: 5,
            subtotal: 5,
            deliveryFee: 0,
            tax: 0,
          },
        }
      : { details: {} },
  );
  wrap(
    <Checkout
      lines={[
        {
          item: { id: "rice", name: "Rice", price: 5, restaurantId: "k" },
          kind: "food",
          quantity: 1,
        },
      ]}
      merchant={restaurant}
      onClose={() => {}}
      onPlaced={() => {}}
    />,
  );
  await waitFor(() =>
    expect(
      fixture.command.mock.calls.some(
        ([path, body]) =>
          path === "/v1/order-quotes" &&
          body.diningMode === "dine-in" &&
          body.diningTableId === "t1",
      ),
    ).toBe(true),
  );
  expect(
    screen.getByText(
      "Your table is already selected. Change it only if you move seats.",
    ),
  ).toBeTruthy();
  sessionStorage.clear();
});
