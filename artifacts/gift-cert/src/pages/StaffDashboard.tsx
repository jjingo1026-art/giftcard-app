import { useState, useEffect } from "react";

interface SavedItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

interface Reservation {
  id: number;
  kind: string;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location: string;
  items: SavedItem[];
  totalPayment: number;
  giftcardType?: string;
  amount?: string | number;
  status: string;
  isUrgent?: boolean;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

type Tab = "today" | "upcoming" | "completed";

const TODAY = new Date().toISOString().split("T")[0];

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:   { text: "대기중",  cls: "bg-yellow-50 text-yellow-600 border border-yellow-200" },
  assigned:  { text: "배정됨", cls: "bg-blue-50 text-blue-600 border border-blue-200" },
  completed: { text: "완료",   cls: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  no_show:   { text: "노쇼",   cls: "bg-slate-100 text-slate-500 border border-slate-200" },
  cancelled: { text: "취소",   cls: "bg-rose-50 text-rose-400 border border-rose-100" },
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function faceValue(r: Reservation): number {
  if (Array.isArray(r.items) && r.items.length > 0)
    return r.items.reduce((s, it) => s + Number(it.amount), 0);
  return Number(r.amount ?? 0);
}

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/* ─── 인라인 캘린더 ─── */
function MiniCalendar({
  selected,
  onSelect,
  countMap,
}: {
  selected: string;
  onSelect: (d: string) => void;
  countMap: Record<string, number>;
}) {
  const selDate = new Date(selected + "T00:00:00");
  const [viewYear, setViewYear] = useState(selDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selDate.getMonth() + 1); // 1-based

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  }

  // 해당 월의 첫날 요일 & 마지막 날
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=일
  const lastDate = new Date(viewYear, viewMonth, 0).getDate();

  // 빈칸 + 날짜 배열
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ];
  // 6행이 되도록 패딩
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = TODAY;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <p className="text-[14px] font-black text-slate-800">
          {viewYear}년 {viewMonth}월
        </p>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map((d, i) => (
          <p
            key={d}
            className={`text-center text-[11px] font-black py-2 ${
              i === 0 ? "text-rose-400" : i === 6 ? "text-indigo-400" : "text-slate-400"
            }`}
          >
            {d}
          </p>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const count = countMap[dateStr] ?? 0;
          const isSelected = dateStr === selected;
          const isToday = dateStr === todayStr;
          const isSun = (firstDay + day - 1) % 7 === 0;
          const isSat = (firstDay + day - 1) % 7 === 6;

          return (
            <button
              key={day}
              onClick={() => onSelect(dateStr)}
              className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 transition-all active:scale-95 ${
                isSelected
                  ? "bg-indigo-500 shadow-sm shadow-indigo-200"
                  : isToday
                    ? "bg-indigo-50 border border-indigo-200"
                    : "hover:bg-slate-50"
              }`}
            >
              <span className={`text-[13px] font-bold leading-none ${
                isSelected
                  ? "text-white"
                  : isSun
                    ? "text-rose-400"
                    : isSat
                      ? "text-indigo-500"
                      : "text-slate-700"
              }`}>
                {day}
              </span>
              {count > 0 ? (
                <span className={`mt-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                  isSelected
                    ? "bg-white/30 text-white"
                    : "bg-indigo-100 text-indigo-600"
                }`}>
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 h-[16px]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 메인 ─── */
export default function StaffDashboard() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";

  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [upcomingDate, setUpcomingDate] = useState(TODAY);
  const [fromDate, setFromDate] = useState(sevenDaysAgo());
  const [toDate, setToDate] = useState(TODAY);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    fetch("/api/admin/staff/my-reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { localStorage.clear(); window.location.href = "/staff/login"; }
        return r.json();
      })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));

    fetch("/api/admin/staff/chat-list", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUnreadCount(data.reduce((s: number, r: { unreadCount: number }) => s + r.unreadCount, 0));
        }
      })
      .catch(() => {});
  }, []);

  /* 날짜별 건수 맵 (upcoming 탭용) */
  const upcomingCountMap: Record<string, number> = {};
  entries.forEach((r) => {
    if (r.date && !["cancelled"].includes(r.status)) {
      upcomingCountMap[r.date] = (upcomingCountMap[r.date] ?? 0) + 1;
    }
  });

  const todayList = entries
    .filter((r) => r.date === TODAY)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const upcomingList = entries
    .filter((r) => r.date === upcomingDate)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const completedList = entries
    .filter((r) => r.status === "completed" && r.date && r.date >= fromDate && r.date <= toDate)
    .sort((a, b) => ((a.date ?? "") + (a.time ?? "")).localeCompare((b.date ?? "") + (b.time ?? "")));

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "today",     label: "오늘배정",   emoji: "📍" },
    { key: "upcoming",  label: "진행예정",   emoji: "📅" },
    { key: "completed", label: "완료된배정", emoji: "✅" },
  ];

  function goToCard(id: number) {
    window.location.href = `/staff/card?id=${id}`;
  }

  function renderList(list: Reservation[]) {
    if (list.length === 0) {
      return (
        <div className="py-14 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-[14px] font-semibold text-slate-400">배정 내역이 없습니다</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {list.map((r) => {
          const sl = STATUS_LABEL[r.status] ?? { text: r.status, cls: "bg-slate-100 text-slate-500 border border-slate-200" };
          const face = faceValue(r);
          return (
            <button
              key={r.id}
              onClick={() => goToCard(r.id)}
              className={`w-full text-left bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-center gap-3 hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99] ${
                r.isUrgent ? "border-rose-200" : "border-slate-100"
              }`}
            >
              {r.isUrgent && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />}
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-[13px] font-black text-indigo-600">{r.time ?? "--:--"}</p>
              </div>
              <div className="w-px h-8 bg-slate-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-800 truncate">{r.name || r.phone}</p>
                <p className="text-[12px] text-slate-400 truncate mt-0.5">📍 {r.location}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[13px] font-black text-slate-700">
                  {face > 0 ? `${face.toLocaleString()}원` : "-"}
                </p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${sl.cls}`}>
                  {sl.text}
                </span>
              </div>
              <svg className="flex-shrink-0 text-slate-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          );
        })}
      </div>
    );
  }

  /* 선택 날짜 표시 */
  function formatSelectedDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const wd = WEEKDAYS[d.getDay()];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black text-slate-800">오늘배정 전체리스트</p>
            {!loading && (
              <p className="text-[11px] text-slate-400 mt-0.5">👨‍🔧 {staffName} · 전체 {entries.length}건</p>
            )}
          </div>
          <button
            onClick={() => { window.location.href = "/staff/chats"; }}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("gc_staff_token");
              localStorage.removeItem("gc_staff_id");
              localStorage.removeItem("gc_staff_name");
              window.location.href = "/staff/login";
            }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors flex-shrink-0"
          >
            로그아웃
          </button>
        </div>

        {/* 탭 */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          {TABS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-2xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
                tab === key
                  ? "bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}
        {error && <div className="py-10 text-center text-[13px] text-rose-400">{error}</div>}

        {!loading && !error && (
          <>
            {/* ── 오늘배정 ── */}
            {tab === "today" && renderList(todayList)}

            {/* ── 진행예정: 캘린더 + 목록 ── */}
            {tab === "upcoming" && (
              <>
                <MiniCalendar
                  selected={upcomingDate}
                  onSelect={setUpcomingDate}
                  countMap={upcomingCountMap}
                />

                {/* 선택된 날짜 헤더 */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <p className="text-[12px] font-black text-slate-500 flex-shrink-0">
                    {formatSelectedDate(upcomingDate)} · {upcomingList.length}건
                  </p>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {renderList(upcomingList)}
              </>
            )}

            {/* ── 완료된배정 ── */}
            {tab === "completed" && (
              <>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="flex-1 text-[13px] font-bold text-slate-700 outline-none"
                  />
                  <span className="text-[12px] text-slate-400">~</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="flex-1 text-[13px] font-bold text-slate-700 outline-none"
                  />
                </div>
                {renderList(completedList)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
