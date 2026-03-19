import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable, chatsTable, staffTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import crypto from "crypto";
import { emitToRoom } from "../socket";

const router: IRouter = Router();

const ADMIN_ID = process.env.ADMIN_ID ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "1234";
const tokens = new Map<string, number>();
const staffTokens = new Map<string, { staffId: number; exp: number }>();


// 기존 staff 데이터 시드 (서버 최초 기동 시 DB에 없을 경우 삽입)
async function seedStaff() {
  const existing = await db.select().from(staffTable);
  if (existing.length === 0) {
    await db.insert(staffTable).values({
      name: "김철수", phone: "010-2222-3333", password: "1234", status: "approved",
    });
  }
}
seedStaff().catch(console.error);


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

function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const exp = tokens.get(token);
  if (!exp || Date.now() > exp) {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
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

router.get("/staff", requireAuth, async (_req, res) => {
  const rows = await db.select({ id: staffTable.id, name: staffTable.name, phone: staffTable.phone, status: staffTable.status }).from(staffTable);
  res.json(rows);
});

router.get("/staff/pending", requireAuth, async (_req, res) => {
  const rows = await db.select({ id: staffTable.id, name: staffTable.name, phone: staffTable.phone, status: staffTable.status })
    .from(staffTable).where(eq(staffTable.status, "pending"));
  res.json(rows);
});

router.post("/staff/:id/approve", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await db.select().from(staffTable).where(eq(staffTable.id, id));
  if (!user) { res.status(404).json({ success: false, error: "직원을 찾을 수 없습니다." }); return; }
  await db.update(staffTable).set({ status: "approved" }).where(eq(staffTable.id, id));
  res.json({ success: true });
});

router.post("/staff/:id/reject", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await db.select().from(staffTable).where(eq(staffTable.id, id));
  if (!user) { res.status(404).json({ success: false, error: "직원을 찾을 수 없습니다." }); return; }
  await db.update(staffTable).set({ status: "rejected" }).where(eq(staffTable.id, id));
  res.json({ success: true });
});

router.post("/staff/login", async (req, res) => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  const [user] = await db.select().from(staffTable)
    .where(eq(staffTable.phone, phone ?? ""));
  if (!user || user.password !== password) {
    res.json({ success: false, message: "정보 틀림" }); return;
  }
  if (user.status !== "approved") {
    res.json({ success: false, message: "승인 대기중" }); return;
  }
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  staffTokens.set(token, { staffId: user.id, exp: expiresAt });
  res.json({ success: true, token, expiresAt, staffId: user.id, name: user.name });
});

router.post("/staff/register", async (req, res) => {
  const { name, phone, password } = req.body as { name?: string; phone?: string; password?: string };
  if (!name || !phone || !password) {
    res.status(400).json({ success: false, error: "name, phone, password는 필수입니다." }); return;
  }
  const [existing] = await db.select().from(staffTable).where(eq(staffTable.phone, phone));
  if (existing) {
    res.json({ success: false, message: "이미 등록됨" }); return;
  }
  await db.insert(staffTable).values({ name, phone, password, status: "pending" });
  res.json({ success: true, message: "신청 완료 (승인 대기)" });
});

// 관리자용: 매입담당자별 요약 (진행중/완료 건수)
router.get("/staff-summary", requireAuth, async (_req, res) => {
  const [staffList, rows] = await Promise.all([
    db.select().from(staffTable).where(eq(staffTable.status, "approved")),
    db.select().from(reservationsTable),
  ]);

  const summary = staffList.map((s) => ({
    id: s.id,
    name: s.name,
    assigned:  rows.filter((r) => r.assignedStaffId === s.id && r.status === "assigned").length,
    completed: rows.filter((r) => r.assignedStaffId === s.id && r.status === "completed").length,
  }));

  res.json(summary);
});

// 관리자용: 특정 매입담당자의 예약 조회 (status 필터 옵션)
router.get("/staff/:staffId/reservations", requireAuth, async (req, res) => {
  const staffId = Number(req.params.staffId);
  const { status } = req.query as { status?: string };

  const rows = await db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));

  let result = rows.filter((r) => r.assignedStaffId === staffId);
  if (status) {
    result = result.filter((r) => r.status === status);
  }

  res.json(result);
});

