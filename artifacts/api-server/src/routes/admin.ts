import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const ADMIN_ID = process.env.ADMIN_ID ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "1234";
const tokens = new Map<string, number>();

function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const exp = tokens.get(token);
  if (!exp || Date.now() > exp) {
    res.status(401).json({ error: "인증이 필요합니다." });
    return;
  }
  next();
}

router.post("/login", async (req, res) => {
  const { id, password } = req.body as { id?: string; password?: string };
  if (id !== ADMIN_ID || password !== ADMIN_PASSWORD) {
    res.status(401).json({ success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
    return;
  }
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  tokens.set(token, expiresAt);
  res.json({ token, expiresAt });
});

router.get("/reservations", requireAuth, async (req, res) => {
  const { date } = req.query as { date?: string };
  let rows = await db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
  if (date) {
    rows = rows.filter((r) => r.date === date || r.createdAt.toISOString().startsWith(date));
  }
  res.json(rows);
});

router.get("/reservations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const [row] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
  if (!row) { res.status(404).json({ error: "접수 정보를 찾을 수 없습니다." }); return; }
  res.json(row);
});

router.post("/reservations/:id/status", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const { status } = req.body as { status?: string };
  const allowed = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: "유효하지 않은 상태값입니다.", allowed });
    return;
  }
  const [updated] = await db
    .update(reservationsTable)
    .set({ status })
    .where(eq(reservationsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "접수 정보를 찾을 수 없습니다." }); return; }
  res.json(updated);
});

router.post("/reservations/:id/assign", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const { assignedTo } = req.body as { assignedTo?: string };
  if (typeof assignedTo !== "string") {
    res.status(400).json({ error: "assignedTo 필드가 필요합니다." });
    return;
  }
  const [updated] = await db
    .update(reservationsTable)
    .set({ assignedTo: assignedTo || null })
    .where(eq(reservationsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "접수 정보를 찾을 수 없습니다." }); return; }
  res.json(updated);
});

export default router;
