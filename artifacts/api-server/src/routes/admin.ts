import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable, chatsTable, staffTable, penaltiesTable, usersTable, adminSettingsTable, adminAccountsTable, siteSettingsTable } from "@workspace/db/schema";
import { eq, desc, asc, and, sql, gte, lte, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { runPrivacyCleanup } from "../cleanup";
import { emitToRoom, broadcast } from "../socket";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_MS,
} from "../lib/jwt";

const router: IRouter = Router();

const DEFAULT_ADMIN_ID = process.env.ADMIN_ID ?? "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "1234";

async function getAdminCredentials(): Promise<{ adminId: string; adminPassword: string }> {
  const rows = await db.select().from(adminSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  return { adminId: DEFAULT_ADMIN_ID, adminPassword: DEFAULT_ADMIN_PASSWORD };
}

async function seedAdminSettings() {
  const existing = await db.select().from(adminSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(adminSettingsTable).values({
      adminId: DEFAULT_ADMIN_ID,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
    });
  }
}
seedAdminSettings().catch(console.error);

async function seedStaff() {
  const existing = await db.select().from(staffTable);
  if (existing.length === 0) {
    await db.insert(staffTable).values({
      name: "김철수", phone: "010-2222-3333", password: "1234", status: "approved",
    });
  }
}
seedStaff().catch(console.error);

function extractBearer(req: any): string {
  const auth = req.headers.authorization ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export function requireStaffAuth(req: any, res: any, next: any) {
  const token = extractBearer(req);
  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== "staff" || !payload.staffId) throw new Error();
    req.staffId = payload.staffId;
    next();
  } catch {
    res.status(401).json({ error: "인증이 필요합니다." });
  }
}

function requireAuth(req: any, res: any, next: any) {
  const token = extractBearer(req);
  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== "admin") throw new Error();
    next();
  } catch {
    res.status(401).json({ error: "인증이 필요합니다." });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, next);
}

router.post("/login", async (req, res) => {
  const { id, password } = req.body as { id?: string; password?: string };
  if (!id || !password) {
    res.status(401).json({ success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  let authenticated = false;

  const account = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.username, id)).limit(1);
  if (account.length > 0) {
    authenticated = await bcrypt.compare(password, account[0].passwordHash);
  } else {
    const creds = await getAdminCredentials();
    authenticated = (id === creds.adminId && password === creds.adminPassword);
  }

  if (!authenticated) {
    res.status(401).json({ success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const payload = { id, role: "admin" as const };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  res.cookie("gc_admin_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_MS,
    path: "/api/admin",
  });
  res.json({ token: accessToken });
});

router.post("/refresh", (req, res) => {
  const token = (req as any).cookies?.gc_admin_refresh;
  if (!token) { res.status(401).json({ error: "refresh token 없음" }); return; }
  try {
    const payload = verifyRefreshToken(token);
    const newAccess = generateAccessToken({ id: payload.id, role: "admin" });
    res.json({ token: newAccess });
  } catch {
    res.status(403).json({ error: "refresh token 만료 또는 유효하지 않음" });
  }
});

router.patch("/credentials", requireAuth, async (req, res) => {
  const { currentPassword, newId, newPassword } = req.body as {
    currentPassword?: string;
    newId?: string;
    newPassword?: string;
  };
  if (!currentPassword) {
    res.status(400).json({ error: "현재 비밀번호를 입력해주세요." });
    return;
  }
  const creds = await getAdminCredentials();
  if (currentPassword !== creds.adminPassword) {
    res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다." });
    return;
  }
  if (!newId && !newPassword) {
    res.status(400).json({ error: "변경할 아이디 또는 비밀번호를 입력해주세요." });
    return;
  }
  if (newPassword && newPassword.length < 8) {
    res.status(400).json({ error: "비밀번호는 8자리 이상이어야 합니다." });
    return;
  }
  const updatedId = newId?.trim() || creds.adminId;
  const updatedPassword = newPassword || creds.adminPassword;

  const rows = await db.select().from(adminSettingsTable).limit(1);
  if (rows.length > 0) {
    await db.update(adminSettingsTable)
      .set({ adminId: updatedId, adminPassword: updatedPassword })
      .where(eq(adminSettingsTable.id, rows[0].id));
  } else {
    await db.insert(adminSettingsTable).values({ adminId: updatedId, adminPassword: updatedPassword });
  }
  res.json({ success: true });
});

router.post("/privacy-cleanup", requireAuth, async (_req, res) => {
  try {
    const result = await runPrivacyCleanup();
    res.json({ success: true, cleaned: result.cleaned });
  } catch (e) {
    console.error("[개인정보 삭제 API 오류]", e);
    res.status(500).json({ error: "삭제 처리 중 오류가 발생했습니다." });
  }
});

router.get("/staff", requireAuth, async (_req, res) => {
  const rows = await db.select({ id: staffTable.id, name: staffTable.name, phone: staffTable.phone, status: staffTable.status, preferredLocation: staffTable.preferredLocation }).from(staffTable);
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

router.patch("/staff/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "잘못된 ID" }); return; }
  const { preferredLocation } = req.body as { preferredLocation?: string };
  const [user] = await db.select().from(staffTable).where(eq(staffTable.id, id));
  if (!user) { res.status(404).json({ success: false, error: "담당자를 찾을 수 없습니다." }); return; }
  await db.update(staffTable).set({ preferredLocation: preferredLocation ?? null }).where(eq(staffTable.id, id));
  res.json({ success: true });
});

router.delete("/staff/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "잘못된 ID" }); return; }
  const [user] = await db.select().from(staffTable).where(eq(staffTable.id, id));
  if (!user) { res.status(404).json({ success: false, error: "담당자를 찾을 수 없습니다." }); return; }
  await db.update(reservationsTable)
    .set({ assignedStaffId: null, status: "pending" })
    .where(eq(reservationsTable.assignedStaffId, id));
  await db.delete(staffTable).where(eq(staffTable.id, id));
  res.json({ success: true });
});

router.post("/staff/login", async (req, res) => {
  const { phone, password } = req.body as { phone?: string; password?: string };
  const normalizePhone = (p: string) => p.replace(/\D/g, "");
  const allStaff = await db.select().from(staffTable);
  const user = allStaff.find((s) => normalizePhone(s.phone ?? "") === normalizePhone(phone ?? ""));
  if (!user || user.password !== password) {
    res.json({ success: false, message: "전화번호 또는 비밀번호가 올바르지 않습니다." }); return;
  }
  if (user.status !== "approved") {
    res.json({ success: false, message: "관리자 승인 대기 중입니다. 승인 후 로그인하세요." }); return;
  }
  const payload = { id: String(user.id), role: "staff" as const, staffId: user.id };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  res.cookie("gc_staff_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_MS,
    path: "/api/admin/staff",
  });
  res.json({ success: true, token: accessToken, staffId: user.id, name: user.name });
});

router.post("/staff/refresh", (req, res) => {
  const token = (req as any).cookies?.gc_staff_refresh;
  if (!token) { res.status(401).json({ error: "refresh token 없음" }); return; }
  try {
    const payload = verifyRefreshToken(token);
    if (payload.role !== "staff" || !payload.staffId) throw new Error();
    const newAccess = generateAccessToken({ id: payload.id, role: "staff", staffId: payload.staffId });
    res.json({ token: newAccess });
  } catch {
    res.status(403).json({ error: "refresh token 만료 또는 유효하지 않음" });
  }
});

router.patch("/staff/change-password", requireStaffAuth, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ success: false, error: "새 비밀번호는 8자리 이상이어야 합니다." }); return;
  }
  const staffId = req.staffId as number;
  const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, staffId)).limit(1);
  if (!staff) { res.status(404).json({ success: false, error: "담당자 정보를 찾을 수 없습니다." }); return; }
  if (staff.password !== currentPassword) {
    res.status(401).json({ success: false, error: "현재 비밀번호가 올바르지 않습니다." }); return;
  }
  await db.update(staffTable).set({ password: newPassword }).where(eq(staffTable.id, staffId));
  res.json({ success: true, message: "비밀번호가 변경되었습니다." });
});

