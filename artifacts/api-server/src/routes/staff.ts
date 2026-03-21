import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable } from "@workspace/db/schema";
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

export default router;
