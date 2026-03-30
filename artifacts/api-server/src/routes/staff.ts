import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable, siteSettingsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireStaffAuth } from "./admin";

const router: IRouter = Router();

const VALID_STATUSES = ["pending", "assigned", "completed", "cancelled", "no_show"] as const;
type Status = typeof VALID_STATUSES[number];

// GET /api/staff/reservations/pending
router.get("/reservations/pending", requireStaffAuth, async (req, res) => {
  const staffId = (req as any).staffId as number;

  try {
    const rows = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.assignedStaffId, staffId),
          eq(reservationsTable.status, "pending")
        )
      )
      .orderBy(desc(reservationsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// GET /api/staff/reservations/completed
router.get("/reservations/completed", requireStaffAuth, async (req, res) => {
  const staffId = (req as any).staffId as number;

  try {
    const rows = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.assignedStaffId, staffId),
          eq(reservationsTable.status, "completed")
        )
      )
      .orderBy(desc(reservationsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// GET /api/staff/reservations?status=pending|assigned|completed|cancelled
router.get("/reservations", requireStaffAuth, async (req, res) => {
  const staffId = (req as any).staffId as number;
  const { status } = req.query as { status?: Status };

  const conditions: any[] = [eq(reservationsTable.assignedStaffId, staffId)];
  if (status && VALID_STATUSES.includes(status)) {
    conditions.push(eq(reservationsTable.status, status));
  }

  try {
    const rows = await db
      .select()
      .from(reservationsTable)
      .where(and(...conditions))
      .orderBy(desc(reservationsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

const QUICK_PHRASES_KEY = "staff_quick_phrases";
const DEFAULT_PHRASES = [
  "안녕하세요",
  "가는중 입니다 약속장소에서 뵙겠습니다",
  "잠시후 약속시간에 뵙겠습니다",
  "확인부탁드립니다",
  "도착했습니다",
];

router.get("/quick-phrases", requireStaffAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, QUICK_PHRASES_KEY));
    if (rows.length > 0) {
      res.json(JSON.parse(rows[0].value));
    } else {
      res.json(DEFAULT_PHRASES);
    }
  } catch {
    res.json(DEFAULT_PHRASES);
  }
});

router.post("/quick-phrases", requireStaffAuth, async (req, res) => {
  try {
    const phrases: string[] = req.body.phrases;
    if (!Array.isArray(phrases)) { res.status(400).json({ error: "phrases must be array" }); return; }
    await db.insert(siteSettingsTable)
      .values({ key: QUICK_PHRASES_KEY, value: JSON.stringify(phrases) })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(phrases) } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save" });
  }
});

export default router;
