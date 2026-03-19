import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getAdminToken, clearAdminToken } from "./AdminLogin";
import { formatDateKo } from "@/lib/store";

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
  pending:   { label: "처리 대기", color: "bg-amber-100 text-amber-700" },
  assigned:  { label: "매입담당자 배정", color: "bg-blue-100 text-blue-700" },
  completed: { label: "처리 완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소",     color: "bg-slate-100 text-slate-500" },
};

const statusText: Record<string, string> = {
  pending:   "🟡 처리 대기",
  assigned:  "🟠 배정",
  completed: "🟢 처리 완료",
  cancelled: "🔴 취소",
};

interface StaffSummary { id: number; name: string; assigned: number; completed: number; }

interface DashboardStats {
  todayRevenue: number;
  weeklyRevenue: number;
  totalReservations: number;
  completedRate: number;
}

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [dateFilter, setDateFilter] = useState("");
  const [allEntries, setAllEntries] = useState<Reservation[]>([]);
  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffSummary, setStaffSummary] = useState<StaffSummary[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [unassigned, setUnassigned] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Record<number, number>>({});
  const [assigning, setAssigning] = useState<number | null>(null);
  const [showUnassignedSlots, setShowUnassignedSlots] = useState(false);
  const [calendarData, setCalendarData] = useState<{ date: string; total: number; unassigned: number; assigned: number }[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ time: string | null; count: number }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [slotDetail, setSlotDetail] = useState<Reservation[]>([]);
  const [slotDetailLoading, setSlotDetailLoading] = useState(false);

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    setLoading(true);
    fetch("/api/admin/reservations", { headers })
      .then((r) => { if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); } return r.json(); })
      .then((data) => { setAllEntries(data); setEntries(data); })
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));

    fetch("/api/admin/staff-summary", { headers })
      .then((r) => r.json())
      .then(setStaffSummary)
      .catch(() => {});

    fetch("/api/admin/dashboard", { headers })
      .then((r) => r.json())
      .then((data) => setDashboardStats(data))
      .catch(() => {});

    fetch("/api/admin/reservations/unassigned", { headers })
      .then((r) => r.json())
      .then(setUnassigned)
      .catch(() => {});

    fetch("/api/admin/staff", { headers })
      .then((r) => r.json())
      .then((data: any[]) => setStaffList(data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {});

    fetch("/api/admin/reservations/calendar", { headers })
      .then((r) => r.json())
      .then(setCalendarData)
      .catch(() => {});
  }, []);

  async function assignStaff(reservationId: number) {
    const staffId = selectedStaff[reservationId];
    if (!staffId) return;
    setAssigning(reservationId);
    try {
      await fetch(`/api/admin/reservations/${reservationId}/assign`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      setUnassigned((prev) => prev.filter((r) => r.id !== reservationId));
      setAllEntries((prev) => prev.map((r) =>
        r.id === reservationId
          ? { ...r, status: "assigned", assignedTo: staffList.find((s) => s.id === staffId)?.name }
          : r
      ));
    } finally {
      setAssigning(null);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const stats = {
    total:     allEntries.length,
    today:     allEntries.filter((r) => r.date === today).length,
    assigned:  allEntries.filter((r) => r.status === "assigned").length,
    completed: allEntries.filter((r) => r.status === "completed").length,
    cancelled: allEntries.filter((r) => r.status === "cancelled").length,
  };

  // 캘린더 이벤트 — 서버 집계 우선, 없으면 allEntries로 fallback
  const calendarEvents = calendarData.length > 0
    ? calendarData.map((d) => ({
        title: d.unassigned > 0 ? `총 ${d.total}건 / 미배정 ${d.unassigned}` : `${d.total}건`,
        start: d.date!,
        color: d.unassigned > 0 ? "#ef4444" : "#6366f1",
      }))
    : (() => {
        const countByDate = allEntries.reduce<Record<string, number>>((acc, r) => {
          if (r.date) acc[r.date] = (acc[r.date] ?? 0) + 1;
          return acc;
        }, {});
        return Object.keys(countByDate).map((date) => ({
          title: countByDate[date] + "건",
          start: date,
          color: countByDate[date] > 5 ? "#ef4444" : "#6366f1",
        }));
      })();

  async function filter(date = dateFilter) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reservations?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { clearAdminToken(); navigate("/admin/login"); return; }
      setEntries(await res.json());
    } catch {
      setError("데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleDateClick(info: { dateStr: string }) {
    setDateFilter(info.dateStr);
    setShowUnassignedSlots(false);
    setTimeSlots([]);
    setExpandedSlot(null);
    setSlotDetail([]);
    filter(info.dateStr);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">관리자 대시보드</h1>
            {allEntries.length > 0 && <p className="text-[11px] text-slate-400 mt-0.5">총 {allEntries.length}건</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { location.href = "/admin/staff/view.html"; }}
              className="text-[12px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors px-3 py-1.5 rounded-xl hover:bg-indigo-50"
            >
              👨‍🔧 담당자별
            </button>
            <button
              onClick={() => { clearAdminToken(); navigate("/admin/login"); }}
              className="text-[12px] text-slate-400 hover:text-rose-500 font-semibold transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* 매출 요약 */}
        {dashboardStats && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "오늘 매출",  value: formatKRW(Number(dashboardStats.todayRevenue)),   color: "text-emerald-600",  bg: "bg-emerald-50",  icon: "💰" },
              { label: "이번주 매출", value: formatKRW(Number(dashboardStats.weeklyRevenue)), color: "text-indigo-600",  bg: "bg-indigo-50",   icon: "📈" },
              { label: "예약 수",    value: `${Number(dashboardStats.totalReservations)}건`,  color: "text-slate-700",   bg: "bg-slate-50",    icon: "📋" },
              { label: "완료율",     value: `${dashboardStats.completedRate}%`,               color: "text-blue-600",   bg: "bg-blue-50",     icon: "✅" },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className={`${bg} rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5`}>
                <p className="text-[11px] text-slate-500 font-medium">{icon} {label}</p>
                <p className={`text-[20px] font-black mt-0.5 ${color} tracking-tight`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "전체 예약",      id: "total",     value: stats.total,     color: "text-slate-700" },
            { label: "오늘 예약",      id: "today",     value: stats.today,     color: "text-indigo-600" },
            { label: "담당자 배정",    id: "assigned",  value: stats.assigned,  color: "text-blue-600" },
            { label: "처리 완료",      id: "completed", value: stats.completed, color: "text-emerald-600" },
            { label: "취소",           id: "cancelled", value: stats.cancelled, color: "text-slate-400" },
          ].map(({ label, id, value, color }) => (
            <div key={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <p className="text-[11px] text-slate-400 font-medium">{label}</p>
              <p id={id} className={`text-[24px] font-black mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 미배정 예약 */}
        {unassigned.length > 0 && (
          <>
            <h2 className="text-[15px] font-bold text-slate-700 flex items-center gap-1.5">
              🔴 미배정 예약
              <span className="text-[12px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">{unassigned.length}건</span>
            </h2>
            <div className="space-y-2">
              {unassigned.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-rose-100 shadow-sm px-4 py-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      onClick={() => { location.href = `/admin/detail.html?id=${r.id}`; }}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <p className="text-[14px] font-bold text-slate-800 truncate">
                        👤 {r.name ?? r.phone}
                      </p>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        {formatDateKo(r.date)} {r.time && `· ${r.time}`} · {formatKRW(r.totalPayment)}
                      </p>
                    </div>
                    <span className="text-[11px] bg-amber-50 text-amber-600 font-bold px-2.5 py-1 rounded-full whitespace-nowrap">🟡 처리 대기</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStaff[r.id] ?? ""}
                      onChange={(e) => setSelectedStaff((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))}
                      className="flex-1 text-[13px] border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="">담당자 선택</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedStaff[r.id] || assigning === r.id}
                      onClick={() => assignStaff(r.id)}
                      className="text-[13px] font-bold px-4 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap active:scale-95"
                    >
                      {assigning === r.id ? "배정 중…" : "담당자 지정"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 매입담당자 현황 */}
        {staffSummary.length > 0 && (
          <>
            <h2 className="text-[15px] font-bold text-slate-700">👨‍🔧 매입담당자 현황</h2>
            <div className="grid grid-cols-1 gap-2">
              {staffSummary.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { location.href = "/admin/staff/view.html"; }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-[16px]">👨‍🔧</div>
                    <p className="text-[14px] font-bold text-slate-800">{s.name}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-bold">
                    <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">진행 {s.assigned}건</span>
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">완료 {s.completed}건</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 예약 캘린더 */}
        <h2 className="text-[15px] font-bold text-slate-700">📅 예약 캘린더</h2>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 overflow-hidden" style={{ maxWidth: 900, margin: "20px auto" }}>
          <style>{`
            .fc { font-size: 13px; }
            .fc-toolbar-title { font-size: 15px !important; font-weight: 700; }
            .fc-button { font-size: 12px !important; padding: 4px 10px !important; }
            .fc-daygrid-day:hover { background: #f0f0ff; cursor: pointer; }
            .fc-day-today { background: #eef2ff !important; }
            .fc-event { font-size: 11px !important; border-radius: 6px !important; }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            headerToolbar={{ left: "prev", center: "title", right: "next" }}
            events={calendarEvents}
            dateClick={handleDateClick}
            height="auto"
          />
          {dateFilter && (() => {
            const dayEntries = allEntries.filter((r) => r.date === dateFilter);
            const dayUnassigned = unassigned.filter((r) => r.date === dateFilter);
            const dateTotal    = dayEntries.length;
            const dateUnassignedCount = dayUnassigned.length;
            const dateAssigned = dayEntries.filter((r) => r.status === "assigned").length;
            const slotMap: Record<string, number> = {};
            dayUnassigned.forEach((r) => {
              const t = r.time ?? "시간 미정";
              slotMap[t] = (slotMap[t] ?? 0) + 1;
            });
            const slots = Object.entries(slotMap).sort(([a], [b]) => a.localeCompare(b));

            return (
              <div className="mt-3 space-y-2">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                    <p className="text-[15px] font-black text-slate-800">📅 {formatDateKo(dateFilter)}</p>
                    <button
                      onClick={() => { setDateFilter(""); setEntries(allEntries); setShowUnassignedSlots(false); setTimeSlots([]); setExpandedSlot(null); setSlotDetail([]); }}
                      className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition-colors"
                    >전체 보기</button>
                  </div>
                  {/* 총 */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-500 font-medium">총</span>
                    <span className="text-[14px] font-black text-slate-800">{dateTotal}건</span>
                  </div>
                  {/* 🔴 미배정 — 클릭 */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-50 transition-colors active:scale-[0.99]"
                    style={{ background: showUnassignedSlots ? "#fff1f2" : "transparent" }}
                    onClick={async () => {
                      const next = !showUnassignedSlots;
                      setShowUnassignedSlots(next);
                      if (next && timeSlots.length === 0) {
                        setSlotsLoading(true);
                        try {
                          const r = await fetch(
                            `/api/admin/reservations/unassigned-by-time?date=${dateFilter}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          if (r.ok) setTimeSlots(await r.json());
                        } finally { setSlotsLoading(false); }
                      }
                    }}
                  >
                    <span className="text-[13px] font-bold text-rose-500 flex items-center gap-1.5">🔴 미배정</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-rose-600">{dateUnassignedCount}건</span>
                      <span className="text-[11px] text-slate-300">{showUnassignedSlots ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {/* 배정 */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[13px] text-slate-500 font-medium">배정</span>
                    <span className="text-[14px] font-black text-blue-600">{dateAssigned}건</span>
                  </div>
                </div>
                {showUnassignedSlots && (
                  <div className="bg-white border border-rose-100 rounded-2xl overflow-hidden">
                    <p className="px-4 pt-3 pb-2 text-[12px] font-bold text-slate-500 flex items-center gap-1.5">🕐 시간대별 미배정 리스트</p>
                    {slotsLoading ? (
                      <p className="px-4 pb-3 text-[13px] text-slate-400">불러오는 중...</p>
                    ) : timeSlots.length === 0 ? (
                      <p className="px-4 pb-3 text-[13px] text-slate-400">미배정 건 없음</p>
                    ) : (
                      <ul className="divide-y divide-slate-50">
                        {timeSlots.map((s) => {
                          const t = s.time ?? "시간 미정";
                          const isExpanded = expandedSlot === t;
                          return (
                            <li key={t}>
                              <button
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-rose-50/60 transition-colors"
                                onClick={async () => {
                                  if (isExpanded) { setExpandedSlot(null); return; }
                                  setExpandedSlot(t);
                                  setSlotDetailLoading(true);
                                  setSlotDetail([]);
                                  try {
                                    const r = await fetch(
                                      `/api/admin/reservations/unassigned-detail?date=${dateFilter}&time=${encodeURIComponent(s.time ?? "")}`,
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                    if (r.ok) setSlotDetail(await r.json());
                                  } finally { setSlotDetailLoading(false); }
                                }}
                              >
                                <span className="text-[13px] font-semibold text-slate-700">🕐 {t}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-black text-rose-500">{s.count}건</span>
                                  <span className="text-[11px] text-slate-300">{isExpanded ? "▲" : "▼"}</span>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-2.5 space-y-1.5">
                                  {slotDetailLoading ? (
                                    <p className="text-[12px] text-slate-400 py-1">불러오는 중...</p>
                                  ) : slotDetail.map((r) => (
                                    <button
                                      key={r.id}
                                      onClick={() => { location.href = `/admin/detail.html?id=${r.id}`; }}
                                      className="w-full text-left bg-white border border-rose-100 rounded-xl px-3 py-2 hover:bg-rose-50 transition-colors"
                                    >
                                      <p className="text-[13px] font-bold text-slate-800">👤 {r.name ?? r.phone}</p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">📍 {r.location || "—"}</p>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <hr className="border-slate-100" />
        <h2 className="text-[15px] font-bold text-slate-700">
          📋 {dateFilter ? formatDateKo(dateFilter) : "전체"} 예약 리스트
          <span className="text-[13px] text-slate-400 font-normal ml-2">({entries.length}건)</span>
        </h2>

        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}
        {loading && <div className="py-10 text-center text-slate-300 text-[13px]">불러오는 중...</div>}
        {!loading && !error && entries.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-[13px]">접수 내역이 없습니다</div>
        )}

        <div id="list" className="space-y-4 pb-6">
          {(() => {
            const grouped: Record<string, Reservation[]> = {};
            [...entries]
              .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
              .forEach((r) => {
                const key = r.time ?? "—";
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(r);
              });
            return Object.keys(grouped).map((time) => (
              <div key={time}>
                <p className="text-[12px] font-bold text-slate-400 px-1 mb-1">🕒 {time}</p>
                <div className="space-y-2">
                  {grouped[time].map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-2 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                    >
                      <p
                        onClick={() => { location.href = `/admin/detail.html?id=${r.id}`; }}
                        className="text-[14px] font-semibold text-slate-800 cursor-pointer flex-1 min-w-0 truncate"
                      >
                        👤 {r.name ?? r.phone} | 💰 {formatKRW(r.totalPayment)} | {statusText[r.status]}
                      </p>
                      <a
                        href={`/admin/chat.html?id=${r.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 text-[12px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors active:scale-95 whitespace-nowrap"
                      >
                        💬 채팅
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