// 관리자용: 매입담당자별 예약 조회 (assigned / completed)
router.get("/staff/reservations", requireAuth, async (_req, res) => {
  const [staffList, rows] = await Promise.all([
    db.select().from(staffTable).where(eq(staffTable.status, "approved")),
    db.select().from(reservationsTable).orderBy(desc(reservationsTable.createdAt)),
  ]);

  const grouped = staffList.map((s) => {
    const mine = rows.filter((r) => r.assignedStaffId === s.id);
    return {
      staff: { id: s.id, name: s.name, phone: s.phone },
      assigned:  mine.filter((r) => r.status === "assigned"),
      completed: mine.filter((r) => r.status === "completed"),
    };
  });

  res.json(grouped);
});

// 매입담당자용: 담당 예약 완료 처리
router.post("/reservations/:id/complete", requireStaffAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const staffId = (req as any).staffId as number;
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }

  const [row] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
  if (!row) { res.status(404).json({ error: "예약을 찾을 수 없습니다." }); return; }
  if (row.assignedStaffId !== staffId) {
    res.status(403).json({ error: "담당 예약이 아닙니다." }); return;
  }

  await db
    .update(reservationsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(reservationsTable.id, id));

  // 채팅방에 자동 완료 메시지
  const [member] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  const [autoComplete] = await db.insert(chatsTable).values({
    reservationId: id,
    sender: "staff",
    senderName: member?.name ?? "매입담당자",
    message: "매입이 완료되었습니다. 감사합니다!",
  }).returning();
  emitToRoom(id, "newMessage", { ...autoComplete, time: autoComplete.time.toISOString() });

  res.json({ success: true });
});

router.get("/staff/my-reservations", requireStaffAuth, async (req, res) => {
  const staffId = (req as any).staffId as number;
  const rows = await db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));
  res.json(rows.filter((r) => r.assignedStaffId === staffId));
});

const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

router.get("/reservations", requireAuth, requireAdmin, async (req, res) => {
  const { date, status, page = "1", limit = "20" } = req.query as {
    date?: string;
    status?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date format" }); return;
  }

  let query = db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt))
    .limit(limitNum)
    .offset((pageNum - 1) * limitNum);

  if (date) {
    query = query.where(eq(reservationsTable.date, date));
  }

  if (status) {
    query = query.where(eq(reservationsTable.status, status));
  }

  const rows = await query;

  res.json(rows);
});

router.get("/reservations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const [row] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
  if (!row) { res.status(404).json({ error: "접수 정보를 찾을 수 없습니다." }); return; }
  res.json(row);
});

router.post("/reservations/:id/status", async (req, res) => {
  // 관리자 또는 매입담당자 토큰 허용
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const isAdmin = tokens.has(token) && Date.now() <= (tokens.get(token) ?? 0);
  const staffEntry = staffTokens.get(token);
  const isStaff = !!staffEntry && Date.now() <= staffEntry.exp;
  if (!isAdmin && !isStaff) {
    res.status(401).json({ error: "인증이 필요합니다." }); return;
  }

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
    .set({
      status,
      completedAt: status === "completed" ? new Date() : null,
      cancelledAt: status === "cancelled" ? new Date() : null,
    })
    .where(eq(reservationsTable.id, id));
  res.json({ success: true });
});

router.post("/reservations/:id/assign", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const { staffId } = req.body as { staffId?: number };
  const [member] = staffId ? await db.select().from(staffTable).where(eq(staffTable.id, staffId)) : [];
  if (!member) {
    res.status(400).json({ error: "유효하지 않은 직원 ID입니다." });
    return;
  }
  await db
    .update(reservationsTable)
    .set({ assignedStaffId: member.id, assignedTo: member.name, status: "assigned" })
    .where(eq(reservationsTable.id, id));

  // 채팅방에 자동 안내 메시지 전송
  const [autoAssign] = await db.insert(chatsTable).values({
    reservationId: id,
    sender: "admin",
    senderName: "관리자",
    message: "담당자가 배정되었습니다. 앱에서 확인하세요.",
  }).returning();
  emitToRoom(id, "newMessage", { ...autoAssign, time: autoAssign.time.toISOString() });

  res.json({ success: true });
});

// ── 채팅: 예약 1개 = 채팅방 1개 ──────────────────────────────────────────────

async function resolveAuth(req: any): Promise<{ ok: boolean; senderType: "admin" | "staff"; senderName: string }> {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // 관리자 토큰 확인
  const adminExp = tokens.get(token);
  if (adminExp && Date.now() <= adminExp) {
    return { ok: true, senderType: "admin", senderName: "관리자" };
  }

  // 직원 토큰 확인
  const staffEntry = staffTokens.get(token);
  if (staffEntry && Date.now() <= staffEntry.exp) {
    const [member] = await db.select().from(staffTable).where(eq(staffTable.id, staffEntry.staffId));
    return { ok: true, senderType: "staff", senderName: member?.name ?? "직원" };
  }

  return { ok: false, senderType: "staff", senderName: "" };
}

