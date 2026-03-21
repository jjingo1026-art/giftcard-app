import { Translate } from "@google-cloud/translate/build/src/v2";

export const SUPPORTED_LANGUAGES = ["en", "zh-CN", "zh-TW", "vi", "ja", "th", "ru", "mn", "id"] as const;
export type SupportedLang = typeof SUPPORTED_LANGUAGES[number] | "ko";

let _client: Translate | null = null;

function getClient(): Translate | null {
  if (_client) return _client;

  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  _client = new Translate({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
  });

  return _client;
}

export async function translateText(text: string, target: string): Promise<string> {
  const client = getClient();
  if (!client) return text;
  try {
    const [translation] = await client.translate(text, target);
    return translation;
  } catch {
    return text;
  }
}

export async function translateAll(text: string, sourceLang = "ko"): Promise<Record<string, string>> {
  const client = getClient();
  const result: Record<string, string> = { ko: text };

  if (!client) return result;

  await Promise.all(
    SUPPORTED_LANGUAGES.map(async (lang) => {
      if (lang === sourceLang) {
        result[lang] = text;
      } else {
        result[lang] = await translateText(text, lang);
      }
    })
  );

  return result;
}

export function hasTranslationCredentials(): boolean {
  return !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}
