import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import LangPicker, { useLang } from "@/components/LangPicker";
import { getLabel } from "@/lib/uiTranslations";
import { getSoundEnabled, playNotificationSound } from "@/lib/notificationSound";

interface ReservationItem { type: string; amount: number; rate: number; payment: number; }
interface StaffInfo { id: number; name: string; phone: string; }
interface ReservationInfo {
  id: number;
  kind?: string;
  name?: string;
  phone: string;
  totalPayment?: number;
  items?: ReservationItem[];
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

function fmt(n?: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "접수 완료", color: "#6366f1", bg: "#eef2ff" },
  assigned:  { label: "담당자 배정됨", color: "#0ea5e9", bg: "#e0f2fe" },
  confirmed: { label: "확인 완료", color: "#10b981", bg: "#d1fae5" },
  completed: { label: "처리 완료", color: "#64748b", bg: "#f1f5f9" },
  cancelled: { label: "취소됨", color: "#ef4444", bg: "#fee2e2" },
  no_show:   { label: "노쇼", color: "#f97316", bg: "#ffedd5" },
};

export default function MobileCheck() {
  const [lang, setLang] = useLang();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [searched, setSearched] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelDone, setCancelDone] = useState(false);
  const [adminAlert, setAdminAlert] = useState<{ message: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reservationRef = useRef<ReservationInfo | null>(null);

  useEffect(() => {
    reservationRef.current = reservation;
  }, [reservation]);

  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("adminChatAlert", (data: { reservationId: number; senderName: string; message: string }) => {
      const cur = reservationRef.current;
      if (!cur) return;
      if (data.reservationId !== cur.id) return;
      if (getSoundEnabled("customer")) playNotificationSound("customer");
      setAdminAlert({ message: data.message });
      setTimeout(() => setAdminAlert(null), 10000);
    });
    return () => { socket.disconnect(); };
  }, []);

  function handlePhone(v: string) {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    let fmt = d;
    if (d.length > 3 && d.length <= 7) fmt = `${d.slice(0, 3)}-${d.slice(3)}`;
    else if (d.length > 7) fmt = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    setPhone(fmt);
  }

  async function check() {
    const p = phone.replace(/[^0-9]/g, "");
    if (!p) { setError("전화번호를 입력해주세요."); return; }
    setError(""); setLoading(true); setSearched(false);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ phone: p, kind: "mobile" });
      if (pin.trim()) params.set("pin", pin.trim());
      const res = await fetch(`${base}/api/admin/customer/reservation?${params}`);
      const data = await res.json();
      if (data.success) {
        setReservation(data.reservation);
        setStaffInfo(data.staff ?? null);
        setCancelDone(false);
        setCancelError("");
      } else {
        setReservation(null);
        setStaffInfo(null);
        setError(data.error ?? "조회 결과가 없습니다.");
      }
    } catch {
      setError("조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  async function cancelReservation() {
    if (!reservation) return;
    if (!confirm("정말 신청을 취소하시겠습니까?")) return;
    setCancelling(true); setCancelError("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/admin/customer/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reservation.phone, reservationId: reservation.id, pin: pin.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setReservation({ ...reservation, status: "cancelled", cancelledAt: new Date().toISOString() });
        setCancelDone(true);
      } else {
        setCancelError(data.error ?? "취소 중 오류가 발생했습니다.");
      }
    } catch {
      setCancelError("취소 중 오류가 발생했습니다.");
    } finally {
      setCancelling(false);
    }
  }

  const st = reservation ? (STATUS_MAP[reservation.status] ?? { label: reservation.status, color: "#64748b", bg: "#f1f5f9" }) : null;
  const canCancel = reservation && !["cancelled", "completed", "no_show"].includes(reservation.status);

  return (
    <div className="min-h-screen bg-slate-50">
      {cancelDone && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-slate-800 text-white text-[14px] font-medium shadow-lg">
          신청이 취소되었습니다.
        </div>
      )}

      {/* 관리자 채팅 알림 배너 */}
      {adminAlert && reservation && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-bounce-once"
          style={{ animation: "slideDown 0.3s ease-out" }}
        >
          <button
            onClick={() => { window.location.href = `/chat?id=${reservation.id}&from=mobile`; }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl text-left"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff" }}
          >
            <span className="text-2xl flex-shrink-0">💬</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold">관리자가 메시지를 보냈습니다</p>
              <p className="text-[12px] opacity-80 truncate">{adminAlert.message}</p>
            </div>
            <span className="text-[12px] font-bold opacity-80 flex-shrink-0">채팅 열기 →</span>
          </button>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/mobile"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-slate-800">{getLabel("mobile_check_title", lang)}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">전화번호로 신청 현황 조회</p>
          </div>
          <LangPicker lang={lang} onChange={setLang} accentColor="#ec4899" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* 검색 박스 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-3">
          <p className="text-[13px] font-bold text-slate-700">📱 신청 내역 조회</p>

          <div className="space-y-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="010-0000-0000"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="비밀번호 입력"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <button
            onClick={check}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
          >
            {loading ? "조회 중..." : `🔍 ${getLabel("mobile_check_btn", lang)}`}
          </button>

          {error && <p className="text-[13px] text-rose-500 font-medium text-center">{error}</p>}
        </div>

        {/* 결과 */}
        {searched && reservation && st && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* 상태 배지 */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-50 flex items-center justify-between">
              <p className="text-[14px] font-bold text-slate-800">신청 #{reservation.id}</p>
              <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={{ color: st.color, backgroundColor: st.bg }}>
                {getLabel(`mobile_status_${reservation.status}`, lang)}
              </span>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* 상품권 목록 */}
              {reservation.items && reservation.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">상품권 내역</p>
                  <div className="bg-slate-50 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {reservation.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-[13px] font-semibold text-slate-700">{it.type}</p>
                          <p className="text-[11px] text-slate-400">{it.amount.toLocaleString("ko-KR")}원 · {it.rate}%</p>
                        </div>
                        <p className="text-[14px] font-bold text-slate-800">{it.payment.toLocaleString("ko-KR")}원</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 예상 입금액 */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-pink-50 rounded-2xl border border-pink-100">
                <p className="text-[13px] font-semibold text-pink-700">예상 입금액</p>
                <p className="text-[20px] font-black text-pink-700">{fmt(reservation.totalPayment)}</p>
              </div>

              {/* 신청자 정보 */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">신청 정보</p>
                <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-2">
                  {reservation.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-400">이름</span>
                      <span className="text-[13px] font-semibold text-slate-700">{reservation.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">연락처</span>
                    <span className="text-[13px] font-semibold text-slate-700">{reservation.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">신청일시</span>
                    <span className="text-[13px] font-semibold text-slate-700">
                      {new Date(reservation.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {reservation.bankName && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-400">입금계좌</span>
                      <span className="text-[13px] font-semibold text-slate-700">
                        {reservation.bankName} {reservation.accountNumber} ({reservation.accountHolder})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 담당자 정보 */}
              {staffInfo && (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-[16px]">👤</div>
                  <div className="flex-1">
                    <p className="text-[12px] text-indigo-500 font-semibold">담당자</p>
                    <p className="text-[14px] font-bold text-indigo-700">{staffInfo.name}</p>
                  </div>
                  <a href={`tel:${staffInfo.phone}`}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-[12px] font-bold">
                    전화
                  </a>
                </div>
              )}

              {/* 채팅 버튼 */}
              {!["cancelled", "no_show"].includes(reservation.status) && (
                <button
                  onClick={() => { window.location.href = `/chat?id=${reservation.id}&from=mobile`; }}
                  className="w-full py-3.5 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                >
                  <span>💬</span>
                  {getLabel("mobile_chat_btn", lang)}
                </button>
              )}

              {/* 취소 버튼 */}
              {canCancel && !cancelDone && (
                <div className="space-y-2">
                  {cancelError && <p className="text-[12px] text-rose-500 text-center">{cancelError}</p>}
                  <button
                    onClick={cancelReservation}
                    disabled={cancelling}
                    className="w-full py-3 rounded-2xl border-2 border-rose-200 text-rose-500 text-[14px] font-bold hover:bg-rose-50 transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {cancelling ? "취소 중..." : getLabel("mobile_cancel_btn", lang)}
                  </button>
                </div>
              )}

              {/* 취소 완료 후 재신청 안내 */}
              {cancelDone && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[15px] flex-shrink-0 mt-0.5">✅</span>
                    <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                      신청이 취소됐습니다. 새로 신청하시려면 아래 버튼을 눌러주세요.
                    </p>
                  </div>
                  <button
                    onClick={() => { window.location.href = "/mobile"; }}
                    className="w-full py-3.5 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                    style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
                  >
                    <span>📱</span> 다시 신청하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {searched && !reservation && !error && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-8 text-center space-y-2">
            <p className="text-[18px]">📭</p>
            <p className="text-[14px] font-semibold text-slate-500">조회된 신청 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
