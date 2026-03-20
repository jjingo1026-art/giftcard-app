import { useState } from "react";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}

export default function StaffRegister() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setError("");
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("올바른 전화번호를 입력해주세요."); return; }
    if (pw.length < 4) { setError("비밀번호는 4자 이상 입력해주세요."); return; }
    if (pw !== pwConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone, password: pw, preferredLocation: preferredLocation.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        setName(""); setPhone(""); setPw(""); setPwConfirm(""); setPreferredLocation("");
      } else {
        setError(data.message ?? data.error ?? "오류가 발생했습니다.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
            👨‍🔧
          </div>
          <h1 className="text-[22px] font-black text-slate-800">매입담당자 등록 신청</h1>
          <p className="text-[13px] text-slate-400 mt-1.5">관리자 승인 후 로그인할 수 있습니다</p>
        </div>

        {msg ? (
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm px-6 py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto">✓</div>
            <div>
              <p className="text-[17px] font-black text-slate-800">신청 완료</p>
              <p className="text-[13px] text-slate-500 mt-1">{msg}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <p className="text-[12px] text-amber-700 font-medium">⏳ 관리자 검토 후 문자로 안내드립니다</p>
            </div>
            <a
              href="/staff/login"
              className="block w-full py-3.5 rounded-2xl text-white text-[15px] font-bold text-center transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              로그인 화면으로
            </a>
          </div>
        ) : (
          <form onSubmit={register} className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">이름</label>
              <input
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                autoComplete="name"
              />
            </div>
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
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">거래희망지역</label>
              <input
                placeholder="예) 강남구, 서초구"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className={inputCls}
                autoComplete="off"
              />
              <p className="text-[11px] text-slate-400 pl-1">선호하는 거래 지역을 입력해주세요 (선택)</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">비밀번호</label>
              <div className="relative">
                <input
                  placeholder="4자 이상"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className={inputCls + " pr-12"}
                  autoComplete="new-password"
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
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">비밀번호 확인</label>
              <input
                placeholder="비밀번호 재입력"
                type={showPw ? "text" : "password"}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                className={inputCls + (pwConfirm && pw !== pwConfirm ? " border-rose-300 bg-rose-50/30" : "")}
                autoComplete="new-password"
              />
              {pwConfirm && pw !== pwConfirm && (
                <p className="text-[11px] text-rose-500 pl-1">비밀번호가 일치하지 않습니다</p>
              )}
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
              {loading ? "처리 중..." : "등록 신청"}
            </button>

            <p className="text-center text-[12px] text-slate-400">
              이미 계정이 있으신가요?{" "}
              <a href="/staff/login" className="text-indigo-500 font-bold hover:underline">
                로그인
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
