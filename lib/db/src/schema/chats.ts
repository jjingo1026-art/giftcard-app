import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").notNull(),
  sender: text("sender").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  time: timestamp("time").notNull().defaultNow(),
});

export type Chat = typeof chatsTable.$inferSelect;
