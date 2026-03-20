import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const adminSettingsTable = pgTable("admin_settings", {
  id:            serial("id").primaryKey(),
  adminId:       text("admin_id").notNull(),
  adminPassword: text("admin_password").notNull(),
});

export type AdminSettings = typeof adminSettingsTable.$inferSelect;
