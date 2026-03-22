import { useState, useEffect } from "react";

const SECTIONS = [
  {
    id: "terms",
    icon: "📋",
    title: "이용약관",
    content: [
      {
        heading: "제1조 (목적)",
        body: "본 약관은 회사가 제공하는 상품권 매입 예약 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.",
      },
      {
        heading: "제2조 (서비스 내용)",
        body: "회사는 이용자가 상품권 매입을 위해 예약을 신청할 수 있는 서비스를 제공합니다.\n매입은 담당자를 통해 오프라인 또는 별도 방식으로 진행됩니다.",
      },
      {
        heading: "제3조 (예약)",
        body: "이용자는 성함, 연락처, 계좌정보 등을 입력하여 예약을 신청할 수 있습니다.\n회사는 예약 내용을 확인 후 담당자를 배정합니다.",
      },
      {
        heading: "제4조 (예약 제한)",
        body: "다음의 경우 예약이 제한될 수 있습니다.",
        bullets: ["허위 정보 입력", "신청자와 예금주가 일치하지 않는 경우", "반복적인 예약 취소 또는 노쇼", "기타 서비스 운영에 지장을 주는 경우"],
      },
      {
        heading: "제5조 (노쇼 및 예약 취소)",
        body: "이용자가 예약 시간에 나타나지 않는 경우 노쇼로 처리되며,\n반복될 경우 서비스 이용이 제한될 수 있습니다.",
      },
      {
        heading: "제6조 (매입 거절)",
        body: "다음의 경우 매입이 거절됩니다.",
        bullets: ["상품권 훼손 또는 사용된 경우", "정상적인 유통 경로가 아닌 경우", "기타 거래가 부적절하다고 판단되는 경우"],
      },
      {
        heading: "제7조 (책임의 제한)",
        body: "회사는 다음과 같은 경우 책임을 지지 않습니다.",
        bullets: ["이용자의 입력 오류로 인한 문제", "이용자 간 또는 거래 과정에서 발생한 분쟁", "불가항력적인 사유로 인한 서비스 중단"],
      },
      {
        heading: "제8조 (서비스 변경 및 중단)",
        body: "회사는 운영상 필요에 따라 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.",
      },
      {
        heading: "제9조 (약관 변경)",
        body: "회사는 필요 시 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 안내합니다.",
      },
    ],
  },
  {
    id: "privacy",
    icon: "🔒",
    title: "개인정보처리방침",
    content: [
      {
        heading: "기본 방침",
        body: "회사는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다.",
      },
      {
        heading: "1. 수집 항목",
        bullets: ["성명", "전화번호", "계좌번호", "예금주명"],
      },
      {
        heading: "2. 수집 목적",
        bullets: ["예약 확인 및 상담", "상품권 매입 대금 입금 처리", "고객 문의 대응"],
      },
      {
        heading: "3. 보유 및 이용 기간",
        bullets: ["거래 완료 후 6개월 보관 후 파기", "단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관"],
      },
      {
        heading: "4. 개인정보 제공",
        body: "회사는 이용자의 개인정보를 외부에 제공하지 않습니다.\n단, 법령에 따른 요청이 있는 경우 예외로 합니다.",
      },
      {
        heading: "5. 개인정보 보호",
        body: "회사는 개인정보 보호를 위해 기술적·관리적 보호조치를 적용합니다.",
      },
      {
        heading: "6. 이용자 권리",
        body: "이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다.",
      },
    ],
  },
  {
    id: "guide",
    icon: "💡",
    title: "거래 안내",
    content: [
      {
        heading: "1. 신청자와 예금주",
        body: "신청자 성함과 예금주명이 동일해야 하며,\n다를 경우 거래가 제한되거나 취소될 수 있습니다.",
      },
      {
        heading: "2. 상품권 상태",
        body: "훼손, 사용된 상품권 또는 정상 유통이 아닌 상품권은 매입이 거절될 수 있습니다.",
      },
      {
        heading: "3. 거래 진행",
        body: "예약 후 담당자가 배정되며, 거래는 안내된 방식으로 진행됩니다.",
      },
      {
        heading: "4. 노쇼 정책",
        body: "예약 시간에 방문하지 않을 경우 노쇼로 처리되며,\n반복 시 서비스 이용이 제한될 수 있습니다.",
      },
      {
        heading: "5. 일부 문제 발생 시",
        body: "상품권 일부에 문제가 있는 경우, 해당 부분은 매입에서 제외되거나 재협의될 수 있습니다.",
      },
      {
        heading: "6. 입금",
        body: "검수 완료 후 안내된 계좌로 입금이 진행됩니다.",
      },
      {
        heading: "7. 책임 안내",
        body: "거래 과정에서 발생하는 문제에 대해 회사는 합리적인 범위 내에서만 책임을 집니다.",
      },
    ],
  },
];

const SECTION_KEYS: Record<string, string> = { terms: "terms_service", privacy: "terms_privacy", guide: "terms_guide" };

export default function Terms() {
  const params = new URLSearchParams(location.search);
  const isUrgent = params.get("urgent") === "1";
  const type = params.get("type") ?? "";
  const fromPrivacy = params.get("from") === "privacy";

  const [activeTab, setActiveTab] = useState(0);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const ct: Record<string, string> = {};
        for (const [id, key] of Object.entries(SECTION_KEYS)) {
          if (data[key]) ct[id] = data[key];
        }
        setCustomTexts(ct);
      })
      .catch(() => {});
  }, []);

  function goPrivacy() {
    const q = isUrgent ? "urgent=1" : `type=${encodeURIComponent(type)}`;
    location.href = `/privacy?${q}`;
  }

  const section = SECTIONS[activeTab];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => {
              if (fromPrivacy) window.close();
              else window.location.href = "/";
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-[16px] font-bold text-slate-800">이용약관 및 개인정보처리방침</h1>
        </div>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-slate-100 sticky top-[53px] z-30">
        <div className="max-w-md mx-auto px-4 flex gap-1 py-2">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all ${
                activeTab === i
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-3 pb-6 space-y-3">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <span className="text-[20px]">{section.icon}</span>
            <h2 className="text-[15px] font-bold text-slate-800">{section.title}</h2>
          </div>
          <div className="px-5 py-3 space-y-3">
            {customTexts[section.id] ? (
              customTexts[section.id].split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className="text-[13.5px] text-slate-600 leading-relaxed">{line}</p>
              ))
            ) : (
              section.content.map((item, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-[13px] font-bold text-indigo-600">{item.heading}</p>
                  {item.body && (
                    <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                      {item.body}
                    </p>
                  )}
                  {item.bullets && (
                    <ul className="space-y-1.5 bg-slate-50 rounded-2xl px-4 py-3">
                      {item.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-[13.5px] text-slate-600">
                          <span className="text-indigo-400 font-bold flex-shrink-0 mt-0.5">·</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {!fromPrivacy && (
          <button
            onClick={goPrivacy}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-sm"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
          >
            이용약관에 동의 합니다
          </button>
        )}
      </div>
    </div>
  );
}
