import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { io } from "socket.io-client";
import { getSoundEnabled, playNotificationSound } from "@/lib/notificationSound";
import SoundBell from "@/components/SoundBell";
import { getAdminToken, clearAdminToken, adminFetch } from "./AdminLogin";

interface SavedItem { type: string; amount: number; rate: number; payment: number; isGift: boolean; }

interface MobileReservation {
  id: number;
  kind: string;
  createdAt: string;
  phone: string;
  location: string;
  totalPayment: number;
  status: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  items: SavedItem[];
  note?: string;
  imagePaths?: string[];
}

const STATUS_INFO: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: "처리 대기",  color: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-400" },
  completed: { label: "처리 완료",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "취소",       color: "bg-slate-100 text-slate-500 border-slate-200",     dot: "bg-slate-400" },
  assigned:  { label: "처리 중",    color: "bg-blue-100 text-blue-700 border-blue-200",         dot: "bg-blue-500" },
};

const TYPE_COLORS: Record<string, string> = {
  "신세계모바일": "bg-rose-100 text-rose-700",
  "롯데모바일": "bg-orange-100 text-orange-700",
  "현대모바일": "bg-sky-100 text-sky-700",
  "네이버페이포인트": "bg-green-100 text-green-700",
  "컬쳐랜드": "bg-indigo-100 text-indigo-700",
  "북앤라이프": "bg-violet-100 text-violet-700",
  "문화상품권": "bg-pink-100 text-pink-700",
  "구글기프트카드": "bg-green-100 text-green-700",
};

