import { useLocation } from "wouter";

export default function GiftCertTypeSelect() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #faf5ff 50%, #fff1f5 100%)" }}>

      {/* 상단 뱃지 */}
      <div className="pt-10 flex justify-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", boxShadow: "0 2px 12px rgba(99,102,241,0.35)" }}>
          ✅ 빠르고 안전한 정식등록업체
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">

        {/* 로고 영역 */}
        <div className="mb-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[36px] mx-auto mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            🎁
          </div>
          <h1 className="text-[28px] font-black text-slate-800 leading-tight tracking-tight">
            우리동네상품권
          </h1>
          <p className="text-[14px] text-slate-500 mt-1.5 font-medium">상품권 전문 매입 서비스</p>
        </div>

        {/* 구분선 */}
        <div className="w-12 h-0.5 rounded-full bg-slate-200 my-6" />

        {/* 선택 안내 */}
        <p className="text-[18px] font-bold text-slate-700 mb-2">어떤 상품권 판매를 원하시나요?</p>
        <p className="text-[13px] text-slate-400 mb-8">판매하실 상품권 종류를 선택해 주세요</p>

        {/* 선택 버튼 */}
        <div className="w-full max-w-sm space-y-3">

          {/* 지류상품권 버튼 */}
          <button
            onClick={() => { window.location.href = "/terms"; }}
            className="w-full rounded-2xl px-6 py-5 text-left flex items-center gap-4 transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-[26px] shrink-0">
              🎟️
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-black text-white">지류상품권</p>
              <p className="text-[12px] text-indigo-200 mt-0.5">백화점·마트·주유권 등 실물 상품권</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          {/* 모바일상품권 버튼 */}
          <button
            onClick={() => navigate("/mobile")}
            className="w-full rounded-2xl px-6 py-5 text-left flex items-center gap-4 transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-[26px] shrink-0">
              📱
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-black text-white">모바일상품권</p>
              <p className="text-[12px] text-pink-200 mt-0.5">카카오·네이버·문화상품권 등 모바일 쿠폰</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* 신뢰 뱃지 */}
        <div className="mt-10 flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="text-[20px]">🏢</div>
            <p className="text-[10px] text-slate-400 font-semibold">정식등록</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center gap-1">
            <div className="text-[20px]">⚡</div>
            <p className="text-[10px] text-slate-400 font-semibold">즉시처리</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center gap-1">
            <div className="text-[20px]">🔒</div>
            <p className="text-[10px] text-slate-400 font-semibold">안전거래</p>
          </div>
        </div>
      </div>

      {/* 하단 사업자정보 링크 */}
      <div className="pb-8 text-center">
        <button
          onClick={() => navigate("/business")}
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
        >
          사업자정보 / 고객센터
        </button>
      </div>
    </div>
  );
}
