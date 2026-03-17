import { useState } from "react";

const RATES: Record<string, number> = {
  "신세계 (Shinsegae)": 0.95,
  "롯데 (Lotte)": 0.95,
  "현대 (Hyundai)": 0.95,
  "주유권 (Fuel)": 0.95,
  "국민관광상품권 (Tourism)": 0.95,
  "갤러리아 (Galleria)": 0.94,
  "컬쳐랜드 (Cultureland)": 0.90,
  "도서문화상품권 (BooknLife)": 0.90,
};

const RATE_GROUPS = [
  { label: "신세계 / 롯데 / 현대\n주유권 / 국민관광상품권", sublabel: "Shinsegae · Lotte · Hyundai · Fuel · Tourism", rate: 95, color: "#6366f1" },
  { label: "갤러리아", sublabel: "Galleria", rate: 94, color: "#8b5cf6" },
  { label: "컬쳐랜드 / 도서문화상품권", sublabel: "Cultureland · BooknLife", rate: 90, color: "#a78bfa" },
];

interface ReservationForm {
  name: string;
  phone: string;
  date: string;
  time: string;
  location: string;
  type: string;
  amount: string;
}

interface UrgentForm {
  phone: string;
  date: string;
  time: string;
  location: string;
  type: string;
  amount: string;
}

interface ReservationEntry extends ReservationForm {
  id: number;
  payment: number;
  isGift: boolean;
  appliedRate: number;
}

interface UrgentEntry extends UrgentForm {
  id: number;
  payment: number;
  isGift: boolean;
  appliedRate: number;
}

