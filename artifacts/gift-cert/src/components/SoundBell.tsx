import { useState, useRef, useEffect } from "react";
import {
  getSoundEnabled, setSoundEnabled,
  getSoundType, setSoundType,
  playSound, unlockAudioContext, SOUND_OPTIONS,
  type SoundType,
} from "@/lib/notificationSound";

interface Props {
  role: "customer" | "admin" | "staff";
  className?: string;
}

export default function SoundBell({ role, className = "" }: Props) {
  const [enabled, setEnabled] = useState(() => getSoundEnabled(role));
  const [type, setType] = useState<SoundType>(() => getSoundType(role));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleBellClick() {
    unlockAudioContext(); // 모바일: 버튼 클릭 시 AudioContext 잠금 해제
    setOpen((v) => !v);
  }

  function toggleEnabled() {
    unlockAudioContext();
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(role, next);
    if (next) playSound(type);
  }

  function selectType(t: SoundType) {
    unlockAudioContext();
    setType(t);
    setSoundType(role, t);
    playSound(t);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={handleBellClick}
        title={enabled ? "알림 소리 설정" : "알림 소리 꺼짐"}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
      >
        {enabled
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 1 0 8"/><path d="M22 4a10 10 0 0 1 0 16"/><path d="M11 5L6 9H2v6h4l5 4V5z"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-[60] w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* 헤더: 켜기/끄기 토글 */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-[13px] font-bold text-slate-700">알림 소리</span>
            <button
              onClick={toggleEnabled}
              className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center ${enabled ? "bg-indigo-500" : "bg-slate-300"}`}
              style={{ height: 22, width: 40 }}
            >
              <span
                className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>

          {/* 소리 종류 목록 */}
          <div className="py-1">
            {SOUND_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                onClick={() => selectType(opt.id)}
                role="option"
                aria-selected={type === opt.id}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                  type === opt.id ? "bg-indigo-50" : ""
                }`}
              >
                <span className="text-[18px] w-6 text-center">{opt.emoji}</span>
                <span className={`flex-1 text-[13px] font-semibold ${type === opt.id ? "text-indigo-600" : "text-slate-600"}`}>
                  {opt.label}
                </span>
                {type === opt.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); playSound(opt.id); }}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors flex-shrink-0"
                  title="미리 듣기"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#6366f1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
