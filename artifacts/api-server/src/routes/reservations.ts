import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reservationsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const body = req.body as {
    kind: string;
    name?: string;
    phone: string;
    date?: string;
    time?: string;
    location: string;
    items: unknown;
    totalPayment: number;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };

  if (!body.phone || !body.location || !body.items || !body.bankName) {
    res.status(400).json({ error: "필수 항목이 누락되었습니다." });
    return;
  }

  const [inserted] = await db
    .insert(reservationsTable)
    .values({
      kind: body.kind ?? "reservation",
      name: body.name,
      phone: body.phone,
      date: body.date,
      time: body.time,
      location: body.location,
      items: body.items as any,
      totalPayment: body.totalPayment,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountHolder: body.accountHolder,
      status: "pending",
    })
    .returning();

  res.status(201).json(inserted);
});

export default router;
