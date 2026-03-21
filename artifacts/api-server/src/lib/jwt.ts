import jwt from "jsonwebtoken";

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  ?? "gc_access_secret_2025";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "gc_refresh_secret_2025";

export const ACCESS_EXPIRES  = "2h";
export const REFRESH_EXPIRES = "30d";
export const REFRESH_MS      = 30 * 24 * 60 * 60 * 1000;

export type TokenPayload = { id: string; role: "admin" | "staff"; staffId?: number };

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function generateRefreshToken(payload: Pick<TokenPayload, "id" | "role" | "staffId">): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
