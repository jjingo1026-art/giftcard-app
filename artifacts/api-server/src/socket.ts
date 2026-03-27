import { Server } from "socket.io";
import type { HttpServer } from "http";
import { db } from "@workspace/db";
import { chatsTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { translateAll, translateToKo } from "./lib/translate";
import { sendPushToReservation } from "./routes/push";

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
    pingInterval: 10000,   // 10초마다 ping (기본 25초)
    pingTimeout: 5000,     // 5초 내 pong 없으면 재연결 (기본 20초)
    transports: ["websocket", "polling"], // 폴백 유지 (방화벽 대비)
  });

  _io = io;

  io.on("connection", (socket) => {
    console.log("접속됨:", socket.id);

    socket.on("joinRoom", (reservationId: number) => {
      socket.join("room_" + reservationId);
      console.log(`[joinRoom] socket=${socket.id} → room_${reservationId}`);
    });

    socket.on("sendMessage", async (data: { reservationId: number; sender: string; senderName?: string; message: string; language?: string; isInternal?: boolean }) => {
      const { reservationId, sender, senderName, message, language = "ko", isInternal = false } = data;
      if (!reservationId || !sender || !message?.trim()) return;

      const trimmed = message.trim();
      const displayName = senderName ?? NAME_MAP[sender] ?? sender;

      // 1단계: 번역 없이 즉시 DB 저장 후 실시간 emit
      const [inserted] = await db.insert(chatsTable).values({
        reservationId,
        sender,
        senderName: displayName,
        message: trimmed,
        language,
        translatedText: {},   // 번역 전 빈 객체
        read: false,
        isInternal,
      }).returning();

      const msg = { ...inserted, time: inserted.time.toISOString() };

      // 내부 메시지(isInternal)는 관리자·담당자만 수신 — 방 전체 emit 안 함
      if (isInternal) {
        io.emit("internalMessage", msg);
      } else {
        // 즉시 방 전송 (번역 기다리지 않음)
        io.to("room_" + reservationId).emit("newMessage", msg);
      }

      // 대시보드 알림용 브로드캐스트
      if (!isInternal && sender !== "admin" && sender !== "system") {
        io.emit("chatAlert", msg);
      }
      if (sender === "admin") {
        io.emit("adminChatAlert", { reservationId, senderName: displayName, message: trimmed });
      }

      // Push 알림 (내부 메시지는 고객에게 푸시하지 않음)
      if (!isInternal && (sender === "admin" || sender === "staff")) {
        sendPushToReservation(reservationId, {
          title: `${displayName}님의 메시지`,
          body: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
          url: `/chat?id=${reservationId}`,
        }).catch(() => {});
      }

      // 2단계: 번역 백그라운드 처리
      if (language !== "ko") {
        // 비한국어 메시지: ko 번역 먼저 emit → 관리자/담당자 즉시 표시
        console.log(`[번역] id=${inserted.id} lang=${language} 번역 시작`);
        translateToKo(trimmed, language).then(async (koText) => {
          console.log(`[번역] id=${inserted.id} ko번역 완료: ${koText.slice(0, 30)}`);
          const partial: Record<string, string> = { [language]: trimmed, ko: koText };
          const room1 = await io.in("room_" + reservationId).fetchSockets();
          console.log(`[번역] id=${inserted.id} Phase1 emit → room_${reservationId} (멤버: ${room1.length}개)`);
          if (isInternal) {
            io.emit("internalMessageTranslated", { ...msg, translatedText: partial });
          } else {
            io.to("room_" + reservationId).emit("messageTranslated", { ...msg, translatedText: partial });
          }
          // 전체 언어 번역 (ko는 재사용)
          return translateAll(trimmed, language, koText);
        }).then(async (translatedText) => {
          await db.update(chatsTable).set({ translatedText }).where(eq(chatsTable.id, inserted.id));
          const room2 = await io.in("room_" + reservationId).fetchSockets();
          console.log(`[번역] id=${inserted.id} Phase2 emit → room_${reservationId} (멤버: ${room2.length}개)`);
          if (isInternal) {
            io.emit("internalMessageTranslated", { ...msg, translatedText });
          } else {
            io.to("room_" + reservationId).emit("messageTranslated", { ...msg, translatedText });
          }
        }).catch((e) => { console.error(`[번역 오류] id=${inserted.id}`, e); });
      } else {
        // 한국어 메시지: 전체 언어 병렬 번역
        translateAll(trimmed, language).then(async (translatedText) => {
          await db.update(chatsTable).set({ translatedText }).where(eq(chatsTable.id, inserted.id));
          if (isInternal) {
            io.emit("internalMessageTranslated", { ...msg, translatedText });
          } else {
            io.to("room_" + reservationId).emit("messageTranslated", { ...msg, translatedText });
          }
        }).catch((e) => { console.error(`[번역 오류-ko] id=${inserted.id}`, e); });
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
