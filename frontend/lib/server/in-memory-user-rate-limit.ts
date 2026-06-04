import { createAdminClient } from "@/lib/supabase/admin";

/**
 * User rate limiter keyed by authenticated Supabase user id + logical bucket.
 * Uses a Supabase-backed counter when service role is configured, with a local
 * in-memory fallback for development or misconfigured non-critical environments.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

/** Separate buckets so limits are independent per AI endpoint. */
export const RATE_LIMIT_BUCKET_RESUME_IMPROVE = "resume_improve";
export const RATE_LIMIT_BUCKET_FEEDBACK_ANALYZE = "feedback_analyze";
export const RATE_LIMIT_BUCKET_STUDENT_ASSISTANT_CHAT = "student_assistant_chat";
export const RATE_LIMIT_BUCKET_COVER_LETTER = "cover_letter";
export const RATE_LIMIT_BUCKET_TASK_TO_SKILL = "task_to_skill";
export const RATE_LIMIT_BUCKET_INTERVIEW_SIMULATOR = "interview_simulator";

const hitsByKey = new Map<string, number[]>();

/**
 * Records this attempt and returns whether the user is still under the limit.
 */
function consumeLocalUserRateLimitSlot(userId: string, bucket: string): boolean {
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

export async function consumeUserRateLimitSlot(userId: string, bucket: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_api_rate_limit", {
      p_key: `user:${userId}:${bucket}`,
      p_bucket: bucket,
      p_subject: userId,
      p_max_requests: MAX_REQUESTS,
      p_window_seconds: Math.floor(WINDOW_MS / 1000),
    });
    if (!error && typeof data === "boolean") {
      return data;
    }
    if (process.env.NODE_ENV === "production") {
      console.error("[rate-limit] shared limiter failed", { bucket, error: error?.message });
      return false;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[rate-limit] shared limiter unavailable", { bucket, error });
      return false;
    }
  }

  return consumeLocalUserRateLimitSlot(userId, bucket);
}
