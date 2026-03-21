import { useState, useRef } from "react";

const MOBILE_TYPES = [
  { label: "신세계모바일", sub: "이마트교환권", icon: "🛒", color: "#e11d48", rate: 95 },
  { label: "롯데모바일", subs: ["23으로 시작하는 교환권", "앱선물하기"], icon: "🧡", color: "#f97316", rate: 95 },
  { label: "현대모바일", sub: "H포인트 상품권 제외", icon: "🏬", color: "#0ea5e9", rate: 95 },
  { label: "네이버페이 포인트", icon: "💚", color: "#03C75A", rate: 95 },
  { label: "컬쳐랜드 상품권", icon: "📚", color: "#6366f1", rate: 90 },
  { label: "컬쳐랜드 교환권", icon: "📚", color: "#6366f1", rate: 90 },
  { label: "북앤라이프 도서문화상품권", icon: "📖", color: "#8b5cf6", rate: 90 },
  { label: "북앤라이프 교환권", icon: "📖", color: "#8b5cf6", rate: 90 },
  { label: "문화상품권(18핀)", icon: "🎫", color: "#ec4899", rate: 90 },
  { label: "구글기프트카드", sub: "카카오톡 구매", icon: "🎮", color: "#4ade80", rate: 90 },
];

const BANKS = ["카카오뱅크", "토스뱅크", "국민은행", "신한은행", "우리은행", "하나은행", "기업은행", "농협은행", "새마을금고", "우체국", "케이뱅크", "기타"];

const LOTTE_SUBS = ["23으로 시작하는 교환권", "앱 선물하기"];
const NAVER_SUBS = ["쿠폰", "선물하기"];
const CULTURE_SUBS = ["자동추출하기", "수동입력하기"];
const SHINSEGAE_SUBS = ["바코드업로드", "상품권번호입력"];

interface MobileItem {
  type: string;
  amount: string;
  checkedSubs: string[];
  voucherNumber: string;
}

interface HyundaiImage {
  id: string;
  preview: string;
  objectPath: string | null;
  uploading: boolean;
  error: boolean;
}

function formatKRW(n: number) {
  return n === 0 ? "0원" : n.toLocaleString("ko-KR") + "원";
}

function parseAmt(v: string) {
  const n = parseInt(v.replace(/,/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function computeItem(item: MobileItem) {
  const typeInfo = MOBILE_TYPES.find((t) => t.label === item.type);
  const amountNum = parseAmt(item.amount);
  const rate = typeInfo ? typeInfo.rate / 100 : 0;
  const payment = Math.round(amountNum * rate);
  return { amountNum, rate, payment, typeInfo };
}

function NaverGiftInfo() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText("jjingo1026").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">💚</span>
        <p className="text-[13px] font-bold text-green-700">네이버페이 선물하기 안내</p>
      </div>

      <div className="flex items-center justify-between px-3 py-3 bg-white rounded-xl border border-green-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 text-[16px]">💚</div>
          <div>
            <p className="text-[13px] font-black text-green-800 tracking-wide">jjingo1026</p>
            <p className="text-[11px] text-green-600 mt-0.5">추정호</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all active:scale-95
            ${copied ? "bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              복사됨
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              아이디 복사하기
            </>
          )}
        </button>
      </div>

      <p className="text-[12px] text-green-700 font-semibold px-1">이쪽으로 보내주세요</p>

      <div className="flex items-start gap-2 px-3 py-2.5 bg-pink-50 rounded-xl border border-pink-100">
        <span className="text-[14px] flex-shrink-0 mt-0.5">💬</span>
        <p className="text-[12px] text-pink-700 leading-relaxed font-medium">
          하단 판매신청을 하시면 <span className="font-black">관리자와 채팅</span>이 가능합니다.
        </p>
      </div>
    </div>
  );
}

