self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data.json();
      } catch {
        return;
      }
      const cache = await caches.open("aura-web-push"),
        record = await cache.match("/aura-push-user"),
        uid = record ? await record.text() : "";
      if (!uid || payload.data?.recipientUid !== uid) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows)
        client.postMessage({ type: "AURA_PUSH", recipientUid: uid });
      if (windows.some((client) => client.visibilityState === "visible"))
        return;
      await self.registration.showNotification(
        payload.notification?.title || "Aura update",
        {
          body: payload.notification?.body || "Open Aura for an update.",
          icon: "/favicon.ico",
          tag: payload.data?.eventId,
          data: payload.data || {},
        },
      );
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const d = event.notification.data || {},
        valid = (v) =>
          typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
      let path = "/notifications";
      if (valid(d.socialId))
        path =
          "/" +
          (d.socialKind === "event" ? "events" : "community") +
          "/" +
          d.socialId;
      else if (valid(d.conversationId)) path = "/messages/" + d.conversationId;
      else if (valid(d.orderId)) path = "/orders?order=" + d.orderId;
      else if (valid(d.liveSessionId || d.liveId))
        path = "/live/" + (d.liveSessionId || d.liveId);
      else if (valid(d.businessId)) path = "/portal";
      const url = new URL(path, self.location.origin).href;
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (clients.length) {
        await clients[0].navigate(url);
        await clients[0].focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
