import { useState } from "react";

export default function StaffRegister() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setError("");
    if (!name.trim() || !phone.trim() || !pw.trim()) {
      setError("모든 항목을 입력해주세요."); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        setName(""); setPhone(""); setPw("");
      } else {
        setError(data.error ?? "오류가 발생했습니다.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">👤</div>
          <h1 className="text-[20px] font-bold text-slate-800">직원 등록 신청</h1>
          <p className="text-[13px] text-slate-400 mt-1">관리자 승인 후 사용 가능합니다</p>
        </div>

        <form onSubmit={register} className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide">이름</label>
            <input
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide">전화번호</label>
            <input
              placeholder="010-0000-0000"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide">비밀번호</label>
            <input
              placeholder="비밀번호 입력"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && (
            <div className="py-2.5 px-4 rounded-2xl bg-rose-50 border border-rose-100 text-[13px] text-rose-500 font-medium">
              ⚠ {error}
            </div>
          )}
          {msg && (
            <div className="py-2.5 px-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-[13px] text-emerald-600 font-medium">
              ✓ {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {loading ? "처리 중..." : "신청"}
          </button>
        </form>
      </div>
    </div>
  );
}
