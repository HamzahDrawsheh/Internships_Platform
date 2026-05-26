/**
 * MVP in-memory rate limiter keyed by authenticated Supabase user id + logical bucket.
 * Sliding window: at most MAX_REQUESTS within WINDOW_MS per key.
 *
 * Not shared across server instances (each Node process has its own Map).
 * Suitable for small deployments / single-instance; replace with Redis etc. when scaling out.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

/** Separate buckets so limits are independent per AI endpoint. */
export const RATE_LIMIT_BUCKET_RESUME_IMPROVE = "resume_improve";
export const RATE_LIMIT_BUCKET_FEEDBACK_ANALYZE = "feedback_analyze";
export const RATE_LIMIT_BUCKET_STUDENT_ASSISTANT_CHAT = "student_assistant_chat";
export const RATE_LIMIT_BUCKET_COVER_LETTER = "cover_letter";
export const RATE_LIMIT_BUCKET_TASK_TO_SKILL = "task_to_skill";

const hitsByKey = new Map<string, number[]>();

/**
 * Records this attempt and returns whether the user is still under the limit.
 */
export function consumeUserRateLimitSlot(userId: string, bucket: string): boolean {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  const prev = hitsByKey.get(key) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hitsByKey.set(key, recent);
    return false;
  }

  recent.push(now);
  hitsByKey.set(key, recent);
  return true;
}
