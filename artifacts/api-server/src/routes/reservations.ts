import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable, usersTable, chatsTable, siteSettingsTable } from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { broadcast, emitToRoom } from "../socket";

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, "");

const isValidTime = (time: string) => {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const minutes = parseInt(match[2], 10);
  return minutes % 10 === 0;
};

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const data = await db.select().from(reservationsTable);
  res.json(data);
});

const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

router.get("/by-date", async (req, res) => {
  const { date } = req.query;

  if (!date || !isValidDate(String(date))) {
    res.status(400).json({ error: "Invalid date format" }); return;
  }

  const data = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.date, String(date)));

  res.json(data);
});

router.get("/customer", async (req, res) => {
  const { phone } = req.query;

  if (!phone) { res.json([]); return; }

  const normalizedPhone = normalizePhone(String(phone));

  const data = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.phone, normalizedPhone));

  res.json(data);
});

router.post("/:id/status", async (req, res) => {
  const { status } = req.body;

  await db
    .update(reservationsTable)
    .set({ status })
    .where(eq(reservationsTable.id, Number(req.params.id)));

  res.json({ success: true });
});

router.get("/total-count", async (_req, res) => {
  try {
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(reservationsTable);
    const count = Number(countResult?.count ?? 0);

    const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "counter_start_time"));
    let startTime: number;
    if (existing.length > 0) {
      startTime = Number(existing[0].value);
    } else {
      startTime = Date.now();
      await db.insert(siteSettingsTable)
        .values({ key: "counter_start_time", value: String(startTime) })
        .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: String(startTime) } });
    }

    res.json({ count, startTime });
  } catch {
    res.json({ count: 0, startTime: Date.now() });
  }
});

router.get("/count-by-date", async (_req, res) => {
  const data = await db.select().from(reservationsTable);

  const result: Record<string, number> = {};

  data.forEach(r => {
    if (!r.date) return;
    result[r.date] = (result[r.date] || 0) + 1;
  });

  res.json(result);
});

router.post("/:id/assign", async (req, res) => {
  const { staffId } = req.body;

  await db
    .update(reservationsTable)
    .set({
      assignedStaffId: staffId,
      status: "assigned"
    })
    .where(eq(reservationsTable.id, Number(req.params.id)));

  res.json({ success: true });
});

