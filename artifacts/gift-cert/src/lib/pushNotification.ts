const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(reservationId: string | number): Promise<boolean> {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.ready;

    const keyRes = await fetch(`${BASE_URL}/api/push/vapid-public-key`);
    const { publicKey } = await keyRes.json() as { publicKey: string | null };
    if (!publicKey) return false;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await fetch(`${BASE_URL}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: String(reservationId), subscription: existing.toJSON() }),
      });
      return true;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
    });

    await fetch(`${BASE_URL}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: String(reservationId), subscription: subscription.toJSON() }),
    });

    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${BASE_URL}/api/push/unsubscribe`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch {
    // ignore
  }
}

export function clearBadge(): void {
  if ("clearAppBadge" in navigator) {
    (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge?.();
  }
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_BADGE" });
  }
}
