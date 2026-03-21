import { useLocation } from "wouter";

export default function MobileGiftCert() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">모바일상품권</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Mobile Gift Certificate</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-10 flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[44px] shadow-lg"
          style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
          📱
        </div>

        <div>
          <h2 className="text-[22px] font-black text-slate-800">모바일상품권 매입</h2>
          <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
            카카오·네이버·문화상품권 등<br/>모바일 쿠폰을 빠르게 매입해 드립니다
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 w-full text-left space-y-3">
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">취급 상품권 종류</p>
          {[
            { icon: "💛", name: "카카오페이 선물" },
            { icon: "💚", name: "네이버페이 포인트" },
            { icon: "📚", name: "문화상품권 (컬쳐랜드)" },
            { icon: "🎮", name: "해피머니 상품권" },
            { icon: "🛒", name: "신세계 모바일상품권" },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
              <span className="text-[18px]">{item.icon}</span>
              <span className="text-[14px] font-semibold text-slate-700">{item.name}</span>
            </div>
          ))}
        </div>

        {/* 고객센터 연결 안내 */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl px-6 py-5 w-full">
          <p className="text-[13px] font-bold text-pink-700 mb-1">📞 전화로 문의해 주세요</p>
          <p className="text-[12px] text-pink-500 leading-relaxed">
            모바일상품권은 전화 상담 후 진행됩니다.<br/>
            상담시간: AM 10:00 ~ PM 22:00
          </p>
          <a
            href="tel:01074868001"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-[14px] font-bold transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
          >
            📱 010-7486-8001 전화걸기
          </a>
        </div>

        <button
          onClick={() => navigate("/")}
          className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← 처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}
