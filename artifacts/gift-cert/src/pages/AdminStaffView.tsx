import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminToken, clearAdminToken } from "./AdminLogin";
import { formatDateKo } from "@/lib/store";

interface StaffSummary {
  id: number;
  name: string;
  assigned: number;
  completed: number;
  phone?: string;
  preferredLocation?: string;
}

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
  isUrgent?: boolean;
}

function fmt(n?: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

const STATUS_CHIP: Record<string, string> = {
  assigned:  "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  pending:   "bg-yellow-100 text-yellow-700",
  cancelled: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = {
  assigned:  "진행중",
  completed: "완료",
  pending:   "대기",
  cancelled: "취소",
};

function ReservationCard({ r }: { r: Reservation }) {
  return (
    <div
      onClick={() => { window.location.href = `/admin/detail?id=${r.id}`; }}
      className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all active:scale-[0.99] ${r.isUrgent ? "border-rose-200" : "border-slate-100"}`}
    >
      {r.isUrgent && (
        <div className="text-[10px] font-black text-rose-500 mb-1.5">⚡ 긴급</div>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] text-slate-400 font-medium">
          {r.date ? `📅 ${formatDateKo(r.date, r.time)}` : `#${r.id}`}
        </p>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_CHIP[r.status] ?? "bg-slate-100 text-slate-500"}`}>
          {STATUS_LABEL[r.status] ?? r.status}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-slate-800">{r.name ?? r.phone}</p>
          {r.giftcardType && <p className="text-[11px] text-slate-400 mt-0.5">{r.giftcardType}</p>}
        </div>
        <p className="text-[15px] font-black text-indigo-600">{fmt(r.amount || r.totalPayment)}</p>
      </div>
    </div>
  );
}

export default function AdminStaffView() {
  const [, navigate] = useLocation();
  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  const [summary, setSummary] = useState<StaffSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState<"assigned" | "completed">("assigned");
  const [list, setList] = useState<Reservation[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/staff-summary", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => { if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); } return r.json(); }),
      fetch("/api/admin/staff", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()),
    ])
      .then(([summaryData, staffData]: [StaffSummary[], any[]]) => {
        const merged = summaryData.map((s) => {
          const full = staffData.find((f: any) => f.id === s.id);
          return { ...s, phone: full?.phone, preferredLocation: full?.preferredLocation };
        });
        setSummary(merged);
        if (merged.length > 0) setSelectedId(merged[0].id);
      })
      .catch(() => setError("담당자 목록을 불러올 수 없습니다."))
      .finally(() => setLoadingSummary(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingList(true);
    setList([]);
    fetch(`/api/admin/staff/${selectedId}/reservations?status=${activeStatus}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); } return r.json(); })
      .then(setList)
      .catch(() => setError("예약 목록을 불러올 수 없습니다."))
      .finally(() => setLoadingList(false));
  }, [selectedId, activeStatus]);

  const selected = summary.find((s) => s.id === selectedId);
  const totalAssigned  = summary.reduce((a, s) => a + s.assigned, 0);
  const totalCompleted = summary.reduce((a, s) => a + s.completed, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/admin/dashboard"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">매입담당자별 예약 관리</h1>
            {!loadingSummary && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                총 {summary.length}명 · 진행중 {totalAssigned}건 · 완료 {totalCompleted}건
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* 전체 담당자 한눈에 보기 */}
        {loadingSummary ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : summary.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-[14px] font-semibold text-slate-400">승인된 매입담당자가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {summary.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`text-left rounded-2xl border px-4 py-3.5 transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-200"
                        : "bg-white border-slate-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[14px] ${isSelected ? "bg-white/20" : "bg-indigo-50"}`}>
                        👨‍🔧
                      </div>
                      {s.assigned > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"}`}>
                          {s.assigned}건
                        </span>
                      )}
                    </div>
                    <p className={`text-[14px] font-black truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                      {s.name}
                    </p>
                    {s.preferredLocation && (
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                        📍 {s.preferredLocation}
                      </p>
                    )}
                    <div className={`flex gap-2 mt-2 text-[11px] font-bold ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                      <span>진행 {s.assigned}</span>
                      <span className={isSelected ? "text-white/40" : "text-slate-200"}>|</span>
                      <span>완료 {s.completed}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 선택된 담당자 예약 목록 */}
            {selected && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-black text-slate-800">👨‍🔧 {selected.name}의 예약</h2>
                    {selected.phone && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{selected.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveStatus("assigned")}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                        activeStatus === "assigned"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-500 hover:border-blue-200"
                      }`}
                    >
                      진행중 {activeStatus === "assigned" ? `(${list.length})` : ""}
                    </button>
                    <button
                      onClick={() => setActiveStatus("completed")}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                        activeStatus === "completed"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-500 hover:border-emerald-200"
                      }`}
                    >
                      완료 {activeStatus === "completed" ? `(${list.length})` : ""}
                    </button>
                  </div>
                </div>

                {loadingList && (
                  <div className="py-8 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                  </div>
                )}
                {error && <div className="py-4 text-center text-rose-500 text-[13px]">{error}</div>}
                {!loadingList && !error && list.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-2xl mb-2">📭</p>
                    <p className="text-[13px] font-semibold text-slate-400">
                      {activeStatus === "assigned" ? "진행중인 예약이 없습니다" : "완료된 예약이 없습니다"}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {!loadingList && list.map((r) => <ReservationCard key={r.id} r={r} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
