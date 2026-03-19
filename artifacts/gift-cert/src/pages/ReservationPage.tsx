import { useState } from "react";
import { getNextId, saveEntry } from "@/lib/store";

const RATES: Record<string, number> = {
  "신세계백화점상품권": 0.95,
  "롯데백화점상품권":   0.95,
  "현대백화점상품권":   0.95,
  "국민관광상품권":       0.95,
  "갤러리아백화점상품권": 0.94,
  "지류문화상품권":     0.90,
  "주유권":            0.95,
};
const RATE_KEYS = Object.keys(RATES);

const CARD_OPTIONS = [
  { key: "신세계백화점상품권",   label: "신세계백화점상품권",   sub: "" },
  { key: "롯데백화점상품권",     label: "롯데백화점상품권",     sub: "" },
  { key: "현대백화점상품권",     label: "현대백화점상품권",     sub: "" },
  { key: "국민관광상품권",       label: "국민관광상품권",       sub: "" },
  { key: "갤러리아백화점상품권", label: "갤러리아백화점상품권", sub: "" },
  { key: "지류문화상품권",       label: "지류문화상품권",       sub: "컬쳐랜드, 북앤라이프, 문화상품권" },
  { key: "주유권",               label: "주유권",               sub: "SK, GS, 현대, S-OIL" },
];

const KOREAN_BANKS = [
  "KB국민은행","신한은행","우리은행","하나은행","IBK기업은행",
  "NH농협은행","SC제일은행","씨티은행","카카오뱅크","케이뱅크",
  "토스뱅크","수협은행","전북은행","광주은행","경남은행",
  "부산은행","대구은행","제주은행","새마을금고","신협","우체국",
];

function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }

function getDefaultType() {
  const t = decodeURIComponent(new URLSearchParams(window.location.search).get("type") ?? "");
  return RATE_KEYS.includes(t) ? t : RATE_KEYS[0];
}

interface Item { type: string; amount: string; isGift: boolean; }

