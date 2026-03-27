import { useState, useEffect, useCallback } from "react";
import { adminFetch, clearAdminToken } from "@/lib/adminAuth";

interface NoShowUser {
  id: string;
  name: string | null;
  noShowCount: number;
  isBlocked: boolean;
  blockedUntil: string | null;
  updatedAt: string;
  recentNoshows: { id: number; date: string; giftcardType: string | null; createdAt: string }[];
}

interface NoShowReservation {
  id: number;
  name: string | null;
  phone: string | null;
  date: string | null;
  giftcardType: string | null;
  amount: number | null;
  type: string | null;
  createdAt: string;
}

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
}

function fmtDate(ds: string | null) {
  if (!ds) return "-";
  const d = new Date(ds);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtDateTime(ds: string | null) {
  if (!ds) return "-";
  return new Date(ds).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function BlockStatus({ user }: { user: NoShowUser }) {
  if (!user.isBlocked) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">정상</span>;
  if (!user.blockedUntil) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">영구 차단</span>;
  const until = new Date(user.blockedUntil);
  const now = new Date();
  if (until <= now) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">차단 만료</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">임시차단 ~{fmtDate(user.blockedUntil)}</span>;
}

function NoShowBadge({ count }: { count: number }) {
  if (count === 0) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-400">0회</span>;
  if (count === 1) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700">{count}회</span>;
  if (count === 2) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">{count}회</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">{count}회</span>;
}

export default function AdminNoShow() {
  const [tab, setTab] = useState<"users" | "reservations">("users");
  const [users, setUsers] = useState<NoShowUser[]>([]);
  const [reservations, setReservations] = useState<NoShowReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [blockDaysInput, setBlockDaysInput] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{ userId: string; type: string; label: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/noshow/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/noshow/reservations");
      if (res.ok) setReservations(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchReservations();
  }, [fetchUsers, fetchReservations]);

  async function doAction(userId: string, action: string, body?: object) {
    setActionLoading(userId + action);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "오류가 발생했습니다.");
      }
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;
    const { userId, type } = confirmAction;
    if (type === "block") doAction(userId, "block");
    else if (type === "unblock") doAction(userId, "unblock");
    else if (type === "reset") doAction(userId, "reset-noshow");
    else if (type === "perm-block") doAction(userId, "block");
    else if (type.startsWith("days-")) {
      const days = parseInt(blockDaysInput[userId] ?? "5");
      doAction(userId, "block-days", { days });
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const s = search.replace(/-/g, "");
    return u.id.replace(/-/g, "").includes(s) || (u.name ?? "").includes(search);
  });

  const blockedCount = users.filter((u) => u.isBlocked && !u.blockedUntil).length;
  const tempBlockedCount = users.filter((u) => u.isBlocked && !!u.blockedUntil).length;
  const totalNoShowCount = users.reduce((sum, u) => sum + u.noShowCount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => history.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-slate-800">노쇼 관리</h1>
            <p className="text-[11px] text-slate-400">No-Show 이력 · 사용자 차단 관리</p>
          </div>
          <button
            onClick={() => { clearAdminToken(); location.href = "/admin/login"; }}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 text-center">
            <div className="text-[24px] font-black text-amber-500">{totalNoShowCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">총 노쇼 횟수</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 text-center">
            <div className="text-[24px] font-black text-orange-500">{tempBlockedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">임시 차단</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 text-center">
            <div className="text-[24px] font-black text-red-600">{blockedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">영구 차단</div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1">
          <button
            onClick={() => setTab("users")}
            className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors ${tab === "users" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            노쇼 사용자 ({users.length})
          </button>
          <button
            onClick={() => setTab("reservations")}
            className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors ${tab === "reservations" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            노쇼 예약 ({reservations.length})
          </button>
        </div>

        {/* === 탭: 사용자 목록 === */}
        {tab === "users" && (
          <div className="space-y-3">
            {/* 검색 */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="전화번호 또는 이름으로 검색"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-indigo-400 bg-white shadow-sm"
            />

            {loading && <p className="text-center text-[13px] text-slate-400 py-6">불러오는 중…</p>}

            {!loading && filteredUsers.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-10 text-center">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-[14px] font-semibold text-slate-600">노쇼 이력이 없습니다</p>
                <p className="text-[12px] text-slate-400 mt-1">등록된 노쇼 사용자가 없습니다.</p>
              </div>
            )}

            {filteredUsers.map((user) => {
              const isExpanded = expandedUser === user.id;
              const isLoading = actionLoading?.startsWith(user.id);
              return (
                <div key={user.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* 사용자 헤더 */}
                  <div
                    className="px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-slate-800">{user.name ?? "이름 없음"}</span>
                        <NoShowBadge count={user.noShowCount} />
                        <BlockStatus user={user} />
                      </div>
                      <div className="text-[12px] text-slate-500 mt-1">{maskPhone(user.id)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">최근 업데이트: {fmtDateTime(user.updatedAt)}</div>
                    </div>
                    <span className="text-slate-400 text-[14px] mt-1">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {/* 확장 패널 */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">

                      {/* 최근 노쇼 예약 */}
                      {user.recentNoshows.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">최근 노쇼 예약</p>
                          <div className="space-y-1.5">
                            {user.recentNoshows.map((ns) => (
                              <div key={ns.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2">
                                <div>
                                  <span className="text-[12px] font-semibold text-slate-700">#{ns.id}</span>
                                  <span className="text-[11px] text-slate-400 ml-2">{ns.giftcardType ?? "상품권"}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-[11px] text-slate-500">{ns.date ? fmtDate(ns.date) : fmtDate(ns.createdAt)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">관리 액션</p>
                        <div className="flex flex-wrap gap-2">
                          {user.isBlocked ? (
                            <button
                              disabled={!!isLoading}
                              onClick={() => setConfirmAction({ userId: user.id, type: "unblock", label: "차단을 해제하시겠습니까?" })}
                              className="px-3 py-2 rounded-xl text-[12px] font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-40"
                            >
                              🔓 차단 해제
                            </button>
                          ) : (
                            <button
                              disabled={!!isLoading}
                              onClick={() => setConfirmAction({ userId: user.id, type: "perm-block", label: "영구 차단하시겠습니까?" })}
                              className="px-3 py-2 rounded-xl text-[12px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-40"
                            >
                              🔒 영구 차단
                            </button>
                          )}

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={blockDaysInput[user.id] ?? "5"}
                              onChange={(e) => setBlockDaysInput((prev) => ({ ...prev, [user.id]: e.target.value }))}
                              className="w-16 px-2 py-2 rounded-xl border border-slate-200 text-[12px] text-center outline-none focus:border-indigo-400"
                            />
                            <span className="text-[12px] text-slate-500">일</span>
                            <button
                              disabled={!!isLoading}
                              onClick={() => setConfirmAction({ userId: user.id, type: `days-${blockDaysInput[user.id] ?? 5}`, label: `${blockDaysInput[user.id] ?? 5}일 임시 차단하시겠습니까?` })}
                              className="px-3 py-2 rounded-xl text-[12px] font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-40"
                            >
                              ⏱ 임시 차단
                            </button>
                          </div>

                          <button
                            disabled={!!isLoading}
                            onClick={() => setConfirmAction({ userId: user.id, type: "reset", label: "노쇼 횟수를 초기화하고 차단을 해제하시겠습니까?" })}
                            className="px-3 py-2 rounded-xl text-[12px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
                          >
                            🔄 초기화
                          </button>
                        </div>
                        {isLoading && <p className="text-[11px] text-indigo-500 mt-2">처리 중…</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* === 탭: 노쇼 예약 목록 === */}
        {tab === "reservations" && (
          <div className="space-y-3">
            {loading && <p className="text-center text-[13px] text-slate-400 py-6">불러오는 중…</p>}

            {!loading && reservations.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-10 text-center">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-[14px] font-semibold text-slate-600">노쇼 예약이 없습니다</p>
              </div>
            )}

            {reservations.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-bold text-slate-700">#{r.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">노쇼</span>
                      {r.type === "urgent" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">급매</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-slate-800">{r.name ?? "이름 없음"}</span>
                      {r.phone && <span className="text-[12px] text-slate-500">{maskPhone(r.phone)}</span>}
                    </div>
                    {r.giftcardType && (
                      <div className="text-[12px] text-slate-500 mt-0.5">
                        {r.giftcardType}
                        {r.amount ? ` · ${r.amount.toLocaleString("ko-KR")}원` : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-semibold text-slate-600">
                      {r.date ? fmtDate(r.date) : fmtDate(r.createdAt)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">신청: {fmtDateTime(r.createdAt)}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <a
                    href={`/admin/detail/${r.id}`}
                    className="text-[12px] text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                  >
                    상세 보기 →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 확인 모달 */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs px-6 py-6 space-y-4">
            <p className="text-[15px] font-bold text-slate-800 text-center">{confirmAction.label}</p>
            <p className="text-[12px] text-slate-500 text-center">{maskPhone(confirmAction.userId)}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl text-[13px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl text-[13px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
