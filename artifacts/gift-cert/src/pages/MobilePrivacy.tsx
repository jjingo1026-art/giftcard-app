import { useState, useEffect } from "react";
import LangPicker, { useLang } from "@/components/LangPicker";
import { getLabel } from "@/lib/uiTranslations";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function MobilePrivacy() {
  const params = new URLSearchParams(location.search);
  const type = params.get("type") ?? "";
  const [lang, setLang] = useLang();
  const [customPrivacy, setCustomPrivacy] = useState("");

  useEffect(() => {
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.mobile_privacy_text !== undefined) setCustomPrivacy(data.mobile_privacy_text);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = `/mobile/terms?type=${encodeURIComponent(type)}`; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-[16px] font-bold text-slate-800 flex-1">{getLabel("mobile_privacy_title", lang)}</h1>
          <LangPicker lang={lang} onChange={setLang} accentColor="#ec4899" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-5 pb-10 space-y-4">
        {type && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 rounded-2xl border border-pink-100">
            <span className="text-[14px]">📱</span>
            <p className="text-[12.5px] font-semibold text-pink-700">신청 상품권: <span className="font-black">{type}</span></p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">🔒</span>
              <h2 className="text-[15px] font-bold text-slate-800">개인정보 수집 및 이용 동의 <span className="text-rose-400 text-[12px] font-semibold">(필수)</span></h2>
            </div>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              회사는 모바일상품권 매입 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.
            </p>
          </div>

          <div className="px-5 py-5 space-y-5">
            {customPrivacy ? (
              <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">{customPrivacy}</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">수집 항목</p>
                  <div className="bg-slate-50 rounded-2xl px-4 py-3">
                    <p className="text-[14px] text-slate-700 font-medium">성명, 전화번호, 계좌번호, 예금주명</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">수집 목적</p>
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-2">
                    {["매입 신청 확인 및 상담", "모바일상품권 매입 대금 입금 처리", "고객 문의 대응"].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-pink-400 font-bold flex-shrink-0 mt-0.5">·</span>
                        <p className="text-[14px] text-slate-700">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">보유 및 이용 기간</p>
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-1.5">
                    <p className="text-[14px] text-slate-700">거래 완료 후 6개월 보관 후 파기</p>
                    <p className="text-[12px] text-slate-400 leading-relaxed">
                      (단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관)
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">동의 거부 권리</p>
                  <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
                    <p className="text-[13.5px] text-slate-600 leading-relaxed">
                      이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으며,<br />
                      동의 거부 시 서비스 이용이 제한될 수 있습니다.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => { location.href = `/mobile/select?type=${encodeURIComponent(type)}&agreed=1`; }}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-sm"
          style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
        >
          {getLabel("mobile_privacy_agree", lang)}
        </button>

        <button
          onClick={() => { window.open(`/mobile/terms?type=${encodeURIComponent(type)}`, "_blank"); }}
          className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-slate-500 bg-white border border-slate-200 transition-all active:scale-[0.98] shadow-sm hover:bg-slate-50"
        >
          {getLabel("mobile_view_terms", lang)}
        </button>
      </div>
    </div>
  );
}