export default function ReservationPage() {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [loc, setLoc]         = useState("");
  const [bank, setBank]       = useState(KOREAN_BANKS[0]);
  const [acct, setAcct]       = useState("");
  const [holder, setHolder]   = useState("");
  const [items, setItems]     = useState<Item[]>([{ type: getDefaultType(), amount: "", isGift: false }]);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [toast, setToast]     = useState(false);

  function total() {
    return items.reduce((s, it) => {
      const n = parseFloat(it.amount) || 0;
      const r = Math.max(0, (RATES[it.type] ?? 0) - (it.isGift ? 0.01 : 0));
      return s + Math.floor(n * r);
    }, 0);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())   e.name   = "이름을 입력해주세요";
    if (!phone.trim())  e.phone  = "연락처를 입력해주세요";
    if (!date)          e.date   = "날짜를 선택해주세요";
    if (!time)          e.time   = "시간을 선택해주세요";
    if (!loc.trim())    e.loc    = "거래 장소를 입력해주세요";
    if (!acct.trim())   e.acct   = "계좌번호를 입력해주세요";
    if (!holder.trim()) e.holder = "예금주를 입력해주세요";
    items.forEach((it, i) => {
      if ((parseFloat(it.amount) || 0) <= 0) e[`item${i}`] = "금액을 입력해주세요";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const savedItems = items.map((it) => {
      const n = parseFloat(it.amount) || 0;
      const r = Math.max(0, (RATES[it.type] ?? 0) - (it.isGift ? 0.01 : 0));
      return { type: it.type, amount: n, rate: r, payment: Math.floor(n * r), isGift: it.isGift };
    });
    const totalPayment = savedItems.reduce((s, it) => s + it.payment, 0);
    let id = getNextId();
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "reservation", name, phone, date, time, location: loc, items: savedItems, totalPayment, bankName: bank, accountNumber: acct, accountHolder: holder, giftcardType: items[0]?.type ?? "" }),
      });
      if (res.ok) { const d = await res.json(); id = d.id; }
    } catch {}
    saveEntry({ kind: "reservation", id, createdAt: new Date().toISOString(), name, phone, date, time, location: loc, items: savedItems, totalPayment, bankName: bank, accountNumber: acct, accountHolder: holder, giftcardType: items[0]?.type ?? "" });
    setToast(true);
    setTimeout(() => { setToast(false); location.href = "/"; }, 2500);
  }

  const inp = (err?: boolean) =>
    `w-full px-4 py-3.5 rounded-2xl border text-[15px] text-slate-800 outline-none transition-all placeholder:text-slate-300
    ${err ? "border-rose-300 bg-rose-50 focus:border-rose-400" : "border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
          ✓ 예약이 접수되었습니다!
        </div>
      </div>

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => history.back()} className="text-slate-400 hover:text-slate-600 text-lg">←</button>
          <h1 className="text-[16px] font-bold text-slate-800">예약 신청</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-5 pb-16 space-y-4">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-4">

          {/* 이름 */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-500 uppercase tracking-wide">이름 <span className="text-rose-400 normal-case">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" className={inp(!!errors.name)} />
            {errors.name && <p className="text-[12px] text-rose-500">⚠ {errors.name}</p>}
          </div>

          {/* 연락처 */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-500 uppercase tracking-wide">연락처 <span className="text-rose-400 normal-case">*</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" className={inp(!!errors.phone)} />
            {errors.phone && <p className="text-[12px] text-rose-500">⚠ {errors.phone}</p>}
          </div>

          {/* 날짜 / 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-500 uppercase tracking-wide">날짜 <span className="text-rose-400 normal-case">*</span></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp(!!errors.date)} />
              {errors.date && <p className="text-[12px] text-rose-500">⚠ {errors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-500 uppercase tracking-wide">시간 <span className="text-rose-400 normal-case">*</span></label>
              <input type="time" value={time} step="600" onChange={e => setTime(e.target.value)} className={inp(!!errors.time)} />
              {errors.time && <p className="text-[12px] text-rose-500">⚠ {errors.time}</p>}
            </div>
          </div>

          {/* 거래 장소 */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-500 uppercase tracking-wide">거래 장소 <span className="text-rose-400 normal-case">*</span></label>
            <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="주정차 가능한 장소" className={inp(!!errors.loc)} />
            {errors.loc && <p className="text-[12px] text-rose-500">⚠ {errors.loc}</p>}
          </div>

          {/* 상품권 선택 + 금액 */}
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-slate-500 uppercase tracking-wide">상품권 종류 &amp; 금액 <span className="text-rose-400 normal-case">*</span></label>
            {items.map((it, i) => {
              const n = parseFloat(it.amount) || 0;
              const r = Math.max(0, (RATES[it.type] ?? 0) - (it.isGift ? 0.01 : 0));
              const pay = Math.floor(n * r);
              return (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  {/* Row 1: 상품권 select + 증정용 버튼 */}
                  <div className="flex gap-2 items-stretch">
                    <div className="flex-1 relative">
                      <select
                        value={it.type}
                        onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                        className="w-full h-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 appearance-none pr-7 transition-all"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%236366f1' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                      >
                        {RATE_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItems(p => p.map((x, j) => j === i ? { ...x, isGift: !x.isGift } : x))}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl font-bold text-[13px] border-2 transition-all duration-150 active:scale-95 flex items-center gap-1.5
                        ${it.isGift
                          ? "bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-200"
                          : "bg-white border-slate-200 text-slate-400 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-500"}`}
                    >
                      <span className="text-[15px]">🎁</span>
                      <div className="flex flex-col items-center leading-tight">
                        <span>증정용</span>
                        {it.isGift && <span className="text-[9px] font-bold opacity-90">-1%</span>}
                      </div>
                    </button>
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))}
                        className="w-8 h-auto flex items-center justify-center rounded-xl bg-rose-100 text-rose-400 hover:bg-rose-200 active:scale-90 transition-all flex-shrink-0 text-[13px]">✕</button>
                    )}
                  </div>
                  {/* Row 2: 금액 입력 */}
                  <input
                    type="number" value={it.amount} min="0" step="10000"
                    onChange={e => {
                      setItems(p => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x));
                      setErrors(p => { const q = { ...p }; delete q[`item${i}`]; return q; });
                    }}
                    placeholder="금액 입력 (원)"
                    className={`w-full px-3 py-2.5 rounded-xl border text-[14px] outline-none ${errors[`item${i}`] ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}
                  />
                  {errors[`item${i}`] && <p className="text-[11px] text-rose-500">⚠ {errors[`item${i}`]}</p>}
                  {/* Row 3: 입금액 미리보기 */}
                  {n > 0 && (
                    <div className="flex justify-between px-3 py-2 rounded-xl bg-indigo-50 text-[12px] font-semibold text-indigo-500">
                      <span className="flex items-center gap-1.5">
                        요율 {Math.round(r * 100)}%
                        {it.isGift && <span className="text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded-full">증정 -1%</span>}
                      </span>
                      <span className="text-[15px] font-black text-indigo-600">{fmt(pay)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button"
              onClick={() => setItems(p => [...p, { type: RATE_KEYS[0], amount: "", isGift: false }])}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-400 text-[13px] font-bold hover:bg-indigo-50 transition-all">
              + 권종 추가
            </button>
            {total() > 0 && (
              <div className="flex justify-between px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                <span className="text-[13px] text-indigo-500 font-semibold">입금받을 금액</span>
                <span className="text-[20px] font-black text-indigo-600 tabular-nums">{fmt(total())}</span>
              </div>
            )}
          </div>

          {/* 계좌 */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide pt-1">입금 계좌</p>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-slate-400">은행</label>
              <select value={bank} onChange={e => setBank(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-700 outline-none">
                {KOREAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-slate-400">계좌번호 <span className="text-rose-400">*</span></label>
              <input value={acct} onChange={e => setAcct(e.target.value)} placeholder="계좌번호 입력" className={inp(!!errors.acct)} />
              {errors.acct && <p className="text-[12px] text-rose-500">⚠ {errors.acct}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-slate-400">예금주 <span className="text-rose-400">*</span></label>
              <input value={holder} onChange={e => setHolder(e.target.value)} placeholder="예금주명" className={inp(!!errors.holder)} />
              {errors.holder && <p className="text-[12px] text-rose-500">⚠ {errors.holder}</p>}
            </div>
          </div>
        </div>

        <button type="submit"
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98] shadow-sm">
          예약 신청
        </button>
      </form>
    </div>
  );
}
