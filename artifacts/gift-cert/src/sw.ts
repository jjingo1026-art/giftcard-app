/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Workbox가 빌드 시 precache manifest를 여기에 주입합니다
precacheAndRoute(self.__WB_MANIFEST);

// 읽지 않은 메시지 카운터 (in-memory; 알림 클릭 시 초기화)
let badgeCount = 0;

// Push 이벤트: 알림 표시
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; reservationId?: string | number } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? "우리동네상품권";
  const body = payload.body ?? "새 메시지가 도착했습니다.";
  const url = payload.url ?? "/";

  badgeCount++;

  const notificationOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: `chat-${payload.reservationId ?? "msg"}`,
    renotify: true,
    data: { url },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, notificationOptions);
      if ("setAppBadge" in self.navigator) {
        await (self.navigator as Navigator & { setAppBadge: (n: number) => Promise<void> })
          .setAppBadge(badgeCount);
      }
    })()
  );
});

// 알림 클릭: 채팅 페이지로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = (event.notification.data as { url?: string })?.url ?? "/";

  badgeCount = 0;

  event.waitUntil(
    (async (): Promise<void> => {
      if ("clearAppBadge" in self.navigator) {
        await (self.navigator as Navigator & { clearAppBadge: () => Promise<void> })
          .clearAppBadge();
      }
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          await client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

// 뱃지 초기화 메시지 수신 (채팅창 열림 시)
self.addEventListener("message", (event) => {
  if ((event.data as { type?: string })?.type === "CLEAR_BADGE") {
    badgeCount = 0;
    if ("clearAppBadge" in self.navigator) {
      (self.navigator as Navigator & { clearAppBadge: () => Promise<void> })
        .clearAppBadge().catch(() => {});
    }
  }
});
