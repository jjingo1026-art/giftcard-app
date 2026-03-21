import { useState, useEffect } from "react";

const DEFAULT_NOTICE_DATA: Record<string, { title: string; sub?: string; rate: number; desc: string[] }> = {
  "신세계백화점상품권": { title: "신세계백화점상품권", rate: 95, desc: ["신세계백화점 전 지점에서 사용 가능한 상품권입니다.", "유효기간 없이 사용 가능합니다.", "액면가의 95%로 매입합니다."] },
  "롯데백화점상품권": { title: "롯데백화점상품권", rate: 95, desc: ["롯데백화점 전 지점에서 사용 가능한 상품권입니다.", "유효기간 없이 사용 가능합니다.", "액면가의 95%로 매입합니다."] },
  "현대백화점상품권": { title: "현대백화점상품권", rate: 95, desc: ["현대백화점 전 지점에서 사용 가능한 상품권입니다.", "유효기간 없이 사용 가능합니다.", "액면가의 95%로 매입합니다."] },
  "국민관광상품권": { title: "국민관광상품권", rate: 95, desc: ["전국 관광지, 호텔, 여행사 등에서 사용 가능한 상품권입니다.", "유효기간 확인 후 매입합니다.", "액면가의 95%로 매입합니다."] },
  "갤러리아백화점상품권": { title: "갤러리아백화점상품권", rate: 94, desc: ["갤러리아백화점에서 사용 가능한 상품권입니다.", "유효기간 없이 사용 가능합니다.", "액면가의 94%로 매입합니다."] },
  "삼성상품권": { title: "삼성상품권", rate: 92, desc: ["삼성전자 제품 구매 시 사용 가능한 상품권입니다.", "삼성 공식 스토어 및 온라인몰에서 사용 가능합니다.", "액면가의 92%로 매입합니다."] },
  "이랜드상품권": { title: "이랜드상품권", rate: 91, desc: ["이랜드 계열 브랜드 및 매장에서 사용 가능합니다.", "NC백화점, 뉴코아아울렛 등에서 사용 가능합니다.", "액면가의 91%로 매입합니다."] },
  "AK(애경)상품권": { title: "AK(애경)상품권", rate: 91, desc: ["AK플라자(애경백화점) 매장에서 사용 가능합니다.", "유효기간 없이 사용 가능합니다.", "액면가의 91%로 매입합니다."] },
  "농협상품권": { title: "농협상품권", rate: 91, desc: ["농협 하나로마트 및 제휴 가맹점에서 사용 가능합니다.", "농산물 구매에도 사용 가능합니다.", "액면가의 91%로 매입합니다."] },
  "지류문화상품권": { title: "지류문화상품권", sub: "컬쳐랜드 · 북앤라이프 · 문화상품권", rate: 90, desc: ["컬쳐랜드, 북앤라이프, 문화상품권이 해당됩니다.", "온·오프라인 다양한 가맹점에서 사용 가능합니다.", "액면가의 90%로 매입합니다."] },
  "온누리상품권": { title: "온누리상품권", rate: 90, desc: ["전통시장 및 골목형 상점가에서 사용 가능합니다.", "지류형과 전자형(카드·모바일) 구분 없이 매입합니다.", "액면가의 90%로 매입합니다."] },
  "주유권": { title: "주유권", sub: "SK · GS · 현대 · S-OIL", rate: 95, desc: ["SK, GS, 현대, S-OIL 주유소에서 사용 가능합니다.", "유효기간 확인 후 매입합니다.", "액면가의 95%로 매입합니다."] },
};

export default function Notice() {
  const type = decodeURIComponent(new URLSearchParams(window.location.search).get("type") ?? "");
  const [noticeData, setNoticeData] = useState(DEFAULT_NOTICE_DATA);

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/site-settings`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.rates) {
          try {
            const apiRates: Record<string, number> = JSON.parse(data.rates);
            setNoticeData((prev) => {
              const updated = { ...prev };
              for (const [label, pct] of Object.entries(apiRates)) {
                if (updated[label]) {
                  const newRate = Number(pct);
                  const desc = updated[label].desc.map((d) =>
                    d.replace(/액면가의 \d+(\.\d+)?%로 매입합니다\./, `액면가의 ${newRate}%로 매입합니다.`)
                  );
                  updated[label] = { ...updated[label], rate: newRate, desc };
                }
              }
              return updated;
            });
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const info = noticeData[type];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => { window.location.href = "/"; }} className="text-slate-400 hover:text-slate-600 text-lg">←</button>
          <h1 className="text-[16px] font-bold text-slate-800">상품권 시세 안내</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {!info ? (
          <div className="py-16 text-center text-slate-300 text-[14px]">항목을 찾을 수 없습니다.</div>
        ) : (
          <>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-slate-800">{info.title}</h2>
                  {info.sub && <p className="text-[12px] text-slate-400 mt-1">{info.sub}</p>}
                </div>
                <div className="text-[28px] font-black text-indigo-500 tabular-nums ml-4 flex-shrink-0">
                  {info.rate}%
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-5 space-y-3">
              <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wide">안내사항</h3>
              {info.desc.map((d, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="text-indigo-400 font-bold flex-shrink-0 mt-0.5">·</span>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => { location.href = `/terms.html?type=${encodeURIComponent(type)}`; }}
              className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-[15px] hover:bg-indigo-600 transition-colors active:scale-[0.98]"
            >
              예약 신청하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
