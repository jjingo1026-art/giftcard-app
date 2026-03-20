import { useState } from "react";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}

export default function StaffLogin() {
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!phone.trim() || !pw.trim()) { setError("전화번호와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("gc_staff_token", data.token);
        localStorage.setItem("gc_staff_id", String(data.staffId));
        localStorage.setItem("gc_staff_name", data.name);
        window.location.href = "/staff/dashboard";
      } else {
        setError(data.message ?? "로그인에 실패했습니다.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
            🔐
          </div>
          <h1 className="text-[22px] font-black text-slate-800">매입담당자 로그인</h1>
          <p className="text-[13px] text-slate-400 mt-1.5">승인된 담당자만 접근할 수 있습니다</p>
        </div>

        <form onSubmit={login} className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">전화번호 (아이디)</label>
            <input
              placeholder="010-0000-0000"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className={inputCls}
              autoComplete="tel"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">비밀번호</label>
            <div className="relative">
              <input
                placeholder="비밀번호 입력"
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className={inputCls + " pr-12"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium"
              >
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          {error && (
            <div className="py-3 px-4 rounded-2xl bg-rose-50 border border-rose-100 text-[13px] text-rose-600 font-medium">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-indigo-200"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div className="flex items-center justify-between pt-1">
            <a href="/staff/register" className="text-[12px] text-indigo-500 font-bold hover:underline">
              등록 신청
            </a>
            <a href="/" className="text-[12px] text-slate-400 hover:text-slate-600 hover:underline">
              메인으로
            </a>
          </div>
        </form>

        <p className="text-center text-[11px] text-slate-300 mt-6">
          관리자 문의: 담당 관리자에게 연락하세요
        </p>
      </div>
    </div>
  );
}
