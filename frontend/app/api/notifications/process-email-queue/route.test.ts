import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ mocked: true })),
}));

vi.mock("@/lib/notifications/process-email-queue", () => ({
  processTransactionalEmailQueue: vi.fn(async () => ({
    processed: 1,
    failed: 0,
    skipped: 0,
  })),
}));

import { processTransactionalEmailQueue } from "@/lib/notifications/process-email-queue";
import { POST } from "./route";

describe("POST /api/notifications/process-email-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("does not process without CRON_SECRET", async () => {
    const response = await POST(new Request("http://localhost/api/notifications/process-email-queue", { method: "POST" }));

    expect(response.status).toBe(503);
    expect(processTransactionalEmailQueue).not.toHaveBeenCalled();
  });

  it("rejects missing or wrong cron secret", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await POST(new Request("http://localhost/api/notifications/process-email-queue", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(processTransactionalEmailQueue).not.toHaveBeenCalled();
  });

  it("processes the queue when cron secret matches", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await POST(
      new Request("http://localhost/api/notifications/process-email-queue", {
        method: "POST",
        headers: { "x-cron-secret": "secret" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, processed: 1, failed: 0, skipped: 0 });
    expect(processTransactionalEmailQueue).toHaveBeenCalledOnce();
  });
});
