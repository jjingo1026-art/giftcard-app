import { useState } from "react";
import { formatPhone } from "@/lib/store";

interface StaffInfo { id: number; name: string; phone: string; }
interface ReservationInfo {
  id: number;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location?: string;
  giftcardType?: string;
  amount?: number;
  totalPayment?: number;
  status: string;
  assignedTo?: string;
  createdAt: string;
  cancelledAt?: string | null;
}

function fmt(n?: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

export default function ReservationCheck() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [searched, setSearched] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  async function check() {
    const p = phone.trim();
    if (!p) { setError("전화번호를 입력해주세요."); return; }
    setError(""); setLoading(true); setSearched(false);
    try {
      const res = await fetch(`/api/admin/customer/reservation?phone=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (data.success) {
        setReservation(data.reservation);
        setStaffInfo(data.staff ?? null);
      } else {
        setReservation(null);
        setStaffInfo(null);
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
    if (!confirm("정말 예약을 취소하시겠습니까?")) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch("/api/admin/customer/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reservation.phone, reservationId: reservation.id }),
      });
      const data = await res.json();
      if (data.success) {
        setReservation({ ...reservation, status: "cancelled", cancelledAt: new Date().toISOString() });
        setCancelSuccess(true);
        setTimeout(() => setCancelSuccess(false), 3000);
      } else {
        setCancelError(data.error ?? "취소 중 오류가 발생했습니다.");
      }
    } catch {
      setCancelError("취소 중 오류가 발생했습니다.");
    } finally {
      setCancelling(false);
    }
  }

  function isWithinOneHour() {
    if (!reservation?.date || !reservation?.time) return false;
    const scheduled = new Date(`${reservation.date}T${reservation.time}`);
    return (scheduled.getTime() - Date.now()) < 60 * 60 * 1000;
  }

  const canCancel = reservation && !["cancelled", "completed"].includes(reservation.status);
  const tooLateToCancel = canCancel && isWithinOneHour();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 취소 성공 토스트 */}
      {cancelSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-slate-800 text-white text-[14px] font-medium shadow-lg animate-fade-in-up">
          예약이 취소되었습니다.
        </div>
      )}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => history.back()} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">예약 확인</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">전화번호로 예약 현황 조회</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 검색 박스 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 space-y-3">
          <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-wide">전화번호</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="010-0000-0000"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-slate-50"
            />
            <button
              onClick={check}
              disabled={loading}
              className="px-5 py-3 rounded-xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {loading ? "조회 중…" : "조회"}
            </button>
          </div>
          {error && <p className="text-[12px] text-rose-500">{error}</p>}
        </div>

        {/* 예약 없음 */}
        {searched && !reservation && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-10 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-[14px] font-semibold text-slate-600">예약 내역이 없습니다</p>
            <p className="text-[12px] text-slate-400 mt-1">입력하신 전화번호로 등록된 예약을 찾을 수 없습니다.</p>
          </div>
        )}

        {/* 취소된 예약 */}
        {reservation && reservation.status === "cancelled" && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-[28px] mx-auto">❌</div>
            <p className="text-[16px] font-bold text-rose-700">예약 취소됨</p>
            <p className="text-[13px] text-rose-500">해당 예약은 취소되었습니다.</p>
            {reservation.giftcardType && (
              <p className="text-[13px] text-slate-500 pt-2">{reservation.giftcardType} · {fmt(reservation.amount)}</p>
            )}
            {reservation.cancelledAt && (
              <p className="text-[11px] text-slate-400">
                취소 시각: {new Date(reservation.cancelledAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        )}

        {/* 완료된 예약 */}
        {reservation && reservation.status === "completed" && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-[28px] mx-auto">✅</div>
            <p className="text-[16px] font-bold text-slate-700">처리 완료</p>
            <p className="text-[13px] text-slate-500">거래가 완료된 예약입니다.</p>
          </div>
        )}

        {/* 예약 확인 (배정 전 / pending) */}
        {reservation && reservation.status === "pending" && (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* 헤더 */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center gap-2">
                <span className="text-[20px]">📌</span>
                <p className="text-[17px] font-bold text-slate-800">예약확인</p>
              </div>
              {/* 상세 정보 */}
              <div className="px-5 py-4 space-y-0">
                {reservation.giftcardType && (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-400 font-medium">권종</span>
                    <span className="text-[13px] text-slate-800 font-semibold">{reservation.giftcardType}</span>
                  </div>
                )}
                {reservation.amount != null && (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-400 font-medium">금액</span>
                    <span className="text-[15px] text-indigo-600 font-black">{fmt(reservation.amount)}</span>
                  </div>
                )}
                {reservation.date && (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-400 font-medium">예약일시</span>
                    <span className="text-[13px] text-slate-800 font-semibold">
                      {reservation.date}{reservation.time ? ` ${reservation.time}` : ""}
                    </span>
                  </div>
                )}
                {reservation.name && (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-400 font-medium">성함</span>
                    <span className="text-[13px] text-slate-800 font-semibold">{reservation.name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-[13px] text-slate-400 font-medium">연락처</span>
                  <span className="text-[13px] text-slate-800 font-semibold">{formatPhone(reservation.phone)}</span>
                </div>
              </div>
              {/* 상태 안내 */}
              <div className="mx-5 mb-5 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4 space-y-1.5">
                <p className="text-[13px] font-bold text-amber-700">현재 상태</p>
                <p className="text-[13px] text-amber-600 font-medium">매입 담당자 배정 대기중입니다.</p>
                <p className="text-[12px] text-amber-500 pt-1 leading-relaxed">
                  담당자가 배정되면<br />연락처 확인 및 채팅 이용이 가능합니다.
                </p>
              </div>
            </div>

            {/* 취소 버튼 */}
            {canCancel && (
              <div>
                {tooLateToCancel
                  ? <p className="text-[12px] text-rose-400 text-center py-2">예약 1시간 전까지만 취소할 수 있습니다.</p>
                  : <>
                      {cancelError && <p className="text-[12px] text-rose-500 mb-2">{cancelError}</p>}
                      <button
                        onClick={cancelReservation}
                        disabled={cancelling}
                        className="w-full py-3 rounded-xl border border-rose-200 text-rose-500 text-[14px] font-semibold hover:bg-rose-50 transition-colors active:scale-95 disabled:opacity-40"
                      >
                        {cancelling ? "취소 처리 중…" : "예약 취소"}
                      </button>
                    </>
                }
              </div>
            )}
          </div>
        )}

        {/* 예약 확정 (매입담당자 배정 완료) */}
        {reservation && reservation.status === "assigned" && (
          <>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[20px] flex-shrink-0">✅</div>
              <div>
                <p className="text-[15px] font-bold text-emerald-800">예약 확정</p>
                <p className="text-[12px] text-emerald-600 mt-0.5">매입담당자가 배정되었습니다.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 space-y-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">예약 정보</p>
              {reservation.date && (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">📅 날짜 / 시간</span>
                  <span className="text-[13px] text-slate-700 font-semibold">{reservation.date} {reservation.time ?? ""}</span>
                </div>
              )}
              {reservation.name && (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">👤 이름</span>
                  <span className="text-[13px] text-slate-700 font-semibold">{reservation.name}</span>
                </div>
              )}
              {reservation.giftcardType && (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-[12px] text-slate-400 font-medium">상품권</span>
                  <span className="text-[13px] text-slate-700 font-semibold">{reservation.giftcardType}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">💰 금액</span>
                <span className="text-[15px] text-indigo-600 font-black">{fmt(reservation.amount)}</span>
              </div>
            </div>

            {staffInfo && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">담당자 정보</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-[20px]">👨‍🔧</div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-800">{staffInfo.name}</p>
                    <a href={`tel:${staffInfo.phone}`} className="text-[13px] text-indigo-500 font-semibold flex items-center gap-1 mt-0.5">
                      📞 {formatPhone(staffInfo.phone)}
                    </a>
                  </div>
                </div>
                <a
                  href={`/chat.html?id=${reservation.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white text-[14px] font-bold transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  💬 상담하기
                </a>
              </div>
            )}

            {/* 취소 버튼 */}
            {canCancel && (
              <div>
                {tooLateToCancel
                  ? <p className="text-[12px] text-rose-400 text-center py-2">예약 1시간 전까지만 취소할 수 있습니다.</p>
                  : <>
                      {cancelError && <p className="text-[12px] text-rose-500 mb-2">{cancelError}</p>}
                      <button
                        onClick={cancelReservation}
                        disabled={cancelling}
                        className="w-full py-3 rounded-xl border border-rose-200 text-rose-500 text-[14px] font-semibold hover:bg-rose-50 transition-colors active:scale-95 disabled:opacity-40"
                      >
                        {cancelling ? "취소 처리 중…" : "예약 취소"}
                      </button>
                    </>
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
