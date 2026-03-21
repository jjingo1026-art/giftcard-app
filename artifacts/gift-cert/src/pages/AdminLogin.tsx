import { useState } from "react";
import { useLocation } from "wouter";
export { adminFetch, staffFetch } from "@/lib/authFetch";

const TOKEN_KEY = "gc_admin_token";

export function getAdminToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (getAdminToken()) {
    navigate("/admin/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
        location.href = "/admin/dashboard.html";
      } else {
        setError(data.error ?? "아이디 또는 비밀번호가 올바르지 않습니다.");
        setPw("");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-2xl bg-white/10 border text-white placeholder:text-slate-500 outline-none transition-all text-[15px]
     ${hasError ? "border-rose-500" : "border-white/20 focus:border-indigo-400 focus:bg-white/15"}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-white">관리자 로그인</h1>
          <p className="text-slate-400 text-[13px] mt-1">어드민 대시보드 접근</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-3xl p-6 space-y-3 border border-white/10">
          {/* ID field */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              아이디
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              placeholder="아이디 입력"
              autoFocus
              autoComplete="username"
              className={inputCls(!!error)}
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(""); }}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className={`${inputCls(!!error)} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                {show ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-rose-400 flex items-center gap-1 pt-0.5">
              <span>⚠</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-[15px] transition-all duration-150 active:scale-95 disabled:opacity-60 mt-2"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-slate-600 text-[12px] mt-6">우리동네상품권 예약 관리 시스템</p>
      </div>
    </div>
  );
}
