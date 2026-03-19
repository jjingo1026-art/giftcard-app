import { useState, useEffect, useRef } from "react";
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
  isUrgent: boolean;
  assignedTo?: string;
  assignedStaffId?: number;
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
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Record<number, number>>({});
  const [assigning, setAssigning] = useState<number | null>(null);
  const [calendarData, setCalendarData] = useState<{ date: string; total: number; unassigned: number; assigned: number; urgent: number }[]>([]);
  const [showTodayList, setShowTodayList] = useState(false);

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
      setAllEntries((prev) => prev.map((r) =>
        r.id === reservationId
          ? { ...r, status: "assigned", assignedStaffId: staffId, assignedTo: staffList.find((s) => s.id === staffId)?.name }
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
        title: d.urgent > 0
          ? `🚨${d.urgent} / 미배정 ${d.unassigned}`
          : d.unassigned > 0
            ? `총 ${d.total}건 / 미배정 ${d.unassigned}`
            : `${d.total}건`,
        start: d.date!,
        color: d.urgent > 0 ? "#dc2626" : d.unassigned > 0 ? "#ef4444" : "#2563eb",
      }))
    : (() => {
        const countByDate = allEntries.reduce<Record<string, number>>((acc, r) => {
          if (r.date) acc[r.date] = (acc[r.date] ?? 0) + 1;
          return acc;
        }, {});
        return Object.keys(countByDate).map((date) => ({
          title: countByDate[date] + "건",
          start: date,
          color: countByDate[date] > 5 ? "#ef4444" : "#2563eb",
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

  const unassignedListRef = useRef<HTMLDivElement>(null);

  function selectDate(dateStr: string) {
    setDateFilter(dateStr);
    filter(dateStr);
    setTimeout(() => {
      unassignedListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleDateClick(info: { dateStr: string }) {
    selectDate(info.dateStr);
  }

  function handleEventClick(info: { event: { startStr: string } }) {
    const dateStr = info.event.startStr.slice(0, 10);
    selectDate(dateStr);
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
            { label: "전체 예약",   id: "total",     value: stats.total,     color: "text-slate-700",   clickable: false },
            { label: "오늘 예약",   id: "today",     value: stats.today,     color: "text-indigo-600",  clickable: true  },
            { label: "담당자 배정", id: "assigned",  value: stats.assigned,  color: "text-blue-600",    clickable: false },
            { label: "처리 완료",   id: "completed", value: stats.completed, color: "text-emerald-600", clickable: false },
            { label: "취소",        id: "cancelled", value: stats.cancelled, color: "text-slate-400",   clickable: false },
          ].map(({ label, id, value, color, clickable }) => (
            <div
              key={id}
              onClick={clickable ? () => setShowTodayList((p) => !p) : undefined}
              className={`bg-white rounded-2xl border shadow-sm px-4 py-3 transition-all
                ${clickable
                  ? showTodayList && id === "today"
                    ? "border-indigo-300 bg-indigo-50 cursor-pointer"
                    : "border-slate-100 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/40 active:scale-[0.98]"
                  : "border-slate-100"}`}
            >
              <p className="text-[11px] text-slate-400 font-medium">{label}{clickable && <span className="ml-1 text-indigo-300">{showTodayList ? "▲" : "▼"}</span>}</p>
              <p id={id} className={`text-[24px] font-black mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

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

        {/* 오늘 예약 — 시간대순 목록 (캘린더 위) */}
        {showTodayList && (() => {
          const todayEntries = [...allEntries.filter((r) => r.date === today)]
            .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[14px] font-bold text-indigo-700 flex items-center gap-1.5">
                  📅 오늘 예약
                  <span className="text-[12px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{todayEntries.length}건</span>
                </p>
                <button
                  onClick={() => setShowTodayList(false)}
                  className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition-colors"
                >닫기 ✕</button>
              </div>
              {todayEntries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-6 text-center text-[13px] text-slate-400">
                  오늘 예약이 없습니다
                </div>
              ) : (
                todayEntries.map((r) => {
                  const sl = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-slate-100 text-slate-500" };
                  return (
                    <div
                      key={r.id}
                      onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                      className="bg-white rounded-2xl border border-indigo-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors active:scale-[0.99]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                          {r.isUrgent && <span className="text-red-500">🚨</span>}
                          👤 {r.name ?? r.phone}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5">
                          🕐 {r.time ?? "시간 미정"} · 📍 {r.location} · 💰 {formatKRW(r.totalPayment)}
                        </p>
                        {r.assignedTo && (
                          <p className="text-[11px] text-blue-500 mt-0.5 font-medium">👨‍🔧 {r.assignedTo}</p>
                        )}
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${sl.color}`}>{sl.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* 예약 캘린더 */}
        <h2 className="text-[15px] font-bold text-slate-700">📅 예약 캘린더</h2>

        {/* 🚨 긴급판매신청 — 캘린더 상단, 완료·취소 전까지 상시 표시 */}
        {(() => {
          const urgentActive = allEntries.filter(
            (r) => r.isUrgent && r.status !== "completed" && r.status !== "cancelled"
          );
          if (urgentActive.length === 0) return null;
          return (
            <div className="rounded-2xl border border-red-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500">
                <span className="text-[14px] font-black text-white">🚨 긴급판매신청</span>
                <span className="text-[12px] font-bold bg-white text-red-500 px-2 py-0.5 rounded-full">{urgentActive.length}건</span>
              </div>
              <div className="divide-y divide-red-100">
                {urgentActive.map((r) => {
                  const sl = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-slate-100 text-slate-500" };
                  return (
                    <div key={r.id} className="bg-red-50 px-4 py-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                          className="cursor-pointer flex-1 min-w-0"
                        >
                          <p className="text-[14px] font-bold text-slate-800 truncate">
                            👤 {r.name ?? r.phone}
                            {r.phone && r.name && <span className="text-slate-400 font-normal ml-1.5">📞 {r.phone}</span>}
                          </p>
                          <p className="text-[12px] text-slate-500 mt-0.5">
                            📍 {r.location} · 💰 {formatKRW(r.totalPayment)}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${sl.color}`}>{sl.label}</span>
                      </div>
                      {!r.assignedStaffId && (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedStaff[r.id] ?? ""}
                            onChange={(e) => setSelectedStaff((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))}
                            className="flex-1 text-[13px] border border-red-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                          >
                            <option value="">담당자 선택</option>
                            {staffList.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button
                            disabled={!selectedStaff[r.id] || assigning === r.id}
                            onClick={() => assignStaff(r.id)}
                            className="text-[13px] font-bold px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap active:scale-95"
                          >
                            {assigning === r.id ? "배정 중…" : "담당자 지정"}
                          </button>
                        </div>
                      )}
                      {r.assignedStaffId && (
                        <p className="text-[12px] text-emerald-600 font-semibold">✅ 담당자 배정 완료 — {r.assignedTo ?? ""}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <style>{`
            .fc { font-size: 14px; }
            .fc-toolbar { padding: 12px 16px 8px; }
            .fc-toolbar-title { font-size: 18px !important; font-weight: 800; color: #1e293b; }
            .fc-button { font-size: 13px !important; padding: 6px 14px !important; border-radius: 10px !important; }
            .fc-daygrid-day { min-height: 72px !important; }
            .fc-daygrid-day:hover { background: #f0f0ff; cursor: pointer; }
            .fc-daygrid-day-number { font-size: 14px !important; font-weight: 600; padding: 6px 8px !important; }
            .fc-day-today { background: #eef2ff !important; }
            .fc-day-today .fc-daygrid-day-number { color: #4f46e5; font-weight: 900; }
            .fc-col-header-cell { padding: 8px 0 !important; font-size: 13px !important; font-weight: 700; color: #64748b; }
            .fc-event { font-size: 12px !important; border-radius: 6px !important; padding: 2px 5px !important; font-weight: 600; }
            .fc-daygrid-event-harness { margin: 2px 3px !important; }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            headerToolbar={{ left: "prev", center: "title", right: "next" }}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height={680}
          />
          {dateFilter && (() => {
            const dayEntries   = allEntries.filter((r) => r.date === dateFilter);
            const dayUnassigned = [...dayEntries.filter((r) => !r.assignedStaffId)]
              .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
            const dateTotal          = dayEntries.length;
            const dateUnassignedCount = dayUnassigned.length;
            const dateAssigned        = dayEntries.filter((r) => r.assignedStaffId).length;
            const calDay   = calendarData.find((d) => d.date === dateFilter);
            const dateUrgent = calDay?.urgent ?? dayUnassigned.filter((r) => r.isUrgent).length;

            return (
              <div ref={unassignedListRef} className="mt-3 space-y-3">
                {/* 날짜 요약 카드 */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                    <p className="text-[15px] font-black text-slate-800">📅 {formatDateKo(dateFilter)}</p>
                    <button
                      onClick={() => { setDateFilter(""); setEntries(allEntries); }}
                      className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition-colors"
                    >전체 보기</button>
                  </div>
                  <div className="flex divide-x divide-slate-100">
                    <div className="flex-1 px-3 py-3 text-center">
                      <p className="text-[11px] text-slate-400 font-medium">총</p>
                      <p className="text-[18px] font-black text-slate-800">{dateTotal}</p>
                    </div>
                    {dateUrgent > 0 && (
                      <div className="flex-1 px-3 py-3 text-center bg-red-50">
                        <p className="text-[11px] text-red-500 font-bold">🚨 긴급</p>
                        <p className="text-[18px] font-black text-red-600">{dateUrgent}</p>
                      </div>
                    )}
                    <div className="flex-1 px-3 py-3 text-center">
                      <p className="text-[11px] text-rose-400 font-medium">미배정</p>
                      <p className="text-[18px] font-black text-rose-600">{dateUnassignedCount}</p>
                    </div>
                    <div className="flex-1 px-3 py-3 text-center">
                      <p className="text-[11px] text-blue-400 font-medium">배정</p>
                      <p className="text-[18px] font-black text-blue-600">{dateAssigned}</p>
                    </div>
                  </div>
                </div>

                {/* 미배정 예약 — 시간대순 카드 목록 */}
                {dayUnassigned.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-bold text-slate-500 flex items-center gap-1.5 px-1">
                      🔴 미배정 예약 <span className="text-rose-500">{dayUnassigned.length}건</span>
                    </p>
                    {dayUnassigned.map((r) => (
                      <div
                        key={r.id}
                        className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 space-y-2.5 ${r.isUrgent ? "border-red-200 bg-red-50/40" : "border-rose-100"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                            className="cursor-pointer flex-1 min-w-0"
                          >
                            <p className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                              {r.isUrgent && <span className="text-red-500">🚨</span>}
                              👤 {r.name ?? r.phone}
                            </p>
                            <p className="text-[12px] text-slate-400 mt-0.5">
                              🕐 {r.time ?? "시간 미정"} · 📍 {r.location} · 💰 {formatKRW(r.totalPayment)}
                            </p>
                          </div>
                          <span className="text-[11px] bg-amber-50 text-amber-600 font-bold px-2.5 py-1 rounded-full whitespace-nowrap">대기</span>
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
                )}

                {/* 배정 완료 날짜 — 전체 예약 상세 리스트 (시간대순) */}
                {dayUnassigned.length === 0 && dayEntries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-bold text-blue-600 flex items-center gap-1.5 px-1">
                      ✅ 배정 완료 예약 <span className="text-blue-400">{dayEntries.length}건</span>
                    </p>
                    {[...dayEntries]
                      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
                      .map((r) => {
                        const sl = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-slate-100 text-slate-500" };
                        return (
                          <div
                            key={r.id}
                            onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                            className="bg-white rounded-2xl border border-blue-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors active:scale-[0.99]"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                                {r.isUrgent && <span className="text-red-500">🚨</span>}
                                👤 {r.name ?? r.phone}
                              </p>
                              <p className="text-[12px] text-slate-400 mt-0.5">
                                🕐 {r.time ?? "시간 미정"} · 📍 {r.location} · 💰 {formatKRW(r.totalPayment)}
                              </p>
                              {r.assignedTo && (
                                <p className="text-[11px] text-blue-500 mt-0.5 font-medium">👨‍🔧 {r.assignedTo}</p>
                              )}
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${sl.color}`}>{sl.label}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
