import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { getNextId, saveEntry, formatDateKo, formatPhoneInput } from "@/lib/store";
import { LANGUAGES, getSavedLang, saveLang } from "@/lib/languages";
import { getLabel } from "@/lib/uiTranslations";

let RATES: Record<string, number> = {
  "신세계 (Shinsegae)": 0.95,
  "롯데 (Lotte)": 0.95,
  "현대 (Hyundai)": 0.95,
  "주유권 (Fuel)": 0.95,
  "국민관광상품권 (Tourism)": 0.95,
  "갤러리아 (Galleria)": 0.94,
  "삼성상품권": 0.92,
  "이랜드상품권": 0.91,
  "AK(애경)상품권": 0.91,
  "농협상품권": 0.91,
  "컬쳐랜드 (Cultureland)": 0.90,
  "도서문화상품권 (BooknLife)": 0.90,
  "온누리상품권": 0.90,
};

const RATE_GROUPS = [
  { label: "신세계백화점상품권",   display: "신세계백화점",   rate: 95, color: "#6366f1" },
  { label: "롯데백화점상품권",     display: "롯데백화점",     rate: 95, color: "#8b5cf6" },
  { label: "현대백화점상품권",     display: "현대백화점",     rate: 95, color: "#a78bfa" },
  { label: "국민관광상품권",       display: "국민관광상품권", rate: 95, color: "#818cf8" },
  { label: "갤러리아백화점상품권", display: "갤러리아백화점", rate: 94, color: "#7c3aed" },
  { label: "삼성상품권",           display: "삼성상품권",     rate: 92, color: "#0ea5e9" },
  { label: "이랜드상품권",         display: "이랜드상품권",   rate: 91, color: "#06b6d4" },
  { label: "AK(애경)상품권",       display: "AK(애경)상품권", rate: 91, color: "#10b981" },
  { label: "농협상품권",           display: "농협상품권",     rate: 91, color: "#22c55e" },
  { label: "지류문화상품권",       display: "지류문화 상품권", rate: 90, color: "#c084fc", sub: "컬쳐·북앤라이프·문화" },
  { label: "온누리상품권",         display: "온누리상품권",   rate: 90, color: "#f59e0b" },
  { label: "주유권",               display: "주유권",         rate: 95, color: "#6366f1", sub: "SK·GS·현대·S-OIL" },
];


const DEFAULT_TYPE = Object.keys(RATES)[0];

const RATE_LABEL_TO_TYPE: Record<string, string> = {
  "신세계백화점상품권":   "신세계 (Shinsegae)",
  "롯데백화점상품권":     "롯데 (Lotte)",
  "현대백화점상품권":     "현대 (Hyundai)",
  "국민관광상품권":       "국민관광상품권 (Tourism)",
  "갤러리아백화점상품권": "갤러리아 (Galleria)",
  "삼성상품권":           "삼성상품권",
  "이랜드상품권":         "이랜드상품권",
  "AK(애경)상품권":       "AK(애경)상품권",
  "농협상품권":           "농협상품권",
  "지류문화상품권":       "컬쳐랜드 (Cultureland)",
  "온누리상품권":         "온누리상품권",
  "주유권":               "주유권 (Fuel)",
};

