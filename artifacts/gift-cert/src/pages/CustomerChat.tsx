import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: number;
  sender: string;
  senderName: string;
  message: string;
  time: string;
  read: boolean;
}

function getReservationId() {
  return new URLSearchParams(window.location.search).get("id");
}

export default function CustomerChat() {
  const reservationId = getReservationId();
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  function scrollToBottom() {
    setTimeout(() => {
      if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }, 50);
  }

  useEffect(() => {
    if (!reservationId) return;

    fetch(`/api/admin/chat/${reservationId}`)
      .then((r) => r.json())
      .then((data) => { setChatMessages(data); scrollToBottom(); })
      .catch(() => {});

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      // 입장 시 상대방 메시지 읽음 처리
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "customer" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg];
        scrollToBottom();
        // 새 메시지가 내 것이 아니면 즉시 읽음 처리
        if (newMsg.sender !== "customer") {
          socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "customer" });
        }
        return next;
      });
    });

    // 상대방이 내 메시지를 읽었을 때 read 상태 업데이트
    socket.on("messagesRead", ({ readerRole }: { readerRole: string }) => {
      if (readerRole !== "customer") {
        setChatMessages((prev) =>
          prev.map((m) => m.sender === "customer" ? { ...m, read: true } : m)
        );
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  function send() {
    if (!msg.trim() || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "customer",
      message: msg,
    });
    setMsg("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => { window.location.href = "/check.html"; }} className="text-slate-400 hover:text-slate-600">←</button>
          <h1 className="text-[16px] font-bold text-slate-800">상담 채팅 · 예약 #{reservationId}</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div
          ref={chatBoxRef}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-2 overflow-auto"
          style={{ height: 400 }}
        >
          {chatMessages.length === 0 && (
            <p className="text-center text-slate-300 text-[13px] mt-16">메시지가 없습니다</p>
          )}
          {chatMessages.map((m) => {
            const isMine = m.sender === "customer";
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[14px] ${
                  isMine
                    ? "bg-indigo-500 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && <p className="text-[11px] font-bold mb-0.5 opacity-60">{m.senderName}</p>}
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-0.5 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                    {new Date(m.time).toLocaleTimeString()}
                  </p>
                </div>
                {isMine && (
                  <span className="text-[10px] text-slate-400 mt-0.5 mr-1">
                    {m.read ? "읽음" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지 입력"
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-[14px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
          <button
            onClick={send}
            className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors active:scale-95"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