router.post("/staff/register", async (req, res) => {
  const { name, phone, password, preferredLocation } = req.body as { name?: string; phone?: string; password?: string; preferredLocation?: string };
  if (!name || !phone || !password) {
    res.status(400).json({ success: false, error: "name, phone, password는 필수입니다." }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: "비밀번호는 8자리 이상이어야 합니다." }); return;
  }
  const allStaff = await db.select().from(staffTable);
  const normalizePhone = (p: string) => p.replace(/\D/g, "");
  const existing = allStaff.find((s) => normalizePhone(s.phone ?? "") === normalizePhone(phone));
  if (existing) {
    if (existing.status === "rejected") {
      await db.update(staffTable)
        .set({ name, phone, password, status: "pending", preferredLocation: preferredLocation ?? null })
        .where(eq(staffTable.id, existing.id));
      res.json({ success: true, message: "재신청 완료 (승인 대기)" }); return;
    }
    if (existing.status === "pending") {
      res.json({ success: false, message: "이미 신청 중입니다. 관리자 승인을 기다려주세요." }); return;
    }
    res.json({ success: false, message: "이미 등록된 전화번호입니다." }); return;
  }
  await db.insert(staffTable).values({ name, phone, password, status: "pending", preferredLocation: preferredLocation ?? null });
  res.json({ success: true, message: "신청 완료 (승인 대기)" });
});

// 관리자용: 매입담당자별 요약 (진행중/완료 건수)
router.get("/staff-summary", requireAuth, async (_req, res) => {
  const [staffList, grouped] = await Promise.all([
    db.select({ id: staffTable.id, name: staffTable.name, preferredLocation: staffTable.preferredLocation })
      .from(staffTable)
      .where(eq(staffTable.status, "approved")),
    db.select({
        staffId:   reservationsTable.assignedStaffId,
        status:    reservationsTable.status,
        count:     sql<number>`COUNT(*)`,
      })
      .from(reservationsTable)
      .where(sql`${reservationsTable.assignedStaffId} IS NOT NULL`)
      .groupBy(reservationsTable.assignedStaffId, reservationsTable.status),
  ]);

  const summary = staffList.map((s) => {
    const rows = grouped.filter((g) => g.staffId === s.id);
    return {
      id:                s.id,
      name:              s.name,
      preferredLocation: s.preferredLocation ?? null,
      assigned:          Number(rows.find((g) => g.status === "assigned")?.count  ?? 0),
      completed:         Number(rows.find((g) => g.status === "completed")?.count ?? 0),
    };
  });

  res.json(summary);
});

