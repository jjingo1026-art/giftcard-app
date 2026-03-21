import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { getAdminToken } from "./AdminLogin";
import { useImageUpload } from "@/hooks/useImageUpload";
import { LANGUAGES, getTranslated, getSavedLang, saveLang } from "@/lib/languages";

interface Message {
  id: number;
  sender: string;
  senderName: string;
  message: string;
  language?: string;
  translatedText?: Record<string, string> | null;
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
  const [userLang, setUserLang] = useState(() => getSavedLang());
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [reservationKind, setReservationKind] = useState<string | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  const { inputRef: imgInputRef, openPicker, onChange: onImgChange, isUploading: imgUploading } = useImageUpload(({ serveUrl }) => {
    if (!socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "admin",
      language: userLang,
      message: `[IMG:${serveUrl}]`,
    });
  });

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

    // 예약 kind 조회
    fetch(`/api/admin/reservations/${reservationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data?.kind) setReservationKind(data.kind); })
      .catch(() => {});

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "admin" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg];
        scrollToBottom();
        if (newMsg.sender !== "admin") {
          socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "admin" });
        }
        return next;
      });
    });

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
      language: userLang,
      message: msg,
    });
    setMsg("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function changeLang(code: string) {
    setUserLang(code);
    saveLang(code);
    setShowLangPicker(false);
  }

  if (!reservationId) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-[14px]">
      예약 ID가 없습니다.
    </div>
  );

  const currentLang = LANGUAGES.find((l) => l.code === userLang);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[15px] font-bold text-slate-800 truncate">상담 채팅 · 예약 #{reservationId}</h1>
              {reservationKind === "mobile" ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
                  📱 모바일
                </span>
              ) : reservationKind !== null ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200">
                  🎫 지류
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-400">관리자</p>
          </div>

          {/* 언어 선택 버튼 */}
          <button
            onClick={() => setShowLangPicker((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-[12px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <span className="text-[14px]">{currentLang?.flag}</span>
            <span className="hidden sm:inline">{currentLang?.label}</span>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          <button
            onClick={() => { location.href = `/admin/detail.html?id=${reservationId}`; }}
            className="text-[12px] text-indigo-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors flex-shrink-0"
          >
            예약 상세 →
          </button>
        </div>

        {/* 언어 선택 패널 */}
        {showLangPicker && (
          <div className="border-t border-slate-100 bg-white px-4 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap
                    ${userLang === l.code
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"}`}
                >
                  <span>{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
            const isImg = m.message.startsWith("[IMG:");
            const imgUrl = isImg ? m.message.slice(5, -1) : "";
            const displayText = isImg ? "" : getTranslated(m, userLang);
            const isTranslated = !isImg && userLang !== "ko" && displayText !== m.message;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] rounded-2xl text-[14px] shadow-sm overflow-hidden ${
                  isImg ? "p-0 bg-transparent shadow-none" :
                  isMine
                    ? "px-3.5 py-2.5 bg-indigo-500 text-white rounded-br-sm"
                    : m.sender === "staff"
                      ? "px-3.5 py-2.5 bg-violet-100 text-violet-800 rounded-bl-sm"
                      : "px-3.5 py-2.5 bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && !isImg && (
                    <p className="text-[10px] font-bold mb-0.5 opacity-60">{m.senderName}</p>
                  )}
                  {isImg ? (
                    <img
                      src={imgUrl}
                      alt="이미지"
                      className="max-w-[220px] max-h-[280px] rounded-2xl object-cover cursor-pointer"
                      onClick={() => window.open(imgUrl, "_blank")}
                    />
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{displayText}</p>
                      {isTranslated && (
                        <p className={`text-[10px] mt-1 opacity-60 border-t pt-1 ${isMine ? "border-indigo-400" : "border-slate-200"}`}>
                          원문: {m.message}
                        </p>
                      )}
                    </>
                  )}
                  {!isImg && (
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                      {new Date(m.time).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {isImg && (
                  <p className={`text-[10px] mt-0.5 text-slate-400 ${isMine ? "mr-1" : "ml-1"}`}>
                    {new Date(m.time).toLocaleTimeString()}
                  </p>
                )}
                {isMine && !isImg && (
                  <span className="text-[10px] text-slate-400 mt-0.5 mr-1">
                    {m.read ? "읽음" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={onImgChange} />

        <div className="flex gap-2 mt-3">
          <button
            onClick={openPicker}
            disabled={imgUploading}
            className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-[18px] hover:bg-slate-200 transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
            title="사진 첨부"
          >
            {imgUploading ? <span className="text-[11px] text-slate-500 font-bold">...</span> : "📷"}
          </button>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지 입력"
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-[14px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
          <button
            onClick={send}
            className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors active:scale-95 flex-shrink-0"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
