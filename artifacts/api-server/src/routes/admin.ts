import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const ADMIN_ID = process.env.ADMIN_ID ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "1234";
const tokens = new Map<string, number>();

const staff = [
  { id: 1, name: "홍길동", phone: "010-1111-2222", password: "1234", status: "approved" },
  { id: 2, name: "김철수", phone: "010-3333-4444", password: "1234", status: "pending"  },
];

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

router.get("/staff", requireAuth, (_req, res) => {
  res.json(staff.map(({ password: _pw, ...s }) => s));
});

router.get("/staff/pending", requireAuth, (_req, res) => {
  const pending = staff.filter((s) => s.status === "pending").map(({ password: _pw, ...s }) => s);
  res.json(pending);
});

router.post("/staff/:id/approve", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const user = staff.find((s) => s.id === id);
  if (!user) { res.status(404).json({ success: false, error: "직원을 찾을 수 없습니다." }); return; }
  user.status = "approved";
  res.json({ success: true });
});

router.post("/staff/login", (req, res) => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  const user = staff.find((s) => s.phone === phone && s.password === password);
  if (!user) {
    res.json({ success: false, message: "정보 틀림" });
    return;
  }
  if (user.status !== "approved") {
    res.json({ success: false, message: "승인 대기중" });
    return;
  }
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  tokens.set(token, expiresAt);
  res.json({ success: true, token, expiresAt, staffId: user.id, name: user.name });
});

router.post("/staff/register", (req, res) => {
  const { name, phone, password } = req.body as { name?: string; phone?: string; password?: string };
  if (!name || !phone || !password) {
    res.status(400).json({ success: false, error: "name, phone, password는 필수입니다." });
    return;
  }
  const newStaff = { id: Date.now(), name, phone, password, status: "pending" };
  staff.push(newStaff);
  res.json({ success: true, message: "신청 완료 (승인 대기)" });
});

router.get("/reservations", requireAuth, async (req, res) => {
  const { date } = req.query as { date?: string };
  let rows = await db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
  if (date) {
    rows = rows.filter((r) => r.date === date);
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
  const allowed = ["pending", "assigned", "completed", "cancelled"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: "유효하지 않은 상태값입니다.", allowed });
    return;
  }
  await db
    .update(reservationsTable)
    .set({ status, completedAt: status === "completed" ? new Date() : null })
    .where(eq(reservationsTable.id, id));
  res.json({ success: true });
});

router.post("/reservations/:id/assign", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const { staffId } = req.body as { staffId?: number };
  const member = staff.find((s) => s.id === staffId);
  if (!member) {
    res.status(400).json({ error: "유효하지 않은 직원 ID입니다." });
    return;
  }
  await db
    .update(reservationsTable)
    .set({ assignedStaffId: member.id, assignedTo: member.name, status: "assigned" })
    .where(eq(reservationsTable.id, id));
  res.json({ success: true });
});

export default router;