// 관리자용: 매입담당자 전체현황 (승인된 + 거래희망지역 + 예약통계)
router.get("/staff-overview", requireAuth, async (_req, res) => {
  const [staffList, grouped] = await Promise.all([
    db.select({
        id: staffTable.id,
        name: staffTable.name,
        phone: staffTable.phone,
        preferredLocation: staffTable.preferredLocation,
      })
      .from(staffTable)
      .where(eq(staffTable.status, "approved")),
    db.select({
        staffId: reservationsTable.assignedStaffId,
        status:  reservationsTable.status,
        count:   sql<number>`COUNT(*)`,
      })
      .from(reservationsTable)
      .where(sql`${reservationsTable.assignedStaffId} IS NOT NULL`)
      .groupBy(reservationsTable.assignedStaffId, reservationsTable.status),
  ]);

  const overview = staffList.map((s) => {
    const rows = grouped.filter((g) => g.staffId === s.id);
    return {
      id:                s.id,
      name:              s.name,
      phone:             s.phone,
      preferredLocation: s.preferredLocation ?? null,
      assigned:          Number(rows.find((g) => g.status === "assigned")?.count  ?? 0),
      completed:         Number(rows.find((g) => g.status === "completed")?.count ?? 0),
      total:             rows.reduce((sum, g) => sum + Number(g.count), 0),
    };
  });

  res.json(overview);
});

// 관리자용: 특정 매입담당자의 예약 조회
// GET /staff/:staffId/reservations?status=pending|assigned|completed|cancelled
router.get("/staff/:staffId/reservations", requireAuth, async (req, res) => {
  const staffId = Number(req.params.staffId);
  const { status } = req.query as { status?: string };
  if (isNaN(staffId)) { res.status(400).json({ error: "잘못된 담당자 ID" }); return; }

  const validStatuses = ["pending", "assigned", "completed", "cancelled"];
  const conditions = [eq(reservationsTable.assignedStaffId, staffId)];
  if (status && validStatuses.includes(status)) {
    conditions.push(eq(reservationsTable.status, status));
  }

  const rows = await db
    .select()
    .from(reservationsTable)
    .where(and(...conditions))
    .orderBy(desc(reservationsTable.createdAt));

  res.json(rows);
});

// 관리자용: 매입담당자별 예약 조회 (assigned / completed)
router.get("/staff/reservations", requireAuth, async (_req, res) => {
  const staffList = await db
    .select()
    .from(staffTable)
    .where(eq(staffTable.status, "approved"));

  const grouped = await Promise.all(
    staffList.map(async (s) => {
      const [assigned, completed] = await Promise.all([
        db.select().from(reservationsTable)
          .where(and(eq(reservationsTable.assignedStaffId, s.id), eq(reservationsTable.status, "assigned")))
          .orderBy(desc(reservationsTable.createdAt)),
        db.select().from(reservationsTable)
          .where(and(eq(reservationsTable.assignedStaffId, s.id), eq(reservationsTable.status, "completed")))
          .orderBy(desc(reservationsTable.createdAt)),
      ]);
      return {
        staff: { id: s.id, name: s.name, phone: s.phone },
        assigned,
        completed,
      };
    })
  );

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

// 담당자용: 본인 예약 조회
// GET /staff/my-reservations?status=pending|completed|cancelled
router.get("/staff/my-reservations", requireStaffAuth, async (req, res) => {
  const staffId = (req as any).staffId as number;
  const { status } = req.query as { status?: "pending" | "assigned" | "completed" | "cancelled" };

  const validStatuses = ["pending", "assigned", "completed", "cancelled"];
  const conditions: any[] = [eq(reservationsTable.assignedStaffId, staffId)];
  if (status && validStatuses.includes(status)) {
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

// GET /staff/chat-list — 이 매입담당자의 예약별 채팅 목록 (최신 메시지 + 읽지 않은 수)
router.get("/staff/chat-list", requireStaffAuth, async (req, res) => {
  const staffId = (req as any).staffId as number;
  try {
    // 담당자의 예약 목록
    const myReservations = await db
      .select({ id: reservationsTable.id, name: reservationsTable.name, phone: reservationsTable.phone, status: reservationsTable.status, date: reservationsTable.date, time: reservationsTable.time })
      .from(reservationsTable)
      .where(eq(reservationsTable.assignedStaffId, staffId))
      .orderBy(desc(reservationsTable.createdAt));

    if (myReservations.length === 0) { res.json([]); return; }

    const ids = myReservations.map((r) => r.id);

    // 해당 예약들의 전체 채팅
    const allChats = await db
      .select()
      .from(chatsTable)
      .where(sql`${chatsTable.reservationId} = ANY(ARRAY[${sql.raw(ids.join(","))}]::int[])`)
      .orderBy(asc(chatsTable.time));

    // 예약별 그룹핑 (마지막 메시지 + 미읽은 수)
    const grouped = new Map<number, { last: typeof allChats[0]; unread: number }>();
    for (const chat of allChats) {
      const isUnread = !chat.read && chat.sender !== "staff" && chat.sender !== "system";
      const existing = grouped.get(chat.reservationId);
      if (!existing) {
        grouped.set(chat.reservationId, { last: chat, unread: isUnread ? 1 : 0 });
      } else {
        grouped.set(chat.reservationId, { last: chat, unread: existing.unread + (isUnread ? 1 : 0) });
      }
    }

    const result = myReservations.map((r) => {
      const g = grouped.get(r.id);
      return {
        reservationId: r.id,
        name: r.name || r.phone,
        phone: r.phone,
        status: r.status,
        date: r.date,
        time: r.time,
        lastMessage: g?.last.message ?? null,
        lastSender: g?.last.senderName ?? null,
        lastTime: g?.last.time ?? null,
        unreadCount: g?.unread ?? 0,
        hasChat: !!g,
      };
    }).filter((r) => r.hasChat);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "채팅 목록 조회 실패" });
  }
});

router.get("/dashboard", requireAuth, requireAdmin, async (req, res) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 이번주 시작 (월요일 기준)
  const day = today.getDay(); // 0 (일) ~ 6 (토)
  const diff = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diff);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  try {
    // 🔹 오늘 매출
    const todayRevenueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${reservationsTable.amount}), 0)`
      })
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.date, todayStr),
          eq(reservationsTable.status, "completed")
        )
      );

    // 🔹 이번주 매출
    const weeklyRevenueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${reservationsTable.amount}), 0)`
      })
      .from(reservationsTable)
      .where(
        and(
          gte(reservationsTable.date, weekStartStr),
          lte(reservationsTable.date, todayStr),
          eq(reservationsTable.status, "completed")
        )
      );

    // 🔹 전체 예약 수
    const totalReservationsResult = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(reservationsTable);

    // 🔹 완료된 예약 수
    const completedReservationsResult = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(reservationsTable)
      .where(eq(reservationsTable.status, "completed"));

    const totalReservations = totalReservationsResult[0].count;
    const completedReservations = completedReservationsResult[0].count;

    const completedRate =
      totalReservations === 0
        ? 0
        : Math.round((completedReservations / totalReservations) * 100);

    res.json({
      todayRevenue: todayRevenueResult[0].total,
      weeklyRevenue: weeklyRevenueResult[0].total,
      totalReservations,
      completedRate
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Dashboard error" });
  }
});