const isValidTime = (time: string) => {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const minutes = parseInt(match[2], 10);
  return minutes % 10 === 0;
};

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 0; h <= 23; h++) {
    for (let m = 0; m < 60; m += 10) {
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

const KOREAN_BANKS = [
  "카카오뱅크", "토스뱅크", "케이뱅크",
  "국민은행", "신한은행", "우리은행", "하나은행",
  "기업은행", "농협은행", "수협은행", "SC제일은행", "씨티은행",
  "산업은행", "수출입은행",
  "부산은행", "경남은행", "대구은행", "광주은행", "전북은행", "제주은행",
  "새마을금고", "신협", "우체국",
  "키움증권", "미래에셋증권", "삼성증권", "NH투자증권", "한국투자증권",
  "KB증권", "신한투자증권", "하나증권", "대신증권", "메리츠증권",
  "토스증권", "카카오페이증권",
  "기타",
];

interface VoucherItem { type: string; amount: string; isGift: boolean; }
interface SavedItem { type: string; amount: number; rate: number; payment: number; isGift: boolean; }

interface ReservationEntry {
  id: number; name: string; phone: string; date: string; time: string;
  location: string; items: SavedItem[]; totalPayment: number;
  bankName: string; accountNumber: string; accountHolder: string;
  isUrgent: boolean;
}
interface UrgentEntry {
  id: number; name: string; phone: string;
  location: string; items: SavedItem[]; totalPayment: number;
  bankName: string; accountNumber: string; accountHolder: string;
  isUrgent: boolean;
}

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

// baseDeduct: extra deduction applied on top (e.g. 0.01 for urgent)
function computeItem(item: VoucherItem, baseDeduct: number): { amountNum: number; rate: number; payment: number } {
  const amountNum = parseFloat(item.amount) || 0;
  const baseRateVal = RATES[item.type] ?? 0;
  const giftDeduct = item.isGift ? 0.01 : 0;
  const rate = Math.max(0, baseRateVal - baseDeduct - giftDeduct);
  // 부동소수점 오차 방지: (액면가 × 긴급요율) - (액면가 × 증정용 1%) 를 각각 곱한 후 차감
  // floor(amountNum × 0.93) = 464,999 오류 방지 → floor(amountNum × 0.94 − amountNum × 0.01) = 465,000 정확
  const urgentRate = Math.max(0, baseRateVal - baseDeduct);
  const rawPayment = amountNum * urgentRate - (item.isGift ? amountNum * 0.01 : 0);
  const payment = Math.max(0, Math.floor(rawPayment));
  return { amountNum, rate, payment };
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
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

const inputBase = "w-full px-4 py-3.5 rounded-2xl border text-[15px] text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-300";
const inputCls = (err?: boolean, accent = "indigo") =>
  `${inputBase} ${err ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
    : accent === "rose" ? "border-slate-200 bg-slate-50 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-50"
    : "border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"}`;

declare global {
  interface Window {
    daum?: { Postcode: new (opts: { q?: string; oncomplete: (d: { address: string; buildingName: string }) => void }) => { open: () => void } };
  }
}

function openDaumPostcode(onSelect: (addr: string) => void, initialQuery?: string) {
  const opts: Record<string, unknown> = {
    oncomplete(d: { address: string; buildingName: string }) {
      onSelect(d.address + (d.buildingName ? ` (${d.buildingName})` : ""));
    },
  };
  if (initialQuery) opts.q = initialQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = () => new (window.daum!.Postcode as any)(opts).open();
  if (window.daum?.Postcode) { run(); return; }
  const s = document.createElement("script");
  s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
  s.onload = run;
  document.head.appendChild(s);
}

function LocationSearchInput({ value, onChange, error, accent = "indigo" }: { value: string; onChange: (v: string) => void; error?: boolean; accent?: string }) {
  return (
    <div className="relative flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="주소·역·건물명 검색 또는 직접 입력"
        lang="ko"
        spellCheck={false}
        className={`${inputCls(error, accent)} flex-1`}
      />
      <button
        type="button"
        onClick={() => openDaumPostcode(onChange, value.trim() || undefined)}
        className={`flex-shrink-0 px-3.5 py-3 rounded-2xl text-[13px] font-bold border-2 transition-all active:scale-95 flex items-center gap-1.5
          ${accent === "rose"
            ? "border-rose-200 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:border-rose-300"
            : "border-indigo-200 bg-indigo-50 text-indigo-400 hover:bg-indigo-100 hover:border-indigo-300"}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        검색
      </button>
    </div>
  );
}

function GiftCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0 ${checked ? "bg-violet-500 border-violet-500" : "bg-white border-slate-300"}`}>
        {checked && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span className={`text-[13px] font-semibold transition-colors ${checked ? "text-violet-600" : "text-slate-400"}`}>증정용</span>
      {checked && <span className="text-[11px] bg-violet-100 text-violet-500 font-bold px-2 py-0.5 rounded-full">-1%</span>}
    </label>
  );
}

function TypeScrollPicker({ value, onChange, accent = "indigo" }: { value: string; onChange: (v: string) => void; accent?: string }) {
  const activeClass = accent === "rose"
    ? "bg-rose-500 text-white border-rose-500"
    : "bg-indigo-500 text-white border-indigo-500";
  const inactiveClass = accent === "rose"
    ? "bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-400"
    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-400";
  return (
    <div className="overflow-x-auto flex gap-2 pb-1 scrollbar-none -mx-3 px-3">
      {Object.keys(RATES).map((k) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition-all whitespace-nowrap active:scale-95 ${value === k ? activeClass : inactiveClass}`}>
          {k}
        </button>
      ))}
    </div>
  );
}

// Multi-item voucher editor
function VoucherItems({
  items, errors, onChange, onToggleGift, onAdd, onRemove, baseDeduct, accent = "indigo",
}: {
  items: VoucherItem[];
  errors: string[];
  onChange: (idx: number, field: "type" | "amount", val: string) => void;
  onToggleGift: (idx: number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  baseDeduct: number;
  accent?: string;
}) {
  const rawTotalPayment = items.reduce((sum, item) => sum + computeItem(item, baseDeduct).payment, 0);
  const totalFace = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const hasAnyAmount = items.some((item) => (parseFloat(item.amount) || 0) > 0);
  const travelDeduct = hasAnyAmount && totalFace < 300000 ? 3000 : 0;
  const totalPayment = Math.max(0, rawTotalPayment - travelDeduct);
  const cl = accent === "rose"
    ? { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-500", textDark: "text-rose-600", dashed: "border-rose-200 text-rose-400 hover:bg-rose-50" }
    : { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-500", textDark: "text-indigo-600", dashed: "border-indigo-200 text-indigo-400 hover:bg-indigo-50" };

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
        상품권 종류 &amp; 금액 <span className="text-rose-400 normal-case tracking-normal">*</span>
      </label>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const { amountNum, rate, payment } = computeItem(item, baseDeduct);
          const selectFocus = accent === "rose"
            ? "focus:border-rose-400 focus:ring-2 focus:ring-rose-50"
            : "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50";
          const arrowColor = accent === "rose" ? "%23f43f5e" : "%236366f1";
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {/* Row 1: select + 증정용 버튼 + 삭제 */}
              <div className="flex gap-2 items-stretch">
                <div className="flex-1 relative">
                  <select
                    value={item.type}
                    onChange={(e) => onChange(idx, "type", e.target.value)}
                    className={`w-full h-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-700 outline-none appearance-none pr-7 transition-all ${selectFocus}`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='${arrowColor}' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                  >
                    {Object.keys(RATES).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleGift(idx)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl font-bold text-[13px] border-2 transition-all duration-150 active:scale-95 flex items-center gap-1.5
                    ${item.isGift
                      ? "bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-200"
                      : "bg-white border-slate-200 text-slate-400 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-500"}`}
                >
                  <span className="text-[15px]">🎁</span>
                  <div className="flex flex-col items-center leading-tight">
                    <span>증정용</span>
                    {item.isGift && <span className="text-[9px] font-bold opacity-90">-1%</span>}
                  </div>
                </button>
                {items.length > 1 && (
                  <button type="button" onClick={() => onRemove(idx)}
                    className="w-8 flex items-center justify-center rounded-xl bg-rose-100 text-rose-400 hover:bg-rose-200 active:scale-90 transition-all flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {/* Row 2: 금액 입력 */}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={item.amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  onChange(idx, "amount", v);
                }}
                placeholder="금액 입력 (원)"
                className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-300
                  ${errors[idx] ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
              />
              {/* Row 3: 오류 + 금액 미리보기 */}
              {errors[idx] && <p className="text-[11px] text-rose-500">⚠ {errors[idx]}</p>}
              {amountNum > 0 && (
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold ${cl.bg} ${cl.text}`}>
                  <span className="flex items-center gap-1.5">
                    요율 {Math.round(rate * 100)}%
                    {item.isGift && <span className="text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded-full">증정 -1%</span>}
                  </span>
                  <span className={`font-black text-[15px] ${cl.textDark}`}>{formatKRW(payment)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={onAdd}
        className={`w-full py-2.5 rounded-2xl border-2 border-dashed text-[13px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${cl.dashed}`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        권종 추가
      </button>

      {hasAnyAmount && (
        <div className={`rounded-2xl border ${cl.bg} ${cl.border} overflow-hidden`}>
          <div className={`flex items-center justify-between px-4 py-3`}>
            <div className="space-y-0.5">
              <p className={`text-[11px] ${cl.text}`}>총 상품권금액</p>
              <p className={`text-[13px] font-semibold ${cl.text}`}>{formatKRW(totalFace)}</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className={`text-[11px] ${cl.text}`}>{items.length > 1 ? "합산 입금받을 금액" : "입금받을 금액"}</p>
              <p className={`text-[20px] font-black tabular-nums ${cl.textDark}`}>{formatKRW(totalPayment)}</p>
            </div>
          </div>
          {travelDeduct > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-t border-amber-100">
              <p className="text-[11px] text-amber-600 font-semibold">이동경비 차감</p>
              <p className="text-[12px] font-bold text-amber-700">- {formatKRW(travelDeduct)}</p>
            </div>
          )}
        </div>
      )}

      {hasAnyAmount && totalFace < 300000 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
          <span className="text-[15px] flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-[12px] font-bold text-amber-700 leading-snug">30만원 미만 신청 안내</p>
            <p className="text-[12px] text-amber-600 mt-0.5 leading-relaxed">
              상품권금액 30만원 미만의 판매 신청은 이동경비로 인하여 <span className="font-bold">3,000원이 차감</span>됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ onGoUrgent, initialType = DEFAULT_TYPE, onTypeChange, rateGroups: propRateGroups, noticeBanner }: { onGoUrgent: () => void; initialType?: string; onTypeChange?: (t: string) => void; rateGroups?: typeof RATE_GROUPS; noticeBanner?: string }) {
  const rateGroups = propRateGroups ?? RATE_GROUPS;
  const nameComposing = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [locationMain, setLocationMain] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [items, setItems] = useState<VoucherItem[]>([{ type: initialType, amount: "", isGift: false }]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; date?: string; time?: string; locationMain?: string; bankName?: string; accountNumber?: string; accountHolder?: string; agreeMatch?: string; pin?: string }>({});
  const [itemErrors, setItemErrors] = useState<string[]>([""]);
  const [submissions, setSubmissions] = useState<ReservationEntry[]>([]);
  const [toast, setToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [counter, setCounter] = useState(0);
  const [agreedPrivacy] = useState(() => new URLSearchParams(window.location.search).get("agreed") === "1");
  const [showForm, setShowForm] = useState(() => new URLSearchParams(window.location.search).get("agreed") === "1");
  const [userLang, setUserLang] = useState(() => getSavedLang());
  const submissionsRef = useRef<HTMLDivElement>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [customerPin, setCustomerPin] = useState("");
  const [customerPinConfirm, setCustomerPinConfirm] = useState("");

  function addItem() { setItems((p) => [...p, { type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors((p) => [...p, ""]); }
  function removeItem(idx: number) { setItems((p) => p.filter((_, i) => i !== idx)); setItemErrors((p) => p.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: "type" | "amount", val: string) {
    setItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));
    setItemErrors((p) => p.map((e, i) => i === idx ? "" : e));
    if (idx === 0 && field === "type") onTypeChange?.(val);
  }
  function toggleGift(idx: number) { setItems((p) => p.map((it, i) => i === idx ? { ...it, isGift: !it.isGift } : it)); }

  function validate() {
    const fe: typeof fieldErrors = {};
    if (!name.trim()) fe.name = "성명을 입력해주세요";
    else if (!/^[가-힣a-zA-Z\s]+$/.test(name.trim())) fe.name = "성명은 한글 또는 영문만 입력 가능합니다";
    if (!phone.trim()) fe.phone = "연락처를 입력해주세요";
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const cutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const cutoffHHMM = cutoff.toDateString() !== now.toDateString()
      ? "23:59"
      : `${String(cutoff.getHours()).padStart(2, "0")}:${String(cutoff.getMinutes()).padStart(2, "0")}`;
    if (!date) fe.date = "날짜 선택";
    else if (date < localDateStr) fe.date = "지난 날짜는 선택할 수 없습니다";
    if (!time || !isValidTime(time)) fe.time = "시간을 선택해주세요";
    else if (date === localDateStr && time <= cutoffHHMM) fe.time = "현재 시간 기준 2시간 이내는 예약할 수 없습니다";
    if (!locationMain.trim()) fe.locationMain = "거래 장소를 입력해주세요";
    if (!bankName) fe.bankName = "은행을 선택해주세요";
    if (!accountNumber.trim()) fe.accountNumber = "계좌번호를 입력해주세요";
    if (!accountHolder.trim()) fe.accountHolder = "예금주를 입력해주세요";
    if (name.trim() && accountHolder.trim() && name.trim() !== accountHolder.trim()) fe.agreeMatch = "성명과 예금주가 일치하지 않습니다";
    if (customerPin && !/^\d{4}$/.test(customerPin)) fe.pin = "비밀번호는 숫자 4자리여야 합니다";
    else if (customerPin && customerPin !== customerPinConfirm) fe.pin = "비밀번호가 일치하지 않습니다";
    setFieldErrors(fe);
    const ie = items.map((item) => (parseFloat(item.amount) || 0) <= 0 ? "금액을 입력해주세요" : "");
    setItemErrors(ie);
    return Object.keys(fe).length === 0 && ie.every((e) => !e);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const location = [locationMain, locationDetail].filter(Boolean).join(" ");
    const savedItems: SavedItem[] = items.map((item) => {
      const { amountNum, rate, payment } = computeItem(item, 0);
      return { type: item.type, amount: amountNum, rate, payment, isGift: item.isGift };
    });
    const totalFace = savedItems.reduce((s, it) => s + it.amount, 0);
    const totalPayment = Math.max(0, savedItems.reduce((s, it) => s + it.payment, 0) - (totalFace < 300000 ? 3000 : 0));
    let id = getNextId();
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "reservation", isUrgent: false, name, phone, date, time, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder, customerPin: customerPin || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "오류가 발생했습니다.");
        setTimeout(() => setErrorMsg(""), 4000);
        return;
      }
      const data = await res.json();
      id = data.id;
    } catch {
      setErrorMsg("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }
    setCounter(id);
    setSubmissions((p) => [{ id, name, phone, date, time, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder, isUrgent: false }, ...p]);
    saveEntry({ kind: "reservation", id, createdAt: new Date().toISOString(), name, phone, date, time, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder });
    setName(""); setPhone(""); setDate(""); setTime(""); setLocationMain(""); setLocationDetail(""); setAccountNumber(""); setAccountHolder("");
    setItems([{ type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors([""]);
    setToast(true); setTimeout(() => setToast(false), 3000);
    setTimeout(() => submissionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60">
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"><span>✓</span> 예약이 접수되었습니다!</div>
      </div>
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-[calc(100%-2rem)] max-w-sm ${errorMsg ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-rose-500 text-white text-[13px] font-semibold px-5 py-3.5 rounded-2xl shadow-lg flex items-start gap-2.5 whitespace-pre-line"><span className="flex-shrink-0 mt-0.5">⚠</span><span>{errorMsg}</span></div>
      </div>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-[17px] font-bold text-slate-800">우리동네상품권 판매예약</h1>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium tracking-wide">GIFT CERTIFICATE RESERVATION</p>
            </div>
            {/* 언어 선택 버튼 */}
            <button
              onClick={() => setLangPickerOpen((v) => !v)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-[12px] font-semibold text-slate-600"
              title="언어 선택"
            >
              <span className="text-[14px] leading-none">{LANGUAGES.find((l) => l.code === userLang)?.flag ?? "🌐"}</span>
              <span className="hidden sm:inline">{LANGUAGES.find((l) => l.code === userLang)?.label}</span>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="opacity-50"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
            {submissions.length > 0 && <span className="flex-shrink-0 bg-indigo-100 text-indigo-600 text-[12px] font-bold px-3 py-1.5 rounded-full">{submissions.length}건 접수</span>}
          </div>
        </div>
        {/* 언어 선택 드롭다운 */}
        {langPickerOpen && (
          <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-2.5">
            <div className="max-w-md mx-auto flex flex-col gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setUserLang(l.code); saveLang(l.code); setLangPickerOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all active:scale-[0.98]
                    ${userLang === l.code
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

      {noticeBanner && (
        <div className="max-w-md mx-auto px-4 pt-3">
          <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <span className="text-[16px] flex-shrink-0 mt-0.5">📢</span>
            <p className="text-[13px] text-amber-800 font-medium leading-relaxed whitespace-pre-line">{noticeBanner}</p>
          </div>
        </div>
      )}
      <div className="max-w-md mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* 동의 전: 예약 확인 + 시세 + 안내 */}
        {!agreedPrivacy && (
          <>
            {/* 예약확인 — 시세 위로 이동, 강조 스타일 */}
            <a
              href="/check.html"
              className="flex items-center justify-between px-5 py-4 rounded-3xl shadow-md active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-[20px]">🔍</div>
                <div>
                  <p className="text-[15px] font-black text-white">{getLabel("reservation_check", userLang)}</p>
                  <p className="text-[12px] text-indigo-200 mt-0.5">전화번호로 예약 현황 조회</p>
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div><h2 className="text-[15px] font-bold text-slate-800">상품권 시세</h2><p className="text-[12px] text-slate-400 mt-0.5">Exchange Rates</p></div>
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">💳</div>
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2.5">
                {rateGroups.map((g) => (
                  <div
                    key={g.label}
                    onClick={() => { window.location.href = `/terms.html?type=${encodeURIComponent(g.label)}`; }}
                    className="flex flex-col items-center justify-center px-2 rounded-2xl cursor-pointer active:scale-[0.97] transition-all text-center"
                    style={{ backgroundColor: g.color + "12", height: "116px" }}
                  >
                    <span className="text-[12px] font-semibold text-slate-600 leading-snug text-center">{g.display}</span>
                    <span className="text-[22px] font-black tabular-nums leading-none mt-1.5" style={{ color: g.color }}>{g.rate}%</span>
                    <span className="text-[10px] text-slate-400 leading-tight mt-1.5 min-h-[13px]">{g.sub ?? ""}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/business"
              className="flex items-center justify-between px-4 py-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px]">🏢</span>
                <div>
                  <p className="text-[13px] font-semibold text-indigo-700">사업자정보 / 고객센터</p>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          </>
        )}

        {/* Urgent Banner */}
        {agreedPrivacy && (
          <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div><h2 className="text-[15px] font-bold text-slate-800">{getLabel("urgent_sell_request", userLang)}</h2><p className="text-[12px] text-slate-400 mt-0.5">Urgent Sale Request</p></div>
              <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">🚨</div>
            </div>
            <div className="px-5 pb-5">
              <p className="text-[13px] text-slate-500 mb-3">지금 바로 판매가 필요하신가요? 긴급 판매 신청 페이지로 이동합니다.</p>
              <button type="button" onClick={onGoUrgent} className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}>
                <span>🚨</span> {getLabel("urgent_sell_request", userLang)}
              </button>
            </div>
          </div>
        )}

        {/* 예약신청 버튼 or 폼 */}
        {agreedPrivacy && (!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-between px-5 py-4 bg-indigo-500 rounded-3xl shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-[18px]">📋</div>
              <div className="text-left">
                <p className="text-[14px] font-bold text-white">{getLabel("reservation_request", userLang)}</p>
                <p className="text-[11px] text-indigo-200 mt-0.5">상품권 매입 예약하기</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div><h2 className="text-[15px] font-bold text-slate-800">{getLabel("reservation_request", userLang)}</h2><p className="text-[12px] text-slate-400 mt-0.5">Reservation Form</p></div>
            <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} autoComplete="off" className="px-5 pb-5 space-y-4">
            {/* 브라우저 자동완성 흡수용 숨김 더미 필드 */}
            <input type="text" name="fake_id_absorb" style={{display:"none"}} autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" />
            <input type="password" name="fake_pw_absorb" style={{display:"none"}} autoComplete="current-password" readOnly tabIndex={-1} aria-hidden="true" />
            <Field label="성명" required error={fieldErrors.name}>
              <input type="text" value={name} autoComplete="new-password" lang="ko" spellCheck={false}
                onCompositionStart={() => { nameComposing.current = true; }}
                onCompositionEnd={(e) => { nameComposing.current = false; setName(e.currentTarget.value.replace(/[^가-힣a-zA-Z\s]/g, "")); setFieldErrors((p) => ({ ...p, name: "" })); }}
                onChange={(e) => { const v = nameComposing.current ? e.target.value : e.target.value.replace(/[^가-힣a-zA-Z\s]/g, ""); setName(v); setFieldErrors((p) => ({ ...p, name: "" })); }}
                placeholder="홍길동" className={inputCls(!!fieldErrors.name)} />
            </Field>
            <Field label="연락처" required error={fieldErrors.phone}>
              <input type="tel" value={phone} autoComplete="new-password" onChange={(e) => { setPhone(formatPhoneInput(e.target.value)); setFieldErrors((p) => ({ ...p, phone: "" })); }} placeholder="010-0000-0000" className={inputCls(!!fieldErrors.phone)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="예약 날짜" required error={fieldErrors.date}>
                <input
                  type="date"
                  value={date}
                  min={(() => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
                  onChange={async (e) => {
                    const d = e.target.value;
                    setDate(d);
                    setFieldErrors((p) => ({ ...p, date: "", time: "" }));
                    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
                    const cutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                    const localDateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
                    const cutoffHHMM = cutoff.toDateString() !== now.toDateString()
                      ? "23:59"
                      : `${String(cutoff.getHours()).padStart(2, "0")}:${String(cutoff.getMinutes()).padStart(2, "0")}`;
                    if (d) {
                      try {
                        const res = await fetch(`/api/reservations/by-date?date=${d}`);
                        const list = await res.json() as { time?: string; status?: string }[];
                        const taken = list
                          .filter((r) => r.status === "pending" || r.status === "assigned")
                          .map((r) => r.time ?? "");
                        setTakenSlots(taken.filter(Boolean));
                        if (taken.includes(time)) setTime("");
                        if (d === localDateStr && time && time <= cutoffHHMM) setTime("");
                      } catch {
                        setTakenSlots([]);
                      }
                    } else {
                      setTakenSlots([]);
                    }
                  }}
                  className={inputCls(!!fieldErrors.date)}
                />
              </Field>
              <Field label="예약 시간" required error={fieldErrors.time}>
                <select
                  value={time}
                  onChange={(e) => { setTime(e.target.value); setFieldErrors((p) => ({ ...p, time: "" })); }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-[14px] outline-none transition-all bg-white appearance-none
                    ${fieldErrors.time ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-rose-400" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 text-slate-800"}
                    ${!time ? "text-slate-400" : ""}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%236366f1' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                >
                  <option value="">시간 선택</option>
                  {(() => {
                    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
                    const cutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                    const localDateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
                    const isToday = date === localDateStr;
                    const cutoffHHMM = cutoff.toDateString() !== now.toDateString()
                      ? "23:59"
                      : `${String(cutoff.getHours()).padStart(2, "0")}:${String(cutoff.getMinutes()).padStart(2, "0")}`;
                    return TIME_OPTIONS.map((t) => {
                      const isPast = isToday && t <= cutoffHHMM;
                      const taken = takenSlots.includes(t);
                      const disabled = isPast || taken;
                      return (
                        <option key={t} value={t} disabled={disabled}>
                          {taken ? `❌ ${t}` : isPast ? `🔒 ${t}` : `⭕ ${t}`}
                        </option>
                      );
                    });
                  })()}
                </select>
              </Field>
            </div>
            <Field label="거래 장소" required error={fieldErrors.locationMain}>
              <LocationSearchInput
                value={locationMain}
                onChange={(v) => { setLocationMain(v); setFieldErrors((p) => ({ ...p, locationMain: "" })); }}
                error={!!fieldErrors.locationMain}
              />
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="상세위치 (예 롯데백화점 정문, OO아파트 101동)"
                lang="ko"
                spellCheck={false}
                className={`${inputCls(false)} mt-2`}
              />
              <p className="text-[12px] text-amber-600 font-bold mt-1.5 flex items-start gap-1"><span className="mt-0.5 flex-shrink-0">⚠️</span>주정차가 가능한 장소로 입력해 주세요</p>
            </Field>
            <VoucherItems items={items} errors={itemErrors} onChange={updateItem} onToggleGift={toggleGift} onAdd={addItem} onRemove={removeItem} baseDeduct={0} />
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-indigo-400 flex-shrink-0"><rect x="1" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M1 9h18" stroke="currentColor" strokeWidth="1.6"/></svg>
                <span className="text-[12px] font-bold text-indigo-500 uppercase tracking-wide">입금 계좌 정보</span>
              </div>
              <div className="px-4 pb-4 space-y-2.5 mt-2">
                <div>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-800 outline-none transition-all bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%236366f1' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    <option value="">은행 선택</option>
                    {KOREAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={accountNumber}
                    autoComplete="new-password"
                    onChange={(e) => { setAccountNumber(e.target.value); setFieldErrors((p) => ({ ...p, accountNumber: "" })); }}
                    placeholder="계좌번호 (예: 123-456-789012)"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300
                      ${fieldErrors.accountNumber ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`}
                  />
                  {fieldErrors.accountNumber && <p className="text-[11px] text-rose-500 mt-1">⚠ {fieldErrors.accountNumber}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={accountHolder}
                    autoComplete="new-password"
                    lang="ko"
                    spellCheck={false}
                    onChange={(e) => { setAccountHolder(e.target.value); setFieldErrors((p) => ({ ...p, accountHolder: "" })); }}
                    placeholder="예금주"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300
                      ${fieldErrors.accountHolder ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`}
                  />
                  {fieldErrors.accountHolder && <p className="text-[11px] text-rose-500 mt-1">⚠ {fieldErrors.accountHolder}</p>}
                </div>
              </div>
            </div>
            {/* 신청자·예금주 동일 확인 */}
            <div className={`rounded-2xl border px-4 py-4 space-y-3 ${fieldErrors.agreeMatch ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="text-[12px] font-bold text-amber-700 flex items-center gap-1.5">⚠️ 신청자와 예금주 확인</p>
              <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
                <div className="flex items-center px-4 py-2.5 border-b border-amber-100">
                  <span className="text-[12px] font-semibold text-slate-400 w-16 flex-shrink-0">성명</span>
                  <span className={`text-[14px] font-bold ${name.trim() ? "text-slate-800" : "text-slate-300"}`}>
                    {name.trim() || "홍길동"}
                  </span>
                </div>
                <div className="flex items-center px-4 py-2.5">
                  <span className="text-[12px] font-semibold text-slate-400 w-16 flex-shrink-0">예금주</span>
                  <span className={`text-[14px] font-bold ${accountHolder.trim() ? "text-slate-800" : "text-slate-300"}`}>
                    {accountHolder.trim() || "홍길동"}
                  </span>
                </div>
              </div>
              {/* 자동 일치 여부 표시 */}
              {name.trim() && accountHolder.trim() ? (
                name.trim() === accountHolder.trim() ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 3L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-[13px] font-bold text-emerald-700">성명과 예금주가 일치합니다</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </div>
                    <span className="text-[13px] font-bold text-rose-700">성명과 예금주가 일치하지 않습니다</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="1.5" fill="white"/></svg>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-400">성명과 예금주를 모두 입력하면 자동 확인됩니다</span>
                </div>
              )}
            </div>

            {/* 예약 비밀번호 (선택) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-slate-400 flex-shrink-0"><rect x="3" y="8" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">예약 비밀번호 설정</span>
                <span className="text-[11px] text-slate-400">(선택)</span>
              </div>
              <div className="px-4 pb-4 space-y-2.5 mt-2">
                <p className="text-[12px] text-slate-400">예약 확인 시 사용할 숫자 4자리 비밀번호를 설정하세요.</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="new-password"
                  value={customerPin}
                  onChange={(e) => { setCustomerPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setFieldErrors((p) => ({ ...p, pin: "" })); }}
                  placeholder="숫자 4자리"
                  className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300 tracking-[0.3em]
                    ${fieldErrors.pin ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`}
                />
                {customerPin.length > 0 && (
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    value={customerPinConfirm}
                    onChange={(e) => { setCustomerPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setFieldErrors((p) => ({ ...p, pin: "" })); }}
                    placeholder="비밀번호 확인"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300 tracking-[0.3em]
                      ${fieldErrors.pin
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        : customerPinConfirm.length === 4 && customerPin === customerPinConfirm
                        ? "border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`}
                  />
                )}
                {fieldErrors.pin
                  ? <p className="text-[11px] text-rose-500">⚠ {fieldErrors.pin}</p>
                  : customerPinConfirm.length === 4 && customerPin === customerPinConfirm
                  ? <p className="text-[11px] text-green-600 font-semibold">✓ 비밀번호가 일치합니다</p>
                  : null}
              </div>
            </div>

            {(() => {
              const missing: string[] = [];
              const _now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
              const _cutoff = new Date(_now.getTime() + 2 * 60 * 60 * 1000);
              const _localDateStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-${String(_now.getDate()).padStart(2,"0")}`;
              const _cutoffHHMM = _cutoff.toDateString() !== _now.toDateString()
                ? "23:59"
                : `${String(_cutoff.getHours()).padStart(2, "0")}:${String(_cutoff.getMinutes()).padStart(2, "0")}`;
              if (!name.trim()) missing.push("성명");
              if (!phone.trim()) missing.push("연락처");
              if (!date) missing.push("날짜");
              else if (date < _localDateStr) missing.push("날짜(지난 날짜 불가)");
              if (!time || !isValidTime(time)) missing.push("시간");
              else if (date === _localDateStr && time <= _cutoffHHMM) missing.push("시간(2시간 이내 예약 불가)");
              if (!locationMain.trim()) missing.push("거래 장소");
              if (!bankName) missing.push("은행");
              if (!accountNumber.trim()) missing.push("계좌번호");
              if (!accountHolder.trim()) missing.push("예금주");
              if (name.trim() && accountHolder.trim() && name.trim() !== accountHolder.trim()) missing.push("성명·예금주 불일치");
              if (items.some((it) => (parseFloat(it.amount) || 0) <= 0)) missing.push("상품권 금액");
              if (customerPin && (!/^\d{4}$/.test(customerPin) || customerPin !== customerPinConfirm)) missing.push("비밀번호 확인");
              if (missing.length === 0) return null;
              return (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                  <p className="text-[12px] font-bold text-amber-700">⚠ 아래 항목을 입력해야 신청이 완료됩니다</p>
                  <ul className="text-[12px] text-amber-600 space-y-0.5">
                    {missing.map((m) => <li key={m}>• {m}</li>)}
                  </ul>
                </div>
              );
            })()}

            <p className="text-[12px] text-slate-400 text-center">입력하신 정보는 예약 및 거래 진행 목적으로만 사용됩니다.</p>
            <button type="submit" className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
              {getLabel("reservation_submit", userLang)}
            </button>
          </form>
        </div>
        ))}

        {/* Submissions */}
        <div ref={submissionsRef} />
        {submissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-slate-700">접수 내역</h2>
              <span className="text-[12px] text-slate-400">최신순</span>
            </div>
            {submissions.map((s) => (
              <SubmissionCard key={s.id} entry={s} />
            ))}
            {/* 접수 완료 후 예약확인 바로가기 */}
            <a
              href="/check.html"
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-[15px] font-bold shadow-md active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <span className="text-[18px]">🔍</span>
              예약 확인 바로가기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── SUBMISSION CARD ──────────────────────────────────────────────────────────
function SubmissionCard({ entry }: { entry: ReservationEntry | UrgentEntry }) {
  const isUrgent = entry.isUrgent;
  const isRes = "date" in entry && !!(entry as ReservationEntry).date;
  const ac = isUrgent
    ? { text: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", pill: "bg-rose-100 text-rose-600" }
    : { text: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-100", pill: "bg-indigo-100 text-indigo-600" };

  const [showModal, setShowModal] = useState(false);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  async function openAssign() {
    const token = localStorage.getItem("gc_admin_token");
    if (!token) { alert("관리자 로그인이 필요합니다."); return; }
    try {
      const res = await fetch("/api/admin/staff", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { alert("직원 목록을 불러올 수 없습니다."); return; }
      const data: any[] = await res.json();
      setStaffList(data.map((s) => ({ id: s.id, name: s.name })));
    } catch { alert("서버 오류가 발생했습니다."); return; }
    setShowModal(true);
  }

  async function doAssign(staffId: number, staffName: string) {
    const token = localStorage.getItem("gc_admin_token");
    if (!token || !entry.id) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/reservations/${entry.id}/assign`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (res.ok) { setAssignedTo(staffName); setShowModal(false); }
      else { alert("배정에 실패했습니다."); }
    } catch { alert("서버 오류가 발생했습니다."); }
    finally { setAssigning(false); }
  }

  return (
    <div
      className="rounded-3xl shadow-sm overflow-hidden"
      style={isUrgent
        ? { border: "2px solid #ef4444", background: "#ffe5e5" }
        : { border: "1px solid #f1f5f9", background: "#ffffff" }
      }
    >

      {/* ── 긴급 상단 배너 ── */}
      {isUrgent && (
        <div className="w-full px-4 py-1.5 flex items-center gap-1.5" style={{ background: "#ef4444" }}>
          <span className="text-white text-[12px] font-black tracking-wide">🚨 긴급</span>
        </div>
      )}

      {/* ── 카드 헤더 라벨 ── */}
      <div className={`px-5 pt-4 pb-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {!isUrgent && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide ${ac.pill}`}>
              📋 예약 카드
            </span>
          )}
          <span className="text-[11px] text-slate-300">#{entry.id}</span>
        </div>
        <span className={`text-[11px] font-semibold ${ac.text}`}>{entry.items.length}종류</span>
      </div>

      {/* ── 날짜·장소·성함·연락처 ── */}
      <div className="px-5 pb-3 space-y-2">
        {isRes && (
          <p className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
            <span>📅</span>
            <span>{formatDateKo((entry as ReservationEntry).date)} {(entry as ReservationEntry).time}</span>
          </p>
        )}
        <p className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
          <span>📍</span>
          <span className="truncate">{entry.location || "—"}</span>
        </p>
        <p className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
          <span>👤</span>
          <span>{(entry as ReservationEntry).name || "—"}</span>
        </p>
        <p className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
          <span>📞</span>
          <span>{entry.phone}</span>
        </p>
      </div>

      <div className="mx-4 h-px bg-slate-100 mb-3" />

      {/* ── 상품권 내역 ── */}
      <div className="px-4 space-y-1.5 mb-3">
        {entry.items.map((it, i) => (
          <div key={i} className={`px-3 py-2 rounded-xl text-[12px] ${ac.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">{it.type.split(" ")[0]}</span>
                <span className={ac.text}>{Math.round(it.rate * 100)}%</span>
                {it.isGift && <span className="text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded-full">증정용</span>}
              </div>
              <div className="text-right">
                <span className="text-slate-400 mr-2">{formatKRW(it.amount)}</span>
                <span className={`font-black ${ac.text}`}>{formatKRW(it.payment)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 합계 ── */}
      <div className={`mx-4 mb-3 flex items-center justify-between px-4 py-3 rounded-2xl border ${ac.bg} ${ac.border}`}>
        <div>
          <p className="text-[11px] text-slate-400">총 상품권금액</p>
          <p className="text-[13px] font-semibold text-slate-600">{formatKRW(entry.items.reduce((s, it) => s + it.amount, 0))}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">입금받을 금액</p>
          <p className={`text-[18px] font-black ${ac.text}`}>{formatKRW(entry.totalPayment)}</p>
        </div>
      </div>

      {/* ── 계좌 정보 ── */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">입금 계좌 정보</p>
        {[
          { label: "은행", value: entry.bankName },
          { label: "계좌번호", value: entry.accountNumber },
          { label: "예금주", value: entry.accountHolder },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{label}</span>
            <span className="text-[13px] font-semibold text-slate-700">{value}</span>
          </div>
        ))}
      </div>

      {/* ── 채팅 안내 문구 ── */}
      <div className="px-5 pb-4 pt-2">
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          💬 매입담당자가 지정되면 <span className="font-semibold text-slate-500">예약확인</span>에서 담당자와 채팅이 가능합니다
        </p>
      </div>

      {/* ── 직원 선택 모달 ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-[16px] font-black text-slate-800">담당자 선택</p>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-xl leading-none">✕</button>
            </div>
            <div className="h-px bg-slate-100 mx-5 mb-2" />
            {staffList.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-8">등록된 직원이 없습니다.</p>
            ) : (
              <ul className="px-4 space-y-2 max-h-72 overflow-y-auto">
                {staffList.map((s) => (
                  <li key={s.id}>
                    <button
                      disabled={assigning}
                      onClick={() => doAssign(s.id, s.name)}
                      className="w-full text-left px-4 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-[14px] font-semibold text-slate-800 hover:bg-indigo-50 hover:border-indigo-200 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      👤 {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── URGENT SALE PAGE ─────────────────────────────────────────────────────────
function UrgentPage({ onBack, initialType = DEFAULT_TYPE }: { onBack: () => void; initialType?: string }) {
  const nameComposing = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationMain, setLocationMain] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [items, setItems] = useState<VoucherItem[]>([{ type: initialType, amount: "", isGift: false }]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; locationMain?: string; bankName?: string; accountNumber?: string; accountHolder?: string; agreeMatch?: string; pin?: string }>({});
  const [itemErrors, setItemErrors] = useState<string[]>([""]);
  const [submissions, setSubmissions] = useState<UrgentEntry[]>([]);
  const [toast, setToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [counter, setCounter] = useState(0);
  const [customerPin, setCustomerPin] = useState("");
  const [customerPinConfirm, setCustomerPinConfirm] = useState("");
  const urgentLang = getSavedLang();
  const submissionsRef = useRef<HTMLDivElement>(null);

  function addItem() { setItems((p) => [...p, { type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors((p) => [...p, ""]); }
  function removeItem(idx: number) { setItems((p) => p.filter((_, i) => i !== idx)); setItemErrors((p) => p.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: "type" | "amount", val: string) {
    setItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));
    setItemErrors((p) => p.map((e, i) => i === idx ? "" : e));
  }
  function toggleGift(idx: number) { setItems((p) => p.map((it, i) => i === idx ? { ...it, isGift: !it.isGift } : it)); }

  function validate() {
    const fe: typeof fieldErrors = {};
    if (!name.trim()) fe.name = "성명을 입력해주세요";
    else if (!/^[가-힣a-zA-Z\s]+$/.test(name.trim())) fe.name = "이름은 한글 또는 영문만 입력 가능합니다";
    if (!phone.trim()) fe.phone = "판매자 전화번호를 입력해주세요";
    if (!locationMain.trim()) fe.locationMain = "거래 장소를 입력해주세요";
    if (!bankName) fe.bankName = "은행을 선택해주세요";
    if (!accountNumber.trim()) fe.accountNumber = "계좌번호를 입력해주세요";
    if (!accountHolder.trim()) fe.accountHolder = "예금주를 입력해주세요";
    if (name.trim() && accountHolder.trim() && name.trim() !== accountHolder.trim()) fe.agreeMatch = "성명과 예금주가 일치하지 않습니다";
    if (customerPin && !/^\d{4}$/.test(customerPin)) fe.pin = "비밀번호는 숫자 4자리여야 합니다";
    else if (customerPin && customerPin !== customerPinConfirm) fe.pin = "비밀번호가 일치하지 않습니다";
    setFieldErrors(fe);
    const ie = items.map((item) => (parseFloat(item.amount) || 0) <= 0 ? "금액을 입력해주세요" : "");
    setItemErrors(ie);
    return Object.keys(fe).length === 0 && ie.every((e) => !e);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const location = [locationMain, locationDetail].filter(Boolean).join(" ");
    const savedItems: SavedItem[] = items.map((item) => {
      const { amountNum, rate, payment } = computeItem(item, 0.01);
      return { type: item.type, amount: amountNum, rate, payment, isGift: item.isGift };
    });
    const totalFace = savedItems.reduce((s, it) => s + it.amount, 0);
    const totalPayment = Math.max(0, savedItems.reduce((s, it) => s + it.payment, 0) - (totalFace < 300000 ? 3000 : 0));
    let id = getNextId();
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "urgent", isUrgent: true, name, phone, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder, customerPin: customerPin || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "오류가 발생했습니다.");
        setTimeout(() => setErrorMsg(""), 4000);
        return;
      }
      const data = await res.json();
      id = data.id;
    } catch {
      setErrorMsg("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }
    setCounter(id);
    setSubmissions((p) => [{ id, name, phone, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder, isUrgent: true }, ...p]);
    saveEntry({ kind: "urgent", id, createdAt: new Date().toISOString(), name, phone, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder });
    setName(""); setPhone(""); setLocationMain(""); setLocationDetail(""); setAccountNumber(""); setAccountHolder("");
    setItems([{ type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors([""]);
    setToast(true); setTimeout(() => setToast(false), 3000);
    setTimeout(() => submissionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 to-slate-100/60">
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-rose-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"><span>✓</span> 긴급 판매 신청이 접수되었습니다!</div>
      </div>
      <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-[calc(100%-2rem)] max-w-sm ${errorMsg ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-slate-800 text-white text-[13px] font-semibold px-5 py-3.5 rounded-2xl shadow-lg flex items-start gap-2.5 whitespace-pre-line"><span className="flex-shrink-0 mt-0.5">⚠</span><span>{errorMsg}</span></div>
      </div>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-slate-800">{getLabel("urgent_sell_request", urgentLang)}</h1>
            <p className="text-[11px] text-rose-400 mt-0.5 font-semibold tracking-wide">URGENT SALE REQUEST · 적용 요율 -1%</p>
          </div>
          {submissions.length > 0 && <span className="ml-auto bg-rose-100 text-rose-500 text-[12px] font-bold px-3 py-1.5 rounded-full">{submissions.length}건</span>}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 pb-16 space-y-4">
        <div className="flex items-start gap-3 px-4 py-3.5 bg-rose-50 border border-rose-100 rounded-2xl">
          <span className="text-xl flex-shrink-0">⚡</span>
          <p className="text-[13px] text-rose-600 font-medium leading-relaxed">긴급 판매 신청은 기본 적용 요율에서 <strong>1%가 차감</strong>됩니다.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div><h2 className="text-[15px] font-bold text-slate-800">{getLabel("sell_request", urgentLang)}</h2><p className="text-[12px] text-slate-400 mt-0.5">Sale Request Form</p></div>
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">📋</div>
          </div>
          <form onSubmit={handleSubmit} autoComplete="off" className="px-5 pb-5 space-y-4">
            {/* 브라우저 자동완성 흡수용 숨김 더미 필드 */}
            <input type="text" name="fake_id_absorb2" style={{display:"none"}} autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" />
            <input type="password" name="fake_pw_absorb2" style={{display:"none"}} autoComplete="current-password" readOnly tabIndex={-1} aria-hidden="true" />
            <Field label="성명" required error={fieldErrors.name}>
              <input type="text" value={name} autoComplete="new-password" lang="ko" spellCheck={false}
                onCompositionStart={() => { nameComposing.current = true; }}
                onCompositionEnd={(e) => { nameComposing.current = false; setName(e.currentTarget.value.replace(/[^가-힣a-zA-Z\s]/g, "")); setFieldErrors((p) => ({ ...p, name: "" })); }}
                onChange={(e) => { const v = nameComposing.current ? e.target.value : e.target.value.replace(/[^가-힣a-zA-Z\s]/g, ""); setName(v); setFieldErrors((p) => ({ ...p, name: "" })); }}
                placeholder="홍길동" className={inputCls(!!fieldErrors.name, "rose")} />
            </Field>
            <Field label="판매자 전화번호" required error={fieldErrors.phone}>
              <input type="tel" value={phone} autoComplete="new-password" onChange={(e) => { setPhone(formatPhoneInput(e.target.value)); setFieldErrors((p) => ({ ...p, phone: "" })); }} placeholder="010-0000-0000" className={inputCls(!!fieldErrors.phone, "rose")} />
            </Field>
            <Field label="거래 장소" required error={fieldErrors.locationMain}>
              <LocationSearchInput
                value={locationMain}
                onChange={(v) => { setLocationMain(v); setFieldErrors((p) => ({ ...p, locationMain: "" })); }}
                error={!!fieldErrors.locationMain}
                accent="rose"
              />
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="상세위치 (예 롯데백화점 정문, OO아파트 101동)"
                lang="ko"
                spellCheck={false}
                className={`${inputCls(false, "rose")} mt-2`}
              />
              <p className="text-[12px] text-amber-600 font-bold mt-1.5 flex items-start gap-1"><span className="mt-0.5 flex-shrink-0">⚠️</span>주정차 가능한 곳으로 입력 바랍니다</p>
            </Field>
            <VoucherItems items={items} errors={itemErrors} onChange={updateItem} onToggleGift={toggleGift} onAdd={addItem} onRemove={removeItem} baseDeduct={0.01} />
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-indigo-400 flex-shrink-0"><rect x="1" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M1 9h18" stroke="currentColor" strokeWidth="1.6"/></svg>
                <span className="text-[12px] font-bold text-indigo-500 uppercase tracking-wide">입금 계좌 정보</span>
              </div>
              <div className="px-4 pb-4 space-y-2.5 mt-2">
                <div>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-800 outline-none transition-all bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%236366f1' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    <option value="">은행 선택</option>
                    {KOREAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={accountNumber}
                    autoComplete="new-password"
                    onChange={(e) => { setAccountNumber(e.target.value); setFieldErrors((p) => ({ ...p, accountNumber: "" })); }}
                    placeholder="계좌번호 (예: 123-456-789012)"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300
                      ${fieldErrors.accountNumber ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`}
                  />
                  {fieldErrors.accountNumber && <p className="text-[11px] text-rose-500 mt-1">⚠ {fieldErrors.accountNumber}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={accountHolder}
                    autoComplete="new-password"
                    lang="ko"
                    spellCheck={false}
                    onChange={(e) => { setAccountHolder(e.target.value); setFieldErrors((p) => ({ ...p, accountHolder: "" })); }}
                    placeholder="예금주"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300
                      ${fieldErrors.accountHolder ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"}`}
                  />
                  {fieldErrors.accountHolder && <p className="text-[11px] text-rose-500 mt-1">⚠ {fieldErrors.accountHolder}</p>}
                </div>
              </div>
            </div>
            {/* 안내사항 */}
            <div className={`rounded-2xl border px-4 py-4 space-y-3 ${fieldErrors.agreeMatch ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="text-[13px] font-bold text-amber-700 flex items-center gap-1.5">
                <span>※</span> 안내사항 <span className="text-[11px] font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">필수 확인</span>
              </p>
              {/* 성함 / 예금주 비교 */}
              <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
                <div className="flex items-center px-4 py-2.5 border-b border-amber-100">
                  <span className="text-[12px] font-semibold text-slate-400 w-16 flex-shrink-0">성명</span>
                  <span className={`text-[14px] font-bold ${name.trim() ? "text-slate-800" : "text-slate-300"}`}>
                    {name.trim() || "홍길동"}
                  </span>
                </div>
                <div className="flex items-center px-4 py-2.5">
                  <span className="text-[12px] font-semibold text-slate-400 w-16 flex-shrink-0">예금주</span>
                  <span className={`text-[14px] font-bold ${accountHolder.trim() ? "text-slate-800" : "text-slate-300"}`}>
                    {accountHolder.trim() || "홍길동"}
                  </span>
                </div>
              </div>
              {/* 자동 일치 여부 표시 */}
              {name.trim() && accountHolder.trim() ? (
                name.trim() === accountHolder.trim() ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 3L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-[13px] font-bold text-emerald-700">성명과 예금주가 일치합니다</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </div>
                    <span className="text-[13px] font-bold text-rose-700">성명과 예금주가 일치하지 않습니다</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="1.5" fill="white"/></svg>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-400">성명과 예금주를 모두 입력하면 자동 확인됩니다</span>
                </div>
              )}
            </div>

            {/* 예약 비밀번호 (선택) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-slate-400 flex-shrink-0"><rect x="3" y="8" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">예약 비밀번호 설정</span>
                <span className="text-[11px] text-slate-400">(선택)</span>
              </div>
              <div className="px-4 pb-4 space-y-2.5 mt-2">
                <p className="text-[12px] text-slate-400">예약 확인 시 사용할 숫자 4자리 비밀번호를 설정하세요.</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="new-password"
                  value={customerPin}
                  onChange={(e) => { setCustomerPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setFieldErrors((p) => ({ ...p, pin: "" })); }}
                  placeholder="숫자 4자리"
                  className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300 tracking-[0.3em]
                    ${fieldErrors.pin ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-50"}`}
                />
                {customerPin.length > 0 && (
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    value={customerPinConfirm}
                    onChange={(e) => { setCustomerPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setFieldErrors((p) => ({ ...p, pin: "" })); }}
                    placeholder="비밀번호 확인"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300 tracking-[0.3em]
                      ${fieldErrors.pin
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        : customerPinConfirm.length === 4 && customerPin === customerPinConfirm
                        ? "border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        : "border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-50"}`}
                  />
                )}
                {fieldErrors.pin
                  ? <p className="text-[11px] text-rose-500">⚠ {fieldErrors.pin}</p>
                  : customerPinConfirm.length === 4 && customerPin === customerPinConfirm
                  ? <p className="text-[11px] text-green-600 font-semibold">✓ 비밀번호가 일치합니다</p>
                  : null}
              </div>
            </div>

            {(() => {
              const missing: string[] = [];
              if (!name.trim()) missing.push("성명");
              if (!phone.trim()) missing.push("연락처");
              if (!locationMain.trim()) missing.push("거래 장소");
              if (!bankName) missing.push("은행");
              if (!accountNumber.trim()) missing.push("계좌번호");
              if (!accountHolder.trim()) missing.push("예금주");
              if (name.trim() && accountHolder.trim() && name.trim() !== accountHolder.trim()) missing.push("성명·예금주 불일치");
              if (items.some((it) => (parseFloat(it.amount) || 0) <= 0)) missing.push("상품권 금액");
              if (customerPin && (!/^\d{4}$/.test(customerPin) || customerPin !== customerPinConfirm)) missing.push("비밀번호 확인");
              if (missing.length === 0) return null;
              return (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                  <p className="text-[12px] font-bold text-amber-700">⚠ 아래 항목을 입력해야 신청이 완료됩니다</p>
                  <ul className="text-[12px] text-amber-600 space-y-0.5">
                    {missing.map((m) => <li key={m}>• {m}</li>)}
                  </ul>
                </div>
              );
            })()}

            <p className="text-[12px] text-slate-400 text-center">입력하신 정보는 예약 및 거래 진행 목적으로만 사용됩니다.</p>
            <button type="submit" className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}>
              <span>🚨</span> {getLabel("urgent_sell_submit", urgentLang)}
            </button>
          </form>
        </div>

        <div ref={submissionsRef} />
        {submissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-slate-700">긴급 접수 내역</h2>
              <span className="text-[12px] text-slate-400">최신순</span>
            </div>
            {submissions.map((s) => <SubmissionCard key={s.id} entry={s} />)}
            {/* 접수 완료 후 예약확인 바로가기 */}
            <a
              href="/check.html"
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white text-[15px] font-bold shadow-md active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg,#f43f5e,#be123c)" }}
            >
              <span className="text-[18px]">🔍</span>
              예약 확인 바로가기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isUrgent = params.get("urgent") === "1";
  const urlLabel = params.get("type") ?? "";
  const resolvedType = (urlLabel && RATE_LABEL_TO_TYPE[urlLabel]) ? RATE_LABEL_TO_TYPE[urlLabel] : DEFAULT_TYPE;

  const [page, setPage] = useState<"home" | "urgent">(isUrgent ? "urgent" : "home");
  const [selectedType, setSelectedType] = useState<string>(resolvedType);
  const [rateGroups, setRateGroups] = useState([...RATE_GROUPS]);
  const [noticeBanner, setNoticeBanner] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupText, setPopupText] = useState("");

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.rates) {
          try {
            const apiRates: Record<string, number> = JSON.parse(data.rates);
            for (const [label, pct] of Object.entries(apiRates)) {
              const type = RATE_LABEL_TO_TYPE[label];
              if (type) RATES[type] = Number(pct) / 100;
            }
            setRateGroups(RATE_GROUPS.map((g) => ({ ...g, rate: apiRates[g.label] ?? g.rate })));
          } catch {}
        }
        if (data.notice_active === "true" && data.notice_text) {
          setNoticeBanner(data.notice_text);
        }
        if (data.paper_popup_enabled === "1" && data.paper_popup_text?.trim()) {
          const dismissed = sessionStorage.getItem("paper_popup_dismissed");
          if (dismissed !== data.paper_popup_text) {
            setPopupText(data.paper_popup_text);
            setPopupOpen(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  function dismissPopup() {
    sessionStorage.setItem("paper_popup_dismissed", popupText);
    setPopupOpen(false);
  }

  return (
    <>
      {/* 지류 공지 팝업 */}
      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-100">
              <span className="text-[20px]">📢</span>
              <h2 className="text-[16px] font-black text-slate-800">공지사항</h2>
            </div>
            <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
              <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">{popupText}</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={dismissPopup}
                className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
      {page === "home"
        ? <HomePage
            onGoUrgent={() => setPage("urgent")}
            initialType={selectedType}
            onTypeChange={setSelectedType}
            rateGroups={rateGroups}
            noticeBanner={noticeBanner}
          />
        : <UrgentPage onBack={() => setPage("home")} initialType={selectedType} />}
    </>
  );
}
