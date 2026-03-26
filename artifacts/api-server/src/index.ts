import { createServer } from "http";
import app from "./app";
import { initSocket } from "./socket";
import { schedulePrivacyCleanup } from "./cleanup";
import { retranslateBadMessages } from "./retranslate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log("서버 실행됨");
  schedulePrivacyCleanup();
  // 오번역 저장된 메시지 자동 재번역 (시작 시 1회)
  retranslateBadMessages().catch(() => {});
});
