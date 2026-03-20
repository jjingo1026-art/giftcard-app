import { useState } from "react";
import { formatPhone, formatDateKo } from "@/lib/store";

interface StaffInfo { id: number; name: string; phone: string; }
interface ReservationItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

interface ReservationInfo {
  id: number;
  kind?: string;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location?: string;
  giftcardType?: string;
  amount?: number;
  totalPayment?: number;
  items?: ReservationItem[];
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

  // 취소
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // 수정
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editGiftcardType, setEditGiftcardType] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  const GIFT_TYPES = [
    "신세계백화점상품권", "롯데백화점상품권", "현대백화점상품권", "국민관광상품권",
    "갤러리아백화점상품권", "삼성상품권", "이랜드상품권", "AK(애경)상품권",
    "농협상품권", "지류문화상품권", "온누리상품권", "주유권",
  ];

  async function check() {
    const p = phone.trim().replace(/[^0-9]/g, "");
    if (!p) { setError("전화번호를 입력해주세요."); return; }
    setError(""); setLoading(true); setSearched(false); setEditMode(false);
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
    setCancelling(true); setCancelError("");
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

  function openEdit() {
    if (!reservation) return;
    setEditDate(reservation.date ?? "");
    setEditTime(reservation.time ?? "");
    setEditLocation(reservation.location ?? "");
    setEditGiftcardType(reservation.giftcardType ?? "");
    setEditAmount(reservation.amount ? String(reservation.amount) : "");
    setEditError("");
    setEditMode(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservation) return;
    if (editAmount && (isNaN(Number(editAmount)) || Number(editAmount) <= 0)) {
      setEditError("올바른 금액을 입력해주세요."); return;
    }
    setSaving(true); setEditError("");
    try {
      const res = await fetch("/api/admin/customer/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: reservation.phone,
          reservationId: reservation.id,
          date: editDate || undefined,
          time: editTime || undefined,
          location: editLocation || undefined,
          giftcardType: editGiftcardType || undefined,
          amount: editAmount ? Number(editAmount) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReservation({
          ...reservation,
          date: editDate || reservation.date,
          time: editTime || reservation.time,
          location: editLocation || reservation.location,
          giftcardType: editGiftcardType || reservation.giftcardType,
          amount: editAmount ? Number(editAmount) : reservation.amount,
        });
        setEditMode(false);
        setEditSuccess(true);
        setTimeout(() => setEditSuccess(false), 3000);
      } else {
        setEditError(data.error ?? "수정 중 오류가 발생했습니다.");
      }
    } catch {
      setEditError("수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function isWithinOneHour() {
    if (!reservation?.date || !reservation?.time) return false;
    const scheduled = new Date(`${reservation.date}T${reservation.time}`);
    return (scheduled.getTime() - Date.now()) < 60 * 60 * 1000;
  }

  const canModify = reservation && !["cancelled", "completed", "no_show"].includes(reservation.status);
  const tooLate = canModify && isWithinOneHour();

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50";

  // 수정 버튼 + 폼 (재사용)
  function EditSection() {
    if (!canModify) return null;
    if (tooLate) return (
      <p className="text-[12px] text-slate-400 text-center py-2">예약 1시간 전까지만 수정할 수 있습니다.</p>
    );
    if (editMode) return (
      <form onSubmit={submitEdit} className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <p className="text-[14px] font-bold text-slate-800">✏️ 예약 수정</p>
          <button type="button" onClick={() => setEditMode(false)} className="text-[12px] text-slate-400 hover:text-slate-600">닫기</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* 권종 선택 */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-slate-500">상품권 권종</label>
            <select
              value={editGiftcardType}
              onChange={(e) => setEditGiftcardType(e.target.value)}
              className={inputCls + " appearance-none"}
            >
              <option value="">권종 선택</option>
              {GIFT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 금액 */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-slate-500">금액 (원)</label>
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="예) 500000"
              min={1}
              className={inputCls}
              inputMode="numeric"
            />
            {editAmount && !isNaN(Number(editAmount)) && Number(editAmount) > 0 && (
              <p className="text-[11px] text-indigo-500 pl-1">
                입력 금액: {Number(editAmount).toLocaleString("ko-KR")}원
              </p>
            )}
          </div>

          {reservation?.kind !== "urgent" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-slate-500">날짜</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-slate-500">시간</label>
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className={inputCls} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-slate-500">거래장소</label>
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="거래 장소 입력"
              className={inputCls}
            />
          </div>
          {editError && (
            <div className="py-2.5 px-4 rounded-xl bg-rose-50 border border-rose-100 text-[13px] text-rose-500 font-medium">
              ⚠ {editError}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-[14px] font-semibold hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </form>
    );
    return (
      <button
        onClick={openEdit}
        className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-500 text-[14px] font-semibold hover:bg-indigo-50 transition-colors active:scale-95"
      >
        ✏️ 예약 수정
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 취소 성공 토스트 */}
      {cancelSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-slate-800 text-white text-[14px] font-medium shadow-lg">
          예약이 취소되었습니다.
        </div>
      )}
      {/* 수정 성공 토스트 */}
      {editSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-indigo-600 text-white text-[14px] font-medium shadow-lg">
          ✓ 예약이 수정되었습니다.
        </div>
      )}

      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => { window.location.href = "/"; }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
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
              <p className="text-[11px] text-slate-400">취소 시각: {new Date(reservation.cancelledAt).toLocaleString("ko-KR")}</p>
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

        {/* 노쇼 예약 */}
        {reservation && reservation.status === "no_show" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-[28px] mx-auto">🚫</div>
            <p className="text-[16px] font-bold text-red-700">노쇼 처리됨</p>
            <p className="text-[13px] text-red-500">해당 예약은 노쇼 처리되었습니다.</p>
          </div>
        )}

        {/* 예약 확인 (pending) */}
        {reservation && reservation.status === "pending" && (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center gap-2">
                <span className="text-[20px]">📌</span>
                <p className="text-[17px] font-bold text-slate-800">예약확인</p>
              </div>
              <div className="px-5 py-2 space-y-0">
                {(reservation.items && reservation.items.length > 0)
                  ? reservation.items.map((it, i) => (
                    <div key={i} className="py-2.5 border-b border-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] text-slate-400 font-medium">권종{reservation.items!.length > 1 ? ` ${i + 1}` : ""}</span>
                        <span className="text-[13px] text-slate-800 font-semibold">{it.type}{it.isGift ? " 🎁" : ""}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[13px] text-slate-400 font-medium">금액</span>
                        <span className="text-[14px] text-indigo-600 font-black">{fmt(it.amount)}</span>
                      </div>
                    </div>
                  ))
                  : <>
                    {reservation.giftcardType && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                        <span className="text-[13px] text-slate-400 font-medium">권종</span>
                        <span className="text-[13px] text-slate-800 font-semibold">{reservation.giftcardType}</span>
                      </div>
                    )}
                    {reservation.amount != null && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                        <span className="text-[13px] text-slate-400 font-medium">금액</span>
                        <span className="text-[14px] text-indigo-600 font-black">{fmt(reservation.amount)}</span>
                      </div>
                    )}
                  </>
                }
                {reservation.kind === "urgent" ? (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-400 font-medium">구분</span>
                    <span className="text-[13px] font-bold text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full">🚨 긴급</span>
                  </div>
                ) : (
                  <>
                    {reservation.date && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                        <span className="text-[13px] text-slate-400 font-medium">날짜</span>
                        <span className="text-[13px] text-slate-800 font-semibold">{formatDateKo(reservation.date)}</span>
                      </div>
                    )}
                    {reservation.time && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                        <span className="text-[13px] text-slate-400 font-medium">시간</span>
                        <span className="text-[13px] text-slate-800 font-semibold">{reservation.time}</span>
                      </div>
                    )}
                  </>
                )}
                {reservation.location && (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-[13px] text-slate-400 font-medium">장소</span>
                    <span className="text-[13px] text-slate-800 font-semibold text-right max-w-[60%]">{reservation.location}</span>
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
              <div className="mx-5 mb-5 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4 space-y-1.5">
                <p className="text-[13px] font-bold text-amber-700">현재 상태</p>
                <p className="text-[13px] text-amber-600 font-medium">매입 담당자 배정 대기중입니다.</p>
                <p className="text-[12px] text-amber-500 pt-1 leading-relaxed">담당자가 배정되면<br />연락처 확인 및 채팅 이용이 가능합니다.</p>
              </div>
            </div>

            {/* 취소 버튼 */}
            <div>
              {tooLate
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

            {/* 수정 */}
            <EditSection />
          </div>
        )}

        {/* 예약 확정 (assigned) */}
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
              {reservation.kind === "urgent" ? (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">📅 날짜 / 시간</span>
                  <span className="text-[13px] font-bold text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full">🚨 긴급</span>
                </div>
              ) : reservation.date ? (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">📅 날짜 / 시간</span>
                  <span className="text-[13px] text-slate-700 font-semibold">{formatDateKo(reservation.date, reservation.time)}</span>
                </div>
              ) : null}
              {reservation.location && (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                  <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">📍 장소</span>
                  <span className="text-[13px] text-slate-700 font-semibold text-right max-w-[60%]">{reservation.location}</span>
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
                  href={`/chat?id=${reservation.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white text-[14px] font-bold transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  💬 상담하기
                </a>
              </div>
            )}

            {/* 취소 버튼 */}
            <div>
              {tooLate
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

            {/* 수정 */}
            <EditSection />
          </>
        )}
      </div>
    </div>
  );
}
