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
  assigned:  { label: "매입담당자 배정", color: "bg-blue-100 text-blue-700" },
  completed: { label: "매입 완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소",     color: "bg-slate-100 text-slate-500" },
};

const statusText: Record<string, string> = {
  pending:   "🟡 예약",
  assigned:  "🟠 배정",
  completed: "🟢 완료",
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

  // 날짜별 건수 집계
  const countByDate = allEntries.reduce<Record<string, number>>((acc, r) => {
    if (r.date) acc[r.date] = (acc[r.date] ?? 0) + 1;
    return acc;
  }, {});

  const calendarEvents = Object.keys(countByDate).map((date) => ({
    title: countByDate[date] + "건",
    start: date,
    color: countByDate[date] > 5 ? "red" : "blue",
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
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "전체 예약",  id: "total",     value: stats.total,     color: "text-slate-700" },
            { label: "오늘 예약",  id: "today",     value: stats.today,     color: "text-indigo-600" },
            { label: "매입담당자 배정",  id: "assigned",  value: stats.assigned,  color: "text-blue-600" },
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
          {dateFilter
            ? <span className="text-[13px] text-indigo-500 font-normal ml-2">{dateFilter} 예약 ({entries.length}건)</span>
            : <span className="text-[13px] text-slate-400 font-normal ml-2">({entries.length}건)</span>
          }
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
                      onClick={() => { location.href = `/admin/detail.html?id=${r.id}`; }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors active:scale-[0.99]"
                    >
                      <p className="text-[14px] font-semibold text-slate-800">
                        👤 {r.name ?? r.phone} | 💰 {formatKRW(r.totalPayment)} | {statusText[r.status]}
                      </p>
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
