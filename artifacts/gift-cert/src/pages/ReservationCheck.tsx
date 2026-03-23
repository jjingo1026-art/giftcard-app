import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { io, type Socket } from "socket.io-client";
import { formatPhone, formatDateKo, formatPhoneInput } from "@/lib/store";
import { LANGUAGES, getSavedLang, saveLang } from "@/lib/languages";
import { getLabel } from "@/lib/uiTranslations";

interface EditItem { type: string; amount: string; isGift: boolean; }

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
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [searched, setSearched] = useState(false);
  const [lang, setLang] = useState(() => getSavedLang());
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  // 취소
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // 소켓 실시간 업데이트
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!reservation || reservation.status === "cancelled" || reservation.status === "completed") return;

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.emit("joinRoom", reservation.id);

    socket.on("reservationUpdated", (data: { reservationId: number; status: string; assignedTo: string; staffId: number; staffPhone: string }) => {
      if (data.reservationId !== reservation.id) return;
      setReservation(prev => prev ? { ...prev, status: data.status, assignedTo: data.assignedTo } : prev);
      setStaffInfo({ id: data.staffId, name: data.assignedTo, phone: data.staffPhone });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [reservation?.id]);

  // 수정
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([{ type: "", amount: "", isGift: false }]);
  const [openTypeIdx, setOpenTypeIdx] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  const GIFT_TYPES = [
    { label: "신세계백화점상품권", rate: 95 },
    { label: "롯데백화점상품권",   rate: 95 },
    { label: "현대백화점상품권",   rate: 95 },
    { label: "국민관광상품권",     rate: 95 },
    { label: "갤러리아백화점상품권", rate: 94 },
    { label: "삼성상품권",         rate: 92 },
    { label: "이랜드상품권",       rate: 91 },
    { label: "AK(애경)상품권",     rate: 91 },
    { label: "농협상품권",         rate: 91 },
    { label: "지류문화상품권",     rate: 90 },
    { label: "온누리상품권",       rate: 90 },
    { label: "주유권",             rate: 95 },
  ];

  const TIME_OPTIONS: string[] = (() => {
    const opts: string[] = [];
    for (let h = 9; h <= 18; h++) {
      for (let m = 0; m < 60; m += 10) {
        opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return opts;
  })();

  async function check() {
    const p = phone.trim().replace(/[^0-9]/g, "");
    if (!p) { setError("전화번호를 입력해주세요."); return; }
    setError(""); setLoading(true); setSearched(false); setEditMode(false);
    try {
      const params = new URLSearchParams({ phone: p });
      if (pin.trim()) params.set("pin", pin.trim());
      const res = await fetch(`/api/admin/customer/reservation?${params}`);
      const data = await res.json();
      if (data.success) {
        setReservation(data.reservation);
        setStaffInfo(data.staff ?? null);
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
    if (!confirm("정말 예약을 취소하시겠습니까?")) return;
    setCancelling(true); setCancelError("");
    try {
      const res = await fetch("/api/admin/customer/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reservation.phone, reservationId: reservation.id, pin: pin.trim() || undefined }),
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
    navigate(`/edit?phone=${encodeURIComponent(phone)}&id=${reservation.id}`);
  }

  function updateItem(idx: number, field: keyof EditItem, val: string | boolean) {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  function addItem() {
    setEditItems(prev => [...prev, { type: "", amount: "", isGift: false }]);
  }

  function removeItem(idx: number) {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
    setOpenTypeIdx(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservation) return;
    for (let i = 0; i < editItems.length; i++) {
      const it = editItems[i];
      if (!it.type) { setEditError(`${i + 1}번 항목의 권종을 선택해주세요.`); return; }
      const amt = Number(it.amount);
      if (!it.amount || isNaN(amt) || amt <= 0) { setEditError(`${i + 1}번 항목의 금액을 입력해주세요.`); return; }
    }
    setSaving(true); setEditError("");

    const itemsPayload = editItems.map(it => {
      const giftType = GIFT_TYPES.find(g => g.label === it.type);
      const rate = (giftType?.rate ?? 0) - (it.isGift ? 1 : 0);
      const amountNum = Number(it.amount);
      return { type: it.type, amount: amountNum, rate, payment: Math.floor(amountNum * rate / 100), isGift: it.isGift };
    });
    const totalPayment = itemsPayload.reduce((s, it) => s + it.payment, 0);

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
          items: itemsPayload,
          pin: pin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReservation({
          ...reservation,
          date: editDate || reservation.date,
          time: editTime || reservation.time,
          location: editLocation || reservation.location,
          items: itemsPayload,
          giftcardType: itemsPayload[0]?.type,
          amount: itemsPayload[0]?.amount,
          totalPayment,
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
  const tooLateToEdit = canModify && isWithinOneHour();

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-700 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50";

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
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => { window.location.href = "/"; }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-slate-800">{getLabel("reservation_check", lang)}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">전화번호로 예약 현황 조회</p>
          </div>
          <button
            onClick={() => setLangPickerOpen((v) => !v)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-[12px] font-semibold text-slate-600"
          >
            <span className="text-[14px] leading-none">{LANGUAGES.find((l) => l.code === lang)?.flag ?? "🌐"}</span>
            <span className="hidden sm:inline">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="opacity-50"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        {langPickerOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-2.5">
            <div className="max-w-lg mx-auto flex flex-col gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); saveLang(l.code); setLangPickerOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all active:scale-[0.98]
                    ${lang === l.code
                      ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-500"}`}
                >
                  <span className="text-[16px] leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 검색 박스 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 space-y-3">
          <div>
            <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-2">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="010-0000-0000"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-2">
              비밀번호 <span className="text-slate-300 font-normal normal-case">(설정한 경우 입력)</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="숫자 4자리"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-slate-50 tracking-[0.3em]"
            />
          </div>
          <button
            onClick={check}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {loading ? "조회 중…" : getLabel("search", lang)}
          </button>
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
            <p className="text-[16px] font-bold text-rose-700">{getLabel("status_cancelled", lang)}</p>
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
            <p className="text-[16px] font-bold text-slate-700">{getLabel("status_completed", lang)}</p>
            <p className="text-[13px] text-slate-500">거래가 완료된 예약입니다.</p>
          </div>
        )}

        {/* 노쇼 예약 */}
        {reservation && reservation.status === "no_show" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-[28px] mx-auto">🚫</div>
            <p className="text-[16px] font-bold text-red-700">{getLabel("status_no_show", lang)}</p>
            <p className="text-[13px] text-red-500">해당 예약은 노쇼 처리되었습니다.</p>
          </div>
        )}

        {/* 예약 확인 (pending) */}
        {reservation && reservation.status === "pending" && (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center gap-2">
                <span className="text-[20px]">📌</span>
                <p className="text-[17px] font-bold text-slate-800">{getLabel("reservation_card_title", lang)}</p>
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
                        <span className="text-[13px] text-slate-400 font-medium">입금예정금액</span>
                        <span className="text-[14px] text-indigo-600 font-black">{fmt(it.payment ?? it.amount)}</span>
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
                    {(reservation.totalPayment != null || reservation.amount != null) && (
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                        <span className="text-[13px] text-slate-400 font-medium">입금예정금액</span>
                        <span className="text-[14px] text-indigo-600 font-black">{fmt(reservation.totalPayment ?? reservation.amount)}</span>
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
              {cancelError && <p className="text-[12px] text-rose-500 mb-2">{cancelError}</p>}
              <button
                onClick={tooLateToEdit ? undefined : cancelReservation}
                disabled={cancelling || tooLateToEdit}
                className={`w-full py-3 rounded-xl border text-[14px] font-semibold transition-colors active:scale-95 disabled:opacity-60 ${tooLateToEdit ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-rose-200 text-rose-500 hover:bg-rose-50"}`}
              >
                {cancelling ? "취소 처리 중…" : getLabel("cancel_reservation", lang)}
              </button>
              <p className="mt-1.5 text-center text-[12px] text-slate-400">⏰ 예약취소는 1시간 전까지만 가능합니다</p>
            </div>

          </div>
        )}

        {/* 예약 확정 (assigned) */}
        {reservation && reservation.status === "assigned" && (
          <>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[20px] flex-shrink-0">✅</div>
              <div>
                <p className="text-[15px] font-bold text-emerald-800">{getLabel("reservation_confirmed", lang)}</p>
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
                <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">💰 입금예정금액</span>
                <span className="text-[15px] text-indigo-600 font-black">{fmt(reservation.totalPayment ?? reservation.amount)}</span>
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
                  {getLabel("consult", lang)}
                </a>
              </div>
            )}

            {/* 취소 버튼 */}
            <div>
              {cancelError && <p className="text-[12px] text-rose-500 mb-2">{cancelError}</p>}
              <button
                onClick={tooLateToEdit ? undefined : cancelReservation}
                disabled={cancelling || tooLateToEdit}
                className={`w-full py-3 rounded-xl border text-[14px] font-semibold transition-colors active:scale-95 disabled:opacity-60 ${tooLateToEdit ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-rose-200 text-rose-500 hover:bg-rose-50"}`}
              >
                {cancelling ? "취소 처리 중…" : getLabel("cancel_reservation", lang)}
              </button>
              <p className="mt-1.5 text-center text-[12px] text-slate-400">⏰ 예약취소는 1시간 전까지만 가능합니다</p>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