// GET /api/admin/reservations/calendar — 날짜별 총·미배정·배정 집계
router.get("/reservations/calendar", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        date:       reservationsTable.date,
        total:      sql<number>`COUNT(*)`,
        unassigned: sql<number>`COUNT(*) FILTER (WHERE ${reservationsTable.assignedStaffId} IS NULL)`,
        assigned:   sql<number>`COUNT(*) FILTER (WHERE ${reservationsTable.assignedStaffId} IS NOT NULL)`,
        urgent:     sql<number>`COUNT(*) FILTER (WHERE ${reservationsTable.isUrgent} = true AND ${reservationsTable.assignedStaffId} IS NULL)`,
      })
      .from(reservationsTable)
      .where(sql`${reservationsTable.date} IS NOT NULL`)
      .groupBy(reservationsTable.date)
      .orderBy(reservationsTable.date);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch calendar data" });
  }
});

// GET /api/admin/reservations/unassigned-by-time?date=YYYY-MM-DD — 시간대별 미배정 집계
router.get("/reservations/unassigned-by-time", requireAuth, requireAdmin, async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) { res.status(400).json({ error: "date 필요" }); return; }

  try {
    const rows = await db
      .select({
        time:  reservationsTable.time,
        count: sql<number>`COUNT(*)`,
      })
      .from(reservationsTable)
      .where(and(
        eq(reservationsTable.date, date),
        isNull(reservationsTable.assignedStaffId),
      ))
      .groupBy(reservationsTable.time)
      .orderBy(reservationsTable.time);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unassigned-by-time" });
  }
});

// GET /api/admin/reservations/unassigned-detail?date=YYYY-MM-DD&time=HH:MM — 특정 날짜+시간 미배정 상세
router.get("/reservations/unassigned-detail", requireAuth, requireAdmin, async (req, res) => {
  const { date, time } = req.query as { date?: string; time?: string };
  if (!date || !time) { res.status(400).json({ error: "date, time 필요" }); return; }

  try {
    const rows = await db
      .select()
      .from(reservationsTable)
      .where(and(
        eq(reservationsTable.date, date),
        eq(reservationsTable.time, time),
        isNull(reservationsTable.assignedStaffId),
      ))
      .orderBy(desc(reservationsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unassigned detail" });
  }
});

// 배정되지 않은 예약 조회 (assignedStaffId IS NULL)
// GET /api/admin/reservations/unassigned?date=YYYY-MM-DD&status=pending
router.get("/reservations/unassigned", requireAuth, requireAdmin, async (req, res) => {
  const { date, status } = req.query as { date?: string; status?: string };

  const conditions: any[] = [sql`${reservationsTable.assignedStaffId} IS NULL`];
  if (date) conditions.push(eq(reservationsTable.date, date));
  if (status) conditions.push(eq(reservationsTable.status, status));

  try {
    const rows = await db
      .select()
      .from(reservationsTable)
      .where(and(...conditions))
      .orderBy(desc(reservationsTable.isUrgent), desc(reservationsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unassigned reservations" });
  }
});

router.get("/unassigned", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: reservationsTable.id,
      date: reservationsTable.date,
      time: reservationsTable.time,
      location: reservationsTable.location,
      isUrgent: reservationsTable.isUrgent,
      name: reservationsTable.name,
      phone: reservationsTable.phone,
    })
    .from(reservationsTable)
    .where(isNull(reservationsTable.assignedStaffId))
    .orderBy(desc(reservationsTable.isUrgent), desc(reservationsTable.createdAt));

  res.json(rows);
});

const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

router.get("/reservations", requireAuth, requireAdmin, async (req, res) => {
  const { date, status, staffId, kind, page = "1", limit = "50" } = req.query as {
    date?: string;
    status?: string;
    staffId?: string;
    kind?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date format" }); return;
  }

  const conditions: any[] = [];
  if (date) conditions.push(eq(reservationsTable.date, date));
  if (status) conditions.push(eq(reservationsTable.status, status));
  if (staffId) conditions.push(eq(reservationsTable.assignedStaffId, parseInt(staffId)));
  if (kind) conditions.push(eq(reservationsTable.kind, kind));

  const rows = await db
    .select()
    .from(reservationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reservationsTable.createdAt))
    .limit(limitNum)
    .offset((pageNum - 1) * limitNum);

  res.json(rows);
});

router.get("/reservations/stats", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db.select().from(reservationsTable);

  const stats = {
    total:     rows.length,
    pending:   rows.filter(r => r.status === "pending").length,
    assigned:  rows.filter(r => r.status === "assigned").length,
    completed: rows.filter(r => r.status === "completed").length,
    cancelled: rows.filter(r => r.status === "cancelled").length,
  };

  res.json(stats);
});

