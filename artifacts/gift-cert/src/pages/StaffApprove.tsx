import { useState, useEffect } from "react";
import { getAdminToken, clearAdminToken, adminFetch } from "./AdminLogin";
import { useLocation } from "wouter";
import { formatPhone } from "@/lib/store";

interface StaffMember { id: number; name: string; phone: string; status: string; }

export default function StaffApprove() {
  const [, navigate] = useLocation();
  const [list, setList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  async function load() {
    setLoading(true);
    const res = await adminFetch("/api/admin/staff/pending");
    setList(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: number) {
    setApproving(id);
    await adminFetch(`/api/admin/staff/${id}/approve`, { method: "POST" });
    setApproving(null);
    load();
  }

  async function reject(id: number) {
    setRejecting(id);
    await adminFetch(`/api/admin/staff/${id}/reject`, { method: "POST" });
    setRejecting(null);
    load();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">매입담당자 승인</h1>
            {!loading && <p className="text-[11px] text-slate-400 mt-0.5">대기 중 {list.length}명</p>}
          </div>
          <button
            onClick={() => { location.href = "/admin/dashboard.html"; }}
            className="text-[12px] text-indigo-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            ← 대시보드
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <h2 className="text-[15px] font-bold text-slate-700">매입담당자 승인</h2>

        {loading && <div className="py-10 text-center text-slate-300 text-[13px]">불러오는 중...</div>}

        {!loading && list.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-[13px]">승인 대기 중인 매입담당자가 없습니다</div>
        )}

        <div id="staffList" className="space-y-2">
          {list.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-slate-800">{s.name}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">{formatPhone(s.phone)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => reject(s.id)}
                  disabled={rejecting === s.id}
                  className="px-4 py-2 rounded-xl bg-rose-100 text-rose-500 text-[13px] font-bold hover:bg-rose-200 transition-colors active:scale-95 disabled:opacity-60"
                >
                  {rejecting === s.id ? "처리 중..." : "거절"}
                </button>
                <button
                  onClick={() => approve(s.id)}
                  disabled={approving === s.id}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[13px] font-bold hover:bg-emerald-600 transition-colors active:scale-95 disabled:opacity-60"
                >
                  {approving === s.id ? "처리 중..." : "승인"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
