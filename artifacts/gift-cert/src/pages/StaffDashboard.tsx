import { useState, useEffect } from "react";

interface SavedItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

interface Reservation {
  id: number;
  kind: string;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location: string;
  items: SavedItem[];
  totalPayment: number;
  giftcardType?: string;
  amount?: string | number;
  status: string;
  isUrgent?: boolean;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  pending:   { text: "처리 대기",  cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  assigned:  { text: "배정됨",    cls: "bg-blue-50 text-blue-600 border-blue-200" },
  completed: { text: "완료",      cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  no_show:   { text: "노쇼",      cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(date?: string, time?: string) {
  if (!date) return "날짜 미정";
  const d = new Date(date);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const formatted = `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
  return time ? `${formatted} ${time}` : formatted;
}

function isToday(date?: string) {
  if (!date) return false;
  return date === new Date().toISOString().split("T")[0];
}

function isFuture(date?: string) {
  if (!date) return false;
  return date > new Date().toISOString().split("T")[0];
}

export default function StaffDashboard() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";

  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"upcoming" | "all">("upcoming");
  const [completing, setCompleting] = useState<number | null>(null);
  const [sendingPayment, setSendingPayment] = useState<number | null>(null);
  const [defectModalId, setDefectModalId] = useState<number | null>(null);
  const [defectDetail, setDefectDetail] = useState("");
  const [sendingDefect, setSendingDefect] = useState(false);

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    fetch("/api/admin/staff/my-reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { localStorage.clear(); window.location.href = "/staff/login"; }
        return r.json();
      })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function markComplete(id: number) {
    setCompleting(id);
    try {
      await fetch(`/api/admin/reservations/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setEntries((prev) => prev.map((r) => r.id === id ? { ...r, status: "completed" } : r));
    } finally {
      setCompleting(null);
    }
  }

  async function sendChatMessage(reservationId: number, message: string) {
    await fetch("/api/admin/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, sender: "staff", senderName: staffName, message }),
    });
  }

  async function handlePaymentRequest(r: Reservation) {
    if (!confirm("관리자에게 입금 요청 메시지를 발송하시겠습니까?")) return;
    setSendingPayment(r.id);
    try {
      const amount = r.totalPayment?.toLocaleString("ko-KR") ?? "-";
      const message =
        `💰 입금 요청\n` +
        `──────────────\n` +
        `▸ 은행: ${r.bankName || "-"}\n` +
        `▸ 계좌: ${r.accountNumber || "-"}\n` +
        `▸ 예금주: ${r.accountHolder || "-"}\n` +
        `▸ 입금 금액: ${amount}원\n` +
        `──────────────\n` +
        `확인 후 입금해 주세요.`;
      await sendChatMessage(r.id, message);
    } finally {
      setSendingPayment(null);
    }
  }

  async function handleDefectSubmit() {
    if (!defectModalId || !defectDetail.trim()) return;
    setSendingDefect(true);
    try {
      await sendChatMessage(defectModalId, `⚠️ 일부 하자 안내\n${defectDetail.trim()}\n\n처리 방법에 대해 아래 채팅으로 협의 부탁드립니다.`);
      setDefectModalId(null);
      setDefectDetail("");
    } finally {
      setSendingDefect(false);
    }
  }

  const sorted = [...entries].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? "") || (a.time ?? "").localeCompare(b.time ?? "")
  );

  const upcoming = sorted.filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show" && (isToday(r.date) || isFuture(r.date) || !r.date));
  const displayed = tab === "upcoming" ? upcoming : sorted;

  const grouped: Record<string, Reservation[]> = {};
  displayed.forEach((r) => {
    const key = r.date ?? "날짜 미정";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const todayCount = entries.filter((r) => isToday(r.date) && r.status !== "completed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-black text-slate-800">내 배정 예약</h1>
              {todayCount > 0 && (
                <span className="text-[11px] font-bold text-white bg-rose-500 rounded-full px-2 py-0.5">
                  오늘 {todayCount}건
                </span>
              )}
            </div>
            {!loading && (
              <p className="text-[11px] text-slate-400 mt-0.5">👨‍🔧 {staffName} · 전체 {entries.length}건</p>
            )}
          </div>
          <button
            onClick={() => { localStorage.removeItem("gc_staff_token"); localStorage.removeItem("gc_staff_id"); localStorage.removeItem("gc_staff_name"); window.location.href = "/staff/login"; }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {(["upcoming", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold transition-all ${
                tab === t
                  ? "bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-200"
              }`}
            >
              {t === "upcoming" ? `📅 진행 예정 (${upcoming.length})` : `📋 전체 (${entries.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}
        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}

        {!loading && !error && displayed.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-[14px] font-semibold text-slate-400">
              {tab === "upcoming" ? "진행 예정 예약이 없습니다" : "배정된 예약이 없습니다"}
            </p>
          </div>
        )}

        {Object.keys(grouped).map((date) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              <p className={`text-[12px] font-black px-3 py-1 rounded-xl ${
                isToday(date) ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {isToday(date) ? "오늘" : date === "날짜 미정" ? "날짜 미정" : (() => {
                  const d = new Date(date);
                  const w = ["일","월","화","수","목","금","토"][d.getDay()];
                  return `${d.getMonth()+1}/${d.getDate()} (${w})`;
                })()}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">{grouped[date].length}건</span>
            </div>

            {grouped[date].map((r) => {
              const sl = statusLabel[r.status] ?? { text: r.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    r.isUrgent ? "border-rose-200" : "border-slate-100"
                  }`}
                >
                  {r.isUrgent && (
                    <div className="bg-rose-500 text-white text-[11px] font-black text-center py-1 tracking-wide">
                      ⚡ 긴급 매입
                    </div>
                  )}
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <p className="text-[15px] font-black text-slate-800">
                          {r.name ?? r.phone}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-0.5">{r.phone}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${sl.cls}`}>
                        {sl.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2.5">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">일시</p>
                        <p className="text-[13px] text-slate-700 font-medium">{formatDate(r.date, r.time)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">거래장소</p>
                        <p className="text-[13px] text-slate-700 font-medium">{r.location || "-"}</p>
                      </div>
                    </div>

                    {/* 상품권 정보 */}
                    {(() => {
                      const items: SavedItem[] = Array.isArray(r.items) && r.items.length > 0
                        ? r.items
                        : r.giftcardType
                          ? [{ type: r.giftcardType, amount: Number(r.amount ?? 0), rate: 0, payment: r.totalPayment, isGift: false }]
                          : [];
                      const totalFace = items.reduce((s, it) => s + Number(it.amount), 0);
                      return items.length > 0 ? (
                        <div className="mb-2.5 rounded-xl bg-indigo-50 border border-indigo-100 p-2.5 space-y-1.5">
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-black text-indigo-400 flex-shrink-0">#{i + 1}</span>
                                <span className="text-[12px] font-semibold text-slate-700 truncate">{it.type}</span>
                                {it.isGift && <span className="text-[9px] font-black bg-violet-100 text-violet-500 px-1 py-0.5 rounded-full flex-shrink-0">증정</span>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 text-right">
                                <span className="text-[11px] text-slate-400">{Number(it.amount).toLocaleString("ko-KR")}원</span>
                                <span className="text-[10px] text-indigo-400">→</span>
                                <span className="text-[12px] font-black text-indigo-600">{Number(it.payment).toLocaleString("ko-KR")}원</span>
                              </div>
                            </div>
                          ))}
                          {items.length > 1 && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-indigo-200 mt-1">
                              <span className="text-[11px] font-bold text-slate-500">합계</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">{totalFace.toLocaleString("ko-KR")}원</span>
                                <span className="text-[10px] text-indigo-400">→</span>
                                <span className="text-[13px] font-black text-indigo-700">{r.totalPayment.toLocaleString("ko-KR")}원</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={`/staff/chat?id=${r.id}`}
                          className="py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[13px] font-bold text-center hover:bg-indigo-100 transition-colors"
                        >
                          💬 채팅하기
                        </a>
                        <button
                          onClick={() => handlePaymentRequest(r)}
                          disabled={sendingPayment === r.id}
                          className="py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1"
                          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff" }}
                        >
                          <span>💰</span>
                          {sendingPayment === r.id ? "발송중..." : "입금 요청"}
                        </button>
                        <button
                          onClick={() => { setDefectModalId(r.id); setDefectDetail(""); }}
                          disabled={sendingDefect}
                          className="py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1"
                          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
                        >
                          <span>⚠️</span>
                          일부 하자
                        </button>
                        <button
                          onClick={() => markComplete(r.id)}
                          disabled={completing === r.id}
                          className="py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                        >
                          {completing === r.id ? "처리중..." : "✓ 완료 처리"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        <a
                          href={`/staff/chat?id=${r.id}`}
                          className="flex-1 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[13px] font-bold text-center hover:bg-indigo-100 transition-colors"
                        >
                          💬 채팅하기
                        </a>
                        <div className="flex-1 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-[13px] font-bold text-center">
                          {r.status === "completed" ? "✅ 완료" : r.status === "no_show" ? "🚫 노쇼" : "취소됨"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 일부하자 모달 */}
      {defectModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">⚠️ 일부 하자 안내</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">하자 내용을 입력하면 고객에게 자동 발송됩니다</p>
              </div>
              <button
                onClick={() => { setDefectModalId(null); setDefectDetail(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>
            <textarea
              value={defectDetail}
              onChange={(e) => setDefectDetail(e.target.value)}
              placeholder="예: 신세계 50,000원권 2매에 찢김 발견. 나머지 정상 처리 가능합니다."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 resize-none placeholder:text-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDefectModalId(null); setDefectDetail(""); }}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-[14px] font-bold hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDefectSubmit}
                disabled={!defectDetail.trim() || sendingDefect}
                className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >
                {sendingDefect ? "발송 중…" : "📨 발송하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
