import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
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
  pending:   { label: "예약완료", color: "bg-amber-100 text-amber-700" },
  assigned:  { label: "직원배정", color: "bg-blue-100 text-blue-700" },
  completed: { label: "매입 완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소",     color: "bg-slate-100 text-slate-500" },
};

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [dateFilter, setDateFilter] = useState("");
  const [allEntries, setAllEntries] = useState<Reservation[]>([]);
  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/reservations", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); } return r.json(); })
      .then((data) => { setAllEntries(data); setEntries(data); })
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const stats = {
    total:     allEntries.length,
    today:     allEntries.filter((r) => r.date === today).length,
    assigned:  allEntries.filter((r) => r.status === "assigned").length,
    completed: allEntries.filter((r) => r.status === "completed").length,
  };

  // 예약 1건 = 캘린더 이벤트 1개 (이름 + 금액)
  const calendarEvents = allEntries
    .filter((r) => r.date)
    .map((r) => ({
      id: String(r.id),
      title: `${r.name ?? r.phone} (${formatKRW(r.totalPayment)})`,
      start: r.date,
      backgroundColor: r.kind === "urgent" ? "#f43f5e" : "#6366f1",
      borderColor:     r.kind === "urgent" ? "#e11d48" : "#4f46e5",
    }));

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
    filter(info.dateStr);
  }

  function handleEventClick(info: { event: { id: string } }) {
    navigate(`/admin/detail/${info.event.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">관리자 대시보드</h1>
            {allEntries.length > 0 && <p className="text-[11px] text-slate-400 mt-0.5">총 {allEntries.length}건</p>}
          </div>
          <button
            onClick={() => { clearAdminToken(); navigate("/admin/login"); }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-semibold transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "전체 예약",  id: "total",     value: stats.total,     color: "text-slate-700" },
            { label: "오늘 예약",  id: "today",     value: stats.today,     color: "text-indigo-600" },
            { label: "직원 배정",  id: "assigned",  value: stats.assigned,  color: "text-blue-600" },
            { label: "매입 완료",  id: "completed", value: stats.completed, color: "text-emerald-600" },
          ].map(({ label, id, value, color }) => (
            <div key={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <p className="text-[11px] text-slate-400 font-medium">{label}</p>
              <p id={id} className={`text-[24px] font-black mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 예약 캘린더 */}
        <h2 className="text-[15px] font-bold text-slate-700">📅 예약 캘린더</h2>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 overflow-hidden">
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
            eventClick={handleEventClick}
            height="auto"
          />
          {dateFilter && (
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[12px] text-indigo-600 font-semibold">📅 {dateFilter} 필터 중</span>
              <button
                onClick={() => { setDateFilter(""); setEntries(allEntries); }}
                className="text-[11px] text-slate-400 hover:text-rose-500 font-medium"
              >
                전체 보기
              </button>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />
        <h2 className="text-[15px] font-bold text-slate-700">
          📋 선택 날짜 예약 리스트
          {dateFilter && <span className="text-[13px] text-indigo-500 font-normal ml-2">— {dateFilter}</span>}
        </h2>

        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}
        {loading && <div className="py-10 text-center text-slate-300 text-[13px]">불러오는 중...</div>}
        {!loading && !error && entries.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-[13px]">접수 내역이 없습니다</div>
        )}

        <div id="list" className="space-y-2 pb-6">
          {entries.map((r) => {
            const st = STATUS_LABELS[r.status] ?? { label: r.status, color: "bg-slate-100 text-slate-500" };
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl text-[12px] font-black flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: r.kind === "urgent" ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    {r.id}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-800 truncate flex items-center gap-1.5">
                      {r.time ?? "—"} / {r.name ?? r.phone} / {formatKRW(r.totalPayment)}
                      {r.kind === "urgent" && (
                        <span className="text-[10px] bg-rose-100 text-rose-500 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">긴급</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      {r.assignedTo && <span className="text-[11px] text-indigo-500">👤 {r.assignedTo}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/admin/detail/${r.id}`)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-600 text-[12px] font-semibold hover:bg-indigo-50 transition-colors active:scale-95"
                >
                  상세
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
