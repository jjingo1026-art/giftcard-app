import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const penaltiesTable = pgTable("penalties", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  reservationId: integer("reservation_id").notNull(),
  type:          text("type").notNull().default("no_show"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  expiresAt:     timestamp("expires_at"),
}, (table) => [
  index("idx_penalties_user_id").on(table.userId),
]);

export type Penalty = typeof penaltiesTable.$inferSelect;
