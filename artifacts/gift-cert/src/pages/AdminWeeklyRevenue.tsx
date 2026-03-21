import { useState, useEffect } from "react";
import { getAdminToken, clearAdminToken, adminFetch } from "./AdminLogin";

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

interface DayGroup {
  date: string;
  count: number;
  total: number;
  rows: Reservation[];
}

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function getWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday), today: fmt(today) };
}

function formatDateKo(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr).getDay()];
  return `${m}월 ${d}일 (${dow})`;
}

export default function AdminWeeklyRevenue() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const token = getAdminToken();
  const { start, end, today } = getWeekRange();

  useEffect(() => {
    if (!token) { window.location.href = "/admin/login.html"; return; }

    adminFetch("/api/admin/reservations")
      .then((r) => r.json())
      .then((data: Reservation[]) => {
        const weekly = data.filter(
          (r) => r.status === "completed" && r.date && r.date >= start && r.date <= end
        );

        const map: Record<string, Reservation[]> = {};
        weekly.forEach((r) => {
          const d = r.date!;
          if (!map[d]) map[d] = [];
          map[d].push(r);
        });

        const result: DayGroup[] = Object.keys(map)
          .sort()
          .map((date) => ({
            date,
            count: map[date].length,
            total: map[date].reduce((s, r) => s + r.totalPayment, 0),
            rows: map[date].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          }));

        setGroups(result);
      })
      .catch((e) => { if (e.message !== "401") setError("데이터를 불러올 수 없습니다."); })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = groups.reduce((s, g) => s + g.total, 0);
  const totalCount = groups.reduce((s, g) => s + g.count, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

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
            <h1 className="text-[16px] font-bold text-slate-800">이번주 매출 내역</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formatDateKo(start).replace(" (월)", "")} ~ {formatDateKo(end).replace(" (일)", "")} · 처리완료 기준
            </p>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-[11px] text-slate-400">{totalCount}건</p>
              <p className="text-[16px] font-black text-indigo-600">{formatKRW(totalRevenue)}</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-16 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[13px] text-rose-500">{error}</div>
        ) : (
          <>
            {/* 주간 합계 카드 */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-indigo-600">이번주 총 매입금액</p>
                <p className="text-[11px] text-indigo-400 mt-0.5">{totalCount}건 처리완료</p>
              </div>
              <p className="text-[22px] font-black text-indigo-600 tracking-tight">{formatKRW(totalRevenue)}</p>
            </div>

            {/* 날짜별 목록 */}
            <div className="space-y-2">
              {weekDays.map((date) => {
                const group = groups.find((g) => g.date === date);
                const isToday = date === today;
                const isFuture = date > today;
                const isExpanded = expandedDate === date;

                return (
                  <div
                    key={date}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                      ${isToday ? "border-indigo-200" : "border-slate-100"}`}
                  >
                    <div
                      onClick={() => group && setExpandedDate(isExpanded ? null : date)}
                      className={`flex items-center justify-between px-4 py-3.5
                        ${group ? "cursor-pointer hover:bg-slate-50/60 transition-colors" : ""}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0
                          ${isToday ? "bg-indigo-500" : group ? "bg-emerald-400" : isFuture ? "bg-slate-200" : "bg-slate-200"}`}
                        />
                        <div>
                          <p className={`text-[14px] font-bold ${isToday ? "text-indigo-700" : "text-slate-700"}`}>
                            {formatDateKo(date)}
                            {isToday && <span className="ml-1.5 text-[10px] font-bold bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full">오늘</span>}
                          </p>
                          {group ? (
                            <p className="text-[11px] text-slate-400 mt-0.5">{group.count}건</p>
                          ) : (
                            <p className="text-[11px] text-slate-300 mt-0.5">{isFuture ? "예정" : "매출 없음"}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-[16px] font-black tabular-nums ${group ? "text-emerald-600" : "text-slate-200"}`}>
                          {group ? formatKRW(group.total) : "-"}
                        </p>
                        {group && (
                          <span className="text-slate-300 text-[14px] transition-transform duration-200" style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                        )}
                      </div>
                    </div>

                    {/* 펼쳐진 상세 목록 */}
                    {group && isExpanded && (
                      <div className="border-t border-slate-50">
                        <div className="grid grid-cols-[36px_1fr_auto] gap-2 px-4 py-2 bg-slate-50/60">
                          <p className="text-[10px] font-bold text-slate-400 text-center">순번</p>
                          <p className="text-[10px] font-bold text-slate-400">성명</p>
                          <p className="text-[10px] font-bold text-slate-400 text-right">매입금액</p>
                        </div>
                        {group.rows.map((r, idx) => (
                          <div
                            key={r.id}
                            onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/detail.html?id=${r.id}`; }}
                            className={`grid grid-cols-[36px_1fr_auto] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors
                              ${idx < group.rows.length - 1 ? "border-b border-slate-50" : ""}`}
                          >
                            <p className="text-[12px] font-black text-slate-300 text-center tabular-nums">{idx + 1}</p>
                            <p className="text-[13px] font-bold text-slate-700 truncate">{r.name ?? r.phone}</p>
                            <p className="text-[13px] font-black text-emerald-600 tabular-nums">{formatKRW(r.totalPayment)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
