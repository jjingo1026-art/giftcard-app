import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const staffTable = pgTable("staff", {
  id:       serial("id").primaryKey(),
  name:     text("name"),
  phone:    text("phone"),
  password: text("password"),
  status:   text("status").default("pending"),
});

export type Staff = typeof staffTable.$inferSelect;
