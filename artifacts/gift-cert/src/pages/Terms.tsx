import { useState } from "react";

const NOTICES = [
  "훼손되거나 심하게 구겨진 상품권은 매입이 거절됩니다.",
  "불법적으로 취득한 상품권을 판매하시는 경우 민·형사상 책임질 수 있습니다.",
  "같은 날짜 같은 시간대 예약이 집중되는 경우 원하시는 시간대 예약이 안될 수 있습니다.",
  "매입담당자 배정이 되면 예약신청 페이지에서 매입담당자의 연락처를 확인할 수 있습니다.",
  "매입담당자가 배정되면 판매자와 매입담당자간 채팅이 가능합니다.",
  "매입담당자는 차량으로 이동하므로 거래장소를 지정할 시 주정차 가능한 곳으로 입력해 주셔야 합니다.",
  "거래를 위한 판매자의 개인정보를 수집합니다. (성함, 전화번호, 입금 계좌번호, 예금주)",
];

export default function Terms() {
  const [agree, setAgree] = useState(false);

  function goNext() {
    if (!agree) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    location.href = "/";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => history.back()} className="text-slate-400 hover:text-slate-600 text-lg">←</button>
          <h1 className="text-[16px] font-bold text-slate-800">예약 전 주의사항</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-10">
        {/* 주의사항 카드 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-2">
            <span className="text-[18px]">⚠️</span>
            <h2 className="text-[15px] font-bold text-slate-800">주의사항</h2>
          </div>
          <div className="px-5 pb-5 space-y-3.5">
            {NOTICES.map((text, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[13.5px] text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-slate-100" />

        {/* 동의 체크박스 */}
        <div
          onClick={() => setAgree((v) => !v)}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 cursor-pointer transition-all ${
            agree ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"
          }`}
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            agree ? "bg-indigo-500 border-indigo-500" : "bg-white border-slate-300"
          }`}>
            {agree && (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className={`text-[14px] font-semibold ${agree ? "text-indigo-700" : "text-slate-500"}`}>
            개인정보 수집 및 이용에 동의합니다.
          </span>
        </div>

        {/* 예약 진행 버튼 */}
        <button
          onClick={goNext}
          className={`w-full py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] ${
            agree
              ? "bg-indigo-500 text-white hover:bg-indigo-600"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          예약 진행
        </button>
      </div>
    </div>
  );
}
