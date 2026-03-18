import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminToken, clearAdminToken } from "./AdminLogin";

interface Reservation {
  id: number;
  kind: string;
  createdAt: string;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location: string;
  totalPayment: number;
  status: string;
  assignedTo?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: "대기중",  color: "bg-amber-100 text-amber-700" },
  confirmed:   { label: "확정",    color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "진행중",  color: "bg-violet-100 text-violet-700" },
  completed:   { label: "완료",    color: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "취소",    color: "bg-slate-100 text-slate-500" },
};

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const url = dateFilter ? `/api/admin/reservations?date=${dateFilter}` : "/api/admin/reservations";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { clearAdminToken(); navigate("/admin/login"); return; }
      setEntries(await res.json());
    } catch {
      setError("데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [dateFilter]);

  const filtered = kindFilter === "all" ? entries : entries.filter((e) => e.kind === kindFilter);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">예약 관리 대시보드</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">총 {filtered.length}건</p>
          </div>
          <button onClick={() => { clearAdminToken(); navigate("/admin/login"); }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-semibold transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-50">
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-indigo-400 bg-white" />
          {dateFilter && (
            <button onClick={() => setDateFilter("")}
              className="px-3 py-2 rounded-xl bg-slate-100 text-[12px] text-slate-600 hover:bg-slate-200 font-medium">
              초기화
            </button>
          )}
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            {[["all","전체"],["reservation","예약"],["urgent","긴급"]].map(([v, l]) => (
              <button key={v} onClick={() => setKindFilter(v)}
                className={`px-3 py-2 text-[12px] font-semibold transition-colors ${kindFilter === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={load}
            className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-[12px] font-semibold hover:bg-indigo-100 transition-colors">
            새로고침
          </button>
        </div>

        {loading && (
          <div className="py-16 text-center text-slate-400 text-[14px]">불러오는 중...</div>
        )}
        {error && (
          <div className="py-8 text-center text-rose-500 text-[14px]">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-[14px]">접수 내역이 없습니다</div>
        )}

        {!loading && filtered.map((entry) => {
          const st = STATUS_LABELS[entry.status] ?? { label: entry.status, color: "bg-slate-100 text-slate-500" };
          return (
            <button key={entry.id} onClick={() => navigate(`/admin/detail/${entry.id}`)}
              className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl text-[12px] font-black flex items-center justify-center text-white flex-shrink-0`}
                    style={{ background: entry.kind === "urgent" ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {entry.id}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                      {entry.name ?? entry.phone}
                      {entry.kind === "urgent" && <span className="text-[10px] bg-rose-100 text-rose-500 font-bold px-1.5 py-0.5 rounded-full">긴급</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">{entry.name ? entry.phone : "긴급 판매"}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${st.color}`}>{st.label}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-slate-500">
                <div className="flex items-center gap-3">
                  {entry.date && <span>📅 {entry.date} {entry.time}</span>}
                  <span>📍 {entry.location}</span>
                  {entry.assignedTo && <span className="text-indigo-500">👤 {entry.assignedTo}</span>}
                </div>
                <span className="font-bold text-indigo-600">{formatKRW(entry.totalPayment)}</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">{formatDate(entry.createdAt)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
