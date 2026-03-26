import { db } from "@workspace/db";
import { chatsTable } from "@workspace/db/schema";
import { ne, sql } from "drizzle-orm";
import { translateAll } from "./lib/translate";

const RETRANSLATE_DONE_KEY = "retranslate_v2_done";

/**
 * 시작 시 한 번 실행: 비한국어 메시지 전체 재번역 (구 엔진 오번역 수정)
 * - translated_text가 비어있거나 ko 번역이 원문과 같은 메시지 대상
 * - 플래그 파일로 이미 실행된 경우 건너뜀 (재배포 시 중복 실행 방지)
 */
export async function retranslateBadMessages(): Promise<void> {
  // 환경변수 플래그로 중복 실행 방지
  if (process.env[RETRANSLATE_DONE_KEY]) {
    console.log("[재번역] 이미 완료된 세션, 건너뜀");
    return;
  }
  process.env[RETRANSLATE_DONE_KEY] = "1";

  try {
    // 비한국어 메시지 중 번역이 없거나 ko = 원문인 메시지 조회
    const rows = await db
      .select()
      .from(chatsTable)
      .where(
        sql`
          ${ne(chatsTable.language, "ko")}
          AND (
            translated_text IS NULL
            OR translated_text = '{}'::jsonb
            OR translated_text->>'ko' IS NULL
            OR translated_text->>'ko' = ''
            OR translated_text->>'ko' = message
          )
        `
      )
      .limit(100);

    if (rows.length === 0) {
      console.log("[재번역] 재번역 필요 메시지 없음");
      return;
    }

    console.log(`[재번역] ${rows.length}개 메시지 재번역 시작`);

    for (const row of rows) {
      try {
        const translatedText = await translateAll(row.message, row.language ?? "ko");
        await db
          .update(chatsTable)
          .set({ translatedText })
          .where(sql`id = ${row.id}`);
        console.log(`[재번역] id=${row.id} 완료: ko=${translatedText.ko?.slice(0, 20)}`);
      } catch (e) {
        console.error(`[재번역] id=${row.id} 실패:`, e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log("[재번역] 완료");
  } catch (e) {
    console.error("[재번역] 오류:", e);
  }
}