router.get("/reservations/revenue", requireAuth, requireAdmin, async (req, res) => {
  const { date } = req.query as { date?: string };

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date" }); return;
  }

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${reservationsTable.amount}), 0)`
    })
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.date, date),
        eq(reservationsTable.status, "completed")
      )
    );

  res.json({ date, revenue: result[0].total });
});

router.get("/reservations/revenue/range", requireAuth, requireAdmin, async (req, res) => {
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };

  if (!startDate || !endDate) {
    res.status(400).json({ error: "startDate, endDate required" }); return;
  }

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${reservationsTable.amount}), 0)`
    })
    .from(reservationsTable)
    .where(
      and(
        gte(reservationsTable.date, startDate),
        lte(reservationsTable.date, endDate),
        eq(reservationsTable.status, "completed")
      )
    );

  res.json({ startDate, endDate, revenue: result[0].total });
});

router.get("/reservations/revenue/daily", requireAuth, requireAdmin, async (req, res) => {
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };

  const rows = await db
    .select({
      date: reservationsTable.date,
      total: sql<number>`SUM(${reservationsTable.amount})`
    })
    .from(reservationsTable)
    .where(
      and(
        gte(reservationsTable.date, startDate!),
        lte(reservationsTable.date, endDate!),
        eq(reservationsTable.status, "completed")
      )
    )
    .groupBy(reservationsTable.date)
    .orderBy(reservationsTable.date);

  res.json(rows);
});

router.get("/reservations/revenue/today", requireAuth, requireAdmin, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${reservationsTable.amount}), 0)`
    })
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.date, today),
        eq(reservationsTable.status, "completed")
      )
    );

  res.json({ today, revenue: result[0].total });
});

// 시간대별 예약 건수 집계
// GET /api/admin/reservations/by-hour?date=YYYY-MM-DD  (date 생략 시 오늘)
router.get("/reservations/by-hour", requireAuth, requireAdmin, async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      hour:  sql<number>`CAST(SPLIT_PART(${reservationsTable.time}, ':', 1) AS INTEGER)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.date, date),
        sql`${reservationsTable.time} IS NOT NULL AND ${reservationsTable.time} != ''`
      )
    )
    .groupBy(sql`SPLIT_PART(${reservationsTable.time}, ':', 1)`)
    .orderBy(sql`SPLIT_PART(${reservationsTable.time}, ':', 1)`);

  const result = rows.map((r) => ({
    hour:    Number(r.hour),
    label:   `${String(Number(r.hour)).padStart(2, "0")}:00`,
    count:   Number(r.count),
  }));

  res.json({ date, byHour: result });
});

router.get("/reservations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const [row] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
  if (!row) { res.status(404).json({ error: "접수 정보를 찾을 수 없습니다." }); return; }
  res.json(row);
});

router.post("/reservations/:id/status", async (req, res) => {
  // 관리자 또는 매입담당자 토큰 허용 (JWT 검증)
  const token = extractBearer(req);
  let isAdmin = false;
  let isStaff = false;
  try {
    const payload = verifyAccessToken(token);
    if (payload.role === "admin") isAdmin = true;
    else if (payload.role === "staff" && payload.staffId) isStaff = true;
  } catch { /* 인증 실패 */ }
  if (!isAdmin && !isStaff) {
    res.status(401).json({ error: "인증이 필요합니다." }); return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const { status } = req.body as { status?: string };
  const allowed = ["pending", "assigned", "completed", "cancelled", "no_show"];
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

  // 노쇼 처리 시 penalty 레코드 삽입 + 채팅 자동 메시지
  if (status === "no_show") {
    const PENALTY_EXPIRE_DAYS = 30;

    const [row] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
    if (row?.phone) {
      const userId = row.phone;

      // 개별 패널티 레코드 삽입 (감사용)
      const expiresAt = new Date(Date.now() + PENALTY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
      await db.insert(penaltiesTable).values({
        userId,
        reservationId: id,
        type: "no_show",
        expiresAt,
      });

      // 유저 패널티 누적 카운트 증가
      await db.insert(usersTable)
        .values({ id: userId, noShowCount: 1 })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: {
            noShowCount: sql`${usersTable.noShowCount} + 1`,
            updatedAt: new Date(),
          },
        });

      // 단계별 제재 적용
      const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      const noShowCount = updatedUser?.noShowCount ?? 0;

      if (noShowCount === 2) {
        // 2회: 5일 차단
        const blockedUntil = new Date();
        blockedUntil.setDate(blockedUntil.getDate() + 5);
        await db.update(usersTable)
          .set({ isBlocked: true, blockedUntil, updatedAt: new Date() })
          .where(eq(usersTable.id, userId));
      } else if (noShowCount >= 3) {
        // 3회: 영구 차단
        await db.update(usersTable)
          .set({ isBlocked: true, blockedUntil: null, updatedAt: new Date() })
          .where(eq(usersTable.id, userId));
      }
      // 1회: 경고만 (차단 없음)
    }

    const [autoMsg] = await db.insert(chatsTable).values({
      reservationId: id,
      sender: "admin",
      senderName: "관리자",
      message: "고객 미방문으로 처리되었습니다.",
    }).returning();
    emitToRoom(id, "newMessage", { ...autoMsg, time: autoMsg.time.toISOString() });
  }

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

  // 담당자 페이지 실시간 업데이트
  const [updatedRow] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
  if (updatedRow) broadcast("staffAssigned", { staffId: member.id, reservation: updatedRow });

  res.json({ success: true });
});

