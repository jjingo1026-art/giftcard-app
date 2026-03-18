import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminToken, clearAdminToken } from "./AdminLogin";

interface Reservation {
  id: number;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  giftcardType?: string;
  amount?: number;
  totalPayment: number;
  status: string;
}

interface StaffGroup {
  staff: { id: number; name: string; phone: string };
  assigned: Reservation[];
  completed: Reservation[];
}

function fmt(n?: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

function ReservationCard({ r }: { r: Reservation }) {
  return (
    <div
      onClick={() => { location.href = `/admin/detail.html?id=${r.id}`; }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-slate-800">{r.name ?? r.phone}</p>
          {r.giftcardType && <p className="text-[12px] text-slate-400 mt-0.5">{r.giftcardType}</p>}
        </div>
        <div className="text-right">
          <p className="text-[14px] font-black text-indigo-600">{fmt(r.amount || r.totalPayment)}</p>
          {r.date && <p className="text-[11px] text-slate-400 mt-0.5">{r.date} {r.time ?? ""}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminStaffView() {
  const [, navigate] = useLocation();
  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  const [groups, setGroups] = useState<StaffGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Record<number, "assigned" | "completed">>({});

  useEffect(() => {
    fetch("/api/admin/staff/reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); }
        return r.json();
      })
      .then((data: StaffGroup[]) => {
        setGroups(data);
        const initial: Record<number, "assigned" | "completed"> = {};
        data.forEach((g) => { initial[g.staff.id] = "assigned"; });
        setTab(initial);
      })
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  function setStaffTab(staffId: number, t: "assigned" | "completed") {
    setTab((prev) => ({ ...prev, [staffId]: t }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { location.href = "/admin/dashboard.html"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">매입담당자별 예약</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">진행중 · 완료 예약 현황</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {loading && <div className="py-16 text-center text-slate-300 text-[13px]">불러오는 중...</div>}
        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}

        {!loading && groups.map((g) => {
          const currentTab = tab[g.staff.id] ?? "assigned";
          const list = currentTab === "assigned" ? g.assigned : g.completed;

          return (
            <div key={g.staff.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* 담당자 헤더 */}
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[18px]">👨‍🔧</div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-800">{g.staff.name}</p>
                    <p className="text-[12px] text-slate-400">{g.staff.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-semibold">
                  <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">진행 {g.assigned.length}</span>
                  <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">완료 {g.completed.length}</span>
                </div>
              </div>

              {/* 탭 */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setStaffTab(g.staff.id, "assigned")}
                  className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${
                    currentTab === "assigned"
                      ? "text-blue-600 border-b-2 border-blue-500"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  🔵 진행중 ({g.assigned.length})
                </button>
                <button
                  onClick={() => setStaffTab(g.staff.id, "completed")}
                  className={`flex-1 py-2.5 text-[13px] font-bold transition-colors ${
                    currentTab === "completed"
                      ? "text-emerald-600 border-b-2 border-emerald-500"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  ✅ 완료 ({g.completed.length})
                </button>
              </div>

              {/* 예약 목록 */}
              <div className="px-4 py-3 space-y-2">
                {list.length === 0 ? (
                  <p className="text-center text-[13px] text-slate-400 py-6">
                    {currentTab === "assigned" ? "진행중인 예약이 없습니다" : "완료된 예약이 없습니다"}
                  </p>
                ) : (
                  list.map((r) => <ReservationCard key={r.id} r={r} />)
                )}
              </div>
            </div>
          );
        })}

        {!loading && groups.length === 0 && !error && (
          <div className="py-16 text-center text-slate-400 text-[13px]">등록된 매입담당자가 없습니다</div>
        )}
      </div>
    </div>
  );
}
