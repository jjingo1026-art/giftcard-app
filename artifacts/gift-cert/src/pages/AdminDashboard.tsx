import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { io } from "socket.io-client";
import { getSoundEnabled, playNotificationSound } from "@/lib/notificationSound";
import SoundBell from "@/components/SoundBell";
import { getAdminToken, clearAdminToken, adminFetch } from "@/lib/adminAuth";
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
  no_show:   { label: "노쇼",     color: "bg-rose-100 text-rose-600" },
};

const statusText: Record<string, string> = {
  pending:   "🟡 처리 대기",
  assigned:  "🟠 배정",
  completed: "🟢 처리 완료",
  cancelled: "🔴 취소",
};

interface ChatInboxItem {
  reservationId: number;
  name?: string;
  phone: string;
  location: string;
  status: string;
  unreadCount: number;
  lastMessage: string;
  lastSender: string;
  lastSenderRole: string;
  lastTime: string;
}

interface StaffSummary { id: number; name: string; preferredLocation?: string | null; assigned: number; completed: number; }

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
  const [showCompletedSearch, setShowCompletedSearch] = useState(false);
  const [completedQuery, setCompletedQuery] = useState("");
  const [showCancelledSearch, setShowCancelledSearch] = useState(false);
  const [cancelledQuery, setCancelledQuery] = useState("");
  const [newUrgentAlert, setNewUrgentAlert] = useState<Reservation | null>(null);
  const urgentAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assignToast, setAssignToast] = useState<{ id: number; ok: boolean; msg: string } | null>(null);
  const assignToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingStaff, setPendingStaff] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [approvingStaff, setApprovingStaff] = useState<number | null>(null);
  const [rejectingStaff, setRejectingStaff] = useState<number | null>(null);
  const [chatInbox, setChatInbox] = useState<ChatInboxItem[]>([]);
  const [chatInboxOpen, setChatInboxOpen] = useState(true);
  const [newChatAlert, setNewChatAlert] = useState<{ reservationId: number; lastSender: string; lastMessage: string; senderRole: string } | null>(null);
  const chatAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = getAdminToken();
  const unassignedListRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // intentionally run once on mount (token is stable)
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminFetch("/api/admin/reservations?limit=500")
      .then((r) => r.json())
      .then((data) => { setAllEntries(data); setEntries(data); })
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));

    adminFetch("/api/admin/staff-summary")
      .then((r) => r.json())
      .then(setStaffSummary)
      .catch(() => {});

    adminFetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((data) => setDashboardStats(data))
      .catch(() => {});

    adminFetch("/api/admin/staff")
      .then((r) => r.json())
      .then((data: any[]) => setStaffList(data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {});

    adminFetch("/api/admin/reservations/calendar")
      .then((r) => r.json())
      .then(setCalendarData)
      .catch(() => {});

    adminFetch("/api/admin/staff/pending")
      .then((r) => r.json())
      .then(setPendingStaff)
      .catch(() => {});

    adminFetch("/api/admin/chat-inbox")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setChatInbox(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });

    socket.on("newReservation", (reservation: Reservation) => {
      if (getSoundEnabled("admin")) playNotificationSound("admin");
      setAllEntries((prev) => {
        if (prev.some((r) => r.id === reservation.id)) return prev;
        return [reservation, ...prev];
      });
      setEntries((prev) => {
        if (prev.some((r) => r.id === reservation.id)) return prev;
        return [reservation, ...prev];
      });
      // 캘린더 즉시 로컬 반영 (비모바일만)
      if (reservation.date && reservation.kind !== "mobile") {
        setCalendarData((prev) => {
          const exists = prev.find((c) => c.date === reservation.date);
          if (exists) {
            return prev.map((c) =>
              c.date === reservation.date
                ? {
                    ...c,
                    total: c.total + 1,
                    unassigned: c.unassigned + 1,
                    urgent: reservation.isUrgent ? c.urgent + 1 : c.urgent,
                  }
                : c
            );
          }
          return [
            ...prev,
            {
              date: reservation.date!,
              total: 1,
              unassigned: 1,
              assigned: 0,
              urgent: reservation.isUrgent ? 1 : 0,
            },
          ];
        });
      }
      // 서버 재조회로 정확도 보정
      adminFetch("/api/admin/reservations/calendar")
        .then((r) => r.json())
        .then(setCalendarData)
        .catch(() => {});
    });

    socket.on("newUrgent", (reservation: Reservation) => {
      if (getSoundEnabled("admin")) playNotificationSound("admin");
      if (urgentAlertTimerRef.current) clearTimeout(urgentAlertTimerRef.current);
      setNewUrgentAlert(reservation);
      urgentAlertTimerRef.current = setTimeout(() => setNewUrgentAlert(null), 8000);
    });

    socket.on("reservationUpdated", (updated: Reservation) => {
      setAllEntries((prev) => prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
      setEntries((prev) => prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
    });

    socket.on("staffAssigned", ({ reservation }: { staffId: number; reservation: Reservation }) => {
      // 예약 목록 상태 갱신 (pending → assigned)
      setAllEntries((prev) => prev.map((r) => r.id === reservation.id ? { ...r, ...reservation } : r));
      setEntries((prev) => prev.map((r) => r.id === reservation.id ? { ...r, ...reservation } : r));

      // 캘린더 최신 데이터로 갱신 (다른 탭/사용자의 배정도 반영)
      adminFetch("/api/admin/reservations/calendar")
        .then((r) => r.json())
        .then(setCalendarData)
        .catch(() => {});
    });

    socket.on("chatAlert", (msg: { reservationId: number; senderName: string; message: string; time: string; sender: string }) => {
      if (getSoundEnabled("admin")) playNotificationSound("admin");
      // 실시간 인박스 갱신
      setChatInbox((prev) => {
        const existing = prev.find((c) => c.reservationId === msg.reservationId);
        if (existing) {
          return prev.map((c) =>
            c.reservationId === msg.reservationId
              ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: msg.message, lastSender: msg.senderName, lastSenderRole: msg.sender, lastTime: msg.time }
              : c
          ).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
        } else {
          // 새 예약의 채팅 — 기본 정보는 모르므로 reservationId만 표시
          const newItem: ChatInboxItem = {
            reservationId: msg.reservationId,
            name: undefined,
            phone: "-",
            location: "-",
            status: "-",
            unreadCount: 1,
            lastMessage: msg.message,
            lastSender: msg.senderName,
            lastSenderRole: msg.sender,
            lastTime: msg.time,
          };
          return [newItem, ...prev];
        }
      });
      setChatInboxOpen(true);

      // 플로팅 알림
      if (chatAlertTimerRef.current) clearTimeout(chatAlertTimerRef.current);
      setNewChatAlert({ reservationId: msg.reservationId, lastSender: msg.senderName, lastMessage: msg.message, senderRole: msg.sender });
      chatAlertTimerRef.current = setTimeout(() => setNewChatAlert(null), 6000);
    });

    return () => { socket.disconnect(); };
  }, []);

  if (!token) { navigate("/admin/login"); return null; }

  function showAssignToast(id: number, ok: boolean, msg: string) {
    if (assignToastTimerRef.current) clearTimeout(assignToastTimerRef.current);
    setAssignToast({ id, ok, msg });
    assignToastTimerRef.current = setTimeout(() => setAssignToast(null), 4000);
  }

  async function assignStaff(reservationId: number) {
    const staffId = selectedStaff[reservationId];
    if (!staffId) return;
    setAssigning(reservationId);
    try {
      const res = await adminFetch(`/api/admin/reservations/${reservationId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showAssignToast(reservationId, false, errData.error ?? "배정에 실패했습니다.");
        return;
      }

      const staffName = staffList.find((s) => s.id === staffId)?.name ?? "";
      // 예약 목록 즉시 반영
      setAllEntries((prev) => prev.map((r) =>
        r.id === reservationId
          ? { ...r, status: "assigned", assignedStaffId: staffId, assignedTo: staffName }
          : r
      ));
      setEntries((prev) => prev.map((r) =>
        r.id === reservationId
          ? { ...r, status: "assigned", assignedStaffId: staffId, assignedTo: staffName }
          : r
      ));

      showAssignToast(reservationId, true, `${staffName} 담당자 배정 완료`);

      // 캘린더 최신 데이터로 즉시 갱신
      adminFetch("/api/admin/reservations/calendar")
        .then((r) => r.json())
        .then(setCalendarData)
        .catch(() => {});
    } catch {
      showAssignToast(reservationId, false, "네트워크 오류가 발생했습니다.");
    } finally {
      setAssigning(null);
    }
  }

  async function approveStaff(id: number) {
    setApprovingStaff(id);
    try {
      await adminFetch(`/api/admin/staff/${id}/approve`, { method: "POST" });
      setPendingStaff((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setApprovingStaff(null);
    }
  }

  async function rejectStaff(id: number) {
    setRejectingStaff(id);
    try {
      await adminFetch(`/api/admin/staff/${id}/reject`, { method: "POST" });
      setPendingStaff((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRejectingStaff(null);
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
      const res = await adminFetch(`/api/admin/reservations?date=${date}`);
      setEntries(await res.json());
    } catch {
      setError("데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

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

      {/* 💬 실시간 채팅 알림 플로팅 배너 */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-sm transition-all duration-500
          ${newChatAlert && !newUrgentAlert ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"}`}
      >
        {newChatAlert && (
          <div
            onClick={() => { window.location.href = `/admin/chat?id=${newChatAlert.reservationId}`; }}
            className={`text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform ${newChatAlert.senderRole === "staff" ? "bg-violet-600" : "bg-indigo-600"}`}
          >
            <span className="text-2xl flex-shrink-0">{newChatAlert.senderRole === "staff" ? "👨‍🔧" : "💬"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-black leading-tight">{newChatAlert.lastSender}님의 메시지</p>
                {newChatAlert.senderRole === "staff" && (
                  <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full flex-shrink-0">담당자</span>
                )}
              </div>
              <p className="text-[12px] font-semibold opacity-90 truncate">{newChatAlert.lastMessage}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNewChatAlert(null); }}
              className="text-white/70 hover:text-white text-lg flex-shrink-0 leading-none"
            >✕</button>
          </div>
        )}
      </div>

      {/* 🚨 실시간 긴급판매 알림 플로팅 배너 */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm transition-all duration-500
          ${newUrgentAlert ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"}`}
      >
        {newUrgentAlert && (
          <div
            onClick={() => { window.location.href = `/admin/detail.html?id=${newUrgentAlert.id}`; }}
            className="bg-red-600 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl animate-bounce flex-shrink-0">🚨</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black leading-tight">긴급판매 신규 접수!</p>
              <p className="text-[12px] font-semibold opacity-90 mt-0.5 truncate">
                👤 {newUrgentAlert.name ?? newUrgentAlert.phone} · 📍 {newUrgentAlert.location} · {formatKRW(newUrgentAlert.totalPayment)}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNewUrgentAlert(null); }}
              className="text-white/70 hover:text-white text-lg flex-shrink-0 leading-none"
            >✕</button>
          </div>
        )}
      </div>

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2.5">
          {/* 1행: 제목 + 설정버튼들 + 스피커 */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-black text-slate-800">관리자 대시보드</h1>
              {allEntries.length > 0 && <p className="text-[11px] text-slate-400 mt-0.5">총 {allEntries.length}건</p>}
            </div>
            <button
              onClick={() => { window.location.href = "/admin/site-settings.html"; }}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex-shrink-0"
              title="사이트 설정"
            >
              🖊️ 사이트설정
            </button>
            <button
              onClick={() => { window.location.href = "/admin/settings.html"; }}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex-shrink-0"
              title="계정 설정"
            >
              ⚙️ 계정설정
            </button>
            <SoundBell role="admin" />
          </div>
          {/* 2행: 버튼들 */}
          <div className="flex items-stretch gap-1">
            {/* 모바일 */}
            <button
              onClick={() => { window.location.href = "/admin/mobile"; }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all"
              title="모바일상품권 관리"
            >
              <span className="text-[15px] leading-none">📱</span>
              <span className="text-[10px] font-bold text-violet-600 leading-tight whitespace-nowrap">모바일</span>
            </button>
            {/* 채팅 */}
            <button
              onClick={() => { window.location.href = "/admin/chats"; }}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
              title="채팅 전체 목록"
            >
              <span className="text-[15px] leading-none">💬</span>
              <span className="text-[10px] font-bold text-indigo-600 leading-tight whitespace-nowrap">채팅</span>
              {chatInbox.reduce((s, c) => s + c.unreadCount, 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 leading-none">
                  {chatInbox.reduce((s, c) => s + c.unreadCount, 0)}
                </span>
              )}
            </button>
            {/* 노쇼 */}
            <button
              onClick={() => { window.location.href = "/admin/noshow"; }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
              title="노쇼 관리"
            >
              <span className="text-[15px] leading-none">🚫</span>
              <span className="text-[10px] font-bold text-rose-500 leading-tight whitespace-nowrap">노쇼</span>
            </button>
            {/* 매출 */}
            <button
              onClick={() => { window.location.href = "/admin/revenue.html"; }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all"
            >
              <span className="text-[15px] leading-none">💰</span>
              <span className="text-[10px] font-bold text-emerald-600 leading-tight whitespace-nowrap">매출</span>
            </button>
            {/* 담당자별 */}
            <button
              onClick={() => { location.href = "/admin/staff/view.html"; }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
            >
              <span className="text-[15px] leading-none">👥</span>
              <span className="text-[10px] font-bold text-indigo-500 leading-tight whitespace-nowrap">담당자별</span>
            </button>
            {/* 로그아웃 */}
            <button
              onClick={() => { clearAdminToken(); navigate("/admin/login"); }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl hover:bg-rose-50 transition-all"
            >
              <span className="text-[15px] leading-none">🚪</span>
              <span className="text-[10px] font-semibold text-slate-400 hover:text-rose-500 leading-tight whitespace-nowrap">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* 매출 요약 */}
        {dashboardStats && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "오늘 매출",  value: formatKRW(Number(dashboardStats.todayRevenue)),   color: "text-emerald-600",  bg: "bg-emerald-50",  icon: "💰", link: "/admin/today-revenue.html" },
              { label: "이번주 매출", value: formatKRW(Number(dashboardStats.weeklyRevenue)), color: "text-indigo-600",  bg: "bg-indigo-50",   icon: "📈", link: "/admin/weekly-revenue.html" },
              { label: "예약 수",    value: `${Number(dashboardStats.totalReservations)}건`,  color: "text-slate-700",   bg: "bg-slate-50",    icon: "📋", link: null },
              { label: "완료율",     value: `${dashboardStats.completedRate}%`,               color: "text-blue-600",   bg: "bg-blue-50",     icon: "✅", link: null },
            ].map(({ label, value, color, bg, icon, link }) => (
              <div
                key={label}
                onClick={link ? () => { window.location.href = link; } : undefined}
                className={`${bg} rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 transition-all
                  ${link ? "cursor-pointer hover:border-emerald-200 hover:shadow-md active:scale-[0.98]" : ""}`}
              >
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">{icon} {label}{link && <span className="text-slate-300 text-[10px]">›</span>}</p>
                <p className={`text-[20px] font-black mt-0.5 ${color} tracking-tight`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "전체 예약",   id: "total",     value: stats.total,     color: "text-slate-700",   onClick: (() => { window.location.href = "/admin/all-reservations.html"; }) as (() => void) | undefined, active: false },
            { label: "오늘 예약",   id: "today",     value: stats.today,     color: "text-indigo-600",  onClick: () => { setShowTodayList((p) => !p); setShowCompletedSearch(false); setShowCancelledSearch(false); }, active: showTodayList },
            { label: "담당자 배정", id: "assigned",  value: stats.assigned,  color: "text-blue-600",    onClick: (() => { window.location.href = "/admin/assign.html"; }) as (() => void) | undefined, active: false },
            { label: "처리 완료",   id: "completed", value: stats.completed, color: "text-emerald-600", onClick: () => { setShowCompletedSearch((p) => !p); setShowTodayList(false); setCompletedQuery(""); }, active: showCompletedSearch },
            { label: "취소",        id: "cancelled", value: stats.cancelled, color: "text-rose-500",   onClick: () => { setShowCancelledSearch((p) => !p); setShowTodayList(false); setShowCompletedSearch(false); setCancelledQuery(""); }, active: showCancelledSearch },
          ].map(({ label, id, value, color, onClick, active }) => (
            <div
              key={id}
              onClick={onClick}
              className={`bg-white rounded-2xl border shadow-sm px-4 py-3 transition-all
                ${onClick
                  ? active
                    ? "border-emerald-300 bg-emerald-50 cursor-pointer"
                    : "border-slate-100 cursor-pointer hover:border-slate-200 hover:bg-slate-50/60 active:scale-[0.98]"
                  : "border-slate-100"}`}
            >
              <p className="text-[11px] text-slate-400 font-medium">{label}{onClick && <span className="ml-1 text-slate-300">{active ? "▲" : "▼"}</span>}</p>
              <p id={id} className={`text-[24px] font-black mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
          <div
            onClick={() => { window.location.href = "/admin/staff-overview.html"; }}
            className="bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-100/60 active:scale-[0.98] transition-all"
          >
            <p className="text-[11px] text-indigo-400 font-medium">매입담당자</p>
            <p className="text-[13px] font-black mt-0.5 text-indigo-700">👨‍🔧 현황 →</p>
          </div>
        </div>

        {/* 💬 채팅 인박스 */}
        {chatInboxOpen && chatInbox.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                </span>
                <p className="text-[13px] font-black text-indigo-700">채팅 미확인</p>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {chatInbox.reduce((s, c) => s + c.unreadCount, 0)}건
                </span>
              </div>
              <button
                onClick={() => setChatInboxOpen(false)}
                className="text-[11px] text-indigo-400 hover:text-indigo-600 font-medium transition-colors"
              >닫기 ✕</button>
            </div>
            <div className="divide-y divide-indigo-100">
              {chatInbox.map((item) => (
                <div
                  key={item.reservationId}
                  onClick={() => { window.location.href = `/admin/chat?id=${item.reservationId}`; }}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-indigo-100/50 active:bg-indigo-100 transition-colors"
                >
                  {/* 발신자 아이콘 */}
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-[15px] flex-shrink-0 ${item.lastSenderRole === "staff" ? "bg-violet-100 border-violet-200" : "bg-indigo-100 border-indigo-200"}`}>
                    {item.lastSenderRole === "staff" ? "👨‍🔧" : item.lastSenderRole === "customer" ? "👤" : "💬"}
                  </div>
                  {/* 메시지 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 truncate">
                          {item.name ?? item.phone}
                        </p>
                        {item.lastSenderRole === "staff" && (
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full flex-shrink-0">담당자</span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">{item.location}</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-medium flex-shrink-0">
                        {(() => {
                          const diff = Date.now() - new Date(item.lastTime).getTime();
                          if (diff < 60000) return "방금";
                          if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
                          if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
                          return new Date(item.lastTime).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
                        })()}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 truncate">
                      <span className={`font-semibold ${item.lastSenderRole === "staff" ? "text-violet-600" : "text-indigo-500"}`}>{item.lastSender}</span>
                      <span className="mx-1">·</span>
                      {item.lastMessage}
                    </p>
                  </div>
                  {/* 미읽은 수 뱃지 */}
                  <span className={`min-w-[22px] h-[22px] rounded-full text-white text-[11px] font-black flex items-center justify-center px-1.5 flex-shrink-0 ${item.lastSenderRole === "staff" ? "bg-violet-500" : "bg-indigo-500"}`}>
                    {item.unreadCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 매입담당자 가입 승인 대기 */}
        {pendingStaff.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <p className="text-[13px] font-black text-amber-700">매입담당자 가입 승인 대기</p>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">{pendingStaff.length}명</span>
              </div>
            </div>
            <div className="divide-y divide-amber-100">
              {pendingStaff.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[14px] flex-shrink-0">👨‍🔧</div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{s.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => rejectStaff(s.id)}
                      disabled={rejectingStaff === s.id || approvingStaff === s.id}
                      className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-500 text-[12px] font-bold hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {rejectingStaff === s.id ? "처리중" : "거절"}
                    </button>
                    <button
                      onClick={() => approveStaff(s.id)}
                      disabled={approvingStaff === s.id || rejectingStaff === s.id}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {approvingStaff === s.id ? "처리중" : "✓ 승인"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 처리완료 고객 검색 (캘린더 위) */}
        {showCompletedSearch && (() => {
          const q = completedQuery.trim().toLowerCase();
          const completedAll = allEntries.filter((r) => r.status === "completed" || r.status === "no_show");
          const results = q
            ? completedAll.filter((r) =>
                (r.name ?? "").toLowerCase().includes(q) ||
                r.phone.replace(/-/g, "").includes(q.replace(/-/g, ""))
              )
            : [];
          const totalAmount = results.reduce((s, r) => s + r.totalPayment, 0);

          return (
            <div className="space-y-2">
              {/* 검색 헤더 */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[14px] font-bold text-emerald-700 flex items-center gap-1.5">
                  ✅ 처리완료 고객 검색
                </p>
                <button
                  onClick={() => { setShowCompletedSearch(false); setCompletedQuery(""); }}
                  className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition-colors"
                >닫기 ✕</button>
              </div>

              {/* 검색 입력 */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-[15px]">🔍</span>
                <input
                  type="text"
                  value={completedQuery}
                  onChange={(e) => setCompletedQuery(e.target.value)}
                  placeholder="고객 이름 또는 전화번호 검색"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-emerald-200 text-[14px] text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 bg-white placeholder:text-slate-300 transition-all"
                />
              </div>

              {/* 결과 */}
              {q.length > 0 && (
                results.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-6 text-center text-[13px] text-slate-400">
                    "{completedQuery}" 검색 결과 없음
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[12px] font-bold text-emerald-600">
                        {results[0].name ?? results[0].phone} 거래 완료 {results.length}건
                      </p>
                      <p className="text-[12px] font-black text-emerald-700">
                        합계 {formatKRW(totalAmount)}
                      </p>
                    </div>
                    {[...results]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((r) => (
                        <div
                          key={r.id}
                          onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                          className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors active:scale-[0.99]"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                              {r.isUrgent && <span className="text-red-500">🚨</span>}
                              👤 {r.name ?? r.phone}
                            </p>
                            <p className="text-[12px] text-slate-400 mt-0.5">
                              📅 {formatDateKo(r.date)} {r.time && `· 🕐 ${r.time}`} · 📍 {r.location}
                            </p>
                            {r.assignedTo && (
                              <p className="text-[11px] text-blue-500 mt-0.5 font-medium">👨‍🔧 {r.assignedTo}</p>
                            )}
                          </div>
                          <p className="text-[15px] font-black text-emerald-600 flex-shrink-0">{formatKRW(r.totalPayment)}</p>
                        </div>
                      ))}
                  </div>
                )
              )}
            </div>
          );
        })()}

        {/* 취소 고객 검색 (캘린더 위) */}
        {showCancelledSearch && (() => {
          const q = cancelledQuery.trim().toLowerCase();
          const cancelledAll = allEntries.filter((r) => r.status === "cancelled");
          const results = q
            ? cancelledAll.filter((r) =>
                (r.name ?? "").toLowerCase().includes(q) ||
                r.phone.replace(/-/g, "").includes(q.replace(/-/g, ""))
              )
            : [];

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[14px] font-bold text-rose-600 flex items-center gap-1.5">
                  🚫 취소 내역 검색
                </p>
                <button
                  onClick={() => { setShowCancelledSearch(false); setCancelledQuery(""); }}
                  className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition-colors"
                >닫기 ✕</button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-[15px]">🔍</span>
                <input
                  type="text"
                  value={cancelledQuery}
                  onChange={(e) => setCancelledQuery(e.target.value)}
                  placeholder="고객 이름 또는 전화번호 검색"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-rose-200 text-[14px] text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-50 bg-white placeholder:text-slate-300 transition-all"
                />
              </div>

              {q.length > 0 && (
                results.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-6 text-center text-[13px] text-slate-400">
                    "{cancelledQuery}" 검색 결과 없음
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[12px] font-bold text-rose-600">
                        {results[0].name ?? results[0].phone} 취소 내역 {results.length}건
                      </p>
                    </div>
                    {[...results]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((r) => {
                        return (
                          <div
                            key={r.id}
                            onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
                            className="bg-white rounded-2xl border border-rose-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-2 cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors active:scale-[0.99]"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                                {r.isUrgent && <span className="text-red-500">🚨</span>}
                                👤 {r.name ?? r.phone}
                              </p>
                              <p className="text-[12px] text-slate-400 mt-0.5">
                                📅 {formatDateKo(r.date)} {r.time && `· 🕐 ${r.time}`} · 📍 {r.location}
                              </p>
                              {r.assignedTo && (
                                <p className="text-[11px] text-blue-500 mt-0.5 font-medium">👨‍🔧 {r.assignedTo}</p>
                              )}
                            </div>
                            <p className="text-[15px] font-black text-rose-400 flex-shrink-0 line-through">{formatKRW(r.totalPayment)}</p>
                          </div>
                        );
                      })}
                  </div>
                )
              )}
            </div>
          );
        })()}

        {/* 오늘 예약 — 시간대순 목록 (캘린더 위) */}
        {showTodayList && (() => {
          const todayEntries = [...allEntries.filter((r) => r.date === today && r.status !== "no_show" && r.status !== "completed" && r.status !== "cancelled")]
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
            // 캘린더 집계와 동일 조건: 지류(reservation/urgent)만, 취소·노쇼 제외
            const dayEntries = allEntries.filter((r) =>
              r.date === dateFilter &&
              (r.kind === "reservation" || r.kind === "urgent") &&
              r.status !== "cancelled" &&
              r.status !== "no_show"
            );
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
                    {/* 배정 토스트 */}
                    {assignToast && (
                      <div className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2 ${assignToast.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                        {assignToast.ok ? "✅" : "❌"} {assignToast.msg}
                      </div>
                    )}
                    {dayUnassigned.map((r) => (
                      <div
                        key={r.id}
                        className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 space-y-2.5 ${r.isUrgent ? "border-red-200 bg-red-50/40" : "border-rose-100"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => {
                              if (assigning === r.id) return; // 배정 중 이동 차단
                              window.location.href = `/admin/detail.html?id=${r.id}`;
                            }}
                            className={`flex-1 min-w-0 ${assigning === r.id ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
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
                            disabled={assigning === r.id}
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
