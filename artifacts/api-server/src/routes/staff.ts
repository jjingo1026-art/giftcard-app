import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { staffTokens } from "./admin";

const router: IRouter = Router();

function requireStaffAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const entry = staffTokens.get(token);
  if (!entry || Date.now() > entry.exp) {
    res.status(401).json({ error: "인증이 필요합니다." });
    return;
  }
  req.staffId = entry.staffId;
  next();
}

const VALID_STATUSES = ["pending", "assigned", "completed", "cancelled"] as const;
type Status = typeof VALID_STATUSES[number];

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
