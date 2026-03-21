import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminToken, clearAdminToken, adminFetch } from "./AdminLogin";
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
  const [deleteTarget, setDeleteTarget] = useState<StaffSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/staff-summary").then((r) => r.json()),
      adminFetch("/api/admin/staff").then((r) => r.json()),
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
    adminFetch(`/api/admin/staff/${selectedId}/reservations?status=${activeStatus}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setError("예약 목록을 불러올 수 없습니다."))
      .finally(() => setLoadingList(false));
  }, [selectedId, activeStatus]);

  async function deleteStaff() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/staff/${deleteTarget.id}`, { method: "DELETE" });
      setSummary((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const selected = summary.find((s) => s.id === selectedId);
  const totalAssigned  = summary.reduce((a, s) => a + s.assigned, 0);
  const totalCompleted = summary.reduce((a, s) => a + s.completed, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🗑️</div>
              <p className="text-[17px] font-black text-slate-800">담당자 삭제</p>
              <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
                <span className="font-bold text-slate-700">{deleteTarget.name}</span> 담당자를 삭제하시겠습니까?
              </p>
              {(deleteTarget.assigned > 0) && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2.5">
                  <p className="text-[12px] text-amber-700 font-semibold">
                    ⚠ 진행중인 예약 {deleteTarget.assigned}건이 미배정 상태로 전환됩니다
                  </p>
                </div>
              )}
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-4 text-[15px] font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={deleteStaff}
                disabled={deleting}
                className="flex-1 py-4 text-[15px] font-bold text-rose-500 hover:bg-rose-50 border-l border-slate-100 transition-colors disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div
                    key={s.id}
                    className={`relative text-left rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-200"
                        : "bg-white border-slate-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40"
                    }`}
                  >
                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                      className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors z-10 ${
                        isSelected ? "bg-white/20 hover:bg-white/30 text-white" : "bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500"
                      }`}
                      title="담당자 삭제"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>

                    {/* 카드 본문 (클릭으로 선택) */}
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className="w-full text-left px-4 py-3.5"
                    >
                      <div className="flex items-center justify-between mb-2 pr-5">
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
                  </div>
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
