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
        <div className="w-full max-w-sm grid grid-cols-2 gap-3">

          {/* 모바일상품권 버튼 (왼쪽) */}
          <button
            onClick={() => navigate("/mobile")}
            className="rounded-2xl px-4 py-6 flex flex-col items-center gap-3 transition-all active:scale-[0.97] shadow-md hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-[32px]">
              📱
            </div>
            <div className="text-center">
              <p className="text-[15px] font-black text-white leading-tight">모바일</p>
              <p className="text-[15px] font-black text-white leading-tight">상품권</p>
              <p className="text-[10px] text-pink-200 mt-1.5 leading-snug">
                신세계·롯데·현대<br/>네이버페이·컬쳐랜드<br/>북앤라이프·문화·구글
              </p>
            </div>
          </button>

          {/* 지류상품권 버튼 (오른쪽) */}
          <button
            onClick={() => navigate("/rates")}
            className="rounded-2xl px-4 py-6 flex flex-col items-center gap-3 transition-all active:scale-[0.97] shadow-md hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-[32px]">
              🎟️
            </div>
            <div className="text-center">
              <p className="text-[15px] font-black text-white leading-tight">지류</p>
              <p className="text-[15px] font-black text-white leading-tight">상품권</p>
              <p className="text-[10px] text-indigo-200 mt-1.5 leading-snug">백화점·마트·<br/>실물 상품권</p>
            </div>
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
