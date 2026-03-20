import { useState, useEffect } from "react";

interface Reservation {
  id: number;
  kind: string;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location: string;
  totalPayment: number;
  status: string;
  isUrgent?: boolean;
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  pending:   { text: "처리 대기",  cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  assigned:  { text: "배정됨",    cls: "bg-blue-50 text-blue-600 border-blue-200" },
  completed: { text: "완료",      cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  no_show:   { text: "노쇼",      cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(date?: string, time?: string) {
  if (!date) return "날짜 미정";
  const d = new Date(date);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const formatted = `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
  return time ? `${formatted} ${time}` : formatted;
}

function isToday(date?: string) {
  if (!date) return false;
  return date === new Date().toISOString().split("T")[0];
}

function isFuture(date?: string) {
  if (!date) return false;
  return date > new Date().toISOString().split("T")[0];
}

export default function StaffDashboard() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";

  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"upcoming" | "all">("upcoming");
  const [completing, setCompleting] = useState<number | null>(null);

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

  async function markComplete(id: number) {
    setCompleting(id);
    try {
      await fetch(`/api/admin/reservations/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setEntries((prev) => prev.map((r) => r.id === id ? { ...r, status: "completed" } : r));
    } finally {
      setCompleting(null);
    }
  }

  const sorted = [...entries].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? "") || (a.time ?? "").localeCompare(b.time ?? "")
  );

  const upcoming = sorted.filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show" && (isToday(r.date) || isFuture(r.date) || !r.date));
  const displayed = tab === "upcoming" ? upcoming : sorted;

  const grouped: Record<string, Reservation[]> = {};
  displayed.forEach((r) => {
    const key = r.date ?? "날짜 미정";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const todayCount = entries.filter((r) => isToday(r.date) && r.status !== "completed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-black text-slate-800">내 배정 예약</h1>
              {todayCount > 0 && (
                <span className="text-[11px] font-bold text-white bg-rose-500 rounded-full px-2 py-0.5">
                  오늘 {todayCount}건
                </span>
              )}
            </div>
            {!loading && (
              <p className="text-[11px] text-slate-400 mt-0.5">👨‍🔧 {staffName} · 전체 {entries.length}건</p>
            )}
          </div>
          <button
            onClick={() => { localStorage.removeItem("gc_staff_token"); localStorage.removeItem("gc_staff_id"); localStorage.removeItem("gc_staff_name"); window.location.href = "/staff/login"; }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {(["upcoming", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold transition-all ${
                tab === t
                  ? "bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-200"
              }`}
            >
              {t === "upcoming" ? `📅 진행 예정 (${upcoming.length})` : `📋 전체 (${entries.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}
        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}

        {!loading && !error && displayed.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-[14px] font-semibold text-slate-400">
              {tab === "upcoming" ? "진행 예정 예약이 없습니다" : "배정된 예약이 없습니다"}
            </p>
          </div>
        )}

        {Object.keys(grouped).map((date) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              <p className={`text-[12px] font-black px-3 py-1 rounded-xl ${
                isToday(date) ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {isToday(date) ? "오늘" : date === "날짜 미정" ? "날짜 미정" : (() => {
                  const d = new Date(date);
                  const w = ["일","월","화","수","목","금","토"][d.getDay()];
                  return `${d.getMonth()+1}/${d.getDate()} (${w})`;
                })()}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">{grouped[date].length}건</span>
            </div>

            {grouped[date].map((r) => {
              const sl = statusLabel[r.status] ?? { text: r.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    r.isUrgent ? "border-rose-200" : "border-slate-100"
                  }`}
                >
                  {r.isUrgent && (
                    <div className="bg-rose-500 text-white text-[11px] font-black text-center py-1 tracking-wide">
                      ⚡ 긴급 매입
                    </div>
                  )}
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <p className="text-[15px] font-black text-slate-800">
                          {r.name ?? r.phone}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5">{r.phone}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${sl.cls}`}>
                        {sl.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">일시</p>
                        <p className="text-[13px] text-slate-700 font-medium">{formatDate(r.date, r.time)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">거래장소</p>
                        <p className="text-[13px] text-slate-700 font-medium">{r.location || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">금액</p>
                        <p className="text-[14px] font-black text-indigo-600">{formatKRW(r.totalPayment)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">종류</p>
                        <p className="text-[13px] text-slate-700 font-medium">{r.kind === "urgent" ? "긴급" : "일반"}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`/staff/chat?id=${r.id}`}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[13px] font-bold text-center hover:bg-indigo-100 transition-colors"
                      >
                        💬 채팅하기
                      </a>
                      {r.status !== "completed" && r.status !== "cancelled" && (
                        <button
                          onClick={() => markComplete(r.id)}
                          disabled={completing === r.id}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                        >
                          {completing === r.id ? "처리중..." : "✓ 완료 처리"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
