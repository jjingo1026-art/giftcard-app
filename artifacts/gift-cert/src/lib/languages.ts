export const LANGUAGES = [
  { code: "ko",    label: "한국어",    flag: "🇰🇷" },
  { code: "en",    label: "English",   flag: "🇺🇸" },
  { code: "zh-CN", label: "简体中文",  flag: "🇨🇳" },
  { code: "zh-TW", label: "繁體中文",  flag: "🇹🇼" },
  { code: "vi",    label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ja",    label: "日本語",    flag: "🇯🇵" },
  { code: "th",    label: "ภาษาไทย",   flag: "🇹🇭" },
  { code: "ru",    label: "Русский",   flag: "🇷🇺" },
  { code: "mn",    label: "Монгол",    flag: "🇲🇳" },
  { code: "id",    label: "Indonesia", flag: "🇮🇩" },
] as const;

export type LangCode = typeof LANGUAGES[number]["code"];

export function getLangLabel(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export function getLangFlag(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.flag ?? "🌐";
}

export function getTranslated(msg: { message: string; translatedText?: Record<string, string> | null }, lang: string): string {
  if (lang === "ko") return msg.message;
  return msg.translatedText?.[lang] ?? msg.message;
}

const STORAGE_KEY = "gc_chat_lang";
export function getSavedLang(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "ko";
}
export function saveLang(lang: string) {
  localStorage.setItem(STORAGE_KEY, lang);
}
