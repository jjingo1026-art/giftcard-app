import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { LANGUAGES, getTranslated, getSavedLang, saveLang } from "@/lib/languages";
import { getSoundEnabled, playNotificationSound } from "@/lib/notificationSound";
import SoundBell from "@/components/SoundBell";

async function downloadImage(url: string) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const today = new Date().toISOString().slice(0, 10);
    const filename = `우리동네상품권이미지_${today}_${Date.now()}.${ext}`;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "우리동네상품권 이미지" });
        return;
      }
    }

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

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

function getFromParam() {
  return new URLSearchParams(window.location.search).get("from");
}

export default function CustomerChat() {
  const reservationId = getReservationId();
  const fromMobile = getFromParam() === "mobile";
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [userLang, setUserLang] = useState(() => getSavedLang());
  const [showLangPicker, setShowLangPicker] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { inputRef: imgInputRef, openPicker, onChange: onImgChange, isUploading: imgUploading } = useImageUpload(({ serveUrl }) => {
    if (!socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "customer",
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
      .then((data) => { setChatMessages(data); scrollToBottom(); })
      .catch(() => {});

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "customer" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg];
        scrollToBottom();
        if (newMsg.sender !== "customer") {
          socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "customer" });
          if (getSoundEnabled("customer")) playNotificationSound("customer");
        }
        return next;
      });
    });

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

  const currentLang = LANGUAGES.find((l) => l.code === userLang);

  return (
    <div className="min-h-screen bg-slate-50">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={onImgChange} />

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = fromMobile ? "/mobile/check" : "/check.html"; }}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-slate-800 truncate flex items-center gap-2">
              {fromMobile ? "📱 모바일상품권 판매 채팅" : `상담 채팅 · #${reservationId}`}
            </h1>
            {fromMobile && <p className="text-[11px] text-slate-400">접수번호 #{reservationId}</p>}
          </div>
          <SoundBell role="customer" />
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowLangPicker((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <span className="text-[15px]">{currentLang?.flag}</span>
              <span>{currentLang?.label}</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {showLangPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-lg px-3 py-2">
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto scrollbar-none w-fit">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => changeLang(l.code)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all
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
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div
          ref={chatBoxRef}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-2 overflow-auto"
          style={{ height: "calc(100vh - 170px)", minHeight: 300 }}
        >
          {chatMessages.length === 0 && (
            <p className="text-center text-slate-300 text-[13px] mt-16">메시지가 없습니다</p>
          )}
          {chatMessages.map((m) => {
            const isMine = m.sender === "customer";
            const isImg = m.message.startsWith("[IMG:");
            const imgUrl = isImg ? m.message.slice(5, -1) : "";
            const displayText = isImg ? "" : getTranslated(m, userLang);
            const isTranslated = !isImg && !!m.translatedText && (m.language ?? "ko") !== userLang && displayText !== m.message;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] rounded-2xl text-[14px] overflow-hidden ${
                  isImg ? "" :
                  isMine
                    ? "px-3 py-2 bg-indigo-500 text-white rounded-br-sm"
                    : "px-3 py-2 bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && !isImg && <p className="text-[11px] font-bold mb-0.5 opacity-60">{m.senderName}</p>}
                  {isImg ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-2 shadow-sm">
                      <img
                        src={imgUrl}
                        alt="이미지"
                        className="w-[60px] h-[60px] rounded-xl object-cover cursor-pointer border border-slate-200 flex-shrink-0"
                        onClick={() => window.open(imgUrl, "_blank")}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => window.open(imgUrl, "_blank")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-slate-600 text-[10px] font-bold border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3h14v14H3z"/>
                          </svg>
                          보기
                        </button>
                        <button
                          onClick={() => downloadImage(imgUrl)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 14v3h12v-3M10 3v9m0 0l-3-3m3 3l3-3"/>
                          </svg>
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{displayText}</p>
                      {isTranslated && (
                        <p className={`text-[10px] mt-1 opacity-60 border-t pt-1 ${isMine ? "border-indigo-400" : "border-slate-300"}`}>
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
                  <p className="text-[10px] mt-0.5 text-slate-400">{new Date(m.time).toLocaleTimeString()}</p>
                )}
                {isMine && !isImg && (
                  <span className="text-[10px] text-slate-400 mt-0.5 mr-1">{m.read ? "읽음" : ""}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={openPicker}
            disabled={imgUploading}
            className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-[18px] hover:bg-slate-200 transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
            title="사진 첨부"
          >
            {imgUploading ? <span className="text-[11px] text-slate-500 font-bold">…</span> : "📷"}
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
