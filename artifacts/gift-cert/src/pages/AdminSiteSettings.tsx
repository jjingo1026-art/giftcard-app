import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminLogin";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_RATES: Record<string, number> = {
  "신세계백화점상품권": 95,
  "롯데백화점상품권": 95,
  "현대백화점상품권": 95,
  "국민관광상품권": 95,
  "갤러리아백화점상품권": 94,
  "삼성상품권": 92,
  "이랜드상품권": 91,
  "AK(애경)상품권": 91,
  "농협상품권": 91,
  "지류문화상품권": 90,
  "온누리상품권": 90,
  "주유권": 95,
};

const VOUCHER_DISPLAY: Record<string, string> = {
  "신세계백화점상품권": "신세계백화점",
  "롯데백화점상품권": "롯데백화점",
  "현대백화점상품권": "현대백화점",
  "국민관광상품권": "국민관광상품권",
  "갤러리아백화점상품권": "갤러리아백화점",
  "삼성상품권": "삼성상품권",
  "이랜드상품권": "이랜드상품권",
  "AK(애경)상품권": "AK(애경)상품권",
  "농협상품권": "농협상품권",
  "지류문화상품권": "지류문화 상품권",
  "온누리상품권": "온누리상품권",
  "주유권": "주유권",
};

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

const TERMS_SECTIONS = [
  { key: "terms_service", label: "이용약관", placeholder: "이용약관 내용을 입력하세요.\n각 줄이 하나의 항목으로 표시됩니다." },
  { key: "terms_privacy", label: "개인정보처리방침", placeholder: "개인정보처리방침 내용을 입력하세요." },
  { key: "terms_guide", label: "거래안내", placeholder: "거래안내 내용을 입력하세요." },
];

