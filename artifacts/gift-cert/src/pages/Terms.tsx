const NOTICES = [
  "우리동네상품권 예약판매 신청하기 입니다 원하는 날짜에 시간 장소에서 거래를 신청하실수 있습니다.",
  "현재 서비스 가능 지역은 부천 전지역, 인천 부평구 및 계양구 입니다. 서비스 지역은 확대 예정입니다.",
  "현재 서비스 가능 시간은 AM10:00 ~ PM23:00 입니다. 서비스 시간은 차후 24시간으로 확대 예정입니다.",
  "불법적으로 취득한 상품권을 판매하시는 경우 민.형사상의 책임을 질 수 있습니다.",
  "훼손되거나 심하게 구겨진 상품권 및 유효기간이 지난 상품권은 매입이 거절됩니다 반드시 확인 바랍니다.",
  "같은 날짜의 같은 시간대 예약이 집중되는 경우 원하시는 시간대 예약이 안될 수 있습니다.",
  "매입당당자 배정이 되면 예약신청 페이지에서 매입담당자의 연락처를 확인할 수 있습니다.",
  "매입담당자가 배정되면 판매자와 매입담당자간 채팅이 가능합니다.",
  "매입담당자는 차량으로 이동하므로 거래장소를 지정할시 주정차 가능한 곳으로 입력해 주셔야 합니다.",
  "증정용 상품권의 경우 상품권 판매 신청시 증정용 체크를 반드시 해주셔야 하며 1만원권 증정용은 매입하지 않습니다.",
];

export default function Terms() {
  const params = new URLSearchParams(location.search);
  const isUrgent = params.get("urgent") === "1";
  const type = params.get("type") ?? "";

  function goPrivacy() {
    const q = isUrgent ? "urgent=1" : `type=${encodeURIComponent(type)}`;
    location.href = `/privacy.html?${q}`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => { window.location.href = "/"; }} className="text-slate-400 hover:text-slate-600 text-lg">←</button>
          <h1 className="text-[16px] font-bold text-slate-800">공지사항 · 필독</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-10">
        {/* 공지사항 카드 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-2">
            <span className="text-[18px]">📢</span>
            <h2 className="text-[15px] font-bold text-slate-800">공지사항 · 필독</h2>
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

        {/* 확인 버튼 → 개인정보 동의 페이지 이동 */}
        <button
          onClick={goPrivacy}
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white text-[15px] font-bold transition-all active:scale-[0.98] hover:bg-indigo-600 shadow-sm"
        >
          확인
        </button>
      </div>
    </div>
  );
}
