const MOBILE_RATES = [
  { label: "신세계모바일", sub: "이마트교환권", icon: "🛒", color: "#e11d48", rate: 95 },
  { label: "롯데모바일", subs: ["23으로 시작하는 교환권", "앱선물하기"], icon: "🧡", color: "#f97316", rate: 95 },
  { label: "현대모바일", sub: "H포인트 상품권 제외", icon: "🏬", color: "#0ea5e9", rate: 95 },
  { label: "네이버페이 포인트", icon: "💚", color: "#03C75A", rate: 95 },
  { label: "컬쳐랜드", subs: ["상품권", "교환권"], icon: "📚", color: "#6366f1", rate: 90 },
  { label: "북앤라이프", icon: "📖", color: "#8b5cf6", rate: 90 },
  { label: "문화상품권(18핀)", icon: "🎫", color: "#ec4899", rate: 90 },
  { label: "구글기프트카드", sub: "카카오톡 구매", icon: "🎮", color: "#4ade80", rate: 90 },
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
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            {MOBILE_RATES.map((g) => (
              <div
                key={g.label}
                onClick={() => { window.location.href = `/mobile/terms?type=${encodeURIComponent(g.label)}`; }}
                className="flex flex-col items-center justify-center px-3 py-3 rounded-2xl cursor-pointer active:scale-[0.97] transition-all text-center"
                style={{ backgroundColor: g.color + "12" }}
              >
                <span className="text-[28px] leading-none">{g.icon}</span>
                <span className="text-[13px] font-bold text-slate-700 leading-snug text-center mt-2">{g.label}</span>
                <span className="text-[26px] font-black tabular-nums leading-none mt-1.5" style={{ color: g.color }}>{g.rate}%</span>
                {"subs" in g && (g as any).subs ? (
                  <div className="flex flex-col items-center gap-1 mt-1.5">
                    {(g as any).subs.map((s: string, i: number) => (
                      <span key={i} className="text-[11px] font-medium leading-snug px-2 py-0.5 rounded-full"
                        style={{ color: g.color, backgroundColor: g.color + "18" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                ) : "sub" in g && (g as any).sub ? (
                  <span className="text-[11px] font-medium leading-snug mt-1.5 px-2 py-0.5 rounded-full"
                    style={{ color: g.color, backgroundColor: g.color + "18" }}>
                    {(g as any).sub}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { window.location.href = "/mobile/check"; }}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
          style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
        >
          📋 판매신청 확인
        </button>

        <a
          href="/mobile/business"
          className="flex items-center justify-between px-5 py-4 bg-white rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[18px]">🏢</div>
            <div>
              <p className="text-[14px] font-bold text-slate-800">사업자정보 / 고객센터</p>
              <p className="text-[11px] text-slate-400 mt-0.5">사업자 정보 및 고객 문의</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
