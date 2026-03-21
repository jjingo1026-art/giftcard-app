import { useState } from "react";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}

const LEVEL1 = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
  "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도",
];

const LEVEL2: Record<string, string[]> = {
  "서울특별시": ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  "부산광역시": ["강서구","금정구","기장군","남구","동구","동래구","부산진구","북구","사상구","사하구","서구","수영구","연제구","영도구","중구","해운대구"],
  "대구광역시": ["군위군","남구","달서구","달성군","동구","북구","서구","수성구","중구"],
  "인천광역시": ["강화군","계양구","남동구","동구","미추홀구","부평구","서구","연수구","옹진군","중구"],
  "광주광역시": ["광산구","남구","동구","북구","서구"],
  "대전광역시": ["대덕구","동구","서구","유성구","중구"],
  "울산광역시": ["남구","동구","북구","울주군","중구"],
  "세종특별자치시": ["조치원읍","금남면","부강면","연기면","연동면","연서면","전동면","전의면","소정면"],
  "경기도": ["가평군","고양시","과천시","광명시","광주시","구리시","군포시","김포시","남양주시","동두천시","부천시","성남시","수원시","시흥시","안산시","안성시","안양시","양주시","양평군","여주시","연천군","오산시","용인시","의왕시","의정부시","이천시","파주시","평택시","포천시","하남시","화성시"],
  "강원특별자치도": ["강릉시","고성군","동해시","삼척시","속초시","양구군","양양군","영월군","원주시","인제군","정선군","철원군","춘천시","태백시","평창군","홍천군","화천군","횡성군"],
  "충청북도": ["괴산군","단양군","보은군","영동군","옥천군","음성군","제천시","증평군","진천군","청주시","충주시"],
  "충청남도": ["계룡시","공주시","금산군","논산시","당진시","보령시","부여군","서산시","서천군","아산시","예산군","천안시","청양군","태안군","홍성군"],
  "전북특별자치도": ["고창군","군산시","김제시","남원시","무주군","부안군","순창군","완주군","익산시","임실군","장수군","전주시","정읍시","진안군"],
  "전라남도": ["강진군","고흥군","곡성군","광양시","구례군","나주시","담양군","목포시","무안군","보성군","순천시","신안군","여수시","영광군","영암군","완도군","장성군","장흥군","진도군","함평군","해남군","화순군"],
  "경상북도": ["경산시","경주시","고령군","구미시","군위군","김천시","문경시","봉화군","상주시","성주군","안동시","영덕군","영양군","영주시","영천시","예천군","울릉군","울진군","의성군","청도군","청송군","칠곡군","포항시"],
  "경상남도": ["거제시","거창군","고성군","김해시","남해군","밀양시","산청군","사천시","양산시","의령군","진주시","창녕군","창원시","통영시","하동군","함안군","함양군","합천군"],
  "제주특별자치도": ["서귀포시","제주시"],
};

