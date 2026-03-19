import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const phonePenaltiesTable = pgTable("phone_penalties", {
  phone:        text("phone").primaryKey(),
  noShowCount:  integer("no_show_count").notNull().default(0),
  isBlocked:    boolean("is_blocked").notNull().default(false),
  blockedUntil: timestamp("blocked_until"),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export type PhonePenalty = typeof phonePenaltiesTable.$inferSelect;
