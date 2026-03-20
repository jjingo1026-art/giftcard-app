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

function faceValue(r: Reservation): number {
  if (Array.isArray(r.items) && r.items.length > 0)
    return r.items.reduce((s, it) => s + Number(it.amount), 0);
  return Number(r.amount ?? 0);
}

function weekday(date: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
}

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

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
  }, []);

  const todayList = entries
    .filter((r) => r.date === TODAY)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const upcomingList = entries
    .filter((r) => r.date === upcomingDate && r.date !== TODAY)
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

  function renderList() {
    let list: Reservation[] = [];
    if (tab === "today") list = todayList;
    else if (tab === "upcoming") list = upcomingList;
    else list = completedList;

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
              {/* 긴급 인디케이터 */}
              {r.isUrgent && (
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
              )}

              {/* 시간 */}
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-[13px] font-black text-indigo-600">{r.time ?? "--:--"}</p>
              </div>

              {/* 구분선 */}
              <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-800 truncate">
                  {r.name || r.phone}
                </p>
                <p className="text-[12px] text-slate-400 truncate mt-0.5">
                  📍 {r.location}
                </p>
              </div>

              {/* 금액 + 상태 */}
              <div className="flex-shrink-0 text-right">
                <p className="text-[13px] font-black text-slate-700">
                  {face > 0 ? `${face.toLocaleString()}원` : "-"}
                </p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${sl.cls}`}>
                  {sl.text}
                </span>
              </div>

              {/* 화살표 */}
              <svg className="flex-shrink-0 text-slate-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[16px] font-black text-slate-800">오늘배정 전체리스트</p>
            {!loading && (
              <p className="text-[11px] text-slate-400 mt-0.5">👨‍🔧 {staffName} · 전체 {entries.length}건</p>
            )}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("gc_staff_token");
              localStorage.removeItem("gc_staff_id");
              localStorage.removeItem("gc_staff_name");
              window.location.href = "/staff/login";
            }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
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

      {/* 날짜 선택 (진행예정) */}
      {tab === "upcoming" && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className="text-[13px] text-slate-500 font-medium flex-shrink-0">날짜 선택</span>
            <input
              type="date"
              value={upcomingDate}
              onChange={(e) => setUpcomingDate(e.target.value)}
              className="flex-1 text-[14px] font-bold text-slate-700 outline-none"
            />
          </div>
        </div>
      )}

      {/* 기간 선택 (완료된배정) */}
      {tab === "completed" && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
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
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}
        {error && (
          <div className="py-10 text-center text-[13px] text-rose-400">{error}</div>
        )}
        {!loading && !error && renderList()}
      </div>
    </div>
  );
}
