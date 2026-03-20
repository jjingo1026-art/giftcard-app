import { useState, useEffect } from "react";
import { getAdminToken, clearAdminToken } from "./AdminLogin";

interface ReservationItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

interface Reservation {
  id: number;
  name?: string;
  phone: string;
  date?: string;
  status: string;
  totalPayment: number;
  items: ReservationItem[];
  createdAt: string;
}

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminTodayRevenue() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = getAdminToken();
  const today = getToday();

  useEffect(() => {
    if (!token) { window.location.href = "/admin/login.html"; return; }

    fetch("/api/admin/reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { clearAdminToken(); window.location.href = "/admin/login.html"; throw new Error("401"); }
        return r.json();
      })
      .then((data: Reservation[]) => {
        const todayCompleted = data
          .filter((r) => r.status === "completed" && r.date === today)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setRows(todayCompleted);
      })
      .catch((e) => { if (e.message !== "401") setError("데이터를 불러올 수 없습니다."); })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = rows.reduce((s, r) => s + r.totalPayment, 0);

  function getTypeLabel(items: ReservationItem[]) {
    if (!items || items.length === 0) return "-";
    const types = [...new Set(items.map((it) => it.type))];
    return types.join(", ");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/admin/dashboard.html"; }}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[16px] font-bold text-slate-800">오늘 매출 내역</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">{today.replace(/-/g, ".")} · 처리완료 기준</p>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-[11px] text-slate-400">{rows.length}건</p>
              <p className="text-[16px] font-black text-emerald-600">{formatKRW(totalRevenue)}</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[13px] text-rose-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-3xl mb-3">💰</p>
            <p className="text-[14px] font-semibold text-slate-500">오늘 처리 완료된 거래가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 합계 카드 */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <p className="text-[13px] font-bold text-emerald-700">오늘 총 매입금액</p>
              <p className="text-[22px] font-black text-emerald-600 tracking-tight">{formatKRW(totalRevenue)}</p>
            </div>

            {/* 테이블 헤더 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_1fr_auto] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 text-center">순번</p>
                <p className="text-[11px] font-bold text-slate-400">성명</p>
                <p className="text-[11px] font-bold text-slate-400">상품권 권종</p>
                <p className="text-[11px] font-bold text-slate-400 text-right">매입금액</p>
              </div>

              {rows.map((r, idx) => (
                <div
                  key={r.id}
                  onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                  className={`grid grid-cols-[40px_1fr_1fr_auto] gap-2 px-4 py-3.5 items-center cursor-pointer hover:bg-slate-50/80 transition-colors active:scale-[0.995]
                    ${idx < rows.length - 1 ? "border-b border-slate-50" : ""}`}
                >
                  <p className="text-[13px] font-black text-slate-400 text-center tabular-nums">{idx + 1}</p>
                  <p className="text-[14px] font-bold text-slate-800 truncate">{r.name ?? r.phone}</p>
                  <p className="text-[12px] font-medium text-slate-500 truncate">{getTypeLabel(r.items)}</p>
                  <p className="text-[14px] font-black text-emerald-600 tabular-nums whitespace-nowrap">{formatKRW(r.totalPayment)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
