import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { io, Socket } from "socket.io-client";
import { getAdminToken, clearAdminToken, adminFetch } from "@/lib/adminAuth";
import { formatPhone, formatDateKo } from "@/lib/store";

interface ChatMessage {
  id: number;
  sender: string;
  senderName: string;
  message: string;
  language?: string;
  translatedText?: Record<string, string> | null;
  time: string;
}

interface SavedItem { type: string; amount: number; rate: number; payment: number; isGift: boolean; }
interface Reservation {
  id: number; kind: string; createdAt: string;
  name?: string; phone: string; date?: string; time?: string;
  location: string; items: SavedItem[]; totalPayment: number;
  bankName: string; accountNumber: string; accountHolder: string;
  status: string; assignedTo?: string | null;
}
interface StaffMember { id: number; name: string; phone: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "처리 대기",       color: "bg-amber-100 text-amber-700" },
  assigned:  { label: "매입담당자 배정", color: "bg-blue-100 text-blue-700" },
  completed: { label: "처리 완료",       color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소",           color: "bg-slate-100 text-slate-500" },
  no_show:   { label: "노쇼",           color: "bg-red-100 text-red-600" },
};

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-[12px] text-slate-400 flex-shrink-0 w-20">{label}</span>
      <span className="text-[13px] font-semibold text-slate-700 text-right">{value}</span>
    </div>
  );
}

