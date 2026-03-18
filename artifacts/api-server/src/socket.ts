import { Server } from "socket.io";
import type { HttpServer } from "http";
import { db } from "@workspace/db";
import { chatsTable } from "@workspace/db/schema";

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

    socket.on("sendMessage", async (data: { reservationId: number; sender: string; senderName?: string; message: string }) => {
      const { reservationId, sender, senderName, message } = data;
      if (!reservationId || !sender || !message?.trim()) return;

      const [inserted] = await db.insert(chatsTable).values({
        reservationId,
        sender,
        senderName: senderName ?? NAME_MAP[sender] ?? sender,
        message: message.trim(),
      }).returning();

      const msg = { ...inserted, time: inserted.time.toISOString() };
      io.to("room_" + reservationId).emit("newMessage", msg);
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
