import { useState } from "react";
import { LANGUAGES, getSavedLang, saveLang } from "@/lib/languages";

export function useLang(): [string, (l: string) => void] {
  const [lang, setLang] = useState(() => getSavedLang());
  function changeLang(l: string) {
    setLang(l);
    saveLang(l);
  }
  return [lang, changeLang];
}

interface LangPickerProps {
  lang: string;
  onChange: (l: string) => void;
  accentColor?: string;
}

export default function LangPicker({ lang, onChange, accentColor = "#6366f1" }: LangPickerProps) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-[12px] font-semibold text-slate-600"
        title="언어 선택"
      >
        <span className="text-[14px] leading-none">{current?.flag ?? "🌐"}</span>
        <span>{current?.label}</span>
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="opacity-50">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 px-2 z-50 overflow-auto max-h-[60vh] flex flex-col gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { onChange(l.code); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all active:scale-[0.98]"
                style={
                  lang === l.code
                    ? { backgroundColor: accentColor, color: "#fff", borderColor: accentColor, boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }
                    : { backgroundColor: "#fff", color: "#475569", borderColor: "#e2e8f0" }
                }
              >
                <span className="text-[15px] leading-none">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
