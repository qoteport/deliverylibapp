import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ArrowUpRight } from "lucide-react";
import { command } from "../utils/commandApi";
import { useRemote, friendly } from "./hooks";
import { usePlatform, go } from "./context";
import { Button, Empty, Notice } from "./ui";
import { Row } from "./model";
import { app, auth } from "../firebase/config";
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
} from "firebase/messaging";
export async function enablePush() {
  if (!(await isSupported()) || !("serviceWorker" in navigator))
    throw new Error(
      "Push notifications are not available in this browser. In-app updates still work.",
    );
  const key = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "");
  if (!key)
    throw new Error(
      "Browser push is awaiting configuration. In-app notifications remain available.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Allow notifications in your browser settings to receive alerts.",
    );
  const registration = await navigator.serviceWorker.register(
    "/aura-push-sw.js",
    { scope: "/aura-push/" },
  );
  if (!registration.active)
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker)
        return reject(
          new Error("Notification setup did not finish. Try again."),
        );
      const timer = setTimeout(
        () => reject(new Error("Notification setup timed out. Try again.")),
        15000,
      );
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  const token = await getToken(getMessaging(app), {
    vapidKey: key,
    serviceWorkerRegistration: registration,
  });
  await setPushAccount(auth.currentUser?.uid || "");
  await command("/v1/devices", { token, targetType: "token", active: true });
  localStorage.setItem("aura_web_push_token", token);
  return token;
}
export async function setPushAccount(uid: string) {
  if ("caches" in window) {
    const cache = await caches.open("aura-web-push");
    await cache.put("/aura-push-user", new Response(uid));
  }
}
export async function disablePush() {
  await setPushAccount("").catch(() => {});
  const token = localStorage.getItem("aura_web_push_token");
  if (token && auth.currentUser)
    await command("/v1/devices", { token, active: false }).catch(() => {});
  localStorage.removeItem("aura_web_push_token");
  if (token)
    try {
      if (await isSupported()) await deleteToken(getMessaging(app));
    } catch {
      /* Signing out still clears this tab's identity when push configuration is unavailable. */
    }
}
export function NotificationPage() {
  const notifications = useRemote("/v1/notifications", undefined, 5000),
    { requireLogin, toast } = usePlatform(),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void requireLogin();
  }, []);
  const open = async (n: Row) => {
    try {
      await command(`/v1/notifications/${n.id}/read`, {});
      notifications.reload();
      window.dispatchEvent(new Event("aura-notifications"));
      const d = n.data || {};
      if (d.socialId)
        go(
          "/" +
            (d.socialKind === "event" ? "events" : "community") +
            "/" +
            d.socialId,
        );
      else if (d.conversationId) go("/messages/" + d.conversationId);
      else if (d.orderId) go("/orders?order=" + d.orderId);
      else if (d.businessId) go("/portal/" + d.businessId);
      else if (d.liveSessionId || d.liveId)
        go("/live/" + (d.liveSessionId || d.liveId));
      else if (d.rideId) go("/rides?ride=" + d.rideId);
    } catch (e) {
      setError(friendly(e));
    }
  };
  return (
    <section className="a-page narrow">
      <span className="a-eyebrow">KEEPING YOU IN THE LOOP</span>
      <h1>Your updates</h1>
      <Button
        secondary
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await enablePush();
            toast("Browser notifications enabled.");
          } catch (e) {
            setError(friendly(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Bell size={17} />
        Enable browser notifications
      </Button>
      <Notice
        error={error || notifications.error}
        retry={notifications.reload}
      />
      <section className="a-section">
        {(notifications.data?.notifications || []).map((n: Row) => (
          <button
            className="a-list-card"
            style={{
              width: "100%",
              textAlign: "left",
              borderColor: n.readAt ? "#e3eae5" : "#86c8a0",
            }}
            key={n.id}
            onClick={() => open(n)}
          >
            <div className="a-row between">
              <strong>{n.title}</strong>
              {!n.readAt && <span className="a-badge">New</span>}
            </div>
            <p>{n.message}</p>
            <small>{new Date(n.createdAt).toLocaleString()}</small>
          </button>
        ))}
        {!notifications.loading &&
          !notifications.data?.notifications?.length && (
            <Empty title="All caught up">
              <p>Order, message and business updates will appear here.</p>
            </Empty>
          )}
      </section>
    </section>
  );
}
