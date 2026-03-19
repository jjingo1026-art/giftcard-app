import { useState } from "react";
import { getNextId, saveEntry } from "@/lib/store";

const RATES: Record<string, number> = {
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

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 9; h <= 18; h++) {
    for (let m = 0; m < 60; m += 10) {
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

const KOREAN_BANKS = [
  "KB국민은행", "신한은행", "우리은행", "하나은행", "IBK기업은행",
  "NH농협은행", "SC제일은행", "씨티은행", "카카오뱅크", "케이뱅크",
  "토스뱅크", "수협은행", "전북은행", "광주은행", "경남은행",
  "부산은행", "대구은행", "제주은행", "새마을금고", "신협",
  "우체국", "산업은행", "수출입은행",
];

interface VoucherItem { type: string; amount: string; isGift: boolean; }
interface SavedItem { type: string; amount: number; rate: number; payment: number; isGift: boolean; }

interface ReservationEntry {
  id: number; name: string; phone: string; date: string; time: string;
  location: string; items: SavedItem[]; totalPayment: number;
  bankName: string; accountNumber: string; accountHolder: string;
}
interface UrgentEntry {
  id: number; name: string; phone: string;
  location: string; items: SavedItem[]; totalPayment: number;
  bankName: string; accountNumber: string; accountHolder: string;
}

function formatKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

// baseDeduct: extra deduction applied on top (e.g. 0.01 for urgent)
function computeItem(item: VoucherItem, baseDeduct: number): { amountNum: number; rate: number; payment: number } {
  const amountNum = parseFloat(item.amount) || 0;
  const giftDeduct = item.isGift ? 0.01 : 0;
  const rate = Math.max(0, (RATES[item.type] ?? 0) - baseDeduct - giftDeduct);
  return { amountNum, rate, payment: Math.floor(amountNum * rate) };
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
  const totalPayment = items.reduce((sum, item) => sum + computeItem(item, baseDeduct).payment, 0);
  const totalFace = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const hasAnyAmount = items.some((item) => (parseFloat(item.amount) || 0) > 0);
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
                type="number"
                value={item.amount}
                onChange={(e) => onChange(idx, "amount", e.target.value)}
                placeholder="금액 입력 (원)"
                min="0"
                step="10000"
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
        <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${cl.bg} ${cl.border}`}>
          <div className="space-y-0.5">
            <p className={`text-[11px] ${cl.text}`}>총 액면가</p>
            <p className={`text-[13px] font-semibold ${cl.text}`}>{formatKRW(totalFace)}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className={`text-[11px] ${cl.text}`}>{items.length > 1 ? "합산 입금받을 금액" : "입금받을 금액"}</p>
            <p className={`text-[20px] font-black tabular-nums ${cl.textDark}`}>{formatKRW(totalPayment)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ onGoUrgent }: { onGoUrgent: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [bankName, setBankName] = useState(KOREAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [items, setItems] = useState<VoucherItem[]>([{ type: DEFAULT_TYPE, amount: "", isGift: false }]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; date?: string; time?: string; location?: string; accountNumber?: string; accountHolder?: string; agreeMatch?: string }>({});
  const [itemErrors, setItemErrors] = useState<string[]>([""]);
  const [agreeMatch, setAgreeMatch] = useState(false);
  const [submissions, setSubmissions] = useState<ReservationEntry[]>([]);
  const [toast, setToast] = useState(false);
  const [counter, setCounter] = useState(0);
  const [agreedPrivacy] = useState(() => new URLSearchParams(window.location.search).get("agreed") === "1");
  const [showForm, setShowForm] = useState(() => new URLSearchParams(window.location.search).get("agreed") === "1");

  function addItem() { setItems((p) => [...p, { type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors((p) => [...p, ""]); }
  function removeItem(idx: number) { setItems((p) => p.filter((_, i) => i !== idx)); setItemErrors((p) => p.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: "type" | "amount", val: string) {
    setItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));
    setItemErrors((p) => p.map((e, i) => i === idx ? "" : e));
  }
  function toggleGift(idx: number) { setItems((p) => p.map((it, i) => i === idx ? { ...it, isGift: !it.isGift } : it)); }

  function validate() {
    const fe: typeof fieldErrors = {};
    if (!name.trim()) fe.name = "이름을 입력해주세요";
    if (!phone.trim()) fe.phone = "연락처를 입력해주세요";
    if (!date) fe.date = "날짜 선택";
    if (!time) fe.time = "시간을 선택해주세요";
    if (!location.trim()) fe.location = "거래 장소를 입력해주세요";
    if (!accountNumber.trim()) fe.accountNumber = "계좌번호를 입력해주세요";
    if (!accountHolder.trim()) fe.accountHolder = "예금주를 입력해주세요";
    if (!agreeMatch) fe.agreeMatch = "신청자와 예금주 동일 여부를 확인해주세요";
    setFieldErrors(fe);
    const ie = items.map((item) => (parseFloat(item.amount) || 0) <= 0 ? "금액을 입력해주세요" : "");
    setItemErrors(ie);
    return Object.keys(fe).length === 0 && ie.every((e) => !e);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const savedItems: SavedItem[] = items.map((item) => {
      const { amountNum, rate, payment } = computeItem(item, 0);
      return { type: item.type, amount: amountNum, rate, payment, isGift: item.isGift };
    });
    const totalPayment = savedItems.reduce((s, it) => s + it.payment, 0);
    let id = getNextId();
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "reservation", name, phone, date, time, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder }),
      });
      if (res.ok) { const data = await res.json(); id = data.id; }
    } catch {}
    setCounter(id);
    setSubmissions((p) => [{ id, name, phone, date, time, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder }, ...p]);
    saveEntry({ kind: "reservation", id, createdAt: new Date().toISOString(), name, phone, date, time, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder });
    setName(""); setPhone(""); setDate(""); setTime(""); setLocation(""); setAccountNumber(""); setAccountHolder("");
    setItems([{ type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors([""]);
    setToast(true); setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60">
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"><span>✓</span> 예약이 접수되었습니다!</div>
      </div>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          {agreedPrivacy && (
            <button onClick={() => { window.location.href = "/"; }} className="text-slate-400 hover:text-slate-600 text-lg flex-shrink-0">←</button>
          )}
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-[17px] font-bold text-slate-800">우리동네상품권 예약</h1>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium tracking-wide">GIFT CERTIFICATE RESERVATION</p>
            </div>
            {submissions.length > 0 && <span className="bg-indigo-100 text-indigo-600 text-[12px] font-bold px-3 py-1.5 rounded-full">{submissions.length}건 접수</span>}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* 동의 전: 시세 + 예약 확인 + 안내 */}
        {!agreedPrivacy && (
          <>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div><h2 className="text-[15px] font-bold text-slate-800">상품권 시세</h2><p className="text-[12px] text-slate-400 mt-0.5">Exchange Rates</p></div>
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">💳</div>
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                {RATE_GROUPS.map((g) => (
                  <div
                    key={g.label}
                    onClick={() => { window.location.href = `/terms.html?type=${encodeURIComponent(g.label)}`; }}
                    className="flex flex-col items-center justify-center px-2 rounded-2xl cursor-pointer active:scale-[0.97] transition-all text-center"
                    style={{ backgroundColor: g.color + "12", height: "86px" }}
                  >
                    <span className="text-[11px] font-semibold text-slate-600 leading-snug text-center">{g.display}</span>
                    <span className="text-[19px] font-black tabular-nums leading-none mt-1" style={{ color: g.color }}>{g.rate}%</span>
                    <span className="text-[9px] text-slate-400 leading-tight mt-1 min-h-[12px]">{g.sub ?? ""}</span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href="/check.html"
              className="flex items-center justify-between px-5 py-4 bg-white rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-[18px]">🔍</div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800">예약 확인</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">전화번호로 예약 현황 조회</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>

            <div className="flex items-center gap-3 px-4 py-3.5 bg-indigo-50 rounded-2xl border border-indigo-100">
              <span className="text-[22px]">👆</span>
              <div>
                <p className="text-[13px] font-semibold text-indigo-700">위 권종을 클릭해주세요</p>
                <p className="text-[11px] text-indigo-400 mt-0.5">공지사항 확인 및 개인정보 동의 후 예약 가능합니다</p>
              </div>
            </div>
          </>
        )}

        {/* Urgent Banner */}
        {agreedPrivacy && (
          <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div><h2 className="text-[15px] font-bold text-slate-800">긴급 판매 신청</h2><p className="text-[12px] text-slate-400 mt-0.5">Urgent Sale Request</p></div>
              <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">🚨</div>
            </div>
            <div className="px-5 pb-5">
              <p className="text-[13px] text-slate-500 mb-3">지금 바로 판매가 필요하신가요? 긴급 판매 신청 페이지로 이동합니다.</p>
              <button type="button" onClick={onGoUrgent} className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}>
                <span>🚨</span> 긴급 판매 신청
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
                <p className="text-[14px] font-bold text-white">예약 신청</p>
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
            <div><h2 className="text-[15px] font-bold text-slate-800">예약 신청</h2><p className="text-[12px] text-slate-400 mt-0.5">Reservation Form</p></div>
            <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
            <Field label="이름" required error={fieldErrors.name}>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }} placeholder="홍길동" className={inputCls(!!fieldErrors.name)} />
            </Field>
            <Field label="연락처" required error={fieldErrors.phone}>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: "" })); }} placeholder="010-0000-0000" className={inputCls(!!fieldErrors.phone)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="예약 날짜" required error={fieldErrors.date}>
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setFieldErrors((p) => ({ ...p, date: "" })); }} className={inputCls(!!fieldErrors.date)} />
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
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="거래 장소" required error={fieldErrors.location}>
              <input type="text" value={location} onChange={(e) => { setLocation(e.target.value); setFieldErrors((p) => ({ ...p, location: "" })); }} placeholder="예: 강남구 역삼동" className={inputCls(!!fieldErrors.location)} />
              <p className="text-[12px] text-slate-400 mt-1.5 flex items-start gap-1"><span className="mt-0.5 flex-shrink-0">ℹ️</span>주정차가 가능한 장소로 입력해 주세요</p>
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
                    {KOREAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={accountNumber}
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
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => { setAgreeMatch(v => !v); setFieldErrors(p => { const q = { ...p }; delete q.agreeMatch; return q; }); }}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150
                    ${agreeMatch
                      ? "bg-indigo-500 border-indigo-500"
                      : fieldErrors.agreeMatch
                        ? "border-rose-400 bg-rose-50"
                        : "border-slate-300 bg-white group-hover:border-indigo-400"}`}
                >
                  {agreeMatch && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4l3 3.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => { setAgreeMatch(v => !v); setFieldErrors(p => { const q = { ...p }; delete q.agreeMatch; return q; }); }}
                  className={`text-[13px] font-semibold select-none ${fieldErrors.agreeMatch ? "text-rose-600" : "text-slate-700"}`}
                >
                  신청자와 예금주가 동일합니다
                  <span className="ml-1.5 text-[11px] font-bold text-rose-400">(필수)</span>
                </span>
              </label>
              {fieldErrors.agreeMatch && <p className="text-[11px] text-rose-500">⚠ {fieldErrors.agreeMatch}</p>}
            </div>

            <button type="submit" className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
              예약 신청하기
            </button>
          </form>
        </div>
        ))}

        {/* Submissions */}
        {submissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-slate-700">접수 내역</h2>
              <span className="text-[12px] text-slate-400">최신순</span>
            </div>
            {submissions.map((s) => (
              <SubmissionCard key={s.id} entry={s} accent="indigo" />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── SUBMISSION CARD ──────────────────────────────────────────────────────────
function SubmissionCard({ entry, accent }: { entry: ReservationEntry | UrgentEntry; accent: "indigo" | "rose" }) {
  const isRes = "name" in entry;
  const ac = accent === "rose" ? { text: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", badge: "bg-rose-50 text-rose-500" } : { text: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-100", badge: "bg-indigo-50 text-indigo-500" };

  return (
    <div className={`bg-white rounded-3xl shadow-sm border px-5 py-4 ${accent === "rose" ? "border-rose-100" : "border-slate-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0`}
            style={{ background: accent === "rose" ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {entry.id}
          </div>
          <div>
            <p className={`text-[15px] font-bold text-slate-800 flex items-center gap-1.5`}>
              {isRes ? (entry as ReservationEntry).name : (entry as UrgentEntry).name}
              {accent === "rose" && <span className="text-[10px] bg-rose-100 text-rose-500 font-bold px-1.5 py-0.5 rounded-full">긴급</span>}
            </p>
            <p className="text-[12px] text-slate-400">{isRes ? (entry as ReservationEntry).phone : (entry as UrgentEntry).phone}</p>
          </div>
        </div>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${ac.badge}`}>{entry.items.length}종류</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {isRes && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">날짜 · 시간</p>
            <p className="text-[12px] text-slate-700 font-semibold mt-0.5">{(entry as ReservationEntry).date} {(entry as ReservationEntry).time}</p>
          </div>
        )}
        <div className={`bg-slate-50 rounded-xl px-3 py-2 ${isRes ? "col-span-1" : "col-span-2"}`}>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">거래 장소</p>
          <p className="text-[12px] text-slate-700 font-semibold mt-0.5 truncate">{entry.location}</p>
        </div>
      </div>

      {/* Item breakdown */}
      <div className="space-y-1.5 mb-3">
        {entry.items.map((it, i) => (
          <div key={i} className={`px-3 py-2 rounded-xl text-[12px] ${ac.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">{it.type.split(" ")[0]}</span>
                <span className={`${ac.text}`}>{Math.round(it.rate * 100)}%</span>
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

      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${ac.bg} ${ac.border}`}>
        <div>
          <p className="text-[11px] text-slate-400">총 액면가</p>
          <p className="text-[13px] font-semibold text-slate-600">{formatKRW(entry.items.reduce((s, it) => s + it.amount, 0))}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">합산 입금받을 금액</p>
          <p className={`text-[18px] font-black ${ac.text}`}>{formatKRW(entry.totalPayment)}</p>
        </div>
      </div>

      <div className="mt-2.5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-slate-400"><rect x="1" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M1 9h18" stroke="currentColor" strokeWidth="1.6"/></svg>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">입금 계좌 정보</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">은행</span>
          <span className="text-[13px] font-semibold text-slate-700">{entry.bankName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">계좌번호</span>
          <span className="text-[13px] font-semibold text-slate-700">{entry.accountNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">예금주</span>
          <span className="text-[13px] font-semibold text-slate-700">{entry.accountHolder}</span>
        </div>
      </div>
    </div>
  );
}

// ─── URGENT SALE PAGE ─────────────────────────────────────────────────────────
function UrgentPage({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bankName, setBankName] = useState(KOREAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [items, setItems] = useState<VoucherItem[]>([{ type: DEFAULT_TYPE, amount: "", isGift: false }]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; location?: string; accountNumber?: string; accountHolder?: string; agreeMatch?: string }>({});
  const [itemErrors, setItemErrors] = useState<string[]>([""]);
  const [agreeMatch, setAgreeMatch] = useState(false);
  const [submissions, setSubmissions] = useState<UrgentEntry[]>([]);
  const [toast, setToast] = useState(false);
  const [counter, setCounter] = useState(0);

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
    if (!phone.trim()) fe.phone = "판매자 전화번호를 입력해주세요";
    if (!location.trim()) fe.location = "거래 장소를 입력해주세요";
    if (!accountNumber.trim()) fe.accountNumber = "계좌번호를 입력해주세요";
    if (!accountHolder.trim()) fe.accountHolder = "예금주를 입력해주세요";
    if (!agreeMatch) fe.agreeMatch = "신청자와 예금주 동일 여부를 확인해주세요";
    setFieldErrors(fe);
    const ie = items.map((item) => (parseFloat(item.amount) || 0) <= 0 ? "금액을 입력해주세요" : "");
    setItemErrors(ie);
    return Object.keys(fe).length === 0 && ie.every((e) => !e);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const savedItems: SavedItem[] = items.map((item) => {
      const { amountNum, rate, payment } = computeItem(item, 0.01);
      return { type: item.type, amount: amountNum, rate, payment, isGift: item.isGift };
    });
    const totalPayment = savedItems.reduce((s, it) => s + it.payment, 0);
    let id = getNextId();
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "urgent", name, phone, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder }),
      });
      if (res.ok) { const data = await res.json(); id = data.id; }
    } catch {}
    setCounter(id);
    setSubmissions((p) => [{ id, name, phone, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder }, ...p]);
    saveEntry({ kind: "urgent", id, createdAt: new Date().toISOString(), name, phone, location, items: savedItems, totalPayment, bankName, accountNumber, accountHolder });
    setName(""); setPhone(""); setLocation(""); setAccountNumber(""); setAccountHolder("");
    setItems([{ type: DEFAULT_TYPE, amount: "", isGift: false }]); setItemErrors([""]); setAgreeMatch(false);
    setToast(true); setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 to-slate-100/60">
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="bg-rose-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"><span>✓</span> 긴급 판매 신청이 접수되었습니다!</div>
      </div>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-slate-800">긴급 판매 신청</h1>
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
            <div><h2 className="text-[15px] font-bold text-slate-800">판매 신청</h2><p className="text-[12px] text-slate-400 mt-0.5">Sale Request Form</p></div>
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">📋</div>
          </div>
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
            <Field label="성명" required error={fieldErrors.name}>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }} placeholder="홍길동" className={inputCls(!!fieldErrors.name, "rose")} />
            </Field>
            <Field label="판매자 전화번호" required error={fieldErrors.phone}>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: "" })); }} placeholder="010-0000-0000" className={inputCls(!!fieldErrors.phone, "rose")} />
            </Field>
            <Field label="거래 장소" required error={fieldErrors.location}>
              <input type="text" value={location} onChange={(e) => { setLocation(e.target.value); setFieldErrors((p) => ({ ...p, location: "" })); }} placeholder="예: 강남구 역삼동" className={inputCls(!!fieldErrors.location, "rose")} />
              <p className="text-[12px] text-slate-400 mt-1.5 flex items-start gap-1"><span className="mt-0.5 flex-shrink-0">ℹ️</span>주정차 가능한 곳으로 입력 바랍니다</p>
            </Field>
            <VoucherItems items={items} errors={itemErrors} onChange={updateItem} onToggleGift={toggleGift} onAdd={addItem} onRemove={removeItem} baseDeduct={0.01} accent="rose" />
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 overflow-hidden">
              <div className="px-4 pt-3.5 pb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-rose-400 flex-shrink-0"><rect x="1" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M1 9h18" stroke="currentColor" strokeWidth="1.6"/></svg>
                <span className="text-[12px] font-bold text-rose-500 uppercase tracking-wide">입금 계좌 정보</span>
              </div>
              <div className="px-4 pb-4 space-y-2.5 mt-2">
                <div>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] text-slate-800 outline-none transition-all bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-50 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23f43f5e' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                  >
                    {KOREAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => { setAccountNumber(e.target.value); setFieldErrors((p) => ({ ...p, accountNumber: "" })); }}
                    placeholder="계좌번호 (예: 123-456-789012)"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300
                      ${fieldErrors.accountNumber ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-50"}`}
                  />
                  {fieldErrors.accountNumber && <p className="text-[11px] text-rose-500 mt-1">⚠ {fieldErrors.accountNumber}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => { setAccountHolder(e.target.value); setFieldErrors((p) => ({ ...p, accountHolder: "" })); }}
                    placeholder="예금주"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] text-slate-800 outline-none transition-all bg-white placeholder:text-slate-300
                      ${fieldErrors.accountHolder ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" : "border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-50"}`}
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
              {/* 체크박스 */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => { setAgreeMatch(v => !v); setFieldErrors(p => { const q = { ...p }; delete q.agreeMatch; return q; }); }}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150
                    ${agreeMatch
                      ? "bg-rose-500 border-rose-500"
                      : fieldErrors.agreeMatch
                        ? "border-rose-400 bg-rose-50"
                        : "border-slate-300 bg-white group-hover:border-rose-400"}`}
                >
                  {agreeMatch && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4l3 3.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => { setAgreeMatch(v => !v); setFieldErrors(p => { const q = { ...p }; delete q.agreeMatch; return q; }); }}
                  className={`text-[13px] font-semibold select-none ${fieldErrors.agreeMatch ? "text-rose-600" : "text-slate-700"}`}
                >
                  신청자와 예금주가 동일합니다
                  <span className="ml-1.5 text-[11px] font-bold text-rose-400">(필수)</span>
                </span>
              </label>
              {fieldErrors.agreeMatch && <p className="text-[11px] text-rose-500">⚠ {fieldErrors.agreeMatch}</p>}
            </div>

            <button type="submit" className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}>
              <span>🚨</span> 긴급 판매 신청하기
            </button>
          </form>
        </div>

        {submissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-slate-700">긴급 접수 내역</h2>
              <span className="text-[12px] text-slate-400">최신순</span>
            </div>
            {submissions.map((s) => <SubmissionCard key={s.id} entry={s} accent="rose" />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const isUrgent = new URLSearchParams(window.location.search).get("urgent") === "1";
  const [page, setPage] = useState<"home" | "urgent">(isUrgent ? "urgent" : "home");
  return page === "home"
    ? <HomePage onGoUrgent={() => setPage("urgent")} />
    : <UrgentPage onBack={() => setPage("home")} />;
}