const LEVEL3: Record<string, string[]> = {
  // 서울 구 → 동
  "강남구": ["개포동","논현동","대치동","도곡동","삼성동","세곡동","수서동","신사동","압구정동","역삼동","율현동","일원동","자곡동","청담동"],
  "강동구": ["강일동","고덕동","길동","둔촌동","명일동","상일동","성내동","암사동","천호동"],
  "강북구": ["미아동","번동","수유동","우이동"],
  "강서구": ["가양동","개화동","공항동","내발산동","등촌동","마곡동","방화동","화곡동"],
  "관악구": ["남현동","봉천동","신림동"],
  "광진구": ["광장동","구의동","군자동","능동","자양동","중곡동","화양동"],
  "구로구": ["가리봉동","개봉동","고척동","구로동","신도림동","오류동","온수동"],
  "금천구": ["가산동","독산동","시흥동"],
  "노원구": ["공릉동","상계동","월계동","중계동","하계동"],
  "도봉구": ["도봉동","방학동","쌍문동","창동"],
  "동대문구": ["답십리동","장안동","전농동","청량리동","회기동","휘경동"],
  "동작구": ["노량진동","대방동","동작동","사당동","상도동","신대방동"],
  "마포구": ["공덕동","노고산동","망원동","상암동","서교동","성산동","신수동","연남동","합정동","홍익동"],
  "서대문구": ["남가좌동","북가좌동","신촌동","연희동","홍은동","홍제동"],
  "서초구": ["내곡동","반포동","방배동","서초동","양재동","우면동","잠원동"],
  "성동구": ["금호동","도선동","마장동","성수동","송정동","옥수동","행당동"],
  "성북구": ["길음동","돈암동","동소문동","보문동","석관동","성북동","장위동","종암동"],
  "송파구": ["가락동","거여동","마천동","문정동","방이동","삼전동","석촌동","오금동","잠실동","장지동","풍납동"],
  "양천구": ["목동","신월동","신정동"],
  "영등포구": ["당산동","대림동","도림동","문래동","양평동","여의도동","영등포동"],
  "용산구": ["남영동","동빙고동","서빙고동","이촌동","이태원동","한강로동"],
  "은평구": ["갈현동","녹번동","불광동","수색동","신사동","역촌동","증산동"],
  "종로구": ["가회동","견지동","경운동","계동","공평동","관훈동","교남동","낙원동","내수동","누상동","묘동","명륜동","사직동","삼청동","서린동","세종로","숭인동","옥인동","익선동","인사동","청진동","통의동","혜화동"],
  "중구": ["광희동","남대문로","다동","신당동","을지로","장충동","청구동","충무로","태평로","필동","황학동"],
  "중랑구": ["면목동","묵동","상봉동","신내동","중화동"],
  // 경기 주요 시 → 구/읍/동
  "수원시": ["권선구","영통구","장안구","팔달구"],
  "성남시": ["분당구","수정구","중원구"],
  "고양시": ["덕양구","일산동구","일산서구"],
  "용인시": ["기흥구","수지구","처인구"],
  "부천시": ["오정구","원미구","소사구"],
  "안산시": ["단원구","상록구"],
  "안양시": ["동안구","만안구"],
  "남양주시": ["별내읍","화도읍","와부읍","조안면","퇴계원읍","진건읍"],
  "화성시": ["봉담읍","향남읍","남양읍","우정읍","팔탄면","매송면","비봉면"],
  "파주시": ["문산읍","법원읍","조리읍","탄현면","월롱면","파주읍"],
  "평택시": ["팽성읍","안중읍","포승읍","청북읍","진위면","서탄면","고덕면"],
  "김포시": ["통진읍","양촌읍","대곶면","월곶면","하성면"],
  // 광역시 군 → 읍/면
  "기장군": ["기장읍","정관읍","장안읍","일광읍","철마면"],
  "달성군": ["다사읍","화원읍","논공읍","현풍읍","가창면","하빈면","옥포읍"],
  "강화군": ["강화읍","선원면","불은면","길상면","화도면","양도면","내가면","하점면","양사면","송해면","교동면","삼산면","서도면"],
  "울주군": ["언양읍","온양읍","범서읍","청량읍","삼남읍","두동면","두서면","상북면","삼동면"],
  // 창원/청주/천안/전주/포항 구
  "창원시": ["마산합포구","마산회원구","성산구","의창구","진해구"],
  "청주시": ["상당구","서원구","청원구","흥덕구"],
  "천안시": ["동남구","서북구"],
  "전주시": ["덕진구","완산구"],
  "포항시": ["남구","북구"],
  // 경상도 군 → 읍/면
  "거창군": ["거창읍","웅양면","고제면","북상면","위천면","마리면","대병면","남하면","남상면","신원면","주상면"],
  "함안군": ["가야읍","칠원읍","함안면","군북면","법수면","대산면","칠서면","칠북면"],
  "합천군": ["합천읍","봉산면","묘산면","가야면","대양면","이리면","삼가면","쌍책면","초계면"],
  // 전라도 군 → 읍/면
  "고창군": ["고창읍","아산면","무장면","공음면","상하면","해리면","성내면","대산면","무림면","부안면","흥덕면","성송면","심원면","신림면"],
  "담양군": ["담양읍","봉산면","고서면","가사문학면","창평면","대덕면","무정면","금성면","용면","월산면","수북면","대전면"],
  // 충청도 군 → 읍/면
  "괴산군": ["괴산읍","감물면","장연면","연풍면","유평면","사리면","문광면","청안면","청천면","칠성면","소수면"],
  "음성군": ["음성읍","금왕읍","소이면","원남면","맹동면","대소면","삼성면","생극면"],
};

function getLevel3Options(loc1: string, loc2: string): string[] {
  if (LEVEL3[loc2]) return LEVEL3[loc2];
  // 서울 기본 동 목록
  if (loc1 === "서울특별시") {
    return ["가동","나동","다동","역전동","중앙동","신시가지","구시가지","읍내동"];
  }
  // 시/군 기본 읍/면/동
  if (loc2.endsWith("시")) {
    return ["중앙동","역전동","신시가지","구시가지","산업단지","택지지구","행정동","법정동"];
  }
  if (loc2.endsWith("군")) {
    return ["읍내리","신기리","덕산리","대리","소리","중리","상리","하리","신리","구리","동리","서리"];
  }
  return ["읍내동","중앙동","신시가지","구시가지","역세권","산업단지","택지지구","원도심"];
}