function MunhwaManualInput({
  numbers,
  onChange,
  onAdd,
  onRemove,
}: {
  numbers: string[];
  onChange: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">🏷️</span>
        <p className="text-[13px] font-bold text-pink-700">상품권번호 입력</p>
        <span className="text-[11px] bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full">문화상품권</span>
      </div>
      <div className="space-y-2">
        {numbers.map((num, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={num}
              onChange={(e) => onChange(idx, e.target.value.slice(0, 50))}
              placeholder={`상품권번호 ${idx + 1}`}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-pink-200 bg-white text-[14px] font-mono tracking-wider outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all placeholder:text-slate-300"
            />
            {idx === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-pink-200 text-pink-700 flex items-center justify-center hover:bg-pink-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-pink-200 text-pink-700 flex items-center justify-center hover:bg-pink-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      {numbers.some((n) => n.trim()) && (
        <div className="px-1 pt-1 space-y-0.5">
          {numbers.filter((n) => n.trim()).map((n, i) => (
            <p key={i} className="text-[11px] text-pink-600 font-semibold font-mono">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function BooknlifeManualInput({
  numbers,
  onChange,
  onAdd,
  onRemove,
}: {
  numbers: string[];
  onChange: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">🏷️</span>
        <p className="text-[13px] font-bold text-violet-700">상품권번호 입력</p>
        <span className="text-[11px] bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">북앤라이프</span>
      </div>

      <div className="space-y-2">
        {numbers.map((num, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={num}
              onChange={(e) => onChange(idx, e.target.value.slice(0, 50))}
              placeholder={`상품권번호 ${idx + 1}`}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-violet-200 bg-white text-[14px] font-mono tracking-wider outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-slate-300"
            />
            {idx === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-violet-200 text-violet-700 flex items-center justify-center hover:bg-violet-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-violet-200 text-violet-700 flex items-center justify-center hover:bg-violet-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {numbers.some((n) => n.trim()) && (
        <div className="px-1 pt-1 space-y-0.5">
          {numbers.filter((n) => n.trim()).map((n, i) => (
            <p key={i} className="text-[11px] text-violet-600 font-semibold font-mono">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ShinsegaeManualInput({
  numbers,
  onChange,
  onAdd,
  onRemove,
}: {
  numbers: string[];
  onChange: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">🏷️</span>
        <p className="text-[13px] font-bold text-rose-700">상품권번호 입력</p>
        <span className="text-[11px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">신세계모바일</span>
      </div>

      <div className="space-y-2">
        {numbers.map((num, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={num}
              onChange={(e) => onChange(idx, e.target.value.slice(0, 50))}
              placeholder={`상품권번호 ${idx + 1}`}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-rose-200 bg-white text-[14px] font-mono tracking-wider outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-slate-300"
            />
            {numbers.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center hover:bg-rose-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            {idx === numbers.length - 1 && (
              <button
                type="button"
                onClick={onAdd}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center hover:bg-rose-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {numbers.some((n) => n.trim()) && (
        <div className="px-1 pt-1 space-y-0.5">
          {numbers.filter((n) => n.trim()).map((n, i) => (
            <p key={i} className="text-[11px] text-rose-600 font-semibold font-mono">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function CultureManualInput({
  numbers,
  onChange,
  onAdd,
  onRemove,
}: {
  numbers: string[];
  onChange: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">✏️</span>
        <p className="text-[13px] font-bold text-indigo-700">상품권번호 수동입력</p>
        <span className="text-[11px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">컬쳐랜드</span>
      </div>

      <div className="space-y-2">
        {numbers.map((num, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={num}
              onChange={(e) => onChange(idx, e.target.value.replace(/[^0-9\-]/g, "").slice(0, 24))}
              placeholder={`상품권번호 ${idx + 1}`}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-200 bg-white text-[14px] font-mono tracking-wider outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
            />
            {idx === numbers.length - 1 && (
              <button
                type="button"
                onClick={onAdd}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-indigo-200 text-indigo-700 flex items-center justify-center hover:bg-indigo-300 active:scale-95 transition-all font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {numbers.some((n) => n.trim()) && (
        <div className="px-1 pt-1 space-y-0.5">
          {numbers.filter((n) => n.trim()).map((n, i) => (
            <p key={i} className="text-[11px] text-indigo-600 font-semibold font-mono">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface CultureImage {
  id: string;
  preview: string;
  uploading: boolean;
  numbers: string[];
  error: boolean;
}

function CultureAutoExtract({
  images,
  onAdd,
  onRemove,
}: {
  images: CultureImage[];
  onAdd: (file: File, mode: "message" | "barcode") => void;
  onRemove: (id: string) => void;
}) {
  const msgRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">🔍</span>
        <p className="text-[13px] font-bold text-indigo-700">상품권 번호 자동추출</p>
        <span className="text-[11px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">컬쳐랜드</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => msgRef.current?.click()}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-dashed border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
        >
          <span className="text-[22px]">💬</span>
          <span className="text-[12px] font-bold">메시지 업로드</span>
        </button>
        <button
          type="button"
          onClick={() => barRef.current?.click()}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-dashed border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
        >
          <span className="text-[22px]">📊</span>
          <span className="text-[12px] font-bold">바코드 업로드</span>
        </button>
      </div>

      <input ref={msgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdd(f, "message"); e.target.value = ""; }} />
      <input ref={barRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdd(f, "barcode"); e.target.value = ""; }} />

      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((img) => (
            <div key={img.id} className="flex gap-3 p-3 bg-white rounded-xl border border-indigo-100">
              <img src={img.preview} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-indigo-100" />
              <div className="flex-1 min-w-0">
                {img.uploading ? (
                  <div className="flex items-center gap-2 h-full">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[12px] text-indigo-500 font-medium">번호 추출 중...</span>
                  </div>
                ) : img.error ? (
                  <p className="text-[12px] text-red-500 font-medium">추출 실패. 다시 시도해 주세요.</p>
                ) : img.numbers.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-indigo-500">추출된 번호</p>
                    {img.numbers.map((n, i) => (
                      <p key={i} className="text-[13px] font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg break-all">{n}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400 font-medium">번호를 찾지 못했습니다.</p>
                )}
              </div>
              <button type="button" onClick={() => onRemove(img.id)} className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShinsegaeImageUpload({
  images,
  onAdd,
  onRemove,
}: {
  images: HyundaiImage[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => { if (f.type.startsWith("image/")) onAdd(f); });
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-rose-200 bg-white">
              <img src={img.preview} alt="바코드 이미지" className="w-full h-full object-cover" />
              {img.uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 bg-rose-50/90 flex items-center justify-center">
                  <span className="text-[18px]">⚠️</span>
                </div>
              )}
              {!img.uploading && (
                <button type="button" onClick={() => onRemove(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full py-3 rounded-xl border-2 border-dashed border-rose-300 text-rose-500 hover:bg-rose-100 text-[13px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
        사진 / 이미지 선택
      </button>
    </div>
  );
}

function HyundaiImageUpload({
  images,
  onAdd,
  onRemove,
}: {
  images: HyundaiImage[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.type.startsWith("image/")) onAdd(f);
    });
  }

  return (
    <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">🖼️</span>
        <p className="text-[13px] font-bold text-sky-700">상품권 이미지 첨부</p>
        <span className="text-[11px] bg-sky-100 text-sky-500 font-bold px-2 py-0.5 rounded-full">현대모바일</span>
      </div>
      <p className="text-[12px] text-sky-600 leading-relaxed">
        현대모바일 상품권의 이미지 또는 사진을 첨부해 주세요.
      </p>

      {/* 미리보기 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-sky-200 bg-white">
              <img src={img.preview} alt="상품권 이미지" className="w-full h-full object-cover" />
              {img.uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 bg-rose-50/90 flex items-center justify-center">
                  <span className="text-[18px]">⚠️</span>
                </div>
              )}
              {!img.uploading && (
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 업로드 버튼 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full py-3 rounded-xl border-2 border-dashed border-sky-300 text-sky-500 hover:bg-sky-100 text-[13px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
        사진 / 이미지 선택
      </button>
    </div>
  );
}

function MobileVoucherItems({
  items,
  errors,
  onChange,
  onToggleSub,
  onVoucherNumberChange,
  hyundaiImages,
  onAddHyundaiImage,
  onRemoveHyundaiImage,
  shinsegaeImages,
  onAddShinsegaeImage,
  onRemoveShinsegaeImage,
  shinsegaeNumbers,
  onShinsegaeNumberChange,
  onShinsegaeNumberAdd,
  onShinsegaeNumberRemove,
  booknlifeNumbers,
  onBooknlifeNumberChange,
  onBooknlifeNumberAdd,
  onBooknlifeNumberRemove,
  munhwaNumbers,
  onMunhwaNumberChange,
  onMunhwaNumberAdd,
  onMunhwaNumberRemove,
  cultureImages,
  onAddCultureImage,
  onRemoveCultureImage,
  cultureManualNumbers,
  onCultureManualChange,
  onCultureManualAdd,
  onCultureManualRemove,
  onAdd,
  onRemove,
}: {
  items: MobileItem[];
  errors: string[];
  onChange: (idx: number, field: "type" | "amount", val: string) => void;
  onToggleSub: (idx: number, sub: string) => void;
  onVoucherNumberChange: (idx: number, val: string) => void;
  hyundaiImages: HyundaiImage[];
  onAddHyundaiImage: (file: File) => void;
  onRemoveHyundaiImage: (id: string) => void;
  shinsegaeImages: HyundaiImage[];
  onAddShinsegaeImage: (file: File) => void;
  onRemoveShinsegaeImage: (id: string) => void;
  shinsegaeNumbers: string[];
  onShinsegaeNumberChange: (idx: number, val: string) => void;
  onShinsegaeNumberAdd: () => void;
  onShinsegaeNumberRemove: (idx: number) => void;
  booknlifeNumbers: string[];
  onBooknlifeNumberChange: (idx: number, val: string) => void;
  onBooknlifeNumberAdd: () => void;
  onBooknlifeNumberRemove: (idx: number) => void;
  munhwaNumbers: string[];
  onMunhwaNumberChange: (idx: number, val: string) => void;
  onMunhwaNumberAdd: () => void;
  onMunhwaNumberRemove: (idx: number) => void;
  cultureImages: CultureImage[];
  onAddCultureImage: (file: File) => void;
  onRemoveCultureImage: (id: string) => void;
  cultureManualNumbers: string[];
  onCultureManualChange: (idx: number, val: string) => void;
  onCultureManualAdd: () => void;
  onCultureManualRemove: (idx: number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  const totalFace = items.reduce((s, it) => s + parseAmt(it.amount), 0);
  const hasAny = items.some((it) => parseAmt(it.amount) > 0);
  const travelDeduct = hasAny && totalFace < 300000 ? 3000 : 0;
  const totalPayment = Math.max(
    0,
    items.reduce((s, it) => s + computeItem(it).payment, 0) - travelDeduct
  );

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
        상품권 종류 &amp; 금액 <span className="text-rose-400 normal-case tracking-normal">*</span>
      </label>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const { amountNum, rate, payment, typeInfo } = computeItem(item);
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {/* Row 1: type select + remove */}
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <select
                    value={item.type}
                    onChange={(e) => onChange(idx, "type", e.target.value)}
                    className="w-full h-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-700 outline-none appearance-none pr-7 focus:border-pink-400 focus:ring-2 focus:ring-pink-50 transition-all"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23ec4899' d='M5 8l5 5 5-5z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                    }}
                  >
                    {MOBILE_TYPES.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.icon} {t.label} ({t.rate}%){(t as any).sub ? ` ${(t as any).sub}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-100 text-rose-400 hover:bg-rose-200 active:scale-90 transition-all flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Row 2: sub badge or radio checkboxes */}
              {typeInfo && (item.type === "롯데모바일" || item.type === "네이버페이 포인트" || item.type.startsWith("컬쳐랜드") || item.type === "신세계모바일") ? (() => {
                const subList = item.type === "롯데모바일" ? LOTTE_SUBS : item.type === "네이버페이 포인트" ? NAVER_SUBS : item.type.startsWith("컬쳐랜드") ? CULTURE_SUBS : SHINSEGAE_SUBS;
                const accentColor = item.type === "롯데모바일" ? "#f97316" : item.type === "네이버페이 포인트" ? "#03C75A" : item.type.startsWith("컬쳐랜드") ? "#6366f1" : "#e11d48";
                const bgClass = item.type === "롯데모바일" ? "bg-orange-50 border-orange-400" : item.type === "네이버페이 포인트" ? "bg-green-50 border-green-400" : item.type.startsWith("컬쳐랜드") ? "bg-indigo-50 border-indigo-400" : "bg-rose-50 border-rose-400";
                const textClass = item.type === "롯데모바일" ? "text-orange-700" : item.type === "네이버페이 포인트" ? "text-green-700" : item.type.startsWith("컬쳐랜드") ? "text-indigo-700" : "text-rose-700";
                const labelClass = item.type === "롯데모바일" ? "text-orange-500" : item.type === "네이버페이 포인트" ? "text-green-600" : item.type.startsWith("컬쳐랜드") ? "text-indigo-500" : "text-rose-500";
                return (
                  <div className="flex flex-col gap-1.5 px-1 pt-1">
                    <p className={`text-[11px] font-bold mb-0.5 ${labelClass}`}>해당하는 항목을 선택해 주세요</p>
                    {subList.map((sub) => {
                      const checked = item.checkedSubs.includes(sub);
                      return (
                        <label
                          key={sub}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] select-none
                            ${checked ? `${bgClass}` : "border-slate-200 bg-white"}`}
                          onClick={() => onToggleSub(idx, sub)}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "border-current" : "bg-white border-slate-300"}`}
                            style={checked ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                          >
                            {checked && (
                              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-[13px] font-semibold ${checked ? textClass : "text-slate-500"}`}>{sub}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })() : null}

              {/* Row 3: amount input */}
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={item.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    onChange(idx, "amount", raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "");
                  }}
                  placeholder="금액 입력 (원)"
                  className={`w-full px-4 py-3 rounded-xl border text-[15px] font-semibold outline-none transition-all placeholder:text-slate-300 pr-8
                    ${errors[idx] ? "border-rose-300 bg-rose-50 focus:ring-2 focus:ring-rose-100" : "border-slate-200 bg-white focus:border-pink-400 focus:ring-2 focus:ring-pink-50"}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">원</span>
              </div>
              {errors[idx] && <p className="text-[11px] text-rose-500 px-1">⚠ {errors[idx]}</p>}

              {/* Row 4: payment preview */}
              {amountNum > 0 && typeInfo && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold bg-pink-50 text-pink-500">
                  <span>요율 {Math.round(rate * 100)}%</span>
                  <span className="font-black text-[15px] text-pink-700">{formatKRW(payment)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 권종 추가 */}
      <button
        type="button"
        onClick={onAdd}
        className="w-full py-2.5 rounded-2xl border-2 border-dashed border-pink-200 text-pink-400 hover:bg-pink-50 text-[13px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        권종 추가
      </button>

      {/* 23으로 시작하는 교환권 번호 입력 */}
      {items.some((it) => it.type === "롯데모바일" && it.checkedSubs.includes("23으로 시작하는 교환권")) && (
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">🎟️</span>
            <p className="text-[13px] font-bold text-orange-700">상품권 번호 입력</p>
            <span className="text-[11px] bg-orange-100 text-orange-500 font-bold px-2 py-0.5 rounded-full">23으로 시작</span>
          </div>
          {items.map((it, idx) =>
            it.type === "롯데모바일" && it.checkedSubs.includes("23으로 시작하는 교환권") ? (
              <div key={idx} className="space-y-1.5">
                {items.filter((i) => i.type === "롯데모바일" && i.checkedSubs.includes("23으로 시작하는 교환권")).length > 1 && (
                  <p className="text-[11px] font-semibold text-orange-600">항목 {idx + 1}</p>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  value={it.voucherNumber}
                  onChange={(e) => onVoucherNumberChange(idx, e.target.value.replace(/[^0-9]/g, "").slice(0, 16))}
                  placeholder="23XXXXXXXXXXXX (숫자만 입력)"
                  className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 bg-white text-[14px] font-mono tracking-wider outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-slate-300"
                />
                {it.voucherNumber && (
                  <p className="text-[11px] text-orange-600 font-semibold px-1">
                    입력된 번호: <span className="font-mono">{it.voucherNumber}</span>
                  </p>
                )}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* 네이버페이 쿠폰번호 입력 */}
      {items.some((it) => it.type === "네이버페이 포인트" && it.checkedSubs.includes("쿠폰")) && (
        <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">🎟️</span>
            <p className="text-[13px] font-bold text-green-700">쿠폰번호 입력</p>
            <span className="text-[11px] bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">네이버페이</span>
          </div>
          {items.map((it, idx) =>
            it.type === "네이버페이 포인트" && it.checkedSubs.includes("쿠폰") ? (
              <div key={idx} className="space-y-1.5">
                {items.filter((i) => i.type === "네이버페이 포인트" && i.checkedSubs.includes("쿠폰")).length > 1 && (
                  <p className="text-[11px] font-semibold text-green-600">항목 {idx + 1}</p>
                )}
                <input
                  type="text"
                  value={it.voucherNumber}
                  onChange={(e) => onVoucherNumberChange(idx, e.target.value.replace(/[^0-9A-Za-z\-]/g, "").slice(0, 30))}
                  placeholder="쿠폰번호 입력"
                  className="w-full px-4 py-3 rounded-xl border-2 border-green-200 bg-white text-[14px] font-mono tracking-wider outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all placeholder:text-slate-300"
                />
                {it.voucherNumber && (
                  <p className="text-[11px] text-green-600 font-semibold px-1">
                    입력된 번호: <span className="font-mono">{it.voucherNumber}</span>
                  </p>
                )}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* 앱 선물하기 안내 */}
      {items.some((it) => it.type === "롯데모바일" && it.checkedSubs.includes("앱 선물하기")) && (
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">📱</span>
            <p className="text-[13px] font-bold text-orange-700">앱 선물하기 안내</p>
          </div>
          <div className="flex items-center gap-3 px-3 py-3 bg-white rounded-xl border border-orange-100">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 text-[18px]">📲</div>
            <div>
              <p className="text-[13px] font-black text-orange-700 tracking-wide">010-7486-8001</p>
              <p className="text-[12px] text-orange-600 mt-0.5">위 번호로 선물하기를 보내주세요</p>
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-pink-50 rounded-xl border border-pink-100">
            <span className="text-[14px] flex-shrink-0 mt-0.5">💬</span>
            <p className="text-[12px] text-pink-700 leading-relaxed font-medium">
              하단 판매신청을 하시면 <span className="font-black">관리자와 채팅</span>이 가능합니다.
            </p>
          </div>
        </div>
      )}

      {/* 네이버페이 선물하기 안내 */}
      {items.some((it) => it.type === "네이버페이 포인트" && it.checkedSubs.includes("선물하기")) && (
        <NaverGiftInfo />
      )}

      {/* 컬쳐랜드 수동입력 */}
      {items.some((it) => it.type.startsWith("컬쳐랜드") && it.checkedSubs.includes("수동입력하기")) && (
        <CultureManualInput
          numbers={cultureManualNumbers}
          onChange={onCultureManualChange}
          onAdd={onCultureManualAdd}
          onRemove={onCultureManualRemove}
        />
      )}

      {/* 컬쳐랜드 자동추출 */}
      {items.some((it) => it.type.startsWith("컬쳐랜드") && it.checkedSubs.includes("자동추출하기")) && (
        <CultureAutoExtract
          images={cultureImages}
          onAdd={onAddCultureImage}
          onRemove={onRemoveCultureImage}
        />
      )}

      {/* 신세계모바일 바코드 업로드 */}
      {items.some((it) => it.type === "신세계모바일" && it.checkedSubs.includes("바코드업로드")) && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">📊</span>
            <p className="text-[13px] font-bold text-rose-700">바코드 이미지 업로드</p>
            <span className="text-[11px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">신세계모바일</span>
          </div>
          <ShinsegaeImageUpload
            images={shinsegaeImages}
            onAdd={onAddShinsegaeImage}
            onRemove={onRemoveShinsegaeImage}
          />
        </div>
      )}

      {/* 신세계모바일 상품권번호 수동입력 */}
      {items.some((it) => it.type === "신세계모바일" && it.checkedSubs.includes("상품권번호입력")) && (
        <ShinsegaeManualInput
          numbers={shinsegaeNumbers}
          onChange={onShinsegaeNumberChange}
          onAdd={onShinsegaeNumberAdd}
          onRemove={onShinsegaeNumberRemove}
        />
      )}

      {/* 북앤라이프 상품권번호 입력 */}
      {items.some((it) => it.type.startsWith("북앤라이프")) && (
        <BooknlifeManualInput
          numbers={booknlifeNumbers}
          onChange={onBooknlifeNumberChange}
          onAdd={onBooknlifeNumberAdd}
          onRemove={onBooknlifeNumberRemove}
        />
      )}

      {/* 문화상품권 상품권번호 입력 */}
      {items.some((it) => it.type === "문화상품권(18핀)") && (
        <MunhwaManualInput
          numbers={munhwaNumbers}
          onChange={onMunhwaNumberChange}
          onAdd={onMunhwaNumberAdd}
          onRemove={onMunhwaNumberRemove}
        />
      )}

      {/* 현대모바일 이미지 업로드 */}
      {items.some((it) => it.type === "현대모바일") && (
        <HyundaiImageUpload
          images={hyundaiImages}
          onAdd={onAddHyundaiImage}
          onRemove={onRemoveHyundaiImage}
        />
      )}

      {/* 합산 */}
      {hasAny && (
        <div className="rounded-2xl border border-pink-100 bg-pink-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-[11px] text-pink-500">총 상품권금액</p>
              <p className="text-[13px] font-semibold text-pink-500">{formatKRW(totalFace)}</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[11px] text-pink-500">{items.length > 1 ? "합산 입금받을 금액" : "입금받을 금액"}</p>
              <p className="text-[20px] font-black tabular-nums text-pink-700">{formatKRW(totalPayment)}</p>
            </div>
          </div>
          {travelDeduct > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-t border-amber-100">
              <p className="text-[11px] text-amber-600 font-semibold">이동경비 차감</p>
              <p className="text-[12px] font-bold text-amber-700">- {formatKRW(travelDeduct)}</p>
            </div>
          )}
        </div>
      )}

      {hasAny && totalFace < 300000 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
          <span className="text-[15px] flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-[12px] font-bold text-amber-700 leading-snug">30만원 미만 신청 안내</p>
            <p className="text-[12px] text-amber-600 mt-0.5 leading-relaxed">
              상품권금액 30만원 미만의 판매 신청은 이동경비로 인하여 <span className="font-bold">3,000원이 차감</span>됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileSelect() {
  const params = new URLSearchParams(location.search);
  const agreed = params.get("agreed") === "1";
  const initialType = params.get("type") ?? MOBILE_TYPES[0].label;

  const [items, setItems] = useState<MobileItem[]>([{ type: initialType, amount: "", checkedSubs: [], voucherNumber: "" }]);
  const [itemErrors, setItemErrors] = useState<string[]>([""]);
  const [hyundaiImages, setHyundaiImages] = useState<HyundaiImage[]>([]);
  const [shinsegaeImages, setShinsegaeImages] = useState<HyundaiImage[]>([]);
  const [shinsegaeNumbers, setShinsegaeNumbers] = useState<string[]>([""]);
  const [booknlifeNumbers, setBooknlifeNumbers] = useState<string[]>([""]);
  const [munhwaNumbers, setMunhwaNumbers] = useState<string[]>([""]);
  const [cultureImages, setCultureImages] = useState<CultureImage[]>([]);
  const [cultureManualNumbers, setCultureManualNumbers] = useState<string[]>([""]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: number; totalPayment: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!agreed) {
    location.href = `/mobile/terms?type=${encodeURIComponent(initialType)}`;
    return null;
  }

  function handleItemChange(idx: number, field: "type" | "amount", val: string) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      return { ...it, [field]: val, ...(field === "type" ? { checkedSubs: [] } : {}) };
    }));
    setItemErrors((prev) => prev.map((e, i) => i === idx ? "" : e));
  }

  function handleToggleSub(idx: number, sub: string) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const already = it.checkedSubs.includes(sub);
      const newSubs = already ? [] : [sub];
      const clearNumber = already || (sub !== "23으로 시작하는 교환권" && sub !== "쿠폰");
      return {
        ...it,
        checkedSubs: newSubs,
        voucherNumber: clearNumber ? "" : it.voucherNumber,
      };
    }));
  }

  function handleVoucherNumberChange(idx: number, val: string) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, voucherNumber: val } : it));
  }

  function handleAddItem() {
    setItems((prev) => [...prev, { type: MOBILE_TYPES[0].label, amount: "", checkedSubs: [], voucherNumber: "" }]);
    setItemErrors((prev) => [...prev, ""]);
  }

  async function handleAddHyundaiImage(file: File) {
    const id = Math.random().toString(36).slice(2);
    const preview = URL.createObjectURL(file);
    setHyundaiImages((prev) => [...prev, { id, preview, objectPath: null, uploading: true, error: false }]);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setHyundaiImages((prev) => prev.map((img) => img.id === id ? { ...img, objectPath, uploading: false } : img));
    } catch {
      setHyundaiImages((prev) => prev.map((img) => img.id === id ? { ...img, uploading: false, error: true } : img));
    }
  }

  function handleRemoveHyundaiImage(id: string) {
    setHyundaiImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleAddCultureImage(file: File) {
    const id = Math.random().toString(36).slice(2);
    const preview = URL.createObjectURL(file);
    setCultureImages((prev) => [...prev, { id, preview, uploading: true, numbers: [], error: false }]);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/mobile/extract-voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const { numbers } = await res.json();
      setCultureImages((prev) => prev.map((img) => img.id === id ? { ...img, uploading: false, numbers: numbers ?? [] } : img));
    } catch {
      setCultureImages((prev) => prev.map((img) => img.id === id ? { ...img, uploading: false, error: true } : img));
    }
  }

  function handleRemoveCultureImage(id: string) {
    setCultureImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleAddShinsegaeImage(file: File) {
    const id = Math.random().toString(36).slice(2);
    const preview = URL.createObjectURL(file);
    setShinsegaeImages((prev) => [...prev, { id, preview, uploading: true }]);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setShinsegaeImages((prev) => prev.map((img) => img.id === id ? { ...img, objectPath, uploading: false } : img));
    } catch {
      setShinsegaeImages((prev) => prev.map((img) => img.id === id ? { ...img, uploading: false, error: true } : img));
    }
  }

  function handleRemoveShinsegaeImage(id: string) {
    setShinsegaeImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  function handleShinsegaeNumberChange(idx: number, val: string) {
    setShinsegaeNumbers((prev) => prev.map((n, i) => i === idx ? val : n));
  }

  function handleShinsegaeNumberAdd() {
    setShinsegaeNumbers((prev) => [...prev, ""]);
  }

  function handleShinsegaeNumberRemove(idx: number) {
    setShinsegaeNumbers((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function handleBooknlifeNumberChange(idx: number, val: string) {
    setBooknlifeNumbers((prev) => prev.map((n, i) => i === idx ? val : n));
  }

  function handleBooknlifeNumberAdd() {
    setBooknlifeNumbers((prev) => [...prev, ""]);
  }

  function handleBooknlifeNumberRemove(idx: number) {
    setBooknlifeNumbers((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function handleMunhwaNumberChange(idx: number, val: string) {
    setMunhwaNumbers((prev) => prev.map((n, i) => i === idx ? val : n));
  }

  function handleMunhwaNumberAdd() {
    setMunhwaNumbers((prev) => [...prev, ""]);
  }

  function handleMunhwaNumberRemove(idx: number) {
    setMunhwaNumbers((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function handleCultureManualChange(idx: number, val: string) {
    setCultureManualNumbers((prev) => prev.map((n, i) => i === idx ? val : n));
  }

  function handleCultureManualAdd() {
    setCultureManualNumbers((prev) => [...prev, ""]);
  }

  function handleCultureManualRemove(idx: number) {
    setCultureManualNumbers((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleRemoveItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePhone(v: string) {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    let fmt = d;
    if (d.length > 3 && d.length <= 7) fmt = `${d.slice(0, 3)}-${d.slice(3)}`;
    else if (d.length > 7) fmt = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    setPhone(fmt);
  }

  function validate() {
    const errs: Record<string, string> = {};
    const iErrs = items.map((it) => {
      if (!parseAmt(it.amount)) return "금액을 입력해 주세요.";
      return "";
    });
    setItemErrors(iErrs);
    if (iErrs.some((e) => e)) errs.items = "ok";
    if (!/^[가-힣a-zA-Z\s]+$/.test(name.trim())) errs.name = "올바른 이름을 입력해 주세요.";
    if (!/^010-\d{4}-\d{4}$/.test(phone)) errs.phone = "010-XXXX-XXXX 형식으로 입력해 주세요.";
    if (!bankName) errs.bankName = "은행을 선택해 주세요.";
    if (!accountNumber.trim()) errs.accountNumber = "계좌번호를 입력해 주세요.";
    if (!/^[가-힣a-zA-Z\s]+$/.test(accountHolder.trim())) errs.accountHolder = "올바른 예금주명을 입력해 주세요.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrorMsg("");

    const totalFace = items.reduce((s, it) => s + parseAmt(it.amount), 0);
    const hasAny = items.some((it) => parseAmt(it.amount) > 0);
    const travelDeduct = hasAny && totalFace < 300000 ? 3000 : 0;
    const apiItems = items.map((it) => {
      const { amountNum, rate, payment } = computeItem(it);
      return {
        type: it.type,
        amount: amountNum,
        rate: Math.round(rate * 100),
        payment,
        isGift: false,
        ...(it.checkedSubs.length > 0 || it.voucherNumber || (it.type.startsWith("컬쳐랜드") && it.checkedSubs.includes("자동추출하기") && cultureImages.length > 0)
          ? {
              note: [
                ...it.checkedSubs,
                ...(it.voucherNumber && (
                  it.checkedSubs.includes("23으로 시작하는 교환권") ||
                  it.checkedSubs.includes("쿠폰")
                )
                  ? [`번호: ${it.voucherNumber}`]
                  : []),
                ...(it.type.startsWith("컬쳐랜드") && it.checkedSubs.includes("자동추출하기")
                  ? cultureImages.flatMap((img) => img.numbers).filter(Boolean).map((n) => `번호: ${n}`)
                  : []),
                ...(it.type.startsWith("컬쳐랜드") && it.checkedSubs.includes("수동입력하기")
                  ? cultureManualNumbers.filter(Boolean).map((n) => `번호: ${n}`)
                  : []),
                ...(it.type === "신세계모바일" && it.checkedSubs.includes("상품권번호입력")
                  ? shinsegaeNumbers.filter(Boolean).map((n) => `번호: ${n}`)
                  : []),
                ...(it.type.startsWith("북앤라이프")
                  ? booknlifeNumbers.filter(Boolean).map((n) => `번호: ${n}`)
                  : []),
                ...(it.type === "문화상품권(18핀)"
                  ? munhwaNumbers.filter(Boolean).map((n) => `번호: ${n}`)
                  : []),
              ].join(" / "),
            }
          : {}),
      };
    });
    const totalPayment = Math.max(0, apiItems.reduce((s, it) => s + it.payment, 0) - travelDeduct);

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "mobile",
          isUrgent: false,
          name: name.trim(),
          phone,
          location: "모바일상품권",
          items: apiItems,
          totalPayment,
          bankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          imagePaths: [
            ...hyundaiImages.filter((i) => i.objectPath).map((i) => i.objectPath!),
            ...shinsegaeImages.filter((i) => i.objectPath).map((i) => i.objectPath!),
          ],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "오류가 발생했습니다.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setDone({ id: data.id, totalPayment });
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16 space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-[40px] shadow-lg"
          style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
          ✅
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-[22px] font-black text-slate-800">신청이 완료됐습니다!</h2>
          <p className="text-[14px] text-slate-500">담당자가 확인 후 연락드리겠습니다.</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-5 w-full max-w-sm space-y-3 text-center">
          <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-wide">예상 입금 금액</p>
          <p className="text-[32px] font-black text-pink-600">{formatKRW(done.totalPayment)}</p>
          <p className="text-[11px] text-slate-400">접수번호: #{done.id}</p>
        </div>
        <button
          onClick={() => { location.href = "/"; }}
          className="px-8 py-3.5 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
        >
          처음으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = `/mobile/privacy?type=${encodeURIComponent(initialType)}`; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">모바일상품권 매입 신청</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Mobile Gift Certificate</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-5 pb-16 space-y-5">

        {/* 상품권 종류 & 금액 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5">
          <MobileVoucherItems
            items={items}
            errors={itemErrors}
            onChange={handleItemChange}
            onToggleSub={handleToggleSub}
            onVoucherNumberChange={handleVoucherNumberChange}
            hyundaiImages={hyundaiImages}
            onAddHyundaiImage={handleAddHyundaiImage}
            onRemoveHyundaiImage={handleRemoveHyundaiImage}
            shinsegaeImages={shinsegaeImages}
            onAddShinsegaeImage={handleAddShinsegaeImage}
            onRemoveShinsegaeImage={handleRemoveShinsegaeImage}
            shinsegaeNumbers={shinsegaeNumbers}
            onShinsegaeNumberChange={handleShinsegaeNumberChange}
            onShinsegaeNumberAdd={handleShinsegaeNumberAdd}
            onShinsegaeNumberRemove={handleShinsegaeNumberRemove}
            booknlifeNumbers={booknlifeNumbers}
            onBooknlifeNumberChange={handleBooknlifeNumberChange}
            onBooknlifeNumberAdd={handleBooknlifeNumberAdd}
            onBooknlifeNumberRemove={handleBooknlifeNumberRemove}
            munhwaNumbers={munhwaNumbers}
            onMunhwaNumberChange={handleMunhwaNumberChange}
            onMunhwaNumberAdd={handleMunhwaNumberAdd}
            onMunhwaNumberRemove={handleMunhwaNumberRemove}
            cultureImages={cultureImages}
            onAddCultureImage={handleAddCultureImage}
            onRemoveCultureImage={handleRemoveCultureImage}
            cultureManualNumbers={cultureManualNumbers}
            onCultureManualChange={handleCultureManualChange}
            onCultureManualAdd={handleCultureManualAdd}
            onCultureManualRemove={handleCultureManualRemove}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
          />
        </div>

        {/* 신청자 정보 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-4">
          <p className="text-[13px] font-bold text-slate-700">👤 신청자 정보</p>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">이름 <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.name ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.name && <p className="text-[12px] text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">연락처 <span className="text-rose-400">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhone(e.target.value)}
              placeholder="010-0000-0000"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.phone ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.phone && <p className="text-[12px] text-rose-500">{errors.phone}</p>}
          </div>
        </div>

        {/* 입금 계좌 */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-5 space-y-4">
          <p className="text-[13px] font-bold text-slate-700">🏦 입금받을 계좌</p>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">은행 <span className="text-rose-400">*</span></label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white ${errors.bankName ? "border-rose-300" : "border-slate-200"}`}
            >
              <option value="">은행 선택</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <p className="text-[12px] text-rose-500">{errors.bankName}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">계좌번호 <span className="text-rose-400">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
              placeholder="01012345678"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.accountNumber ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.accountNumber && <p className="text-[12px] text-rose-500">{errors.accountNumber}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-slate-500">예금주명 <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="홍길동"
              className={`w-full border rounded-2xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-pink-300 ${errors.accountHolder ? "border-rose-300" : "border-slate-200"}`}
            />
            {errors.accountHolder && <p className="text-[12px] text-rose-500">{errors.accountHolder}</p>}
          </div>

          <div className="flex items-start gap-2.5 bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
            <span className="text-[14px] flex-shrink-0">⚠️</span>
            <p className="text-[12px] text-amber-700 leading-relaxed">신청자 성함과 예금주명이 동일해야 합니다.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl">
            <p className="text-[13px] text-rose-600 font-semibold">{errorMsg}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-[0.98] shadow-sm disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}
        >
          {submitting ? "신청 중..." : "📱 매입 신청하기"}
        </button>
      </form>
    </div>
  );
}
