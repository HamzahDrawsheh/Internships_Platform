import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/require-admin", () => ({
  requireAdminUser: vi.fn(),
}));

vi.mock("@/lib/email/delivery", () => ({
  ensureSmtpVerifiedOnce: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/email/config", () => ({
  getSmtpConfigurationStatus: vi.fn(() => ({ configured: false, missing: ["SMTP_HOST"] })),
}));

vi.mock("@/lib/email/log-email-status", () => ({
  logEmailConfigurationStatus: vi.fn(),
}));

vi.mock("@/lib/email/resend-config", () => ({
  getResendConfigurationStatus: vi.fn(() => ({ configured: false, missing: ["RESEND_API_KEY"] })),
}));

vi.mock("@/lib/email/provider-state", () => ({
  getActiveEmailProvider: vi.fn(() => "none"),
  getSmtpVerifySnapshot: vi.fn(() => null),
  isSmtpNetworkBlocked: vi.fn(() => false),
}));

import { GET } from "./route";
import { requireAdminUser } from "@/lib/server/require-admin";

const mockedRequireAdminUser = vi.mocked(requireAdminUser);

describe("GET /api/email/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users", async () => {
    mockedRequireAdminUser.mockResolvedValue({ ok: false, status: 401, error: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "unauthenticated" });
  });

  it("rejects non-admin users", async () => {
    mockedRequireAdminUser.mockResolvedValue({ ok: false, status: 403, error: "forbidden" });

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it("returns diagnostic status for admins", async () => {
    mockedRequireAdminUser.mockResolvedValue({ ok: true, userId: "admin-id" });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      smtp: { configured: false },
      resend: { configured: false },
    });
  });
});
