import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, reservationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
});

router.post("/subscribe", async (req, res) => {
  const { reservationId, subscription } = req.body as {
    reservationId: string;
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  };

  if (!reservationId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: "잘못된 요청입니다." });
    return;
  }

  try {
    await db
      .insert(pushSubscriptionsTable)
      .values({
        reservationId: String(reservationId),
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          reservationId: String(reservationId),
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "서버 오류" });
  }
});

router.delete("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) { res.status(400).json({ error: "endpoint 필요" }); return; }

  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  res.json({ success: true });
});

export async function sendPushToReservation(
  reservationId: number | string,
  payload: { title: string; body: string; url?: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.reservationId, String(reservationId)));

  const data = JSON.stringify({ ...payload, reservationId });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        }
      }
    })
  );
}

export default router;
