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

type Tab = "today" | "upcoming" | "completed";

const TODAY = new Date().toISOString().split("T")[0];

function faceValue(r: Reservation): number {
  if (Array.isArray(r.items) && r.items.length > 0) {
    return r.items.reduce((s, it) => s + Number(it.amount), 0);
  }
  return Number(r.amount ?? 0);
}

function formatPhone(p: string) {
  return p.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

function weekday(date: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()];
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday(date)})`;
}

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export default function StaffDashboard() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";

  const [entries, setEntries] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("today");

  const [upcomingDate, setUpcomingDate] = useState(TODAY);
  const [fromDate, setFromDate] = useState(sevenDaysAgo());
  const [toDate, setToDate] = useState(TODAY);

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
        `💰 입금 요청\n──────────────\n` +
        `▸ 은행: ${r.bankName || "-"}\n` +
        `▸ 계좌: ${r.accountNumber || "-"}\n` +
        `▸ 예금주: ${r.accountHolder || "-"}\n` +
        `▸ 입금 금액: ${amount}원\n──────────────\n확인 후 입금해 주세요.`;
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

  const byTime = (a: Reservation, b: Reservation) =>
    (a.time ?? "").localeCompare(b.time ?? "");

  const todayList = entries
    .filter((r) => r.date === TODAY && r.status !== "cancelled")
    .sort(byTime);

  const upcomingList = entries
    .filter((r) => r.date === upcomingDate && r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show")
    .sort(byTime);

  const completedList = entries
    .filter((r) => r.status === "completed" && r.date && r.date >= fromDate && r.date <= toDate)
    .sort((a, b) => ((a.date ?? "") + (a.time ?? "")).localeCompare((b.date ?? "") + (b.time ?? "")));

  const todayCount = todayList.length;

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "today",     label: "오늘배정",   emoji: "📍" },
    { key: "upcoming",  label: "진행예정",   emoji: "📅" },
    { key: "completed", label: "완료된배정", emoji: "✅" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
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
            onClick={() => {
              localStorage.removeItem("gc_staff_token");
              localStorage.removeItem("gc_staff_id");
              localStorage.removeItem("gc_staff_name");
              window.location.href = "/staff/login";
            }}
            className="text-[12px] text-slate-400 hover:text-rose-500 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 탭 */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          {TABS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-2xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
                tab === key
                  ? "bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}
        {error && <div className="py-8 text-center text-rose-500 text-[13px]">{error}</div>}

        {/* ── 오늘배정 ── */}
        {!loading && !error && tab === "today" && (
          <>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-black text-slate-700">
                {(() => { const d = new Date(TODAY); return `${d.getMonth()+1}월 ${d.getDate()}일 (${weekday(TODAY)})`; })()}
              </p>
              <span className="text-[11px] text-slate-400">{todayList.length}건</span>
            </div>
            <ReservationTable list={todayList} mode="today_upcoming"
              completing={completing} sendingPayment={sendingPayment}
              onComplete={markComplete} onPayment={handlePaymentRequest}
              onDefect={(id) => { setDefectModalId(id); setDefectDetail(""); }}
            />
          </>
        )}

        {/* ── 진행예정 ── */}
        {!loading && !error && tab === "upcoming" && (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <span className="text-[13px] font-bold text-slate-600 flex-shrink-0">날짜 선택</span>
              <input
                type="date"
                value={upcomingDate}
                onChange={(e) => setUpcomingDate(e.target.value)}
                className="flex-1 text-[14px] font-bold text-indigo-600 bg-transparent outline-none"
              />
              <span className="text-[12px] text-slate-400 flex-shrink-0">{upcomingList.length}건</span>
            </div>
            <ReservationTable list={upcomingList} mode="today_upcoming"
              completing={completing} sendingPayment={sendingPayment}
              onComplete={markComplete} onPayment={handlePaymentRequest}
              onDefect={(id) => { setDefectModalId(id); setDefectDetail(""); }}
            />
          </>
        )}

        {/* ── 완료된 배정 ── */}
        {!loading && !error && tab === "completed" && (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-2">
              <span className="text-[13px] font-bold text-slate-600 flex-shrink-0">기간</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1 text-[13px] font-bold text-slate-700 bg-transparent outline-none"
              />
              <span className="text-[12px] text-slate-400">~</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1 text-[13px] font-bold text-slate-700 bg-transparent outline-none"
              />
              <span className="text-[12px] text-slate-400 flex-shrink-0">{completedList.length}건</span>
            </div>
            <ReservationTable list={completedList} mode="completed" />
          </>
        )}
      </div>

      {/* 일부하자 모달 */}
      {defectModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">⚠️ 일부 하자 안내</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">하자 내용을 입력하면 채팅으로 발송됩니다</p>
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
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-amber-400 resize-none placeholder:text-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDefectModalId(null); setDefectDetail(""); }}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-[14px] font-bold hover:bg-slate-50 transition-colors"
              >취소</button>
              <button
                onClick={handleDefectSubmit}
                disabled={!defectDetail.trim() || sendingDefect}
                className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >{sendingDefect ? "발송 중…" : "📨 발송하기"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TableProps {
  list: Reservation[];
  mode: "today_upcoming" | "completed";
  completing?: number | null;
  sendingPayment?: number | null;
  onComplete?: (id: number) => void;
  onPayment?: (r: Reservation) => void;
  onDefect?: (id: number) => void;
}

function ReservationTable({ list, mode, completing, sendingPayment, onComplete, onPayment, onDefect }: TableProps) {
  if (list.length === 0) {
    return (
      <div className="py-14 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-[14px] font-semibold text-slate-400">해당 기간 배정 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* 테이블 헤더 */}
      {mode === "today_upcoming" ? (
        <div className="grid grid-cols-[2rem_1fr_3.5rem_1fr_5.5rem] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 text-center">순</span>
          <span className="text-[10px] font-black text-slate-400">성함</span>
          <span className="text-[10px] font-black text-slate-400 text-center">시간</span>
          <span className="text-[10px] font-black text-slate-400">장소</span>
          <span className="text-[10px] font-black text-slate-400">연락처</span>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_3.5rem_1fr_5rem] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400">성명</span>
          <span className="text-[10px] font-black text-slate-400 text-center">시간</span>
          <span className="text-[10px] font-black text-slate-400">장소</span>
          <span className="text-[10px] font-black text-slate-400 text-right">액면금액</span>
        </div>
      )}

      {/* 행 */}
      {list.map((r, idx) => (
        <div key={r.id} className={`border-b border-slate-50 last:border-0 ${r.isUrgent ? "bg-rose-50/40" : ""}`}>
          {mode === "today_upcoming" ? (
            <>
              <a
                href={`/staff/chat?id=${r.id}`}
                className="grid grid-cols-[2rem_1fr_3.5rem_1fr_5.5rem] gap-2 px-3 py-3 items-center hover:bg-slate-50 transition-colors"
              >
                <span className="text-[12px] font-black text-indigo-400 text-center">{idx + 1}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">
                    {r.name || "-"}
                    {r.isUrgent && <span className="ml-1 text-[9px] font-black bg-rose-100 text-rose-500 px-1 py-0.5 rounded-full">긴급</span>}
                  </p>
                </div>
                <span className="text-[12px] font-bold text-indigo-600 text-center tabular-nums">{r.time || "-"}</span>
                <span className="text-[12px] text-slate-600 truncate">{r.location || "-"}</span>
                <span className="text-[11px] text-slate-500 tabular-nums">{formatPhone(r.phone)}</span>
              </a>
              {/* 액션 버튼 (진행중인 예약만) */}
              {r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show" && (
                <div className="grid grid-cols-4 gap-1.5 px-3 pb-2.5">
                  <a
                    href={`/staff/chat?id=${r.id}`}
                    className="py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold text-center hover:bg-indigo-100 transition-colors"
                  >
                    💬 채팅
                  </a>
                  <button
                    onClick={() => onPayment?.(r)}
                    disabled={sendingPayment === r.id}
                    className="py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff" }}
                  >
                    {sendingPayment === r.id ? "…" : "💰 입금"}
                  </button>
                  <button
                    onClick={() => onDefect?.(r.id)}
                    className="py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
                  >
                    ⚠️ 하자
                  </button>
                  <button
                    onClick={() => onComplete?.(r.id)}
                    disabled={completing === r.id}
                    className="py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                  >
                    {completing === r.id ? "…" : "✓ 완료"}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* 완료된 배정 행 */
            <a
              href={`/staff/chat?id=${r.id}`}
              className="grid grid-cols-[1fr_3.5rem_1fr_5rem] gap-2 px-3 py-3 items-center hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">{r.name || "-"}</p>
                {r.date && <p className="text-[10px] text-slate-400">{formatDateLabel(r.date)}</p>}
              </div>
              <span className="text-[12px] font-bold text-slate-600 text-center tabular-nums">{r.time || "-"}</span>
              <span className="text-[12px] text-slate-600 truncate">{r.location || "-"}</span>
              <span className="text-[12px] font-black text-indigo-600 text-right tabular-nums">
                {faceValue(r).toLocaleString("ko-KR")}원
              </span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