// PATCH /api/admin/reservations/:id/assign  { staffId: number }
router.patch("/reservations/:id/assign", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }

  const { staffId } = req.body as { staffId?: number };
  if (!staffId) { res.status(400).json({ error: "staffId가 필요합니다." }); return; }

  try {
    const [member] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
    if (!member) { res.status(400).json({ error: "유효하지 않은 담당자 ID입니다." }); return; }

    const [reservation] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
    if (!reservation) { res.status(404).json({ error: "예약을 찾을 수 없습니다." }); return; }

    await db
      .update(reservationsTable)
      .set({ assignedStaffId: member.id, assignedTo: member.name, status: "assigned" })
      .where(eq(reservationsTable.id, id));

    const [autoMsg] = await db.insert(chatsTable).values({
      reservationId: id,
      sender: "admin",
      senderName: "관리자",
      message: `담당자가 ${member.name}님으로 배정되었습니다.`,
    }).returning();
    emitToRoom(id, "newMessage", { ...autoMsg, time: autoMsg.time.toISOString() });

    // 담당자 페이지 실시간 업데이트
    const [updatedRow] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
    if (updatedRow) broadcast("staffAssigned", { staffId: member.id, reservation: updatedRow });

    res.json({ success: true, assignedTo: member.name, assignedStaffId: member.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "담당자 배정에 실패했습니다." });
  }
});

// ── 채팅: 예약 1개 = 채팅방 1개 ──────────────────────────────────────────────

async function resolveAuth(req: any): Promise<{ ok: boolean; senderType: "admin" | "staff"; senderName: string }> {
  const token = extractBearer(req);
  try {
    const payload = verifyAccessToken(token);
    if (payload.role === "admin") {
      return { ok: true, senderType: "admin", senderName: "관리자" };
    }
    if (payload.role === "staff" && payload.staffId) {
      const [member] = await db.select().from(staffTable).where(eq(staffTable.id, payload.staffId));
      return { ok: true, senderType: "staff", senderName: member?.name ?? "직원" };
    }
  } catch { /* 인증 실패 */ }
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
  // 관리자가 아닌 발신자의 메시지는 전체 브로드캐스트 (대시보드 알림용)
  if (sender !== "admin" && sender !== "system") {
    const [resv] = await db.select({ name: reservationsTable.name, phone: reservationsTable.phone, location: reservationsTable.location })
      .from(reservationsTable).where(eq(reservationsTable.id, reservationId));
    broadcast("chatAlert", { ...msgOut, reservationInfo: resv ?? null });
  }
  res.json({ success: true, id: inserted.id });
});

// ── 채팅 인박스 (미읽은 메시지가 있는 예약 목록) ────────────────────────────
router.get("/chat-inbox", requireAuth, async (req, res) => {
  // 관리자/시스템 외 발신자의 미읽은 메시지 조회
  const unread = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.read, false), sql`${chatsTable.sender} NOT IN ('admin','system')`))
    .orderBy(desc(chatsTable.time));

  if (unread.length === 0) { res.json([]); return; }

  const ids = [...new Set(unread.map((c) => c.reservationId))];
  const reservations = await db
    .select({ id: reservationsTable.id, name: reservationsTable.name, phone: reservationsTable.phone, location: reservationsTable.location, status: reservationsTable.status })
    .from(reservationsTable)
    .where(inArray(reservationsTable.id, ids));

  const resvMap = new Map(reservations.map((r) => [r.id, r]));
  const grouped = new Map<number, typeof unread>();
  for (const chat of unread) {
    if (!grouped.has(chat.reservationId)) grouped.set(chat.reservationId, []);
    grouped.get(chat.reservationId)!.push(chat);
  }

  const result = ids
    .filter((id) => resvMap.has(id))
    .map((id) => {
      const chats = grouped.get(id)!;
      const last = chats[0];
      const r = resvMap.get(id)!;
      return {
        reservationId: id,
        name: r.name,
        phone: r.phone,
        location: r.location,
        status: r.status,
        unreadCount: chats.length,
        lastMessage: last.message,
        lastSender: last.senderName,
        lastSenderRole: last.sender,
        lastTime: last.time.toISOString(),
      };
    });

  res.json(result);
});

