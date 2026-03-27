import { useState, useEffect, useCallback } from "react";
import { getAdminToken, adminFetch } from "@/lib/adminAuth";

interface ReservationItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
}

interface Reservation {
  id: number;
  name?: string;
  phone: string;
  createdAt: string;
  status: string;
  totalPayment: number;
  items: ReservationItem[];
}

interface DayGroup {
  date: string;
  count: number;
  total: number;
  rows: Reservation[];
}

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function getToday() {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  return now.toISOString().slice(0, 10);
}

function formatDateKo(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr + "T00:00:00").getDay()];
  return `${m}월 ${d}일 (${dow})`;
}

function getKSTDate(iso: string) {
  const d = new Date(iso);
  d.setHours(d.getHours() + 9);
  return d.toISOString().slice(0, 10);
}

function getTypeLabel(items: ReservationItem[]) {
  if (!items || items.length === 0) return "-";
  return [...new Set(items.map((it) => it.type))].join(", ");
}

export default function AdminMobileRevenue() {
  const today = getToday();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [allData, setAllData] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const token = getAdminToken();

  useEffect(() => {
    if (!token) { window.location.href = "/admin/login.html"; return; }
    adminFetch("/api/admin/reservations?kind=mobile&limit=1000")
      .then((r) => r.json())
      .then((data: Reservation[]) => setAllData(Array.isArray(data) ? data : []))
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  const buildGroups = useCallback((): DayGroup[] => {
    const filtered = allData.filter((r) => {
      if (r.status !== "completed") return false;
      const d = getKSTDate(r.createdAt);
      return d >= startDate && d <= endDate;
    });
    const map: Record<string, Reservation[]> = {};
    filtered.forEach((r) => {
      const d = getKSTDate(r.createdAt);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return Object.keys(map)
      .sort()
      .map((date) => ({
        date,
        count: map[date].length,
        total: map[date].reduce((s, r) => s + r.totalPayment, 0),
        rows: map[date].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }));
  }, [allData, startDate, endDate]);

  const groups = buildGroups();
  const totalRevenue = groups.reduce((s, g) => s + g.total, 0);
  const totalCount = groups.reduce((s, g) => s + g.count, 0);

  function setPreset(preset: "today" | "week" | "month" | "last30") {
    const t = new Date();
    t.setHours(t.getHours() + 9);
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
      first.setHours(first.getHours() + 9);
      setStartDate(fmt(first)); setEndDate(today);
    } else if (preset === "last30") {
      const d30 = new Date(t);
      d30.setDate(t.getDate() - 29);
      setStartDate(fmt(d30)); setEndDate(today);
    }
    setExpandedDate(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-violet-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/admin/mobile"; }}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[16px] font-bold text-slate-800">📱 모바일 매출 조회</h1>
            <p className="text-[11px] text-violet-400 mt-0.5">처리완료 기준 · KST</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-16 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 space-y-3">
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
                className="px-3 py-1.5 rounded-xl text-[12px] font-bold border bg-slate-50 border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">시작일</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => { setStartDate(e.target.value); setExpandedDate(null); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-violet-300 focus:bg-white transition-all"
              />
            </div>
            <span className="text-slate-300 font-bold text-[14px] mt-4">~</span>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1">종료일</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => { setEndDate(e.target.value); setExpandedDate(null); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-violet-300 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[13px] text-rose-500">{error}</div>
        ) : (
          <>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-violet-700">기간 총 매입금액</p>
                <p className="text-[11px] text-violet-400 mt-0.5">
                  {startDate === endDate ? formatDateKo(startDate) : `${formatDateKo(startDate)} ~ ${formatDateKo(endDate)}`}
                </p>
                <p className="text-[11px] text-violet-400">{totalCount}건 처리완료</p>
              </div>
              <p className="text-[24px] font-black text-violet-600 tracking-tight">{formatKRW(totalRevenue)}</p>
            </div>

            {groups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-12 text-center">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-[14px] font-semibold text-slate-400">해당 기간에 매출이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => {
                  const isExpanded = expandedDate === g.date;
                  return (
                    <div key={g.date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div
                        onClick={() => setExpandedDate(isExpanded ? null : g.date)}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                          <div>
                            <p className="text-[14px] font-bold text-slate-700">{formatDateKo(g.date)}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{g.count}건</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[16px] font-black text-violet-600 tabular-nums">{formatKRW(g.total)}</p>
                          <span
                            className="text-slate-300 text-[14px] transition-transform duration-200 inline-block"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                          >›</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-50">
                          <div className="grid grid-cols-[36px_1fr_1fr_auto] gap-2 px-4 py-2 bg-slate-50/60">
                            <p className="text-[10px] font-bold text-slate-400 text-center">순번</p>
                            <p className="text-[10px] font-bold text-slate-400">성명</p>
                            <p className="text-[10px] font-bold text-slate-400">권종</p>
                            <p className="text-[10px] font-bold text-slate-400 text-right">매입금액</p>
                          </div>
                          {g.rows.map((r, idx) => (
                            <div
                              key={r.id}
                              onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/detail.html?id=${r.id}`; }}
                              className={`grid grid-cols-[36px_1fr_1fr_auto] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors
                                ${idx < g.rows.length - 1 ? "border-b border-slate-50" : ""}`}
                            >
                              <p className="text-[12px] font-black text-slate-300 text-center tabular-nums">{idx + 1}</p>
                              <p className="text-[13px] font-bold text-slate-700 truncate">{r.name ?? r.phone}</p>
                              <p className="text-[11px] text-slate-400 truncate">{getTypeLabel(r.items)}</p>
                              <p className="text-[13px] font-black text-violet-600 tabular-nums whitespace-nowrap">{formatKRW(r.totalPayment)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
