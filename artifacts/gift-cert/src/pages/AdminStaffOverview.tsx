import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminToken, clearAdminToken, adminFetch } from "./AdminLogin";

interface StaffMember {
  id: number;
  name: string;
  phone: string;
  preferredLocation: string | null;
  assigned: number;
  completed: number;
  total: number;
}

export default function AdminStaffOverview() {
  const [, navigate] = useLocation();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "region">("all");

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  useEffect(() => {
    adminFetch("/api/admin/staff-overview")
      .then((r) => r.json())
      .then((data) => { setStaff(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grouped = staff.reduce<Record<string, StaffMember[]>>((acc, s) => {
    const key = s.preferredLocation?.trim() || "지역 미설정";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const regionKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "지역 미설정") return 1;
    if (b === "지역 미설정") return -1;
    return a.localeCompare(b, "ko");
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ← 뒤로
            </button>
            <h1 className="text-[16px] font-black text-slate-800">👨‍🔧 매입담당자 전체현황</h1>
          </div>
          <span className="text-[12px] text-slate-400 font-semibold">총 {staff.length}명</span>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab("all")}
            className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${
              tab === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            전체 리스트
          </button>
          <button
            onClick={() => setTab("region")}
            className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all ${
              tab === "region"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            지역별 리스트
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center">
            <p className="text-[32px] mb-3">👨‍🔧</p>
            <p className="text-[14px] font-bold text-slate-600">승인된 매입담당자가 없습니다</p>
          </div>
        ) : tab === "all" ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-4 bg-slate-50 px-4 py-2.5 text-[11px] font-black text-slate-500 border-b border-slate-100">
                <span className="col-span-2">이름 / 거래희망지역</span>
                <span className="text-center">진행</span>
                <span className="text-center">완료</span>
              </div>
              {staff.map((s, i) => (
                <div
                  key={s.id}
                  className={`grid grid-cols-4 px-4 py-3.5 items-center ${
                    i < staff.length - 1 ? "border-b border-slate-50" : ""
                  }`}
                >
                  <div className="col-span-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[13px] flex-shrink-0">
                        👨‍🔧
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-800 truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {s.preferredLocation ? `📍 ${s.preferredLocation}` : "📍 지역 미설정"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`inline-block text-[12px] font-black px-2 py-0.5 rounded-full ${
                      s.assigned > 0 ? "bg-blue-100 text-blue-700" : "text-slate-300"
                    }`}>
                      {s.assigned}건
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`inline-block text-[12px] font-black px-2 py-0.5 rounded-full ${
                      s.completed > 0 ? "bg-emerald-100 text-emerald-700" : "text-slate-300"
                    }`}>
                      {s.completed}건
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] font-bold text-indigo-700">전체 합계</span>
              <div className="flex gap-3 text-[12px] font-black">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  진행 {staff.reduce((s, m) => s + m.assigned, 0)}건
                </span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                  완료 {staff.reduce((s, m) => s + m.completed, 0)}건
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {regionKeys.map((region) => {
              const members = grouped[region];
              const totalAssigned = members.reduce((s, m) => s + m.assigned, 0);
              const totalCompleted = members.reduce((s, m) => s + m.completed, 0);
              return (
                <div key={region} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px]">📍</span>
                      <span className="text-[14px] font-black text-indigo-800">{region}</span>
                      <span className="text-[11px] font-bold text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full">
                        {members.length}명
                      </span>
                    </div>
                    <div className="flex gap-2 text-[11px] font-black">
                      <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">진행 {totalAssigned}건</span>
                      <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">완료 {totalCompleted}건</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {members.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[14px] flex-shrink-0">
                            👨‍🔧
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-800">{s.name}</p>
                            <p className="text-[11px] text-slate-400">{s.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[11px] font-black flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full ${
                            s.assigned > 0 ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                          }`}>
                            진행 {s.assigned}건
                          </span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            s.completed > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                          }`}>
                            완료 {s.completed}건
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] font-bold text-indigo-700">전체 합계</span>
              <div className="flex gap-3 text-[12px] font-black">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  진행 {staff.reduce((s, m) => s + m.assigned, 0)}건
                </span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                  완료 {staff.reduce((s, m) => s + m.completed, 0)}건
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