router.post("/", async (req, res) => {
  const body = req.body as {
    kind?: string;
    isUrgent?: boolean;
    name?: string;
    phone: string;
    date?: string;
    time?: string;
    location?: string;
    items?: { type: string; amount: number; rate: number; payment: number; isGift: boolean }[];
    totalPayment?: number;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    giftcardType?: string;
    amount?: number;
    category?: string;
    customerPin?: string;
    imagePaths?: string[];
  };

  if (body.customerPin && !/^\d{4}$/.test(body.customerPin)) {
    res.status(400).json({ error: "비밀번호는 숫자 4자리여야 합니다." });
    return;
  }

  if (!body.phone) {
    res.status(400).json({ error: "필수 항목이 누락되었습니다." });
    return;
  }

  if (body.name && !/^[가-힣a-zA-Z\s]+$/.test(body.name.trim())) {
    res.status(400).json({ error: "이름은 한글 또는 영문만 입력 가능합니다." });
    return;
  }

  if (body.kind !== "urgent" && body.time) {
    if (!isValidTime(body.time)) {
      res.status(400).json({ error: "예약 시간은 10분 단위로만 가능합니다" });
      return;
    }
  }

  const normalizedPhone = normalizePhone(body.phone);

  // 종류별 중복 신청 체크: 모바일은 모바일끼리, 지류/긴급은 지류/긴급끼리만 비교
  const isMobile = body.kind === "mobile";
  const activeStatusFilter = ["pending", "assigned"];
  const duplicateConditions = isMobile
    ? and(
        eq(reservationsTable.phone, normalizedPhone),
        eq(reservationsTable.kind, "mobile"),
        inArray(reservationsTable.status, activeStatusFilter)
      )
    : and(
        eq(reservationsTable.phone, normalizedPhone),
        inArray(reservationsTable.kind, ["reservation", "urgent"]),
        inArray(reservationsTable.status, activeStatusFilter)
      );

  const exists = await db
    .select()
    .from(reservationsTable)
    .where(duplicateConditions);

  if (exists.length > 0) {
    const msg = isMobile
      ? "현재 접수 처리중인 판매신청이 있습니다.\n처리가 완료되어야 재신청이 가능합니다."
      : "현재 진행중인 예약이 있습니다.\n예약을 취소하시거나 거래가 완료되어야 예약신청이 가능합니다.";
    res.status(400).json({ error: msg });
    return;
  }

  if (body.kind !== "urgent" && body.date && body.time) {
    const slotTaken = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.date, body.date),
          eq(reservationsTable.time, body.time),
          inArray(reservationsTable.status, ["pending", "assigned"])
        )
      );

    if (slotTaken.length > 0) {
      res.status(400).json({ error: "이미 예약된 시간입니다" });
      return;
    }
  }

  // 노쇼 차단 여부 확인
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, normalizedPhone));
  if (user?.isBlocked) {
    const isPermanent = !user.blockedUntil;
    const isTemporaryActive = user.blockedUntil && new Date() < user.blockedUntil;
    if (isPermanent || isTemporaryActive) {
      res.status(403).json({ error: "최근 노쇼 이력으로 인해 일정 기간 예약이 제한됩니다." });
      return;
    }
  }

  const normalize = (str: string) => str.replace(/\s/g, "").toLowerCase();

  if (
    body.kind !== "urgent" &&
    body.name &&
    body.accountHolder &&
    normalize(body.name) !== normalize(body.accountHolder)
  ) {
    res.status(400).json({ error: "신청자와 예금주가 일치하지 않습니다" });
    return;
  }

  // amount: 명시된 값 → items 합산 → totalPayment 순으로 결정
  const totalAmount =
    body.amount ??
    (body.items ? body.items.reduce((s, it) => s + it.amount, 0) : undefined) ??
    body.totalPayment ??
    0;

  const totalPayment = body.totalPayment ?? body.items?.reduce((s, it) => s + it.payment, 0) ?? totalAmount;

  const isUrgent = body.kind === "urgent"
    ? true
    : body.date && body.time
      ? new Date(`${body.date} ${body.time}`).getTime() - Date.now() < 60 * 60 * 1000
      : false;

  // 긴급판매는 date 없이 제출되므로, 캘린더 집계를 위해 오늘 날짜(KST)를 자동 설정
  const urgentDate = body.kind === "urgent" && !body.date
    ? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : body.date;

  const [inserted] = await db
    .insert(reservationsTable)
    .values({
      kind: body.kind ?? "reservation",
      isUrgent,
      name: body.name,
      phone: normalizedPhone,
      date: urgentDate,
      time: body.time,
      location: body.location ?? "",
      items: (body.items ?? []) as any,
      totalPayment,
      bankName: body.bankName ?? "",
      accountNumber: body.accountNumber ?? "",
      accountHolder: body.accountHolder ?? "",
      giftcardType: body.giftcardType,
      amount: String(totalAmount),
      category: body.category,
      status: "pending",
      customerPin: body.customerPin ?? null,
      imagePaths: body.imagePaths ?? [],
    })
    .returning();

  broadcast("newReservation", inserted);

  if (isUrgent) {
    broadcast("newUrgent", inserted);
  }

  // 모바일상품권 판매신청 시 채팅으로 자동 요약 메시지 전송
  if (body.kind === "mobile" && body.items && body.items.length > 0) {
    const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";
    const lines: string[] = [];
    lines.push(`📱 모바일상품권 판매신청`);
    lines.push(`👤 신청자: ${body.name ?? "미입력"} / ${normalizedPhone}`);
    lines.push(`🏦 입금계좌: ${body.bankName ?? ""} ${body.accountNumber ?? ""} (${body.accountHolder ?? ""})`);
    lines.push(`━━━━━━━━━━━━━━`);

    for (const item of body.items as (typeof body.items[0] & { note?: string })[]) {
      const ratePct = item.rate;
      lines.push(`💳 ${item.type}`);
      lines.push(`   액면가 ${fmt(item.amount)}  →  입금 ${fmt(item.payment)} (${ratePct}%)`);
      if (item.note) {
        const noteLines = item.note.split(" / ").filter(Boolean);
        for (const nl of noteLines) lines.push(`   📋 ${nl}`);
      }
    }

    lines.push(`━━━━━━━━━━━━━━`);
    lines.push(`💰 총 입금예정금액: ${fmt(totalPayment)}`);

    const summaryMsg = lines.join("\n");
    const [chatRow] = await db.insert(chatsTable).values({
      reservationId: inserted.id,
      sender: "system",
      senderName: "시스템",
      message: summaryMsg,
    }).returning();
    emitToRoom(inserted.id, "newMessage", { ...chatRow, time: chatRow.time.toISOString() });
    // 관리자 모바일 대시보드 채팅함 알림 (전역 브로드캐스트)
    broadcast("chatAlert", { ...chatRow, time: chatRow.time.toISOString(), reservationId: inserted.id, senderName: "📱 신규 모바일 판매신청" });

    // 이미지가 있으면 각각 별도 메시지로 전송
    if (body.imagePaths && body.imagePaths.length > 0) {
      for (const imgUrl of body.imagePaths) {
        const [imgRow] = await db.insert(chatsTable).values({
          reservationId: inserted.id,
          sender: "system",
          senderName: "시스템",
          message: `[IMG:${imgUrl}]`,
        }).returning();
        emitToRoom(inserted.id, "newMessage", { ...imgRow, time: imgRow.time.toISOString() });
      }
    }
  }

  res.status(201).json(inserted);
});

export default router;
