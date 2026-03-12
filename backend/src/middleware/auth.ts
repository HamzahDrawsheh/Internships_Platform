import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { config } from "../config";

const SUPABASE_ISSUER = "https://wgugwqrlhftohqezqgau.supabase.co/auth/v1";
const SUPABASE_AUDIENCE = "authenticated";

const jwks = jose.createRemoteJWKSet(new URL(config.SUPABASE_JWT_JWKS_URL));

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: SUPABASE_ISSUER,
      audience: SUPABASE_AUDIENCE,
    });

    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      console.error("JWT verification: missing or invalid sub claim", { payload: Object.keys(payload) });
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = { id: sub };
    next();
  } catch (err) {
    console.error("JWT verification error:", err instanceof Error ? err.message : err);
    if (err instanceof Error && "code" in err) {
      console.error("JWT verification code:", (err as { code: string }).code);
    }
    res.status(401).json({ error: "Invalid or expired token" });
  }
}