function getTypeColor(type: string) {
  for (const [key, cls] of Object.entries(TYPE_COLORS)) {
    if (type.startsWith(key) || type.includes(key)) return cls;
  }
  return "bg-slate-100 text-slate-600";
}

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hour}:${min}`;
}

type StatusFilter = "all" | "pending" | "completed" | "cancelled";

export default function AdminMobileDashboard() {
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<MobileReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchPhone, setSearchPhone] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newAlert, setNewAlert] = useState<MobileReservation | null>(null);

  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socket.on("newReservation", (r: MobileReservation) => {
      if (r.kind !== "mobile") return;
      if (getSoundEnabled("admin")) playNotificationSound("admin");
      setEntries((prev) => prev.some((e) => e.id === r.id) ? prev : [r, ...prev]);
      setNewAlert(r);
      setTimeout(() => setNewAlert(null), 8000);
    });
    socket.on("reservationUpdated", (r: MobileReservation) => {
      if (r.kind !== "mobile") return;
      setEntries((prev) => prev.map((e) => e.id === r.id ? { ...e, ...r } : e));
    });
    return () => { socket.disconnect(); };
  }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/reservations?kind=mobile&limit=200");
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, status: "completed" | "cancelled") {
    setUpdatingId(id);
    try {
      await adminFetch(`/api/admin/reservations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = entries.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (searchPhone && !e.phone.includes(searchPhone.replace(/[^0-9]/g, ""))) return false;
    return true;
  });

  const stats = {
    total:     entries.length,
    pending:   entries.filter((e) => e.status === "pending").length,
    completed: entries.filter((e) => e.status === "completed").length,
    cancelled: entries.filter((e) => e.status === "cancelled").length,
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = entries.filter((e) => e.createdAt.startsWith(todayStr)).length;
  const todayPayment = entries
    .filter((e) => e.createdAt.startsWith(todayStr) && e.status === "completed")
    .reduce((s, e) => s + e.totalPayment, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">

      {/* 신규 접수 알림 */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm transition-all duration-500
          ${newAlert ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"}`}
      >
        {newAlert && (
          <div className="bg-violet-600 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => { setExpandedId(newAlert.id); setNewAlert(null); }}>
            <span className="text-2xl flex-shrink-0 animate-bounce">📱</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black leading-tight">모바일상품권 신규 판매 신청!</p>
              <p className="text-[12px] font-semibold opacity-90 mt-0.5 truncate">
                {newAlert.phone} · {formatKRW(newAlert.totalPayment)}
              </p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setNewAlert(null); }}
              className="text-white/70 hover:text-white text-lg flex-shrink-0 leading-none">✕</button>
          </div>
        )}
      </div>

      {/* 헤더 */}
      <header className="bg-white border-b border-violet-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[20px]">📱</span>
            <div>
              <h1 className="text-[16px] font-bold text-slate-800">모바일상품권 관리</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">총 {entries.length}건</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <SoundBell role="admin" />
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-[12px] font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1"
            >
              <span>📄</span> 지류
            </button>
            <button
              onClick={() => { window.location.href = "/admin/settings.html"; }}
              className="text-[12px] text-slate-400 hover:text-slate-700 font-semibold transition-colors px-2 py-1.5 rounded-xl hover:bg-slate-100"
              title="설정"
            >⚙️</button>
            <button
              onClick={() => { clearAdminToken(); navigate("/admin/login"); }}
              className="text-[12px] text-slate-400 hover:text-rose-500 font-semibold transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-50"
            >로그아웃</button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* 오늘 요약 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3.5 shadow-sm">
            <p className="text-[11px] text-violet-500 font-medium flex items-center gap-1">📱 오늘 신청</p>
            <p className="text-[24px] font-black text-violet-700 mt-0.5">{todayCount}<span className="text-[14px] font-bold ml-1">건</span></p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3.5 shadow-sm">
            <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">💰 오늘 입금액</p>
            <p className="text-[18px] font-black text-emerald-700 mt-0.5 tabular-nums">{formatKRW(todayPayment)}</p>
          </div>
        </div>

        {/* 통계 탭 */}
        <div className="grid grid-cols-4 gap-1.5">
          {(["all", "pending", "completed", "cancelled"] as StatusFilter[]).map((s) => {
            const count = s === "all" ? stats.total : stats[s];
            const labels: Record<StatusFilter, string> = { all: "전체", pending: "대기", completed: "완료", cancelled: "취소" };
            const colors: Record<StatusFilter, string> = {
              all: statusFilter === "all" ? "bg-violet-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200",
              pending: statusFilter === "pending" ? "bg-amber-500 text-white shadow-sm" : "bg-white text-amber-600 border border-amber-100",
              completed: statusFilter === "completed" ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-emerald-600 border border-emerald-100",
              cancelled: statusFilter === "cancelled" ? "bg-slate-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200",
            };
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-2 py-2.5 text-center transition-all active:scale-[0.97] ${colors[s]}`}>
                <p className="text-[10px] font-semibold opacity-80">{labels[s]}</p>
                <p className="text-[18px] font-black leading-tight">{count}</p>
              </button>
            );
          })}
        </div>

        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="전화번호로 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">🔍</span>
          {searchPhone && (
            <button onClick={() => setSearchPhone("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">✕</button>
          )}
        </div>

        {/* 새로고침 */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-slate-400">{filtered.length}건 표시</p>
          <button onClick={loadEntries}
            className="text-[12px] text-violet-500 font-bold hover:text-violet-700 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-all flex items-center gap-1">
            🔄 새로고침
          </button>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-block w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin mb-3" />
            <p className="text-[13px]">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-[14px] font-semibold">내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((entry) => {
              const si = STATUS_INFO[entry.status] ?? STATUS_INFO.pending;
              const isExpanded = expandedId === entry.id;
              const isPending = entry.status === "pending" || entry.status === "assigned";
              return (
                <div key={entry.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                    ${isPending ? "border-violet-200" : "border-slate-100"}`}>

                  {/* 카드 헤더 클릭으로 펼치기 */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full text-left px-4 py-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${si.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                            {si.label}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDateTime(entry.createdAt)}</span>
                          <span className="text-[11px] text-slate-500 font-semibold">#{entry.id}</span>
                        </div>
                        <p className="text-[15px] font-black text-slate-800 mt-1.5 tracking-wide">{entry.phone}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {(entry.items ?? []).slice(0, 3).map((item, i) => (
                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>
                              {item.type}
                            </span>
                          ))}
                          {(entry.items ?? []).length > 3 && (
                            <span className="text-[10px] text-slate-400">+{entry.items.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[18px] font-black text-violet-700 tabular-nums">{formatKRW(entry.totalPayment)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{entry.bankName}</p>
                        <p className="text-[10px] text-slate-300 mt-0.5">{isExpanded ? "▲" : "▼"}</p>
                      </div>
                    </div>
                  </button>

                  {/* 펼쳐진 상세 정보 */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/50">

                      {/* 입금 계좌 정보 */}
                      <div className="bg-white rounded-xl border border-slate-100 px-3 py-2.5 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-500">💳 입금 정보</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400">은행</p>
                            <p className="text-[12px] font-bold text-slate-700">{entry.bankName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">계좌번호</p>
                            <p className="text-[12px] font-bold text-slate-700 tabular-nums">{entry.accountNumber}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">예금주</p>
                            <p className="text-[12px] font-bold text-slate-700">{entry.accountHolder}</p>
                          </div>
                        </div>
                      </div>

                      {/* 상품권 목록 */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-500">🎫 판매 상품권</p>
                        {(entry.items ?? []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>{item.type}</span>
                              <span className="text-[12px] text-slate-600 font-semibold tabular-nums">{formatKRW(item.amount)}</span>
                              <span className="text-[10px] text-slate-400">({Math.round(item.rate * 100)}%)</span>
                            </div>
                            <span className="text-[13px] font-black text-violet-700 tabular-nums">{formatKRW(item.payment)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
                          <span className="text-[12px] font-bold text-violet-600">총 입금액</span>
                          <span className="text-[16px] font-black text-violet-700 tabular-nums">{formatKRW(entry.totalPayment)}</span>
                        </div>
                      </div>

                      {/* 메모/번호 */}
                      {entry.note && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                          <p className="text-[11px] font-bold text-amber-600 mb-1">📝 입력 번호 / 메모</p>
                          <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{entry.note}</p>
                        </div>
                      )}

                      {/* 이미지 */}
                      {entry.imagePaths && entry.imagePaths.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-500">🖼️ 첨부 이미지</p>
                          <div className="flex gap-2 flex-wrap">
                            {entry.imagePaths.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] text-blue-600 underline bg-blue-50 px-2 py-1 rounded-lg">
                                이미지 {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      {isPending && (
                        <div className="flex gap-2 pt-1">
                          <button
                            disabled={updatingId === entry.id}
                            onClick={() => updateStatus(entry.id, "completed")}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            {updatingId === entry.id ? "처리 중..." : "✅ 처리 완료"}
                          </button>
                          <button
                            disabled={updatingId === entry.id}
                            onClick={() => updateStatus(entry.id, "cancelled")}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-bold hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            ✕ 취소
                          </button>
                        </div>
                      )}
                      {!isPending && (
                        <div className={`py-2 rounded-xl text-center text-[12px] font-bold
                          ${entry.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                          {entry.status === "completed" ? "✅ 처리 완료됨" : "취소된 건"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
