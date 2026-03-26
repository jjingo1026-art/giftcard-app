export const SUPPORTED_LANGUAGES = ["en", "zh-CN", "zh-TW", "vi", "ja", "th", "ru", "mn", "id"] as const;
export type SupportedLang = typeof SUPPORTED_LANGUAGES[number] | "ko";

// Google Translate 비공식 엔드포인트 (MT 기반, TM 오염 없음)
async function translateViaGoogle(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json() as [[string[], ...unknown[]], ...unknown[]];
    const translated = (data?.[0] as string[][] | null)
      ?.map((item) => item?.[0])
      .filter(Boolean)
      .join("") ?? "";
    return translated || null;
  } catch {
    return null;
  }
}

// MyMemory 폴백 (Google 실패 시)
async function translateViaMyMemory(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      responseStatus: number;
      responseData: { translatedText: string; match: number };
    };
    if (data.responseStatus !== 200) return null;
    const result = data.responseData?.translatedText;
    // match=1 + 원문과 다른 언어임에도 동일 텍스트 반환 = TM 오염 가능성 → 제외
    if (!result || result === text) return null;
    return result;
  } catch {
    return null;
  }
}

async function translateText(text: string, from: string, to: string): Promise<string> {
  if (from === to || !text.trim()) return text;
  // 1차: Google Translate (MT, 품질 우수)
  const google = await translateViaGoogle(text, from, to);
  if (google && google !== text) return google;
  // 2차: MyMemory 폴백
  const mymemory = await translateViaMyMemory(text, from, to);
  if (mymemory) return mymemory;
  return text;
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
