import "dotenv/config"; // load .env before reading process.env
import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .default("3001")
    .transform((s) => parseInt(s, 10)),
  DATABASE_PATH: z.string().min(1, "DATABASE_PATH is required"),
  SUPABASE_JWT_JWKS_URL: z.string().url("SUPABASE_JWT_JWKS_URL must be a valid URL"),
  SUPABASE_ISSUER: z
    .string()
    .url("SUPABASE_ISSUER must be a valid URL")
    .min(1, "SUPABASE_ISSUER is required"),
  SUPABASE_AUDIENCE: z
    .string()
    .min(1, "SUPABASE_AUDIENCE is required")
    .default("authenticated"),
  CORS_ORIGIN: z
    .string()
    .min(1, "CORS_ORIGIN is required"),
  NODE_ENV: z.enum(["development", "production"]).optional().default("development"),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const msg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  return result.data;
}

export const config = loadConfig();
