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

      <div className="max-w-md mx-auto px-4 py-3 pb-6 space-y-3">
        {type && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 rounded-2xl border border-pink-100">
            <span className="text-[14px]">📱</span>
            <p className="text-[12.5px] font-semibold text-pink-700">신청 상품권: <span className="font-black">{type}</span></p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">🔒</span>
              <h2 className="text-[15px] font-bold text-slate-800">개인정보 수집 및 이용 동의 <span className="text-rose-400 text-[12px] font-semibold">(필수)</span></h2>
            </div>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
              회사는 원활한 예약 및 상품권 매입 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.
            </p>
          </div>

          <div className="px-5 py-3 space-y-3">
            {customPrivacy ? (
              <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">{customPrivacy}</p>
            ) : (
              <>
                {[
                  {
                    title: "1. 수집 항목",
                    bullets: ["성명", "전화번호", "계좌번호", "예금주명"],
                  },
                  {
                    title: "2. 수집 목적",
                    bullets: [
                      "예약 신청 및 확인",
                      "상품권 매입 진행 및 대금 입금 처리",
                      "고객 문의 및 상담 응대",
                      "부정 이용 방지 및 서비스 운영 관리",
                    ],
                  },
                  {
                    title: "3. 보유 및 이용 기간",
                    bullets: [
                      "원칙적으로 거래 완료 후 6개월간 보관 후 파기합니다.",
                      "다만, 부정 이용 방지, 분쟁 해결, 수사기관 요청에 대한 협조를 위하여 관련 법령이 허용하는 범위 내에서 최대 1년간 보관할 수 있습니다.",
                    ],
                  },
                  {
                    title: "4. 개인정보 제공",
                    body: "회사는 이용자의 개인정보를 외부에 제공하지 않습니다.\n단, 다음의 경우에는 예외로 합니다.",
                    bullets: ["법령에 따른 요청이 있는 경우", "수사기관의 요청이 있는 경우"],
                  },
                  {
                    title: "5. 개인정보 보호",
                    body: "회사는 개인정보 보호를 위해 관련 법령에 따른 기술적·관리적 보호조치를 적용합니다.",
                  },
                  {
                    title: "6. 이용자의 권리",
                    body: "이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다.",
                  },
                  {
                    title: "7. 동의 거부 권리",
                    body: "이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으며, 동의 거부 시 서비스 이용(예약 신청)이 제한될 수 있습니다.",
                    highlight: true,
                  },
                ].map((sec, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-[13px] font-bold text-slate-700">{sec.title}</p>
                    <div className={`rounded-2xl px-4 py-3 space-y-1.5 ${sec.highlight ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                      {sec.body && (
                        <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">{sec.body}</p>
                      )}
                      {sec.bullets && sec.bullets.map((b, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <span className="text-pink-400 font-bold flex-shrink-0 mt-0.5">·</span>
                          <p className="text-[13.5px] text-slate-600 leading-relaxed">{b}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
