import { pgTable, serial, text, integer, timestamp, jsonb, index, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  name: text("name"),
  phone: text("phone").notNull(),
  date: text("date"),
  time: text("time"),
  location: text("location").notNull(),
  items: jsonb("items").notNull().$type<SavedItem[]>(),
  totalPayment: integer("total_payment").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  giftcardType: text("giftcard_type"),
  amount: numeric("amount", { precision: 12, scale: 0 }),
  category: text("category"),
  status: text("status").notNull().default("pending"),
  assignedTo: text("assigned_to"),
  assignedStaffId: integer("assigned_staff_id"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
}, (table) => [
  index("idx_reservations_date_status").on(table.date, table.status),
]);

interface SavedItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ id: true, createdAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