// ── 전체 채팅 목록 (채팅이 있는 모든 예약, 최신순) ─────────────────────────
router.get("/chat-list", requireAuth, async (req, res) => {
  const allChats = await db
    .select()
    .from(chatsTable)
    .orderBy(desc(chatsTable.time));

  if (allChats.length === 0) { res.json([]); return; }

  const ids = [...new Set(allChats.map((c) => c.reservationId))];
  const reservations = await db
    .select({ id: reservationsTable.id, name: reservationsTable.name, phone: reservationsTable.phone, location: reservationsTable.location, status: reservationsTable.status, date: reservationsTable.date, kind: reservationsTable.kind })
    .from(reservationsTable)
    .where(inArray(reservationsTable.id, ids));

  const resvMap = new Map(reservations.map((r) => [r.id, r]));

  // 예약별로 그룹: 가장 최근 메시지, 미읽은 수(admin이 안 읽은 것)
  const grouped = new Map<number, { last: typeof allChats[0]; unread: number }>();
  for (const chat of allChats) {
    const existing = grouped.get(chat.reservationId);
    if (!existing) {
      grouped.set(chat.reservationId, {
        last: chat,
        unread: (!chat.read && chat.sender !== "admin" && chat.sender !== "system") ? 1 : 0,
      });
    } else {
      if (!chat.read && chat.sender !== "admin" && chat.sender !== "system") {
        existing.unread += 1;
      }
    }
  }

  const result = ids
    .filter((id) => resvMap.has(id))
    .map((id) => {
      const { last, unread } = grouped.get(id)!;
      const r = resvMap.get(id)!;
      return {
        reservationId: id,
        name: r.name,
        phone: r.phone,
        location: r.location,
        status: r.status,
        date: r.date,
        kind: r.kind,
        unreadCount: unread,
        lastMessage: last.message,
        lastSender: last.senderName,
        lastSenderRole: last.sender,
        lastTime: last.time.toISOString(),
      };
    });

  res.json(result);
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
  const { phone, reservationId, pin } = req.body as { phone?: string; reservationId?: number; pin?: string };
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
  if (row.customerPin && pin !== row.customerPin) {
    res.status(403).json({ success: false, error: "비밀번호가 일치하지 않습니다." }); return;
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

// ── 고객용: 예약 수정 ─────────────────────────────────────────────────────────
router.post("/customer/update", async (req, res) => {
  type ReqItem = { type: string; amount: number; rate: number; payment: number; isGift: boolean };
  const { phone, reservationId, date, time, location, giftcardType, amount, isGift, items, pin } = req.body as {
    phone?: string; reservationId?: number;
    date?: string; time?: string; location?: string;
    giftcardType?: string; amount?: number; isGift?: boolean;
    items?: ReqItem[];
    pin?: string;
  };
  if (!phone || !reservationId) {
    res.status(400).json({ success: false, error: "phone, reservationId 필수입니다." }); return;
  }
  const [row] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, reservationId));
  if (!row) { res.status(404).json({ success: false, error: "예약을 찾을 수 없습니다." }); return; }
  const normalizePhone = (p: string) => p.replace(/\D/g, "");
  if (normalizePhone(row.phone ?? "") !== normalizePhone(phone)) {
    res.status(403).json({ success: false, error: "전화번호가 일치하지 않습니다." }); return;
  }
  if (row.customerPin && pin !== row.customerPin) {
    res.status(403).json({ success: false, error: "비밀번호가 일치하지 않습니다." }); return;
  }
  if (["cancelled", "completed", "no_show"].includes(row.status ?? "")) {
    res.json({ success: false, error: "수정할 수 없는 상태의 예약입니다." }); return;
  }
  if (row.date && row.time) {
    const scheduled = new Date(`${row.date}T${row.time}`);
    if (scheduled.getTime() - Date.now() < 60 * 60 * 1000) {
      res.json({ success: false, error: "예약 1시간 전까지만 수정할 수 있습니다." }); return;
    }
  }
  const GIFT_RATES: Record<string, number> = {
    "신세계백화점상품권": 95, "롯데백화점상품권": 95, "현대백화점상품권": 95,
    "국민관광상품권": 95, "갤러리아백화점상품권": 94, "삼성상품권": 92,
    "이랜드상품권": 91, "AK(애경)상품권": 91, "농협상품권": 91,
    "지류문화상품권": 90, "온누리상품권": 90, "주유권": 95,
  };
  const updates: Record<string, any> = {};
  if (date !== undefined) updates.date = date || null;
  if (time !== undefined) updates.time = time || null;
  if (location !== undefined) updates.location = location || null;

  // items 배열 우선 처리 (멀티 권종)
  if (items && items.length > 0) {
    const total = items.reduce((s, it) => s + (it.payment ?? 0), 0);
    updates.items = items;
    updates.totalPayment = total;
    // 첫 번째 아이템을 대표 필드로 사용
    updates.giftcardType = items[0].type;
    updates.amount = items[0].amount;
    updates.rate = items[0].rate;
  } else {
    // 단일 필드 처리 (하위 호환)
    if (giftcardType !== undefined) {
      updates.giftcardType = giftcardType || null;
      if (giftcardType && GIFT_RATES[giftcardType]) updates.rate = GIFT_RATES[giftcardType];
    }
    const baseRate = updates.rate ?? row.rate ?? 0;
    const effectiveRate = isGift !== undefined ? baseRate - (isGift ? 1 : 0) : baseRate;
    if (amount !== undefined && !isNaN(Number(amount))) {
      const amt = Number(amount);
      updates.amount = amt;
      if (effectiveRate) updates.totalPayment = Math.floor(amt * (effectiveRate / 100));
    } else if (isGift !== undefined && row.amount) {
      if (effectiveRate) updates.totalPayment = Math.floor(row.amount * (effectiveRate / 100));
    }
  }
  if (Object.keys(updates).length === 0) {
    res.json({ success: false, error: "변경할 내용이 없습니다." }); return;
  }
  await db.update(reservationsTable).set(updates).where(eq(reservationsTable.id, reservationId));
  // 실시간: 관리자 대시보드에 변경 알림
  const [updated] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, reservationId));
  if (updated) {
    broadcast("reservationUpdated", updated);
  }
  res.json({ success: true });
});

