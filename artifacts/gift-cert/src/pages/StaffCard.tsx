import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useImageUpload } from "@/hooks/useImageUpload";

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
  const [infoOpen, setInfoOpen] = useState(false);

  /* 채팅 상태 */
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  /* 이미지 업로드 — Socket.IO로 전송 */
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

    /* 예약 로드 */
    fetch("/api/admin/staff/my-reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { localStorage.clear(); window.location.href = "/staff/login"; }
        return res.json();
      })
      .then((data: Reservation[]) => {
        const found = Array.isArray(data) ? data.find((x) => String(x.id) === id) : null;
        setR(found ?? null);
      })
      .finally(() => setLoading(false));

    /* 채팅 초기 로드 */
    fetch(`/api/admin/chat/${id}`)
      .then((r) => r.json())
      .then((data) => { setChatMessages(data); scrollToBottom(); })
      .catch(() => {});

    /* Socket.IO 연결 */
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(id));
      socket.emit("markRead", { reservationId: Number(id), readerRole: "staff" });
    });

    socket.on("newMessage", (newMsg: Message) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg];
        scrollToBottom();
        if (newMsg.sender !== "staff") {
          socket.emit("markRead", { reservationId: Number(id), readerRole: "staff" });
        }
        return next;
      });
    });

    socket.on("messagesRead", ({ readerRole }: { readerRole: string }) => {
      if (readerRole !== "staff") {
        setChatMessages((prev) =>
          prev.map((m) => m.sender === "staff" ? { ...m, read: true } : m)
        );
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => { scrollToBottom(); }, [chatMessages]);

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
      await fetch(`/api/admin/reservations/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setR((prev) => prev ? { ...prev, status: "completed" } : prev);
    } finally {
      setCompleting(false);
    }
  }

  async function markNoShow() {
    if (!r || !confirm("노쇼 처리하시겠습니까?")) return;
    setNoShowing(true);
    try {
      await fetch(`/api/admin/reservations/${id}/status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no_show" }),
      });
      setR((prev) => prev ? { ...prev, status: "no_show" } : prev);
    } finally {
      setNoShowing(false);
    }
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
      const message =
        `매입담당자 ${staffName}\n` +
        `💰 입금 요청 — ${name}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏦 은행: ${bank}\n` +
        `📋 계좌번호: ${account}\n` +
        `👤 예금주: ${holder}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 입금 금액: ${amount}원\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `판매자 계좌로 위 금액을 입금해 주세요.`;
      await sendChatMessage(message);
      setPaymentSent(true);
      setTimeout(() => setPaymentSent(false), 3000);
    } finally {
      setSendingPayment(false);
    }
  }

  async function handleDefectSubmit() {
    if (!defectDetail.trim()) return;
    setSendingDefect(true);
    try {
      await sendChatMessage(`⚠️ 일부 하자 안내\n${defectDetail.trim()}\n\n처리 방법에 대해 아래 채팅으로 협의 부탁드립니다.`);
      setDefectModal(false);
      setDefectDetail("");
    } finally {
      setSendingDefect(false);
    }
  }

  const isActive = r ? !["completed", "cancelled", "no_show"].includes(r.status) : false;
  const items: { type: string; amount: number; payment: number }[] =
    r && Array.isArray(r.items) && r.items.length > 0
      ? r.items
      : r?.giftcardType
        ? [{ type: r.giftcardType, amount: Number(r.amount ?? 0), payment: r.totalPayment }]
        : [];

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* 숨김 파일 input */}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={onImgChange} />

      {/* ── 헤더 ── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-100 shadow-sm z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/staff/dashboard"; }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            {loading ? (
              <p className="text-[15px] font-bold text-slate-800">예약 상세카드</p>
            ) : r ? (
              <>
                <p className="text-[15px] font-bold text-slate-800 truncate">
                  {r.isUrgent && <span className="text-rose-500 mr-1">⚡</span>}
                  {r.name || r.phone}
                  {(() => {
                    const sl = STATUS_LABEL[r.status] ?? { text: r.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
                    return <span className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full border ${sl.cls}`}>{sl.text}</span>;
                  })()}
                </p>
                <p className="text-[11px] text-slate-400">#{r.id} · {formatPhone(r.phone)}</p>
              </>
            ) : (
              <p className="text-[15px] font-bold text-slate-800">예약 정보 없음</p>
            )}
          </div>
          {/* 정보 토글 */}
          {r && (
            <button
              onClick={() => setInfoOpen((v) => !v)}
              className={`flex-shrink-0 flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-xl transition-colors ${
                infoOpen ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {infoOpen ? "접기 ▲" : "상세 ▼"}
            </button>
          )}
        </div>
      </header>

      {/* ── 예약 상세 정보 (접기/펼치기) ── */}
      {!loading && r && infoOpen && (
        <div className="flex-shrink-0 bg-white border-b border-slate-100 overflow-y-auto max-h-[45vh]">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
            {/* 긴급 배너 */}
            {r.isUrgent && (
              <div className="bg-rose-500 text-white text-[12px] font-black text-center py-2 rounded-xl tracking-wide">
                ⚡ 긴급 매입 요청
              </div>
            )}

            {/* 일시 / 장소 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">일시</p>
                <p className="text-[13px] font-bold text-slate-700">{formatDateFull(r.date, r.time)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">거래장소</p>
                <p className="text-[13px] font-bold text-slate-700">{r.location || "-"}</p>
              </div>
            </div>

            {/* 상품권 테이블 */}
            {items.length > 0 && (
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 px-3 py-2">권종</p>
                  <p className="text-[10px] font-black text-slate-500 px-2 py-2 text-right">액면</p>
                  <p className="text-[10px] font-black text-slate-500 px-3 py-2 text-right">입금</p>
                </div>
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-3 border-b border-slate-50 last:border-0">
                    <p className="text-[12px] text-slate-700 px-3 py-2">{it.type}</p>
                    <p className="text-[12px] font-bold text-slate-700 px-2 py-2 text-right">{Number(it.amount).toLocaleString()}</p>
                    <p className="text-[12px] font-bold text-indigo-600 px-3 py-2 text-right">{Number(it.payment).toLocaleString()}</p>
                  </div>
                ))}
                {items.length > 1 && (
                  <div className="grid grid-cols-3 bg-indigo-50">
                    <p className="text-[11px] font-black text-indigo-700 px-3 py-2">합계</p>
                    <p className="text-[11px] font-black text-indigo-700 px-2 py-2 text-right">{items.reduce((s, it) => s + Number(it.amount), 0).toLocaleString()}</p>
                    <p className="text-[11px] font-black text-indigo-700 px-3 py-2 text-right">{r.totalPayment?.toLocaleString() ?? "-"}</p>
                  </div>
                )}
              </div>
            )}

            {/* 입금계좌 */}
            {(r.bankName || r.accountNumber) && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 mb-0.5">입금 계좌</p>
                  <p className="text-[13px] font-bold text-slate-800">
                    {r.bankName} <span className="text-slate-500 font-medium">{r.accountNumber}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">예금주: {r.accountHolder}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(r.accountNumber)}
                  className="flex-shrink-0 text-[12px] font-bold text-emerald-600 bg-white hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                >복사</button>
              </div>
            )}

            {/* 완료/상태 버튼 */}
            {isActive ? (
              <button
                onClick={markComplete}
                disabled={completing}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white text-[14px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 active:scale-95"
              >
                {completing ? "처리 중..." : "✅ 완료처리"}
              </button>
            ) : (
              <div className={`py-2.5 rounded-xl text-[13px] font-bold text-center ${
                r.status === "completed"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : r.status === "no_show"
                    ? "bg-rose-50 text-rose-500 border border-rose-100"
                    : "bg-slate-50 text-slate-400 border border-slate-100"
              }`}>
                {r.status === "completed" ? "✅ 매입 완료" : r.status === "no_show" ? "🚫 노쇼 처리됨" : "취소됨"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 로딩 / 없음 ── */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
        </div>
      )}
      {!loading && !r && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[14px] text-slate-400">예약 정보를 찾을 수 없습니다.</p>
          <button onClick={() => { window.location.href = "/staff/dashboard"; }} className="mt-4 text-[13px] text-indigo-500 font-bold">
            ← 목록으로
          </button>
        </div>
      )}

      {/* ── 채팅 메시지 영역 ── */}
      {!loading && r && (
        <>
          {/* 채팅 헤더 */}
          <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
            <span className="text-slate-400 text-[15px]">💬</span>
            <p className="text-[14px] font-bold text-slate-700 flex-1">채팅 · 예약 #{id}</p>
            <p className="text-[11px] text-slate-400">{staffName}</p>
          </div>

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
                      <img
                        src={imgUrl}
                        alt="이미지"
                        className="max-w-[220px] max-h-[280px] rounded-2xl object-cover cursor-pointer"
                        onClick={() => window.open(imgUrl, "_blank")}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.message}</p>
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
                    <span className="text-[10px] text-slate-400 mt-0.5 mr-1">
                      {m.read ? "읽음" : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── 채팅 입력 ── */}
          <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3">
            <div className="max-w-2xl mx-auto flex gap-2">
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
                onClick={sendMsg}
                className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors active:scale-95 flex-shrink-0"
              >
                전송
              </button>
            </div>
          </div>

          {/* ── 하단 액션 바 ── */}
          {isActive && (
            <div className="flex-shrink-0 bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
              <div className="max-w-2xl mx-auto px-4 py-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handlePaymentRequest}
                    disabled={sendingPayment}
                    className="py-3 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-0.5"
                    style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff" }}
                  >
                    <span className="text-[15px]">💰</span>
                    <span>{sendingPayment ? "발송중" : "입금요청"}</span>
                  </button>
                  <button
                    onClick={() => { setDefectModal(true); setDefectDetail(""); }}
                    className="py-3 rounded-xl text-[12px] font-bold transition-all active:scale-95 flex flex-col items-center gap-0.5"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
                  >
                    <span className="text-[15px]">⚠️</span>
                    <span>일부하자</span>
                  </button>
                  <button
                    onClick={markNoShow}
                    disabled={noShowing}
                    className="py-3 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-0.5"
                    style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "#fff" }}
                  >
                    <span className="text-[15px]">🚫</span>
                    <span>{noShowing ? "처리중" : "노쇼"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 입금요청 완료 토스트 ── */}
      {paymentSent && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-[13px] font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          ✅ 입금 요청이 채팅으로 발송되었습니다
        </div>
      )}

      {/* ── 일부하자 모달 ── */}
      {defectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
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
