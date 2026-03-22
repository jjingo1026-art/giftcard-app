import { useState, useEffect } from "react";
import LangPicker, { useLang } from "@/components/LangPicker";
import { getLabel } from "@/lib/uiTranslations";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const SECTIONS = [
  {
    id: "terms",
    icon: "📋",
    title: "이용약관",
    content: [
      { heading: "제1조 (목적)", body: "본 약관은 회사가 제공하는 모바일상품권 매입 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다." },
      { heading: "제2조 (서비스 내용)", body: "회사는 이용자가 보유한 모바일상품권(핀번호·바코드 형태)을 현금으로 매입하는 서비스를 제공합니다." },
      { heading: "제3조 (신청 방법)", body: "이용자는 상품권 종류, 금액, 성명, 연락처, 계좌정보를 입력하여 매입 신청을 할 수 있습니다.\n회사는 신청 내용 확인 후 담당자가 연락드립니다." },
      {
        heading: "제4조 (이용 제한)",
        body: "다음의 경우 서비스 이용이 제한될 수 있습니다.",
        bullets: ["허위 정보 입력", "이미 사용되었거나 유효기간이 만료된 상품권 제출", "신청자와 예금주 성명 불일치", "기타 서비스 운영에 지장을 주는 경우"],
      },
      {
        heading: "제5조 (매입 거절)",
        body: "다음의 경우 매입이 거절됩니다.",
        bullets: ["핀번호·바코드가 이미 사용된 경우", "유효기간 만료 상품권", "정상적인 유통 경로가 아닌 상품권", "기타 거래가 부적절하다고 판단되는 경우"],
      },
      { heading: "제6조 (책임의 제한)", body: "회사는 이용자의 입력 오류, 불가항력적 사유로 인한 서비스 중단 등에 대해 책임을 지지 않습니다." },
      { heading: "제7조 (약관 변경)", body: "회사는 필요 시 본 약관을 변경할 수 있으며, 변경된 내용은 서비스 내 공지를 통해 안내합니다." },
    ],
  },
  {
    id: "guide",
    icon: "💡",
    title: "거래 안내",
    content: [
      { heading: "1. 핀번호 / 바코드 제출", body: "담당자 연락 후 핀번호 또는 바코드 이미지를 전달해 주시면 검수 후 입금 처리됩니다." },
      { heading: "2. 신청자와 예금주", body: "신청자 성함과 입금받을 계좌의 예금주명이 동일해야 합니다.\n다를 경우 거래가 제한될 수 있습니다." },
      { heading: "3. 상품권 상태", body: "유효기간 내의 미사용 상품권만 매입합니다.\n사용된 상품권, 잔액 상품권은 매입이 불가할 수 있습니다." },
      { heading: "4. 입금 처리", body: "검수 완료 후 안내된 계좌로 입금이 진행됩니다.\n통상 검수 완료 당일 처리됩니다." },
      { heading: "5. 30만원 미만 이동경비", body: "상품권 금액이 30만원 미만인 경우 이동경비 3,000원이 차감됩니다." },
    ],
  },
];

export default function MobileTerms() {
  const params = new URLSearchParams(location.search);
  const type = params.get("type") ?? "";
  const [lang, setLang] = useLang();
  const [activeTab, setActiveTab] = useState(0);
  const [customTerms, setCustomTerms] = useState("");
  const [customGuide, setCustomGuide] = useState("");

  useEffect(() => {
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.mobile_terms_text !== undefined) setCustomTerms(data.mobile_terms_text);
        if (data.mobile_guide_text !== undefined) setCustomGuide(data.mobile_guide_text);
      })
      .catch(() => {});
  }, []);

  const section = SECTIONS[activeTab];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/mobile"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-[16px] font-bold text-slate-800 flex-1">{getLabel("mobile_terms_title", lang)}</h1>
          <LangPicker lang={lang} onChange={setLang} accentColor="#ec4899" />
        </div>
      </header>

      <div className="bg-white border-b border-slate-100 sticky top-[53px] z-30">
        <div className="max-w-md mx-auto px-4 flex gap-1 py-2">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all ${
                activeTab === i
                  ? "bg-pink-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.icon} {s.id === "terms" ? getLabel("mobile_terms_title", lang).split("및")[0].trim() : s.id === "guide" ? getLabel("mobile_guide_tab", lang) : s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 pb-10 space-y-3">
        {type && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 rounded-2xl border border-pink-100">
            <span className="text-[14px]">📱</span>
            <p className="text-[12.5px] font-semibold text-pink-700">신청 상품권: <span className="font-black">{type}</span></p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-[20px]">{section.icon}</span>
            <h2 className="text-[15px] font-bold text-slate-800">{section.title}</h2>
          </div>
          <div className="px-5 py-5 space-y-5">
            {(section.id === "terms" && customTerms) || (section.id === "guide" && customGuide) ? (
              <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                {section.id === "terms" ? customTerms : customGuide}
              </p>
            ) : section.content.map((item, i) => (
              <div key={i} className="space-y-2">
                <p className="text-[13px] font-bold text-pink-600">{item.heading}</p>
                {item.body && <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">{item.body}</p>}
                {item.bullets && (
                  <ul className="space-y-1.5 bg-slate-50 rounded-2xl px-4 py-3">
                    {item.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 text-[13.5px] text-slate-600">
                        <span className="text-pink-400 font-bold flex-shrink-0 mt-0.5">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { location.href = `/mobile/privacy?type=${encodeURIComponent(type)}`; }}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-sm"
          style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
        >
          {getLabel("mobile_terms_agree", lang)}
        </button>
      </div>
    </div>
  );
}