function ScrollDropdown({ label, value, options, onChange, placeholder }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl border-2 text-[14px] font-semibold transition-all
          ${open ? "border-indigo-400 bg-white text-slate-800"
            : value ? "border-indigo-300 bg-white text-indigo-700"
            : "border-slate-200 bg-slate-50 text-slate-400"}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none"
          className={`transition-transform duration-200 flex-shrink-0 ml-1 ${open ? "rotate-180 text-indigo-500" : "text-slate-400"}`}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-y-auto max-h-48">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center px-4 py-2.5 text-[13px] transition-colors border-b border-slate-50 last:border-0
                  ${value === opt ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-50 font-medium"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffRegister() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [loc1, setLoc1] = useState("");
  const [loc2, setLoc2] = useState("");
  const [loc3, setLoc3] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setError("");
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (phone.replace(/\D/g, "").length < 10) { setError("올바른 전화번호를 입력해주세요."); return; }
    if (pw.length < 8) { setError("비밀번호는 8자리 이상 입력해주세요."); return; }
    if (pw !== pwConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }

    const preferredLocation = [loc1, loc2, loc3].filter(Boolean).join(" ") || undefined;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone, password: pw, preferredLocation }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        setName(""); setPhone(""); setPw(""); setPwConfirm("");
        setLoc1(""); setLoc2(""); setLoc3("");
      } else {
        setError(data.message ?? data.error ?? "오류가 발생했습니다.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300";

  const level2Options = loc1 ? (LEVEL2[loc1] ?? []) : [];
  const level3Options = (loc1 || loc2) ? getLevel3Options(loc1, loc2) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
            👨‍🔧
          </div>
          <h1 className="text-[22px] font-black text-slate-800">매입담당자 등록 신청</h1>
          <p className="text-[13px] text-slate-400 mt-1.5">관리자 승인 후 로그인할 수 있습니다</p>
        </div>

        {msg ? (
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm px-6 py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto">✓</div>
            <div>
              <p className="text-[17px] font-black text-slate-800">신청 완료</p>
              <p className="text-[13px] text-slate-500 mt-1">{msg}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <p className="text-[12px] text-amber-700 font-medium">⏳ 관리자 검토 후 문자로 안내드립니다</p>
            </div>
            <a
              href="/staff/login"
              className="block w-full py-3.5 rounded-2xl text-white text-[15px] font-bold text-center transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              로그인 화면으로
            </a>
          </div>
        ) : (
          <form onSubmit={register} className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">이름</label>
              <input
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">전화번호 (아이디)</label>
              <input
                placeholder="010-0000-0000"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className={inputCls}
                autoComplete="tel"
                inputMode="numeric"
              />
            </div>

            {/* 거래희망지역 — 3단계 스크롤 드롭다운 */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">거래희망지역</label>
              <div className="space-y-2">
                {/* 1단계: 도/광역시 */}
                <ScrollDropdown
                  label="도/광역시"
                  value={loc1}
                  options={LEVEL1}
                  onChange={(v) => { setLoc1(v); setLoc2(""); setLoc3(""); }}
                  placeholder="도 / 광역시 선택"
                />
                {/* 2단계: 시/구/읍 */}
                <ScrollDropdown
                  label="시/구/읍"
                  value={loc2}
                  options={level2Options}
                  onChange={(v) => { setLoc2(v); setLoc3(""); }}
                  placeholder={loc1 ? "시 / 구 / 읍 선택" : "도/광역시를 먼저 선택하세요"}
                />
                {/* 3단계: 동/면/리 */}
                <ScrollDropdown
                  label="동/면/리"
                  value={loc3}
                  options={level3Options}
                  onChange={setLoc3}
                  placeholder={loc2 ? "동 / 면 / 리 선택" : "시/구/읍을 먼저 선택하세요"}
                />
              </div>
              {(loc1 || loc2 || loc3) && (
                <p className="text-[11px] text-indigo-500 pl-1 font-medium">
                  📍 {[loc1, loc2, loc3].filter(Boolean).join(" ")}
                </p>
              )}
              <p className="text-[11px] text-slate-400 pl-1">선호하는 거래 지역을 선택해주세요 (선택)</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">비밀번호</label>
              <div className="relative">
                <input
                  placeholder="8자리 이상"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className={inputCls + " pr-12"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium"
                >
                  {showPw ? "숨기기" : "보기"}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">비밀번호 확인</label>
              <input
                placeholder="비밀번호 재입력"
                type={showPw ? "text" : "password"}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                className={inputCls + (pwConfirm && pw !== pwConfirm ? " border-rose-300 bg-rose-50/30" : "")}
                autoComplete="new-password"
              />
              {pwConfirm && pw !== pwConfirm && (
                <p className="text-[11px] text-rose-500 pl-1">비밀번호가 일치하지 않습니다</p>
              )}
            </div>

            {error && (
              <div className="py-3 px-4 rounded-2xl bg-rose-50 border border-rose-100 text-[13px] text-rose-600 font-medium">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-indigo-200"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {loading ? "처리 중..." : "등록 신청"}
            </button>

            <p className="text-center text-[12px] text-slate-400">
              이미 계정이 있으신가요?{" "}
              <a href="/staff/login" className="text-indigo-500 font-bold hover:underline">
                로그인
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
