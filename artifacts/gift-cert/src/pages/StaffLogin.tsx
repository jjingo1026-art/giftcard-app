import { useState } from "react";

export default function StaffLogin() {
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("gc_staff_token", data.token);
        sessionStorage.setItem("gc_staff_id", String(data.staffId));
        sessionStorage.setItem("gc_staff_name", data.name);
        location.href = "/staff/dashboard.html";
      } else {
        setError(data.message);
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
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🔐</div>
          <h1 className="text-[20px] font-bold text-slate-800">직원 로그인</h1>
          <p className="text-[13px] text-slate-400 mt-1">승인된 직원만 접근 가능합니다</p>
        </div>

        <form onSubmit={login} className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-6 space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <p className="text-center text-[12px] text-slate-400">
            계정이 없으신가요?{" "}
            <a href="/staff/register.html" className="text-indigo-500 font-semibold hover:underline">
              등록 신청
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
