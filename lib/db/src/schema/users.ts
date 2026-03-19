import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id:          text("id").primaryKey(),
  noShowCount: integer("no_show_count").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
