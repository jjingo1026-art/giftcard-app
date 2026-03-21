import { db } from "@workspace/db";
import { adminAccountsTable } from "@workspace/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const admins = [
  { username: "admin1", password: "Admin1234!" },
  { username: "admin2", password: "Admin1234!" },
  { username: "admin3", password: "Admin1234!" },
  { username: "admin4", password: "Admin1234!" },
  { username: "admin5", password: "Admin1234!" },
];

async function createAdmins() {
  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 10);
    const existing = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.username, admin.username)).limit(1);
    if (existing.length > 0) {
      await db.update(adminAccountsTable)
        .set({ passwordHash })
        .where(eq(adminAccountsTable.username, admin.username));
      console.log(`비밀번호 업데이트: ${admin.username}`);
    } else {
      await db.insert(adminAccountsTable).values({ username: admin.username, passwordHash });
      console.log(`생성 완료: ${admin.username}`);
    }
  }
  console.log("모든 관리자 계정 처리 완료");
  process.exit(0);
}

createAdmins().catch((e) => { console.error(e); process.exit(1); });
