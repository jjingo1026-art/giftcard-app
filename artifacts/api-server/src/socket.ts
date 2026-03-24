import { Server } from "socket.io";
import type { HttpServer } from "http";
import { db } from "@workspace/db";
import { chatsTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { translateAll } from "./lib/translate";

let _io: Server | null = null;

const NAME_MAP: Record<string, string> = {
  customer: "고객",
  admin: "관리자",
  staff: "담당자",
  system: "시스템",
};

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*" },
  });

  _io = io;

  io.on("connection", (socket) => {
    console.log("접속됨:", socket.id);

    socket.on("joinRoom", (reservationId: number) => {
      socket.join("room_" + reservationId);
    });

    socket.on("sendMessage", async (data: { reservationId: number; sender: string; senderName?: string; message: string; language?: string }) => {
      const { reservationId, sender, senderName, message, language = "ko" } = data;
      if (!reservationId || !sender || !message?.trim()) return;

      const trimmed = message.trim();
      const translatedText = await translateAll(trimmed, language);

      const [inserted] = await db.insert(chatsTable).values({
        reservationId,
        sender,
        senderName: senderName ?? NAME_MAP[sender] ?? sender,
        message: trimmed,
        language,
        translatedText,
        read: false,
      }).returning();

      const msg = { ...inserted, time: inserted.time.toISOString() };
      io.to("room_" + reservationId).emit("newMessage", msg);

      // 관리자가 아닌 발신자의 메시지는 전체 브로드캐스트 (대시보드 채팅 알림용)
      if (sender !== "admin" && sender !== "system") {
        io.emit("chatAlert", msg);
      }
      // 관리자 메시지는 고객(판매자)에게 알림 브로드캐스트
      if (sender === "admin") {
        io.emit("adminChatAlert", { reservationId, senderName: senderName ?? "관리자", message: trimmed });
      }
    });

    // 읽음 처리: 내가 아닌 발신자의 메시지를 read=true 로 업데이트
    socket.on("markRead", async (data: { reservationId: number; readerRole: string }) => {
      const { reservationId, readerRole } = data;
      if (!reservationId || !readerRole) return;

      await db
        .update(chatsTable)
        .set({ read: true })
        .where(
          and(
            eq(chatsTable.reservationId, reservationId),
            ne(chatsTable.sender, readerRole),
            eq(chatsTable.read, false)
          )
        );

      // 방 전체에 읽음 알림 (누가 읽었는지 알림)
      io.to("room_" + reservationId).emit("messagesRead", { readerRole });
    });

    socket.on("disconnect", () => {
      console.log("접속 종료:", socket.id);
    });
  });

  return io;
}

export function emitToRoom(reservationId: number, event: string, data: object) {
  _io?.to("room_" + reservationId).emit(event, data);
}

export function broadcast(event: string, data: object) {
  _io?.emit(event, data);
}
