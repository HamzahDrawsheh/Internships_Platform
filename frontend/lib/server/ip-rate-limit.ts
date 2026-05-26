const hitsByIp = new Map<string, number[]>();

/**
 * Simple sliding-window rate limit keyed by client IP (for unauthenticated endpoints).
 */
export function consumeIpRateLimitSlot(
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
