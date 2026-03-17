import { useState } from "react";

const RATES: Record<string, number> = {
  "신세계 (Shinsegae)": 0.95,
  "롯데 (Lotte)": 0.95,
  "현대 (Hyundai)": 0.95,
  "갤러리아 (Galleria)": 0.94,
  "컬쳐랜드 (Cultureland)": 0.90,
  "도서문화상품권 (BooknLife)": 0.90,
};

const RATE_GROUPS = [
  { label: "신세계 / 롯데 / 현대", rate: "95%", types: ["신세계 (Shinsegae)", "롯데 (Lotte)", "현대 (Hyundai)"] },
  { label: "갤러리아", rate: "94%", types: ["갤러리아 (Galleria)"] },
  { label: "컬쳐랜드 / 도서문화상품권", rate: "90%", types: ["컬쳐랜드 (Cultureland)", "도서문화상품권 (BooknLife)"] },
];

interface FormData {
  name: string;
  phone: string;
  date: string;
  time: string;
  type: string;
  amount: string;
}

interface Submission extends FormData {
  payment: number;
}

function formatKRW(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

export default function App() {
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    date: "",
    time: "",
    type: Object.keys(RATES)[0],
    amount: "",
  });

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const amountNum = parseInt(form.amount.replace(/,/g, ""), 10) || 0;
  const rate = RATES[form.type] ?? 0;
  const payment = Math.floor(amountNum * rate);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) newErrors.name = "이름을 입력해주세요.";
    if (!form.phone.trim()) newErrors.phone = "연락처를 입력해주세요.";
    if (!form.date) newErrors.date = "날짜를 선택해주세요.";
    if (!form.time) newErrors.time = "시간을 선택해주세요.";
    if (!form.amount || amountNum <= 0) newErrors.amount = "금액을 입력해주세요.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmissions((prev) => [{ ...form, payment }, ...prev]);
    setSubmitted(true);
    setForm({ name: "", phone: "", date: "", time: "", type: Object.keys(RATES)[0], amount: "" });
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)] pb-16">
      {/* Header */}
      <header className="bg-white border-b border-[hsl(220,13%,88%)] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-[hsl(220,20%,10%)] tracking-tight">🎁 상품권 예약</h1>
          <p className="text-sm text-[hsl(220,8%,50%)] mt-0.5">Gift Certificate Reservation</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Rates Card */}
        <section className="bg-white rounded-2xl border border-[hsl(220,13%,88%)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[hsl(220,13%,88%)]">
            <h2 className="font-semibold text-[hsl(220,20%,10%)]">현재 적용 요율</h2>
            <p className="text-xs text-[hsl(220,8%,50%)] mt-0.5">Current Exchange Rates</p>
          </div>
          <div className="divide-y divide-[hsl(220,13%,88%)]">
            {RATE_GROUPS.map((group) => (
              <div key={group.label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-[hsl(220,20%,15%)]">{group.label}</span>
                <span className="text-lg font-bold text-[hsl(221,83%,53%)]">{group.rate}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reservation Form */}
        <section className="bg-white rounded-2xl border border-[hsl(220,13%,88%)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[hsl(220,13%,88%)]">
            <h2 className="font-semibold text-[hsl(220,20%,10%)]">예약 신청</h2>
            <p className="text-xs text-[hsl(220,8%,50%)] mt-0.5">Reservation Form</p>
          </div>

          {submitted && (
            <div className="mx-5 mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
              ✅ 예약이 접수되었습니다!
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[hsl(220,20%,15%)] mb-1.5">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="홍길동"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                  ${errors.name ? "border-red-400 bg-red-50" : "border-[hsl(220,13%,88%)] bg-[hsl(220,14%,97%)] focus:border-[hsl(221,83%,53%)] focus:bg-white"}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[hsl(220,20%,15%)] mb-1.5">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="010-0000-0000"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                  ${errors.phone ? "border-red-400 bg-red-50" : "border-[hsl(220,13%,88%)] bg-[hsl(220,14%,97%)] focus:border-[hsl(221,83%,53%)] focus:bg-white"}`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[hsl(220,20%,15%)] mb-1.5">
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                    ${errors.date ? "border-red-400 bg-red-50" : "border-[hsl(220,13%,88%)] bg-[hsl(220,14%,97%)] focus:border-[hsl(221,83%,53%)] focus:bg-white"}`}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(220,20%,15%)] mb-1.5">
                  시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                    ${errors.time ? "border-red-400 bg-red-50" : "border-[hsl(220,13%,88%)] bg-[hsl(220,14%,97%)] focus:border-[hsl(221,83%,53%)] focus:bg-white"}`}
                />
                {errors.time && <p className="text-xs text-red-500 mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-[hsl(220,20%,15%)] mb-1.5">
                상품권 종류 <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[hsl(220,13%,88%)] bg-[hsl(220,14%,97%)] text-sm outline-none focus:border-[hsl(221,83%,53%)] focus:bg-white transition-colors appearance-none"
              >
                {Object.keys(RATES).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[hsl(220,20%,15%)] mb-1.5">
                금액 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="예: 100000"
                min="0"
                step="1000"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors
                  ${errors.amount ? "border-red-400 bg-red-50" : "border-[hsl(220,13%,88%)] bg-[hsl(220,14%,97%)] focus:border-[hsl(221,83%,53%)] focus:bg-white"}`}
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Payment Preview */}
            {amountNum > 0 && (
              <div className="px-4 py-4 bg-[hsl(221,83%,96%)] rounded-xl border border-[hsl(221,83%,85%)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(221,83%,40%)]">적용 요율</span>
                  <span className="text-sm font-semibold text-[hsl(221,83%,40%)]">{Math.round(rate * 100)}%</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-[hsl(221,83%,30%)]">지급 예상 금액</span>
                  <span className="text-xl font-bold text-[hsl(221,83%,43%)]">{formatKRW(payment)}</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,47%)] active:bg-[hsl(221,83%,42%)] text-white font-semibold text-sm rounded-xl transition-colors"
            >
              예약 신청하기
            </button>
          </form>
        </section>

        {/* Submissions */}
        {submissions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[hsl(220,20%,10%)] px-1">접수 내역</h2>
            {submissions.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[hsl(220,13%,88%)] shadow-sm px-5 py-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[hsl(220,20%,10%)]">{s.name}</p>
                    <p className="text-sm text-[hsl(220,8%,50%)]">{s.phone}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-[hsl(221,83%,96%)] text-[hsl(221,83%,43%)] rounded-full font-medium">
                    {Math.round(RATES[s.type] * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[hsl(220,8%,40%)]">
                  <span>📅 {s.date}</span>
                  <span>🕐 {s.time}</span>
                  <span className="col-span-2">🏷️ {s.type}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[hsl(220,13%,92%)]">
                  <span className="text-sm text-[hsl(220,8%,50%)]">액면가: {formatKRW(parseInt(s.amount, 10))}</span>
                  <span className="font-bold text-[hsl(221,83%,43%)]">지급: {formatKRW(s.payment)}</span>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
