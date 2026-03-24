import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import PWAInstallButton from "@/components/PWAInstallButton";

const TWENTY_MINUTES = 20 * 60 * 1000;

function calcVirtual(startTime: number) {
  return Math.floor((Date.now() - startTime) / TWENTY_MINUTES);
}

function useRequestCounter() {
  const [data, setData] = useState<{ count: number; startTime: number } | null>(null);
  const [virtualAdd, setVirtualAdd] = useState(0);

  useEffect(() => {
    fetch("/api/reservations/total-count")
      .then((r) => r.json())
      .then((d) => {
        const count = Number(d.count ?? 0);
        const startTime = Number(d.startTime ?? Date.now());
        setData({ count, startTime });
        setVirtualAdd(calcVirtual(startTime));
      })
      .catch(() => setData({ count: 0, startTime: Date.now() }));
  }, []);

  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      setVirtualAdd(calcVirtual(data.startTime));
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (data === null) return null;
  return data.count + virtualAdd;
}

function AnimatedCount({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    const duration = 800;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (progress >= 1) {
        clearInterval(timer);
        prevRef.current = end;
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{displayed.toLocaleString("ko-KR")}</>;
}

export default function GiftCertTypeSelect() {
  const [, navigate] = useLocation();
  const count = useRequestCounter();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #faf5ff 50%, #fff1f5 100%)" }}>

      {/* 상단 뱃지 */}
      <div className="pt-10 flex justify-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold tracking-wide"
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

        {/* 앱 설치 버튼 */}
        <div className="mb-6">
          <PWAInstallButton />
        </div>

        {/* 선택 안내 */}
        <p className="text-[18px] font-bold text-slate-700 mb-2">어떤 상품권 판매를 원하시나요?</p>
        <p className="text-[13px] text-slate-400 mb-8">판매하실 상품권 종류를 선택해 주세요</p>

        {/* 선택 버튼 */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4">

          {/* 모바일상품권 버튼 (왼쪽) */}
          <button
            onClick={() => navigate("/mobile")}
            className="rounded-3xl px-5 py-8 flex flex-col items-center gap-4 transition-all active:scale-[0.97] shadow-lg hover:shadow-xl"
            style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-[36px]">
              📱
            </div>
            <div className="text-center">
              <p className="text-[17px] font-black text-white leading-tight">모바일</p>
              <p className="text-[17px] font-black text-white leading-tight">상품권</p>
              <p className="text-[11px] text-pink-200 mt-2 leading-snug">
                신세계·롯데·현대<br/>네이버페이·컬쳐랜드<br/>북앤라이프·문화·구글
              </p>
            </div>
          </button>

          {/* 지류상품권 버튼 (오른쪽) */}
          <button
            onClick={() => navigate("/rates")}
            className="rounded-3xl px-5 py-8 flex flex-col items-center gap-4 transition-all active:scale-[0.97] shadow-lg hover:shadow-xl"
            style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-[36px]">
              🎟️
            </div>
            <div className="text-center">
              <p className="text-[17px] font-black text-white leading-tight">지류</p>
              <p className="text-[17px] font-black text-white leading-tight">상품권</p>
              <p className="text-[11px] text-indigo-200 mt-2 leading-snug">
                신세계·롯데·현대·갤러리아<br/>삼성·이랜드·AK·농협<br/>문화·온누리·주유권 등
              </p>
            </div>
          </button>
        </div>

        {/* 신뢰 뱃지 */}
        <div className="mt-10 flex items-center gap-5">
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-[26px]">🏢</div>
            <p className="text-[12px] text-slate-400 font-semibold">정식등록</p>
          </div>
          <div className="w-px h-9 bg-slate-200" />
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-[26px]">⚡</div>
            <p className="text-[12px] text-slate-400 font-semibold">즉시처리</p>
          </div>
          <div className="w-px h-9 bg-slate-200" />
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-[26px]">🔒</div>
            <p className="text-[12px] text-slate-400 font-semibold">안전거래</p>
          </div>
        </div>

        {/* 누적 신청건수 */}
        {count !== null && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <p className="text-[11px] text-slate-400 font-medium">누적 신청건수</p>
            <p className="text-[22px] font-black" style={{ color: "#6366f1" }}>
              <AnimatedCount value={count} />
              <span className="text-[15px] font-bold ml-0.5">건</span>
            </p>
          </div>
        )}
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
