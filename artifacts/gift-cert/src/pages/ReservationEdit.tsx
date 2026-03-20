import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface EditItem { type: string; amount: string; isGift: boolean; }

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

const inputBase = "w-full px-4 py-3.5 rounded-2xl border text-[15px] text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-300";
const inputCls = (err?: boolean) =>
  `${inputBase} ${err
    ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
    : "border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"}`;

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
        {label} {required && <span className="text-rose-400 normal-case tracking-normal">*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  );
}

export default function ReservationEdit() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const phone = params.get("phone") ?? "";
  const reservationId = parseInt(params.get("id") ?? "0");

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const [editItems, setEditItems] = useState<EditItem[]>([{ type: "", amount: "", isGift: false }]);
  const [openTypeIdx, setOpenTypeIdx] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!phone || !reservationId) { setFetchError("잘못된 접근입니다."); setLoading(false); return; }
    fetch(`/api/admin/customer/reservation?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.reservation) {
          const r = data.reservation;
          setIsUrgent(r.kind === "urgent");
          setDate(r.date ?? "");
          setTime(r.time ?? "");
          setLocation(r.location ?? "");
          if (r.items && r.items.length > 0) {
            setEditItems(r.items.map((it: { type: string; amount: number; isGift: boolean }) => ({
              type: it.type,
              amount: String(it.amount),
              isGift: it.isGift,
            })));
          } else {
            setEditItems([{
              type: r.giftcardType ?? "",
              amount: r.amount ? String(r.amount) : "",
              isGift: false,
            }]);
          }
        } else {
          setFetchError("예약 정보를 불러올 수 없습니다.");
        }
      })
      .catch(() => setFetchError("데이터 로드 중 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, []);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (let i = 0; i < editItems.length; i++) {
      const it = editItems[i];
      if (!it.type) { errs[`item_${i}_type`] = `${i + 1}번 항목의 권종을 선택해주세요.`; }
      if (!it.amount || Number(it.amount) <= 0) { errs[`item_${i}_amount`] = `${i + 1}번 항목의 금액을 입력해주세요.`; }
    }
    if (!isUrgent && !date) errs.date = "날짜를 선택해주세요.";
    if (!isUrgent && !time) errs.time = "시간을 선택해주세요.";
    if (!location.trim()) errs.location = "거래 장소를 입력해주세요.";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSaving(true); setSaveError("");

    const itemsPayload = editItems.map(it => {
      const g = GIFT_TYPES.find(g => g.label === it.type);
      const rate = (g?.rate ?? 0) - (it.isGift ? 1 : 0);
      const amt = Number(it.amount);
      return { type: it.type, amount: amt, rate, payment: Math.floor(amt * rate / 100), isGift: it.isGift };
    });

    try {
      const res = await fetch("/api/admin/customer/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          reservationId,
          date: date || undefined,
          time: time || undefined,
          location: location.trim() || undefined,
          items: itemsPayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/check");
      } else {
        setSaveError(data.error ?? "수정 중 오류가 발생했습니다.");
      }
    } catch {
      setSaveError("수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const totalPayment = editItems.reduce((sum, it) => {
    const g = GIFT_TYPES.find(g => g.label === it.type);
    const rate = g ? g.rate - (it.isGift ? 1 : 0) : 0;
    const amt = Number(it.amount);
    return sum + (amt > 0 && g ? Math.floor(amt * rate / 100) : 0);
  }, 0);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-[14px] text-slate-400">불러오는 중...</div>
    </div>
  );

  if (fetchError) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-5">
      <p className="text-[15px] text-slate-600 font-semibold">{fetchError}</p>
      <button onClick={() => navigate("/check")} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-[14px] font-bold">돌아가기</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/check")}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">예약 수정</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">내용을 수정하고 저장하세요</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSave} className="space-y-4">
          {/* 상품권 종류 & 금액 */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">상품권 종류 &amp; 금액</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Gift Certificate</p>
              </div>
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-[18px]">🎫</div>
            </div>
            <div className="px-5 pb-5 space-y-2">
              {editItems.map((item, idx) => {
                const giftType = GIFT_TYPES.find(g => g.label === item.type);
                const effectiveRate = giftType ? giftType.rate - (item.isGift ? 1 : 0) : 0;
                const amt = Number(item.amount);
                const payment = amt > 0 && giftType ? Math.floor(amt * effectiveRate / 100) : 0;
                const isOpen = openTypeIdx === idx;

                return (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    {/* 권종 + 증정용 + 삭제 */}
                    <div className="flex gap-2 items-stretch">
                      <div className="flex-1 relative">
                        <button
                          type="button"
                          onClick={() => setOpenTypeIdx(isOpen ? null : idx)}
                          className={`w-full h-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-[13px] font-semibold transition-all
                            ${isOpen ? "border-indigo-400 bg-white text-slate-800"
                              : item.type ? "border-indigo-300 bg-white text-indigo-700"
                              : "border-slate-200 bg-white text-slate-400"}`}
                        >
                          <span className="truncate">{item.type || "권종 선택"}</span>
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
                            className={`transition-transform duration-200 flex-shrink-0 ml-1 ${isOpen ? "rotate-180 text-indigo-500" : "text-slate-400"}`}>
                            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                            <div className="overflow-y-auto max-h-48">
                              {GIFT_TYPES.map(({ label, rate }) => (
                                <button key={label} type="button"
                                  onClick={() => { updateItem(idx, "type", label); setOpenTypeIdx(null); }}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-colors border-b border-slate-50 last:border-0
                                    ${item.type === label ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50 font-medium"}`}
                                >
                                  <span>{label}</span>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.type === label ? "bg-indigo-100 text-indigo-500" : "bg-slate-100 text-slate-400"}`}>{rate}%</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* 증정용 */}
                      <button type="button" onClick={() => updateItem(idx, "isGift", !item.isGift)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl font-bold text-[12px] border-2 transition-all duration-150 active:scale-95 flex items-center gap-1
                          ${item.isGift
                            ? "bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-200"
                            : "bg-white border-slate-200 text-slate-400 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-500"}`}
                      >
                        <span className="text-[14px]">🎁</span>
                        <div className="flex flex-col items-center leading-tight">
                          <span>증정용</span>
                          {item.isGift && <span className="text-[9px] font-black opacity-90">-1%</span>}
                        </div>
                      </button>
                      {/* 삭제 */}
                      {editItems.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="w-8 flex items-center justify-center rounded-xl bg-rose-100 text-rose-400 hover:bg-rose-200 active:scale-90 transition-all flex-shrink-0">
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {fieldErrors[`item_${idx}_type`] && (
                      <p className="text-[11px] text-rose-500">⚠ {fieldErrors[`item_${idx}_type`]}</p>
                    )}
                    {/* 금액 입력 */}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.amount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        updateItem(idx, "amount", v);
                      }}
                      placeholder="금액 입력 (원)"
                      className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-300
                        ${fieldErrors[`item_${idx}_amount`] ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
                    />
                    {fieldErrors[`item_${idx}_amount`] && (
                      <p className="text-[11px] text-rose-500">⚠ {fieldErrors[`item_${idx}_amount`]}</p>
                    )}
                    {/* 매입금액 미리보기 */}
                    {amt > 0 && giftType && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold bg-indigo-50 text-indigo-500">
                        <span className="flex items-center gap-1.5">
                          요율 {effectiveRate}%
                          {item.isGift && <span className="text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded-full">증정 -1%</span>}
                        </span>
                        <span className="font-black text-[15px] text-indigo-600">{payment.toLocaleString("ko-KR")}원</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 권종 추가 버튼 */}
              <button type="button" onClick={addItem}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-indigo-200 text-[13px] font-bold text-indigo-400 hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                권종 추가
              </button>

              {/* 합계 */}
              {editItems.length > 1 && totalPayment > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-indigo-100 text-indigo-700">
                  <span className="text-[13px] font-bold">총 매입금액</span>
                  <span className="font-black text-[17px]">{totalPayment.toLocaleString("ko-KR")}원</span>
                </div>
              )}
            </div>
          </div>

          {/* 날짜 + 시간 (긴급 제외) */}
          {!isUrgent && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800">예약 일시</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">Date &amp; Time</p>
                </div>
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-[18px]">📅</div>
              </div>
              <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                <Field label="날짜" required error={fieldErrors.date}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setFieldErrors(p => ({ ...p, date: "" })); }}
                    className={inputCls(!!fieldErrors.date)}
                  />
                </Field>
                <Field label="시간" required error={fieldErrors.time}>
                  <select
                    value={time}
                    onChange={(e) => { setTime(e.target.value); setFieldErrors(p => ({ ...p, time: "" })); }}
                    className={`${inputCls(!!fieldErrors.time)} appearance-none`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%236366f1' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    <option value="">시간 선택</option>
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>⭕ {t}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* 거래 장소 */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">거래 장소</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Meeting Location</p>
              </div>
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-[18px]">📍</div>
            </div>
            <div className="px-5 pb-5">
              <Field label="거래 장소" required error={fieldErrors.location}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setFieldErrors(p => ({ ...p, location: "" })); }}
                  placeholder="예: 강남구 역삼동"
                  className={inputCls(!!fieldErrors.location)}
                />
              </Field>
              <p className="text-[12px] text-slate-400 mt-2 flex items-start gap-1">
                <span className="mt-0.5 flex-shrink-0">ℹ️</span>주정차가 가능한 장소로 입력해 주세요
              </p>
            </div>
          </div>

          {/* 에러 메시지 */}
          {saveError && (
            <div className="py-3 px-4 rounded-2xl bg-rose-50 border border-rose-100 text-[13px] text-rose-500 font-medium">
              ⚠ {saveError}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate("/check")}
              className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 text-[15px] font-bold hover:bg-slate-50 transition-colors active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {saving ? "저장 중..." : "✓ 수정 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
