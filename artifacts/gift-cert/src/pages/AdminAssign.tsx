import { useState, useEffect } from "react";
import { getAdminToken, clearAdminToken } from "./AdminLogin";

interface ReservationItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

interface Reservation {
  id: number;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location?: string;
  status: string;
  totalPayment: number;
  items: ReservationItem[];
  assignedStaffId?: number;
  assignedTo?: string;
  createdAt: string;
  isUrgent?: boolean;
}

interface Staff {
  id: number;
  name: string;
}

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateKo(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr).getDay()];
  return `${y}년 ${m}월 ${d}일 (${dow})`;
}

function getTypeLabel(items: ReservationItem[]) {
  if (!items || items.length === 0) return "-";
  return [...new Set(items.map((it) => it.type))].join(", ");
}

export default function AdminAssign() {
  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [allData, setAllData] = useState<Reservation[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<Record<number, number>>({});
  const [assigning, setAssigning] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const token = getAdminToken();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    if (!token) { window.location.href = "/admin/login.html"; return; }

    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);

    Promise.all([
      fetch("/api/admin/reservations", { headers }).then((r) => {
        if (r.status === 401) { clearAdminToken(); window.location.href = "/admin/login.html"; throw new Error("401"); }
        return r.json();
      }),
      fetch("/api/admin/staff", { headers }).then((r) => r.json()),
    ])
      .then(([data, staff]) => {
        setAllData(data);
        setStaffList(staff);
      })
      .catch((e) => { if (e.message !== "401") setError("데이터를 불러올 수 없습니다."); })
      .finally(() => setLoading(false));
  }, []);

  const dayRows = allData
    .filter((r) => r.date === selectedDate && (r.status === "pending" || r.status === "assigned"))
    .sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });

  const unassigned = dayRows.filter((r) => r.status === "pending");
  const assigned   = dayRows.filter((r) => r.status === "assigned");

  async function assignStaff(reservationId: number) {
    const staffId = selectedStaff[reservationId];
    if (!staffId) { showToast("담당자를 선택해주세요"); return; }
    setAssigning(reservationId);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) throw new Error();
      const staffName = staffList.find((s) => s.id === staffId)?.name ?? "";
      setAllData((prev) =>
        prev.map((r) =>
          r.id === reservationId
            ? { ...r, status: "assigned", assignedStaffId: staffId, assignedTo: staffName }
            : r
        )
      );
      showToast(`✅ ${staffName} 담당자 배정 완료`);
    } catch {
      showToast("배정에 실패했습니다.");
    } finally {
      setAssigning(null);
    }
  }

  function ReservationCard({ r, showAssign }: { r: Reservation; showAssign: boolean }) {
    return (
      <div
        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
          ${r.isUrgent ? "border-red-200" : "border-slate-100"}`}
      >
        {/* 카드 헤더 */}
        <div className={`flex items-center justify-between px-4 py-2.5 ${r.isUrgent ? "bg-red-50/70" : "bg-slate-50/60"}`}>
          <div className="flex items-center gap-2">
            {r.isUrgent && (
              <span className="text-[9px] font-black bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">긴급</span>
            )}
            <p className={`text-[13px] font-black ${r.isUrgent ? "text-red-600" : "text-slate-700"}`}>
              {r.name ?? r.phone}
            </p>
          </div>
          <button
            onClick={() => { window.location.href = `/admin/detail.html?id=${r.id}`; }}
            className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors"
          >
            상세 →
          </button>
        </div>

        {/* 카드 정보 */}
        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400">연락처</p>
            <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{r.phone}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">거래시간</p>
            <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{r.time ?? "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400">거래장소</p>
            <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{r.location ?? "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] font-bold text-slate-400">상품권 권종</p>
            <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{getTypeLabel(r.items)}</p>
          </div>
          <div className="col-span-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400">매입금액</p>
              <p className="text-[17px] font-black text-emerald-600 mt-0.5">{formatKRW(r.totalPayment)}</p>
            </div>
            {!showAssign && r.assignedTo && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">담당자</p>
                <p className="text-[13px] font-bold text-blue-600 mt-0.5">👨‍🔧 {r.assignedTo}</p>
              </div>
            )}
          </div>
        </div>

        {/* 담당자 배정 (미배정만) */}
        {showAssign && (
          <div className="border-t border-slate-50 px-4 py-3 flex items-center gap-2">
            <select
              value={selectedStaff[r.id] ?? ""}
              onChange={(e) => setSelectedStaff((p) => ({ ...p, [r.id]: Number(e.target.value) }))}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
            >
              <option value="">담당자 선택</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={() => assignStaff(r.id)}
              disabled={assigning === r.id || !selectedStaff[r.id]}
              className={`px-4 py-2 rounded-xl text-[13px] font-black transition-all active:scale-95
                ${selectedStaff[r.id]
                  ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
            >
              {assigning === r.id ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin inline-block" />
                  배정중
                </span>
              ) : "배정"}
            </button>
          </div>
        )}

        {/* 배정완료 → 재배정 */}
        {!showAssign && (
          <div className="border-t border-slate-50 px-4 py-3 flex items-center gap-2">
            <select
              value={selectedStaff[r.id] ?? ""}
              onChange={(e) => setSelectedStaff((p) => ({ ...p, [r.id]: Number(e.target.value) }))}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
            >
              <option value="">재배정 (담당자 변경)</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedStaff[r.id] && (
              <button
                onClick={() => assignStaff(r.id)}
                disabled={assigning === r.id}
                className="px-4 py-2 rounded-xl text-[13px] font-black bg-blue-500 text-white hover:bg-blue-600 shadow-sm shadow-blue-200 transition-all active:scale-95"
              >
                {assigning === r.id ? "변경중" : "변경"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-[13px] font-semibold px-4 py-2.5 rounded-2xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/admin/dashboard.html"; }}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[16px] font-bold text-slate-800">담당자 배정</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">{formatDateKo(selectedDate)}</p>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-[11px] text-slate-400">미배정 <span className="font-black text-amber-500">{unassigned.length}</span>건</p>
              <p className="text-[11px] text-slate-400">배정완료 <span className="font-black text-blue-500">{assigned.length}</span>건</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-16 space-y-4">
        {/* 날짜 선택 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
          <span className="text-[13px] font-bold text-slate-500 flex-shrink-0">📅 날짜</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
          />
          <button
            onClick={() => setSelectedDate(today)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors flex-shrink-0"
          >
            오늘
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[13px] text-rose-500">{error}</div>
        ) : dayRows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-[14px] font-semibold text-slate-400">해당 날짜에 배정 대기 예약이 없습니다</p>
          </div>
        ) : (
          <>
            {/* 미배정 섹션 */}
            {unassigned.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <h2 className="text-[14px] font-black text-slate-700">미배정</h2>
                  <span className="text-[12px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{unassigned.length}건</span>
                </div>
                {unassigned.map((r) => (
                  <ReservationCard key={r.id} r={r} showAssign={true} />
                ))}
              </div>
            )}

            {/* 배정완료 섹션 */}
            {assigned.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <h2 className="text-[14px] font-black text-slate-700">배정 완료</h2>
                  <span className="text-[12px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{assigned.length}건</span>
                </div>
                {assigned.map((r) => (
                  <ReservationCard key={r.id} r={r} showAssign={false} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