function saveSetting(key: string, value: string) {
  return adminFetch(`${API}/api/admin/site-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-[13px] font-semibold px-5 py-2.5 rounded-2xl shadow-xl animate-fade-in">
      {msg}
    </div>
  );
}

export default function AdminSiteSettings() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [rates, setRates] = useState<Record<string, number>>({ ...DEFAULT_RATES });
  const [business, setBusiness] = useState({ ...DEFAULT_BUSINESS });
  const [noticeText, setNoticeText] = useState("");
  const [noticeActive, setNoticeActive] = useState(false);
  const [popupText, setPopupText] = useState("");
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [termsValues, setTermsValues] = useState<Record<string, string>>({
    terms_service: "",
    terms_privacy: "",
    terms_guide: "",
  });

  useEffect(() => {
    adminFetch(`${API}/api/admin/site-settings`)
      .then((r: Response) => r.json())
      .then((data: Record<string, string>) => {
        if (data.rates) {
          try { setRates({ ...DEFAULT_RATES, ...JSON.parse(data.rates) }); } catch {}
        }
        if (data.business_info) {
          try { setBusiness({ ...DEFAULT_BUSINESS, ...JSON.parse(data.business_info) }); } catch {}
        }
        if (data.notice_text !== undefined) setNoticeText(data.notice_text);
        if (data.notice_active !== undefined) setNoticeActive(data.notice_active === "true");
        if (data.paper_popup_text !== undefined) setPopupText(data.paper_popup_text);
        if (data.paper_popup_enabled !== undefined) setPopupEnabled(data.paper_popup_enabled === "1");
        setTermsValues({
          terms_service: data.terms_service ?? "",
          terms_privacy: data.terms_privacy ?? "",
          terms_guide: data.terms_guide ?? "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function showToast(msg: string) { setToast(msg); }

  async function saveRates() {
    setSaving(true);
    await saveSetting("rates", JSON.stringify(rates));
    setSaving(false);
    showToast("시세 저장 완료!");
  }

  async function saveBusiness() {
    setSaving(true);
    await saveSetting("business_info", JSON.stringify(business));
    setSaving(false);
    showToast("사업자정보 저장 완료!");
  }

  async function saveNotice() {
    setSaving(true);
    await saveSetting("notice_text", noticeText);
    await saveSetting("notice_active", noticeActive ? "true" : "false");
    setSaving(false);
    showToast("공지사항 저장 완료!");
  }

  async function savePopup() {
    setSaving(true);
    await saveSetting("paper_popup_text", popupText);
    await saveSetting("paper_popup_enabled", popupEnabled ? "1" : "0");
    setSaving(false);
    showToast("팝업 공지 저장 완료!");
  }

  async function saveTerms() {
    setSaving(true);
    for (const k of Object.keys(termsValues)) {
      await saveSetting(k, termsValues[k]);
    }
    setSaving(false);
    showToast("이용약관 저장 완료!");
  }

  const TABS = ["📊 상품권시세", "🏢 사업자정보", "📢 공지사항", "📄 이용약관"];

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">사이트 설정</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">공지사항 · 시세 · 사업자정보 · 이용약관</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                tab === i
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-16 text-slate-300 text-[14px]">불러오는 중...</div>
        ) : (
          <>
            {/* 탭 0: 상품권시세 */}
            {tab === 0 && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-50">
                    <p className="text-[14px] font-bold text-slate-700">매입 요율 설정</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">각 상품권의 매입 요율(%)을 설정합니다.</p>
                  </div>
                  <div className="px-5 py-2">
                    {Object.keys(DEFAULT_RATES).map((label) => (
                      <div key={label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                        <p className="text-[14px] font-semibold text-slate-700">{VOUCHER_DISPLAY[label] ?? label}</p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={50}
                            max={100}
                            step={0.5}
                            value={rates[label] ?? DEFAULT_RATES[label]}
                            onChange={(e) => setRates((r) => ({ ...r, [label]: parseFloat(e.target.value) || 0 }))}
                            className="w-20 px-3 py-1.5 text-center text-[15px] font-black text-indigo-600 border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-400"
                          />
                          <span className="text-[14px] font-bold text-slate-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={saveRates}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "💾 시세 저장"}
                </button>
              </div>
            )}

            {/* 탭 1: 사업자정보 */}
            {tab === 1 && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-50">
                    <p className="text-[14px] font-bold text-slate-700">사업자 정보</p>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    {[
                      { key: "name", label: "상호명" },
                      { key: "ceo", label: "대표자" },
                      { key: "regNumber", label: "사업자등록번호" },
                      { key: "mailOrder", label: "통신판매업 신고번호" },
                      { key: "address", label: "주소" },
                      { key: "phone", label: "전화번호" },
                      { key: "kakao", label: "카카오톡 링크" },
                      { key: "hours", label: "상담시간" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
                        <input
                          type="text"
                          value={business[key as keyof typeof business] ?? ""}
                          onChange={(e) => setBusiness((b) => ({ ...b, [key]: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={saveBusiness}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "💾 사업자정보 저장"}
                </button>
              </div>
            )}

            {/* 탭 2: 공지사항 */}
            {tab === 2 && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-50 flex items-center justify-between">
                    <p className="text-[14px] font-bold text-slate-700">메인 공지사항</p>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[13px] text-slate-500 font-medium">{noticeActive ? "표시 중" : "숨김"}</span>
                      <div
                        onClick={() => setNoticeActive((v) => !v)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${noticeActive ? "bg-indigo-500" : "bg-slate-200"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${noticeActive ? "left-[22px]" : "left-0.5"}`} />
                      </div>
                    </label>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[12px] text-slate-400 mb-2">메인 화면 상단에 표시되는 공지 내용입니다.</p>
                    <textarea
                      value={noticeText}
                      onChange={(e) => setNoticeText(e.target.value)}
                      rows={5}
                      placeholder="예: 오늘 오후 6시에 마감됩니다. 공휴일 정상 운영합니다."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-300 mt-1.5">공지 내용이 비어있으면 표시 중이어도 배너가 나타나지 않습니다.</p>
                  </div>
                </div>
                {noticeText && (
                  <div className={`rounded-2xl px-5 py-4 border-2 ${noticeActive ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">미리보기</p>
                    <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">{noticeText}</p>
                    {!noticeActive && <p className="text-[11px] text-slate-400 mt-1.5">※ 현재 숨김 상태 (사용자에게 표시 안 됨)</p>}
                  </div>
                )}
                <button
                  onClick={saveNotice}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "💾 공지사항 저장"}
                </button>

                {/* 팝업 공지 */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-slate-700">📢 팝업 공지</p>
                      <p className="text-[12px] text-slate-400 mt-0.5">지류 시세 페이지 진입 시 팝업 표시</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[13px] text-slate-500 font-medium">{popupEnabled ? "표시 중" : "숨김"}</span>
                      <div
                        onClick={() => setPopupEnabled((v) => !v)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${popupEnabled ? "bg-indigo-500" : "bg-slate-200"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${popupEnabled ? "left-[22px]" : "left-0.5"}`} />
                      </div>
                    </label>
                  </div>
                  <div className="px-5 py-4">
                    <textarea
                      value={popupText}
                      onChange={(e) => setPopupText(e.target.value)}
                      rows={5}
                      placeholder="팝업에 표시할 공지 내용을 입력하세요. 비워두면 팝업이 나타나지 않습니다."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-300 mt-1.5">저장 후 즉시 반영됩니다. 고객이 확인 후에는 같은 세션에서 다시 표시되지 않습니다.</p>
                  </div>
                </div>
                <button
                  onClick={savePopup}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "💾 팝업 공지 저장"}
                </button>
              </div>
            )}

            {/* 탭 3: 이용약관 */}
            {tab === 3 && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-50">
                    <p className="text-[14px] font-bold text-slate-700">이용약관 내용 수정</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">내용을 입력하면 기본 약관을 대체합니다. 비워두면 기존 약관이 유지됩니다.</p>
                  </div>
                  <div className="px-5 py-4 space-y-5">
                    {TERMS_SECTIONS.map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[12px] font-bold text-slate-500 mb-2">{label}</label>
                        <textarea
                          value={termsValues[key] ?? ""}
                          onChange={(e) => setTermsValues((v) => ({ ...v, [key]: e.target.value }))}
                          rows={5}
                          placeholder={placeholder}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={saveTerms}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "💾 이용약관 저장"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
