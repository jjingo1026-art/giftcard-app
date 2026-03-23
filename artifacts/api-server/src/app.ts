import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";

const app: Express = express();

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 고객 예약 조회: IP당 1분 30회 (전화번호 열거 방지)
const customerLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 예약 신청: IP당 10분에 10회 (스팸 방지)
const reservationCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/admin/login", loginLimiter);
app.use("/api/admin/staff/login", loginLimiter);
app.use("/api/admin/chat", chatReadLimiter);
app.use("/api/admin/customer/reservation", customerLookupLimiter);
app.use("/api/reservations", reservationCreateLimiter);

app.use("/api", router);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if ((err as any).type === "entity.too.large") {
    res.status(413).json({ error: "요청 데이터가 너무 큽니다. 10MB 이하로 줄여주세요." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

export default app;