export default function AdminDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const queryId = new URLSearchParams(window.location.search).get("id");
  const resolvedId = params.id ?? queryId ?? "";
  const [entry, setEntry] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const token = getAdminToken();

  function loadChat() {
    fetch(`/api/admin/chat/${resolvedId}`)
      .then((r) => r.json())
      .then((msgs) => {
        setChatMessages(msgs);
        setTimeout(() => {
          if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }, 50);
      })
      .catch(() => {});
  }

  function sendChat() {
    if (!chatMsg.trim() || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      reservationId: Number(resolvedId),
      sender: "admin",
      message: chatMsg,
    });
    setChatMsg("");
  }

  async function load() {
    setLoading(true);
    try {
      const [resEntry, resStaff] = await Promise.all([
        adminFetch(`/api/admin/reservations/${resolvedId}`),
        adminFetch(`/api/admin/staff`),
      ]);
      if (resEntry.status === 404) { navigate("/admin/dashboard"); return; }
      setEntry(await resEntry.json());
      if (resStaff.ok) setStaffList(await resStaff.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    loadChat();

    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRoom", Number(resolvedId));
      socket.emit("markRead", { reservationId: Number(resolvedId), readerRole: "admin" });
    });

    socket.on("newMessage", (msg: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, 50);
        return next;
      });
      if ((msg as any).sender !== "admin") {
        socket.emit("markRead", { reservationId: Number(resolvedId), readerRole: "admin" });
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  if (!token) { navigate("/admin/login"); return null; }

  async function setStatus(status: string) {
    if (!entry || saving) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/reservations/${entry.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setEntry((prev) => prev ? { ...prev, status } : prev);
        showToast("변경 완료");
      }
    } finally { setSaving(false); }
  }

  async function assign() {
    if (!entry || saving || !selectedStaffId) return;
    const staffId = parseInt(selectedStaffId);
    const member = staffList.find((s) => s.id === staffId);
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/reservations/${entry.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      const data = await res.json();
      if (data.success) {
        setEntry((prev) => prev ? { ...prev, status: "assigned", assignedTo: member?.name ?? "" } : prev);
        showToast("배정 완료");
      }
    } finally { setSaving(false); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-[14px]">
      불러오는 중...
    </div>
  );
  if (!entry) return null;

  const accent = entry.kind === "urgent";
  const st = STATUS_LABELS[entry.status] ?? { label: entry.status, color: "bg-slate-100 text-slate-500" };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-lg">✓ {toast}</div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-slate-800">예약 상세 #{entry.id}</h1>
            <p className="text-[11px] text-slate-400">{formatDate(entry.createdAt)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Detail card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl text-[14px] font-black flex items-center justify-center text-white"
                style={{ background: accent ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {entry.id}
              </div>
              <p className="text-[16px] font-bold text-slate-800 flex items-center gap-1.5">
                {entry.name ?? entry.phone}
                {accent && <span className="text-[10px] bg-rose-100 text-rose-500 font-bold px-1.5 py-0.5 rounded-full">긴급</span>}
              </p>
            </div>
            <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${st.color}`}>{st.label}</span>
          </div>

          <div className="space-y-0.5 bg-slate-50 rounded-xl px-3 py-2">
            <Row label="이름"   value={entry.name} />
            <Row label="전화번호" value={formatPhone(entry.phone ?? "")} />
            {entry.date && <Row label="날짜" value={formatDateKo(entry.date, entry.time)} />}
            <Row label="거래 장소" value={entry.location} />
            {entry.assignedTo && <Row label="매입담당자" value={entry.assignedTo} />}
          </div>
        </div>

        {/* Voucher items */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-3">상품권 내역</h2>
          <div className="space-y-2">
            {entry.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">{it.type}</p>
                  <p className="text-[11px] text-slate-400">
                    {it.amount.toLocaleString()}원 × {Math.round(it.rate * 100)}%
                    {it.isGift && <span className="ml-1 text-violet-500">(증정)</span>}
                  </p>
                </div>
                <span className="text-[14px] font-black text-indigo-600">{formatKRW(it.payment)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-[13px] font-semibold text-slate-500">합산 입금받을 금액</span>
            <span className="text-[18px] font-black text-indigo-600">{formatKRW(entry.totalPayment)}</span>
          </div>
        </div>

        {/* Bank info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-3">입금 계좌 정보</h2>
          <div className="space-y-0.5 bg-slate-50 rounded-xl px-3 py-2">
            <Row label="은행"    value={entry.bankName} />
            <Row label="계좌번호" value={entry.accountNumber} />
            <Row label="예금주"  value={entry.accountHolder} />
          </div>
        </div>

        {/* Staff select + assign */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 space-y-3">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">매입담당자 배정</h2>
          <div className="flex gap-2">
            <select
              id="staffSelect"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-white"
            >
              <option value="">매입담당자 선택</option>
              {staffList.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={assign}
              disabled={saving || !selectedStaffId}
              className="px-5 py-2.5 rounded-xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}
            >
              매입담당자 배정
            </button>
          </div>
        </div>

        {/* 채팅 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 space-y-3">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">💬 고객 채팅</h2>
          <div
            ref={chatBoxRef}
            className="bg-slate-50 rounded-xl p-3 space-y-2 overflow-auto"
            style={{ height: 280 }}
          >
            {chatMessages.length === 0 && (
              <p className="text-center text-slate-300 text-[13px] mt-10">메시지가 없습니다</p>
            )}
            {chatMessages.map((m) => {
              const isMine = m.sender === "admin";
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[13px] shadow-sm ${
                    isMine
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : m.sender === "staff"
                        ? "bg-violet-100 text-violet-800 rounded-bl-sm"
                        : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                  }`}>
                    {!isMine && <p className="text-[10px] font-bold mb-0.5 opacity-60">{m.senderName}</p>}
                    <p>{m.message}</p>
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                      {new Date(m.time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="메시지 입력"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
            />
            <button
              onClick={sendChat}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-[13px] font-bold hover:bg-indigo-600 transition-colors active:scale-95"
            >
              전송
            </button>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="pb-6 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("completed")}
              disabled={saving || entry.status === "completed" || entry.status === "cancelled" || entry.status === "no_show"}
              className="flex-1 py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
            >
              매입 완료
            </button>
            <button
              onClick={() => { if (confirm("예약을 취소하시겠습니까?")) setStatus("cancelled"); }}
              disabled={saving || entry.status === "cancelled" || entry.status === "completed" || entry.status === "no_show"}
              className="flex-1 py-3.5 rounded-2xl border border-rose-200 text-rose-500 text-[15px] font-bold transition-all active:scale-95 disabled:opacity-40 hover:bg-rose-50"
            >
              예약 취소
            </button>
          </div>
          <button
            onClick={() => { if (confirm("노쇼 처리하시겠습니까?\n3회 누적 시 해당 고객의 예약이 제한됩니다.")) setStatus("no_show"); }}
            disabled={saving || entry.status === "completed" || entry.status === "cancelled" || entry.status === "no_show"}
            className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-[14px] font-bold transition-all active:scale-95 disabled:opacity-40 hover:bg-red-50"
          >
            🚫 노쇼 처리
          </button>
        </div>
      </div>
    </div>
  );
}
