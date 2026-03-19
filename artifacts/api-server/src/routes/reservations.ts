import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const data = await db.select().from(reservationsTable);
  res.json(data);
});

router.get("/by-date", async (req, res) => {
  const { date } = req.query;

  const data = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.date, String(date)));

  res.json(data);
});

router.get("/customer", async (req, res) => {
  const { phone } = req.query;

  const data = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.phone, String(phone)));

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

router.post("/", async (req, res) => {
  const body = req.body as {
    kind?: string;
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
  };

  if (!body.phone) {
    res.status(400).json({ error: "필수 항목이 누락되었습니다." });
    return;
  }

  // amount: 명시된 값 → items 합산 → totalPayment 순으로 결정
  const totalAmount =
    body.amount ??
    (body.items ? body.items.reduce((s, it) => s + it.amount, 0) : undefined) ??
    body.totalPayment ??
    0;

  const totalPayment = body.totalPayment ?? body.items?.reduce((s, it) => s + it.payment, 0) ?? totalAmount;

  const [inserted] = await db
    .insert(reservationsTable)
    .values({
      kind: body.kind ?? "reservation",
      name: body.name,
      phone: body.phone,
      date: body.date,
      time: body.time,
      location: body.location ?? "",
      items: (body.items ?? []) as any,
      totalPayment,
      bankName: body.bankName ?? "",
      accountNumber: body.accountNumber ?? "",
      accountHolder: body.accountHolder ?? "",
      giftcardType: body.giftcardType,
      amount: totalAmount,
      category: body.category,
      status: "pending",
    })
    .returning();

  res.status(201).json(inserted);
});

export default router;
