import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
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

export default function StaffDetail() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "매입담당자";
  const reservationId = new URLSearchParams(window.location.search).get("id");

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [userLang, setUserLang] = useState(() => getSavedLang());
  const [showLangPicker, setShowLangPicker] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { inputRef: imgInputRef, openPicker, onChange: onImgChange, isUploading: imgUploading } =
    useImageUpload(({ serveUrl }) => {
      socketRef.current?.emit("sendMessage", {
        reservationId: Number(reservationId),
        sender: "staff",
        senderName: staffName,
        message: `[IMG:${serveUrl}]`,
      });
    });

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    if (!reservationId) return;

    fetch(`/api/admin/chat/${reservationId}`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        setChatMessages(data);
        scrollToBottom();
      })
      .catch(() => {});

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "staff" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (newMsg.sender !== "staff") {
        socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "staff" });
      }
      scrollToBottom();
    });

    socket.on("messagesRead", ({ readerRole }: { readerRole: string }) => {
      if (readerRole !== "staff") {
        setChatMessages((prev) => prev.map((m) => m.sender === "staff" ? { ...m, read: true } : m));
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }, 50);
  }

  function sendMsg() {
    if (!msg.trim()) return;
    socketRef.current?.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "staff",
      senderName: staffName,
      language: "ko",
      message: msg,
    });
    setMsg("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  }

  function changeLang(code: string) {
    setUserLang(code);
    saveLang(code);
    setShowLangPicker(false);
  }

  function goBack() {
    const ref = document.referrer;
    if (ref.includes("/staff/chats")) {
      window.location.href = "/staff/chats";
    } else {
      window.location.href = "/staff/dashboard";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={onImgChange} />

      <div
        className="w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ height: "calc(100vh - 48px)", maxHeight: 760 }}
      >
        {/* 창 타이틀 바 */}
        <div
          className="flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={goBack}
                className="w-3 h-3 rounded-full bg-rose-400 hover:bg-rose-500 transition-colors"
                title="뒤로가기"
              />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[15px] truncate">💬 채팅 · 예약 #{reservationId}</p>
              <p className="text-indigo-200 text-[11px]">담당자: {staffName}</p>
            </div>
            <button
              onClick={() => setShowLangPicker((v) => !v)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-[12px] font-semibold"
              title="언어 선택"
            >
              <span>{LANGUAGES.find((l) => l.code === userLang)?.flag}</span>
              <span className="hidden sm:inline">{LANGUAGES.find((l) => l.code === userLang)?.label}</span>
            </button>
            <button
              onClick={goBack}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>
          {/* 언어 선택 패널 */}
          {showLangPicker && (
            <div className="px-4 pb-3 border-t border-indigo-400/30">
              <div className="flex flex-col gap-1.5 pt-2 max-h-52 overflow-y-auto scrollbar-none">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => changeLang(l.code)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all
                      ${userLang === l.code
                        ? "bg-white text-indigo-600 border-white"
                        : "bg-white/10 text-indigo-100 border-white/20 hover:bg-white/20"}`}
                  >
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 메시지 영역 */}
        <div
          ref={chatBoxRef}
          className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3"
        >
          {chatMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">💬</div>
              <p className="text-[13px] text-slate-400 font-medium">아직 메시지가 없습니다</p>
              <p className="text-[11px] text-slate-300">첫 메시지를 보내보세요</p>
            </div>
          )}
          {chatMessages.map((m) => {
            const isMine = m.sender === "staff";
            const isImg = m.message.startsWith("[IMG:");
            const imgUrl = isImg ? m.message.slice(5, -1) : "";
            const displayText = isImg ? "" : getTranslated(m, userLang);
            const isTranslated = !isImg && !!m.translatedText && (m.language ?? "ko") !== userLang && displayText !== m.message;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] rounded-2xl text-[14px] shadow-sm overflow-hidden ${
                  isImg ? "p-0 bg-transparent shadow-none" :
                  isMine
                    ? "px-3.5 py-2.5 bg-indigo-500 text-white rounded-br-sm"
                    : m.sender === "admin"
                      ? "px-3.5 py-2.5 bg-violet-100 text-violet-800 rounded-bl-sm"
                      : "px-3.5 py-2.5 bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && !isImg && (
                    <p className="text-[10px] font-bold mb-0.5 opacity-60">{m.senderName}</p>
                  )}
                  {isImg ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-2 shadow-sm">
                      <img
                        src={imgUrl}
                        alt="이미지"
                        className="w-[60px] h-[60px] rounded-xl object-cover cursor-pointer border border-slate-200 flex-shrink-0"
                        onClick={() => window.open(imgUrl, "_blank")}
                      />
                      <button
                        onClick={() => window.open(imgUrl, "_blank")}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-slate-600 text-[10px] font-bold border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 2v12m0 0l-4-4m4 4l4-4M3 17h14"/>
                        </svg>
                        보기
                      </button>
                    </div>
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
                      {new Date(m.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                {isImg && (
                  <p className={`text-[10px] mt-0.5 text-slate-400 ${isMine ? "mr-1" : "ml-1"}`}>
                    {new Date(m.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {isMine && !isImg && (
                  <span className="text-[10px] text-slate-400 mt-0.5 mr-1">{m.read ? "읽음" : ""}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 입력 영역 */}
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={openPicker}
              disabled={imgUploading}
              className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-[18px] hover:bg-slate-200 transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
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
              onClick={sendMsg}
              className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors active:scale-95 flex-shrink-0"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
