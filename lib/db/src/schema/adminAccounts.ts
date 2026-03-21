import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminAccountsTable = pgTable("admin_accounts", {
  id:           serial("id").primaryKey(),
  username:     text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type AdminAccount = typeof adminAccountsTable.$inferSelect;
