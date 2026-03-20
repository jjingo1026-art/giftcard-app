import { useState } from "react";
import { getAdminToken, clearAdminToken } from "./AdminLogin";

export default function AdminSettings() {
  const token = getAdminToken();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newId, setNewId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  if (!token) {
    window.location.href = "/admin/login.html";
    return null;
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) { showToast("현재 비밀번호를 입력해주세요.", false); return; }
    if (!newId && !newPassword) { showToast("변경할 아이디 또는 비밀번호를 입력해주세요.", false); return; }
    if (newPassword && newPassword !== confirmPassword) { showToast("새 비밀번호가 일치하지 않습니다.", false); return; }
    if (newPassword && newPassword.length < 4) { showToast("비밀번호는 4자리 이상이어야 합니다.", false); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword,
          ...(newId ? { newId } : {}),
          ...(newPassword ? { newPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "변경에 실패했습니다.", false);
        return;
      }
      showToast("✅ 변경이 완료됐습니다. 다시 로그인해주세요.", true);
      setCurrentPassword(""); setNewId(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => {
        clearAdminToken();
        window.location.href = "/admin/login.html";
      }, 2000);
    } catch {
      showToast("서버 오류가 발생했습니다.", false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 토스트 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-[13px] font-semibold px-4 py-2.5 rounded-2xl shadow-xl transition-all
          ${toast.ok ? "bg-emerald-500" : "bg-rose-500"}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/admin/dashboard.html"; }}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">계정 설정</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">관리자 아이디 / 비밀번호 변경</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
        <form onSubmit={handleSave} className="space-y-4">
          {/* 현재 비밀번호 확인 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 space-y-3">
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-wide">본인 확인</p>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">현재 비밀번호 *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호 입력"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 아이디 변경 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 space-y-3">
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-wide">아이디 변경</p>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">새 아이디 <span className="text-slate-300">(변경 없으면 비워두세요)</span></label>
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="새 아이디 입력"
                autoComplete="new-password"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 비밀번호 변경 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 space-y-3">
            <p className="text-[12px] font-black text-slate-500 uppercase tracking-wide">비밀번호 변경</p>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">새 비밀번호 <span className="text-slate-300">(변경 없으면 비워두세요)</span></label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력 (4자리 이상)"
                autoComplete="new-password"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                autoComplete="new-password"
                className={`w-full border rounded-xl px-3 py-2.5 text-[14px] font-medium bg-slate-50 focus:outline-none focus:bg-white transition-all
                  ${confirmPassword && newPassword !== confirmPassword
                    ? "border-rose-300 text-rose-500 focus:border-rose-400"
                    : "border-slate-200 text-slate-700 focus:border-indigo-300"}`}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-rose-400 mt-1 ml-1">비밀번호가 일치하지 않습니다</p>
              )}
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white text-[15px] font-black shadow-md shadow-indigo-200 hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                변경 중...
              </span>
            ) : "변경 사항 저장"}
          </button>

          <p className="text-center text-[11px] text-slate-400">변경 완료 후 자동으로 로그아웃됩니다</p>
        </form>
      </div>
    </div>
  );
}