function formatKRW(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
        {label} {required && <span className="text-rose-400 normal-case tracking-normal">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[12px] text-rose-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError?: boolean, accent = "indigo") =>
  `w-full px-4 py-3.5 rounded-2xl border text-[15px] text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-300 ${
    hasError
      ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      : accent === "rose"
      ? "border-slate-200 bg-slate-50 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-50"
      : "border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"
  }`;

function GiftCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${checked ? "bg-violet-500 border-violet-500" : "bg-white border-slate-300"}`}>
          {checked && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <span className={`text-[13px] font-semibold transition-colors ${checked ? "text-violet-600" : "text-slate-400"}`}>증정용</span>
      {checked && <span className="text-[11px] bg-violet-100 text-violet-500 font-bold px-2 py-0.5 rounded-full">-1%</span>}
    </label>
  );
}

function TypeSelect({ value, onChange, accent = "indigo" }: { value: string; onChange: (v: string) => void; accent?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none transition-all duration-150 appearance-none pr-10 ${
          accent === "rose"
            ? "focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-50"
            : "focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"
        }`}
      >
        {Object.keys(RATES).map((key) => (
          <option key={key} value={key}>{key}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function PaymentPreview({
  amountNum,
  rate,
  isGift,
  isUrgent,
  gradient,
}: {
  amountNum: number;
  rate: number;
  isGift: boolean;
  isUrgent?: boolean;
  gradient: string;
}) {
  const payment = Math.floor(amountNum * rate);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: gradient }}>
      <div className="px-5 py-4">
        <p className="text-white/60 text-[11px] font-semibold tracking-wider uppercase mb-3">지급 예상 금액</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/70 text-[13px] mb-0.5">액면가</p>
            <p className="text-white text-[16px] font-semibold">{formatKRW(amountNum)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-[13px] mb-0.5 flex items-center justify-end gap-1.5">
              요율 {Math.round(rate * 100)}% 적용
              {isUrgent && !isGift && <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">긴급 -1%</span>}
              {isGift && !isUrgent && <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">증정용 -1%</span>}
              {isUrgent && isGift && <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">긴급+증정 -2%</span>}
            </p>
            <p className="text-white text-[26px] font-black tabular-nums leading-none">{formatKRW(payment)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ onGoUrgent }: { onGoUrgent: () => void }) {
  const emptyForm: ReservationForm = { name: "", phone: "", date: "", time: "", location: "", type: Object.keys(RATES)[0], amount: "" };
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [submissions, setSubmissions] = useState<ReservationEntry[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof ReservationForm, string>>>({});
  const [isGift, setIsGift] = useState(false);
  const [toast, setToast] = useState(false);
  const [counter, setCounter] = useState(0);

  const amountNum = parseFloat(form.amount) || 0;
  const baseRate = RATES[form.type] ?? 0;
  const rate = isGift ? baseRate - 0.01 : baseRate;
  const payment = Math.floor(amountNum * rate);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  }

  function validate() {
    const e: Partial<Record<keyof ReservationForm, string>> = {};
    if (!form.name.trim()) e.name = "이름을 입력해주세요";
    if (!form.phone.trim()) e.phone = "연락처를 입력해주세요";
    if (!form.date) e.date = "날짜 선택";
    if (!form.time) e.time = "시간 선택";
    if (!form.location.trim()) e.location = "거래 장소를 입력해주세요";
    if (!form.amount || amountNum <= 0) e.amount = "금액을 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const id = counter + 1;
    setCounter(id);
    setSubmissions((p) => [{ ...form, id, payment, isGift, appliedRate: rate }, ...p]);
    setForm(emptyForm);
    setIsGift(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60">
      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
          <span>✓</span> 예약이 접수되었습니다!
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-slate-800">상품권 예약</h1>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium tracking-wide">GIFT CERTIFICATE RESERVATION</p>
          </div>
          {submissions.length > 0 && (
            <span className="bg-indigo-100 text-indigo-600 text-[12px] font-bold px-3 py-1.5 rounded-full">{submissions.length}건 접수</span>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* Rates */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">적용 요율</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Exchange Rates</p>
            </div>
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">💳</div>
          </div>
          <div className="px-5 pb-5 space-y-2.5">
            {RATE_GROUPS.map((g) => (
              <div key={g.label} className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: g.color + "0d" }}>
                <div>
                  <p className="text-[14px] font-semibold text-slate-700 whitespace-pre-line">{g.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{g.sublabel}</p>
                </div>
                <div className="text-[22px] font-black tabular-nums" style={{ color: g.color }}>{g.rate}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Reservation Form */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">예약 신청</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Reservation Form</p>
            </div>
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">📋</div>
          </div>
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
            <Field label="이름" required error={errors.name}>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="홍길동" className={inputClass(!!errors.name)} />
            </Field>
            <Field label="연락처" required error={errors.phone}>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" className={inputClass(!!errors.phone)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="예약 날짜" required error={errors.date}>
                <input type="date" name="date" value={form.date} onChange={handleChange} className={inputClass(!!errors.date)} />
              </Field>
              <Field label="예약 시간" required error={errors.time}>
                <input type="time" name="time" value={form.time} onChange={handleChange} className={inputClass(!!errors.time)} />
              </Field>
            </div>
            <Field label="거래 장소" required error={errors.location}>
              <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="예: 강남구 역삼동" className={inputClass(!!errors.location)} />
              <p className="text-[12px] text-slate-400 mt-1.5 flex items-start gap-1">
                <span className="mt-0.5 flex-shrink-0">ℹ️</span>주정차가 가능한 장소로 입력해 주세요
              </p>
            </Field>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
                  상품권 종류 <span className="text-rose-400 normal-case tracking-normal">*</span>
                </label>
                <GiftCheckbox checked={isGift} onChange={setIsGift} />
              </div>
              <TypeSelect value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))} />
            </div>
            <Field label="금액 (원)" required error={errors.amount}>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="예: 100000" min="0" step="10000" className={inputClass(!!errors.amount)} />
            </Field>
            {amountNum > 0 && (
              <PaymentPreview amountNum={amountNum} rate={rate} isGift={isGift} gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" />
            )}
            <button type="submit" className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
              예약 신청하기
            </button>
          </form>
        </div>

        {/* Submissions */}
        {submissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-slate-700">접수 내역</h2>
              <span className="text-[12px] text-slate-400">최신순</span>
            </div>
            {submissions.map((s) => {
              const rc = s.appliedRate >= 0.95 ? "#6366f1" : s.appliedRate >= 0.94 ? "#8b5cf6" : "#a78bfa";
              return (
                <div key={s.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 px-5 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${rc} 0%, ${rc}cc 100%)` }}>{s.id}</div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
                          {s.name}
                          {s.isGift && <span className="text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded-full">증정용</span>}
                        </p>
                        <p className="text-[12px] text-slate-400">{s.phone}</p>
                      </div>
                    </div>
                    <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ color: rc, backgroundColor: rc + "1a" }}>{Math.round(s.appliedRate * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">예약 날짜 · 시간</p>
                      <p className="text-[13px] text-slate-700 font-semibold mt-0.5">{s.date} {s.time}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">상품권</p>
                      <p className="text-[12px] text-slate-700 font-semibold mt-0.5 truncate">{s.type.split(" ")[0]}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2 col-span-2">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">거래 장소</p>
                      <p className="text-[13px] text-slate-700 font-semibold mt-0.5">{s.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: rc + "0d" }}>
                    <div>
                      <p className="text-[11px] text-slate-400">액면가</p>
                      <p className="text-[13px] font-semibold text-slate-600">{formatKRW(parseInt(s.amount, 10))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">지급 금액</p>
                      <p className="text-[18px] font-black" style={{ color: rc }}>{formatKRW(s.payment)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Urgent Sale Banner */}
        <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">긴급 판매 요청</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Urgent Sale Request</p>
            </div>
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">🚨</div>
          </div>
          <div className="px-5 pb-5">
            <p className="text-[13px] text-slate-500 mb-3">지금 바로 판매가 필요하신가요? 긴급 판매 신청 페이지로 이동합니다.</p>
            <button
              type="button"
              onClick={onGoUrgent}
              className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}
            >
              <span>🚨</span> 긴급 판매 요청
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── URGENT SALE PAGE ─────────────────────────────────────────────────────────
function UrgentPage({ onBack }: { onBack: () => void }) {
  const emptyForm: UrgentForm = { phone: "", date: "", time: "", location: "", type: Object.keys(RATES)[0], amount: "" };
  const [form, setForm] = useState<UrgentForm>(emptyForm);
  const [submissions, setSubmissions] = useState<UrgentEntry[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof UrgentForm, string>>>({});
  const [isGift, setIsGift] = useState(false);
  const [toast, setToast] = useState(false);
  const [counter, setCounter] = useState(0);

  const amountNum = parseFloat(form.amount) || 0;
  const baseRate = RATES[form.type] ?? 0;
  // Urgent always -1%, gift adds another -1%
  const rate = baseRate - 0.01 - (isGift ? 0.01 : 0);
  const payment = Math.floor(amountNum * rate);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  }

  function validate() {
    const e: Partial<Record<keyof UrgentForm, string>> = {};
    if (!form.phone.trim()) e.phone = "판매자 전화번호를 입력해주세요";
    if (!form.date) e.date = "날짜 선택";
    if (!form.time) e.time = "시간 선택";
    if (!form.location.trim()) e.location = "거래 장소를 입력해주세요";
    if (!form.amount || amountNum <= 0) e.amount = "금액을 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const id = counter + 1;
    setCounter(id);
    setSubmissions((p) => [{ ...form, id, payment, isGift, appliedRate: rate }, ...p]);
    setForm(emptyForm);
    setIsGift(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 to-slate-100/60">
      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-rose-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
          <span>✓</span> 긴급 판매 요청이 접수되었습니다!
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all duration-150 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-slate-800">긴급 판매 요청</h1>
            <p className="text-[11px] text-rose-400 mt-0.5 font-semibold tracking-wide">URGENT SALE REQUEST · 적용 요율 -1%</p>
          </div>
          {submissions.length > 0 && (
            <span className="ml-auto bg-rose-100 text-rose-500 text-[12px] font-bold px-3 py-1.5 rounded-full">{submissions.length}건</span>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 px-4 py-3.5 bg-rose-50 border border-rose-100 rounded-2xl">
          <span className="text-xl flex-shrink-0">⚡</span>
          <p className="text-[13px] text-rose-600 font-medium leading-relaxed">
            긴급 판매 요청은 기본 적용 요율에서 <strong>1%가 차감</strong>됩니다.
          </p>
        </div>

        {/* Urgent Form */}
        <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">판매 요청</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Sale Request Form</p>
            </div>
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">📋</div>
          </div>
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
            <Field label="판매자 전화번호" required error={errors.phone}>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" className={inputClass(!!errors.phone, "rose")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="날짜" required error={errors.date}>
                <input type="date" name="date" value={form.date} onChange={handleChange} className={inputClass(!!errors.date, "rose")} />
              </Field>
              <Field label="시간" required error={errors.time}>
                <input type="time" name="time" value={form.time} onChange={handleChange} className={inputClass(!!errors.time, "rose")} />
              </Field>
            </div>
            <Field label="거래 장소" required error={errors.location}>
              <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="예: 강남구 역삼동" className={inputClass(!!errors.location, "rose")} />
              <p className="text-[12px] text-slate-400 mt-1.5 flex items-start gap-1">
                <span className="mt-0.5 flex-shrink-0">ℹ️</span>주정차 가능한 곳으로 입력 바랍니다
              </p>
            </Field>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
                  상품권 종류 <span className="text-rose-400 normal-case tracking-normal">*</span>
                </label>
                <GiftCheckbox checked={isGift} onChange={setIsGift} />
              </div>
              <TypeSelect value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))} accent="rose" />
            </div>
            <Field label="금액 (원)" required error={errors.amount}>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="예: 100000" min="0" step="10000" className={inputClass(!!errors.amount, "rose")} />
            </Field>
            {amountNum > 0 && (
              <PaymentPreview amountNum={amountNum} rate={rate} isGift={isGift} isUrgent gradient="linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" />
            )}
            <button type="submit" className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}>
              <span>🚨</span> 긴급 판매 요청하기
            </button>
          </form>
        </div>

        {/* Urgent Submissions */}
        {submissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-slate-700">긴급 접수 내역</h2>
              <span className="text-[12px] text-slate-400">최신순</span>
            </div>
            {submissions.map((s) => (
              <div key={s.id} className="bg-white rounded-3xl shadow-sm border border-rose-100 px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}>{s.id}</div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
                        {s.phone}
                        {s.isGift && <span className="text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded-full">증정용</span>}
                      </p>
                      <p className="text-[12px] text-rose-400 font-semibold">긴급 판매</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-500">{Math.round(s.appliedRate * 100)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">날짜 · 시간</p>
                    <p className="text-[13px] text-slate-700 font-semibold mt-0.5">{s.date} {s.time}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">상품권</p>
                    <p className="text-[12px] text-slate-700 font-semibold mt-0.5 truncate">{s.type.split(" ")[0]}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2 col-span-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">거래 장소</p>
                    <p className="text-[13px] text-slate-700 font-semibold mt-0.5">{s.location}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-rose-50">
                  <div>
                    <p className="text-[11px] text-slate-400">액면가</p>
                    <p className="text-[13px] font-semibold text-slate-600">{formatKRW(parseInt(s.amount, 10))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">지급 금액</p>
                    <p className="text-[18px] font-black text-rose-500">{formatKRW(s.payment)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<"home" | "urgent">("home");
  return page === "home"
    ? <HomePage onGoUrgent={() => setPage("urgent")} />
    : <UrgentPage onBack={() => setPage("home")} />;
}
