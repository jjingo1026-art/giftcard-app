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
}

const statusText: Record<string, string> = {
  pending:   "🟡 예약",
  assigned:  "🟠 배정",
  completed: "🟢 완료",
};

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

export default function StaffDashboard() {
  const token = sessionStorage.getItem("gc_staff_token");
  const staffName = sessionStorage.getItem("gc_staff_name") ?? "매입담당자";

  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { location.href = "/staff/login.html"; return; }
    fetch("/api/admin/staff/my-reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { sessionStorage.clear(); location.href = "/staff/login.html"; }
        return r.json();
      })
      .then(setEntries)
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  // 날짜별 그룹
  const grouped: Record<string, Reservation[]> = {};
  [...entries]
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || (a.time ?? "").localeCompare(b.time ?? ""))
    .forEach((r) => {
      const key = r.date ?? "날짜 미정";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">내 배정 예약</h1>
            {!loading && <p className="text-[11px] text-slate-400 mt-0.5">👤 {staffName} · 총 {entries.length}건</p>}
          </div>
          <button
            onClick={() => { sessionStorage.clear(); location.href = "/staff/login.html"; }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <h2 className="text-[15px] font-bold text-slate-700">📋 선택 날짜 예약 리스트</h2>

        {loading && <div className="py-10 text-center text-slate-300 text-[13px]">불러오는 중...</div>}
        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}
        {!loading && !error && entries.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-[13px]">배정된 예약이 없습니다</div>
        )}

        {Object.keys(grouped).map((date) => (
          <div key={date}>
            <p className="text-[12px] font-bold text-slate-400 px-1 mb-1">📅 {date}</p>
            <div className="space-y-2">
              {grouped[date].map((r) => (
                <div
                  key={r.id}
                  onClick={() => { location.href = `/staff/chat.html?id=${r.id}`; }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors active:scale-[0.99]"
                >
                  <p className="text-[14px] font-semibold text-slate-800">📅 {r.date} {r.time}</p>
                  <p className="text-[14px] text-slate-700 mt-0.5">👤 {r.name ?? r.phone}</p>
                  <p className="text-[14px] text-slate-700">💰 {formatKRW(r.totalPayment)}</p>
                  <div className="mt-2 flex justify-end">
                    <a
                      href={`/staff/chat.html?id=${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-700"
                    >
                      💬 채팅하기
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
