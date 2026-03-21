import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").notNull(),
  sender: text("sender").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  language: text("language").notNull().default("ko"),
  translatedText: jsonb("translated_text").$type<Record<string, string>>(),
  time: timestamp("time").notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
});

export type Chat = typeof chatsTable.$inferSelect;
