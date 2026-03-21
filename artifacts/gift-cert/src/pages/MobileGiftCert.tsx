const MOBILE_RATES = [
  { label: "카카오페이 선물", icon: "💛", color: "#FFBE00", rate: 90 },
  { label: "네이버페이 포인트", icon: "💚", color: "#03C75A", rate: 89 },
  { label: "문화상품권", sub: "컬쳐랜드", icon: "📚", color: "#6366f1", rate: 88 },
  { label: "해피머니 상품권", icon: "🎮", color: "#f43f5e", rate: 88 },
  { label: "신세계 모바일상품권", icon: "🛒", color: "#0ea5e9", rate: 90 },
  { label: "틴캐시", icon: "🎯", color: "#8b5cf6", rate: 87 },
];

export default function MobileGiftCert() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">모바일상품권 시세</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Mobile Gift Certificate Rates</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-16 space-y-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">모바일상품권 시세</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Mobile Rates</p>
            </div>
            <div className="w-8 h-8 bg-pink-50 rounded-xl flex items-center justify-center">📱</div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
            {MOBILE_RATES.map((g) => (
              <div
                key={g.label}
                onClick={() => { window.location.href = `/mobile/terms?type=${encodeURIComponent(g.label)}`; }}
                className="flex flex-col items-center justify-center px-2 rounded-2xl cursor-pointer active:scale-[0.97] transition-all text-center"
                style={{ backgroundColor: g.color + "12", height: "86px" }}
              >
                <span className="text-[18px] leading-none mb-0.5">{g.icon}</span>
                <span className="text-[10px] font-semibold text-slate-600 leading-snug text-center">{g.label}</span>
                <span className="text-[19px] font-black tabular-nums leading-none mt-1" style={{ color: g.color }}>{g.rate}%</span>
                {g.sub && <span className="text-[8px] text-slate-400 leading-tight mt-0.5">{g.sub}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-pink-50 border border-pink-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-[20px] flex-shrink-0 mt-0.5">💡</span>
          <p className="text-[12.5px] text-pink-700 leading-relaxed">
            원하시는 상품권 종류를 탭하면 판매 신청을 진행할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
