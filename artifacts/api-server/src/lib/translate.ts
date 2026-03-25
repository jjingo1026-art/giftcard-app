const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

export const SUPPORTED_LANGUAGES = ["en", "zh-CN", "zh-TW", "vi", "ja", "th", "ru", "mn", "id"] as const;
export type SupportedLang = typeof SUPPORTED_LANGUAGES[number] | "ko";

async function translateText(text: string, from: string, to: string): Promise<string> {
  if (from === to || !text.trim()) return text;
  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return text;
    const data = await resp.json() as { responseStatus: number; responseData: { translatedText: string } };
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return text;
  } catch {
    return text;
  }
}

export async function translateToKo(text: string, sourceLang: string): Promise<string> {
  if (sourceLang === "ko") return text;
  return translateText(text, sourceLang, "ko");
}

export async function translateAll(text: string, sourceLang = "ko", knownKo?: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  result[sourceLang] = text;
  if (sourceLang === "ko") result["ko"] = text;
  if (knownKo !== undefined) result["ko"] = knownKo;

  const allLangs: string[] = ["ko", ...SUPPORTED_LANGUAGES];
  await Promise.all(
    allLangs.map(async (lang) => {
      if (result[lang] !== undefined) return;
      result[lang] = await translateText(text, sourceLang, lang);
    })
  );

  return result;
}

export function hasTranslationCredentials(): boolean {
  return true;
}
