import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

/**
 * POST /mobile/extract-voucher
 * 컬쳐랜드 상품권/교환권 번호를 추출합니다.
 * Body (이미지): { imageBase64: string, mimeType: string, mode?: "message"|"barcode", voucherType?: "상품권"|"교환권"|"both" }
 * Body (텍스트): { text: string, voucherType?: "상품권"|"교환권"|"both" }
 */
router.post("/mobile/extract-voucher", async (req: Request, res: Response) => {
  const { imageBase64, mimeType, text, mode = "message", voucherType = "both" } = req.body ?? {};

  if (!imageBase64 && !text) {
    res.status(400).json({ error: "imageBase64 또는 text 중 하나는 필수입니다." });
    return;
  }

  let prompt: string;

  if (mode === "barcode") {
    prompt = `이 이미지는 컬쳐랜드 상품권 바코드 이미지입니다.
바코드 아래 또는 주변에 표시된 상품권 번호(PIN 번호)를 추출해주세요.
상품권 번호는 숫자로만 이루어진 16~18자리 숫자이거나, 하이픈(-)으로 구분된 숫자 그룹입니다.
예시: 1234567890123456 또는 1234-5678-9012-3456

추출된 번호만 JSON 배열 형식으로 반환하세요. 예: {"numbers": ["1234567890123456"]}
번호가 없거나 확인 불가능한 경우: {"numbers": []}
다른 설명은 필요 없습니다.`;
  } else if (voucherType === "교환권") {
    prompt = `다음 텍스트(컬쳐랜드 교환권 발송 메시지)에서 컬쳐랜드 교환권 번호를 모두 추출해주세요.
교환권 번호는 보통 숫자로만 이루어진 12~13자리 숫자입니다.
예시: 1234567890123 또는 123456789012

여러 개의 번호가 있을 경우 모두 추출해 주세요.
추출된 번호만 JSON 배열 형식으로 반환하세요. 예: {"numbers": ["1234567890123"]}
번호가 없거나 확인 불가능한 경우: {"numbers": []}
다른 설명은 필요 없습니다.`;
  } else if (voucherType === "상품권") {
    prompt = `다음 텍스트(컬쳐랜드 상품권 발송 메시지)에서 컬쳐랜드 상품권 번호(PIN 번호)를 모두 추출해주세요.
상품권 번호는 숫자로만 이루어진 16~18자리 숫자이거나, 하이픈(-)으로 구분된 숫자 그룹입니다.
예시: 1234567890123456 또는 1234-5678-9012-3456

여러 개의 번호가 있을 경우 모두 추출해 주세요.
추출된 번호만 JSON 배열 형식으로 반환하세요. 예: {"numbers": ["1234567890123456", "9876543210987654"]}
번호가 없거나 확인 불가능한 경우: {"numbers": []}
다른 설명은 필요 없습니다.`;
  } else {
    prompt = `다음 텍스트(컬쳐랜드 상품권 또는 교환권 발송 메시지)에서 상품권/교환권 번호를 모두 추출해주세요.
- 상품권 번호: 숫자로만 이루어진 16~18자리 (예: 1234567890123456 또는 1234-5678-9012-3456)
- 교환권 번호: 숫자로만 이루어진 12~13자리 (예: 1234567890123)

여러 개의 번호가 있을 경우 모두 추출해 주세요.
추출된 번호만 JSON 배열 형식으로 반환하세요. 예: {"numbers": ["1234567890123456"]}
번호가 없거나 확인 불가능한 경우: {"numbers": []}
다른 설명은 필요 없습니다.`;
  }

  // ── 정규식 기반 1차 추출 (텍스트 입력 시 우선 적용) ─────────────────────
  function regexExtract(src: string, type: string): string[] {
    const found = new Set<string>();

    if (type === "상품권" || type === "both") {
      // XXXX-XXXX-XXXX-XXXX (16자리 하이픈 포함) — 컬쳐랜드 상품권 표준 형식
      const withDash = src.matchAll(/\b(\d{4}-\d{4}-\d{4}-\d{4})\b/g);
      for (const m of withDash) found.add(m[1]);

      // 하이픈 없는 16자리 (연속 숫자)
      const bare16 = src.matchAll(/\b(\d{16})\b/g);
      for (const m of bare16) found.add(m[1]);
    }

    if (type === "교환권" || type === "both") {
      // 12~13자리 숫자 (하이픈 없음) — 교환권
      const gwon = src.matchAll(/\b(\d{12,13})\b/g);
      for (const m of gwon) found.add(m[1]);
    }

    return [...found];
  }

  try {
    // 텍스트 입력 → 정규식으로 먼저 시도
    if (text) {
      const regexNumbers = regexExtract(text as string, voucherType);
      if (regexNumbers.length > 0) {
        res.json({ numbers: regexNumbers });
        return;
      }
      // 정규식으로 못 찾으면 AI fallback
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 512,
        messages: [
          {
            role: "user",
            content: `${prompt}\n\n---\n${text}`,
          },
        ],
      });
      const content = response.choices[0]?.message?.content ?? "";
      let numbers: string[] = [];
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          numbers = Array.isArray(parsed.numbers) ? parsed.numbers : [];
        }
      } catch { numbers = []; }
      res.json({ numbers });
      return;
    }

    // 이미지 입력 → AI Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    let numbers: string[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        numbers = Array.isArray(parsed.numbers) ? parsed.numbers : [];
      }
    } catch {
      numbers = [];
    }

    res.json({ numbers });
  } catch (error) {
    console.error("상품권 번호 추출 실패:", error);
    res.status(500).json({ error: "번호 추출에 실패했습니다." });
  }
});

export default router;
