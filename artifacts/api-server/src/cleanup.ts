import { db } from "@workspace/db";
import { reservationsTable, chatsTable } from "@workspace/db/schema";
import { and, lte, ne, sql } from "drizzle-orm";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const DELETED_MARKER = "(삭제됨)";

export async function runPrivacyCleanup(): Promise<{ cleaned: number }> {
  const cutoff = new Date(Date.now() - SIX_MONTHS_MS);

  const targets = await db
    .select({ id: reservationsTable.id })
    .from(reservationsTable)
    .where(
      and(
        lte(reservationsTable.createdAt, cutoff),
        ne(reservationsTable.phone, DELETED_MARKER)
      )
    );

  if (targets.length === 0) return { cleaned: 0 };

  const ids = targets.map((r) => r.id);

  await db
    .update(reservationsTable)
    .set({
      name:          null,
      phone:         DELETED_MARKER,
      location:      DELETED_MARKER,
      bankName:      DELETED_MARKER,
      accountNumber: DELETED_MARKER,
      accountHolder: DELETED_MARKER,
    })
    .where(
      and(
        lte(reservationsTable.createdAt, cutoff),
        ne(reservationsTable.phone, DELETED_MARKER)
      )
    );

  await db
    .delete(chatsTable)
    .where(sql`${chatsTable.reservationId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`);

  console.log(`[개인정보 자동삭제] ${ids.length}건 처리 완료 (기준일: ${cutoff.toISOString().slice(0, 10)})`);
  return { cleaned: ids.length };
}

export function schedulePrivacyCleanup() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000;

  const run = () => {
    runPrivacyCleanup().catch((e) =>
      console.error("[개인정보 자동삭제] 오류:", e)
    );
  };

  setTimeout(run, 10_000);
  setInterval(run, INTERVAL_MS);

  console.log("[개인정보 자동삭제] 스케줄러 등록 완료 (6개월 기준, 매일 실행)");
}
