import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { getAdminToken, clearAdminToken } from "./AdminLogin";

interface SavedItem { type: string; amount: number; rate: number; payment: number; isGift: boolean; }
interface Reservation {
  id: number; kind: string; createdAt: string;
  name?: string; phone: string; date?: string; time?: string;
  location: string; items: SavedItem[]; totalPayment: number;
  bankName: string; accountNumber: string; accountHolder: string;
  status: string; assignedTo?: string | null;
}

const STATUS_OPTIONS = [
  { value: "pending",     label: "대기중" },
  { value: "confirmed",   label: "확정" },
  { value: "in_progress", label: "진행중" },
  { value: "completed",   label: "완료" },
  { value: "cancelled",   label: "취소" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
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
  const [entry, setEntry] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { clearAdminToken(); navigate("/admin/login"); return; }
      if (res.status === 404) { navigate("/admin/dashboard"); return; }
      const data = await res.json();
      setEntry(data);
      setStatus(data.status);
      setAssignedTo(data.assignedTo ?? "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveStatus() {
    if (!entry || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reservations/${entry.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { const d = await res.json(); setEntry(d); showToast("상태가 변경되었습니다."); }
    } finally { setSaving(false); }
  }

  async function saveAssign() {
    if (!entry || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reservations/${entry.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignedTo }),
      });
      if (res.ok) { const d = await res.json(); setEntry(d); showToast("직원이 배정되었습니다."); }
    } finally { setSaving(false); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-[14px]">
      불러오는 중...
    </div>
  );
  if (!entry) return null;

  const accent = entry.kind === "urgent";
  const stColor = STATUS_COLORS[entry.status] ?? "bg-slate-100 text-slate-500";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-lg">✓ {toast}</div>
      </div>

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-slate-800">예약 상세 #{entry.id}</h1>
            <p className="text-[11px] text-slate-400">{formatDate(entry.createdAt)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl text-[14px] font-black flex items-center justify-center text-white"
                style={{ background: accent ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {entry.id}
              </div>
              <div>
                <p className="text-[16px] font-bold text-slate-800 flex items-center gap-1.5">
                  {entry.name ?? entry.phone}
                  {accent && <span className="text-[10px] bg-rose-100 text-rose-500 font-bold px-1.5 py-0.5 rounded-full">긴급</span>}
                </p>
                <p className="text-[12px] text-slate-400">{entry.name ? entry.phone : "긴급 판매"}</p>
              </div>
            </div>
            <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${stColor}`}>
              {STATUS_OPTIONS.find(s => s.value === entry.status)?.label ?? entry.status}
            </span>
          </div>

          <div className="space-y-0.5 bg-slate-50 rounded-xl px-3 py-2">
            <Row label="거래 장소" value={entry.location} />
            {entry.date && <Row label="예약 날짜" value={`${entry.date} ${entry.time ?? ""}`} />}
            <Row label="담당 직원" value={entry.assignedTo} />
          </div>
        </div>

        {/* Items */}
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
            <Row label="은행" value={entry.bankName} />
            <Row label="계좌번호" value={entry.accountNumber} />
            <Row label="예금주" value={entry.accountHolder} />
          </div>
        </div>

        {/* Status change */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 space-y-3">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">상태 변경</h2>
          <div className="flex gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-white">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button onClick={saveStatus} disabled={saving || status === entry.status}
              className="px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              저장
            </button>
          </div>
        </div>

        {/* Assign staff */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 space-y-3">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">직원 배정</h2>
          <div className="flex gap-2">
            <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="담당 직원 이름"
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-white placeholder:text-slate-300" />
            <button onClick={saveAssign} disabled={saving}
              className="px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              배정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
