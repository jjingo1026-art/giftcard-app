import { useState } from "react";

const MOBILE_TYPES = [
  { label: "카카오페이 선물", icon: "💛", color: "#FFBE00", rate: 90 },
  { label: "네이버페이 포인트", icon: "💚", color: "#03C75A", rate: 89 },
  { label: "문화상품권", icon: "📚", color: "#6366f1", rate: 88 },
  { label: "해피머니 상품권", icon: "🎮", color: "#f43f5e", rate: 88 },
  { label: "신세계 모바일상품권", icon: "🛒", color: "#0ea5e9", rate: 90 },
  { label: "틴캐시", icon: "🎯", color: "#8b5cf6", rate: 87 },
];

const BANKS = ["카카오뱅크", "토스뱅크", "국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "새마을금고", "우체국", "케이뱅크", "기타"];

function formatKRW(n: number) {
  return n === 0 ? "0원" : n.toLocaleString("ko-KR") + "원";
}

function parseAmount(v: string) {
  const num = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

export default function MobileSelect() {
  const params = new URLSearchParams(location.search);
  const agreed = params.get("agreed") === "1";

  const initialType = params.get("type") ?? "";
  const [selectedType, setSelectedType] = useState(initialType);
  const [amountStr, setAmountStr] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: number; totalPayment: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!agreed) {
    location.href = `/mobile/terms?type=${encodeURIComponent(initialType)}`;
    return null;
  }

  const typeInfo = MOBILE_TYPES.find((t) => t.label === selectedType);
  const amount = parseAmount(amountStr);
  const travelDeduct = amount > 0 && amount < 300000 ? 3000 : 0;
  const payment = typeInfo && amount > 0
    ? Math.max(0, Math.round(amount * typeInfo.rate / 100) - travelDeduct)
    : 0;

  function handleAmountChange(v: string) {
    const raw = v.replace(/[^0-9]/g, "");
    setAmountStr(raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "");
  }

  function handlePhone(v: string) {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    let fmt = d;
    if (d.length > 3 && d.length <= 7) fmt = `${d.slice(0, 3)}-${d.slice(3)}`;
    else if (d.length > 7) fmt = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    setPhone(fmt);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!selectedType) errs.type = "상품권 종류를 선택해 주세요.";
    if (!amount) errs.amount = "상품권 금액을 입력해 주세요.";
    if (!/^[가-힣a-zA-Z\s]+$/.test(name.trim())) errs.name = "올바른 이름을 입력해 주세요.";
    if (!/^010-\d{4}-\d{4}$/.test(phone)) errs.phone = "010-XXXX-XXXX 형식으로 입력해 주세요.";
    if (!bankName) errs.bankName = "은행을 선택해 주세요.";
    if (!accountNumber.trim()) errs.accountNumber = "계좌번호를 입력해 주세요.";
    if (!/^[가-힣a-zA-Z\s]+$/.test(accountHolder.trim())) errs.accountHolder = "올바른 예금주명을 입력해 주세요.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const items = [{ type: selectedType, amount, rate: typeInfo!.rate, payment, isGift: false }];
      const res = await fetch(`${base}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "mobile",
          isUrgent: false,
          name: name.trim(),
          phone,
          location: "모바일상품권",
          items,
          totalPayment: payment,
          bankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "오류가 발생했습니다.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setDone({ id: data.id, totalPayment: payment });
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16 space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-[40px] shadow-lg"
          style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
          ✅
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-[22px] font-black text-slate-800">신청이 완료됐습니다!</h2>
          <p className="text-[14px] text-slate-500">담당자가 확인 후 연락드리겠습니다.</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-5 w-full max-w-sm space-y-3 text-center">
          <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-wide">예상 입금 금액</p>
          <p className="text-[32px] font-black text-pink-600">{formatKRW(done.totalPayment)}</p>
          <p className="text-[11px] text-slate-400">접수번호: #{done.id}</p>
        </div>
        <button
          onClick={() => { location.href = "/"; }}
          className="px-8 py-3.5 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
        >
          처음으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = `/mobile/privacy?type=${encodeURIComponent(initialType)}`; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">모바일상품권 매입 신청</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Mobile Gift Certificate</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-5 pb-16 space-y-5">
        {/* 상품권 종류 선택 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-50">
            <p className="text-[13px] font-bold text-slate-700">📱 상품권 종류 선택</p>
          </div>
          <div className="px-4 py-4 grid grid-cols-3 gap-2">
            {MOBILE_TYPES.map((t) => {
              const selected = selectedType === t.label;
              return (
                <button
                  type="button"
                  key={t.label}
                  onClick={() => setSelectedType(t.label)}
                  className={`flex flex-col items-center justify-center rounded-2xl py-3 px-1 transition-all active:scale-[0.97] border-2 ${
                    selected ? "border-current shadow-sm" : "border-transparent"
                  }`}
                  style={{
                    backgroundColor: selected ? t.color + "18" : "#f8fafc",
                    borderColor: selected ? t.color : "transparent",
                  }}
                >
                  <span className="text-[18px]">{t.icon}</span>
                  <span className="text-[9.5px] font-semibold text-slate-600 text-center leading-snug mt-0.5">{t.label}</span>
                  <span className="text-[14px] font-black tabular-nums mt-0.5" style={{ color: t.color }}>{t.rate}%</span>
                </button>
              );
            })}
          </div>
          {errors.type && <p className="px-5 pb-3 text-[12px] text-rose-500">{errors.type}</p>}
        </div>

        {/* 상품권 금액 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-3">
          <p className="text-[13px] font-bold text-slate-700">💰 상품권금액</p>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="예: 100,000"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.amount ? "border-rose-300" : "border-slate-200"}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">원</span>
          </div>
          {errors.amount && <p className="text-[12px] text-rose-500">{errors.amount}</p>}

          {typeInfo && amount > 0 && (
            <div className={`rounded-2xl overflow-hidden border ${travelDeduct > 0 ? "border-amber-200" : "border-pink-100"}`}>
              <div className="flex items-center justify-between px-4 py-3 bg-pink-50">
                <div>
                  <p className="text-[11px] text-pink-500">상품권금액</p>
                  <p className="text-[13px] font-semibold text-pink-700">{formatKRW(amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-pink-500">예상 입금액</p>
                  <p className="text-[20px] font-black text-pink-700">{formatKRW(payment)}</p>
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
        </div>

        {/* 신청자 정보 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-4">
          <p className="text-[13px] font-bold text-slate-700">👤 신청자 정보</p>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">이름 <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.name ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.name && <p className="text-[12px] text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">연락처 <span className="text-rose-400">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhone(e.target.value)}
              placeholder="010-0000-0000"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.phone ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.phone && <p className="text-[12px] text-rose-500">{errors.phone}</p>}
          </div>
        </div>

        {/* 입금 계좌 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-4">
          <p className="text-[13px] font-bold text-slate-700">🏦 입금받을 계좌</p>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">은행 <span className="text-rose-400">*</span></label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white ${errors.bankName ? "border-rose-300" : "border-slate-200"}`}
            >
              <option value="">은행 선택</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <p className="text-[12px] text-rose-500">{errors.bankName}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">계좌번호 <span className="text-rose-400">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="01012345678"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.accountNumber ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.accountNumber && <p className="text-[12px] text-rose-500">{errors.accountNumber}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">예금주명 <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="홍길동"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.accountHolder ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.accountHolder && <p className="text-[12px] text-rose-500">{errors.accountHolder}</p>}
          </div>

          <div className="flex items-start gap-2.5 bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
            <span className="text-[14px] flex-shrink-0">⚠️</span>
            <p className="text-[12px] text-amber-700 leading-relaxed">신청자 성함과 예금주명이 동일해야 합니다.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl">
            <p className="text-[13px] text-rose-600 font-semibold">{errorMsg}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-sm disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
        >
          {submitting ? "신청 중..." : "📱 매입 신청하기"}
        </button>
      </form>
    </div>
  );
}
