import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const DEFAULT_BUSINESS = {
  name: "우리동네상품권",
  ceo: "추정호 박선경",
  regNumber: "592-97-01959",
  mailOrder: "제 2025-부천원미-0939호",
  address: "경기도 부천시 원미구 상이로 51번길 8-20, 101호",
  phone: "010-7486-8001",
  kakao: "https://open.kakao.com/o/sb7Dezii",
  hours: "AM 10:00 ~ PM 22:00",
};

export default function BusinessInfo() {
  const [, navigate] = useLocation();
  const [biz, setBiz] = useState(DEFAULT_BUSINESS);

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  }

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.business_info) {
          try { setBiz({ ...DEFAULT_BUSINESS, ...JSON.parse(data.business_info) }); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const infoRows = [
    { label: "상호명", value: biz.name },
    { label: "대표자", value: biz.ceo },
    { label: "사업자등록번호", value: biz.regNumber },
    { label: "통신판매업 신고", value: biz.mailOrder },
    { label: "주소", value: biz.address },
  ];

  const phoneRaw = biz.phone.replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">사업자정보 / 고객센터</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Business Information</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-50 flex items-center gap-2">
            <span className="text-[20px]">🏢</span>
            <p className="text-[15px] font-bold text-slate-800">사업자 정보</p>
          </div>
          <div className="px-5 py-2">
            {infoRows.map(({ label, value }) => (
              <div key={label} className="py-3 border-b border-slate-50 last:border-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-[14px] text-slate-800 font-semibold leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-50 flex items-center gap-2">
            <span className="text-[20px]">📞</span>
            <div>
              <p className="text-[15px] font-bold text-slate-800">고객센터</p>
              <p className="text-[11px] text-slate-400 mt-0.5">상담시간 {biz.hours}</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <a
              href={`tel:${phoneRaw}`}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-indigo-500 text-white active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[18px]">📱</span>
                <div>
                  <p className="text-[13px] font-bold">전화걸기</p>
                  <p className="text-[11px] opacity-80 mt-0.5">{biz.phone}</p>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>
            <a
              href={biz.kakao}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl active:scale-[0.98] transition-all"
              style={{ background: "#FEE500" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[18px]">💬</span>
                <div>
                  <p className="text-[13px] font-bold text-[#3C1E1E]">카카오톡 바로가기</p>
                  <p className="text-[11px] text-[#3C1E1E] opacity-70 mt-0.5">open.kakao.com</p>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3C1E1E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
