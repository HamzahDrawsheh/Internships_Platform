import { createAdminClient } from "@/lib/supabase/admin";

const hitsByIp = new Map<string, number[]>();

/**
 * Simple sliding-window rate limit keyed by client IP (for unauthenticated endpoints).
 */
function consumeLocalIpRateLimitSlot(
  ip: string,
  bucket: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const prev = hitsByIp.get(key) ?? [];
  const recent = prev.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    hitsByIp.set(key, recent);
    return false;
  }

  recent.push(now);
  hitsByIp.set(key, recent);
  return true;
}

export async function consumeIpRateLimitSlot(
  ip: string,
  bucket: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_api_rate_limit", {
      p_key: `ip:${ip}:${bucket}`,
      p_bucket: bucket,
      p_subject: ip,
      p_max_requests: maxRequests,
      p_window_seconds: Math.floor(windowMs / 1000),
    });
    if (!error && typeof data === "boolean") {
      return data;
    }
    if (process.env.NODE_ENV === "production") {
      console.error("[ip-rate-limit] shared limiter failed", { bucket, error: error?.message });
      return false;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[ip-rate-limit] shared limiter unavailable", { bucket, error });
      return false;
    }
  }

  return consumeLocalIpRateLimitSlot(ip, bucket, maxRequests, windowMs);
}
