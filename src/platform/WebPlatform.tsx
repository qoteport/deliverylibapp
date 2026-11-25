import { Dining } from "./Dining";
import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import {
  Heart,
  MessageCircle,
  Bell,
  ShoppingBag,
  Store,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LoginModal } from "../components/LoginModal";
import { command } from "../utils/commandApi";
import { auth } from "../firebase/config";
import { Platform, go, Line } from "./context";
import { Kind, Row, catalogs } from "./model";
import { Catalog } from "./Catalog";
const AdminConsole = lazy(() =>
  import("./AdminConsole").then((m) => ({ default: m.AdminConsole })),
);
import { BusinessCenter, JoinTeam } from "./Business";
import { OrdersPage, ActiveOrders, merchantId } from "./Commerce";
import { Inbox } from "./Messages";
import { NotificationPage, setPushAccount, disablePush } from "./Notifications";
import { Button, Dialog, Busy } from "./ui";
import { useRemote, friendly } from "./hooks";
import { mapsKey } from "./Location";
const LiveMarket = lazy(() =>
  import("./LiveMarket").then((m) => ({ default: m.LiveMarket })),
);
const LivePayment = lazy(() =>
  import("./LiveMarket").then((m) => ({ default: m.LivePayment })),
);
const Rides = lazy(() => import("./Rides").then((m) => ({ default: m.Rides })));
const Driver = lazy(() =>
  import("./Rides").then((m) => ({ default: m.Driver })),
);
import { Social } from "./Social";
import { Account } from "./Account";
import { LegalPage, LegalLinks } from "./Legal";
import "./platform.css";
const nav = [
  ["/events", "Events"],
  ["/community", "Community"],
  ["/", "Food"],
  ["/groceries", "Groceries"],
  ["/homes", "Homes"],
  ["/motors", "Motors"],
  ["/lifestyle", "Lifestyle"],
  ["/rides", "Rides"],
  ["/live", "Live Market"],
];
export default function WebPlatform() {
  return mapsKey ? (
    <APIProvider apiKey={mapsKey}>
      <Shell />
    </APIProvider>
  ) : (
    <Shell />
  );
}
function Shell() {
  const { user, logout } = useAuth(),
    [url, setUrl] = useState(location.pathname + location.search),
    [login, setLogin] = useState(false),
    [toast, setToast] = useState(""),
    [cart, setCart] = useState<Line[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("aura_shared_cart") || "[]");
      } catch {
        return [];
      }
    }),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      action: string;
      resolve: (v: boolean) => void;
    } | null>(null),
    [pulse, setPulse] = useState(0);
  const waiting = useRef<((v: boolean) => void)[]>([]),
    userRef = useRef(user);
  userRef.current = user;
  const savedRemote = useRemote(user ? "/v1/saved" : null),
    notifications = useRemote(
      user ? "/v1/notifications" : null,
      undefined,
      10000,
    ),
    inbox = useRemote(user ? "/v1/conversations" : null, undefined, 10000);
  const saved = new Set<string>(
    (savedRemote.data?.items || [])
      .filter((r: Row) => r.saved !== false)
      .map((r: Row) => `${r.kind}:${r.itemId}`),
  );
  useEffect(() => {
    const f = () => setUrl(location.pathname + location.search);
    addEventListener("popstate", f);
    return () => removeEventListener("popstate", f);
  }, []);
  useEffect(() => {
    localStorage.setItem("aura_shared_cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    void setPushAccount(user?.uid || "").catch(() => {});
    if (user) {
      setLogin(false);
      waiting.current.splice(0).forEach((f) => f(true));
    }
  }, [user?.uid]);
  useEffect(() => {
    const refresh = () => {
      notifications.reload();
      inbox.reload();
    };
    const push = (event: MessageEvent) => {
      if (
        event.data?.type === "AURA_PUSH" &&
        event.data.recipientUid === userRef.current?.uid
      )
        refresh();
    };
    window.addEventListener("aura-notifications", refresh);
    navigator.serviceWorker?.addEventListener("message", push);
    return () => {
      window.removeEventListener("aura-notifications", refresh);
      navigator.serviceWorker?.removeEventListener("message", push);
    };
  }, []);
  const requireLogin = () =>
    userRef.current
      ? Promise.resolve(true)
      : new Promise<boolean>((resolve) => {
          waiting.current.push(resolve);
          setLogin(true);
        });
  const ask = (title: string, message: string, action = "Continue") =>
    new Promise<boolean>((resolve) =>
      setConfirm({ title, message, action, resolve }),
    );
  const add = async (line: Line) => {
    if (["food", "grocery"].includes(line.kind)) {
      const other = cart.find(
        (l) => l.kind === line.kind && merchantId(l) !== merchantId(line),
      );
      if (
        other &&
        !(await ask(
          "Start a new basket?",
          `Your ${line.kind === "food" ? "kitchen" : "grocery"} basket belongs to another business. Replace it with these items?`,
          "Replace basket",
        ))
      )
        return;
      setCart((a) => [
        ...a.filter(
          (l) => l.kind !== line.kind || merchantId(l) === merchantId(line),
        ),
        line,
      ]);
    } else setCart((a) => [...a, line]);
    setToast("Added to your basket");
  };
  const toggleSaved = async (kind: string, itemId: string) => {
    if (!(await requireLogin())) return;
    try {
      await command("/v1/saved", {
        kind,
        itemId,
        saved: !saved.has(`${kind}:${itemId}`),
      });
      savedRemote.reload();
      setPulse((n) => n + 1);
    } catch (e) {
      setToast(friendly(e));
    }
  };
  const openChat = async (kind: string, id: string) => {
    if (!(await requireLogin())) return;
    try {
      const r = await command("/v1/conversations", { kind, listingId: id });
      go("/messages/" + r.conversation.id);
    } catch (e) {
      setToast(friendly(e));
    }
  };
  const rawPath = url.split("?")[0],
    path =
      rawPath === "/real-estate"
        ? "/homes"
        : rawPath === "/supermarket"
          ? "/groceries"
          : rawPath,
    parts = path.split("/").filter(Boolean),
    privateRoute = [
      "orders",
      "messages",
      "notifications",
      "portal",
      "admin",
      "driver",
      "live-payments",
      "account",
    ].includes(parts[0]);
  useEffect(() => {
    if (privateRoute && !user) void requireLogin();
  }, [privateRoute, user?.uid, path]);
  const unread = (notifications.data?.notifications || []).filter(
      (n: Row) => !n.readAt,
    ).length,
    unreadChat = (inbox.data?.conversations || []).reduce(
      (n: number, c: Row) => n + (Number(c.unreadCount) || (c.unread ? 1 : 0)),
      0,
    );
  let page: React.ReactNode;
  if (privateRoute && !user)
    page = (
      <section className="a-page">
        <h1>Your Aura account</h1>
        <p>Sign in to continue where you left off.</p>
        <Button onClick={() => void requireLogin()}>Sign in</Button>
      </section>
    );
  else if (["terms", "terms-and-conditions"].includes(parts[0]))
    page = <LegalPage />;
  else if (["privacy", "privacy-policy"].includes(parts[0]))
    page = <LegalPage privacy />;
  else if (["events", "community"].includes(parts[0]))
    page = (
      <Social
        key={`${parts[0]}-${user?.uid || "guest"}`}
        events={parts[0] === "events"}
        id={parts[1]}
      />
    );
  else if (parts[0] === "dine" && parts.length === 3)
    page = (
      <Dining key={parts.join("/")} merchantId={parts[1]} tableId={parts[2]} />
    );
  else if (parts[0] === "admin") page = <AdminConsole />;
  else if (parts[0] === "portal")
    page = <BusinessCenter initialId={parts[1]} />;
  else if (parts[0] === "join") page = <JoinTeam />;
  else if (parts[0] === "messages") page = <Inbox initialId={parts[1]} />;
  else if (parts[0] === "orders") page = <OrdersPage />;
  else if (parts[0] === "notifications") page = <NotificationPage />;
  else if (parts[0] === "live-payments") page = <LivePayment id={parts[1]} />;
  else if (parts[0] === "live") page = <LiveMarket id={parts[1]} />;
  else if (parts[0] === "rides") page = <Rides />;
  else if (parts[0] === "driver") page = <Driver />;
  else if (parts[0] === "account") page = <Account />;
  else
    page = (
      <Catalog
        key={parts[0] || "food"}
        kind={
          (
            {
              groceries: "grocery",
              homes: "property",
              motors: "motor",
              lifestyle: "lifestyle",
            } as Record<string, Kind>
          )[parts[0]] || "food"
        }
      />
    );
  return (
    <Platform.Provider
      value={{
        requireLogin,
        toast: setToast,
        confirm: ask,
        cart,
        setCart,
        add,
        saved,
        toggleSaved,
        openChat,
      }}
    >
      <div className="a-shell">
        <header className="a-header">
          <button className="a-logo" onClick={() => go("/")}>
            <img
              src="/aura-icon-192.png"
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: 10 }}
            />
            <div>
              aura<span>Made for your everyday.</span>
            </div>
          </button>
          <nav className="a-main-nav">
            {nav.map(([href, title]) => (
              <button
                key={href}
                className={path === href ? "active" : ""}
                onClick={() => go(href)}
              >
                {title}
              </button>
            ))}
          </nav>
          <div className="a-header-actions">
            <button
              key={pulse}
              className={`a-icon ${pulse ? "a-favorite-pop" : ""}`}
              aria-label="Saved items"
              onClick={() => {
                void requireLogin().then((ok) => {
                  if (ok)
                    go(
                      ([
                        "/homes",
                        "/motors",
                        "/lifestyle",
                        "/groceries",
                      ].includes(path)
                        ? path
                        : "/") + "?tab=saved",
                    );
                });
              }}
            >
              <Heart size={21} />
            </button>
            <button
              className="a-icon"
              aria-label={`Messages${unreadChat ? ", unread messages" : ""}`}
              onClick={() => go("/messages")}
            >
              <MessageCircle size={21} />
              {unreadChat > 0 && (
                <small className="a-count">{unreadChat}</small>
              )}
            </button>
            <button
              className="a-icon"
              aria-label="Notifications"
              onClick={() => go("/notifications")}
            >
              <Bell size={21} />
              {unread > 0 && <small className="a-count">{unread}</small>}
            </button>
            <button
              className="a-icon"
              aria-label="Business workspace"
              onClick={() => go("/portal")}
            >
              <Store size={21} />
            </button>
            <button
              className="a-icon"
              aria-label="Account"
              onClick={() => go("/account")}
            >
              <User size={21} />
            </button>
            {["admin", "super_admin"].includes(user?.role || "") && (
              <button
                className="a-icon"
                aria-label="Administration"
                onClick={() => go("/admin")}
              >
                <ShieldCheck />
              </button>
            )}
          </div>
        </header>
        <main key={privateRoute ? user?.uid : "public"}>
          <Suspense fallback={<Busy text="Opening your workspace..." />}>
            {page}
          </Suspense>
        </main>
        {![
          "live",
          "messages",
          "admin",
          "terms",
          "privacy",
          "terms-and-conditions",
          "privacy-policy",
        ].includes(parts[0]) && <ActiveOrders />}
        <footer className="a-site-footer">
          <span>Aura Liberia</span>
          <LegalLinks />
          <button onClick={() => go("/portal")}>For businesses</button>
          <button onClick={() => go("/admin")}>Administration</button>
        </footer>
      </div>
      <LoginModal
        isOpen={login}
        onClose={() => {
          setLogin(false);
          if (!auth.currentUser)
            waiting.current.splice(0).forEach((f) => f(false));
        }}
        restaurants={[]}
        onOpenRestaurantPortal={() => go("/portal")}
      />
      {confirm && (
        <Dialog
          title={confirm.title}
          onClose={() => {
            confirm.resolve(false);
            setConfirm(null);
          }}
        >
          <p>{confirm.message}</p>
          <Button
            onClick={() => {
              confirm.resolve(true);
              setConfirm(null);
            }}
          >
            {confirm.action}
          </Button>
        </Dialog>
      )}
      {toast && (
        <div className="a-toast" role="status">
          {toast}
        </div>
      )}
    </Platform.Provider>
  );
}
