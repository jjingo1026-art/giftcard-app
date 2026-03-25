import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { LANGUAGES, getTranslated, getSavedLang, saveLang } from "@/lib/languages";
import { getSoundEnabled, playNotificationSound } from "@/lib/notificationSound";
import { subscribeToPush, clearBadge } from "@/lib/pushNotification";
import SoundBell from "@/components/SoundBell";

function showSaveToast(msg: string) {
  const existing = document.getElementById("__save_toast__");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.id = "__save_toast__";
  el.innerHTML = msg;
  el.style.cssText = [
    "position:fixed", "bottom:90px", "left:50%", "transform:translateX(-50%)",
    "background:#1e293b", "color:#fff", "padding:14px 18px", "border-radius:14px",
    "font-size:13px", "line-height:1.6", "z-index:99999", "max-width:88vw",
    "text-align:center", "box-shadow:0 6px 24px rgba(0,0,0,0.35)",
    "word-break:keep-all", "white-space:pre-wrap",
  ].join(";");
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5500);
}

async function downloadImage(url: string) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const today = new Date().toISOString().slice(0, 10);
    const filename = `우리동네상품권이미지_${today}_${Date.now()}.${ext}`;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if ((isIOS || isAndroid) && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "우리동네상품권 이미지" });
        if (isIOS) {
          showSaveToast("📱 공유 메뉴에서\n'이미지 저장' 또는 '파일에 저장'을\n선택하시면 사진 앱에 저장됩니다.");
        } else {
          showSaveToast("📱 공유 메뉴에서 '갤러리에 저장' 또는\n'파일에 저장'을 선택해주세요.");
        }
        return;
      }
    }

    if (isAndroid) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      showSaveToast("💾 저장 완료!\n파일 앱 → Downloads 폴더에서\n확인하세요.");
      return;
    }

    if (isIOS) {
      window.open(url, "_blank");
      showSaveToast("📱 열린 이미지를 길게 누른 후\n'이미지 저장'을 선택하시면\n사진 앱에 저장됩니다.");
      return;
    }

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
    showSaveToast("📱 열린 이미지를 길게 누른 후\n'이미지 저장'을 선택해주세요.");
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
  const [showDefectConfirm, setShowDefectConfirm] = useState(false);
  const [defectDone, setDefectDone] = useState(false);
  const [defectLoading, setDefectLoading] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);

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

    // 채팅창 열림: 뱃지 초기화
    clearBadge();

    // 이미 허용된 경우 자동 구독 (프롬프트 없음)
    if ("Notification" in window && Notification.permission === "granted") {
      subscribeToPush(reservationId).catch(() => {});
    }

    fetch(`/api/admin/chat/${reservationId}`)
      .then((r) => r.json())
      .then((data) => { setChatMessages(data); scrollToBottom(); })
      .catch(() => {});

    const socket = io({ path: "/api/socket.io", transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "customer" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      if (newMsg.sender !== "customer") {
        if (getSoundEnabled("customer")) playNotificationSound("customer");
      }

      setChatMessages((prev) => {
        // 낙관적 업데이트 메시지(음수 id)를 실제 메시지로 교체
        const optIdx = prev.findIndex(
          (m) => m.id < 0 && m.sender === newMsg.sender && m.message === newMsg.message
        );
        if (optIdx !== -1) {
          const next = [...prev];
          next[optIdx] = newMsg;
          scrollToBottom();
          return next;
        }
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        scrollToBottom();
        if (newMsg.sender !== "customer") {
          socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "customer" });
        }
        return [...prev, newMsg];
      });
    });

    // 번역 완료 시 해당 메시지 translatedText 업데이트
    socket.on("messageTranslated", (updated: Message) => {
      setChatMessages((prev) =>
        prev.map((m) => m.id === updated.id ? { ...m, translatedText: updated.translatedText } : m)
      );
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
    const text = msg.trim();
    if (!text || !socketRef.current) return;

    // 낙관적 UI: 서버 응답 전 즉시 화면에 표시
    const tempMsg: Message = {
      id: -Date.now(),
      sender: "customer",
      senderName: "고객",
      message: text,
      language: userLang,
      translatedText: {},
      time: new Date().toISOString(),
      read: false,
    };
    setChatMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();

    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "customer",
      language: userLang,
      message: text,
    });
    setMsg("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function handleDefectTerminate() {
    if (!socketRef.current || defectDone) return;
    setDefectLoading(true);
    try {
      // 채팅에 시스템 메시지 전송
      socketRef.current.emit("sendMessage", {
        reservationId: Number(reservationId),
        sender: "customer",
        language: "ko",
        message: "⚠️ [전체 하자 종료] 제출하신 상품권 전체에 하자가 확인되어 거래가 종료됩니다.",
      });
      setDefectDone(true);
      setShowDefectConfirm(false);
    } finally {
      setDefectLoading(false);
    }
  }

  function changeLang(code: string) {
    setUserLang(code);
    saveLang(code);
    setShowLangPicker(false);
  }

  const currentLang = LANGUAGES.find((l) => l.code === userLang);

  async function handleEnableNotifications() {
    const ok = await subscribeToPush(reservationId ?? "");
    setNotifPermission("Notification" in window ? Notification.permission : "unsupported");
    if (ok) setNotifBannerDismissed(true);
  }

  const showNotifBanner =
    !notifBannerDismissed &&
    notifPermission !== "unsupported" &&
    notifPermission === "default";

  return (
    <div className="min-h-screen bg-slate-50">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={onImgChange} />

      {/* 하자종료 확인 모달 */}
      {showDefectConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-rose-50 px-5 pt-6 pb-4 text-center">
              <div className="text-[40px] mb-2">⚠️</div>
              <h2 className="text-[17px] font-black text-rose-700">전체 하자 거래 종료</h2>
              <p className="text-[13px] text-rose-500 mt-1.5 leading-relaxed">
                제출하신 상품권 전체에 하자가 확인되어<br />
                <span className="font-bold">거래가 종료됩니다.</span>
              </p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <p className="text-[12px] text-slate-500 text-center">종료 후에는 취소가 불가능합니다. 계속하시겠습니까?</p>
              <button
                onClick={handleDefectTerminate}
                disabled={defectLoading}
                className="w-full py-3 rounded-2xl bg-rose-500 text-white text-[14px] font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                {defectLoading ? "처리 중…" : "확인 — 거래 종료"}
              </button>
              <button
                onClick={() => setShowDefectConfirm(false)}
                disabled={defectLoading}
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-[14px] font-semibold active:scale-95 transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

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

      {showNotifBanner && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
            <span className="text-[22px]">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-indigo-800">알림을 허용하시면 답변 도착 시 알려드립니다</p>
              <p className="text-[11px] text-indigo-500 mt-0.5">채팅창을 닫아도 새 메시지를 받을 수 있어요</p>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-[12px] font-bold rounded-xl active:scale-95 transition-all"
            >
              허용
            </button>
            <button
              onClick={() => setNotifBannerDismissed(true)}
              className="flex-shrink-0 text-indigo-300 hover:text-indigo-500 text-[18px] leading-none"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>
      )}

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

        {/* 하자종료 버튼 (모바일 채팅 전용) */}
        {fromMobile && (
          defectDone ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[13px] font-semibold">
              <span>⚠️</span>
              <span>전체 하자로 인해 거래가 종료되었습니다.</span>
            </div>
          ) : (
            <button
              onClick={() => setShowDefectConfirm(true)}
              className="w-full py-2.5 rounded-2xl border-2 border-rose-300 text-rose-600 text-[13px] font-bold bg-rose-50 hover:bg-rose-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>⚠️</span> 전체 하자로 인한 하자종료
            </button>
          )
        )}

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
