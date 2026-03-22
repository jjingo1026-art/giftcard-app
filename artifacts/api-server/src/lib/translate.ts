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

export async function translateAll(text: string, sourceLang = "ko"): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  if (sourceLang === "ko") {
    result["ko"] = text;
  } else {
    result[sourceLang] = text;
    result["ko"] = await translateText(text, sourceLang, "ko");
  }

  await Promise.all(
    SUPPORTED_LANGUAGES.map(async (lang) => {
      if (lang === sourceLang) {
        result[lang] = text;
      } else if (!result[lang]) {
        result[lang] = await translateText(text, sourceLang, lang);
      }
    })
  );

  return result;
}

export function hasTranslationCredentials(): boolean {
  return true;
}