// ── 고객용: 전화번호로 예약 조회 ─────────────────────────────────────────────
router.get("/customer/reservation", async (req, res) => {
  const { phone, pin, kind } = req.query as { phone?: string; pin?: string; kind?: string };
  if (!phone) {
    res.status(400).json({ success: false, error: "phone 파라미터가 필요합니다." });
    return;
  }

  const normalizedPhone = phone.replace(/[^0-9]/g, "");

  const conditions = [
    eq(reservationsTable.phone, normalizedPhone),
    inArray(reservationsTable.status, ["pending", "assigned", "cancelled", "no_show"]),
    ...(kind ? [eq(reservationsTable.kind, kind)] : []),
  ];

  const rows = await db
    .select()
    .from(reservationsTable)
    .where(and(...conditions))
    .orderBy(desc(reservationsTable.createdAt));

  const result = rows[0];
  if (!result) {
    res.json({ success: false, error: "예약 내역을 찾을 수 없습니다." });
    return;
  }

  if (result.customerPin) {
    if (!pin || pin !== result.customerPin) {
      res.json({ success: false, error: "비밀번호가 일치하지 않습니다." });
      return;
    }
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

// PATCH /admin/users/:id/block — 사용자 차단
router.patch("/users/:id/block", requireAuth, async (req, res) => {
  const userId = req.params.id;
  if (!userId) { res.status(400).json({ error: "사용자 ID가 필요합니다." }); return; }

  await db.insert(usersTable)
    .values({ id: userId, isBlocked: true, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { isBlocked: true, updatedAt: new Date() },
    });

  res.json({ success: true });
});

// PATCH /admin/users/:id/unblock — 사용자 차단 해제
router.patch("/users/:id/unblock", requireAuth, async (req, res) => {
  const userId = req.params.id;
  if (!userId) { res.status(400).json({ error: "사용자 ID가 필요합니다." }); return; }

  await db.insert(usersTable)
    .values({ id: userId, isBlocked: false, blockedUntil: null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { isBlocked: false, blockedUntil: null, updatedAt: new Date() },
    });

  res.json({ success: true });
});

// GET /admin/noshow/users — 노쇼 사용자 목록 조회
router.get("/noshow/users", requireAuth, async (_req, res) => {
  // 노쇼 기록이 있거나 차단된 모든 사용자 조회
  const users = await db
    .select()
    .from(usersTable)
    .where(sql`${usersTable.noShowCount} > 0 OR ${usersTable.isBlocked} = true`)
    .orderBy(desc(usersTable.noShowCount));

  // 각 사용자의 최신 예약에서 이름 가져오기
  const userIds = users.map((u) => u.id);
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const latestReservations = await db
      .select({ phone: reservationsTable.phone, name: reservationsTable.name })
      .from(reservationsTable)
      .where(inArray(reservationsTable.phone, userIds))
      .orderBy(desc(reservationsTable.id));
    for (const r of latestReservations) {
      if (r.phone && r.name && !nameMap[r.phone]) {
        nameMap[r.phone] = r.name;
      }
    }
  }

  // 각 사용자의 노쇼 예약 목록 (최근 5건)
  let noshowMap: Record<string, { id: number; date: string; giftcardType: string | null; createdAt: Date }[]> = {};
  if (userIds.length > 0) {
    const noshowRows = await db
      .select({
        id: reservationsTable.id,
        phone: reservationsTable.phone,
        date: reservationsTable.date,
        giftcardType: reservationsTable.giftcardType,
        createdAt: reservationsTable.createdAt,
      })
      .from(reservationsTable)
      .where(and(inArray(reservationsTable.phone, userIds), eq(reservationsTable.status, "no_show")))
      .orderBy(desc(reservationsTable.id));
    for (const r of noshowRows) {
      if (!r.phone) continue;
      if (!noshowMap[r.phone]) noshowMap[r.phone] = [];
      if (noshowMap[r.phone].length < 5) noshowMap[r.phone].push(r);
    }
  }

  res.json(
    users.map((u) => ({
      id: u.id,
      name: nameMap[u.id] ?? null,
      noShowCount: u.noShowCount,
      isBlocked: u.isBlocked,
      blockedUntil: u.blockedUntil,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      recentNoshows: noshowMap[u.id] ?? [],
    }))
  );
});

// GET /admin/noshow/reservations — 노쇼 예약 목록 조회
router.get("/noshow/reservations", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.status, "no_show"))
    .orderBy(desc(reservationsTable.id));

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      date: r.date,
      giftcardType: r.giftcardType,
      amount: r.amount,
      type: r.type,
      createdAt: r.createdAt,
    }))
  );
});

// PATCH /admin/users/:id/reset-noshow — 노쇼 카운트 초기화 및 차단 해제
router.patch("/users/:id/reset-noshow", requireAuth, async (req, res) => {
  const userId = req.params.id;
  if (!userId) { res.status(400).json({ error: "사용자 ID가 필요합니다." }); return; }

  await db.insert(usersTable)
    .values({ id: userId, noShowCount: 0, isBlocked: false, blockedUntil: null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { noShowCount: 0, isBlocked: false, blockedUntil: null, updatedAt: new Date() },
    });

  res.json({ success: true });
});

// PATCH /admin/users/:id/block-days — 지정 일수 임시 차단
router.patch("/users/:id/block-days", requireAuth, async (req, res) => {
  const userId = req.params.id;
  const { days } = req.body as { days?: number };
  if (!userId) { res.status(400).json({ error: "사용자 ID가 필요합니다." }); return; }
  if (!days || days < 1) { res.status(400).json({ error: "차단 일수가 필요합니다." }); return; }

  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + days);

  await db.insert(usersTable)
    .values({ id: userId, isBlocked: true, blockedUntil, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { isBlocked: true, blockedUntil, updatedAt: new Date() },
    });

  res.json({ success: true });
});

// GET /admin/site-settings — 사이트 설정 조회 (관리자용)
router.get("/site-settings", requireAuth, async (_req, res) => {
  const rows = await db.select().from(siteSettingsTable);
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

// PATCH /admin/site-settings — 사이트 설정 저장 (관리자용)
router.patch("/site-settings", requireAuth, async (req, res) => {
  const { key, value } = req.body as { key: string; value: string };
  if (!key) { res.status(400).json({ error: "key 필드가 필요합니다." }); return; }
  await db.insert(siteSettingsTable)
    .values({ key, value: value ?? "" })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: value ?? "" } });
  res.json({ success: true });
});

export default router;
