import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id:          text("id").primaryKey(),
  noShowCount: integer("no_show_count").notNull().default(0),
  isBlocked:   boolean("is_blocked").notNull().default(false),
  blockedUntil: timestamp("blocked_until"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
