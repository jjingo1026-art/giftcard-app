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

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:   { text: "대기중",  cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  assigned:  { text: "배정됨", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  completed: { text: "완료",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  no_show:   { text: "노쇼",   cls: "bg-slate-100 text-slate-500 border-slate-200" },
  cancelled: { text: "취소",   cls: "bg-rose-50 text-rose-400 border-rose-100" },
};

function weekday(date: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
}

function formatDateFull(date?: string, time?: string) {
  if (!date) return "날짜 미정";
  const d = new Date(date);
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday(date)})`;
  return time ? `${label} ${time}` : label;
}

function formatPhone(p: string) {
  return p.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

export default function StaffCard() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";
  const id = new URLSearchParams(window.location.search).get("id");

  const [r, setR] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [noShowing, setNoShowing] = useState(false);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  const [defectModal, setDefectModal] = useState(false);
  const [defectDetail, setDefectDetail] = useState("");
  const [sendingDefect, setSendingDefect] = useState(false);

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    if (!id) { window.location.href = "/staff/dashboard"; return; }
    fetch("/api/admin/staff/my-reservations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { localStorage.clear(); window.location.href = "/staff/login"; }
        return res.json();
      })
      .then((data: Reservation[]) => {
        const found = Array.isArray(data) ? data.find((x) => String(x.id) === id) : null;
        setR(found ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function sendChatMessage(message: string) {
    await fetch("/api/admin/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: Number(id), sender: "staff", senderName: staffName, message }),
    });
  }

  async function markComplete() {
    if (!r || !confirm("완료 처리하시겠습니까?")) return;
    setCompleting(true);
    try {
      await fetch(`/api/admin/reservations/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setR((prev) => prev ? { ...prev, status: "completed" } : prev);
    } finally {
      setCompleting(false);
    }
  }

  async function markNoShow() {
    if (!r || !confirm("노쇼 처리하시겠습니까?")) return;
    setNoShowing(true);
    try {
      await fetch(`/api/admin/reservations/${id}/status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no_show" }),
      });
      setR((prev) => prev ? { ...prev, status: "no_show" } : prev);
    } finally {
      setNoShowing(false);
    }
  }

  async function handlePaymentRequest() {
    if (!r) return;
    setSendingPayment(true);
    try {
      const name = r.name || r.phone;
      const staffName = localStorage.getItem("gc_staff_name") || "-";
      const amount = (r.totalPayment ?? 0).toLocaleString("ko-KR");
      const bank = r.bankName || "-";
      const account = r.accountNumber || "-";
      const holder = r.accountHolder || "-";
      const message =
        `매입담당자 ${staffName}\n` +
        `💰 입금 요청 — ${name}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏦 은행: ${bank}\n` +
        `📋 계좌번호: ${account}\n` +
        `👤 예금주: ${holder}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 입금 금액: ${amount}원\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `판매자 계좌로 위 금액을 입금해 주세요.`;
      await sendChatMessage(message);
      setPaymentSent(true);
      setTimeout(() => setPaymentSent(false), 3000);
    } finally {
      setSendingPayment(false);
    }
  }

  async function handleDefectSubmit() {
    if (!defectDetail.trim()) return;
    setSendingDefect(true);
    try {
      await sendChatMessage(`⚠️ 일부 하자 안내\n${defectDetail.trim()}\n\n처리 방법에 대해 아래 채팅으로 협의 부탁드립니다.`);
      setDefectModal(false);
      setDefectDetail("");
    } finally {
      setSendingDefect(false);
    }
  }

  const isActive = r ? !["completed", "cancelled", "no_show"].includes(r.status) : false;

  const items: { type: string; amount: number; payment: number }[] =
    r && Array.isArray(r.items) && r.items.length > 0
      ? r.items
      : r?.giftcardType
        ? [{ type: r.giftcardType, amount: Number(r.amount ?? 0), payment: r.totalPayment }]
        : [];
  const totalFace = items.reduce((s, it) => s + Number(it.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/staff/dashboard"; }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-slate-800">예약 상세카드</h1>
            {r && (
              <p className="text-[11px] text-slate-400 mt-0.5">#{r.id} · {r.name || r.phone}</p>
            )}
          </div>
        </div>
      </header>

      <div className={`max-w-2xl mx-auto px-4 py-4 ${isActive ? "pb-28" : "pb-8"}`}>
        {loading && (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}

        {!loading && !r && (
          <div className="py-20 text-center">
            <p className="text-[14px] text-slate-400">예약 정보를 찾을 수 없습니다.</p>
            <button
              onClick={() => { window.location.href = "/staff/dashboard"; }}
              className="mt-4 text-[13px] text-indigo-500 font-bold"
            >← 목록으로 돌아가기</button>
          </div>
        )}

        {!loading && r && (
          <div className="space-y-3">
            {/* 긴급 배너 */}
            {r.isUrgent && (
              <div className="bg-rose-500 text-white text-[13px] font-black text-center py-2.5 rounded-2xl tracking-wide">
                ⚡ 긴급 매입 요청
              </div>
            )}

            {/* 기본 정보 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              {/* 상태 + 이름 */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[18px] font-black text-slate-800">{r.name || "이름 미입력"}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">{formatPhone(r.phone)}</p>
                </div>
                {(() => {
                  const sl = STATUS_LABEL[r.status] ?? { text: r.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
                  return (
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${sl.cls}`}>
                      {sl.text}
                    </span>
                  );
                })()}
              </div>

              <div className="h-px bg-slate-100" />

              {/* 일시 / 장소 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">일시</p>
                  <p className="text-[13px] font-bold text-slate-700">{formatDateFull(r.date, r.time)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">거래장소</p>
                  <p className="text-[13px] font-bold text-slate-700">{r.location || "-"}</p>
                </div>
              </div>
            </div>

            {/* 상품권 테이블 */}
            {items.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-black text-slate-500 px-4 py-2.5">권종</p>
                  <p className="text-[11px] font-black text-slate-500 px-2 py-2.5 text-right">액면금액</p>
                  <p className="text-[11px] font-black text-slate-500 px-4 py-2.5 text-right">입금금액</p>
                </div>
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-3 border-b border-slate-50">
                    <p className="text-[13px] text-slate-700 px-4 py-2.5">{it.type}</p>
                    <p className="text-[13px] font-bold text-slate-700 px-2 py-2.5 text-right">
                      {Number(it.amount).toLocaleString()}
                    </p>
                    <p className="text-[13px] font-bold text-indigo-600 px-4 py-2.5 text-right">
                      {Number(it.payment).toLocaleString()}
                    </p>
                  </div>
                ))}
                {items.length > 1 && (
                  <div className="grid grid-cols-3 bg-indigo-50">
                    <p className="text-[12px] font-black text-indigo-700 px-4 py-2.5">합계</p>
                    <p className="text-[12px] font-black text-indigo-700 px-2 py-2.5 text-right">
                      {totalFace.toLocaleString()}
                    </p>
                    <p className="text-[12px] font-black text-indigo-700 px-4 py-2.5 text-right">
                      {r.totalPayment?.toLocaleString() ?? "-"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 입금계좌 */}
            {(r.bankName || r.accountNumber) && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 mb-1">입금 계좌</p>
                  <p className="text-[14px] font-bold text-slate-800">
                    {r.bankName} <span className="text-slate-500 font-medium">{r.accountNumber}</span>
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">예금주: {r.accountHolder}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(r.accountNumber)}
                  className="flex-shrink-0 text-[12px] font-bold text-emerald-600 bg-white hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                >복사</button>
              </div>
            )}

            {/* 채팅 + 완료처리 버튼 */}
            <div className="space-y-2 pt-1">
              <a
                href={`/staff/chat?id=${r.id}`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-[15px] font-black text-white shadow-md active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
              >
                💬 채팅하기
              </a>
              {isActive ? (
                <button
                  onClick={markComplete}
                  disabled={completing}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-[14px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60 active:scale-95"
                >
                  {completing ? "처리 중..." : "✅ 완료처리"}
                </button>
              ) : (
                <div className={`py-3 rounded-2xl text-[13px] font-bold text-center ${
                  r.status === "completed"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : r.status === "no_show"
                      ? "bg-rose-50 text-rose-500 border border-rose-100"
                      : "bg-slate-50 text-slate-400 border border-slate-100"
                }`}>
                  {r.status === "completed" ? "✅ 매입 완료" : r.status === "no_show" ? "🚫 노쇼 처리됨" : "취소됨"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 입금요청 발송 완료 토스트 */}
      {paymentSent && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-[13px] font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
          ✅ 입금 요청이 채팅으로 발송되었습니다
        </div>
      )}

      {/* 하단 고정 바 — 입금요청 / 일부하자 / 노쇼 */}
      {!loading && r && isActive && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handlePaymentRequest}
                disabled={sendingPayment}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-0.5"
                style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff" }}
              >
                <span className="text-[16px]">💰</span>
                <span>{sendingPayment ? "발송중" : "입금요청"}</span>
              </button>
              <button
                onClick={() => { setDefectModal(true); setDefectDetail(""); }}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 flex flex-col items-center gap-0.5"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
              >
                <span className="text-[16px]">⚠️</span>
                <span>일부하자</span>
              </button>
              <button
                onClick={markNoShow}
                disabled={noShowing}
                className="py-3.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-0.5"
                style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)", color: "#fff" }}
              >
                <span className="text-[16px]">🚫</span>
                <span>{noShowing ? "처리중" : "노쇼"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일부하자 모달 */}
      {defectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">⚠️ 일부 하자 안내</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">하자 내용을 입력하면 채팅으로 발송됩니다</p>
              </div>
              <button
                onClick={() => { setDefectModal(false); setDefectDetail(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <textarea
              value={defectDetail}
              onChange={(e) => setDefectDetail(e.target.value)}
              placeholder="예: 신세계 50,000원권 2매에 찢김 발견. 나머지 정상 처리 가능합니다."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-amber-400 resize-none placeholder:text-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDefectModal(false); setDefectDetail(""); }}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-[14px] font-bold hover:bg-slate-50"
              >취소</button>
              <button
                onClick={handleDefectSubmit}
                disabled={!defectDetail.trim() || sendingDefect}
                className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold disabled:opacity-50"
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
