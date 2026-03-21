import { db } from "@workspace/db";
import { adminAccountsTable } from "@workspace/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const admins = [
  { username: "admin1", password: "123456" },
  { username: "admin2", password: "123456" },
  { username: "admin3", password: "123456" },
  { username: "admin4", password: "123456" },
  { username: "admin5", password: "123456" },
];

async function createAdmins() {
  for (const admin of admins) {
    const existing = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.username, admin.username)).limit(1);
    if (existing.length > 0) {
      console.log(`이미 존재: ${admin.username}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(admin.password, 10);
    await db.insert(adminAccountsTable).values({ username: admin.username, passwordHash });
    console.log(`생성 완료: ${admin.username}`);
  }
  console.log("모든 관리자 계정 생성 완료");
  process.exit(0);
}

createAdmins().catch((e) => { console.error(e); process.exit(1); });
