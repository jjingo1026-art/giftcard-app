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
  assignedStaffId?: number;
}

interface StaffMember {
  id: number;
  name: string;
  phone: string;
}

function fmt(n?: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

const STATUS_CHIP: Record<string, string> = {
  assigned:  "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};
const STATUS_LABEL: Record<string, string> = {
  assigned:  "진행중",
  completed: "완료",
};

function ReservationCard({ r }: { r: Reservation }) {
  return (
    <div
      onClick={() => { location.href = `/admin/detail.html?id=${r.id}`; }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] text-slate-400 font-medium">
          {r.date ? `📅 ${r.date} ${r.time ?? ""}` : `#${r.id}`}
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
        <p className="text-[14px] font-black text-indigo-600">{fmt(r.amount || r.totalPayment)}</p>
      </div>
    </div>
  );
}

export default function AdminStaffView() {
  const [, navigate] = useLocation();
  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [activeStatus, setActiveStatus] = useState<"assigned" | "completed">("assigned");
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 승인된 매입담당자 목록 불러오기
  useEffect(() => {
    fetch("/api/admin/staff", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); }
        return r.json();
      })
      .then((data: StaffMember[]) => {
        const approved = data.filter((s: any) => s.status === "approved" || s.status === undefined);
        setStaffList(approved);
        if (approved.length > 0) setSelectedStaffId(String(approved[0].id));
      })
      .catch(() => setError("담당자 목록을 불러올 수 없습니다."));
  }, []);

  // 선택된 담당자 + 상태로 예약 불러오기
  function load(staffId: string, status: "assigned" | "completed") {
    if (!staffId) return;
    setLoading(true);
    setError("");
    fetch(`/api/admin/staff/${staffId}/reservations?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { clearAdminToken(); navigate("/admin/login"); }
        return r.json();
      })
      .then((data) => setList(data))
      .catch(() => setError("예약 목록을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }

  // 담당자 또는 상태 변경 시 자동 조회
  useEffect(() => {
    if (selectedStaffId) load(selectedStaffId, activeStatus);
  }, [selectedStaffId, activeStatus]);

  function handleStaffChange(id: string) {
    setSelectedStaffId(id);
  }

  function handleStatusChange(status: "assigned" | "completed") {
    setActiveStatus(status);
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
            <h1 className="text-[16px] font-bold text-slate-800">매입담당자별 예약 관리</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">담당자 선택 후 조회</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* 컨트롤: 담당자 선택 + 상태 버튼 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 space-y-3">
          {/* 담당자 드롭다운 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">매입담당자</label>
            <select
              value={selectedStaffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-slate-50 appearance-none"
            >
              {staffList.length === 0 && <option value="">담당자 없음</option>}
              {staffList.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 상태 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange("assigned")}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
                activeStatus === "assigned"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              🔵 진행중
            </button>
            <button
              onClick={() => handleStatusChange("completed")}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
                activeStatus === "completed"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              ✅ 완료
            </button>
          </div>
        </div>

        {/* 예약 목록 */}
        <div className="space-y-2">
          {loading && (
            <div className="py-10 text-center text-slate-300 text-[13px]">불러오는 중...</div>
          )}
          {error && (
            <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>
          )}
          {!loading && !error && list.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-[13px]">
              {activeStatus === "assigned" ? "진행중인 예약이 없습니다" : "완료된 예약이 없습니다"}
            </div>
          )}
          {!loading && list.map((r) => <ReservationCard key={r.id} r={r} />)}
        </div>
      </div>
    </div>
  );
}
