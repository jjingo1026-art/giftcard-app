import { useState, useEffect } from "react";
import LangPicker, { useLang } from "@/components/LangPicker";
import { getLabel } from "@/lib/uiTranslations";

const MOBILE_RATES = [
  { label: "신세계모바일", sub: "이마트교환권", icon: "🛒", color: "#e11d48", rate: 95 },
  { label: "롯데모바일", subLines: ["23으로 시작하는 교환권", "앱 선물하기"], icon: "🧡", color: "#f97316", rate: 95 },
  { label: "현대모바일", sub: "H포인트 상품권 제외", icon: "🏬", color: "#0ea5e9", rate: 95 },
  { label: "네이버페이 포인트", subs: ["쿠폰", "선물하기"], icon: "💚", color: "#03C75A", rate: 95 },
  { label: "컬쳐랜드", selectType: "컬쳐랜드 상품권", subLines: ["상품권 · 교환권", "캐시 선물하기"], icon: "📚", color: "#6366f1", rate: 90 },
  { label: "북앤라이프", selectType: "북앤라이프 도서문화상품권", subs: ["상품권", "교환권"], icon: "📖", color: "#8b5cf6", rate: 90 },
  { label: "문화상품권(18핀)", icon: "🎫", color: "#ec4899", rate: 90 },
  { label: "구글 카카오톡 교환권", selectType: "구글 카카오톡 교환권", sub: "카카오톡 구매 숫자 12자리", icon: "🎮", color: "#4ade80", rate: 90 },
  { label: "스타벅스 e카드", selectType: "스타벅스 e카드 교환권", sub: "e카드 교환권", icon: "☕", color: "#00704A", rate: 90 },
];

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function MobileGiftCert() {
  const [lang, setLang] = useLang();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeText, setNoticeText] = useState("");

  useEffect(() => {
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.mobile_rates) {
          try { setRates(JSON.parse(data.mobile_rates)); } catch {}
        }
        if (data.mobile_notice_enabled === "1" && data.mobile_notice_text?.trim()) {
          const dismissed = sessionStorage.getItem("mobile_notice_dismissed");
          if (dismissed !== data.mobile_notice_text) {
            setNoticeText(data.mobile_notice_text);
            setNoticeOpen(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  function dismissNotice() {
    sessionStorage.setItem("mobile_notice_dismissed", noticeText);
    setNoticeOpen(false);
  }

  function getRate(label: string, def: number) {
    return rates[label] ?? def;
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* 공지 팝업 */}
      {noticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-100">
              <span className="text-[20px]">📢</span>
              <h2 className="text-[16px] font-black text-slate-800">공지사항</h2>
            </div>
            <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
              <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">{noticeText}</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={dismissNotice}
                className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-slate-800">{getLabel("mobile_title", lang)}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Mobile Gift Certificate Rates</p>
          </div>
          <LangPicker lang={lang} onChange={setLang} accentColor="#ec4899" />
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
                onClick={() => { window.location.href = `/mobile/terms?type=${encodeURIComponent((g as any).selectType ?? g.label)}`; }}
                className="flex flex-col items-center justify-center px-2 py-4 rounded-2xl cursor-pointer active:scale-[0.97] transition-all text-center min-h-[148px]"
                style={{ backgroundColor: g.color + "12" }}
              >
                <span className="text-[24px] leading-none">{g.icon}</span>
                <span className="text-[11px] font-bold text-slate-700 leading-snug text-center mt-1.5">{g.label}</span>
                <span className="text-[22px] font-black tabular-nums leading-none mt-1" style={{ color: g.color }}>{getRate((g as any).selectType ?? g.label, g.rate)}%</span>
                {"subLines" in g && (g as any).subLines ? (
                  <span className="text-[9px] font-medium leading-snug mt-1.5 px-1.5 py-0.5 rounded-full flex flex-col items-center gap-0"
                    style={{ color: g.color, backgroundColor: g.color + "18" }}>
                    <span>{(g as any).subLines[0]}</span>
                    <span>{(g as any).subLines[1]}</span>
                  </span>
                ) : "subs" in g && (g as any).subs ? (
                  <span className="text-[9px] font-medium leading-snug mt-1.5 px-1.5 py-0.5 rounded-full"
                    style={{ color: g.color, backgroundColor: g.color + "18" }}>
                    {(g as any).subs.join(" · ")}
                  </span>
                ) : "sub" in g && (g as any).sub ? (
                  <span className="text-[9px] font-medium leading-snug mt-1.5 px-1.5 py-0.5 rounded-full"
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
          className="w-full py-3.5 rounded-2xl text-white transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-0.5 shadow-sm"
          style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
        >
          <span className="text-[15px] font-bold flex items-center gap-2">📋 {getLabel("mobile_confirm_btn", lang)}</span>
          <span className="text-[11px] font-medium opacity-85">{lang === "ko" ? "신청하신 전화번호로 판매신청한 내역을 확인할 수 있습니다" : getLabel("mobile_check_title", lang)}</span>
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