const NAME_MAP: Record<string, string> = { customer: "고객", admin: "관리자", staff: "담당자", system: "시스템" };

router.get("/chat/:reservationId", async (req, res) => {
  const reservationId = Number(req.params.reservationId);
  const rows = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.reservationId, reservationId))
    .orderBy(asc(chatsTable.time));
  res.json(rows.map((r) => ({ ...r, time: r.time.toISOString() })));
});

router.post("/chat/send", async (req, res) => {
  const { reservationId, sender, senderName, message } = req.body as { reservationId?: number; sender?: string; senderName?: string; message?: string };
  if (!reservationId || !sender || !message?.trim()) {
    res.status(400).json({ error: "reservationId, sender, message는 필수입니다." }); return;
  }
  const [inserted] = await db.insert(chatsTable).values({
    reservationId,
    sender,
    senderName: senderName ?? NAME_MAP[sender] ?? sender,
    message: message.trim(),
  }).returning();
  const msgOut = { ...inserted, time: inserted.time.toISOString() };
  emitToRoom(reservationId, "newMessage", msgOut);
  res.json({ success: true, id: inserted.id });
});

router.get("/messages/:reservationId", async (req, res) => {
  const auth = await resolveAuth(req);
  if (!auth.ok) { res.status(401).json({ error: "인증이 필요합니다." }); return; }
  const reservationId = parseInt(req.params.reservationId);
  const rows = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.reservationId, reservationId))
    .orderBy(asc(chatsTable.time));
  res.json(rows.map((r) => ({ ...r, time: r.time.toISOString() })));
});

router.post("/messages/:reservationId", async (req, res) => {
  const auth = await resolveAuth(req);
  if (!auth.ok) { res.status(401).json({ error: "인증이 필요합니다." }); return; }
  const reservationId = parseInt(req.params.reservationId);
  const { message } = req.body as { message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "메시지를 입력해주세요." }); return; }
  const [inserted] = await db.insert(chatsTable).values({
    reservationId,
    sender: auth.senderType,
    senderName: auth.senderName,
    message: message.trim(),
  }).returning();
  res.json({ ...inserted, time: inserted.time.toISOString() });
});

// ── 고객용: 예약 취소 ─────────────────────────────────────────────────────────
router.post("/customer/cancel", async (req, res) => {
  const { phone, reservationId } = req.body as { phone?: string; reservationId?: number };
  if (!phone || !reservationId) {
    res.status(400).json({ success: false, error: "phone, reservationId 필수입니다." }); return;
  }
  const [row] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, reservationId));

  if (!row) {
    res.status(404).json({ success: false, error: "예약을 찾을 수 없습니다." }); return;
  }
  if (row.phone !== phone) {
    res.status(403).json({ success: false, error: "전화번호가 일치하지 않습니다." }); return;
  }
  if (row.status === "cancelled") {
    res.json({ success: false, error: "이미 취소된 예약입니다." }); return;
  }
  if (row.status === "completed") {
    res.json({ success: false, error: "완료된 예약은 취소할 수 없습니다." }); return;
  }

  // 예약 1시간 전까지만 취소 가능
  if (row.date && row.time) {
    const scheduled = new Date(`${row.date}T${row.time}`);
    const diffMs = scheduled.getTime() - Date.now();
    if (diffMs < 60 * 60 * 1000) {
      res.json({ success: false, error: "예약 1시간 전까지만 취소할 수 있습니다." }); return;
    }
  }

  await db
    .update(reservationsTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(reservationsTable.id, reservationId));

  res.json({ success: true });
});

// ── 고객용: 전화번호로 예약 조회 ─────────────────────────────────────────────
router.get("/customer/reservation", async (req, res) => {
  const { phone } = req.query as { phone?: string };
  if (!phone) {
    res.status(400).json({ success: false, error: "phone 파라미터가 필요합니다." });
    return;
  }

  const rows = await db
    .select()
    .from(reservationsTable)
    .orderBy(desc(reservationsTable.createdAt));

  const result = rows.find((r) => r.phone === phone);
  if (!result) {
    res.json({ success: false });
    return;
  }

  const [assignedStaff] = result.assignedStaffId
    ? await db.select().from(staffTable).where(eq(staffTable.id, result.assignedStaffId))
    : [];

  res.json({
    success: true,
    reservation: result,
    staff: assignedStaff
      ? { id: assignedStaff.id, name: assignedStaff.name, phone: assignedStaff.phone }
      : null,
  });
});

export default router;
