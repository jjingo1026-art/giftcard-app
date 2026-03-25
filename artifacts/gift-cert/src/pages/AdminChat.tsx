import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { getAdminToken } from "./AdminLogin";
import { useImageUpload } from "@/hooks/useImageUpload";
import { getTranslated } from "@/lib/languages";
import { getSoundEnabled, playNotificationSound } from "@/lib/notificationSound";
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

    // 모바일: Web Share API 우선 시도
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

    // Android 직접 다운로드
    if (isAndroid) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      showSaveToast("💾 저장 완료!\n파일 앱 → Downloads 폴더에서\n확인하세요.");
      return;
    }

    // iOS: 새 탭에서 열어 길게 누르기 안내
    if (isIOS) {
      window.open(url, "_blank");
      showSaveToast("📱 열린 이미지를 길게 누른 후\n'이미지 저장'을 선택하시면\n사진 앱에 저장됩니다.");
      return;
    }

    // PC
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

export default function AdminChat() {
  const [, navigate] = useLocation();
  const reservationId = getReservationId();
  const fromParam = getFromParam();
  const [messages, setMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const userLang = "ko";
  const [reservationKind, setReservationKind] = useState<string | null>(null);
  const [reservationStatus, setReservationStatus] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [newMsgFlash, setNewMsgFlash] = useState(false);
  const [showDefectConfirm, setShowDefectConfirm] = useState(false);
  const [defectDone, setDefectDone] = useState(false);
  const [defectLoading, setDefectLoading] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastSoundRef = useRef<number>(0); // 중복 알림음 방지
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast("복사됨!");
      setTimeout(() => setCopyToast(null), 1800);
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopyToast("복사됨!");
      setTimeout(() => setCopyToast(null), 1800);
    });
  }, []);

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
      .then((data) => {
        if (data?.kind) setReservationKind(data.kind);
        if (data?.status) setReservationStatus(data.status);
      })
      .catch(() => {});

    const socket = io({ path: "/api/socket.io", transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(reservationId));
      socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "admin" });
    });

    // 관리자 알림음 + 시각적 플래시 (중복 방지 500ms 디바운스)
    const playAdminSound = () => {
      const now = Date.now();
      if (now - lastSoundRef.current < 500) return;
      lastSoundRef.current = now;
      setNewMsgFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setNewMsgFlash(false), 2500);
      if (getSoundEnabled("admin")) playNotificationSound("admin");
    };

    socket.on("newMessage", (newMsg: Message) => {
      if (newMsg.sender !== "admin") {
        playAdminSound();
      }

      setMessages((prev) => {
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
        if (newMsg.sender !== "admin") {
          socket.emit("markRead", { reservationId: Number(reservationId), readerRole: "admin" });
        }
        return [...prev, newMsg];
      });
    });

    // 번역 완료 시 해당 메시지 translatedText 업데이트
    socket.on("messageTranslated", (updated: Message) => {
      setMessages((prev) =>
        prev.map((m) => m.id === updated.id ? { ...m, translatedText: updated.translatedText } : m)
      );
    });

    // chatAlert: 전체 브로드캐스트로 알림음 보조 재생 (newMessage 실패 대비)
    socket.on("chatAlert", (msg: { reservationId: number; sender: string }) => {
      if (msg.reservationId === Number(reservationId)) {
        playAdminSound();
      }
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

  function addOptimisticMsg(text: string) {
    const tempMsg: Message = {
      id: -Date.now(),
      sender: "admin",
      senderName: "관리자",
      message: text,
      language: "ko",
      translatedText: {},
      time: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();
  }

  function send() {
    const text = msg.trim();
    if (!text || !socketRef.current) return;
    addOptimisticMsg(text);
    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "admin",
      language: "ko",
      message: text,
    });
    setMsg("");
  }

  function sendQuick(text: string) {
    if (!socketRef.current) return;
    addOptimisticMsg(text);
    socketRef.current.emit("sendMessage", {
      reservationId: Number(reservationId),
      sender: "admin",
      language: "ko",
      message: text,
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function handleComplete() {
    sendQuick("입금이 완료되었습니다 감사합니다 좋은하루 되세요^^");
    try {
      await fetch(`/api/admin/reservations/${reservationId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });
      setReservationStatus("completed");
    } catch {
    }
  }

  async function handleDefectTerminate() {
    if (defectDone || defectLoading) return;
    setDefectLoading(true);
    try {
      sendQuick("거래가 종료되었습니다.");
      await fetch(`/api/admin/reservations/${reservationId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed", category: "하자종료" }),
      });
      setReservationStatus("completed");
      setDefectDone(true);
      setShowDefectConfirm(false);
    } catch {
    } finally {
      setDefectLoading(false);
    }
  }

  if (!reservationId) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-[14px]">
      예약 ID가 없습니다.
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 하자종료 확인 모달 */}
      {showDefectConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-rose-50 px-5 pt-6 pb-4 text-center">
              <div className="text-[40px] mb-2">⚠️</div>
              <h2 className="text-[17px] font-black text-rose-700">하자종료 처리</h2>
              <p className="text-[13px] text-rose-500 mt-1.5 leading-relaxed">
                채팅에 <span className="font-bold">"거래가 종료되었습니다."</span> 메시지를 전송하고<br />
                해당 예약을 <span className="font-bold">하자종료</span>로 완료 처리합니다.
              </p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <p className="text-[12px] text-slate-500 text-center">처리 후에는 취소가 불가능합니다. 계속하시겠습니까?</p>
              <button
                onClick={handleDefectTerminate}
                disabled={defectLoading}
                className="w-full py-3 rounded-2xl bg-rose-500 text-white text-[14px] font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                {defectLoading ? "처리 중…" : "확인 — 하자종료 처리"}
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

      {/* 복사 toast */}
      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-[13px] font-bold px-5 py-2.5 rounded-2xl shadow-lg animate-fade-in">
          ✓ {copyToast}
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => {
              const isMobile = fromParam === "mobile" || reservationKind === "mobile";
              navigate(isMobile ? "/admin/mobile" : "/admin/dashboard");
            }}
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

          <div className="relative flex-shrink-0">
            <SoundBell role="admin" />
            {newMsgFlash && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>

          <button
            onClick={() => { location.href = `/admin/detail.html?id=${reservationId}`; }}
            className="text-[12px] text-indigo-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors flex-shrink-0"
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
            const isSystem = m.sender === "system";
            const isImg = m.message.startsWith("[IMG:");
            const imgUrl = isImg ? m.message.slice(5, -1) : "";
            const displayText = isImg ? "" : getTranslated(m, userLang);
            const isTranslated = !isImg && !!m.translatedText && (m.language ?? "ko") !== userLang && displayText !== m.message;

            // 시스템 메시지: "번호:" / "입금계좌:" 포함 라인 파싱
            const CopyBtn = ({ value, label = "복사" }: { value: string; label?: string }) => (
              <button
                onClick={() => copyText(value)}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 text-[10px] font-bold hover:bg-blue-200 active:scale-95 transition-all"
              >
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="8" width="10" height="10" rx="2"/><path d="M4 12H3a1 1 0 01-1-1V3a1 1 0 011-1h8a1 1 0 011 1v1"/>
                </svg>
                {label}
              </button>
            );

            const renderSystemText = (text: string) => {
              const lines = text.split("\n");
              return lines.map((line, i) => {
                // 상품권 번호 — "번호: xxxxxxx" 패턴
                const numMatch = line.match(/번호:\s*(.+)/);
                if (numMatch) {
                  const num = numMatch[1].trim();
                  return (
                    <div key={i} className="flex items-center gap-1.5 my-0.5">
                      <span className="text-[13px] leading-snug flex-1 break-all">{line}</span>
                      <CopyBtn value={num} />
                    </div>
                  );
                }
                // 계좌번호 — "입금계좌:" 또는 "계좌번호:" 포함 라인
                // 계좌번호: 8자리 이상 연속 숫자(하이픈 포함)로 추출
                if (line.includes("입금계좌:") || line.includes("계좌번호:")) {
                  const acctNumMatch = line.match(/(\d[\d\-]{7,})/);
                  const acctNum = acctNumMatch ? acctNumMatch[1].replace(/-/g, "") : "";
                  return (
                    <div key={i} className="flex items-center gap-1.5 my-0.5">
                      <span className="text-[13px] leading-snug flex-1 break-all">{line}</span>
                      {acctNum && <CopyBtn value={acctNum} label="계좌복사" />}
                    </div>
                  );
                }
                return <p key={i} className="text-[13px] leading-snug">{line}</p>;
              });
            };

            // 계좌번호 또는 상품권 번호 포함 시 sender에 무관하게 복사버튼 렌더링 적용
            const hasAccountLine = !isImg && (
              displayText.includes("계좌번호:") ||
              displayText.includes("입금계좌:") ||
              /번호:\s*\S/.test(displayText)
            );

            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`max-w-[82%] rounded-2xl text-[14px] shadow-sm overflow-hidden ${
                  isImg ? "p-0 bg-transparent shadow-none" :
                  isMine
                    ? "px-3.5 py-2.5 bg-indigo-500 text-white rounded-br-sm"
                    : m.sender === "staff"
                      ? "px-3.5 py-2.5 bg-violet-100 text-violet-800 rounded-bl-sm"
                      : isSystem
                        ? "px-3.5 py-2.5 bg-blue-50 text-slate-800 border border-blue-100 rounded-bl-sm"
                        : "px-3.5 py-2.5 bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && !isImg && (
                    <p className={`text-[10px] font-bold mb-0.5 ${isSystem ? "text-blue-500" : "opacity-60"}`}>{m.senderName}</p>
                  )}
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
                            <path d="M10 2v12m0 0l-4-4m4 4l4-4M3 17h14"/>
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
                  ) : isSystem || hasAccountLine ? (
                    <>
                      {renderSystemText(displayText)}
                      {isTranslated && (
                        <p className="text-[10px] mt-1 opacity-60 border-t border-blue-100 pt-1">원문: {m.message}</p>
                      )}
                    </>
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
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-indigo-200" : isSystem ? "text-blue-300" : "text-slate-400"}`}>
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

        {/* 모바일 빠른 전송 버튼 — 2행 */}
        {reservationKind === "mobile" && (
          <div className="flex flex-col gap-2 mt-3">
            {/* 1행: 처리완료 · 잠시대기 · 일부하자 */}
            <div className="flex gap-2">
              {reservationStatus === "completed" ? (
                <div className="flex-1 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold text-center">
                  ✅ 처리 완료됨
                </div>
              ) : (
                <button
                  onClick={handleComplete}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold hover:bg-emerald-100 active:scale-[0.97] transition-all"
                >
                  ✅ 처리완료
                </button>
              )}
              <button
                onClick={() => sendQuick("확인중입니다 잠시만 기다려 주세요")}
                className="flex-1 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-[12px] font-bold hover:bg-sky-100 active:scale-[0.97] transition-all"
              >
                ⏳ 잠시대기
              </button>
              <button
                onClick={() => sendQuick("일부 상품권에 문제가 있습니다")}
                className="flex-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-bold hover:bg-amber-100 active:scale-[0.97] transition-all"
              >
                ⚠️ 일부하자
              </button>
            </div>
            {/* 2행: 전체하자 · 하자종료 */}
            <div className="flex gap-2">
              <button
                onClick={() => sendQuick("상품권 번호가 유효하지 않습니다 확인하시고 다시 신청해주세요")}
                className="flex-1 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-bold hover:bg-rose-100 active:scale-[0.97] transition-all"
              >
                ❌ 전체하자
              </button>
              {defectDone ? (
                <div className="flex-1 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-[12px] font-bold text-center">
                  🔴 하자종료됨
                </div>
              ) : (
                <button
                  onClick={() => setShowDefectConfirm(true)}
                  disabled={reservationStatus === "completed"}
                  className="flex-1 px-3 py-2 rounded-xl bg-red-600 border border-red-700 text-white text-[12px] font-bold hover:bg-red-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🔴 하자종료
                </button>
              )}
            </div>
          </div>
        )}

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
