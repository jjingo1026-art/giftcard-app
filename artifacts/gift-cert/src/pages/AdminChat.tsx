import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { getAdminToken } from "./AdminLogin";

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

export default function AdminChat() {
  const [, navigate] = useLocation();
  const reservationId = getReservationId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }, 50);
  }

  useEffect(() => {
    if (!reservationId) return;

    fetch(`/api/admin/chat/${reservationId}`)
      .then((r) => r.json())
      .then((data) => { setMessages(data); scrollToBottom(); })
      .catch(() => {});

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      // 입장 시 고객/담당자 메시지 읽음 처리
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "admin" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg];
        scrollToBottom();
        // 새 메시지가 내 것이 아니면 즉시 읽음 처리
        if (newMsg.sender !== "admin") {
          socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "admin" });
        }
        return next;
      });
    });

    // 상대방이 내 메시지를 읽었을 때 read 상태 업데이트
    socket.on("messagesRead", ({ readerRole }: { readerRole: string }) => {
      if (readerRole !== "admin") {
        setMessages((prev) =>
          prev.map((m) => m.sender === "admin" ? { ...m, read: true } : m)
        );
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  function send() {
    if (!msg.trim() || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "admin",
      message: msg,
    });
    setMsg("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (!reservationId) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-[14px]">
      예약 ID가 없습니다.
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">상담 채팅 · 예약 #{reservationId}</h1>
            <p className="text-[11px] text-slate-400">관리자</p>
          </div>
          <button
            onClick={() => { location.href = `/admin/detail.html?id=${reservationId}`; }}
            className="ml-auto text-[12px] text-indigo-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            예약 상세 →
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col flex-1" style={{ minHeight: 0 }}>
        <div
          ref={chatBoxRef}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 overflow-auto flex-1"
          style={{ minHeight: 320, maxHeight: "calc(100vh - 200px)" }}
        >
          {messages.length === 0 && (
            <p className="text-center text-slate-300 text-[13px] mt-16">메시지가 없습니다</p>
          )}
          {messages.map((m) => {
            const isMine = m.sender === "admin";
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[14px] shadow-sm ${
                  isMine
                    ? "bg-indigo-500 text-white rounded-br-sm"
                    : m.sender === "staff"
                      ? "bg-violet-100 text-violet-800 rounded-bl-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && (
                    <p className="text-[10px] font-bold mb-0.5 opacity-60">{m.senderName}</p>
                  )}
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

        <div className="flex gap-2 mt-3">
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
