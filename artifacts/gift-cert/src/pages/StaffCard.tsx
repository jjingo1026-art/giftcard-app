import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { staffFetch } from "@/lib/authFetch";
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

interface SavedItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

interface Reservation {
  id: number;
  kind: string;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location: string;
  items: SavedItem[];
  totalPayment: number;
  giftcardType?: string;
  amount?: string | number;
  status: string;
  isUrgent?: boolean;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface Message {
  id: number;
  sender: string;
  senderName: string;
  message: string;
  time: string;
  read: boolean;
  language?: string;
  translatedText?: Record<string, string> | null;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:   { text: "대기중",  cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  assigned:  { text: "배정됨", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  completed: { text: "완료",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  no_show:   { text: "노쇼",   cls: "bg-slate-100 text-slate-500 border-slate-200" },
  cancelled: { text: "취소",   cls: "bg-rose-50 text-rose-400 border-rose-100" },
};

function weekday(date: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
}
function formatDateFull(date?: string, time?: string) {
  if (!date) return "날짜 미정";
  const d = new Date(date);
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday(date)})`;
  return time ? `${label} ${time}` : label;
}
function formatPhone(p: string) {
  return p.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

export default function StaffCard() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";
  const id = new URLSearchParams(window.location.search).get("id");

  /* 예약 상태 */
  const [r, setR] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [noShowing, setNoShowing] = useState(false);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  const [defectModal, setDefectModal] = useState(false);
  const [defectDetail, setDefectDetail] = useState("");
  const [sendingDefect, setSendingDefect] = useState(false);

  /* 자주 쓰는 문구 */
  const [phrases, setPhrases] = useState<string[]>([]);
  const [showAddPhrase, setShowAddPhrase] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [savingPhrase, setSavingPhrase] = useState(false);

  /* 채팅 창 상태 */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [unread, setUnread] = useState(0);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  /* 이미지 업로드 */
  const { inputRef: imgInputRef, openPicker, onChange: onImgChange, isUploading: imgUploading } = useImageUpload(({ serveUrl }) => {
    socketRef.current?.emit("sendMessage", {
      reservationId: Number(id),
      sender: "staff",
      senderName: staffName,
      message: `[IMG:${serveUrl}]`,
    });
  });

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    if (!id) { window.location.href = "/staff/dashboard"; return; }

    staffFetch("/api/admin/staff/my-reservations")
      .then((res) => res.json())
      .then((data: Reservation[]) => {
        const found = Array.isArray(data) ? data.find((x) => String(x.id) === id) : null;
        setR(found ?? null);
      })
      .finally(() => setLoading(false));

    staffFetch("/api/staff/quick-phrases")
      .then((res) => res.json())
      .then((data: string[]) => { if (Array.isArray(data)) setPhrases(data); })
      .catch(() => {});

    fetch(`/api/admin/chat/${id}`)
      .then((res) => res.json())
      .then((data: Message[]) => {
        setChatMessages(data);
        const unreadCount = data.filter((m) => !m.read && m.sender !== "staff" && m.sender !== "system").length;
        setUnread(unreadCount);
      })
      .catch(() => {});

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(id));
    });

    socket.on("newMessage", (newMsg: Message) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (newMsg.sender !== "staff" && newMsg.sender !== "system") {
        if (getSoundEnabled("staff")) playNotificationSound("staff");
        setChatOpen((open) => {
          if (open) {
            socket.emit("markRead", { reservationId: Number(id), readerRole: "staff" });
          } else {
            setUnread((u) => u + 1);
          }
          return open;
        });
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

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
      setUnread(0);
      socketRef.current?.emit("markRead", { reservationId: Number(id), readerRole: "staff" });
    }
  }, [chatOpen]);

  useEffect(() => { if (chatOpen) scrollToBottom(); }, [chatMessages]);

  function scrollToBottom() {
    setTimeout(() => {
      if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }, 50);
  }

  function sendChatViaSocket(message: string) {
    socketRef.current?.emit("sendMessage", {
      reservationId: Number(id),
      sender: "staff",
      senderName: staffName,
      message,
    });
  }

  async function sendChatMessage(message: string) {
    sendChatViaSocket(message);
  }

  async function savePhrasesToServer(list: string[]) {
    setSavingPhrase(true);
    try {
      await staffFetch("/api/staff/quick-phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrases: list }),
      });
    } finally {
      setSavingPhrase(false);
    }
  }

  function addPhrase() {
    const trimmed = newPhrase.trim();
    if (!trimmed) return;
    const updated = [...phrases, trimmed];
    setPhrases(updated);
    savePhrasesToServer(updated);
    setNewPhrase("");
    setShowAddPhrase(false);
  }

  function deletePhrase(idx: number) {
    const updated = phrases.filter((_, i) => i !== idx);
    setPhrases(updated);
    savePhrasesToServer(updated);
  }

  function sendMsg() {
    if (!msg.trim()) return;
    sendChatViaSocket(msg);
    setMsg("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  }

  async function markComplete() {
    if (!r || !confirm("완료 처리하시겠습니까?")) return;
    setCompleting(true);
    try {
      await staffFetch(`/api/admin/reservations/${id}/complete`, { method: "POST" });
      setR((prev) => prev ? { ...prev, status: "completed" } : prev);
      await sendChatMessage("매입이 완료되었습니다 좋은하루 되세요^^");
    } finally { setCompleting(false); }
  }

  async function markNoShow() {
    if (!r || !confirm("노쇼 처리하시겠습니까?")) return;
    setNoShowing(true);
    try {
      await staffFetch(`/api/admin/reservations/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no_show" }),
      });
      setR((prev) => prev ? { ...prev, status: "no_show" } : prev);
    } finally { setNoShowing(false); }
  }

  async function handlePaymentRequest() {
    if (!r) return;
    setSendingPayment(true);
    try {
      const name = r.name || r.phone;
      const amount = (r.totalPayment ?? 0).toLocaleString("ko-KR");
      const bank = r.bankName || "-";
      const account = r.accountNumber || "-";
      const holder = r.accountHolder || "-";
      await sendChatMessage(
        `매입담당자 ${staffName}\n` +
        `💰 입금 요청 — ${name}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏦 은행: ${bank}\n` +
        `📋 계좌번호: ${account}\n` +
        `👤 예금주: ${holder}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 입금 금액: ${amount}원\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `판매자 계좌로 위 금액을 입금해 주세요.`
      );
      setPaymentSent(true);
      setTimeout(() => setPaymentSent(false), 3000);
    } finally { setSendingPayment(false); }
  }

  async function handleDefectSubmit() {
    if (!defectDetail.trim()) return;
    setSendingDefect(true);
    try {
      await sendChatMessage(`⚠️ 일부 하자 안내\n${defectDetail.trim()}\n\n처리 방법에 대해 아래 채팅으로 협의 부탁드립니다.`);
      setDefectModal(false);
      setDefectDetail("");
    } finally { setSendingDefect(false); }
  }

  const isActive = r ? !["completed", "cancelled", "no_show"].includes(r.status) : false;
  const items: { type: string; amount: number; payment: number }[] =
    r && Array.isArray(r.items) && r.items.length > 0
      ? r.items
      : r?.giftcardType
        ? [{ type: r.giftcardType, amount: Number(r.amount ?? 0), payment: r.totalPayment }]
        : [];
  const totalFace = items.reduce((s, it) => s + Number(it.amount), 0);

  /* 하단 바 높이 계산 */
  const bottomPad = isActive ? "pb-28" : "pb-8";

  return (
    <div className={`min-h-screen bg-slate-50 ${bottomPad}`}>
      {/* 숨김 파일 input */}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={onImgChange} />

      {/* ── 헤더 ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/staff/dashboard"; }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-slate-800">예약 상세카드</h1>
            {r && <p className="text-[11px] text-slate-400 mt-0.5">#{r.id} · {r.name || r.phone}</p>}
          </div>
          {r && (
            <button
              onClick={() => setChatOpen(true)}
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors text-indigo-500 flex-shrink-0"
            >
              <div className="relative">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-indigo-500">채팅</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}
        {!loading && !r && (
          <div className="py-20 text-center">
            <p className="text-[14px] text-slate-400">예약 정보를 찾을 수 없습니다.</p>
            <button onClick={() => { window.location.href = "/staff/dashboard"; }} className="mt-4 text-[13px] text-indigo-500 font-bold">← 목록으로</button>
          </div>
        )}

        {!loading && r && (
          <>
            {/* 긴급 배너 */}
            {r.isUrgent && (
              <div className="bg-rose-500 text-white text-[13px] font-black text-center py-2.5 rounded-2xl tracking-wide">
                ⚡ 긴급 매입 요청
              </div>
            )}

            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[18px] font-black text-slate-800">{r.name || "이름 미입력"}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">{formatPhone(r.phone)}</p>
                </div>
                {(() => {
                  const sl = STATUS_LABEL[r.status] ?? { text: r.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
                  return <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${sl.cls}`}>{sl.text}</span>;
                })()}
              </div>
              <div className="h-px bg-slate-100" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">일시</p>
                  <p className="text-[13px] font-bold text-slate-700">{formatDateFull(r.date, r.time)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">거래장소</p>
                  <p className="text-[13px] font-bold text-slate-700">{r.location || "-"}</p>
                </div>
              </div>
            </div>

            {/* 상품권 테이블 */}
            {items.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-black text-slate-500 px-4 py-2.5">권종</p>
                  <p className="text-[11px] font-black text-slate-500 px-2 py-2.5 text-right">액면금액</p>
                  <p className="text-[11px] font-black text-slate-500 px-4 py-2.5 text-right">입금금액</p>
                </div>
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-3 border-b border-slate-50">
                    <p className="text-[13px] text-slate-700 px-4 py-2.5">{it.type}</p>
                    <p className="text-[13px] font-bold text-slate-700 px-2 py-2.5 text-right">{Number(it.amount).toLocaleString()}</p>
                    <p className="text-[13px] font-bold text-indigo-600 px-4 py-2.5 text-right">{Number(it.payment).toLocaleString()}</p>
                  </div>
                ))}
                {items.length > 1 && (
                  <div className="grid grid-cols-3 bg-indigo-50">
                    <p className="text-[12px] font-black text-indigo-700 px-4 py-2.5">합계</p>
                    <p className="text-[12px] font-black text-indigo-700 px-2 py-2.5 text-right">{totalFace.toLocaleString()}</p>
                    <p className="text-[12px] font-black text-indigo-700 px-4 py-2.5 text-right">{r.totalPayment?.toLocaleString() ?? "-"}</p>
                  </div>
                )}
              </div>
            )}

            {/* 입금계좌 */}
            {(r.bankName || r.accountNumber) && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 mb-1">입금 계좌</p>
                  <p className="text-[14px] font-bold text-slate-800">
                    {r.bankName} <span className="text-slate-500 font-medium">{r.accountNumber}</span>
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">예금주: {r.accountHolder}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(r.accountNumber)}
                  className="flex-shrink-0 text-[12px] font-bold text-emerald-600 bg-white hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                >복사</button>
              </div>
            )}

            {/* 완료/상태 */}
            {isActive ? (
              <button
                onClick={markComplete}
                disabled={completing}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-[14px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 active:scale-95"
              >
                {completing ? "처리 중..." : "✅ 완료처리"}
              </button>
            ) : (
              <div className={`py-3 rounded-2xl text-[13px] font-bold text-center ${
                r.status === "completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : r.status === "no_show" ? "bg-rose-50 text-rose-500 border border-rose-100"
                : "bg-slate-50 text-slate-400 border border-slate-100"
              }`}>
                {r.status === "completed" ? "✅ 매입 완료" : r.status === "no_show" ? "🚫 노쇼 처리됨" : "취소됨"}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 하단 액션 바 ── */}
      {!loading && r && isActive && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handlePaymentRequest}
                disabled={sendingPayment}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-0.5"
                style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff" }}
              >
                <span className="text-[16px]">💰</span>
                <span>{sendingPayment ? "발송중" : "입금요청"}</span>
              </button>
              <button
                onClick={() => { setDefectModal(true); setDefectDetail(""); }}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 flex flex-col items-center gap-0.5"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
              >
                <span className="text-[16px]">⚠️</span>
                <span>일부하자</span>
              </button>
              <button
                onClick={markNoShow}
                disabled={noShowing}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-0.5"
                style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "#fff" }}
              >
                <span className="text-[16px]">🚫</span>
                <span>{noShowing ? "처리중" : "노쇼"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 채팅 창 ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* 배경 딤 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setChatOpen(false)}
          />
          {/* 채팅 창 */}
          <div
            className="relative w-full max-w-lg bg-white flex flex-col overflow-hidden shadow-2xl"
            style={{
              borderRadius: "20px 20px 0 0",
              height: "80vh",
              maxHeight: "680px",
            }}
          >
            {/* 창 타이틀 바 */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 py-4"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
            >
              <div className="flex gap-1.5">
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-3 h-3 rounded-full bg-rose-400 hover:bg-rose-500 transition-colors"
                />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[15px] truncate">
                  💬 채팅 · 예약 #{id}
                </p>
                <p className="text-indigo-200 text-[11px]">{r?.name || r?.phone} · {staffName}</p>
              </div>
              <SoundBell role="staff" />
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2l-10 10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* 메시지 영역 */}
            <div
              ref={chatBoxRef}
              className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3"
            >
              {chatMessages.length === 0 && (
                <p className="text-center text-slate-300 text-[13px] mt-16">메시지가 없습니다</p>
              )}
              {chatMessages.map((m) => {
                const isMine = m.sender === "staff";
                const isImg = m.message.startsWith("[IMG:");
                const imgUrl = isImg ? m.message.slice(5, -1) : "";
                const displayText = isImg ? "" : getTranslated(m, "ko");
                const isTranslated = !isImg && !!m.translatedText && (m.language ?? "ko") !== "ko" && displayText !== m.message;
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
                        <p className="whitespace-pre-wrap">{displayText}</p>
                      )}
                      {isTranslated && (
                        <p className={`text-[10px] mt-0.5 ${isMine ? "text-indigo-200" : "text-slate-400"} italic`}>🌐 번역됨</p>
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

            {/* 자주 쓰는 문구 */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 px-3 pt-2 pb-0">
              <div className="flex flex-wrap gap-1.5 pb-1 items-center">
                {phrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendChatMessage(phrase)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[12px] font-semibold border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition-all whitespace-nowrap"
                  >
                    {phrase}
                  </button>
                ))}
                {/* 추가 버튼 */}
                <button
                  onClick={() => setShowAddPhrase(true)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[16px] font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                  title="문구 추가"
                >
                  +
                </button>
              </div>
            </div>

            {/* 문구 추가 입력창 */}
            {showAddPhrase && (
              <div className="flex-shrink-0 bg-indigo-50 border-t border-indigo-100 px-3 py-2 flex gap-2 items-center">
                <input
                  autoFocus
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPhrase(); if (e.key === "Escape") { setShowAddPhrase(false); setNewPhrase(""); } }}
                  placeholder="추가할 문구 입력 후 저장"
                  className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-[13px] outline-none focus:border-indigo-400"
                />
                <button
                  onClick={addPhrase}
                  disabled={!newPhrase.trim() || savingPhrase}
                  className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-[12px] font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => { setShowAddPhrase(false); setNewPhrase(""); }}
                  className="px-3 py-2 rounded-xl bg-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-300 transition-colors"
                >
                  취소
                </button>
              </div>
            )}

            {/* 입력 영역 */}
            <div className="flex-shrink-0 bg-white px-4 py-3">
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
      )}

      {/* ── 입금요청 완료 토스트 ── */}
      {paymentSent && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white text-[13px] font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          ✅ 입금 요청이 채팅으로 발송되었습니다
        </div>
      )}

      {/* ── 일부하자 모달 ── */}
      {defectModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">⚠️ 일부 하자 안내</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">하자 내용을 입력하면 채팅으로 발송됩니다</p>
              </div>
              <button
                onClick={() => { setDefectModal(false); setDefectDetail(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <textarea
              value={defectDetail}
              onChange={(e) => setDefectDetail(e.target.value)}
              placeholder="예: 신세계 50,000원권 2매에 찢김 발견. 나머지 정상 처리 가능합니다."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-amber-400 resize-none placeholder:text-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDefectModal(false); setDefectDetail(""); }}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-[14px] font-bold hover:bg-slate-50"
              >취소</button>
              <button
                onClick={handleDefectSubmit}
                disabled={!defectDetail.trim() || sendingDefect}
                className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >
                {sendingDefect ? "발송 중…" : "📨 발송하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
