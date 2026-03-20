import { useState, useEffect, useCallback } from "react";
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
  time?: string;
  location?: string;
  status: string;
  totalPayment: number;
  items: ReservationItem[];
  createdAt: string;
  isUrgent?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending:   "대기중",
  assigned:  "배정됨",
  completed: "처리완료",
  cancelled: "취소",
  no_show:   "노쇼",
};

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-600 border-amber-100",
  assigned:  "bg-blue-50 text-blue-600 border-blue-100",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
  cancelled: "bg-rose-50 text-rose-400 border-rose-100",
  no_show:   "bg-slate-50 text-slate-400 border-slate-100",
};

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateKo(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr).getDay()];
  return `${m}월 ${d}일 (${dow})`;
}

function getTypeLabel(items: ReservationItem[]) {
  if (!items || items.length === 0) return "-";
  return [...new Set(items.map((it) => it.type))].join(", ");
}

const ALL_STATUSES = ["pending", "assigned", "completed", "cancelled", "no_show"];

export default function AdminAllReservations() {
  const today = getToday();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [allData, setAllData] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(ALL_STATUSES);

  const token = getAdminToken();

  useEffect(() => {
    if (!token) { window.location.href = "/admin/login.html"; return; }
    fetch("/api/admin/reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { clearAdminToken(); window.location.href = "/admin/login.html"; throw new Error("401"); }
        return r.json();
      })
      .then((data: Reservation[]) => setAllData(data))
      .catch((e) => { if (e.message !== "401") setError("데이터를 불러올 수 없습니다."); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useCallback((): Reservation[] => {
    return allData
      .filter((r) => {
        const dateStr = r.date ?? r.createdAt?.slice(0, 10);
        return dateStr && dateStr >= startDate && dateStr <= endDate && selectedStatuses.includes(r.status);
      })
      .sort((a, b) => {
        const da = a.date ?? a.createdAt?.slice(0, 10) ?? "";
        const db = b.date ?? b.createdAt?.slice(0, 10) ?? "";
        return da !== db ? da.localeCompare(db) : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [allData, startDate, endDate, selectedStatuses]);

  const rows = filtered();
  const totalPayment = rows
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + r.totalPayment, 0);

  function setPreset(preset: "today" | "week" | "month" | "last30") {
    const t = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "today") {
      setStartDate(today); setEndDate(today);
    } else if (preset === "week") {
      const dow = t.getDay();
      const mon = new Date(t);
      mon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
      setStartDate(fmt(mon)); setEndDate(today);
    } else if (preset === "month") {
      const first = new Date(t.getFullYear(), t.getMonth(), 1);
      setStartDate(fmt(first)); setEndDate(today);
    } else if (preset === "last30") {
      const d30 = new Date(t);
      d30.setDate(t.getDate() - 29);
      setStartDate(fmt(d30)); setEndDate(today);
    }
  }

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
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
            <h1 className="text-[16px] font-bold text-slate-800">전체 예약 조회</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">모든 상태 포함</p>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-[11px] text-slate-400">{rows.length}건</p>
              {totalPayment > 0 && (
                <p className="text-[13px] font-black text-emerald-600">{formatKRW(totalPayment)}</p>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-16 space-y-3">
        {/* 기간 선택 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 space-y-3">
          {/* 빠른 선택 */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "today",  label: "오늘" },
              { key: "week",   label: "이번주" },
              { key: "month",  label: "이번달" },
              { key: "last30", label: "최근 30일" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-bold border bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>

          {/* 날짜 직접 선택 */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">시작일</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              />
            </div>
            <span className="text-slate-300 font-bold text-[14px] mt-4">~</span>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">종료일</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 상태 필터 */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-1.5 ml-1">상태 필터</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_STATUSES.map((s) => {
                const on = selectedStatuses.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95
                      ${on ? STATUS_COLOR[s] : "bg-white text-slate-300 border-slate-100"}`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[13px] text-rose-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-[14px] font-semibold text-slate-400">해당 기간에 예약이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* 헤더 */}
            <div className="grid grid-cols-[28px_1fr_auto_auto] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 text-center">#</p>
              <p className="text-[10px] font-bold text-slate-400">성명 / 날짜</p>
              <p className="text-[10px] font-bold text-slate-400 text-center">상태</p>
              <p className="text-[10px] font-bold text-slate-400 text-right">금액</p>
            </div>

            {rows.map((r, idx) => {
              const dateStr = r.date ?? r.createdAt?.slice(0, 10);
              const isCancelled = r.status === "cancelled";
              return (
                <div
                  key={r.id}
                  onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                  className={`grid grid-cols-[28px_1fr_auto_auto] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-slate-50/70 transition-colors active:scale-[0.995]
                    ${idx < rows.length - 1 ? "border-b border-slate-50" : ""}`}
                >
                  <p className="text-[11px] font-black text-slate-300 text-center tabular-nums">{idx + 1}</p>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {r.isUrgent && <span className="text-[9px] font-black bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full flex-shrink-0">긴급</span>}
                      <p className={`text-[13px] font-bold truncate ${isCancelled ? "text-slate-300 line-through" : "text-slate-800"}`}>
                        {r.name ?? r.phone}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {dateStr ? formatDateKo(dateStr) : "-"}
                      {r.time ? ` · ${r.time}` : ""}
                    </p>
                    <p className="text-[10px] text-slate-300 truncate">{getTypeLabel(r.items)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${STATUS_COLOR[r.status] ?? "bg-slate-50 text-slate-400 border-slate-100"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <p className={`text-[13px] font-black tabular-nums whitespace-nowrap text-right ${isCancelled ? "text-slate-200 line-through" : "text-emerald-600"}`}>
                    {formatKRW(r.totalPayment)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
